import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  Box,
  Typography,
  TextField,
  Button,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Drawer,
  IconButton,
  Switch,
  FormControlLabel,
  Snackbar,
  SnackbarContent,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";

interface Animatrice {
  id: number;
  name: string;
  phone: string | null;
  actif: boolean;
}

interface AnimatriceDashboard {
  animatrice_id: number;
  animatrice_name: string;
  nb_animations_total: number;
  nb_animations_realisees: number;
  montant_du_dt: number;
  ca_genere_dt: number;
  points_generes: number;
  historique: {
    animation_id: number;
    client_name: string;
    date: string;
    statut: string;
    cout_animatrice: number;
  }[];
}

const STATUT_LABELS: Record<string, string> = {
  PLANIFIEE: "Planifiée",
  CONFIRMEE: "Confirmée",
  REALISEE: "Réalisée",
  ANNULEE: "Annulée",
  REPORTEE: "Reportée",
};

const SectionCard: React.FC<{ title?: string; children: React.ReactNode }> = ({ title, children }) => (
  <Box sx={{ background: "grey.50", p: 2, borderRadius: 2, border: "1px solid", borderColor: "divider" }}>
    {title && (
      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5 }}>
        {title}
      </Typography>
    )}
    {children}
  </Box>
);

const AnimatricesList: React.FC = () => {
  const [animatrices, setAnimatrices] = useState<Animatrice[]>([]);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [creating, setCreating] = useState(false);

  const [editOpen, setEditOpen] = useState<Animatrice | null>(null);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editActif, setEditActif] = useState(true);

  const [selectedDashboard, setSelectedDashboard] = useState<AnimatriceDashboard | null>(null);
  const [loadingDashboard, setLoadingDashboard] = useState(false);

  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [notifyMessage, setNotifyMessage] = useState("");
  const [notifyStatus, setNotifyStatus] = useState<"success" | "error">("success");

  const notify = (message: string, status: "success" | "error") => {
    setNotifyMessage(message);
    setNotifyStatus(status);
    setSnackbarOpen(true);
  };

  const loadAnimatrices = async () => {
    setLoading(true);
    try {
      const res = await axios.get<Animatrice[]>(`${import.meta.env.VITE_API_URL}animatrice`);
      setAnimatrices(res.data);
    } catch (error) {
      console.error("Failed to load animatrices:", error);
      notify("Échec du chargement des animatrices.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnimatrices();
  }, []);

  const handleCreate = async () => {
    if (!name.trim()) return;
    try {
      setCreating(true);
      await axios.post(`${import.meta.env.VITE_API_URL}animatrice`, {
        name: name.trim(),
        phone: phone.trim() || undefined,
      });
      setName("");
      setPhone("");
      notify("Animatrice créée.", "success");
      loadAnimatrices();
    } catch (error) {
      console.error("Failed to create animatrice:", error);
      notify("Échec de la création.", "error");
    } finally {
      setCreating(false);
    }
  };

  const openEdit = (a: Animatrice) => {
    setEditOpen(a);
    setEditName(a.name);
    setEditPhone(a.phone ?? "");
    setEditActif(a.actif);
  };

  const handleSaveEdit = async () => {
    if (!editOpen) return;
    try {
      await axios.put(`${import.meta.env.VITE_API_URL}animatrice/${editOpen.id}`, {
        name: editName,
        phone: editPhone || undefined,
        actif: editActif,
      });
      notify("Animatrice mise à jour.", "success");
      setEditOpen(null);
      loadAnimatrices();
    } catch (error) {
      console.error("Failed to update animatrice:", error);
      notify("Échec de la mise à jour.", "error");
    }
  };

  const openPerformance = async (a: Animatrice) => {
    setLoadingDashboard(true);
    try {
      const res = await axios.get<AnimatriceDashboard>(
        `${import.meta.env.VITE_API_URL}dashboard/animatrice/${a.id}`,
      );
      setSelectedDashboard(res.data);
    } catch (error) {
      console.error("Failed to load animatrice dashboard:", error);
      notify("Échec du chargement de la performance.", "error");
    } finally {
      setLoadingDashboard(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ textAlign: "center", mt: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, display: "flex", gap: 4, flexWrap: "wrap" }}>
      {/* LEFT: LIST */}
      <Box sx={{ flex: 2, minWidth: 400 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 3 }}>
          Animatrices
        </Typography>

        <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Nom</TableCell>
                <TableCell>Téléphone</TableCell>
                <TableCell>Statut</TableCell>
                <TableCell align="right">Performance</TableCell>
                <TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {animatrices.map((a) => (
                <TableRow key={a.id} hover>
                  <TableCell>{a.name}</TableCell>
                  <TableCell>{a.phone ?? "—"}</TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={a.actif ? "Active" : "Inactive"}
                      color={a.actif ? "success" : "default"}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Button size="small" onClick={() => openPerformance(a)} disabled={loadingDashboard}>
                      Voir
                    </Button>
                  </TableCell>
                  <TableCell>
                    <Button size="small" onClick={() => openEdit(a)}>
                      Modifier
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {animatrices.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    <Typography variant="body2" color="text.secondary">
                      Aucune animatrice enregistrée.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      {/* RIGHT: CREATE */}
      <Box sx={{ flex: 1, minWidth: 300 }}>
        <Typography variant="h5" gutterBottom>
          Nouvelle animatrice
        </Typography>
        <TextField
          fullWidth
          label="Nom *"
          value={name}
          onChange={(e) => setName(e.target.value)}
          sx={{ mb: 2 }}
        />
        <TextField
          fullWidth
          label="Téléphone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          sx={{ mb: 2 }}
        />
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleCreate} disabled={creating || !name.trim()}>
          {creating ? <CircularProgress size={20} /> : "Créer"}
        </Button>
      </Box>

      {/* EDIT DIALOG */}
      <Dialog open={!!editOpen} onClose={() => setEditOpen(null)} fullWidth maxWidth="xs">
        <DialogTitle>Modifier {editOpen?.name}</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
          <TextField fullWidth label="Nom" value={editName} onChange={(e) => setEditName(e.target.value)} />
          <TextField fullWidth label="Téléphone" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} />
          <FormControlLabel
            control={<Switch checked={editActif} onChange={(e) => setEditActif(e.target.checked)} />}
            label={editActif ? "Active" : "Inactive"}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOpen(null)}>Annuler</Button>
          <Button variant="contained" onClick={handleSaveEdit}>
            Enregistrer
          </Button>
        </DialogActions>
      </Dialog>

      {/* PERFORMANCE DRAWER */}
      <Drawer
        anchor="right"
        open={!!selectedDashboard}
        onClose={() => setSelectedDashboard(null)}
        PaperProps={{ sx: { width: { xs: "100vw", sm: 480 } } }}
      >
        <Box sx={{ p: 3, display: "flex", flexDirection: "column", gap: 2 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              {selectedDashboard?.animatrice_name}
            </Typography>
            <IconButton onClick={() => setSelectedDashboard(null)}>
              <CloseIcon />
            </IconButton>
          </Box>

          {selectedDashboard && (
            <>
              <SectionCard title="Performance">
                <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1 }}>
                  <Typography variant="body2">
                    Animations réalisées : <strong>{selectedDashboard.nb_animations_realisees} / {selectedDashboard.nb_animations_total}</strong>
                  </Typography>
                  <Typography variant="body2">
                    Montant dû : <strong>{selectedDashboard.montant_du_dt.toFixed(2)} DT</strong>
                  </Typography>
                  <Typography variant="body2">
                    CA généré : <strong>{selectedDashboard.ca_genere_dt.toFixed(2)} DT</strong>
                  </Typography>
                  <Typography variant="body2">
                    Points challenge : <strong>{selectedDashboard.points_generes}</strong>
                  </Typography>
                </Box>
              </SectionCard>

              <SectionCard title="Historique des animations">
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Client</TableCell>
                        <TableCell>Date</TableCell>
                        <TableCell>Statut</TableCell>
                        <TableCell align="right">Coût</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {selectedDashboard.historique.map((h) => (
                        <TableRow key={h.animation_id}>
                          <TableCell>{h.client_name}</TableCell>
                          <TableCell>{new Date(h.date).toLocaleDateString()}</TableCell>
                          <TableCell>{STATUT_LABELS[h.statut] ?? h.statut}</TableCell>
                          <TableCell align="right">{h.cout_animatrice.toFixed(2)} DT</TableCell>
                        </TableRow>
                      ))}
                      {selectedDashboard.historique.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={4} align="center">
                            <Typography variant="body2" color="text.secondary">
                              Aucune animation pour l'instant.
                            </Typography>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </SectionCard>
            </>
          )}
        </Box>
      </Drawer>

      <Snackbar open={snackbarOpen} autoHideDuration={4000} onClose={() => setSnackbarOpen(false)}>
        <SnackbarContent
          message={notifyMessage}
          sx={{ backgroundColor: notifyStatus === "error" ? "error.main" : "success.main" }}
        />
      </Snackbar>
    </Box>
  );
};

export default AnimatricesList;
