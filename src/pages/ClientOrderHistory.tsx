import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  Box,
  Typography,
  CircularProgress,
  TextField,
  Drawer,
  IconButton,
  Divider,
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
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { useParams } from "react-router-dom";

/* ======================================================
   🔵 TYPES
====================================================== */

interface ClientB2B {
  id: number;
  name: string;
  responsable_name?: string | null;
}

interface OrderItemB2B {
  id: number;
  product_id: number;
  quantity: number;
  unit_price_ht: string;
  tva_rate: string;
  total_line_ht: string;
  total_line_ttc: string;
  product: {
    name: string;
  };
}

interface OrderB2B {
  id: number;
  client_id: number;
  total_ht: string;
  total_ttc: string;
  created_at: string;
  items: OrderItemB2B[];
}

/* ======================================================
   🔵 COMPONENT
====================================================== */

const ClientOrderHistory: React.FC = () => {
  const { clientId } = useParams();
  const numericId = Number(clientId);

  const [client, setClient] = useState<ClientB2B | null>(null);
  const [orders, setOrders] = useState<OrderB2B[]>([]);
  const [loading, setLoading] = useState(true);

  // UI state
  const [selectedOrder, setSelectedOrder] = useState<OrderB2B | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);

  /* ======================================================
     🔵 LOAD DATA
  ====================================================== */

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);

        const clientRes = await axios.get<ClientB2B>(
          `${import.meta.env.VITE_API_URL}client-b2b/${numericId}`
        );

        const ordersRes = await axios.get<OrderB2B[]>(
          `${import.meta.env.VITE_API_URL}order-b2b/client/${numericId}`
        );

        setClient(clientRes.data);
        setOrders(ordersRes.data);
      } catch (error) {
        console.error("Failed to load:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [numericId]);

  /* ======================================================
     🔵 FILTERED DATA (search + date + sort)
  ====================================================== */

  const filteredOrders = useMemo(() => {
    let result = [...orders];

    // 1. Search by product name
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((o) =>
        o.items.some((item) =>
          item.product.name.toLowerCase().includes(q)
        )
      );
    }

    // 2. Date range filter
    if (startDate) {
      result = result.filter(
        (o) => new Date(o.created_at) >= startDate
      );
    }
    if (endDate) {
      result = result.filter(
        (o) => new Date(o.created_at) <= endDate
      );
    }

    // 3. Sorting
    if (sortBy === "newest") {
      result.sort(
        (a, b) =>
          new Date(b.created_at).getTime() -
          new Date(a.created_at).getTime()
      );
    } else if (sortBy === "oldest") {
      result.sort(
        (a, b) =>
          new Date(a.created_at).getTime() -
          new Date(b.created_at).getTime()
      );
    } else if (sortBy === "amount") {
      result.sort(
        (a, b) =>
          Number(b.total_ht) - Number(a.total_ht)
      );
    }

    return result;
  }, [orders, search, sortBy, startDate, endDate]);

  /* ======================================================
     🔵 RENDER
  ====================================================== */

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
        Client not found.
      </Typography>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* HEADER */}
      <Typography variant="h4" sx={{ mb: 1 }}>
        B2B Orders History
      </Typography>
      <Typography variant="subtitle1" sx={{ mb: 4 }}>
        Client: <strong>{client.name}</strong>
      </Typography>

      {/* FILTER BAR */}
      <Box
        sx={{
          display: "flex",
          gap: 2,
          mb: 3,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <TextField
          label="Search product"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ minWidth: 250 }}
        />

        <DatePicker
          label="Start date"
          value={startDate}
          onChange={(v) => setStartDate(v)}
        />

        <DatePicker
          label="End date"
          value={endDate}
          onChange={(v) => setEndDate(v)}
        />

        <FormControl sx={{ minWidth: 160 }}>
          <InputLabel>Sort by</InputLabel>
          <Select
            label="Sort by"
            value={sortBy}
            onChange={(e: SelectChangeEvent) =>
              setSortBy(e.target.value)
            }
          >
            <MenuItem value="newest">Newest first</MenuItem>
            <MenuItem value="oldest">Oldest first</MenuItem>
            <MenuItem value="amount">Highest amount</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* ORDERS TABLE */}
      <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell><strong>ID</strong></TableCell>
              <TableCell><strong>Date</strong></TableCell>
              <TableCell><strong>Items</strong></TableCell>
              <TableCell><strong>Total HT</strong></TableCell>
              <TableCell><strong>Total TTC</strong></TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {filteredOrders.map((order) => (
              <TableRow
                key={order.id}
                hover
                sx={{ cursor: "pointer" }}
                onClick={() => setSelectedOrder(order)}
              >
                <TableCell>{order.id}</TableCell>
                <TableCell>
                  {new Date(order.created_at).toLocaleDateString()}
                </TableCell>
                <TableCell>{order.items.length}</TableCell>
                <TableCell>{Number(order.total_ht).toFixed(2)} DT</TableCell>
                <TableCell>{Number(order.total_ttc).toFixed(2)} DT</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* DETAILS DRAWER */}
      <Drawer
        anchor="right"
        open={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
      >
        <Box sx={{ width: 450, p: 3 }}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            <Typography variant="h6">
              Order #{selectedOrder?.id}
            </Typography>
            <IconButton onClick={() => setSelectedOrder(null)}>
              <CloseIcon />
            </IconButton>
          </Box>

          <Divider sx={{ my: 2 }} />

          {selectedOrder && (
            <Box>
              <Typography sx={{ mb: 2 }}>
                <strong>Date:</strong>{" "}
                {new Date(selectedOrder.created_at).toLocaleDateString()}
              </Typography>

              <Typography sx={{ mb: 2 }}>
                <strong>Total HT:</strong>{" "}
                {Number(selectedOrder.total_ht).toFixed(2)} DT
              </Typography>

              <Typography sx={{ mb: 2 }}>
                <strong>Total TTC:</strong>{" "}
                {Number(selectedOrder.total_ttc).toFixed(2)} DT
              </Typography>

              <Divider sx={{ my: 2 }} />

              <Typography variant="h6" sx={{ mb: 2 }}>
                Items
              </Typography>

              {selectedOrder.items.map((item) => (
                <Box key={item.id} sx={{ mb: 2 }}>
                  <Typography variant="subtitle1">
                    {item.product.name}
                  </Typography>
                  <Typography>
                    Qty: {item.quantity}
                  </Typography>
                  <Typography>
                    Line HT: {item.total_line_ht} DT
                  </Typography>
                  <Typography>
                    Line TTC: {item.total_line_ttc} DT
                  </Typography>

                  <Divider sx={{ my: 1 }} />
                </Box>
              ))}
            </Box>
          )}
        </Box>
      </Drawer>
    </Box>
  );
};

export default ClientOrderHistory;