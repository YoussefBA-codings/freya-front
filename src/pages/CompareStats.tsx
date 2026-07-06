/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  Box,
  Typography,
  CircularProgress,
  LinearProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Paper,
  Chip,
  Fade,
  TextField,
  Grid,
  Divider,
  Card,
  CardContent,
  Tooltip,
  IconButton,
} from "@mui/material";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";

interface ProductCompare {
  brand: string;
  product_name: string;
  price_tm: number | null;
  available_tm: boolean;
  price_freya: number | null;
  price_freya_before_promo: number | null;
  diff_percent: string | null;
  status: string;
  sold_by_freya: boolean;
  available: boolean;
}

interface CompareResponse {
  date: string;
  total: number;
  results: ProductCompare[];
}

declare global {
  interface Window {
    _compareCache?: any;
  }
}

const normalizeBrand = (brand: string): string =>
  brand ? brand.trim().toLowerCase() : "";

const capitalize = (s: string): string =>
  s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : "";

// Display labels for raw status values coming from the API (values kept as-is for filtering).
const statusLabels: Record<string, string> = {
  "Freya cheaper": "Freya moins cher",
  "TM cheaper": "TM moins cher",
  Same: "Même prix",
  "Only on Freya": "Uniquement sur Freya",
  "Only on TM": "Uniquement sur TM",
};

const translateStatus = (status: string): string =>
  statusLabels[status] || status;

