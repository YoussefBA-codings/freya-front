/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from "react";
import axios from "axios";
import {
  Box,
  Typography,
  CircularProgress,
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
  Fade,
  Card,
  CardContent,
  Divider,
  Button,
} from "@mui/material";

interface SoldProduct {
  productId: number | null;
  variantId: number | null;
  title: string;
  variantTitle: string | null;
  sku: string | null;
  vendor: string;
  quantitySold: number;
  b2cQuantitySold: number;
  b2bQuantitySold: number;
}

interface SalesResponse {
  vendor: string;
  startDate: string;
  endDate: string;
  totalProducts: number;
  data: SoldProduct[];
}

const API = import.meta.env.VITE_API_URL;

const FreyaSalesDashboard: React.FC = () => {
  const [vendor, setVendor] = useState("SKIN1004");
  const [startDate, setStartDate] = useState("2026-01-01");
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));
  const [search, setSearch] = useState("");
  const [data, setData] = useState<SalesResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchSales = async () => {
    try {
      setLoading(true);

      const res = await axios.get(`${API}shopify/sales-by-vendor`, {
        params: { vendor, startDate, endDate },
        headers: { "Content-Type": "application/json" },
      });

      setData(res.data);
    } catch (error) {
      console.error("Error fetching sales:", error);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts =
    data?.data.filter((p) =>
      `${p.title} ${p.variantTitle || ""} ${p.sku || ""}`
        .toLowerCase()
        .includes(search.toLowerCase())
    ) || [];

  const totalQuantitySold = filteredProducts.reduce(
    (acc, p) => acc + p.quantitySold,
    0
  );

  const totalB2CQuantitySold = filteredProducts.reduce(
    (acc, p) => acc + (p.b2cQuantitySold || 0),
    0
  );

  const totalB2BQuantitySold = filteredProducts.reduce(
    (acc, p) => acc + (p.b2bQuantitySold || 0),
    0
  );

  const downloadCsv = () => {
    if (!filteredProducts.length) return;

    const headers = [
      "Vendor",
      "Product",
      "Variant",
      "SKU",
      "B2C Quantity Sold",
      "B2B Quantity Sold",
      "Total Quantity Sold",
      "Product ID",
      "Variant ID",
    ];

    const rows = filteredProducts.map((p) => [
      p.vendor,
      p.title,
      p.variantTitle || "",
      p.sku || "",
      p.b2cQuantitySold || 0,
      p.b2bQuantitySold || 0,
      p.quantitySold,
      p.productId || "",
      p.variantId || "",
    ]);

    const csvContent = [headers, ...rows]
      .map((row) =>
        row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(",")
      )
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.setAttribute("download", `sales-${vendor}-${startDate}-${endDate}.csv`);

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <Fade in>
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          Freya — Sales Dashboard
        </Typography>

        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
          Analyse des ventes Shopify par marque
        </Typography>

        <Grid container spacing={2} sx={{ my: 3 }}>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>Marque</InputLabel>
              <Select
                value={vendor}
                label="Marque"
                onChange={(e) => setVendor(e.target.value)}
              >
                <MenuItem value="SKIN1004">SKIN1004</MenuItem>
                <MenuItem value="COSRX">COSRX</MenuItem>
                <MenuItem value="Dr Althea">Dr Althea</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              type="date"
              label="Date début"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>

          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              type="date"
              label="Date fin"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>

          <Grid item xs={12} md={3}>
            <Button
              fullWidth
              variant="contained"
              onClick={fetchSales}
              disabled={loading}
              sx={{ height: "56px" }}
            >
              {loading ? "Chargement..." : "Analyser"}
            </Button>
          </Grid>
        </Grid>

        {loading && (
          <Box sx={{ textAlign: "center", my: 5 }}>
            <CircularProgress />
            <Typography sx={{ mt: 2 }}>
              Récupération des ventes Shopify...
            </Typography>
          </Box>
        )}

        {data && !loading && (
          <>
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} md={3}>
                <Card>
                  <CardContent>
                    <Typography color="text.secondary">Marque</Typography>
                    <Typography variant="h5" fontWeight="bold">
                      {data.vendor}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={3}>
                <Card>
                  <CardContent>
                    <Typography color="text.secondary">
                      Produits vendus
                    </Typography>
                    <Typography variant="h5" fontWeight="bold">
                      {filteredProducts.length}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={2}>
                <Card>
                  <CardContent>
                    <Typography color="text.secondary">B2C</Typography>
                    <Typography variant="h5" fontWeight="bold">
                      {totalB2CQuantitySold}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={2}>
                <Card>
                  <CardContent>
                    <Typography color="text.secondary">B2B</Typography>
                    <Typography variant="h5" fontWeight="bold">
                      {totalB2BQuantitySold}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={2}>
                <Card>
                  <CardContent>
                    <Typography color="text.secondary">Total</Typography>
                    <Typography variant="h5" fontWeight="bold">
                      {totalQuantitySold}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            <Divider sx={{ mb: 2 }} />

            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={12} md={8}>
                <TextField
                  fullWidth
                  label="Recherche produit / SKU"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <Button
                  fullWidth
                  variant="outlined"
                  onClick={downloadCsv}
                  disabled={!filteredProducts.length}
                  sx={{ height: "56px" }}
                >
                  Télécharger CSV
                </Button>
              </Grid>
            </Grid>

            <Paper sx={{ overflow: "auto", maxHeight: "70vh" }}>
              <Table stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>Marque</TableCell>
                    <TableCell>Produit</TableCell>
                    <TableCell>Variante</TableCell>
                    <TableCell>SKU</TableCell>
                    <TableCell align="center">B2C</TableCell>
                    <TableCell align="center">B2B</TableCell>
                    <TableCell align="center">Total</TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {filteredProducts.map((p) => (
                    <TableRow key={`${p.productId}-${p.variantId}`}>
                      <TableCell>{p.vendor}</TableCell>
                      <TableCell>{p.title}</TableCell>
                      <TableCell>{p.variantTitle || "-"}</TableCell>
                      <TableCell>{p.sku || "-"}</TableCell>
                      <TableCell align="center">
                        {p.b2cQuantitySold || 0}
                      </TableCell>
                      <TableCell align="center">
                        {p.b2bQuantitySold || 0}
                      </TableCell>
                      <TableCell align="center" sx={{ fontWeight: "bold" }}>
                        {p.quantitySold}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Paper>
          </>
        )}
      </Box>
    </Fade>
  );
};

export default FreyaSalesDashboard;