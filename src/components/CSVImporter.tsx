import React, { useCallback } from 'react';
import {
  Box,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  IconButton,
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import ClearIcon from '@mui/icons-material/Clear';
import { parseCsvFile } from '../utils/csvParser';
import { useCsvStore } from '../store/useCsvStore';
import { useMappingStore } from '../store/useMappingStore';

const CSVImporter: React.FC = () => {
  const { csvData, previewRowCount, setCsvData, clearCsv } =
    useCsvStore();
  const { addTriplesMap, resetMapping } = useMappingStore();

  const handleFileUpload = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      try {
        const data = await parseCsvFile(file);
        setCsvData(data);
        resetMapping();
        addTriplesMap(data.headers, data.fileName);
      } catch (err) {
        console.error('Failed to parse CSV:', err);
      }

      // Reset input so the same file can be re-uploaded
      event.target.value = '';
    },
    [setCsvData, addTriplesMap, resetMapping]
  );

  const handleClear = useCallback(() => {
    clearCsv();
    resetMapping();
  }, [clearCsv, resetMapping]);

  const displayRows = csvData
    ? csvData.rows.slice(0, previewRowCount)
    : [];

  return (
    <Paper sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
        <Button
          variant="contained"
          component="label"
          startIcon={<UploadFileIcon />}
        >
          Import CSV
          <input
            type="file"
            accept=".csv"
            hidden
            onChange={handleFileUpload}
          />
        </Button>
        {csvData && (
          <>
            <Typography variant="body2" color="text.secondary">
              {csvData.fileName} ({csvData.totalRowCount} rows,{' '}
              {csvData.headers.length} columns)
            </Typography>
            <IconButton size="small" onClick={handleClear} title="Clear CSV">
              <ClearIcon />
            </IconButton>
          </>
        )}
      </Box>

      {csvData && (
        <>
          <TableContainer sx={{ maxHeight: 300 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold', bgcolor: 'grey.100' }}>
                    #
                  </TableCell>
                  {csvData.headers.map((header) => (
                    <TableCell
                      key={header}
                      sx={{ fontWeight: 'bold', bgcolor: 'grey.100' }}
                    >
                      {header}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {displayRows.map((row, idx) => (
                  <TableRow key={idx}>
                    <TableCell sx={{ color: 'text.secondary' }}>
                      {idx + 1}
                    </TableCell>
                    {csvData.headers.map((header) => (
                      <TableCell key={header}>{row[header]}</TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}

      {!csvData && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Upload a CSV file to get started. Column headers will be used as the
          basis for your R2RML mapping.
        </Typography>
      )}
    </Paper>
  );
};

export default CSVImporter;
