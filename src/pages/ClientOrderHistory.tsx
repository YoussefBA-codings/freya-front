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
  Tooltip,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { useParams } from "react-router-dom";
import { isWithholdingExempt, WITHHOLDING_THRESHOLD_TTC } from "./utils/withholding";

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
  shopify_order_id?: string | null;

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

const SummaryField: React.FC<{ label: string; value: React.ReactNode }> = ({
  label,
  value,
}) => (
  <Box>
    <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
      {label}
    </Typography>
    <Typography variant="body2" sx={{ fontWeight: 600 }}>
      {value}
    </Typography>
  </Box>
);

/* ======================================================
   🔵 COMPONENT
====================================================== */

const ClientOrderHistory: React.FC = () => {
  const { clientId } = useParams();
  const numericId = Number(clientId);

  const [client, setClient] = useState<ClientB2B | null>(null);
  const [orders, setOrders] = useState<OrderB2B[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  const [selectedOrder, setSelectedOrder] = useState<OrderB2B | null>(null);

  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);

  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [notifyMessage, setNotifyMessage] = useState("");
  const [notifyStatus, setNotifyStatus] = useState<"success" | "error">(
    "success",
  );

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

  const loadData = async () => {
    try {
      setLoading(true);

      const clientRes = await axios.get<ClientB2B>(
        `${import.meta.env.VITE_API_URL}client-b2b/${numericId}`,
      );

      const ordersRes = await axios.get<OrderB2B[]>(
        `${import.meta.env.VITE_API_URL}order-b2b/client/${numericId}`,
      );

      setClient(clientRes.data);
      setOrders(ordersRes.data);
    } catch (error) {
      console.error("Failed to load:", error);
      setNotifyMessage("Échec du chargement des données.");
      setNotifyStatus("error");
      setSnackbarOpen(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [numericId]);

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

  const getStatusLabel = (status: OrderB2BStatus) => {
    switch (status) {
      case "CREATED":
        return "Créée";
      case "SHIPPED":
        return "Expédiée";
      case "DELIVERED":
        return "Livrée";
      default:
        return status;
    }
  };

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

  const openOrderDrawer = (order: OrderB2B) => {
    setSelectedOrder(order);

    setEditStatus(order.status);
    setEditIsPaid(order.is_paid);
    setEditPaymentMethod((order.payment_method as PaymentMethod) || "");
    setEditPaymentReference(order.payment_reference || "");
    setEditPaymentDate(order.payment_date?.slice(0, 10) || "");

    const exempt = isWithholdingExempt(Number(order.total_ttc));
    setEditWithholdingEnabled(exempt ? false : order.withholding_enabled);
    setEditWithholdingReceived(exempt ? false : order.withholding_received);
    setEditWithholdingDate(exempt ? "" : order.withholding_date?.slice(0, 10) || "");
  };

  const closeDrawer = () => {
    setSelectedOrder(null);
  };

  const updateLocalOrder = (updated: OrderB2B) => {
    setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
    setSelectedOrder(updated);
  };

  const handleDeleteOrder = async () => {
    if (!selectedOrder) return;

    const confirmed = window.confirm(
      `Confirmer l’annulation de la commande #${selectedOrder.id} ?\n\nLe stock sera restauré automatiquement sur Shopify.`,
    );

    if (!confirmed) return;

    try {
      setDeleting(true);

      await axios.delete(
        `${import.meta.env.VITE_API_URL}order-b2b/${selectedOrder.id}/cancel`,
      );

      setOrders((prev) => prev.filter((o) => o.id !== selectedOrder.id));
      setSelectedOrder(null);

      setNotifyMessage("Commande annulée et stock restauré.");
      setNotifyStatus("success");
      setSnackbarOpen(true);
    } catch (error) {
      console.error("Failed to cancel order:", error);
      setNotifyMessage("Erreur lors de l’annulation de la commande.");
      setNotifyStatus("error");
      setSnackbarOpen(true);
    } finally {
      setDeleting(false);
    }
  };

  const handleSaveStatus = async () => {
    if (!selectedOrder) return;

    try {
      const res = await axios.patch<OrderB2B>(
        `${import.meta.env.VITE_API_URL}order-b2b/${selectedOrder.id}/status`,
        { status: editStatus },
      );

      updateLocalOrder(res.data);
      setNotifyMessage("Statut mis à jour.");
      setNotifyStatus("success");
      setSnackbarOpen(true);
    } catch {
      setNotifyMessage("Échec de la mise à jour du statut.");
      setNotifyStatus("error");
      setSnackbarOpen(true);
    }
  };

  const handleSavePayment = async () => {
    if (!selectedOrder) return;

    try {
      const res = await axios.patch<OrderB2B>(
        `${import.meta.env.VITE_API_URL}order-b2b/${selectedOrder.id}/pay`,
        {
          payment_method: editPaymentMethod || null,
          payment_reference: editPaymentReference || null,
          payment_date: editPaymentDate || null,
        },
      );

      updateLocalOrder(res.data);
      setEditIsPaid(true);
      setNotifyMessage("Paiement mis à jour.");
      setNotifyStatus("success");
      setSnackbarOpen(true);
    } catch {
      setNotifyMessage("Échec de la mise à jour du paiement.");
      setNotifyStatus("error");
      setSnackbarOpen(true);
    }
  };

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
        },
      );

      updateLocalOrder(res.data);
      setNotifyMessage("Retenue à la source mise à jour.");
      setNotifyStatus("success");
      setSnackbarOpen(true);
    } catch {
      setNotifyMessage("Échec de la mise à jour de la retenue à la source.");
      setNotifyStatus("error");
      setSnackbarOpen(true);
    }
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
                onClick={() => openOrderDrawer(order)}
              >
                <TableCell>{order.invoice_number}</TableCell>
                <TableCell>
                  {new Date(order.created_at).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <Chip
                    label={getStatusLabel(order.status)}
                    color={getStatusColor(order.status)}
                  />
                </TableCell>
                <TableCell>{Number(order.total_ttc).toFixed(2)} DT</TableCell>
                <TableCell>{order.is_paid ? "Oui" : "Non"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Drawer
        anchor="right"
        open={!!selectedOrder}
        onClose={closeDrawer}
        sx={{ zIndex: (theme) => theme.zIndex.drawer + 2 }}
        PaperProps={{
          sx: {
            width: { xs: "100vw", sm: 480 },
            borderLeft: "1px solid",
            borderColor: "divider",
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
          <Box
            sx={{
              position: "sticky",
              top: 0,
              backgroundColor: "background.paper",
              zIndex: 10,
              pb: 2,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              borderBottom: "1px solid",
              borderColor: "divider",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Commande #{selectedOrder?.id}
              </Typography>
              {selectedOrder && (
                <Chip
                  size="small"
                  label={getStatusLabel(selectedOrder.status)}
                  color={getStatusColor(selectedOrder.status)}
                />
              )}
            </Box>

            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <Tooltip title="Annuler la commande">
                <span>
                  <IconButton
                    color="error"
                    onClick={handleDeleteOrder}
                    disabled={deleting || !selectedOrder}
                  >
                    {deleting ? (
                      <CircularProgress size={20} color="error" />
                    ) : (
                      <CancelOutlinedIcon />
                    )}
                  </IconButton>
                </span>
              </Tooltip>
              <IconButton onClick={closeDrawer}>
                <CloseIcon />
              </IconButton>
            </Box>
          </Box>

          {selectedOrder && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <Box
                sx={{
                  background: "grey.50",
                  p: 2,
                  borderRadius: 2,
                  border: "1px solid",
                  borderColor: "divider",
                }}
              >
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 1.5,
                  }}
                >
                  <SummaryField
                    label="Date"
                    value={new Date(selectedOrder.created_at).toLocaleDateString()}
                  />
                  <SummaryField
                    label="N° facture"
                    value={selectedOrder.invoice_number || "N/A"}
                  />
                  <SummaryField
                    label="N° commande Shopify"
                    value={selectedOrder.shopify_order_id || "N/A"}
                  />
                  <SummaryField
                    label="Date de facture"
                    value={
                      selectedOrder.invoice_date
                        ? new Date(selectedOrder.invoice_date).toLocaleDateString()
                        : "N/A"
                    }
                  />
                  <SummaryField
                    label="Total HT"
                    value={`${Number(selectedOrder.total_ht).toFixed(2)} DT`}
                  />
                  <SummaryField
                    label="Total TTC"
                    value={`${Number(selectedOrder.total_ttc).toFixed(2)} DT`}
                  />
                </Box>

                {selectedOrder.invoice_pdf_url && (
                  <Button
                    variant="outlined"
                    size="small"
                    href={selectedOrder.invoice_pdf_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{ mt: 2 }}
                  >
                    Télécharger la facture
                  </Button>
                )}
              </Box>

              <Box
                sx={{
                  background: "grey.50",
                  p: 2,
                  borderRadius: 2,
                  border: "1px solid",
                  borderColor: "divider",
                }}
              >
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                  Statut
                </Typography>

                <Box sx={{ display: "flex", gap: 1 }}>
                  <Select
                    fullWidth
                    size="small"
                    value={editStatus}
                    onChange={(e: SelectChangeEvent<OrderB2BStatus>) =>
                      setEditStatus(e.target.value as OrderB2BStatus)
                    }
                  >
                    <MenuItem value="CREATED">Créée</MenuItem>
                    <MenuItem value="SHIPPED">Expédiée</MenuItem>
                    <MenuItem value="DELIVERED">Livrée</MenuItem>
                  </Select>

                  <Button
                    variant="contained"
                    size="small"
                    onClick={handleSaveStatus}
                    sx={{ flexShrink: 0 }}
                  >
                    Enregistrer
                  </Button>
                </Box>
              </Box>

              <Box
                sx={{
                  background: "grey.50",
                  p: 2,
                  borderRadius: 2,
                  border: "1px solid",
                  borderColor: "divider",
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    mb: 1.5,
                  }}
                >
                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                    Paiement
                  </Typography>
                  <Chip
                    size="small"
                    label={selectedOrder.is_paid ? "Payé" : "Non payé"}
                    color={selectedOrder.is_paid ? "success" : "default"}
                  />
                </Box>

                <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Méthode de paiement</InputLabel>
                    <Select
                      label="Méthode de paiement"
                      value={editPaymentMethod}
                      onChange={(e: SelectChangeEvent<PaymentMethod>) =>
                        setEditPaymentMethod(e.target.value as PaymentMethod)
                      }
                    >
                      <MenuItem value="">
                        <em>Aucune</em>
                      </MenuItem>
                      <MenuItem value="BANK_TRANSFER">Virement bancaire</MenuItem>
                      <MenuItem value="CASH">Espèces</MenuItem>
                      <MenuItem value="CHEQUE">Chèque</MenuItem>
                    </Select>
                  </FormControl>

                  <Box sx={{ display: "flex", gap: 1.5 }}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Référence"
                      value={editPaymentReference}
                      onChange={(e) => setEditPaymentReference(e.target.value)}
                    />

                    <TextField
                      fullWidth
                      size="small"
                      label="Date de paiement"
                      type="date"
                      InputLabelProps={{ shrink: true }}
                      value={editPaymentDate}
                      onChange={(e) => setEditPaymentDate(e.target.value)}
                    />
                  </Box>

                  <Button
                    variant="contained"
                    size="small"
                    color={editIsPaid ? "success" : "primary"}
                    onClick={handleSavePayment}
                    sx={{ alignSelf: "flex-end" }}
                  >
                    {selectedOrder.is_paid ? "Mettre à jour" : "Marquer comme payé"}
                  </Button>
                </Box>
              </Box>

              <Box
                sx={{
                  background: "grey.50",
                  p: 2,
                  borderRadius: 2,
                  border: "1px solid",
                  borderColor: "divider",
                }}
              >
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                  Retenue à la source
                </Typography>

                {isWithholdingExempt(Number(selectedOrder.total_ttc)) ? (
                  <Typography variant="caption" color="text.secondary">
                    Commande exonérée (moins de {WITHHOLDING_THRESHOLD_TTC} DT).
                  </Typography>
                ) : (
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                    <FormControlLabel
                      control={
                        <Switch
                          size="small"
                          checked={editWithholdingEnabled}
                          onChange={(e) =>
                            setEditWithholdingEnabled(e.target.checked)
                          }
                        />
                      }
                      label="Retenue activée"
                    />

                    <Box sx={{ display: "flex", gap: 1.5, alignItems: "center" }}>
                      <FormControlLabel
                        sx={{ flexShrink: 0 }}
                        control={
                          <Switch
                            size="small"
                            checked={editWithholdingReceived}
                            onChange={(e) =>
                              setEditWithholdingReceived(e.target.checked)
                            }
                            disabled={!editWithholdingEnabled}
                          />
                        }
                        label="Reçue"
                      />

                      <TextField
                        fullWidth
                        size="small"
                        label="Date"
                        type="date"
                        InputLabelProps={{ shrink: true }}
                        value={editWithholdingDate}
                        onChange={(e) => setEditWithholdingDate(e.target.value)}
                        disabled={!editWithholdingEnabled}
                      />
                    </Box>

                    <Button
                      variant="contained"
                      size="small"
                      onClick={handleSaveWithholding}
                      sx={{ alignSelf: "flex-end" }}
                    >
                      Enregistrer
                    </Button>
                  </Box>
                )}
              </Box>

              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                  Articles ({selectedOrder.items.length})
                </Typography>

                <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Produit</TableCell>
                        <TableCell align="right">Qté</TableCell>
                        <TableCell align="right">Total TTC</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {selectedOrder.items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.product.name}</TableCell>
                          <TableCell align="right">{item.quantity}</TableCell>
                          <TableCell align="right">
                            {Number(item.total_line_ttc).toFixed(2)} DT
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            </Box>
          )}
        </Box>
      </Drawer>

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