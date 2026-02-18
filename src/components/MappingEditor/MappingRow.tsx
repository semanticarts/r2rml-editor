import React from 'react';
import {
  TableRow,
  TableCell,
  TextField,
  Autocomplete,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import type { PredicateObjectMap } from '../../types/mapping';
import { useMappingStore } from '../../store/useMappingStore';
import { useCsvStore } from '../../store/useCsvStore';
import { useOntologyStore, formatTermLabel, toQName } from '../../store/useOntologyStore';
import DatatypePicker from './DatatypePicker';

interface MappingRowProps {
  triplesMapId: string;
  pom: PredicateObjectMap;
}

const MappingRow: React.FC<MappingRowProps> = ({ triplesMapId, pom }) => {
  const { updatePredicateObjectMap, removePredicateObjectMap } =
    useMappingStore();
  const csvData = useCsvStore((s) => s.csvData);
  const allProperties = useOntologyStore((s) => s.allProperties);
  const allPrefixes = useOntologyStore((s) => s.allPrefixes);
  const headers = csvData?.headers ?? [];

  const updatePOM = (updates: Partial<PredicateObjectMap>) => {
    updatePredicateObjectMap(triplesMapId, pom.id, updates);
  };

  return (
    <TableRow>
      {/* Source column / value */}
      <TableCell>
        <FormControl size="small" fullWidth>
          <InputLabel>Type</InputLabel>
          <Select
            value={pom.objectMap.type}
            label="Type"
            onChange={(e) =>
              updatePOM({
                objectMap: {
                  ...pom.objectMap,
                  type: e.target.value as 'column' | 'constant' | 'template',
                },
              })
            }
          >
            <MenuItem value="column">Column</MenuItem>
            <MenuItem value="constant">Constant</MenuItem>
            <MenuItem value="template">Template</MenuItem>
          </Select>
        </FormControl>
      </TableCell>

      <TableCell>
        {pom.objectMap.type === 'column' ? (
          <FormControl size="small" fullWidth>
            <InputLabel>Column</InputLabel>
            <Select
              value={pom.objectMap.value}
              label="Column"
              onChange={(e) =>
                updatePOM({
                  objectMap: { ...pom.objectMap, value: e.target.value },
                })
              }
            >
              {headers.map((h) => (
                <MenuItem key={h} value={h}>
                  {h}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        ) : (
          <TextField
            size="small"
            fullWidth
            label={pom.objectMap.type === 'template' ? 'Template' : 'Value'}
            value={pom.objectMap.value}
            onChange={(e) =>
              updatePOM({
                objectMap: { ...pom.objectMap, value: e.target.value },
              })
            }
            placeholder={
              pom.objectMap.type === 'template'
                ? 'http://example.com/{col}'
                : 'constant value'
            }
          />
        )}
      </TableCell>

      {/* Predicate */}
      <TableCell>
        <Autocomplete
          size="small"
          freeSolo
          options={allProperties}
          getOptionLabel={(option) => {
            if (typeof option === 'string') return option;
            const display = formatTermLabel(option, allPrefixes);
            const qname = toQName(option.iri, allPrefixes);
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
            allProperties.find((p) => p.iri === pom.predicateMap.constant) ||
            pom.predicateMap.constant ||
            null
          }
          onChange={(_, newValue) => {
            if (newValue === null) {
              updatePOM({ predicateMap: { constant: '' } });
            } else if (typeof newValue === 'string') {
              updatePOM({ predicateMap: { constant: newValue } });
            } else {
              updatePOM({ predicateMap: { constant: newValue.iri } });
            }
          }}
          onInputChange={(_, inputValue, reason) => {
            if (reason === 'input') {
              updatePOM({ predicateMap: { constant: inputValue } });
            }
          }}
          renderInput={(params) => (
            <TextField {...params} label="Predicate IRI" />
          )}
          sx={{ minWidth: 250 }}
        />
      </TableCell>

      {/* Term type */}
      <TableCell>
        <FormControl size="small" fullWidth>
          <InputLabel>Term</InputLabel>
          <Select
            value={pom.objectMap.termType}
            label="Term"
            onChange={(e) =>
              updatePOM({
                objectMap: {
                  ...pom.objectMap,
                  termType: e.target.value as 'IRI' | 'Literal' | 'BlankNode',
                  // Clear datatype/language when switching away from Literal
                  ...(e.target.value !== 'Literal'
                    ? { datatype: null, language: null }
                    : {}),
                },
              })
            }
          >
            <MenuItem value="Literal">Literal</MenuItem>
            <MenuItem value="IRI">IRI</MenuItem>
            <MenuItem value="BlankNode">Blank Node</MenuItem>
          </Select>
        </FormControl>
      </TableCell>

      {/* Datatype (only for Literal) */}
      <TableCell>
        {pom.objectMap.termType === 'Literal' && (
          <DatatypePicker
            value={pom.objectMap.datatype}
            onChange={(dt) =>
              updatePOM({
                objectMap: {
                  ...pom.objectMap,
                  datatype: dt,
                  language: dt ? null : pom.objectMap.language,
                },
              })
            }
          />
        )}
      </TableCell>

      {/* Language (only for Literal without datatype) */}
      <TableCell>
        {pom.objectMap.termType === 'Literal' && !pom.objectMap.datatype && (
          <TextField
            size="small"
            label="Lang"
            value={pom.objectMap.language || ''}
            onChange={(e) =>
              updatePOM({
                objectMap: {
                  ...pom.objectMap,
                  language: e.target.value || null,
                },
              })
            }
            placeholder="en"
            sx={{ width: 80 }}
          />
        )}
      </TableCell>

      {/* Delete */}
      <TableCell>
        <IconButton
          size="small"
          onClick={() => removePredicateObjectMap(triplesMapId, pom.id)}
          color="error"
        >
          <DeleteIcon />
        </IconButton>
      </TableCell>
    </TableRow>
  );
};

export default MappingRow;
