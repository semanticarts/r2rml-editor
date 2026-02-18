import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type {
  MappingDocument,
  TriplesMap,
  SubjectMap,
  PredicateObjectMap,
} from '../types/mapping';
import { DEFAULT_PREFIXES } from '../utils/constants';

function createDefaultMappingDoc(): MappingDocument {
  return {
    baseIRI: 'http://example.com/resource/',
    prefixes: { ...DEFAULT_PREFIXES },
    triplesMaps: [],
  };
}

interface MappingState {
  mappingDoc: MappingDocument;

  setBaseIRI: (iri: string) => void;
  addPrefix: (prefix: string, namespace: string) => void;
  removePrefix: (prefix: string) => void;

  addTriplesMap: (csvHeaders: string[], csvFileName: string) => void;
  addEmptyTriplesMap: () => void;
  removeTriplesMap: (id: string) => void;

  updateSubjectMap: (triplesMapId: string, updates: Partial<SubjectMap>) => void;

  addPredicateObjectMap: (triplesMapId: string) => void;
  updatePredicateObjectMap: (
    triplesMapId: string,
    pomId: string,
    updates: Partial<PredicateObjectMap>
  ) => void;
  removePredicateObjectMap: (triplesMapId: string, pomId: string) => void;

  loadMappingDocument: (doc: MappingDocument) => void;
  resetMapping: () => void;
}

export const useMappingStore = create<MappingState>((set) => ({
  mappingDoc: createDefaultMappingDoc(),

  setBaseIRI: (iri) =>
    set((state) => ({
      mappingDoc: { ...state.mappingDoc, baseIRI: iri },
    })),

  addPrefix: (prefix, namespace) =>
    set((state) => ({
      mappingDoc: {
        ...state.mappingDoc,
        prefixes: { ...state.mappingDoc.prefixes, [prefix]: namespace },
      },
    })),

  removePrefix: (prefix) =>
    set((state) => {
      const { [prefix]: _, ...rest } = state.mappingDoc.prefixes;
      return { mappingDoc: { ...state.mappingDoc, prefixes: rest } };
    }),

  addTriplesMap: (csvHeaders, csvFileName) =>
    set((state) => {
      const baseIRI = state.mappingDoc.baseIRI;
      const firstCol = csvHeaders[0] || 'id';

      const poms: PredicateObjectMap[] = csvHeaders.map((header) => ({
        id: uuidv4(),
        predicateMap: {
          constant: baseIRI + header,
        },
        objectMap: {
          type: 'column' as const,
          value: header,
          termType: 'Literal' as const,
          datatype: null,
          language: null,
        },
      }));

      const tm: TriplesMap = {
        id: uuidv4(),
        logicalTableName: csvFileName,
        subjectMap: {
          template: baseIRI + '{' + firstCol + '}',
          classIRI: null,
          termType: 'IRI',
        },
        predicateObjectMaps: poms,
      };

      return {
        mappingDoc: {
          ...state.mappingDoc,
          triplesMaps: [...state.mappingDoc.triplesMaps, tm],
        },
      };
    }),

  addEmptyTriplesMap: () =>
    set((state) => {
      const baseIRI = state.mappingDoc.baseIRI;
      const tm: TriplesMap = {
        id: uuidv4(),
        logicalTableName: state.mappingDoc.triplesMaps[0]?.logicalTableName || '',
        subjectMap: {
          template: baseIRI + '{id}',
          classIRI: null,
          termType: 'IRI',
        },
        predicateObjectMaps: [],
      };
      return {
        mappingDoc: {
          ...state.mappingDoc,
          triplesMaps: [...state.mappingDoc.triplesMaps, tm],
        },
      };
    }),

  removeTriplesMap: (id) =>
    set((state) => {
      if (state.mappingDoc.triplesMaps.length <= 1) return state;
      return {
        mappingDoc: {
          ...state.mappingDoc,
          triplesMaps: state.mappingDoc.triplesMaps.filter((tm) => tm.id !== id),
        },
      };
    }),

  updateSubjectMap: (triplesMapId, updates) =>
    set((state) => ({
      mappingDoc: {
        ...state.mappingDoc,
        triplesMaps: state.mappingDoc.triplesMaps.map((tm) =>
          tm.id === triplesMapId
            ? { ...tm, subjectMap: { ...tm.subjectMap, ...updates } }
            : tm
        ),
      },
    })),

  addPredicateObjectMap: (triplesMapId) =>
    set((state) => ({
      mappingDoc: {
        ...state.mappingDoc,
        triplesMaps: state.mappingDoc.triplesMaps.map((tm) =>
          tm.id === triplesMapId
            ? {
                ...tm,
                predicateObjectMaps: [
                  ...tm.predicateObjectMaps,
                  {
                    id: uuidv4(),
                    predicateMap: { constant: '' },
                    objectMap: {
                      type: 'column' as const,
                      value: '',
                      termType: 'Literal' as const,
                      datatype: null,
                      language: null,
                    },
                  },
                ],
              }
            : tm
        ),
      },
    })),

  updatePredicateObjectMap: (triplesMapId, pomId, updates) =>
    set((state) => ({
      mappingDoc: {
        ...state.mappingDoc,
        triplesMaps: state.mappingDoc.triplesMaps.map((tm) =>
          tm.id === triplesMapId
            ? {
                ...tm,
                predicateObjectMaps: tm.predicateObjectMaps.map((pom) =>
                  pom.id === pomId ? { ...pom, ...updates } : pom
                ),
              }
            : tm
        ),
      },
    })),

  removePredicateObjectMap: (triplesMapId, pomId) =>
    set((state) => ({
      mappingDoc: {
        ...state.mappingDoc,
        triplesMaps: state.mappingDoc.triplesMaps.map((tm) =>
          tm.id === triplesMapId
            ? {
                ...tm,
                predicateObjectMaps: tm.predicateObjectMaps.filter(
                  (pom) => pom.id !== pomId
                ),
              }
            : tm
        ),
      },
    })),

  loadMappingDocument: (doc) => set({ mappingDoc: doc }),

  resetMapping: () => set({ mappingDoc: createDefaultMappingDoc() }),
}));
