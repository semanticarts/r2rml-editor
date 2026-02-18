import { create } from 'zustand';
import type { CsvData } from '../types/csv';

interface CsvState {
  csvData: CsvData | null;
  previewRowCount: number;
  treatEmptyAsNull: boolean;
  setCsvData: (data: CsvData) => void;
  setPreviewRowCount: (n: number) => void;
  setTreatEmptyAsNull: (v: boolean) => void;
  clearCsv: () => void;
}

export const useCsvStore = create<CsvState>((set) => ({
  csvData: null,
  previewRowCount: 5,
  treatEmptyAsNull: true,
  setCsvData: (data) => set({ csvData: data }),
  setPreviewRowCount: (n) => set({ previewRowCount: n }),
  setTreatEmptyAsNull: (v) => set({ treatEmptyAsNull: v }),
  clearCsv: () => set({ csvData: null }),
}));
