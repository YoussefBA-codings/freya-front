import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  Box,
  Typography,
  TextField,
  List,
  ListItemButton,
  ListItemText,
  Divider,
  CircularProgress,
  Button,
} from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import { useNavigate } from "react-router-dom";

interface ClientB2B {
  id: number;
  name: string;
  responsable_name?: string | null;
}

// Sélecteur de point de vente pour la fiche client (animations, crédits,
// relevés mensuels) - point de vente = client_b2b en 1:1. Même pattern que
// B2BOrderHistorySelectClient, cible différente.
const ClientB2BSelect: React.FC = () => {
  const navigate = useNavigate();

  const [clients, setClients] = useState<ClientB2B[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios
      .get<ClientB2B[]>(`${import.meta.env.VITE_API_URL}client-b2b`)
      .then((res) => setClients(res.data))
      .catch((error) => console.error("Failed to load clients:", error))
      .finally(() => setLoading(false));
  }, []);

  const handleExportExcel = () => {
    window.open(`${import.meta.env.VITE_API_URL}dashboard/clients/export/excel`, "_blank");
  };

  if (loading) {
    return (
      <Box sx={{ textAlign: "center", mt: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, maxWidth: 600, margin: "0 auto" }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3, gap: 2 }}>
        <Typography variant="h4">Sélectionner un point de vente</Typography>
        <Button variant="outlined" startIcon={<DownloadIcon />} onClick={handleExportExcel}>
          Exporter Excel
        </Button>
      </Box>

      <TextField
        fullWidth
        label="Rechercher un point de vente"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        sx={{ mb: 3 }}
      />

      <List>
        {clients
          .filter((c) => c.name.toLowerCase().includes(search.toLowerCase()))
          .map((client) => (
            <React.Fragment key={client.id}>
              <ListItemButton onClick={() => navigate(`/b2b/clients/${client.id}`)}>
                <ListItemText primary={client.name} secondary={client.responsable_name || ""} />
              </ListItemButton>
              <Divider />
            </React.Fragment>
          ))}
      </List>
    </Box>
  );
};

export default ClientB2BSelect;
