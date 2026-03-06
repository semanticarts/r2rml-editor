import * as $rdf from 'rdflib';
import type { MappingDocument } from '../types/mapping';
import { RR, RDF } from './constants';

const rr = $rdf.Namespace(RR);
const rdf = $rdf.Namespace(RDF);

/**
 * Expand a prefixed template/IRI like "ex:Person/{id}" to its full form
 * using the given prefix map.
 */
function expandPrefixed(value: string, prefixes: Record<string, string>): string {
  // Empty prefix — :rest
  if (value.startsWith(':')) {
    const ns = prefixes[''];
    if (ns) return ns + value.slice(1);
  }
  // Named prefix — prefix:rest (rest may contain {col} placeholders)
  const match = value.match(/^([a-zA-Z_][\w.-]*):(.+)$/);
  if (match) {
    const [, prefix, rest] = match;
    const ns = prefixes[prefix];
    if (ns) return ns + rest;
  }
  return value;
}

export function serializeMapping(
  doc: MappingDocument,
  extraPrefixes?: Record<string, string>
): string {
  const store = $rdf.graph();
  const baseURI = doc.baseIRI || 'http://example.com/mapping/';

  // Merge all known prefixes for expansion and output
  const allPrefixes: Record<string, string> = {
    ...extraPrefixes,
    ...doc.prefixes,
  };
  // Add base IRI as empty prefix
  if (doc.baseIRI && !allPrefixes['']) {
    allPrefixes[''] = doc.baseIRI;
  }

  for (const tm of doc.triplesMaps) {
    const tmNode = $rdf.sym(baseURI + '#' + tm.id);

    store.add(tmNode, rdf('type'), rr('TriplesMap'));

    // Logical table
    const ltNode = $rdf.blankNode();
    store.add(tmNode, rr('logicalTable'), ltNode);
    store.add(ltNode, rr('tableName'), $rdf.lit(tm.logicalTableName));

    // Subject map — expand prefixed template
    const smNode = $rdf.blankNode();
    store.add(tmNode, rr('subjectMap'), smNode);
    store.add(smNode, rr('template'), $rdf.lit(expandPrefixed(tm.subjectMap.template, allPrefixes)));
    if (tm.subjectMap.termType === 'BlankNode') {
      store.add(smNode, rr('termType'), rr('BlankNode'));
    }
    if (tm.subjectMap.classIRI) {
      store.add(smNode, rr('class'), $rdf.sym(expandPrefixed(tm.subjectMap.classIRI, allPrefixes)));
    }

    // Predicate-object maps
    for (const pom of tm.predicateObjectMaps) {
      const pomNode = $rdf.blankNode();
      store.add(tmNode, rr('predicateObjectMap'), pomNode);

      // Predicate
      if (pom.predicateMap.constant) {
        store.add(pomNode, rr('predicate'), $rdf.sym(pom.predicateMap.constant));
      }

      // Object map
      const omNode = $rdf.blankNode();
      store.add(pomNode, rr('objectMap'), omNode);

      switch (pom.objectMap.type) {
        case 'column':
          store.add(omNode, rr('column'), $rdf.lit(pom.objectMap.value));
          break;
        case 'constant':
          if (pom.objectMap.termType === 'IRI') {
            store.add(omNode, rr('constant'), $rdf.sym(pom.objectMap.value));
          } else {
            store.add(omNode, rr('constant'), $rdf.lit(pom.objectMap.value));
          }
          break;
        case 'template':
          store.add(omNode, rr('template'), $rdf.lit(expandPrefixed(pom.objectMap.value, allPrefixes)));
          break;
      }

      if (pom.objectMap.termType === 'IRI') {
        store.add(omNode, rr('termType'), rr('IRI'));
      } else if (pom.objectMap.termType === 'BlankNode') {
        store.add(omNode, rr('termType'), rr('BlankNode'));
      }

      if (pom.objectMap.datatype) {
        store.add(omNode, rr('datatype'), $rdf.sym(pom.objectMap.datatype));
      }
      if (pom.objectMap.language) {
        store.add(omNode, rr('language'), $rdf.lit(pom.objectMap.language));
      }
    }
  }

  // Register prefixes with rdflib so it uses our names (e.g. "rr:" not "r:")
  for (const [prefix, ns] of Object.entries(allPrefixes)) {
    if (prefix) {
      (store as any).setPrefixForURI(prefix, ns);
    }
  }

  // Ensure rr: prefix is always included
  const outputPrefixes: Record<string, string> = { ...allPrefixes };
  if (!outputPrefixes['rr']) outputPrefixes['rr'] = RR;
  // Remove empty prefix from R2RML output (not standard in R2RML)
  delete outputPrefixes[''];

  let turtle = '';
  // Add @base declaration
  if (doc.baseIRI) {
    turtle += `@base <${doc.baseIRI}> .\n`;
  }
  for (const [prefix, ns] of Object.entries(outputPrefixes)) {
    turtle += `@prefix ${prefix}: <${ns}> .\n`;
  }
  turtle += '\n';

  // Use rdflib serializer
  const serialized = $rdf.serialize(null, store, baseURI, 'text/turtle') ?? '';
  // Strip any prefixes rdflib added (we already added ours) and append
  const lines = serialized.split('\n').filter(
    (line) => !line.startsWith('@prefix') && !line.startsWith('@base') && line.trim() !== ''
  );
  turtle += lines.join('\n') + '\n';

  return turtle;
}
