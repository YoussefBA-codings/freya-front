import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  Box,
  Typography,
  CircularProgress,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  SelectChangeEvent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Snackbar,
  SnackbarContent,
  Chip,
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { useParams } from "react-router-dom";
import OrderB2BDetailDrawer, {
  OrderB2BDetail,
  getOrderStatusColor,
  getOrderStatusLabel,
} from "../elements/OrderB2BDetailDrawer";

/* ======================================================
   🔵 TYPES
====================================================== */

interface ClientB2B {
  id: number;
  name: string;
  responsable_name?: string | null;
}

/* ======================================================
   🔵 COMPONENT
====================================================== */

const ClientOrderHistory: React.FC = () => {
  const { clientId } = useParams();
  const numericId = Number(clientId);

  const [client, setClient] = useState<ClientB2B | null>(null);
  const [orders, setOrders] = useState<OrderB2BDetail[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedOrder, setSelectedOrder] = useState<OrderB2BDetail | null>(null);

  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);

  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [notifyMessage, setNotifyMessage] = useState("");
  const [notifyStatus, setNotifyStatus] = useState<"success" | "error">(
    "success",
  );

  const notify = (message: string, status: "success" | "error") => {
    setNotifyMessage(message);
    setNotifyStatus(status);
    setSnackbarOpen(true);
  };

  const loadData = async () => {
    try {
      setLoading(true);

      const clientRes = await axios.get<ClientB2B>(
        `${import.meta.env.VITE_API_URL}client-b2b/${numericId}`,
      );

      const ordersRes = await axios.get<OrderB2BDetail[]>(
        `${import.meta.env.VITE_API_URL}order-b2b/client/${numericId}`,
      );

      setClient(clientRes.data);
      setOrders(ordersRes.data);
    } catch (error) {
      console.error("Failed to load:", error);
      notify("Échec du chargement des données.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [numericId]);

  const filteredOrders = useMemo(() => {
    let result = [...orders];

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((o) =>
        o.items.some((item) => item.product.name.toLowerCase().includes(q)),
      );
    }

    if (startDate) {
      result = result.filter((o) => new Date(o.created_at) >= startDate);
    }

    if (endDate) {
      result = result.filter((o) => new Date(o.created_at) <= endDate);
    }

    if (sortBy === "newest") {
      result.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
    } else if (sortBy === "oldest") {
      result.sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      );
    } else if (sortBy === "amount") {
      result.sort((a, b) => Number(b.total_ht) - Number(a.total_ht));
    }

    return result;
  }, [orders, search, sortBy, startDate, endDate]);

  const handleOrderUpdated = (updated: OrderB2BDetail) => {
    setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
    setSelectedOrder(updated);
  };

  const handleOrderCancelled = (orderId: number) => {
    setOrders((prev) => prev.filter((o) => o.id !== orderId));
    setSelectedOrder(null);
  };

  if (loading) {
    return (
      <Box sx={{ textAlign: "center", mt: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!client) {
    return (
      <Typography variant="h5" color="error">
        Client introuvable.
      </Typography>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 1, fontWeight: 700 }}>
        Historique des commandes B2B
      </Typography>

      <Typography variant="subtitle1" sx={{ mb: 4 }}>
        Client: <strong>{client.name}</strong>
      </Typography>

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
        <TextField
          label="Rechercher un produit"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ minWidth: 250 }}
        />

        <DatePicker
          label="Date de début"
          value={startDate}
          onChange={(v) => setStartDate(v)}
        />

        <DatePicker
          label="Date de fin"
          value={endDate}
          onChange={(v) => setEndDate(v)}
        />

        <FormControl sx={{ minWidth: 160 }}>
          <InputLabel>Trier par</InputLabel>
          <Select
            label="Trier par"
            value={sortBy}
            onChange={(e: SelectChangeEvent) => setSortBy(e.target.value)}
          >
            <MenuItem value="newest">Plus récent</MenuItem>
            <MenuItem value="oldest">Plus ancien</MenuItem>
            <MenuItem value="amount">Montant le plus élevé</MenuItem>
          </Select>
        </FormControl>
      </Box>

      <TableContainer
        component={Paper}
        variant="outlined"
        sx={{ borderRadius: 2 }}
      >
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>
                <strong>N° facture</strong>
              </TableCell>
              <TableCell>
                <strong>Date</strong>
              </TableCell>
              <TableCell>
                <strong>Statut</strong>
              </TableCell>
              <TableCell>
                <strong>Total TTC</strong>
              </TableCell>
              <TableCell>
                <strong>Payé</strong>
              </TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {filteredOrders.map((order) => (
              <TableRow
                key={order.id}
                hover
                sx={{
                  cursor: "pointer",
                  "&:hover": { backgroundColor: "grey.50" },
                }}
                onClick={() => setSelectedOrder(order)}
              >
                <TableCell>{order.invoice_number}</TableCell>
                <TableCell>
                  {new Date(order.created_at).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <Chip
                    label={getOrderStatusLabel(order.status)}
                    color={getOrderStatusColor(order.status)}
                  />
                </TableCell>
                <TableCell>{Number(order.total_ttc).toFixed(2)} DT</TableCell>
                <TableCell>{order.is_paid ? "Oui" : "Non"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <OrderB2BDetailDrawer
        order={selectedOrder}
        onClose={() => setSelectedOrder(null)}
        onUpdated={handleOrderUpdated}
        onCancelled={handleOrderCancelled}
        onNotify={notify}
      />

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={() => setSnackbarOpen(false)}
      >
        <SnackbarContent
          message={notifyMessage}
          sx={{
            backgroundColor: notifyStatus === "error" ? "red" : "green",
          }}
        />
      </Snackbar>
    </Box>
  );
};

export default ClientOrderHistory;
