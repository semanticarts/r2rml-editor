export interface CsvData {
  fileName: string;
  headers: string[];
  rows: Record<string, string>[];
  totalRowCount: number;
}
