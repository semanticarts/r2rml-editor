import { ThemeProvider, CssBaseline } from '@mui/material';
import theme from './theme';
import AppShell from './components/AppShell';

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppShell />
    </ThemeProvider>
  );
}

export default App;
