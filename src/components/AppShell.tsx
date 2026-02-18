import React, { useState } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  Tabs,
  Tab,
  Container,
  Snackbar,
  Alert,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import CSVImporter from './CSVImporter';
import OntologyManager from './OntologyManager';
import MappingEditor from './MappingEditor/MappingEditor';
import PreviewPanel from './PreviewPanel';
import ExportPanel from './ExportPanel';
import ImportMappingDialog from './ImportMappingDialog';
import ResizableSplitPane from './ResizableSplitPane';
import { useMappingStore } from '../store/useMappingStore';
import { useCsvStore } from '../store/useCsvStore';

const AppShell: React.FC = () => {
  const [tab, setTab] = useState(0);
  const [importOpen, setImportOpen] = useState(false);
  const [snackMessage, setSnackMessage] = useState('');
  const resetMapping = useMappingStore((s) => s.resetMapping);
  const clearCsv = useCsvStore((s) => s.clearCsv);

  const handleNewMapping = () => {
    resetMapping();
    clearCsv();
    setTab(0);
    setSnackMessage('New mapping created. Import a CSV to get started.');
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <AppBar position="static" elevation={1}>
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            R2RML Mapping Editor
          </Typography>
          <Button
            color="inherit"
            startIcon={<AddIcon />}
            onClick={handleNewMapping}
          >
            New
          </Button>
          <Button
            color="inherit"
            startIcon={<FileUploadIcon />}
            onClick={() => setImportOpen(true)}
          >
            Import Mapping
          </Button>
        </Toolbar>
      </AppBar>

      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Container maxWidth="xl">
          <Tabs value={tab} onChange={(_, v) => setTab(v)}>
            <Tab label="Data Source" />
            <Tab label="Mapping" />
            <Tab label="Export" />
          </Tabs>
        </Container>
      </Box>

      {/* Data Source tab - scrollable */}
      {tab === 0 && (
        <Container maxWidth="xl" sx={{ py: 3, flex: 1, overflow: 'auto' }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <CSVImporter />
            <OntologyManager />
          </Box>
        </Container>
      )}

      {/* Mapping tab - split pane fills remaining height */}
      {tab === 1 && (
        <Box sx={{ flex: 1, overflow: 'hidden', px: 2, py: 1.5 }}>
          <ResizableSplitPane
            left={
              <Box sx={{ height: '100%', overflow: 'auto', pr: 1 }}>
                <MappingEditor />
              </Box>
            }
            right={<PreviewPanel />}
            defaultLeftPercent={60}
            minLeftPercent={30}
            maxLeftPercent={80}
          />
        </Box>
      )}

      {/* Export tab - scrollable */}
      {tab === 2 && (
        <Container maxWidth="xl" sx={{ py: 3, flex: 1, overflow: 'auto' }}>
          <ExportPanel />
        </Container>
      )}

      <ImportMappingDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
      />

      <Snackbar
        open={!!snackMessage}
        autoHideDuration={3000}
        onClose={() => setSnackMessage('')}
      >
        <Alert severity="info" onClose={() => setSnackMessage('')}>
          {snackMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default AppShell;
