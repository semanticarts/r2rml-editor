import * as $rdf from 'rdflib';
import type { MappingDocument } from '../types/mapping';
import { RR, RDF } from './constants';

const rr = $rdf.Namespace(RR);
const rdf = $rdf.Namespace(RDF);

export function serializeMapping(doc: MappingDocument): string {
  const store = $rdf.graph();
  const baseURI = doc.baseIRI || 'http://example.com/mapping/';

  for (const tm of doc.triplesMaps) {
    const tmNode = $rdf.sym(baseURI + '#' + tm.id);

    store.add(tmNode, rdf('type'), rr('TriplesMap'));

    // Logical table
    const ltNode = $rdf.blankNode();
    store.add(tmNode, rr('logicalTable'), ltNode);
    store.add(ltNode, rr('tableName'), $rdf.lit(tm.logicalTableName));

    // Subject map
    const smNode = $rdf.blankNode();
    store.add(tmNode, rr('subjectMap'), smNode);
    store.add(smNode, rr('template'), $rdf.lit(tm.subjectMap.template));
    if (tm.subjectMap.termType === 'BlankNode') {
      store.add(smNode, rr('termType'), rr('BlankNode'));
    }
    if (tm.subjectMap.classIRI) {
      store.add(smNode, rr('class'), $rdf.sym(tm.subjectMap.classIRI));
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
          store.add(omNode, rr('template'), $rdf.lit(pom.objectMap.value));
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

  // Serialize to Turtle
  const prefixes: Record<string, string> = { ...doc.prefixes };
  if (!prefixes['rr']) prefixes['rr'] = RR;

  let turtle = '';
  for (const [prefix, ns] of Object.entries(prefixes)) {
    turtle += `@prefix ${prefix}: <${ns}> .\n`;
  }
  turtle += '\n';

  // Use rdflib serializer
  const serialized = $rdf.serialize(null, store, baseURI, 'text/turtle') ?? '';
  // Strip any prefixes rdflib added (we already added ours) and append
  const lines = serialized.split('\n').filter(
    (line) => !line.startsWith('@prefix') && line.trim() !== ''
  );
  turtle += lines.join('\n') + '\n';

  return turtle;
}
