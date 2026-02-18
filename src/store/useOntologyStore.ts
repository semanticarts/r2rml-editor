import { create } from 'zustand';
import type { LoadedOntology, OntologyTerm } from '../types/ontology';
import {
  RDFS, SKOS,
  RDFS_PROPERTIES, SKOS_PROPERTIES,
} from '../utils/constants';

interface OntologyState {
  ontologies: LoadedOntology[];
  rdfsEnabled: boolean;
  skosEnabled: boolean;

  // Derived
  allClasses: OntologyTerm[];
  allProperties: OntologyTerm[];
  allPrefixes: Record<string, string>;

  // Actions
  addOntology: (ont: LoadedOntology) => void;
  removeOntology: (sourceLabel: string) => void;
  clearOntologies: () => void;
  setRdfsEnabled: (enabled: boolean) => void;
  setSkosEnabled: (enabled: boolean) => void;
}

function flattenTerms(ontologies: LoadedOntology[], type: 'class' | 'property'): OntologyTerm[] {
  const seen = new Set<string>();
  const terms: OntologyTerm[] = [];
  for (const ont of ontologies) {
    const source = type === 'class' ? ont.classes : ont.properties;
    for (const term of source) {
      if (!seen.has(term.iri)) {
        seen.add(term.iri);
        terms.push(term);
      }
    }
  }
  return terms;
}

function buildBuiltinProperties(
  rdfsEnabled: boolean,
  skosEnabled: boolean
): OntologyTerm[] {
  const terms: OntologyTerm[] = [];

  if (rdfsEnabled) {
    for (const p of RDFS_PROPERTIES) {
      terms.push({
        iri: p.iri,
        label: null,
        prefLabel: null,
        type: 'property',
        comment: p.comment,
      });
    }
  }

  if (skosEnabled) {
    for (const p of SKOS_PROPERTIES) {
      terms.push({
        iri: p.iri,
        label: null,
        prefLabel: null,
        type: 'property',
        comment: p.comment,
      });
    }
  }

  return terms;
}

function mergeProperties(
  ontologyProperties: OntologyTerm[],
  builtinProperties: OntologyTerm[]
): OntologyTerm[] {
  const seen = new Set<string>();
  const merged: OntologyTerm[] = [];

  // Ontology properties take priority (may have labels)
  for (const t of ontologyProperties) {
    if (!seen.has(t.iri)) {
      seen.add(t.iri);
      merged.push(t);
    }
  }

  for (const t of builtinProperties) {
    if (!seen.has(t.iri)) {
      seen.add(t.iri);
      merged.push(t);
    }
  }

  const displayLabel = (t: OntologyTerm) => t.prefLabel || t.label || t.iri;
  return merged.sort((a, b) => displayLabel(a).localeCompare(displayLabel(b)));
}

function aggregatePrefixes(
  ontologies: LoadedOntology[],
  rdfsEnabled: boolean,
  skosEnabled: boolean
): Record<string, string> {
  const prefixes: Record<string, string> = {};

  // Add ontology prefixes
  for (const ont of ontologies) {
    for (const [prefix, ns] of Object.entries(ont.prefixes)) {
      if (prefix && !prefixes[prefix]) {
        prefixes[prefix] = ns;
      }
    }
  }

  // Add vocabulary prefixes when toggled
  if (rdfsEnabled && !prefixes['rdfs']) {
    prefixes['rdfs'] = RDFS;
  }
  if (skosEnabled && !prefixes['skos']) {
    prefixes['skos'] = SKOS;
  }

  return prefixes;
}

function hasNamespaceProperties(ontologies: LoadedOntology[], ns: string): boolean {
  for (const ont of ontologies) {
    for (const prop of ont.properties) {
      if (prop.iri.startsWith(ns)) return true;
    }
  }
  return false;
}

function recompute(
  ontologies: LoadedOntology[],
  rdfsEnabled: boolean,
  skosEnabled: boolean
) {
  const ontologyProperties = flattenTerms(ontologies, 'property');
  const builtinProperties = buildBuiltinProperties(rdfsEnabled, skosEnabled);
  const allClasses = flattenTerms(ontologies, 'class');
  const displayLabel = (t: OntologyTerm) => t.prefLabel || t.label || t.iri;
  allClasses.sort((a, b) => displayLabel(a).localeCompare(displayLabel(b)));

  return {
    allClasses,
    allProperties: mergeProperties(ontologyProperties, builtinProperties),
    allPrefixes: aggregatePrefixes(ontologies, rdfsEnabled, skosEnabled),
  };
}

export const useOntologyStore = create<OntologyState>((set) => ({
  ontologies: [],
  rdfsEnabled: false,
  skosEnabled: false,
  allClasses: [],
  allProperties: [],
  allPrefixes: {},

  addOntology: (ont) =>
    set((state) => {
      const ontologies = [...state.ontologies, ont];
      // Auto-enable RDFS/SKOS if ontology contains their properties
      const rdfsEnabled = state.rdfsEnabled || hasNamespaceProperties([ont], RDFS);
      const skosEnabled = state.skosEnabled || hasNamespaceProperties([ont], SKOS);
      return {
        ontologies,
        rdfsEnabled,
        skosEnabled,
        ...recompute(ontologies, rdfsEnabled, skosEnabled),
      };
    }),

  removeOntology: (sourceLabel) =>
    set((state) => {
      const ontologies = state.ontologies.filter((o) => o.sourceLabel !== sourceLabel);
      return {
        ontologies,
        ...recompute(ontologies, state.rdfsEnabled, state.skosEnabled),
      };
    }),

  clearOntologies: () =>
    set({
      ontologies: [],
      rdfsEnabled: false,
      skosEnabled: false,
      allClasses: [],
      allProperties: [],
      allPrefixes: {},
    }),

  setRdfsEnabled: (enabled) =>
    set((state) => ({
      rdfsEnabled: enabled,
      ...recompute(state.ontologies, enabled, state.skosEnabled),
    })),

  setSkosEnabled: (enabled) =>
    set((state) => ({
      skosEnabled: enabled,
      ...recompute(state.ontologies, state.rdfsEnabled, enabled),
    })),
}));

/**
 * Format an IRI for display:
 * 1. skos:prefLabel if available
 * 2. rdfs:label if available
 * 3. QName using known prefixes (e.g. foaf:name)
 * 4. Full IRI as fallback
 */
export function formatTermLabel(term: OntologyTerm, prefixes: Record<string, string>): string {
  if (term.prefLabel) return term.prefLabel;
  if (term.label) return term.label;
  return toQName(term.iri, prefixes) ?? term.iri;
}

/**
 * Try to convert a full IRI to a QName using the given prefix map.
 * Returns null if no matching prefix is found.
 */
export function toQName(iri: string, prefixes: Record<string, string>): string | null {
  let bestPrefix = '';
  let bestNs = '';
  for (const [prefix, ns] of Object.entries(prefixes)) {
    if (iri.startsWith(ns) && ns.length > bestNs.length) {
      bestPrefix = prefix;
      bestNs = ns;
    }
  }
  if (bestNs) {
    const localName = iri.slice(bestNs.length);
    if (localName && !localName.includes('/') && !localName.includes('#')) {
      return `${bestPrefix}:${localName}`;
    }
  }
  return null;
}
