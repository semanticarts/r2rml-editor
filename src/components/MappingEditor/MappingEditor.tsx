import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Collapse,
  Tooltip,
  Chip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import PlaylistAddIcon from '@mui/icons-material/PlaylistAdd';
import { useMappingStore } from '../../store/useMappingStore';
import { useOntologyStore, toQName } from '../../store/useOntologyStore';
import { useCsvStore } from '../../store/useCsvStore';
import { buildPrefixMaps } from '../../utils/rdfPreview';
import SubjectConfig from './SubjectConfig';
import MappingRow from './MappingRow';

/** Compact a template IRI using the prefix map, preserving {col} placeholders. */
function compactTemplate(template: string, prefixMap: Map<string, string>): string {
  let bestPrefix = '';
  let bestNs = '';
  for (const [ns, prefix] of prefixMap) {
    if (template.startsWith(ns) && ns.length > bestNs.length) {
      bestPrefix = prefix;
      bestNs = ns;
    }
  }
  if (bestNs) {
    return `${bestPrefix}:${template.slice(bestNs.length)}`;
  }
  return template;
}

const MappingEditor: React.FC = () => {
  const { mappingDoc, addPredicateObjectMap, addEmptyTriplesMap, removeTriplesMap } =
    useMappingStore();
  const allPrefixes = useOntologyStore((s) => s.allPrefixes);
  const allClasses = useOntologyStore((s) => s.allClasses);
  const rdfsEnabled = useOntologyStore((s) => s.rdfsEnabled);
  const skosEnabled = useOntologyStore((s) => s.skosEnabled);
  const setRdfsEnabled = useOntologyStore((s) => s.setRdfsEnabled);
  const setSkosEnabled = useOntologyStore((s) => s.setSkosEnabled);
  const treatEmptyAsNull = useCsvStore((s) => s.treatEmptyAsNull);
  const setTreatEmptyAsNull = useCsvStore((s) => s.setTreatEmptyAsNull);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const toggleCollapse = (id: string) => {
    setCollapsed((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  if (mappingDoc.triplesMaps.length === 0) {
    return (
      <Paper sx={{ p: 3 }}>
        <Typography variant="body1" color="text.secondary" align="center">
          Import a CSV file or an existing R2RML mapping to start editing.
        </Typography>
      </Paper>
    );
  }

  const canRemove = mappingDoc.triplesMaps.length > 1;
  const { prefixMap } = buildPrefixMaps(mappingDoc, allPrefixes);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Options bar */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
        <Typography variant="body2" color="text.secondary" sx={{ mr: 0.5 }}>
          Vocabularies:
        </Typography>
        <Chip
          label="RDFS"
          size="small"
          color={rdfsEnabled ? 'primary' : 'default'}
          variant={rdfsEnabled ? 'filled' : 'outlined'}
          onClick={() => setRdfsEnabled(!rdfsEnabled)}
        />
        <Chip
          label="SKOS"
          size="small"
          color={skosEnabled ? 'primary' : 'default'}
          variant={skosEnabled ? 'filled' : 'outlined'}
          onClick={() => setSkosEnabled(!skosEnabled)}
        />
        <Box sx={{ mx: 1, borderLeft: 1, borderColor: 'divider', height: 24 }} />
        <Tooltip title="When enabled, triples with empty or whitespace-only CSV values are omitted from the preview">
          <Chip
            label="Skip empty values"
            size="small"
            color={treatEmptyAsNull ? 'primary' : 'default'}
            variant={treatEmptyAsNull ? 'filled' : 'outlined'}
            onClick={() => setTreatEmptyAsNull(!treatEmptyAsNull)}
          />
        </Tooltip>
      </Box>

      {mappingDoc.triplesMaps.map((tm, idx) => {
        const isCollapsed = collapsed[tm.id] ?? false;
        return (
          <Paper key={tm.id} sx={{ overflow: 'hidden' }}>
            {/* Header bar - always visible */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                px: 2,
                py: 1,
                bgcolor: 'grey.50',
                borderBottom: isCollapsed ? 0 : 1,
                borderColor: 'divider',
                cursor: 'pointer',
                '&:hover': { bgcolor: 'grey.100' },
              }}
              onClick={() => toggleCollapse(tm.id)}
            >
              <IconButton size="small" sx={{ mr: 1 }}>
                {isCollapsed ? <ExpandMoreIcon /> : <ExpandLessIcon />}
              </IconButton>
              <Typography
                variant="subtitle1"
                sx={{ fontWeight: 'bold', flex: 1, fontFamily: 'monospace' }}
                noWrap
              >
                {compactTemplate(tm.subjectMap.template, prefixMap) || `Subject Mapping ${idx + 1}`}
                {tm.subjectMap.classIRI && (() => {
                  const cls = allClasses.find((c) => c.iri === tm.subjectMap.classIRI);
                  const label = cls?.prefLabel || cls?.label
                    || toQName(tm.subjectMap.classIRI!, allPrefixes)
                    || tm.subjectMap.classIRI;
                  return (
                    <Typography
                      component="span"
                      variant="body2"
                      color="text.secondary"
                      sx={{ ml: 1, fontFamily: 'inherit' }}
                    >
                      a {label}
                    </Typography>
                  );
                })()}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ mr: 1 }}>
                {tm.predicateObjectMaps.length} mapping{tm.predicateObjectMaps.length !== 1 ? 's' : ''}
              </Typography>
              {canRemove && (
                <Tooltip title="Remove this subject mapping">
                  <IconButton
                    size="small"
                    color="error"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeTriplesMap(tm.id);
                    }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
            </Box>

            {/* Collapsible body */}
            <Collapse in={!isCollapsed}>
              <Box sx={{ p: 2 }}>
                <SubjectConfig triplesMapId={tm.id} subjectMap={tm.subjectMap} />

                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                  Predicate-Object Mappings
                </Typography>

                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 'bold', width: 120 }}>
                          Source Type
                        </TableCell>
                        <TableCell sx={{ fontWeight: 'bold', width: 360 }}>
                          Source Value
                        </TableCell>
                        <TableCell sx={{ fontWeight: 'bold', minWidth: 180 }}>
                          Predicate
                        </TableCell>
                        <TableCell sx={{ fontWeight: 'bold', width: 110 }}>
                          Term Type
                        </TableCell>
                        <TableCell sx={{ fontWeight: 'bold', width: 170 }}>
                          Datatype
                        </TableCell>
                        <TableCell sx={{ fontWeight: 'bold', width: 90 }}>
                          Language
                        </TableCell>
                        <TableCell sx={{ width: 50 }} />
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {tm.predicateObjectMaps.map((pom) => (
                        <MappingRow
                          key={pom.id}
                          triplesMapId={tm.id}
                          pom={pom}
                        />
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>

                <Button
                  startIcon={<AddIcon />}
                  onClick={() => addPredicateObjectMap(tm.id)}
                  size="small"
                  sx={{ mt: 1 }}
                >
                  Add Mapping
                </Button>
              </Box>
            </Collapse>
          </Paper>
        );
      })}

      <Button
        variant="outlined"
        startIcon={<PlaylistAddIcon />}
        onClick={addEmptyTriplesMap}
        sx={{ alignSelf: 'flex-start' }}
      >
        Add Subject Mapping
      </Button>
    </Box>
  );
};

export default MappingEditor;
