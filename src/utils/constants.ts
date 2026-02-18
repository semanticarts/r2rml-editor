export const RR = 'http://www.w3.org/ns/r2rml#';
export const RDF = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#';
export const RDFS = 'http://www.w3.org/2000/01/rdf-schema#';
export const XSD = 'http://www.w3.org/2001/XMLSchema#';
export const OWL = 'http://www.w3.org/2002/07/owl#';
export const SKOS = 'http://www.w3.org/2004/02/skos/core#';

export const XSD_DATATYPES = [
  { label: 'string', iri: XSD + 'string' },
  { label: 'integer', iri: XSD + 'integer' },
  { label: 'decimal', iri: XSD + 'decimal' },
  { label: 'float', iri: XSD + 'float' },
  { label: 'double', iri: XSD + 'double' },
  { label: 'boolean', iri: XSD + 'boolean' },
  { label: 'date', iri: XSD + 'date' },
  { label: 'dateTime', iri: XSD + 'dateTime' },
  { label: 'anyURI', iri: XSD + 'anyURI' },
];

export const DEFAULT_PREFIXES: Record<string, string> = {
  rr: RR,
  rdf: RDF,
  rdfs: RDFS,
  xsd: XSD,
  owl: OWL,
};

export const RDFS_PROPERTIES = [
  { localName: 'label', iri: RDFS + 'label', comment: 'A human-readable name' },
  { localName: 'comment', iri: RDFS + 'comment', comment: 'A description' },
  { localName: 'seeAlso', iri: RDFS + 'seeAlso', comment: 'Further information' },
  { localName: 'isDefinedBy', iri: RDFS + 'isDefinedBy', comment: 'The defining resource' },
  { localName: 'domain', iri: RDFS + 'domain', comment: 'The domain of a property' },
  { localName: 'range', iri: RDFS + 'range', comment: 'The range of a property' },
  { localName: 'subClassOf', iri: RDFS + 'subClassOf', comment: 'Subclass relationship' },
  { localName: 'subPropertyOf', iri: RDFS + 'subPropertyOf', comment: 'Subproperty relationship' },
  { localName: 'member', iri: RDFS + 'member', comment: 'A member of the resource' },
];

export const SKOS_PROPERTIES = [
  { localName: 'prefLabel', iri: SKOS + 'prefLabel', comment: 'Preferred lexical label' },
  { localName: 'altLabel', iri: SKOS + 'altLabel', comment: 'Alternative lexical label' },
  { localName: 'hiddenLabel', iri: SKOS + 'hiddenLabel', comment: 'Hidden lexical label' },
  { localName: 'definition', iri: SKOS + 'definition', comment: 'A complete explanation of meaning' },
  { localName: 'example', iri: SKOS + 'example', comment: 'An example' },
  { localName: 'scopeNote', iri: SKOS + 'scopeNote', comment: 'Usage information' },
  { localName: 'notation', iri: SKOS + 'notation', comment: 'Notation or code' },
  { localName: 'broader', iri: SKOS + 'broader', comment: 'Broader concept' },
  { localName: 'narrower', iri: SKOS + 'narrower', comment: 'Narrower concept' },
  { localName: 'related', iri: SKOS + 'related', comment: 'Related concept' },
  { localName: 'inScheme', iri: SKOS + 'inScheme', comment: 'Concept scheme membership' },
  { localName: 'topConceptOf', iri: SKOS + 'topConceptOf', comment: 'Top concept of a scheme' },
  { localName: 'exactMatch', iri: SKOS + 'exactMatch', comment: 'Exact equivalence mapping' },
  { localName: 'closeMatch', iri: SKOS + 'closeMatch', comment: 'Close equivalence mapping' },
  { localName: 'broadMatch', iri: SKOS + 'broadMatch', comment: 'Broader equivalence mapping' },
  { localName: 'narrowMatch', iri: SKOS + 'narrowMatch', comment: 'Narrower equivalence mapping' },
  { localName: 'relatedMatch', iri: SKOS + 'relatedMatch', comment: 'Related equivalence mapping' },
];
