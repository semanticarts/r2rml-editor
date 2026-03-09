import React, { useRef, useState, useCallback, useEffect } from 'react';
import {
  TextField,
  Popper,
  Paper,
  MenuList,
  MenuItem,
  Typography,
} from '@mui/material';
import type { TextFieldProps } from '@mui/material';
import { useCsvStore } from '../../store/useCsvStore';
import { useMappingStore } from '../../store/useMappingStore';
import type { MappingDocument } from '../../types/mapping';

type TemplateTextFieldProps = Omit<TextFieldProps, 'value' | 'onChange'> & {
  value: string;
  onChange: (value: string) => void;
};

type SuggestionMode = 'column' | 'template' | null;

interface Suggestion {
  label: string;
  insertText: string;
}

function collectExistingTemplates(
  mappingDoc: MappingDocument,
  currentValue: string
): string[] {
  const templates = new Set<string>();
  for (const tm of mappingDoc.triplesMaps) {
    if (tm.subjectMap.template) templates.add(tm.subjectMap.template);
    for (const pom of tm.predicateObjectMaps) {
      if (pom.objectMap.type === 'template' && pom.objectMap.value) {
        templates.add(pom.objectMap.value);
      }
    }
  }
  templates.delete(currentValue);
  return Array.from(templates);
}

const TemplateTextField: React.FC<TemplateTextFieldProps> = ({
  value,
  onChange,
  ...textFieldProps
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [mode, setMode] = useState<SuggestionMode>(null);
  const [highlightIndex, setHighlightIndex] = useState(0);
  // Cursor position of the '{' that triggered column mode
  const triggerPos = useRef(-1);

  const csvData = useCsvStore((s) => s.csvData);
  const mappingDoc = useMappingStore((s) => s.mappingDoc);
  const headers = csvData?.headers ?? [];

  const closeSuggestions = useCallback(() => {
    setMode(null);
    setSuggestions([]);
    setAnchorEl(null);
    setHighlightIndex(0);
    triggerPos.current = -1;
  }, []);

  // Show template suggestions when field is empty and focused
  const handleFocus = useCallback(() => {
    if (value === '') {
      const templates = collectExistingTemplates(mappingDoc, value);
      if (templates.length > 0) {
        setSuggestions(templates.map((t) => ({ label: t, insertText: t })));
        setMode('template');
        setHighlightIndex(0);
        setAnchorEl(inputRef.current);
      }
    }
  }, [value, mappingDoc]);

  const handleBlur = useCallback(() => {
    // Delay to allow click on menu item
    setTimeout(closeSuggestions, 150);
  }, [closeSuggestions]);

  // Compute column suggestions based on partial text after '{'
  const updateColumnSuggestions = useCallback(
    (text: string, cursorPos: number) => {
      // Find the last unmatched '{' before cursor
      let bracePos = -1;
      for (let i = cursorPos - 1; i >= 0; i--) {
        if (text[i] === '}') break;
        if (text[i] === '{') {
          bracePos = i;
          break;
        }
      }
      if (bracePos === -1) {
        if (mode === 'column') closeSuggestions();
        return;
      }

      triggerPos.current = bracePos;
      const partial = text.slice(bracePos + 1, cursorPos).toLowerCase();
      const filtered = headers
        .filter((h) => h.toLowerCase().includes(partial))
        .map((h) => ({
          label: `{${h}}`,
          insertText: `{${h}}`,
        }));

      if (filtered.length > 0) {
        setSuggestions(filtered);
        setMode('column');
        setHighlightIndex(0);
        setAnchorEl(inputRef.current);
      } else if (mode === 'column') {
        closeSuggestions();
      }
    },
    [headers, mode, closeSuggestions]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      onChange(newValue);

      // If field just became non-empty and we were showing template suggestions, close
      if (mode === 'template' && newValue !== '') {
        // Check if the character just typed is '{' — if so switch to column mode
        const cursor = e.target.selectionStart ?? newValue.length;
        if (newValue[cursor - 1] === '{') {
          updateColumnSuggestions(newValue, cursor);
        } else {
          closeSuggestions();
        }
        return;
      }

      const cursor = e.target.selectionStart ?? newValue.length;
      if (newValue === '') {
        // Show template suggestions
        const templates = collectExistingTemplates(mappingDoc, newValue);
        if (templates.length > 0) {
          setSuggestions(templates.map((t) => ({ label: t, insertText: t })));
          setMode('template');
          setHighlightIndex(0);
          setAnchorEl(inputRef.current);
        } else {
          closeSuggestions();
        }
      } else {
        updateColumnSuggestions(newValue, cursor);
      }
    },
    [onChange, mode, mappingDoc, updateColumnSuggestions, closeSuggestions]
  );

  const selectSuggestion = useCallback(
    (suggestion: Suggestion) => {
      if (mode === 'template') {
        onChange(suggestion.insertText);
      } else if (mode === 'column') {
        // Replace from triggerPos to current cursor with the insertText
        const before = value.slice(0, triggerPos.current);
        const input = inputRef.current;
        const cursorPos = input?.selectionStart ?? value.length;
        const after = value.slice(cursorPos);
        const newValue = before + suggestion.insertText + after;
        onChange(newValue);

        // Position cursor after inserted text
        const newCursor = before.length + suggestion.insertText.length;
        requestAnimationFrame(() => {
          input?.setSelectionRange(newCursor, newCursor);
        });
      }
      closeSuggestions();
    },
    [mode, value, onChange, closeSuggestions]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!mode || suggestions.length === 0) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setHighlightIndex((i) => (i + 1) % suggestions.length);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setHighlightIndex((i) => (i - 1 + suggestions.length) % suggestions.length);
          break;
        case 'Enter':
        case 'Tab':
          if (mode) {
            e.preventDefault();
            selectSuggestion(suggestions[highlightIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          closeSuggestions();
          break;
      }
    },
    [mode, suggestions, highlightIndex, selectSuggestion, closeSuggestions]
  );

  // Close suggestions if value is cleared externally
  useEffect(() => {
    if (value !== '' && mode === 'template') {
      closeSuggestions();
    }
  }, [value, mode, closeSuggestions]);

  const open = mode !== null && suggestions.length > 0 && anchorEl !== null;

  return (
    <>
      <TextField
        {...textFieldProps}
        value={value}
        inputRef={inputRef}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        autoComplete="off"
      />
      <Popper
        open={open}
        anchorEl={anchorEl}
        placement="bottom-start"
        style={{ zIndex: 1300 }}
      >
        <Paper elevation={4} sx={{ maxHeight: 200, overflow: 'auto', mt: 0.5 }}>
          {mode === 'template' && (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ px: 1.5, pt: 0.5, display: 'block' }}
            >
              Existing templates
            </Typography>
          )}
          {mode === 'column' && (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ px: 1.5, pt: 0.5, display: 'block' }}
            >
              Column variables
            </Typography>
          )}
          <MenuList dense>
            {suggestions.map((s, i) => (
              <MenuItem
                key={s.label}
                selected={i === highlightIndex}
                onMouseDown={(e) => {
                  e.preventDefault(); // Prevent blur
                  selectSuggestion(s);
                }}
              >
                <Typography variant="body2" noWrap sx={{ fontFamily: 'monospace' }}>
                  {s.label}
                </Typography>
              </MenuItem>
            ))}
          </MenuList>
        </Paper>
      </Popper>
    </>
  );
};

export default TemplateTextField;
