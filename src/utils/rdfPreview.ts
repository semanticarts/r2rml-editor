import type { MappingDocument } from '../types/mapping';

/**
 * Expand a prefixed template like "ex:Person/{id}" to "http://example.com/Person/{id}"
 * using the known prefix map. Also handles the empty prefix ":localName".
 */
function expandPrefixedTemplate(
  template: string,
  prefixes: Record<string, string>
): string {
  // Empty prefix — :rest
  if (template.startsWith(':')) {
    const ns = prefixes[''];
    if (ns) return ns + template.slice(1);
  }
  // Named prefix — prefix:rest
  const match = template.match(/^([a-zA-Z_][\w.-]*):(.+)$/);
  if (match) {
    const [, prefix, rest] = match;
    const ns = prefixes[prefix];
    if (ns) return ns + rest;
  }
  return template;
}

function applyTemplate(template: string, row: Record<string, string>): string {
  return template.replace(/\{([^}]+)\}/g, (_, col) => {
    return row[col] ?? `{${col}}`;
  });
}

/**
 * Returns true if any column referenced in the template has an
 * empty or whitespace-only value in the given row.
 */
function templateHasNull(
  template: string,
  row: Record<string, string>
): boolean {
  let hasNull = false;
  template.replace(/\{([^}]+)\}/g, (_, col) => {
    const val = row[col];
    if (val === undefined || val === null || val.trim() === '') {
      hasNull = true;
    }
    return '';
  });
  return hasNull;
}

function isNullValue(value: string | undefined | null): boolean {
  return value === undefined || value === null || value.trim() === '';
}

function escapeLiteral(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

interface PredicateObject {
  predicate: string;
  object: string;
}

function resolveObject(
  type: 'column' | 'constant' | 'template',
  value: string,
  termType: 'IRI' | 'Literal' | 'BlankNode',
  datatype: string | null,
  language: string | null,
  row: Record<string, string>,
  prefixMap: Map<string, string>,
  allPrefixes: Record<string, string>,
  treatEmptyAsNull: boolean
): string | null {
  let raw = '';
  switch (type) {
    case 'column':
      if (treatEmptyAsNull && isNullValue(row[value])) return null;
      raw = row[value] ?? '';
      break;
    case 'constant':
      raw = value;
      break;
    case 'template': {
      const expanded = expandPrefixedTemplate(value, allPrefixes);
      if (treatEmptyAsNull && templateHasNull(expanded, row)) return null;
      raw = applyTemplate(expanded, row);
      break;
    }
  }

  if (termType === 'IRI') {
    return toPrefixed(raw, prefixMap);
  }

  let obj = `"${escapeLiteral(raw)}"`;
  if (datatype) {
    obj += `^^${toPrefixed(datatype, prefixMap)}`;
  } else if (language) {
    obj += `@${language}`;
  }
  return obj;
}

function toPrefixed(iri: string, prefixMap: Map<string, string>): string {
  let bestPrefix = '';
  let bestNs = '';
  for (const [ns, prefix] of prefixMap) {
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
  return `<${iri}>`;
}

export function generatePreview(
  doc: MappingDocument,
  rows: Record<string, string>[],
  extraPrefixes?: Record<string, string>,
  treatEmptyAsNull?: boolean
): string {
  const lines: string[] = [];
  const nullMode = treatEmptyAsNull ?? false;

  // Merge doc prefixes with extra (ontology) prefixes; doc takes priority
  const allPrefixes: Record<string, string> = { ...extraPrefixes, ...doc.prefixes };

  // Add base IRI as the empty prefix ':'
  if (doc.baseIRI && !allPrefixes['']) {
    allPrefixes[''] = doc.baseIRI;
  }

  // Build reverse prefix map: namespace -> prefix
  const prefixMap = new Map<string, string>();
  for (const [prefix, ns] of Object.entries(allPrefixes)) {
    prefixMap.set(ns, prefix);
  }

  // Add prefix declarations
  for (const [prefix, ns] of Object.entries(allPrefixes)) {
    lines.push(`@prefix ${prefix}: <${ns}> .`);
  }
  if (lines.length > 0) lines.push('');

  for (const tm of doc.triplesMaps) {
    for (const row of rows) {
      const expandedTemplate = expandPrefixedTemplate(tm.subjectMap.template, allPrefixes);

      // Skip subject if it contains null column values
      if (nullMode && templateHasNull(expandedTemplate, row)) continue;

      const subjectIri = applyTemplate(expandedTemplate, row);
      if (!subjectIri) continue;

      const subjectStr = tm.subjectMap.termType === 'BlankNode'
        ? `_:${subjectIri.replace(/[^a-zA-Z0-9_]/g, '_')}`
        : toPrefixed(subjectIri, prefixMap);

      // Collect all predicate-object pairs for this subject
      const pairs: PredicateObject[] = [];

      if (tm.subjectMap.classIRI) {
        pairs.push({
          predicate: 'a',
          object: toPrefixed(tm.subjectMap.classIRI, prefixMap),
        });
      }

      for (const pom of tm.predicateObjectMaps) {
        const predicate = pom.predicateMap.constant;
        if (!predicate) continue;

        const object = resolveObject(
          pom.objectMap.type,
          pom.objectMap.value,
          pom.objectMap.termType,
          pom.objectMap.datatype,
          pom.objectMap.language,
          row,
          prefixMap,
          allPrefixes,
          nullMode
        );

        // Skip this triple if object resolved to null
        if (object === null) continue;

        pairs.push({
          predicate: toPrefixed(predicate, prefixMap),
          object,
        });
      }

      if (pairs.length === 0) continue;

      // Render as Turtle with ; separators
      lines.push(`${subjectStr}`);
      for (let i = 0; i < pairs.length; i++) {
        const sep = i < pairs.length - 1 ? ' ;' : ' .';
        lines.push(`    ${pairs[i].predicate} ${pairs[i].object}${sep}`);
      }
      lines.push('');
    }
  }

  return lines.join('\n');
}
