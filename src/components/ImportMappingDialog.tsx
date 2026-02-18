import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Alert,
  Tabs,
  Tab,
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import { parseR2rmlTurtle } from '../utils/r2rmlParser';
import { useMappingStore } from '../store/useMappingStore';

interface ImportMappingDialogProps {
  open: boolean;
  onClose: () => void;
}

const ImportMappingDialog: React.FC<ImportMappingDialogProps> = ({
  open,
  onClose,
}) => {
  const [tab, setTab] = useState(0);
  const [turtleText, setTurtleText] = useState('');
  const [error, setError] = useState('');
  const { loadMappingDocument } = useMappingStore();

  const handleImport = (text: string) => {
    try {
      const doc = parseR2rmlTurtle(text);
      loadMappingDocument(doc);
      setError('');
      setTurtleText('');
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to parse mapping');
    }
  };

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      handleImport(text);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to read file');
    }

    event.target.value = '';
  };

  const handleClose = () => {
    setError('');
    setTurtleText('');
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>Import R2RML Mapping</DialogTitle>
      <DialogContent>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
          <Tab label="Upload File" />
          <Tab label="Paste Turtle" />
        </Tabs>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {tab === 0 && (
          <Box sx={{ py: 2 }}>
            <Button
              variant="outlined"
              component="label"
              startIcon={<UploadFileIcon />}
            >
              Choose .ttl File
              <input
                type="file"
                accept=".ttl,.turtle,.rdf"
                hidden
                onChange={handleFileUpload}
              />
            </Button>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Upload a Turtle file containing an R2RML mapping.
            </Typography>
          </Box>
        )}

        {tab === 1 && (
          <Box sx={{ py: 1 }}>
            <TextField
              multiline
              fullWidth
              minRows={10}
              maxRows={20}
              value={turtleText}
              onChange={(e) => setTurtleText(e.target.value)}
              placeholder={`@prefix rr: <http://www.w3.org/ns/r2rml#> .\n\n<#MyMapping> a rr:TriplesMap ;\n  ...`}
              sx={{
                '& .MuiInputBase-input': {
                  fontFamily: 'monospace',
                  fontSize: '0.85rem',
                },
              }}
            />
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        {tab === 1 && (
          <Button
            variant="contained"
            onClick={() => handleImport(turtleText)}
            disabled={!turtleText.trim()}
          >
            Import
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default ImportMappingDialog;
