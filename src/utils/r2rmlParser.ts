import * as $rdf from 'rdflib';
import { v4 as uuidv4 } from 'uuid';
import type {
  MappingDocument,
  TriplesMap,
  SubjectMap,
  PredicateObjectMap,
  ObjectMap,
} from '../types/mapping';
import { RR, RDF, DEFAULT_PREFIXES } from './constants';

const rr = $rdf.Namespace(RR);
const rdfNs = $rdf.Namespace(RDF);

/* eslint-disable @typescript-eslint/no-explicit-any */

function getLitValue(store: $rdf.IndexedFormula, subject: any, predicate: any): string | null {
  const stmts = store.statementsMatching(subject, predicate, undefined);
  if (stmts.length > 0) {
    return stmts[0].object.value;
  }
  return null;
}

function getNode(store: $rdf.IndexedFormula, subject: any, predicate: any): any | null {
  const stmts = store.statementsMatching(subject, predicate, undefined);
  if (stmts.length > 0) {
    return stmts[0].object;
  }
  return null;
}

function parseObjectMap(store: $rdf.IndexedFormula, omNode: any): ObjectMap {
  const column = getLitValue(store, omNode, rr('column'));
  const constant = getNode(store, omNode, rr('constant'));
  const template = getLitValue(store, omNode, rr('template'));
  const termTypeNode = getNode(store, omNode, rr('termType'));
  const datatypeNode = getNode(store, omNode, rr('datatype'));
  const language = getLitValue(store, omNode, rr('language'));

  let type: ObjectMap['type'] = 'column';
  let value = '';

  if (column) {
    type = 'column';
    value = column;
  } else if (template) {
    type = 'template';
    value = template;
  } else if (constant) {
    type = 'constant';
    value = constant.value;
  }

  let termType: ObjectMap['termType'] = 'Literal';
  if (termTypeNode) {
    const tv = termTypeNode.value;
    if (tv === RR + 'IRI') termType = 'IRI';
    else if (tv === RR + 'BlankNode') termType = 'BlankNode';
  } else if (constant && constant.termType === 'NamedNode') {
    termType = 'IRI';
  }

  return {
    type,
    value,
    termType,
    datatype: datatypeNode ? datatypeNode.value : null,
    language: language || null,
  };
}

export function parseR2rmlTurtle(turtleStr: string, baseURI?: string): MappingDocument {
  const store = $rdf.graph();
  const base = baseURI || 'http://example.com/mapping/';

  try {
    $rdf.parse(turtleStr, store, base, 'text/turtle');
  } catch (e) {
    throw new Error('Failed to parse Turtle: ' + (e instanceof Error ? e.message : String(e)));
  }

  const triplesMaps: TriplesMap[] = [];

  const tmStatements = store.statementsMatching(undefined, rdfNs('type') as any, rr('TriplesMap') as any);
  const ltStatements = store.statementsMatching(undefined, rr('logicalTable') as any, undefined);

  const tmSubjects = new Set<string>();
  const tmNodes: any[] = [];

  for (const stmt of [...tmStatements, ...ltStatements]) {
    if (!tmSubjects.has(stmt.subject.value)) {
      tmSubjects.add(stmt.subject.value);
      tmNodes.push(stmt.subject);
    }
  }

  for (const tmNode of tmNodes) {
    const ltNode = getNode(store, tmNode, rr('logicalTable'));
    let tableName = '';
    if (ltNode) {
      tableName = getLitValue(store, ltNode, rr('tableName')) || '';
    }

    const smNode = getNode(store, tmNode, rr('subjectMap'));
    const subjectMap: SubjectMap = {
      template: '',
      classIRI: null,
      termType: 'IRI',
    };

    if (smNode) {
      subjectMap.template = getLitValue(store, smNode, rr('template')) || '';
      const classNode = getNode(store, smNode, rr('class'));
      if (classNode) {
        subjectMap.classIRI = classNode.value;
      }
      const ttNode = getNode(store, smNode, rr('termType'));
      if (ttNode && ttNode.value === RR + 'BlankNode') {
        subjectMap.termType = 'BlankNode';
      }
    }

    const pomStatements = store.statementsMatching(tmNode, rr('predicateObjectMap') as any, undefined);
    const predicateObjectMaps: PredicateObjectMap[] = [];

    for (const pomStmt of pomStatements) {
      const pomNode = pomStmt.object;

      const predNode = getNode(store, pomNode, rr('predicate'));
      const predicateConstant = predNode ? predNode.value : '';

      const omNode = getNode(store, pomNode, rr('objectMap'));
      let objectMap: ObjectMap = {
        type: 'column',
        value: '',
        termType: 'Literal',
        datatype: null,
        language: null,
      };

      if (omNode) {
        objectMap = parseObjectMap(store, omNode);
      }

      predicateObjectMaps.push({
        id: uuidv4(),
        predicateMap: { constant: predicateConstant },
        objectMap,
      });
    }

    triplesMaps.push({
      id: uuidv4(),
      logicalTableName: tableName,
      subjectMap,
      predicateObjectMaps,
    });
  }

  return {
    baseIRI: base,
    prefixes: { ...DEFAULT_PREFIXES },
    triplesMaps,
  };
}
