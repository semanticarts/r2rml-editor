import React, { useState } from 'react';
import {
  Box,
  Button,
  Chip,
  Paper,
  TextField,
  Typography,
  Alert,
  CircularProgress,
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import LanguageIcon from '@mui/icons-material/Language';
import { useOntologyStore } from '../store/useOntologyStore';
import {
  loadOntologyFromFile,
  loadOntologyFromIRI,
} from '../utils/ontologyLoader';

const OntologyManager: React.FC = () => {
  const { ontologies, addOntology, removeOntology } = useOntologyStore();
  const [iri, setIri] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError('');
    try {
      const ont = await loadOntologyFromFile(file);
      addOntology(ont);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load ontology');
    } finally {
      setLoading(false);
    }

    event.target.value = '';
  };

  const handleFetchIRI = async () => {
    if (!iri.trim()) return;

    setLoading(true);
    setError('');
    try {
      const ont = await loadOntologyFromIRI(iri.trim());
      addOntology(ont);
      setIri('');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to fetch ontology';
      setError(
        msg.includes('Failed to fetch')
          ? msg +
              '. This may be due to CORS restrictions. Try downloading the ontology file and uploading it instead.'
          : msg
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="subtitle2" sx={{ mb: 1 }}>
        Ontologies
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
        <Button
          variant="outlined"
          component="label"
          startIcon={<UploadFileIcon />}
          disabled={loading}
          size="small"
        >
          Upload Ontology
          <input
            type="file"
            accept=".ttl,.owl,.rdf,.n3,.nt"
            hidden
            onChange={handleFileUpload}
          />
        </Button>

        <Box sx={{ display: 'flex', gap: 1, flex: 1, minWidth: 300 }}>
          <TextField
            size="small"
            label="Ontology IRI"
            value={iri}
            onChange={(e) => setIri(e.target.value)}
            placeholder="https://example.com/ontology.ttl"
            fullWidth
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleFetchIRI();
            }}
          />
          <Button
            variant="outlined"
            onClick={handleFetchIRI}
            disabled={loading || !iri.trim()}
            startIcon={
              loading ? <CircularProgress size={16} /> : <LanguageIcon />
            }
            size="small"
          >
            Fetch
          </Button>
        </Box>
      </Box>

      {ontologies.length > 0 && (
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {ontologies.map((ont) => (
            <Chip
              key={ont.sourceLabel}
              label={`${ont.sourceLabel} (${ont.classes.length}C, ${ont.properties.length}P)`}
              onDelete={() => removeOntology(ont.sourceLabel)}
              color="primary"
              variant="outlined"
            />
          ))}
        </Box>
      )}

      {ontologies.length === 0 && (
        <Typography variant="body2" color="text.secondary">
          Load an ontology to enable autocomplete for classes and properties in
          the mapping editor.
        </Typography>
      )}
    </Paper>
  );
};

export default OntologyManager;
