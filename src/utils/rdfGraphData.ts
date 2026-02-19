import type { MappingDocument } from '../types/mapping';
import type { OntologyTerm } from '../types/ontology';
import { XSD } from './constants';
import {
  expandPrefixedTemplate,
  applyTemplate,
  templateHasNull,
  isNullValue,
  buildPrefixMaps,
  toPrefixedIRI,
} from './rdfPreview';

export interface GraphNode {
  id: string;
  label: string;
  type: 'iri' | 'literal';
  isClass?: boolean;
  sublabel?: string;
}

export interface GraphLink {
  source: string;
  target: string;
  label: string;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

const MAX_LITERAL_LEN = 40;

function iriLabel(iri: string, prefixMap: Map<string, string>): string {
  const prefixed = toPrefixedIRI(iri, prefixMap);
  // toPrefixedIRI wraps in <> if no prefix matched
  if (!prefixed.startsWith('<')) return prefixed;
  // Fall back to last segment after # or /
  const hash = iri.lastIndexOf('#');
  const slash = iri.lastIndexOf('/');
  const idx = Math.max(hash, slash);
  return idx >= 0 && idx < iri.length - 1 ? iri.slice(idx + 1) : iri;
}

function predicateLabel(
  predicateIri: string,
  prefixMap: Map<string, string>,
  ontologyProperties?: OntologyTerm[]
): string {
  if (ontologyProperties) {
    const term = ontologyProperties.find((t) => t.iri === predicateIri);
    if (term) {
      if (term.prefLabel) return term.prefLabel;
      if (term.label) return term.label;
    }
  }
  return iriLabel(predicateIri, prefixMap);
}

function trimLiteral(value: string): string {
  if (value.length <= MAX_LITERAL_LEN) return value;
  return value.slice(0, MAX_LITERAL_LEN - 1) + '\u2026';
}

function datatypeSublabel(
  datatype: string | null,
  language: string | null,
  prefixMap: Map<string, string>
): string | undefined {
  if (language) return `@${language}`;
  if (datatype) {
    if (datatype === XSD + 'string') return undefined;
    return iriLabel(datatype, prefixMap);
  }
  return undefined;
}

/**
 * Resolve an object map value to its raw string, or null if it should be skipped.
 */
function resolveRawObject(
  type: 'column' | 'constant' | 'template',
  value: string,
  row: Record<string, string>,
  allPrefixes: Record<string, string>,
  treatEmptyAsNull: boolean
): string | null {
  switch (type) {
    case 'column':
      if (treatEmptyAsNull && isNullValue(row[value])) return null;
      return row[value] ?? '';
    case 'constant':
      return value;
    case 'template': {
      const expanded = expandPrefixedTemplate(value, allPrefixes);
      if (treatEmptyAsNull && templateHasNull(expanded, row)) return null;
      return applyTemplate(expanded, row);
    }
  }
}

export function generateGraphData(
  doc: MappingDocument,
  rows: Record<string, string>[],
  extraPrefixes?: Record<string, string>,
  treatEmptyAsNull?: boolean,
  ontologyProperties?: OntologyTerm[]
): GraphData {
  const nullMode = treatEmptyAsNull ?? false;
  const { allPrefixes, prefixMap } = buildPrefixMaps(doc, extraPrefixes);

  const nodeMap = new Map<string, GraphNode>();
  const links: GraphLink[] = [];
  let literalCounter = 0;

  function ensureIriNode(iri: string): string {
    if (!nodeMap.has(iri)) {
      nodeMap.set(iri, {
        id: iri,
        label: iriLabel(iri, prefixMap),
        type: 'iri',
      });
    }
    return iri;
  }

  function addLiteralNode(
    value: string,
    datatype: string | null,
    language: string | null
  ): string {
    const id = `__literal_${literalCounter++}`;
    nodeMap.set(id, {
      id,
      label: trimLiteral(value),
      type: 'literal',
      sublabel: datatypeSublabel(datatype, language, prefixMap),
    });
    return id;
  }

  for (const tm of doc.triplesMaps) {
    for (const row of rows) {
      const expandedTemplate = expandPrefixedTemplate(tm.subjectMap.template, allPrefixes);
      if (nullMode && templateHasNull(expandedTemplate, row)) continue;

      const subjectIri = applyTemplate(expandedTemplate, row);
      if (!subjectIri) continue;

      const subjectId = ensureIriNode(subjectIri);

      // rdf:type class
      if (tm.subjectMap.classIRI) {
        const classId = ensureIriNode(tm.subjectMap.classIRI);
        const classNode = nodeMap.get(classId);
        if (classNode) classNode.isClass = true;
        links.push({ source: subjectId, target: classId, label: 'is a' });
      }

      for (const pom of tm.predicateObjectMaps) {
        const pred = pom.predicateMap.constant;
        if (!pred) continue;

        const raw = resolveRawObject(
          pom.objectMap.type,
          pom.objectMap.value,
          row,
          allPrefixes,
          nullMode
        );
        if (raw === null) continue;

        const predLabel = predicateLabel(pred, prefixMap, ontologyProperties);

        if (pom.objectMap.termType === 'IRI') {
          const objectId = ensureIriNode(raw);
          links.push({ source: subjectId, target: objectId, label: predLabel });
        } else {
          const objectId = addLiteralNode(
            raw,
            pom.objectMap.datatype,
            pom.objectMap.language
          );
          links.push({ source: subjectId, target: objectId, label: predLabel });
        }
      }
    }
  }

  return {
    nodes: Array.from(nodeMap.values()),
    links,
  };
}
