import React, { useMemo } from 'react';
import { Box, Paper, Typography, Slider } from '@mui/material';
import { useMappingStore } from '../store/useMappingStore';
import { useCsvStore } from '../store/useCsvStore';
import { useOntologyStore } from '../store/useOntologyStore';
import { generatePreview } from '../utils/rdfPreview';

const PreviewPanel: React.FC = () => {
  const mappingDoc = useMappingStore((s) => s.mappingDoc);
  const csvData = useCsvStore((s) => s.csvData);
  const previewRowCount = useCsvStore((s) => s.previewRowCount);
  const setPreviewRowCount = useCsvStore((s) => s.setPreviewRowCount);
  const allPrefixes = useOntologyStore((s) => s.allPrefixes);
  const treatEmptyAsNull = useCsvStore((s) => s.treatEmptyAsNull);

  const previewText = useMemo(() => {
    if (!csvData || mappingDoc.triplesMaps.length === 0) return '';
    const rows = csvData.rows.slice(0, previewRowCount);
    return generatePreview(mappingDoc, rows, allPrefixes, treatEmptyAsNull);
  }, [mappingDoc, csvData, previewRowCount, allPrefixes, treatEmptyAsNull]);

  return (
    <Paper sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1, flexShrink: 0 }}>
        <Typography variant="subtitle2" sx={{ whiteSpace: 'nowrap' }}>
          Turtle Preview
        </Typography>
        {csvData && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
            <Typography variant="caption" sx={{ whiteSpace: 'nowrap' }}>
              Rows: {previewRowCount}
            </Typography>
            <Slider
              value={previewRowCount}
              onChange={(_, val) => setPreviewRowCount(val as number)}
              min={1}
              max={Math.min(csvData.totalRowCount, 50)}
              step={1}
              size="small"
              sx={{ maxWidth: 120 }}
            />
          </Box>
        )}
      </Box>
      <Box
        component="pre"
        sx={{
          bgcolor: 'grey.900',
          color: 'grey.100',
          p: 2,
          borderRadius: 1,
          overflow: 'auto',
          flex: 1,
          fontSize: '0.78rem',
          fontFamily: 'monospace',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-all',
          m: 0,
        }}
      >
        {previewText || '# Import a CSV and configure mappings to see a preview.'}
      </Box>
    </Paper>
  );
};

export default PreviewPanel;
