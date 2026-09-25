import React from "react";
import { Autocomplete, TextField } from "@mui/material";

export interface ClientB2BOption {
  id: number;
  name: string;
}

interface ClientAutocompleteProps {
  clients: ClientB2BOption[];
  value: string; // id as string, "" = aucun/tous
  onChange: (value: string) => void;
  label?: string;
  allowEmpty?: boolean; // ajoute une option "Tous" pour un filtre (pas pour un champ obligatoire)
  required?: boolean;
  sx?: object;
}

const ALL_OPTION: ClientB2BOption = { id: -1, name: "Tous les points de vente" };

// Recherche par nom au lieu de faire défiler ~25+ clients dans un menu -
// utilisé partout où un point de vente doit être choisi (filtres, création).
const ClientAutocomplete: React.FC<ClientAutocompleteProps> = ({
  clients,
  value,
  onChange,
  label = "Point de vente",
  allowEmpty,
  required,
  sx,
}) => {
  const options = allowEmpty ? [ALL_OPTION, ...clients] : clients;
  const selected = options.find((c) => String(c.id) === value) ?? null;

  return (
    <Autocomplete
      options={options}
      getOptionLabel={(o) => o.name}
      isOptionEqualToValue={(o, v) => o.id === v.id}
      value={selected}
      onChange={(_, newValue) => onChange(newValue && newValue.id !== -1 ? String(newValue.id) : "")}
      renderInput={(params) => <TextField {...params} label={label} required={required} />}
      sx={{ minWidth: 240, ...sx }}
    />
  );
};

export default ClientAutocomplete;
