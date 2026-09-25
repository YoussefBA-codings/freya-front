import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  Box,
  Typography,
  CircularProgress,
  Paper,
  LinearProgress,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Collapse,
} from "@mui/material";
import EventAvailableIcon from "@mui/icons-material/EventAvailable";
import LocalOfferIcon from "@mui/icons-material/LocalOffer";
import TimelineIcon from "@mui/icons-material/Timeline";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import { useNavigate, useParams } from "react-router-dom";

/* ======================================================
   🔵 TYPES
====================================================== */

interface ClientB2B {
  id: number;
  name: string;
  responsable_name?: string | null;
  responsable_phone?: string | null;
  responsable_email?: string | null;
  address?: string | null;
}

interface ClientDashboard {
  progression_vers_14000: { solde_reliquat: number; seuil: number; pourcentage: number };
  solde_animation: number;
  credits_disponibles: number;
  animations_realisees: number;
  animations_total: number;
  ventes_mensuelles: { mois: number; annee: number; ca: number; unites: number; points: number }[];
  produits_plus_vendus: { product_id: number; name: string; quantite: number }[];
}

const LEDGER_TYPE_LABELS: Record<string, string> = {
  COMMANDE_PAYEE: "Commande payée",
  RETOUR: "Retour",
  AVOIR: "Avoir",
  CREDIT_GENERE: "Crédit généré",
  ANIMATION_UTILISEE: "Animation utilisée",
  CREDIT_EXPIRE: "Crédit expiré",
  CORRECTION_MANUELLE: "Correction manuelle",
};

interface LedgerMovement {
  id: number;
  type: string;
  montant_dt: string | null;
  credit_delta: number | null;
  motif: string | null;
  created_at: string;
}

interface LedgerSummary {
  date_derniere_commande_payee: string | null;
  date_derniere_animation: string | null;
  mouvements: LedgerMovement[];
}

const MOIS_LABELS = [
  "Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc",
];

/* ======================================================
   🔵 COMPONENT
====================================================== */

