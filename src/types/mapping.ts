export interface SubjectMap {
  template: string;
  classIRI: string | null;
  termType: 'IRI' | 'BlankNode';
}

export interface PredicateMap {
  constant: string;
}

export interface ObjectMap {
  type: 'column' | 'constant' | 'template';
  value: string;
  termType: 'IRI' | 'Literal' | 'BlankNode';
  datatype: string | null;
  language: string | null;
}

export interface PredicateObjectMap {
  id: string;
  predicateMap: PredicateMap;
  objectMap: ObjectMap;
}

export interface TriplesMap {
  id: string;
  logicalTableName: string;
  subjectMap: SubjectMap;
  predicateObjectMaps: PredicateObjectMap[];
}

export interface MappingDocument {
  baseIRI: string;
  prefixes: Record<string, string>;
  triplesMaps: TriplesMap[];
}
