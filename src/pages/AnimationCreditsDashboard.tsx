import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  Box,
  Typography,
  CircularProgress,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  LinearProgress,
  IconButton,
  Tooltip,
} from "@mui/material";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { useNavigate } from "react-router-dom";

interface ClientCreditRow {
  client_id: number;
  client_name: string;
  solde_achats_cumule: number;
  solde_reliquat: number;
  credits_generes: number;
  credits_utilises: number;
  credits_expires: number;
  credits_disponibles: number;
  date_derniere_commande_payee: string | null;
  date_derniere_animation: string | null;
}

const CREDIT_THRESHOLD_DT = 14000;

// Suivi, pour chaque point de vente, du crédit animation qu'il lui reste en
// fonction de ses commandes payées - vue d'ensemble tous clients (le détail
// par client existe déjà dans la fiche point de vente, mais rien ne
// permettait de scanner tout le monde d'un coup avant cette page).
const AnimationCreditsDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [rows, setRows] = useState<ClientCreditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    axios
      .get<ClientCreditRow[]>(`${import.meta.env.VITE_API_URL}animation-ledger/summary/all`)
      .then((res) => setRows(res.data))
      .catch((error) => console.error("Failed to load credits dashboard:", error))
      .finally(() => setLoading(false));
  }, []);

  const filteredRows = useMemo(
    () => rows.filter((r) => r.client_name.toLowerCase().includes(search.toLowerCase())),
    [rows, search],
  );

  const totalCreditsDisponibles = useMemo(
    () => rows.reduce((s, r) => s + r.credits_disponibles, 0),
    [rows],
  );
  const nbClientsAvecAlerte = useMemo(
    () => rows.filter((r) => r.credits_disponibles < 0).length,
    [rows],
  );

  if (loading) {
    return (
      <Box sx={{ textAlign: "center", mt: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
        Suivi des crédits animation
      </Typography>
      <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 3 }}>
        Crédit restant à chaque point de vente en fonction de ses commandes payées ·{" "}
        <strong>{totalCreditsDisponibles}</strong> crédit(s) disponible(s) au total
        {nbClientsAvecAlerte > 0 && (
          <>
            {" "}· <Box component="span" sx={{ color: "error.main", fontWeight: 700 }}>{nbClientsAvecAlerte} à corriger</Box>
          </>
        )}
      </Typography>

      <TextField
        fullWidth
        label="Rechercher un point de vente"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        sx={{ mb: 3, maxWidth: 400 }}
      />

      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Point de vente</TableCell>
              <TableCell sx={{ minWidth: 220 }}>Progression vers le prochain crédit</TableCell>
              <TableCell align="right">Crédits disponibles</TableCell>
              <TableCell align="right">Générés</TableCell>
              <TableCell align="right">Utilisés</TableCell>
              <TableCell align="right">Expirés</TableCell>
              <TableCell>Dernière commande payée</TableCell>
              <TableCell>Dernière animation</TableCell>
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredRows.map((r) => {
              const pct = Math.min(100, Math.max(0, (r.solde_reliquat / CREDIT_THRESHOLD_DT) * 100));
              const creditsColor = r.credits_disponibles < 0 ? "error" : r.credits_disponibles === 0 ? "default" : "success";
              return (
                <TableRow key={r.client_id} hover>
                  <TableCell>{r.client_name}</TableCell>
                  <TableCell>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <LinearProgress variant="determinate" value={pct} sx={{ flexGrow: 1, height: 6, borderRadius: 3 }} />
                      <Typography variant="caption" sx={{ minWidth: 90, textAlign: "right" }}>
                        {r.solde_reliquat.toFixed(0)} / {CREDIT_THRESHOLD_DT} DT
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell align="right">
                    <Chip size="small" label={r.credits_disponibles} color={creditsColor} />
                  </TableCell>
                  <TableCell align="right">{r.credits_generes}</TableCell>
                  <TableCell align="right">{r.credits_utilises}</TableCell>
                  <TableCell align="right">{r.credits_expires}</TableCell>
                  <TableCell>
                    {r.date_derniere_commande_payee ? new Date(r.date_derniere_commande_payee).toLocaleDateString() : "—"}
                  </TableCell>
                  <TableCell>
                    {r.date_derniere_animation ? new Date(r.date_derniere_animation).toLocaleDateString() : "—"}
                  </TableCell>
                  <TableCell>
                    <Tooltip title="Voir la fiche complète">
                      <IconButton size="small" onClick={() => navigate(`/b2b/clients/${r.client_id}`)}>
                        <OpenInNewIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              );
            })}
            {filteredRows.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} align="center">
                  <Typography variant="body2" color="text.secondary">
                    Aucun point de vente ne correspond à cette recherche.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default AnimationCreditsDashboard;
