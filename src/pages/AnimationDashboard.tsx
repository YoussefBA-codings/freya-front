import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  TextField,
} from "@mui/material";
import ClientAutocomplete from "../elements/ClientAutocomplete";

interface ClientB2B {
  id: number;
  name: string;
}

interface AnimationDashboardData {
  nb_animations: number;
  par_statut: { planifiees: number; confirmees: number; realisees: number; annulees: number; reportees: number };
  ca_total: number;
  unites_total: number;
  cadeaux_distribues: number;
  cout_total: number;
  ca_par_dt_depense: number | null;
}

const KpiCard: React.FC<{ label: string; value: React.ReactNode; sub?: string }> = ({ label, value, sub }) => (
  <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
    <Typography variant="caption" color="text.secondary">
      {label}
    </Typography>
    <Typography variant="h5" sx={{ fontWeight: 700 }}>
      {value}
    </Typography>
    {sub && (
      <Typography variant="caption" color="text.secondary">
        {sub}
      </Typography>
    )}
  </Paper>
);

const AnimationDashboard: React.FC = () => {
  const [clients, setClients] = useState<ClientB2B[]>([]);
  const [clientId, setClientId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [data, setData] = useState<AnimationDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get<ClientB2B[]>(`${import.meta.env.VITE_API_URL}client-b2b`).then((res) => setClients(res.data));
  }, []);

  const loadData = () => {
    setLoading(true);
    const params: Record<string, string> = {};
    if (clientId) params.client_id = clientId;
    if (from) params.from = from;
    if (to) params.to = to;
    axios
      .get<AnimationDashboardData>(`${import.meta.env.VITE_API_URL}dashboard/animation`, { params })
      .then((res) => setData(res.data))
      .catch((error) => console.error("Failed to load animation dashboard:", error))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId, from, to]);

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 3 }}>
        Tableau de bord animations
      </Typography>

      <Box sx={{ display: "flex", gap: 2, mb: 3, flexWrap: "wrap" }}>
        <ClientAutocomplete clients={clients} value={clientId} onChange={setClientId} allowEmpty />
        <TextField label="Du" type="date" InputLabelProps={{ shrink: true }} value={from} onChange={(e) => setFrom(e.target.value)} />
        <TextField label="Au" type="date" InputLabelProps={{ shrink: true }} value={to} onChange={(e) => setTo(e.target.value)} />
      </Box>

      {loading || !data ? (
        <Box sx={{ textAlign: "center", mt: 10 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(5,1fr)" }, gap: 2, mb: 3 }}>
            <KpiCard label="Planifiées" value={data.par_statut.planifiees} />
            <KpiCard label="Confirmées" value={data.par_statut.confirmees} />
            <KpiCard label="Réalisées" value={data.par_statut.realisees} />
            <KpiCard label="Annulées" value={data.par_statut.annulees} />
            <KpiCard label="Reportées" value={data.par_statut.reportees} />
          </Box>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(4,1fr)" }, gap: 2 }}>
            <KpiCard label="CA total" value={`${data.ca_total.toFixed(2)} DT`} />
            <KpiCard label="Unités vendues" value={data.unites_total} />
            <KpiCard label="Cadeaux distribués" value={data.cadeaux_distribues} />
            <KpiCard
              label="Coût total"
              value={`${data.cout_total.toFixed(2)} DT`}
              sub={data.ca_par_dt_depense != null ? `${data.ca_par_dt_depense.toFixed(2)} DT de CA / DT dépensé` : undefined}
            />
          </Box>
        </>
      )}
    </Box>
  );
};

export default AnimationDashboard;
