import React from 'react';
import { Autocomplete, TextField } from '@mui/material';
import { XSD_DATATYPES } from '../../utils/constants';

interface DatatypePickerProps {
  value: string | null;
  onChange: (value: string | null) => void;
}

const DatatypePicker: React.FC<DatatypePickerProps> = ({ value, onChange }) => {
  const selectedOption =
    XSD_DATATYPES.find((dt) => dt.iri === value) || null;

  return (
    <Autocomplete
      size="small"
      freeSolo
      options={XSD_DATATYPES}
      getOptionLabel={(option) =>
        typeof option === 'string' ? option : `xsd:${option.label}`
      }
      value={selectedOption}
      onChange={(_, newValue) => {
        if (newValue === null) {
          onChange(null);
        } else if (typeof newValue === 'string') {
          onChange(newValue);
        } else {
          onChange(newValue.iri);
        }
      }}
      onInputChange={(_, inputValue, reason) => {
        if (reason === 'input' && inputValue === '') {
          onChange(null);
        }
      }}
      renderInput={(params) => (
        <TextField {...params} label="Datatype" placeholder="xsd:string" />
      )}
      sx={{ minWidth: 160 }}
    />
  );
};

export default DatatypePicker;
