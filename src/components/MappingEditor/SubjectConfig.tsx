import React from 'react';
import {
  Box,
  TextField,
  Autocomplete,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
} from '@mui/material';
import { useMappingStore } from '../../store/useMappingStore';
import { useCsvStore } from '../../store/useCsvStore';
import { useOntologyStore, formatTermLabel, toQName } from '../../store/useOntologyStore';
import type { SubjectMap } from '../../types/mapping';

interface SubjectConfigProps {
  triplesMapId: string;
  subjectMap: SubjectMap;
}

const SubjectConfig: React.FC<SubjectConfigProps> = ({
  triplesMapId,
  subjectMap,
}) => {
  const { setBaseIRI, updateSubjectMap, mappingDoc } = useMappingStore();
  const csvData = useCsvStore((s) => s.csvData);
  const allClasses = useOntologyStore((s) => s.allClasses);
  const allPrefixes = useOntologyStore((s) => s.allPrefixes);

  const columnPlaceholders = csvData
    ? csvData.headers.map((h) => `{${h}}`)
    : [];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 2 }}>
      <Typography variant="subtitle2" color="text.secondary">
        Subject Configuration
      </Typography>

      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <TextField
          label="Base IRI"
          value={mappingDoc.baseIRI}
          onChange={(e) => setBaseIRI(e.target.value)}
          size="small"
          sx={{ minWidth: 300, flex: 1 }}
          placeholder="http://example.com/resource/"
        />

        <TextField
          label="Subject Template"
          value={subjectMap.template}
          onChange={(e) =>
            updateSubjectMap(triplesMapId, { template: e.target.value })
          }
          size="small"
          sx={{ minWidth: 300, flex: 1 }}
          placeholder="http://example.com/resource/{id}"
          helperText={
            columnPlaceholders.length > 0
              ? `Available columns: ${columnPlaceholders.join(', ')}`
              : undefined
          }
        />

        <Autocomplete
          size="small"
          freeSolo
          autoSelect
          options={allClasses}
          getOptionLabel={(option) => {
            if (typeof option === 'string') return option;
            const display = formatTermLabel(option, allPrefixes);
            const qname = toQName(option.iri, allPrefixes);
            // Show "Label (qname)" or "Label (iri)" when label exists, otherwise just the display
            if (option.prefLabel || option.label) {
              return qname ? `${display} (${qname})` : `${display} (${option.iri})`;
            }
            return display;
          }}
          filterOptions={(options, params) => {
            const input = params.inputValue.toLowerCase();
            return options.filter((opt) => {
              const display = formatTermLabel(opt, allPrefixes);
              const qname = toQName(opt.iri, allPrefixes);
              return (
                display.toLowerCase().includes(input) ||
                opt.iri.toLowerCase().includes(input) ||
                (qname && qname.toLowerCase().includes(input))
              );
            });
          }}
          value={
            subjectMap.classIRI
              ? allClasses.find((c) => c.iri === subjectMap.classIRI) || subjectMap.classIRI
              : null
          }
          onChange={(_, newValue) => {
            if (newValue === null) {
              updateSubjectMap(triplesMapId, { classIRI: null });
            } else if (typeof newValue === 'string') {
              updateSubjectMap(triplesMapId, { classIRI: newValue });
            } else {
              updateSubjectMap(triplesMapId, { classIRI: newValue.iri });
            }
          }}
          renderInput={(params) => (
            <TextField {...params} label="RDF Class" placeholder="owl:Class IRI" />
          )}
          sx={{ minWidth: 280 }}
        />

        <FormControl size="small" sx={{ minWidth: 130 }}>
          <InputLabel>Term Type</InputLabel>
          <Select
            value={subjectMap.termType}
            label="Term Type"
            onChange={(e) =>
              updateSubjectMap(triplesMapId, {
                termType: e.target.value as 'IRI' | 'BlankNode',
              })
            }
          >
            <MenuItem value="IRI">IRI</MenuItem>
            <MenuItem value="BlankNode">Blank Node</MenuItem>
          </Select>
        </FormControl>
      </Box>
    </Box>
  );
};

export default SubjectConfig;
