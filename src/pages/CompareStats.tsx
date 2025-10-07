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
  Slider,
  TextField,
  Grid,
} from "@mui/material";

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

const CompareStats: React.FC = () => {
  const [data, setData] = useState<CompareResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);

  // --- Filtres ---
  const [selectedBrand, setSelectedBrand] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedAvailability, setSelectedAvailability] = useState("all");
  const [priceDiffRange, setPriceDiffRange] = useState<number[]>([-100, 100]);
  const [search, setSearch] = useState("");

  // --- Fetch data ---
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

  // --- Loading state ---
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
            Comparing prices...
          </Typography>
          <Typography variant="body1" color="text.secondary">
            This may take up to a minute ⏳  
            <br />
            Please wait while real-time scraping is in progress.
          </Typography>
          <Box sx={{ width: "60%", mt: 2 }}>
            <LinearProgress
              variant="determinate"
              value={progress}
              sx={{ height: 10, borderRadius: 5 }}
            />
            <Typography variant="caption" color="text.secondary">
              {progress}% completed
            </Typography>
          </Box>
        </Box>
      </Fade>
    );
  }

  if (!data) {
    return (
      <Typography color="error" sx={{ textAlign: "center", mt: 5 }}>
        ❌ Could not load comparison data. Please try again later.
      </Typography>
    );
  }

  // --- Normalize and clean data ---
  const normalizedResults = data.results
    .map((r) => ({
      ...r,
      brand: capitalize(normalizeBrand(r.brand)),
    }))
    .filter((r) => r.brand && r.brand !== "Unknown");

  // --- Brand list unique ---
  const brands = Array.from(
    new Set(normalizedResults.map((r) => normalizeBrand(r.brand)))
  )
    .map((b) => capitalize(b))
    .sort();

  // --- Filtering logic ---
  const filteredResults = normalizedResults.filter((r) => {
    const brandOk =
      selectedBrand === "all" ||
      normalizeBrand(r.brand) === normalizeBrand(selectedBrand);

    const statusOk =
      selectedStatus === "all" || r.status === selectedStatus;

    const diffValue = parseFloat(r.diff_percent || "0");
    const diffOk =
      !isNaN(diffValue) &&
      diffValue >= priceDiffRange[0] &&
      diffValue <= priceDiffRange[1];

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

    return brandOk && statusOk && diffOk && searchOk && availabilityOk;
  });

  // --- Stats summary ---
  const stats = {
    freyaCheaper: filteredResults.filter((r) => r.status === "Freya cheaper").length,
    tmCheaper: filteredResults.filter((r) => r.status === "TM cheaper").length,
    same: filteredResults.filter((r) => r.status === "Same").length,
    onlyFreya: filteredResults.filter((r) => r.status === "Only on Freya").length,
    onlyTM: filteredResults.filter((r) => r.status === "Only on TM").length,
  };

  // --- UI ---
  return (
    <Fade in={!loading}>
      <Box sx={{ padding: 3 }}>
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          📊 Freya vs TunisiaMarka
        </Typography>
        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
          Last updated: {new Date(data.date).toLocaleString()}
        </Typography>

        {/* 🎯 Filters */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {/* Brand */}
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>Brand</InputLabel>
              <Select
                value={selectedBrand}
                label="Brand"
                onChange={(e) => setSelectedBrand(e.target.value)}
              >
                <MenuItem value="all">All Brands</MenuItem>
                {brands.map((b) => (
                  <MenuItem key={b} value={b}>
                    {b}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Availability */}
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>Availability</InputLabel>
              <Select
                value={selectedAvailability}
                label="Availability"
                onChange={(e) => setSelectedAvailability(e.target.value)}
              >
                <MenuItem value="all">All</MenuItem>
                <MenuItem value="in_stock">In Stock (Freya or TM)</MenuItem>
                <MenuItem value="out_of_stock">Out of Stock</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          {/* Status */}
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={selectedStatus}
                label="Status"
                onChange={(e) => setSelectedStatus(e.target.value)}
              >
                <MenuItem value="all">All</MenuItem>
                <MenuItem value="Freya cheaper">Freya cheaper</MenuItem>
                <MenuItem value="TM cheaper">TM cheaper</MenuItem>
                <MenuItem value="Same">Same Price</MenuItem>
                <MenuItem value="Only on Freya">Only on Freya</MenuItem>
                <MenuItem value="Only on TM">Only on TM</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          {/* Search */}
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              label="Search product"
              variant="outlined"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </Grid>

          {/* Price difference */}
          <Grid item xs={12}>
            <Typography variant="body2" gutterBottom>
              💰 Price Difference (%)
            </Typography>
            <Slider
              value={priceDiffRange}
              onChange={(_, newValue) =>
                setPriceDiffRange(newValue as number[])
              }
              valueLabelDisplay="auto"
              min={-100}
              max={100}
            />
          </Grid>
        </Grid>

        {/* 📈 Summary */}
        <Box sx={{ display: "flex", gap: 1.5, mb: 3, flexWrap: "wrap" }}>
          {[
            { label: `Freya cheaper: ${stats.freyaCheaper}`, color: "success" },
            { label: `TM cheaper: ${stats.tmCheaper}`, color: "error" },
            { label: `Same: ${stats.same}`, color: "default" },
            { label: `Only Freya: ${stats.onlyFreya}`, color: "info" },
            { label: `Only TM: ${stats.onlyTM}`, color: "warning" },
            { label: `Total: ${filteredResults.length}`, color: "primary" },
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

        {/* 🧾 Table */}
        <Paper sx={{ overflow: "auto", maxHeight: "70vh" }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Brand</TableCell>
                <TableCell>Product</TableCell>
                <TableCell align="center">TM Price</TableCell>
                <TableCell align="center">Freya Price</TableCell>
                <TableCell align="center">Diff (%)</TableCell>
                <TableCell align="center">Status</TableCell>
                <TableCell align="center">TM Stock</TableCell>
                <TableCell align="center">Freya Stock</TableCell>
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
                      label={r.status}
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
                      label={r.available_tm ? "In Stock" : "Out"}
                      color={r.available_tm ? "success" : "default"}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      label={r.available ? "In Stock" : "Out"}
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