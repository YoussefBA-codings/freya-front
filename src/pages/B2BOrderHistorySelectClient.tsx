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
} from "@mui/material";
import { useNavigate } from "react-router-dom";

interface ClientB2B {
  id: number;
  name: string;
  responsable_name?: string | null;
}

const B2BOrderHistorySelectClient: React.FC = () => {
  const navigate = useNavigate();

  const [clients, setClients] = useState<ClientB2B[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const loadClients = async () => {
    try {
      const res = await axios.get<ClientB2B[]>(
        `${import.meta.env.VITE_API_URL}client-b2b`
      );
      setClients(res.data);
    } catch (error) {
      console.error("Failed to load clients:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClients();
  }, []);

  if (loading) {
    return (
      <Box sx={{ textAlign: "center", mt: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, maxWidth: 600, margin: "0 auto" }}>
      <Typography variant="h4" sx={{ mb: 3 }}>
        Select a Client
      </Typography>

      <TextField
        fullWidth
        label="Search clients"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        sx={{ mb: 3 }}
      />

      <List>
        {clients
          .filter((c) =>
            c.name.toLowerCase().includes(search.toLowerCase())
          )
          .map((client) => (
            <React.Fragment key={client.id}>
              <ListItemButton
                onClick={() =>
                  navigate(`/b2b/orders/history/${client.id}`)
                }
              >
                <ListItemText
                  primary={client.name}
                  secondary={client.responsable_name || ""}
                />
              </ListItemButton>
              <Divider />
            </React.Fragment>
          ))}
      </List>
    </Box>
  );
};

export default B2BOrderHistorySelectClient;