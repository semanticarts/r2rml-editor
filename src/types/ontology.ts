export interface OntologyTerm {
  iri: string;
  label: string | null;
  prefLabel: string | null;
  type: 'class' | 'property';
  comment: string | null;
}

export interface LoadedOntology {
  sourceLabel: string;
  classes: OntologyTerm[];
  properties: OntologyTerm[];
  prefixes: Record<string, string>;
}