const CompareStats: React.FC = () => {
  const [data, setData] = useState<CompareResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);

  // Filters
  const [selectedBrand, setSelectedBrand] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedAvailability, setSelectedAvailability] = useState("all");
  const [search, setSearch] = useState("");

  // Fetch data
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (window._compareCache) {
      setData(window._compareCache);
      setLoading(false);
      return;
    }

    // eslint-disable-next-line prefer-const
    interval = setInterval(() => {
      setProgress((old) => (old >= 90 ? 90 : old + 1));
    }, 500);

    const fetchData = async () => {
      try {
        const res = await axios.get("http://localhost:4001/compare", {
          timeout: 180000,
        });
        setData(res.data);
        window._compareCache = res.data;
      } catch (err) {
        console.error("Error fetching /compare:", err);
      } finally {
        clearInterval(interval);
        setProgress(100);
        setLoading(false);
      }
    };

    fetchData();
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <Fade in>
        <Box
          sx={{
            textAlign: "center",
            mt: 8,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 3,
          }}
        >
          <CircularProgress size={70} thickness={4} />
          <Typography variant="h5" fontWeight="bold">
            Comparaison des données...
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Cela peut prendre jusqu'à une minute.
          </Typography>
          <Box sx={{ width: "50%", mt: 2 }}>
            <LinearProgress
              variant="determinate"
              value={progress}
              sx={{ height: 10, borderRadius: 5 }}
            />
            <Typography variant="caption" color="text.secondary">
              {progress}% terminé
            </Typography>
          </Box>
        </Box>
      </Fade>
    );
  }

  if (!data) {
    return (
      <Typography color="error" sx={{ textAlign: "center", mt: 5 }}>
        Impossible de charger les données de comparaison.
      </Typography>
    );
  }

  // Normalize
  const normalizedResults = data.results
    .map((r) => ({
      ...r,
      brand: capitalize(normalizeBrand(r.brand)),
    }))
    .filter((r) => r.brand && r.brand !== "Unknown");

  // Brands
  const brands = Array.from(
    new Set(normalizedResults.map((r) => normalizeBrand(r.brand)))
  )
    .map((b) => capitalize(b))
    .sort();

  // Filtering
  const filteredResults = normalizedResults.filter((r) => {
    const brandOk =
      selectedBrand === "all" ||
      normalizeBrand(r.brand) === normalizeBrand(selectedBrand);
    const statusOk =
      selectedStatus === "all" || r.status === selectedStatus;
    const searchOk = r.product_name
      .toLowerCase()
      .includes(search.toLowerCase());
    const availabilityOk =
      selectedAvailability === "all" ||
      (selectedAvailability === "in_stock" &&
        (r.available || r.available_tm)) ||
      (selectedAvailability === "out_of_stock" &&
        !r.available &&
        !r.available_tm);

    return brandOk && statusOk && searchOk && availabilityOk;
  });

  // Stats
  const stats = {
    freyaCheaper: filteredResults.filter((r) => r.status === "Freya cheaper").length,
    tmCheaper: filteredResults.filter((r) => r.status === "TM cheaper").length,
    same: filteredResults.filter((r) => r.status === "Same").length,
    onlyFreya: filteredResults.filter((r) => r.status === "Only on Freya").length,
    onlyTM: filteredResults.filter((r) => r.status === "Only on TM").length,
  };

  // Price analytics
  const validDiffs = filteredResults
    .map((r) => parseFloat(r.diff_percent || "0"))
    .filter((v) => !isNaN(v));

  const avgDiff =
    validDiffs.length > 0
      ? validDiffs.reduce((a, b) => a + b, 0) / validDiffs.length
      : 0;

  const avgFreyaPrice =
    filteredResults
      .filter((r) => r.price_freya)
      .reduce((acc, r) => acc + (r.price_freya || 0), 0) /
    (filteredResults.filter((r) => r.price_freya).length || 1);

  const avgTMPrice =
    filteredResults
      .filter((r) => r.price_tm)
      .reduce((acc, r) => acc + (r.price_tm || 0), 0) /
    (filteredResults.filter((r) => r.price_tm).length || 1);

  const totalDiffDT = filteredResults.reduce((acc, r) => {
    if (r.price_freya && r.price_tm) {
      return acc + (r.price_freya - r.price_tm);
    }
    return acc;
  }, 0);

  const ratioFreyaCheaper =
    stats.freyaCheaper / (stats.freyaCheaper + stats.tmCheaper) || 0;

  const kpis = [
    {
      label: "Prix moyen Freya",
      value: `${avgFreyaPrice.toFixed(2)} DT`,
      tooltip: "Prix de vente moyen des produits listés sur Freya.",
    },
    {
      label: "Prix moyen TM",
      value: `${avgTMPrice.toFixed(2)} DT`,
      tooltip: "Prix de vente moyen des mêmes produits sur TunisiaMarka.",
    },
    {
      label: "Différence de prix moyenne",
      value: `${avgDiff.toFixed(2)} %`,
      tooltip: "Différence moyenne en pourcentage entre les prix Freya et TM.",
    },
    {
      label: "Écart de prix global",
      value: `${totalDiffDT.toFixed(2)} DT`,
      tooltip: "Différence de prix cumulée totale sur les articles comparables.",
    },
    {
      label: "Taux d'avantage Freya",
      value: `${(ratioFreyaCheaper * 100).toFixed(1)} %`,
      tooltip: "Pourcentage de produits pour lesquels Freya est moins cher que TM.",
    },
  ];

  // UI
  return (
    <Fade in={!loading}>
      <Box sx={{ padding: 3 }}>
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          Freya vs TunisiaMarka — Tableau de comparaison des prix
        </Typography>
        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
          Dernière mise à jour : {new Date(data.date).toLocaleString()}
        </Typography>

        {/* Filters */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>Marque</InputLabel>
              <Select
                value={selectedBrand}
                label="Marque"
                onChange={(e) => setSelectedBrand(e.target.value)}
              >
                <MenuItem value="all">Toutes les marques</MenuItem>
                {brands.map((b) => (
                  <MenuItem key={b} value={b}>
                    {b}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>Disponibilité</InputLabel>
              <Select
                value={selectedAvailability}
                label="Disponibilité"
                onChange={(e) => setSelectedAvailability(e.target.value)}
              >
                <MenuItem value="all">Toutes</MenuItem>
                <MenuItem value="in_stock">En stock</MenuItem>
                <MenuItem value="out_of_stock">Rupture de stock</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>Statut</InputLabel>
              <Select
                value={selectedStatus}
                label="Statut"
                onChange={(e) => setSelectedStatus(e.target.value)}
              >
                <MenuItem value="all">Tous</MenuItem>
                <MenuItem value="Freya cheaper">Freya moins cher</MenuItem>
                <MenuItem value="TM cheaper">TM moins cher</MenuItem>
                <MenuItem value="Same">Même prix</MenuItem>
                <MenuItem value="Only on Freya">Uniquement sur Freya</MenuItem>
                <MenuItem value="Only on TM">Uniquement sur TM</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              label="Rechercher un produit"
              variant="outlined"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </Grid>
        </Grid>

        {/* KPI Cards */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {kpis.map((item, i) => (
            <Grid item xs={12} sm={6} md={2.4} key={i}>
              <Card
                elevation={1}
                sx={{
                  borderRadius: 2,
                  height: 120, // fixed equal height for all cards
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}
              >
                <CardContent sx={{ height: "100%" }}>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      gutterBottom
                    >
                      {item.label}
                    </Typography>
                    <Tooltip title={item.tooltip} arrow>
                      <IconButton size="small">
                        <InfoOutlinedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                  <Typography
                    variant="h6"
                    fontWeight="bold"
                    sx={{ color: "#1A1A1A", mt: 1 }}
                  >
                    {item.value}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        <Divider sx={{ mb: 2 }} />

        {/* Summary */}
        <Box sx={{ display: "flex", gap: 1.5, mb: 3, flexWrap: "wrap" }}>
          {[
            { label: `Freya moins cher : ${stats.freyaCheaper}`, color: "success" },
            { label: `TM moins cher : ${stats.tmCheaper}`, color: "error" },
            { label: `Même prix : ${stats.same}`, color: "default" },
            { label: `Uniquement Freya : ${stats.onlyFreya}`, color: "info" },
            { label: `Uniquement TM : ${stats.onlyTM}`, color: "warning" },
            { label: `Total : ${filteredResults.length}`, color: "primary" },
          ].map((chip, i) => (
            <Chip
              key={i}
              label={chip.label}
              color={chip.color as any}
              sx={{
                fontWeight: "bold",
                height: 32,
                borderRadius: "8px",
              }}
            />
          ))}
        </Box>

        {/* Table */}
        <Paper sx={{ overflow: "auto", maxHeight: "70vh" }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Marque</TableCell>
                <TableCell>Produit</TableCell>
                <TableCell align="center">Prix TM</TableCell>
                <TableCell align="center">Prix Freya</TableCell>
                <TableCell align="center">Écart (%)</TableCell>
                <TableCell align="center">Statut</TableCell>
                <TableCell align="center">Stock TM</TableCell>
                <TableCell align="center">Stock Freya</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredResults.map((r, idx) => (
                <TableRow key={idx}>
                  <TableCell>{r.brand}</TableCell>
                  <TableCell>{r.product_name}</TableCell>
                  <TableCell align="center">{r.price_tm ?? "-"}</TableCell>
                  <TableCell align="center">{r.price_freya ?? "-"}</TableCell>
                  <TableCell align="center">{r.diff_percent ?? "-"}</TableCell>
                  <TableCell align="center">
                    <Chip
                      label={translateStatus(r.status)}
                      color={
                        r.status === "Freya cheaper"
                          ? "success"
                          : r.status === "TM cheaper"
                          ? "error"
                          : r.status === "Only on Freya"
                          ? "info"
                          : r.status === "Only on TM"
                          ? "warning"
                          : "default"
                      }
                      sx={{ fontSize: "0.8rem", fontWeight: 500 }}
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      label={r.available_tm ? "En stock" : "Rupture"}
                      color={r.available_tm ? "success" : "default"}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      label={r.available ? "En stock" : "Rupture"}
                      color={r.available ? "success" : "default"}
                      size="small"
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      </Box>
    </Fade>
  );
};

export default CompareStats;