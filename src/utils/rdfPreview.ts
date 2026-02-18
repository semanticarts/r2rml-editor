import type { MappingDocument } from '../types/mapping';

function applyTemplate(template: string, row: Record<string, string>): string {
  return template.replace(/\{([^}]+)\}/g, (_, col) => {
    return row[col] ?? `{${col}}`;
  });
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
  prefixMap: Map<string, string>
): string {
  let raw = '';
  switch (type) {
    case 'column':
      raw = row[value] ?? '';
      break;
    case 'constant':
      raw = value;
      break;
    case 'template':
      raw = applyTemplate(value, row);
      break;
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
  extraPrefixes?: Record<string, string>
): string {
  const lines: string[] = [];

  // Merge doc prefixes with extra (ontology) prefixes; doc takes priority
  const allPrefixes: Record<string, string> = { ...extraPrefixes, ...doc.prefixes };

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
      const subjectIri = applyTemplate(tm.subjectMap.template, row);
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
          prefixMap
        );

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
