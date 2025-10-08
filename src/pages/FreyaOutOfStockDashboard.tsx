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
  TextField,
  Grid,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Chip,
  Fade,
  Card,
  CardContent,
  Divider,
} from "@mui/material";

interface OutOfStockProduct {
  title: string;
  vendor: string;
  daysOutOfStock: number;
}

interface OutOfStockResponse {
  _id: string;
  date: string;
  total: number;
  products: OutOfStockProduct[];
}

const getSeverity = (days: number): { label: string; color: "success" | "warning" | "error" } => {
  if (days < 15) return { label: "Low", color: "success" };
  if (days < 30) return { label: "Medium", color: "warning" };
  return { label: "Critical", color: "error" };
};

const FreyaOutOfStockDashboard: React.FC = () => {
  const [data, setData] = useState<OutOfStockResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [selectedBrand, setSelectedBrand] = useState<string>("all");
  const [criticality, setCriticality] = useState<string>("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    let interval: NodeJS.Timeout;
    // eslint-disable-next-line prefer-const
    interval = setInterval(() => {
      setProgress((old) => (old >= 90 ? 90 : old + 1));
    }, 500);

    const fetchData = async () => {
      try {
        const res = await axios.get("http://localhost:4001/freya-stock");
        setData(res.data);
      } catch (error) {
        console.error("Error fetching /freya-stock:", error);
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
            Loading Freya Out-of-Stock Report
          </Typography>
          <Box sx={{ width: "50%", mt: 2 }}>
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
        Could not load Freya stock data.
      </Typography>
    );
  }

  // --- Prepare data
  const brands = Array.from(new Set(data.products.map((p) => p.vendor))).sort();

  const filteredProducts = data.products.filter((p) => {
    const brandOk = selectedBrand === "all" || p.vendor === selectedBrand;
    const searchOk = p.title.toLowerCase().includes(search.toLowerCase());
    const severity = getSeverity(p.daysOutOfStock);
    const critOk =
      criticality === "all" ||
      (criticality === "low" && severity.label === "Low") ||
      (criticality === "medium" && severity.label === "Medium") ||
      (criticality === "critical" && severity.label === "Critical");

    return brandOk && searchOk && critOk;
  });

  // --- KPIs
  const avgDays =
    filteredProducts.reduce((acc, p) => acc + p.daysOutOfStock, 0) /
      (filteredProducts.length || 1);

  const criticalCount = filteredProducts.filter(
    (p) => p.daysOutOfStock >= 45
  ).length;

  const mediumCount = filteredProducts.filter(
    (p) => p.daysOutOfStock >= 30 && p.daysOutOfStock < 45
  ).length;

  const lowCount = filteredProducts.filter(
    (p) => p.daysOutOfStock < 30
  ).length;

  const kpis = [
    {
      label: "Total Out-of-Stock Products",
      value: data.total.toString(),
    },
    {
      label: "Average Days Out of Stock",
      value: avgDays.toFixed(1),
    },
    {
      label: "Critical (>45 days)",
      value: criticalCount.toString(),
    },
    {
      label: "Medium (30–45 days)",
      value: mediumCount.toString(),
    },
    {
      label: "Low (<30 days)",
      value: lowCount.toString(),
    },
  ];

  return (
    <Fade in={!loading}>
      <Box sx={{ padding: 3 }}>
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          Freya — Out-of-Stock Monitoring
        </Typography>
        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
          Last updated: {new Date(data.date).toLocaleString()}
        </Typography>

        {/* Filters */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
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

          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>Criticality</InputLabel>
              <Select
                value={criticality}
                label="Criticality"
                onChange={(e) => setCriticality(e.target.value)}
              >
                <MenuItem value="all">All Levels</MenuItem>
                <MenuItem value="low">Low (&lt;15 days)</MenuItem>
                <MenuItem value="medium">Medium (15–45 days)</MenuItem>
                <MenuItem value="critical">Critical (&gt;45 days)</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Search Product"
              variant="outlined"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </Grid>
        </Grid>

        {/* KPI Cards */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {kpis.map((kpi, index) => (
            <Grid item xs={12} sm={6} md={2.4} key={index}>
              <Card
                elevation={1}
                sx={{
                  borderRadius: 2,
                  height: 120,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  textAlign: "center",
                }}
              >
                <CardContent>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    gutterBottom
                  >
                    {kpi.label}
                  </Typography>
                  <Typography
                    variant="h6"
                    fontWeight="bold"
                    sx={{ color: "#1A1A1A" }}
                  >
                    {kpi.value}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        <Divider sx={{ mb: 2 }} />

        {/* Table */}
        <Paper sx={{ overflow: "auto", maxHeight: "70vh" }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Brand</TableCell>
                <TableCell>Product</TableCell>
                <TableCell align="center">Days Out of Stock</TableCell>
                <TableCell align="center">Criticality</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredProducts.map((p, idx) => {
                const severity = getSeverity(p.daysOutOfStock);
                return (
                  <TableRow key={idx}>
                    <TableCell>{p.vendor}</TableCell>
                    <TableCell>{p.title}</TableCell>
                    <TableCell align="center">
                      {p.daysOutOfStock}
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={severity.label}
                        color={severity.color}
                        size="small"
                        sx={{
                          fontWeight: 600,
                          borderRadius: "6px",
                        }}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Paper>
      </Box>
    </Fade>
  );
};

export default FreyaOutOfStockDashboard;