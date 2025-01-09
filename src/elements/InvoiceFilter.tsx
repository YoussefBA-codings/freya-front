import React, { useState } from 'react';
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Box,
  Typography,
  styled,
} from '@mui/material';
import { SelectChangeEvent } from '@mui/material/Select';

const CustomSelect = styled(Select)(({ theme }) => ({
  '& .MuiOutlinedInput-notchedOutline': {
    borderColor: theme.palette.primary.main,
  },
  '&:hover .MuiOutlinedInput-notchedOutline': {
    borderColor: theme.palette.secondary.main,
  },
  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
    borderColor: theme.palette.secondary.main,
  },
  '& .MuiSelect-icon': {
    color: theme.palette.primary.main,
  },
}));

interface InvoiceFilterProps {
  onFilterChange: (view: "months" | "invoices" | "credits") => void;
}

const InvoiceFilter: React.FC<InvoiceFilterProps> = ({ onFilterChange }) => {
  const [view, setView] = useState<"months" | "invoices" | "credits">('invoices');

  const handleChange = (event: SelectChangeEvent<string | unknown>) => {
    const selectedView = event.target.value as "months" | "invoices" | "credits";
    setView(selectedView);
    onFilterChange(selectedView);
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
      <Typography variant="h6" sx={{ mr: 2 }}>
        Filter By:
      </Typography>
      <FormControl variant="outlined" sx={{ minWidth: 120 }}>
        <InputLabel id="view-select-label">Filter</InputLabel>
        <CustomSelect
          labelId="view-select-label"
          id="view-select"
          value={view}
          onChange={handleChange}
          label="Filter"
          renderValue={(selected) => (
            <Chip label={selected === 'invoices' ? 'Invoices' : 'Credits'} color="primary" />
          )}
        >
          <MenuItem value="invoices">Invoices</MenuItem>
          <MenuItem value="credits">Credits</MenuItem>
        </CustomSelect>
      </FormControl>
    </Box>
  );
};

export default InvoiceFilter;
