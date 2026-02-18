import React, { useMemo, useState } from 'react';
import {
  Box,
  Button,
  Paper,
  TextField,
  Typography,
  Snackbar,
  Alert,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { useMappingStore } from '../store/useMappingStore';
import { serializeMapping } from '../utils/r2rmlSerializer';

const ExportPanel: React.FC = () => {
  const mappingDoc = useMappingStore((s) => s.mappingDoc);
  const [snackMessage, setSnackMessage] = useState('');

  const turtleOutput = useMemo(() => {
    if (mappingDoc.triplesMaps.length === 0) return '';
    try {
      return serializeMapping(mappingDoc);
    } catch (e) {
      return `# Error serializing mapping: ${e instanceof Error ? e.message : String(e)}`;
    }
  }, [mappingDoc]);

  const handleDownload = () => {
    const blob = new Blob([turtleOutput], { type: 'text/turtle' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mapping.ttl';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(turtleOutput);
      setSnackMessage('Copied to clipboard');
    } catch {
      setSnackMessage('Failed to copy');
    }
  };

  if (mappingDoc.triplesMaps.length === 0) {
    return (
      <Paper sx={{ p: 3 }}>
        <Typography variant="body2" color="text.secondary" align="center">
          Create a mapping to export it as RDF Turtle.
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
        <Typography variant="subtitle2">R2RML Mapping Export</Typography>
        <Button
          variant="contained"
          startIcon={<DownloadIcon />}
          onClick={handleDownload}
          size="small"
        >
          Download .ttl
        </Button>
        <Button
          variant="outlined"
          startIcon={<ContentCopyIcon />}
          onClick={handleCopy}
          size="small"
        >
          Copy
        </Button>
      </Box>

      <TextField
        multiline
        fullWidth
        value={turtleOutput}
        InputProps={{ readOnly: true }}
        minRows={8}
        maxRows={20}
        sx={{
          '& .MuiInputBase-input': {
            fontFamily: 'monospace',
            fontSize: '0.8rem',
          },
        }}
      />

      <Snackbar
        open={!!snackMessage}
        autoHideDuration={2000}
        onClose={() => setSnackMessage('')}
      >
        <Alert severity="success" onClose={() => setSnackMessage('')}>
          {snackMessage}
        </Alert>
      </Snackbar>
    </Paper>
  );
};

export default ExportPanel;
