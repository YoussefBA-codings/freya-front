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
import ReleveMensuelDetailDrawer, {
  ReleveMensuelDetail,
  RELEVE_STATUS_LABELS,
  PRIME_STATUS_LABELS,
  getReleveStatusColor,
  getPrimeStatusColor,
} from "../elements/ReleveMensuelDetailDrawer";
import ClientAutocomplete from "../elements/ClientAutocomplete";

interface ClientB2B {
  id: number;
  name: string;
}

interface ProductB2B {
  id: number;
  name: string;
}

const MOIS_LABELS = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"];

const RelevesMensuelsList: React.FC = () => {
  const [searchParams] = useSearchParams();
  const clientIdFromUrl = searchParams.get("client_id");

  const [releves, setReleves] = useState<ReleveMensuelDetail[]>([]);
  const [clients, setClients] = useState<ClientB2B[]>([]);
  const [products, setProducts] = useState<ProductB2B[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ReleveMensuelDetail | null>(null);

  // Filtre modifiable directement sur la page - pré-rempli si on arrive
  // depuis la fiche d'un point de vente, mais jamais un point de passage
  // obligé : on peut choisir/chercher n'importe quel client ici directement.
  const [clientFilter, setClientFilter] = useState(clientIdFromUrl ?? "");

  const [createOpen, setCreateOpen] = useState(false);
  const [newClientId, setNewClientId] = useState(clientIdFromUrl ?? "");
  const [newMois, setNewMois] = useState(String(new Date().getMonth() + 1));
  const [newAnnee, setNewAnnee] = useState(String(new Date().getFullYear()));
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
      const [relevesRes, clientRes, prodRes] = await Promise.all([
        axios.get<ReleveMensuelDetail[]>(`${import.meta.env.VITE_API_URL}releve-mensuel`),
        axios.get<ClientB2B[]>(`${import.meta.env.VITE_API_URL}client-b2b`),
        axios.get<ProductB2B[]>(`${import.meta.env.VITE_API_URL}product-b2b`),
      ]);
      setReleves(relevesRes.data);
      setClients(clientRes.data);
      setProducts(prodRes.data);
    } catch (error) {
      console.error("Failed to load relevés:", error);
      notify("Échec du chargement des relevés.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredReleves = useMemo(() => {
    if (!clientFilter) return releves;
    return releves.filter((r) => r.client_id === Number(clientFilter));
  }, [releves, clientFilter]);

  const handleCreate = async () => {
    if (!newClientId || !newMois || !newAnnee) return;
    try {
      setCreating(true);
      const res = await axios.post<ReleveMensuelDetail>(`${import.meta.env.VITE_API_URL}releve-mensuel`, {
        client_id: Number(newClientId),
        mois: Number(newMois),
        annee: Number(newAnnee),
      });
      setReleves((prev) => [res.data, ...prev]);
      setCreateOpen(false);
      notify("Relevé créé.", "success");
    } catch (error: any) {
      notify(error?.response?.data?.message || "Échec de la création.", "error");
    } finally {
      setCreating(false);
    }
  };

  const handleUpdated = (updated: ReleveMensuelDetail) => {
    setReleves((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    setSelected(updated);
  };

  const handleDeleted = (id: number) => {
    setReleves((prev) => prev.filter((r) => r.id !== id));
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
          Relevés mensuels
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}>
          Nouveau relevé
        </Button>
      </Box>

      <Box sx={{ mb: 3, maxWidth: 340 }}>
        <ClientAutocomplete
          clients={clients}
          value={clientFilter}
          onChange={setClientFilter}
          allowEmpty
        />
      </Box>

      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Point de vente</TableCell>
              <TableCell>Mois</TableCell>
              <TableCell>Statut</TableCell>
              <TableCell>Prime</TableCell>
              <TableCell>Transmis par</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredReleves.map((r) => (
              <TableRow key={r.id} hover sx={{ cursor: "pointer" }} onClick={() => setSelected(r)}>
                <TableCell>{r.client.name}</TableCell>
                <TableCell>{MOIS_LABELS[r.mois - 1]} {r.annee}</TableCell>
                <TableCell>
                  <Chip size="small" label={RELEVE_STATUS_LABELS[r.statut]} color={getReleveStatusColor(r.statut)} />
                </TableCell>
                <TableCell>
                  <Chip size="small" variant="outlined" label={PRIME_STATUS_LABELS[r.statut_prime]} color={getPrimeStatusColor(r.statut_prime)} />
                </TableCell>
                <TableCell>{r.transmis_par ?? "—"}</TableCell>
              </TableRow>
            ))}
            {filteredReleves.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  <Typography variant="body2" color="text.secondary">
                    Aucun relevé.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <ReleveMensuelDetailDrawer
        releve={selected}
        products={products}
        onClose={() => setSelected(null)}
        onUpdated={handleUpdated}
        onDeleted={handleDeleted}
        onNotify={notify}
      />

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Nouveau relevé mensuel</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
          <ClientAutocomplete clients={clients} value={newClientId} onChange={setNewClientId} required />
          <Box sx={{ display: "flex", gap: 2 }}>
            <FormControl fullWidth>
              <InputLabel>Mois</InputLabel>
              <Select label="Mois" value={newMois} onChange={(e) => setNewMois(e.target.value)}>
                {MOIS_LABELS.map((label, i) => (
                  <MenuItem key={i + 1} value={i + 1}>{label}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField fullWidth label="Année" type="number" value={newAnnee} onChange={(e) => setNewAnnee(e.target.value)} />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>Annuler</Button>
          <Button variant="contained" disabled={creating || !newClientId} onClick={handleCreate}>
            Créer
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbarOpen} autoHideDuration={4000} onClose={() => setSnackbarOpen(false)}>
        <SnackbarContent message={notifyMessage} sx={{ backgroundColor: notifyStatus === "error" ? "error.main" : "success.main" }} />
      </Snackbar>
    </Box>
  );
};

export default RelevesMensuelsList;
