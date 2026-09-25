import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  Box,
  Typography,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Snackbar,
  SnackbarContent,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import { useSearchParams } from "react-router-dom";
import AnimationDetailDrawer, {
  AnimationDetail,
  ANIMATION_STATUS_LABELS,
  getAnimationStatusColor,
} from "../elements/AnimationDetailDrawer";
import ClientAutocomplete from "../elements/ClientAutocomplete";

interface ClientB2B {
  id: number;
  name: string;
}

interface ProductB2B {
  id: number;
  name: string;
}

interface Animatrice {
  id: number;
  name: string;
}

const AnimationsList: React.FC = () => {
  const [searchParams] = useSearchParams();
  const clientIdFromUrl = searchParams.get("client_id");

  const [animations, setAnimations] = useState<AnimationDetail[]>([]);
  const [clients, setClients] = useState<ClientB2B[]>([]);
  const [products, setProducts] = useState<ProductB2B[]>([]);
  const [animatrices, setAnimatrices] = useState<Animatrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<AnimationDetail | null>(null);

  // Filtre modifiable sur la page, pré-rempli si on arrive depuis la fiche
  // d'un point de vente mais jamais un point de passage obligé.
  const [clientFilter, setClientFilter] = useState(clientIdFromUrl ?? "");

  const [createOpen, setCreateOpen] = useState(false);
  const [newClientId, setNewClientId] = useState(clientIdFromUrl ?? "");
  const [newAnimatriceId, setNewAnimatriceId] = useState("");
  const [newDate, setNewDate] = useState("");
  const [newObjectif, setNewObjectif] = useState("");
  const [creating, setCreating] = useState(false);

  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [notifyMessage, setNotifyMessage] = useState("");
  const [notifyStatus, setNotifyStatus] = useState<"success" | "error">("success");

  const notify = (message: string, status: "success" | "error") => {
    setNotifyMessage(message);
    setNotifyStatus(status);
    setSnackbarOpen(true);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [animRes, clientRes, prodRes, animatriceRes] = await Promise.all([
        axios.get<AnimationDetail[]>(`${import.meta.env.VITE_API_URL}animation`),
        axios.get<ClientB2B[]>(`${import.meta.env.VITE_API_URL}client-b2b`),
        axios.get<ProductB2B[]>(`${import.meta.env.VITE_API_URL}product-b2b`),
        axios.get<Animatrice[]>(`${import.meta.env.VITE_API_URL}animatrice`),
      ]);
      setAnimations(animRes.data);
      setClients(clientRes.data);
      setProducts(prodRes.data);
      setAnimatrices(animatriceRes.data);
    } catch (error) {
      console.error("Failed to load animations:", error);
      notify("Échec du chargement des animations.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredAnimations = useMemo(() => {
    if (!clientFilter) return animations;
    return animations.filter((a) => a.client_id === Number(clientFilter));
  }, [animations, clientFilter]);

  const handleCreate = async () => {
    if (!newClientId || !newAnimatriceId || !newDate) return;
    try {
      setCreating(true);
      const res = await axios.post<AnimationDetail & { warnings: string[] }>(
        `${import.meta.env.VITE_API_URL}animation`,
        {
          client_id: Number(newClientId),
          animatrice_id: Number(newAnimatriceId),
          date: newDate,
          objectif_ventes: newObjectif ? Number(newObjectif) : undefined,
        },
      );
      setAnimations((prev) => [res.data, ...prev]);
      setCreateOpen(false);
      setNewAnimatriceId("");
      setNewDate("");
      setNewObjectif("");
      if (res.data.warnings?.length) {
        notify(res.data.warnings.join(" · "), "error");
      } else {
        notify("Animation créée.", "success");
      }
    } catch (error: any) {
      notify(error?.response?.data?.message || "Échec de la création.", "error");
    } finally {
      setCreating(false);
    }
  };

  const handleUpdated = (updated: AnimationDetail) => {
    setAnimations((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
    setSelected(updated);
  };

  const handleDeleted = (id: number) => {
    setAnimations((prev) => prev.filter((a) => a.id !== id));
    setSelected(null);
  };

  if (loading) {
    return (
      <Box sx={{ textAlign: "center", mt: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3, flexWrap: "wrap", gap: 2 }}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          Animations
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}>
          Planifier une animation
        </Button>
      </Box>

      <Box sx={{ mb: 3, maxWidth: 340 }}>
        <ClientAutocomplete clients={clients} value={clientFilter} onChange={setClientFilter} allowEmpty />
      </Box>

      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Client</TableCell>
              <TableCell>Date</TableCell>
              <TableCell>Animatrice</TableCell>
              <TableCell>Statut</TableCell>
              <TableCell align="right">Objectif ventes</TableCell>
              <TableCell align="right">Coût animatrice</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredAnimations.map((a) => (
              <TableRow
                key={a.id}
                hover
                sx={{ cursor: "pointer" }}
                onClick={() => setSelected(a)}
              >
                <TableCell>{a.client.name}</TableCell>
                <TableCell>{new Date(a.date).toLocaleDateString()}</TableCell>
                <TableCell>{a.animatrice_ref?.name ?? "—"}</TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    label={ANIMATION_STATUS_LABELS[a.statut]}
                    color={getAnimationStatusColor(a.statut)}
                  />
                </TableCell>
                <TableCell align="right">{a.objectif_ventes ? `${Number(a.objectif_ventes).toFixed(2)} DT` : "—"}</TableCell>
                <TableCell align="right">{a.cout_animatrice ? `${Number(a.cout_animatrice).toFixed(2)} DT` : "—"}</TableCell>
              </TableRow>
            ))}
            {filteredAnimations.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <Typography variant="body2" color="text.secondary">
                    Aucune animation.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <AnimationDetailDrawer
        animation={selected}
        products={products}
        onClose={() => setSelected(null)}
        onUpdated={handleUpdated}
        onDeleted={handleDeleted}
        onNotify={notify}
      />

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Planifier une animation</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
          <ClientAutocomplete clients={clients} value={newClientId} onChange={setNewClientId} required />
          <FormControl fullWidth required>
            <InputLabel>Animatrice</InputLabel>
            <Select
              label="Animatrice"
              value={newAnimatriceId}
              onChange={(e) => setNewAnimatriceId(e.target.value)}
            >
              {animatrices.map((a) => (
                <MenuItem key={a.id} value={a.id}>
                  {a.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            label="Date"
            type="date"
            InputLabelProps={{ shrink: true }}
            value={newDate}
            onChange={(e) => setNewDate(e.target.value)}
          />
          <TextField
            label="Objectif de ventes (DT)"
            type="number"
            value={newObjectif}
            onChange={(e) => setNewObjectif(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>Annuler</Button>
          <Button variant="contained" disabled={creating || !newClientId || !newAnimatriceId || !newDate} onClick={handleCreate}>
            Créer
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbarOpen} autoHideDuration={4000} onClose={() => setSnackbarOpen(false)}>
        <SnackbarContent
          message={notifyMessage}
          sx={{ backgroundColor: notifyStatus === "error" ? "error.main" : "success.main" }}
        />
      </Snackbar>
    </Box>
  );
};

export default AnimationsList;
