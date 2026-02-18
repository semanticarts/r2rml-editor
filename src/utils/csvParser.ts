import Papa from 'papaparse';
import type { CsvData } from '../types/csv';

export function parseCsvFile(file: File, previewRows?: number): Promise<CsvData> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      preview: previewRows ?? 0,
      skipEmptyLines: true,
      complete: (results) => {
        resolve({
          fileName: file.name,
          headers: results.meta.fields ?? [],
          rows: results.data as Record<string, string>[],
          totalRowCount: results.data.length,
        });
      },
      error: (err: Error) => reject(err),
    });
  });
}
