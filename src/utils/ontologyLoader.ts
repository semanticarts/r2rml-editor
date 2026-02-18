import * as $rdf from 'rdflib';
import type { LoadedOntology, OntologyTerm } from '../types/ontology';
import { RDF, RDFS, OWL, SKOS } from './constants';

const rdf = $rdf.Namespace(RDF);
const rdfs = $rdf.Namespace(RDFS);
const owl = $rdf.Namespace(OWL);
const skos = $rdf.Namespace(SKOS);

function getContentType(fileName: string): string {
  const ext = fileName.toLowerCase().split('.').pop();
  switch (ext) {
    case 'ttl':
    case 'turtle':
      return 'text/turtle';
    case 'rdf':
    case 'owl':
    case 'xml':
      return 'application/rdf+xml';
    case 'n3':
      return 'text/n3';
    case 'nt':
    case 'ntriples':
      return 'application/n-triples';
    default:
      return 'text/turtle';
  }
}

/* eslint-disable @typescript-eslint/no-explicit-any */

function isNamedNode(node: any): boolean {
  return node && node.termType === 'NamedNode' && !node.value.startsWith('_:');
}

function extractPrefixes(store: $rdf.IndexedFormula): Record<string, string> {
  const prefixes: Record<string, string> = {};
  const namespaces = (store as any).namespaces;
  if (namespaces && typeof namespaces === 'object') {
    for (const [prefix, ns] of Object.entries(namespaces)) {
      if (prefix && typeof ns === 'string') {
        prefixes[prefix] = ns;
      }
    }
  }
  return prefixes;
}

function extractTerms(store: $rdf.IndexedFormula): { classes: OntologyTerm[]; properties: OntologyTerm[] } {
  const classes: OntologyTerm[] = [];
  const properties: OntologyTerm[] = [];
  const seenClasses = new Set<string>();
  const seenProperties = new Set<string>();

  // Find classes: owl:Class, rdfs:Class
  const classTypes = [owl('Class'), rdfs('Class')];
  for (const classType of classTypes) {
    const stmts = store.statementsMatching(undefined, rdf('type') as any, classType as any);
    for (const stmt of stmts) {
      const iri = stmt.subject.value;
      if (seenClasses.has(iri)) continue;
      // Filter out blank nodes
      if (!isNamedNode(stmt.subject)) continue;
      seenClasses.add(iri);

      const prefLabelStmts = store.statementsMatching(stmt.subject as any, skos('prefLabel') as any, undefined);
      const labelStmts = store.statementsMatching(stmt.subject as any, rdfs('label') as any, undefined);
      const commentStmts = store.statementsMatching(stmt.subject as any, rdfs('comment') as any, undefined);

      classes.push({
        iri,
        prefLabel: prefLabelStmts.length > 0 ? prefLabelStmts[0].object.value : null,
        label: labelStmts.length > 0 ? labelStmts[0].object.value : null,
        type: 'class',
        comment: commentStmts.length > 0 ? commentStmts[0].object.value : null,
      });
    }
  }

  // Find properties: owl:ObjectProperty, owl:DatatypeProperty, rdf:Property
  const propTypes = [owl('ObjectProperty'), owl('DatatypeProperty'), rdf('Property')];
  for (const propType of propTypes) {
    const stmts = store.statementsMatching(undefined, rdf('type') as any, propType as any);
    for (const stmt of stmts) {
      const iri = stmt.subject.value;
      if (seenProperties.has(iri)) continue;
      if (!isNamedNode(stmt.subject)) continue;
      seenProperties.add(iri);

      const prefLabelStmts = store.statementsMatching(stmt.subject as any, skos('prefLabel') as any, undefined);
      const labelStmts = store.statementsMatching(stmt.subject as any, rdfs('label') as any, undefined);
      const commentStmts = store.statementsMatching(stmt.subject as any, rdfs('comment') as any, undefined);

      properties.push({
        iri,
        prefLabel: prefLabelStmts.length > 0 ? prefLabelStmts[0].object.value : null,
        label: labelStmts.length > 0 ? labelStmts[0].object.value : null,
        type: 'property',
        comment: commentStmts.length > 0 ? commentStmts[0].object.value : null,
      });
    }
  }

  const displayLabel = (t: OntologyTerm) => t.prefLabel || t.label || t.iri;
  const sortFn = (a: OntologyTerm, b: OntologyTerm) =>
    displayLabel(a).localeCompare(displayLabel(b));
  classes.sort(sortFn);
  properties.sort(sortFn);

  return { classes, properties };
}

export async function loadOntologyFromFile(file: File): Promise<LoadedOntology> {
  const text = await file.text();
  const store = $rdf.graph();
  const contentType = getContentType(file.name);
  const baseURI = 'http://example.com/ontology/';

  try {
    $rdf.parse(text, store, baseURI, contentType);
  } catch (e) {
    throw new Error('Failed to parse ontology: ' + (e instanceof Error ? e.message : String(e)));
  }

  const { classes, properties } = extractTerms(store);
  const prefixes = extractPrefixes(store);

  return {
    sourceLabel: file.name,
    classes,
    properties,
    prefixes,
  };
}

export async function loadOntologyFromIRI(iri: string): Promise<LoadedOntology> {
  const response = await fetch(iri, {
    headers: {
      Accept: 'text/turtle, application/rdf+xml, text/n3, application/n-triples',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ontology: ${response.status} ${response.statusText}`);
  }

  const text = await response.text();
  const store = $rdf.graph();

  const responseType = response.headers.get('content-type') || '';
  let contentType = 'text/turtle';
  if (responseType.includes('rdf+xml')) {
    contentType = 'application/rdf+xml';
  } else if (responseType.includes('n3')) {
    contentType = 'text/n3';
  } else if (responseType.includes('n-triples')) {
    contentType = 'application/n-triples';
  }

  try {
    $rdf.parse(text, store, iri, contentType);
  } catch (e) {
    throw new Error('Failed to parse ontology: ' + (e instanceof Error ? e.message : String(e)));
  }

  const { classes, properties } = extractTerms(store);
  const prefixes = extractPrefixes(store);

  return {
    sourceLabel: iri,
    classes,
    properties,
    prefixes,
  };
}
