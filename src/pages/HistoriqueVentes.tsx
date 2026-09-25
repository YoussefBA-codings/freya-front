import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
} from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import { useSearchParams } from "react-router-dom";
import ClientAutocomplete from "../elements/ClientAutocomplete";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

interface ClientB2B {
  id: number;
  name: string;
}

interface ProductB2B {
  id: number;
  name: string;
  gamme: string | null;
}

interface HistoriqueRow {
  client_id: number;
  client_name: string;
  mois: number;
  annee: number;
  qte: number;
  ca: number;
  points: number;
  qte_animation: number;
  qte_hors_animation: number;
  nb_animations: number;
  evolution_ca_pct: number | null;
  evolution_qte_pct: number | null;
}

const MOIS_LABELS = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"];
const MARQUES = ["SKIN1004", "COSRX", "DR ALTHEA", "OTHER"];

const HistoriqueVentes: React.FC = () => {
  const [searchParams] = useSearchParams();
  const clientIdFromUrl = searchParams.get("client_id");

  const [clients, setClients] = useState<ClientB2B[]>([]);
  const [products, setProducts] = useState<ProductB2B[]>([]);
  const [rows, setRows] = useState<HistoriqueRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [clientId, setClientId] = useState(clientIdFromUrl ?? "");
  const [marque, setMarque] = useState("");
  const [gamme, setGamme] = useState("");
  const [productId, setProductId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [animationFilter, setAnimationFilter] = useState<"" | "true" | "false">("");

  useEffect(() => {
    axios.get<ClientB2B[]>(`${import.meta.env.VITE_API_URL}client-b2b`).then((res) => setClients(res.data));
    axios.get<ProductB2B[]>(`${import.meta.env.VITE_API_URL}product-b2b`).then((res) => setProducts(res.data));
  }, []);

  const gammes = useMemo(
    () => [...new Set(products.map((p) => p.gamme).filter((g): g is string => !!g))].sort(),
    [products],
  );

  const buildParams = () => {
    const params: Record<string, string> = {};
    if (clientId) params.client_id = clientId;
    if (marque) params.marque = marque;
    if (gamme) params.gamme = gamme;
    if (productId) params.product_id = productId;
    if (from) params.from = from;
    if (to) params.to = to;
    if (animationFilter) params.animation = animationFilter;
    return params;
  };

  const loadData = () => {
    setLoading(true);
    axios
      .get<{ rows: HistoriqueRow[] }>(`${import.meta.env.VITE_API_URL}dashboard/historique`, { params: buildParams() })
      .then((res) => setRows(res.data.rows))
      .catch((error) => console.error("Failed to load historique:", error))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId, marque, gamme, productId, from, to, animationFilter]);

  const chartData = useMemo(() => {
    const byMonth = new Map<string, { label: string; ca: number; qte: number }>();
    for (const r of rows) {
      const key = `${r.annee}-${String(r.mois).padStart(2, "0")}`;
      const entry = byMonth.get(key) ?? { label: `${MOIS_LABELS[r.mois - 1]} ${r.annee}`, ca: 0, qte: 0 };
      entry.ca += r.ca;
      entry.qte += r.qte;
      byMonth.set(key, entry);
    }
    return [...byMonth.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, v]) => v);
  }, [rows]);

  const handleExportExcel = () => {
    const params = new URLSearchParams(buildParams()).toString();
    window.open(`${import.meta.env.VITE_API_URL}dashboard/historique/export/excel?${params}`, "_blank");
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          Historique des ventes
        </Typography>
        <Button variant="outlined" startIcon={<DownloadIcon />} onClick={handleExportExcel}>
          Exporter Excel
        </Button>
      </Box>

      <Box
        sx={{
          display: "flex",
          gap: 2,
          mb: 3,
          flexWrap: "wrap",
          alignItems: "center",
          background: "grey.50",
          borderRadius: 2,
          p: 2,
          border: "1px solid",
          borderColor: "divider",
        }}
      >
        <ClientAutocomplete clients={clients} value={clientId} onChange={setClientId} allowEmpty sx={{ minWidth: 220 }} />
        <FormControl sx={{ minWidth: 140 }}>
          <InputLabel>Marque</InputLabel>
          <Select label="Marque" value={marque} onChange={(e) => setMarque(e.target.value)}>
            <MenuItem value="">Toutes</MenuItem>
            {MARQUES.map((m) => (
              <MenuItem key={m} value={m}>{m}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl sx={{ minWidth: 140 }}>
          <InputLabel>Gamme</InputLabel>
          <Select label="Gamme" value={gamme} onChange={(e) => setGamme(e.target.value)}>
            <MenuItem value="">Toutes</MenuItem>
            {gammes.map((g) => (
              <MenuItem key={g} value={g}>{g}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>Produit</InputLabel>
          <Select label="Produit" value={productId} onChange={(e) => setProductId(e.target.value)}>
            <MenuItem value="">Tous</MenuItem>
            {products.map((p) => (
              <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl sx={{ minWidth: 150 }}>
          <InputLabel>Animation</InputLabel>
          <Select label="Animation" value={animationFilter} onChange={(e) => setAnimationFilter(e.target.value as any)}>
            <MenuItem value="">Toutes ventes</MenuItem>
            <MenuItem value="true">Animation uniquement</MenuItem>
            <MenuItem value="false">Hors animation uniquement</MenuItem>
          </Select>
        </FormControl>
        <TextField label="Du" type="month" InputLabelProps={{ shrink: true }} value={from} onChange={(e) => setFrom(e.target.value)} />
        <TextField label="Au" type="month" InputLabelProps={{ shrink: true }} value={to} onChange={(e) => setTo(e.target.value)} />
      </Box>

      {loading ? (
        <Box sx={{ textAlign: "center", mt: 10 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, mb: 3, height: 320 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
              Évolution du CA et des unités vendues
            </Typography>
            <ResponsiveContainer width="100%" height="90%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" fontSize={12} />
                <YAxis yAxisId="ca" fontSize={12} />
                <YAxis yAxisId="qte" orientation="right" fontSize={12} />
                <Tooltip />
                <Legend />
                <Line yAxisId="ca" type="monotone" dataKey="ca" name="CA (DT)" stroke="#1B4332" strokeWidth={2} />
                <Line yAxisId="qte" type="monotone" dataKey="qte" name="Unités" stroke="#B08968" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </Paper>

          <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Point de vente</TableCell>
                  <TableCell>Mois</TableCell>
                  <TableCell align="right">Qté</TableCell>
                  <TableCell align="right">CA</TableCell>
                  <TableCell align="right">Points</TableCell>
                  <TableCell align="right">Animation</TableCell>
                  <TableCell align="right">Hors animation</TableCell>
                  <TableCell align="right">Nb animations</TableCell>
                  <TableCell align="right">Évol. CA</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center">
                      <Typography variant="body2" color="text.secondary">Aucune donnée pour ces filtres.</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((r) => (
                    <TableRow key={`${r.client_id}-${r.annee}-${r.mois}`}>
                      <TableCell>{r.client_name}</TableCell>
                      <TableCell>{MOIS_LABELS[r.mois - 1]} {r.annee}</TableCell>
                      <TableCell align="right">{r.qte}</TableCell>
                      <TableCell align="right">{r.ca.toFixed(2)} DT</TableCell>
                      <TableCell align="right">{r.points}</TableCell>
                      <TableCell align="right">{r.qte_animation}</TableCell>
                      <TableCell align="right">{r.qte_hors_animation}</TableCell>
                      <TableCell align="right">{r.nb_animations}</TableCell>
                      <TableCell align="right">
                        {r.evolution_ca_pct != null ? `${r.evolution_ca_pct > 0 ? "+" : ""}${r.evolution_ca_pct}%` : "—"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}
    </Box>
  );
};

export default HistoriqueVentes;
