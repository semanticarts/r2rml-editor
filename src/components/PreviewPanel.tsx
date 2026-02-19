import React, { useMemo, useState } from 'react';
import { Box, Paper, Slider, Tab, Tabs, Typography } from '@mui/material';
import { useMappingStore } from '../store/useMappingStore';
import { useCsvStore } from '../store/useCsvStore';
import { useOntologyStore } from '../store/useOntologyStore';
import { generatePreview } from '../utils/rdfPreview';
import { generateGraphData } from '../utils/rdfGraphData';
import GraphPreview from './GraphPreview';

const PreviewPanel: React.FC = () => {
  const mappingDoc = useMappingStore((s) => s.mappingDoc);
  const csvData = useCsvStore((s) => s.csvData);
  const previewRowCount = useCsvStore((s) => s.previewRowCount);
  const setPreviewRowCount = useCsvStore((s) => s.setPreviewRowCount);
  const allPrefixes = useOntologyStore((s) => s.allPrefixes);
  const allProperties = useOntologyStore((s) => s.allProperties);
  const treatEmptyAsNull = useCsvStore((s) => s.treatEmptyAsNull);
  const [tab, setTab] = useState(0);

  const rows = useMemo(
    () => (csvData ? csvData.rows.slice(0, previewRowCount) : []),
    [csvData, previewRowCount]
  );

  const previewText = useMemo(() => {
    if (!csvData || mappingDoc.triplesMaps.length === 0) return '';
    return generatePreview(mappingDoc, rows, allPrefixes, treatEmptyAsNull);
  }, [mappingDoc, csvData, rows, allPrefixes, treatEmptyAsNull]);

  const graphData = useMemo(() => {
    if (!csvData || mappingDoc.triplesMaps.length === 0) {
      return { nodes: [], links: [] };
    }
    return generateGraphData(mappingDoc, rows, allPrefixes, treatEmptyAsNull, allProperties);
  }, [mappingDoc, csvData, rows, allPrefixes, treatEmptyAsNull, allProperties]);

  return (
    <Paper sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header: tabs + row slider */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 0.5, flexShrink: 0 }}>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          sx={{ minHeight: 32, '& .MuiTab-root': { minHeight: 32, py: 0.5, textTransform: 'none', fontSize: '0.8rem' } }}
        >
          <Tab label="RDF Preview" />
          <Tab label="Visual Preview" />
        </Tabs>
        {csvData && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 'auto' }}>
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
              sx={{ minWidth: 80, maxWidth: 200 }}
            />
          </Box>
        )}
      </Box>

      {/* Tab content — both always mounted to preserve D3 layout across tab switches */}
      <Box
        component="pre"
        sx={{
          bgcolor: 'grey.900',
          color: 'grey.100',
          p: 2,
          borderRadius: 1,
          overflow: 'auto',
          flex: tab === 0 ? 1 : undefined,
          fontSize: '0.78rem',
          fontFamily: 'monospace',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-all',
          m: 0,
          display: tab === 0 ? 'block' : 'none',
        }}
      >
        {previewText || '# Import a CSV and configure mappings to see a preview.'}
      </Box>

      <Box
        sx={{
          flex: tab === 1 ? 1 : undefined,
          borderRadius: 1,
          border: 1,
          borderColor: 'divider',
          overflow: 'hidden',
          bgcolor: '#fafafa',
          display: tab === 1 ? 'flex' : 'none',
        }}
      >
        <GraphPreview data={graphData} />
      </Box>
    </Paper>
  );
};

export default PreviewPanel;
