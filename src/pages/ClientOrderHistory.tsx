import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  Box,
  Typography,
  CircularProgress,
  TextField,
  Drawer,
  IconButton,
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
  Button,
  Snackbar,
  SnackbarContent,
  Switch,
  FormControlLabel,
  Chip,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { useParams } from "react-router-dom";

/* ======================================================
   🔵 TYPES
====================================================== */

type OrderB2BStatus = "CREATED" | "SHIPPED" | "DELIVERED";
type PaymentMethod = "BANK_TRANSFER" | "CASH" | "CHEQUE" | "";

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

  status: OrderB2BStatus;
  invoice_number?: string | null;
  invoice_date?: string | null;
  invoice_pdf_url?: string | null;

  is_paid: boolean;
  payment_method?: PaymentMethod | null;
  payment_reference?: string | null;
  payment_date?: string | null;

  withholding_enabled: boolean;
  withholding_received: boolean;
  withholding_date?: string | null;

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

  const [selectedOrder, setSelectedOrder] = useState<OrderB2B | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);

  // Snackbar
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [notifyMessage, setNotifyMessage] = useState("");
  const [notifyStatus, setNotifyStatus] = useState<"success" | "error">(
    "success"
  );

  // Editable fields
  const [editStatus, setEditStatus] = useState<OrderB2BStatus>("CREATED");

  const [editIsPaid, setEditIsPaid] = useState<boolean>(false);
  const [editPaymentMethod, setEditPaymentMethod] = useState<PaymentMethod>("");
  const [editPaymentReference, setEditPaymentReference] = useState<string>("");
  const [editPaymentDate, setEditPaymentDate] = useState<string>("");

  const [editWithholdingEnabled, setEditWithholdingEnabled] =
    useState<boolean>(false);
  const [editWithholdingReceived, setEditWithholdingReceived] =
    useState<boolean>(false);
  const [editWithholdingDate, setEditWithholdingDate] = useState<string>("");

  /* ======================================================
     🔵 LOAD DATA
  ====================================================== */

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
      setNotifyMessage("Failed to load data.");
      setNotifyStatus("error");
      setSnackbarOpen(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [numericId]);

  /* ======================================================
     🔵 STATUS COLORS
  ====================================================== */

  const getStatusColor = (status: OrderB2BStatus) => {
    switch (status) {
      case "CREATED":
        return "info";
      case "SHIPPED":
        return "warning";
      case "DELIVERED":
        return "success";
      default:
        return "default";
    }
  };

  /* ======================================================
     🔵 FILTERED DATA
  ====================================================== */

  const filteredOrders = useMemo(() => {
    let result = [...orders];

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((o) =>
        o.items.some((item) => item.product.name.toLowerCase().includes(q))
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
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    } else if (sortBy === "oldest") {
      result.sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
    } else if (sortBy === "amount") {
      result.sort((a, b) => Number(b.total_ht) - Number(a.total_ht));
    }

    return result;
  }, [orders, search, sortBy, startDate, endDate]);

  /* ======================================================
     🔵 HANDLERS
  ====================================================== */

  const openOrderDrawer = (order: OrderB2B) => {
    setSelectedOrder(order);

    setEditStatus(order.status);
    setEditIsPaid(order.is_paid);
    setEditPaymentMethod((order.payment_method as PaymentMethod) || "");
    setEditPaymentReference(order.payment_reference || "");
    setEditPaymentDate(order.payment_date?.slice(0, 10) || "");

    setEditWithholdingEnabled(order.withholding_enabled);
    setEditWithholdingReceived(order.withholding_received);
    setEditWithholdingDate(order.withholding_date?.slice(0, 10) || "");
  };

  const closeDrawer = () => {
    setSelectedOrder(null);
  };

  const updateLocalOrder = (updated: OrderB2B) => {
    setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
    setSelectedOrder(updated);
  };

  /* --- Save Status --- */
  const handleSaveStatus = async () => {
    if (!selectedOrder) return;
    try {
      const res = await axios.patch<OrderB2B>(
        `${import.meta.env.VITE_API_URL}order-b2b/${selectedOrder.id}/status`,
        { status: editStatus }
      );

      updateLocalOrder(res.data);
      setNotifyMessage("Status updated.");
      setNotifyStatus("success");
      setSnackbarOpen(true);
    } catch {
      setNotifyMessage("Failed to update status.");
      setNotifyStatus("error");
      setSnackbarOpen(true);
    }
  };

  /* --- Save Payment --- */
  const handleSavePayment = async () => {
    if (!selectedOrder) return;
    try {
      const res = await axios.patch<OrderB2B>(
        `${import.meta.env.VITE_API_URL}order-b2b/${selectedOrder.id}/pay`,
        {
          payment_method: editPaymentMethod || null,
          payment_reference: editPaymentReference || null,
          payment_date: editPaymentDate || null,
        }
      );

      updateLocalOrder(res.data);
      setEditIsPaid(true);
      setNotifyMessage("Payment updated.");
      setNotifyStatus("success");
      setSnackbarOpen(true);
    } catch {
      setNotifyMessage("Failed to update payment.");
      setNotifyStatus("error");
      setSnackbarOpen(true);
    }
  };

  /* --- Save Withholding --- */
  const handleSaveWithholding = async () => {
    if (!selectedOrder) return;

    try {
      const res = await axios.patch<OrderB2B>(
        `${import.meta.env.VITE_API_URL}order-b2b/${
          selectedOrder.id
        }/withholding`,
        {
          withholding_enabled: editWithholdingEnabled,
          withholding_received: editWithholdingReceived,
          withholding_date: editWithholdingDate || null,
        }
      );

      updateLocalOrder(res.data);
      setNotifyMessage("Withholding updated.");
      setNotifyStatus("success");
      setSnackbarOpen(true);
    } catch {
      setNotifyMessage("Failed to update withholding.");
      setNotifyStatus("error");
      setSnackbarOpen(true);
    }
  };

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
      <Typography variant="h4" sx={{ mb: 1, fontWeight: 700 }}>
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
          background: "#fafafa",
          borderRadius: 2,
          p: 2,
          border: "1px solid #eee",
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
            onChange={(e: SelectChangeEvent) => setSortBy(e.target.value)}
          >
            <MenuItem value="newest">Newest first</MenuItem>
            <MenuItem value="oldest">Oldest first</MenuItem>
            <MenuItem value="amount">Highest amount</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* ORDERS TABLE */}
      <TableContainer
        component={Paper}
        sx={{
          borderRadius: 2,
          boxShadow: "0 4px 16px rgba(0,0,0,0.05)",
        }}
      >
        <Table>
          <TableHead>
            <TableRow sx={{ background: "#f6f8fa" }}>
              <TableCell>
                <strong>Invoice #</strong>
              </TableCell>
              <TableCell>
                <strong>Date</strong>
              </TableCell>
              <TableCell>
                <strong>Status</strong>
              </TableCell>
              <TableCell>
                <strong>Total TTC</strong>
              </TableCell>
              <TableCell>
                <strong>Paid</strong>
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
                  "&:hover": { backgroundColor: "#fdfdfd" },
                }}
                onClick={() => openOrderDrawer(order)}
              >
                <TableCell>{order.invoice_number}</TableCell>

                <TableCell>
                  {new Date(order.created_at).toLocaleDateString()}
                </TableCell>

                <TableCell>
                  <Chip
                    label={order.status}
                    color={getStatusColor(order.status)}
                  />
                </TableCell>

                <TableCell>{Number(order.total_ttc).toFixed(2)} DT</TableCell>
                <TableCell>{order.is_paid ? "Yes" : "No"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* DETAILS DRAWER */}
      <Drawer
        anchor="right"
        open={!!selectedOrder}
        onClose={closeDrawer}
        PaperProps={{
          sx: {
            width: 480,
            borderLeft: "1px solid #ddd",
            boxShadow: "-4px 0 18px rgba(0,0,0,0.08)",
          },
        }}
      >
        <Box
          sx={{
            height: "100vh",
            overflowY: "auto",
            p: 3,
            display: "flex",
            flexDirection: "column",
            gap: 3,
          }}
        >
          {/* HEADER */}
          <Box
            sx={{
              position: "sticky",
              top: 0,
              backgroundColor: "white",
              zIndex: 10,
              pb: 2,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              borderBottom: "1px solid #eee",
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Order #{selectedOrder?.id}
            </Typography>

            <IconButton
              onClick={closeDrawer}
              sx={{
                color: "grey.600",
                "&:hover": { backgroundColor: "grey.100", color: "black" },
              }}
            >
              <CloseIcon />
            </IconButton>
          </Box>

          {/* ORDER SUMMARY */}
          {selectedOrder && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
              {/* SUMMARY */}
              <Box
                sx={{
                  background: "#fafafa",
                  p: 2,
                  borderRadius: 2,
                  border: "1px solid #eee",
                }}
              >
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                  Summary
                </Typography>

                <Box sx={{ lineHeight: 1.8 }}>
                  <Typography>
                    <strong>Date:</strong>{" "}
                    {new Date(selectedOrder.created_at).toLocaleDateString()}
                  </Typography>

                  <Typography>
                    <strong>Invoice #:</strong>{" "}
                    {selectedOrder.invoice_number || "N/A"}
                  </Typography>

                  <Typography>
                    <strong>Invoice Date:</strong>{" "}
                    {selectedOrder.invoice_date
                      ? new Date(
                          selectedOrder.invoice_date
                        ).toLocaleDateString()
                      : "N/A"}
                  </Typography>

                  {/* 🔵 NEW — Download Invoice */}
                  {selectedOrder.invoice_pdf_url && (
                    <Box sx={{ mt: 2 }}>
                      <Button
                        variant="contained"
                        color="primary"
                        href={selectedOrder.invoice_pdf_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{
                          textTransform: "none",
                          fontWeight: 600,
                          borderRadius: 2,
                          py: 1,
                          px: 2,
                          boxShadow: "0px 3px 10px rgba(0,0,0,0.1)",
                          display: "flex",
                          alignItems: "center",
                          gap: 1,
                        }}
                      >
                        📄 Télécharger la facture
                      </Button>
                    </Box>
                  )}

                  <Box sx={{ mt: 2 }}>
                    <Typography>
                      <strong>Total HT:</strong>{" "}
                      {Number(selectedOrder.total_ht).toFixed(2)} DT
                    </Typography>
                    <Typography>
                      <strong>Total TTC:</strong>{" "}
                      {Number(selectedOrder.total_ttc).toFixed(2)} DT
                    </Typography>
                  </Box>
                </Box>
              </Box>

              {/* STATUS */}
              <Box
                sx={{
                  background: "#fafafa",
                  p: 2,
                  borderRadius: 2,
                  border: "1px solid #eee",
                }}
              >
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                  Status
                </Typography>

                <Select
                  fullWidth
                  value={editStatus}
                  onChange={(e: SelectChangeEvent<OrderB2BStatus>) =>
                    setEditStatus(e.target.value as OrderB2BStatus)
                  }
                  sx={{ mb: 2 }}
                >
                  <MenuItem value="CREATED">CREATED</MenuItem>
                  <MenuItem value="SHIPPED">SHIPPED</MenuItem>
                  <MenuItem value="DELIVERED">DELIVERED</MenuItem>
                </Select>

                <Button
                  variant="contained"
                  size="small"
                  onClick={handleSaveStatus}
                >
                  Save status
                </Button>
              </Box>

              {/* PAYMENT */}
              <Box
                sx={{
                  background: "#fafafa",
                  p: 2,
                  borderRadius: 2,
                  border: "1px solid #eee",
                }}
              >
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                  Payment
                </Typography>

                <Typography sx={{ mb: 1 }}>
                  Current status:{" "}
                  <strong>{selectedOrder.is_paid ? "Paid" : "Not paid"}</strong>
                </Typography>

                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Payment Method</InputLabel>
                  <Select
                    label="Payment Method"
                    value={editPaymentMethod}
                    onChange={(e: SelectChangeEvent<PaymentMethod>) =>
                      setEditPaymentMethod(e.target.value as PaymentMethod)
                    }
                  >
                    <MenuItem value="">
                      <em>None</em>
                    </MenuItem>
                    <MenuItem value="BANK_TRANSFER">Bank transfer</MenuItem>
                    <MenuItem value="CASH">Cash</MenuItem>
                    <MenuItem value="CHEQUE">Cheque</MenuItem>
                  </Select>
                </FormControl>

                <TextField
                  fullWidth
                  label="Payment Reference"
                  value={editPaymentReference}
                  onChange={(e) => setEditPaymentReference(e.target.value)}
                  sx={{ mb: 2 }}
                />

                <TextField
                  fullWidth
                  label="Payment Date"
                  type="date"
                  InputLabelProps={{ shrink: true }}
                  value={editPaymentDate}
                  onChange={(e) => setEditPaymentDate(e.target.value)}
                  sx={{ mb: 2 }}
                />

                <Button
                  variant="contained"
                  color={editIsPaid ? "success" : "primary"}
                  onClick={handleSavePayment}
                >
                  {selectedOrder.is_paid ? "Update payment" : "Mark as paid"}
                </Button>
              </Box>

              {/* WITHHOLDING */}
              <Box
                sx={{
                  background: "#fafafa",
                  p: 2,
                  borderRadius: 2,
                  border: "1px solid #eee",
                }}
              >
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                  Withholding Tax
                </Typography>

                <FormControlLabel
                  control={
                    <Switch
                      checked={editWithholdingEnabled}
                      onChange={(e) =>
                        setEditWithholdingEnabled(e.target.checked)
                      }
                    />
                  }
                  label="Withholding enabled"
                  sx={{ mb: 1 }}
                />

                <FormControlLabel
                  control={
                    <Switch
                      checked={editWithholdingReceived}
                      onChange={(e) =>
                        setEditWithholdingReceived(e.target.checked)
                      }
                    />
                  }
                  label="Document received"
                  disabled={!editWithholdingEnabled}
                  sx={{ mb: 2 }}
                />

                <TextField
                  fullWidth
                  label="Withholding Date"
                  type="date"
                  InputLabelProps={{ shrink: true }}
                  value={editWithholdingDate}
                  onChange={(e) => setEditWithholdingDate(e.target.value)}
                  disabled={!editWithholdingEnabled}
                  sx={{ mb: 2 }}
                />

                <Button variant="contained" onClick={handleSaveWithholding}>
                  Save withholding
                </Button>
              </Box>

              {/* ITEMS */}
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                  Items
                </Typography>

                {selectedOrder.items.map((item) => (
                  <Box
                    key={item.id}
                    sx={{
                      p: 2,
                      mb: 2,
                      borderRadius: 2,
                      border: "1px solid #eee",
                      background: "white",
                      boxShadow: "0px 2px 5px rgba(0,0,0,0.03)",
                    }}
                  >
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                      {item.product.name}
                    </Typography>
                    <Typography>Qty: {item.quantity}</Typography>
                    <Typography>
                      Line HT: {Number(item.total_line_ht).toFixed(2)} DT
                    </Typography>
                    <Typography>
                      Line TTC: {Number(item.total_line_ttc).toFixed(2)} DT
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Box>
          )}
        </Box>
      </Drawer>

      {/* SNACKBAR */}
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
