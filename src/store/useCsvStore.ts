import { create } from 'zustand';
import type { CsvData } from '../types/csv';

interface CsvState {
  csvData: CsvData | null;
  previewRowCount: number;
  setCsvData: (data: CsvData) => void;
  setPreviewRowCount: (n: number) => void;
  clearCsv: () => void;
}

export const useCsvStore = create<CsvState>((set) => ({
  csvData: null,
  previewRowCount: 5,
  setCsvData: (data) => set({ csvData: data }),
  setPreviewRowCount: (n) => set({ previewRowCount: n }),
  clearCsv: () => set({ csvData: null }),
}));