const ClientB2BDetail: React.FC = () => {
  const { clientId } = useParams();
  const numericId = Number(clientId);
  const navigate = useNavigate();

  const [client, setClient] = useState<ClientB2B | null>(null);
  const [dashboard, setDashboard] = useState<ClientDashboard | null>(null);
  const [ledger, setLedger] = useState<LedgerSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [showMouvements, setShowMouvements] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      axios.get<ClientB2B>(`${import.meta.env.VITE_API_URL}client-b2b/${numericId}`),
      axios.get<ClientDashboard>(`${import.meta.env.VITE_API_URL}dashboard/client/${numericId}`),
      axios.get<LedgerSummary>(`${import.meta.env.VITE_API_URL}animation-ledger/client/${numericId}`),
    ])
      .then(([clientRes, dashRes, ledgerRes]) => {
        setClient(clientRes.data);
        setDashboard(dashRes.data);
        setLedger(ledgerRes.data);
      })
      .catch((error) => console.error("Failed to load client detail:", error))
      .finally(() => setLoading(false));
  }, [numericId]);

  const ventesMensuellesTriees = useMemo(
    () =>
      [...(dashboard?.ventes_mensuelles ?? [])].sort(
        (a, b) => b.annee * 12 + b.mois - (a.annee * 12 + a.mois),
      ),
    [dashboard],
  );

  if (loading) {
    return (
      <Box sx={{ textAlign: "center", mt: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!client || !dashboard) {
    return (
      <Typography variant="h5" color="error">
        Point de vente introuvable.
      </Typography>
    );
  }

  const creditsColor = dashboard.credits_disponibles < 0 ? "error" : dashboard.credits_disponibles === 0 ? "default" : "success";

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ fontWeight: 700 }}>
        {client.name}
      </Typography>
      <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 3 }}>
        {[client.responsable_name, client.responsable_phone, client.responsable_email]
          .filter(Boolean)
          .join(" · ") || "Aucun contact renseigné"}
      </Typography>

      {/* KPI ROW */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "2fr 1fr 1fr 1fr" },
          gap: 2,
          mb: 3,
        }}
      >
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
          <Typography variant="caption" color="text.secondary">
            Progression vers le prochain crédit animation (14 000 DT)
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 1 }}>
            <LinearProgress
              variant="determinate"
              value={dashboard.progression_vers_14000.pourcentage}
              sx={{ flexGrow: 1, height: 8, borderRadius: 4 }}
            />
            <Typography variant="body2" sx={{ fontWeight: 700, minWidth: 40 }}>
              {dashboard.progression_vers_14000.pourcentage}%
            </Typography>
          </Box>
          <Typography variant="caption" color="text.secondary">
            {dashboard.progression_vers_14000.solde_reliquat.toFixed(2)} / {dashboard.progression_vers_14000.seuil} DT
          </Typography>
        </Paper>

        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
          <Typography variant="caption" color="text.secondary">
            Solde cumulé animation
          </Typography>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            {dashboard.solde_animation.toFixed(2)} DT
          </Typography>
        </Paper>

        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>
            Crédits disponibles
          </Typography>
          <Chip label={dashboard.credits_disponibles} color={creditsColor} size="small" />
          {dashboard.credits_disponibles < 0 && (
            <Typography variant="caption" color="error" sx={{ display: "block", mt: 0.5 }}>
              À corriger manuellement
            </Typography>
          )}
        </Paper>

        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
          <Typography variant="caption" color="text.secondary">
            Animations réalisées
          </Typography>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            {dashboard.animations_realisees} / {dashboard.animations_total}
          </Typography>
        </Paper>
      </Box>

      {/* RACCOURCIS */}
      <Box sx={{ display: "flex", gap: 2, mb: 3, flexWrap: "wrap" }}>
        <Button
          variant="outlined"
          startIcon={<EventAvailableIcon />}
          onClick={() => navigate(`/b2b/animations?client_id=${numericId}`)}
        >
          Voir les animations
        </Button>
        <Button
          variant="outlined"
          startIcon={<LocalOfferIcon />}
          onClick={() => navigate(`/b2b/releves?client_id=${numericId}`)}
        >
          Voir les relevés mensuels
        </Button>
        <Button
          variant="outlined"
          startIcon={<TimelineIcon />}
          onClick={() => navigate(`/b2b/historique-ventes?client_id=${numericId}`)}
        >
          Voir l'historique des ventes
        </Button>
      </Box>

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2, mb: 3 }}>
        {/* VENTES MENSUELLES */}
        <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, p: 2, pb: 0 }}>
            Ventes mensuelles (relevés)
          </Typography>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Mois</TableCell>
                <TableCell align="right">CA</TableCell>
                <TableCell align="right">Unités</TableCell>
                <TableCell align="right">Points</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {ventesMensuellesTriees.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} align="center">
                    <Typography variant="body2" color="text.secondary">
                      Aucun relevé mensuel pour ce point de vente.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                ventesMensuellesTriees.map((v) => (
                  <TableRow key={`${v.annee}-${v.mois}`}>
                    <TableCell>{MOIS_LABELS[v.mois - 1]} {v.annee}</TableCell>
                    <TableCell align="right">{v.ca.toFixed(2)} DT</TableCell>
                    <TableCell align="right">{v.unites}</TableCell>
                    <TableCell align="right">{v.points}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* PRODUITS PLUS VENDUS */}
        <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, p: 2, pb: 0 }}>
            Produits les plus vendus
          </Typography>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Produit</TableCell>
                <TableCell align="right">Quantité</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {dashboard.produits_plus_vendus.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={2} align="center">
                    <Typography variant="body2" color="text.secondary">
                      Aucune donnée.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                dashboard.produits_plus_vendus.map((p) => (
                  <TableRow key={p.product_id}>
                    <TableCell>{p.name}</TableCell>
                    <TableCell align="right">{p.quantite}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      {/* HISTORIQUE DES MOUVEMENTS (LEDGER) */}
      <Paper variant="outlined" sx={{ borderRadius: 2 }}>
        <Box
          sx={{ p: 2, display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}
          onClick={() => setShowMouvements((s) => !s)}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            Historique des mouvements du compteur animation ({ledger?.mouvements.length ?? 0})
          </Typography>
          {showMouvements ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        </Box>
        <Collapse in={showMouvements}>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell align="right">Montant (DT)</TableCell>
                  <TableCell align="right">Crédits</TableCell>
                  <TableCell>Motif</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(ledger?.mouvements ?? [])
                  .slice()
                  .reverse()
                  .map((m) => (
                    <TableRow key={m.id}>
                      <TableCell>{new Date(m.created_at).toLocaleString()}</TableCell>
                      <TableCell>{LEDGER_TYPE_LABELS[m.type] ?? m.type}</TableCell>
                      <TableCell align="right">
                        {m.montant_dt != null ? `${Number(m.montant_dt).toFixed(2)} DT` : "—"}
                      </TableCell>
                      <TableCell align="right">{m.credit_delta ?? "—"}</TableCell>
                      <TableCell>{m.motif ?? "—"}</TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Collapse>
      </Paper>
    </Box>
  );
};

export default ClientB2BDetail;
