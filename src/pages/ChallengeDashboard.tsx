import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
} from "@mui/material";
import {
  PRIME_STATUS_LABELS,
  ChallengePrimeStatus,
  getPrimeStatusColor,
} from "../elements/ReleveMensuelDetailDrawer";
import ClientAutocomplete from "../elements/ClientAutocomplete";

interface ClientB2B {
  id: number;
  name: string;
}

interface ChallengeDashboardData {
  primes_a_payer_dt: number;
  statut_primes: Record<string, number>;
  historique_paiements: { releve_id: number; client_name: string; mois: number; annee: number; prime_dt: number }[];
  points_par_vendeuse: { vendeuse_id: number; vendeuse_name: string | null; points: number }[];
  ventes_animation_total: number;
  ventes_hors_animation_total: number;
}

const MOIS_LABELS = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"];

const KpiCard: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
    <Typography variant="caption" color="text.secondary">
      {label}
    </Typography>
    <Typography variant="h5" sx={{ fontWeight: 700 }}>
      {value}
    </Typography>
  </Paper>
);

const ChallengeDashboard: React.FC = () => {
  const [clients, setClients] = useState<ClientB2B[]>([]);
  const [clientId, setClientId] = useState("");
  const [data, setData] = useState<ChallengeDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get<ClientB2B[]>(`${import.meta.env.VITE_API_URL}client-b2b`).then((res) => setClients(res.data));
  }, []);

  useEffect(() => {
    setLoading(true);
    const params: Record<string, string> = {};
    if (clientId) params.client_id = clientId;
    axios
      .get<ChallengeDashboardData>(`${import.meta.env.VITE_API_URL}dashboard/challenge`, { params })
      .then((res) => setData(res.data))
      .catch((error) => console.error("Failed to load challenge dashboard:", error))
      .finally(() => setLoading(false));
  }, [clientId]);

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 3 }}>
        Tableau de bord challenge
      </Typography>

      <Box sx={{ mb: 3, maxWidth: 300 }}>
        <ClientAutocomplete clients={clients} value={clientId} onChange={setClientId} allowEmpty />
      </Box>

      {loading || !data ? (
        <Box sx={{ textAlign: "center", mt: 10 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(3,1fr)" }, gap: 2, mb: 3 }}>
            <KpiCard label="Primes à payer" value={`${data.primes_a_payer_dt.toFixed(2)} DT`} />
            <KpiCard label="Ventes en animation" value={data.ventes_animation_total} />
            <KpiCard label="Ventes hors animation" value={data.ventes_hors_animation_total} />
          </Box>

          <Box sx={{ display: "flex", gap: 1, mb: 3, flexWrap: "wrap" }}>
            {Object.entries(data.statut_primes).map(([statut, count]) => (
              <Chip
                key={statut}
                label={`${PRIME_STATUS_LABELS[statut as ChallengePrimeStatus] ?? statut} : ${count}`}
                color={getPrimeStatusColor(statut as ChallengePrimeStatus)}
                variant="outlined"
              />
            ))}
          </Box>

          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2 }}>
            <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, p: 2, pb: 0 }}>
                Points par vendeuse
              </Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Vendeuse</TableCell>
                    <TableCell align="right">Points</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.points_par_vendeuse.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={2} align="center">
                        <Typography variant="body2" color="text.secondary">Aucune donnée.</Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.points_par_vendeuse
                      .sort((a, b) => b.points - a.points)
                      .map((v) => (
                        <TableRow key={v.vendeuse_id}>
                          <TableCell>{v.vendeuse_name ?? `#${v.vendeuse_id}`}</TableCell>
                          <TableCell align="right">{v.points}</TableCell>
                        </TableRow>
                      ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, p: 2, pb: 0 }}>
                Historique des paiements
              </Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Point de vente</TableCell>
                    <TableCell>Mois</TableCell>
                    <TableCell align="right">Prime</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.historique_paiements.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} align="center">
                        <Typography variant="body2" color="text.secondary">Aucun paiement.</Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.historique_paiements.map((p) => (
                      <TableRow key={p.releve_id}>
                        <TableCell>{p.client_name}</TableCell>
                        <TableCell>{MOIS_LABELS[p.mois - 1]} {p.annee}</TableCell>
                        <TableCell align="right">{p.prime_dt.toFixed(2)} DT</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </>
      )}
    </Box>
  );
};

export default ChallengeDashboard;
