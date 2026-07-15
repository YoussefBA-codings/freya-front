import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  Box,
  Typography,
  CircularProgress,
  LinearProgress,
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
  Switch,
  FormControlLabel,
  Chip,
  Tooltip,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import { addMonths } from "date-fns";
import {
  isWithholdingExempt,
  WITHHOLDING_THRESHOLD_TTC,
} from "../pages/utils/withholding";

/* ======================================================
   🔵 TYPES
====================================================== */

export type OrderB2BStatus = "CREATED" | "SHIPPED" | "DELIVERED";
export type PaymentMethod = "BANK_TRANSFER" | "CASH" | "CHEQUE" | "";

export interface OrderItemB2B {
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

export interface OrderB2BPayment {
  id: number;
  amount: string;
  payment_method?: PaymentMethod | null;
  reference?: string | null;
  paid_at: string;
}

export interface OrderB2BDetail {
  id: number;
  client_id: number;
  client: { id: number; name: string };
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
  payment_due_date?: string | null;
  payments: OrderB2BPayment[];

  withholding_enabled: boolean;
  withholding_received: boolean;
  withholding_date?: string | null;

  items: OrderItemB2B[];
}

type DeadlineOrder = {
  payment_due_date?: string | null;
  invoice_date?: string | null;
  created_at: string;
};

// À défaut d'échéance explicite, la commande est considérée exigible un mois
// après la date de facture (ou la date de création si pas de facture).
export const getEffectiveDueDate = (order: DeadlineOrder) =>
  order.payment_due_date
    ? new Date(order.payment_due_date)
    : addMonths(new Date(order.invoice_date || order.created_at), 1);

// "En retard" : pas totalement payée et l'échéance (explicite ou implicite) est dépassée.
export const isOrderOverdue = (order: DeadlineOrder & { is_paid: boolean }) =>
  !order.is_paid && getEffectiveDueDate(order) < new Date();

export const getAmountPaid = (order: { payments: OrderB2BPayment[] }) =>
  (order.payments ?? []).reduce((sum, p) => sum + Number(p.amount), 0);

type PaymentOrder = {
  is_paid: boolean;
  total_ttc: string;
  payments: OrderB2BPayment[];
};

// is_paid fait foi : une commande peut être marquée payée sans que chaque
// versement ait été détaillé (héritage de l'ancien flux "marquer payé").
export const getRemainingBalance = (order: PaymentOrder) =>
  order.is_paid
    ? 0
    : Math.max(0, Number(order.total_ttc) - getAmountPaid(order));

export const getPaymentProgressLabel = (order: PaymentOrder) => {
  if (order.is_paid) return "Payé";
  const amountPaid = getAmountPaid(order);
  return amountPaid > 0 && amountPaid < Number(order.total_ttc)
    ? "Payé partiellement"
    : "Non payé";
};

export const getPaymentProgressColor = (
  order: PaymentOrder,
): "success" | "info" | "warning" => {
  if (order.is_paid) return "success";
  const amountPaid = getAmountPaid(order);
  return amountPaid > 0 && amountPaid < Number(order.total_ttc)
    ? "info"
    : "warning";
};

export const getOrderStatusLabel = (status: OrderB2BStatus) => {
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

export const getOrderStatusColor = (
  status: OrderB2BStatus,
): "info" | "warning" | "success" => {
  switch (status) {
    case "CREATED":
      return "info";
    case "SHIPPED":
      return "warning";
    case "DELIVERED":
      return "success";
    default:
      return "info";
  }
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  BANK_TRANSFER: "Virement bancaire",
  CASH: "Espèces",
  CHEQUE: "Chèque",
};

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

const SectionCard: React.FC<{
  title?: string;
  children: React.ReactNode;
}> = ({ title, children }) => (
  <Box
    sx={{
      background: "grey.50",
      p: 2,
      borderRadius: 2,
      border: "1px solid",
      borderColor: "divider",
    }}
  >
    {title && (
      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5 }}>
        {title}
      </Typography>
    )}
    {children}
  </Box>
);

/* ======================================================
   🔵 COMPONENT
====================================================== */

interface OrderB2BDetailDrawerProps {
  order: OrderB2BDetail | null;
  onClose: () => void;
  onUpdated: (updated: OrderB2BDetail) => void;
  onCancelled: (orderId: number) => void;
  onNotify: (message: string, status: "success" | "error") => void;
}

const OrderB2BDetailDrawer: React.FC<OrderB2BDetailDrawerProps> = ({
  order,
  onClose,
  onUpdated,
  onCancelled,
  onNotify,
}) => {
  const [deleting, setDeleting] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);

  const [editPaymentDueDate, setEditPaymentDueDate] = useState<string>("");

  const [newPaymentAmount, setNewPaymentAmount] = useState<string>("");
  const [newPaymentMethod, setNewPaymentMethod] = useState<PaymentMethod>("");
  const [newPaymentReference, setNewPaymentReference] = useState<string>("");
  const [newPaymentDate, setNewPaymentDate] = useState<string>(
    new Date().toISOString().slice(0, 10),
  );
  const [addingPayment, setAddingPayment] = useState(false);
  const [deletingPaymentId, setDeletingPaymentId] = useState<number | null>(
    null,
  );

  const [editWithholdingEnabled, setEditWithholdingEnabled] =
    useState<boolean>(false);
  const [editWithholdingReceived, setEditWithholdingReceived] =
    useState<boolean>(false);
  const [editWithholdingDate, setEditWithholdingDate] = useState<string>("");

  useEffect(() => {
    if (!order) return;

    setEditPaymentDueDate(order.payment_due_date?.slice(0, 10) || "");

    const remaining = getRemainingBalance(order);
    setNewPaymentAmount(remaining > 0 ? remaining.toFixed(2) : "");
    setNewPaymentMethod("");
    setNewPaymentReference("");
    setNewPaymentDate(new Date().toISOString().slice(0, 10));

    const exempt = isWithholdingExempt(Number(order.total_ttc));
    setEditWithholdingEnabled(exempt ? false : order.withholding_enabled);
    setEditWithholdingReceived(exempt ? false : order.withholding_received);
    setEditWithholdingDate(exempt ? "" : order.withholding_date?.slice(0, 10) || "");
  }, [order]);

  const handleDeleteOrder = async () => {
    if (!order) return;

    const confirmed = window.confirm(
      `Confirmer l’annulation de la commande #${order.id} ?\n\nLe stock sera restauré automatiquement sur Shopify.`,
    );

    if (!confirmed) return;

    try {
      setDeleting(true);

      await axios.delete(
        `${import.meta.env.VITE_API_URL}order-b2b/${order.id}/cancel`,
      );

      onCancelled(order.id);
      onNotify("Commande annulée et stock restauré.", "success");
    } catch (error) {
      console.error("Failed to cancel order:", error);
      onNotify("Erreur lors de l’annulation de la commande.", "error");
    } finally {
      setDeleting(false);
    }
  };

  const handleChangeStatus = async (status: OrderB2BStatus) => {
    if (!order) return;

    try {
      setSavingStatus(true);
      const res = await axios.patch<OrderB2BDetail>(
        `${import.meta.env.VITE_API_URL}order-b2b/${order.id}/status`,
        { status },
      );

      onUpdated(res.data);
      onNotify("Statut mis à jour.", "success");
    } catch {
      onNotify("Échec de la mise à jour du statut.", "error");
    } finally {
      setSavingStatus(false);
    }
  };

  const handleSaveDueDate = async () => {
    if (!order) return;
    if ((order.payment_due_date?.slice(0, 10) || "") === editPaymentDueDate) {
      return;
    }

    try {
      const res = await axios.patch<OrderB2BDetail>(
        `${import.meta.env.VITE_API_URL}order-b2b/${order.id}/payment-due-date`,
        { payment_due_date: editPaymentDueDate || null },
      );

      onUpdated(res.data);
      onNotify("Échéance de paiement mise à jour.", "success");
    } catch {
      onNotify("Échec de la mise à jour de l'échéance.", "error");
    }
  };

  const handleAddPayment = async () => {
    if (!order) return;

    const amount = Number(newPaymentAmount);
    if (!amount || amount <= 0) {
      onNotify("Le montant du versement doit être positif.", "error");
      return;
    }

    try {
      setAddingPayment(true);
      const res = await axios.post<OrderB2BDetail>(
        `${import.meta.env.VITE_API_URL}order-b2b/${order.id}/payments`,
        {
          amount,
          payment_method: newPaymentMethod || null,
          reference: newPaymentReference || null,
          paid_at: newPaymentDate || null,
        },
      );

      onUpdated(res.data);
      onNotify("Versement enregistré.", "success");
    } catch {
      onNotify("Échec de l'enregistrement du versement.", "error");
    } finally {
      setAddingPayment(false);
    }
  };

  const handleDeletePayment = async (paymentId: number) => {
    if (!order) return;

    try {
      setDeletingPaymentId(paymentId);
      const res = await axios.delete<OrderB2BDetail>(
        `${import.meta.env.VITE_API_URL}order-b2b/${order.id}/payments/${paymentId}`,
      );

      onUpdated(res.data);
      onNotify("Versement supprimé.", "success");
    } catch {
      onNotify("Échec de la suppression du versement.", "error");
    } finally {
      setDeletingPaymentId(null);
    }
  };

  const handleSaveWithholding = async () => {
    if (!order) return;

    try {
      const res = await axios.patch<OrderB2BDetail>(
        `${import.meta.env.VITE_API_URL}order-b2b/${order.id}/withholding`,
        {
          withholding_enabled: editWithholdingEnabled,
          withholding_received: editWithholdingReceived,
          withholding_date: editWithholdingDate || null,
        },
      );

      onUpdated(res.data);
      onNotify("Retenue à la source mise à jour.", "success");
    } catch {
      onNotify("Échec de la mise à jour de la retenue à la source.", "error");
    }
  };

  // is_paid fait foi : une commande peut être marquée payée sans que chaque
  // versement ait été détaillé (héritage de l'ancien flux "marquer payé").
  const amountPaid = order ? getAmountPaid(order) : 0;
  const remaining = order ? getRemainingBalance(order) : 0;
  const paidPercent = !order
    ? 0
    : order.is_paid
    ? 100
    : Math.min(100, (amountPaid / Math.max(Number(order.total_ttc), 0.01)) * 100);

  return (
    <Drawer
      anchor="right"
      open={!!order}
      onClose={onClose}
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
              Commande #{order?.id}
            </Typography>
            {order && (
              <FormControl size="small" variant="standard">
                <Select
                  disableUnderline
                  value={order.status}
                  disabled={savingStatus}
                  onChange={(e: SelectChangeEvent<OrderB2BStatus>) =>
                    handleChangeStatus(e.target.value as OrderB2BStatus)
                  }
                  renderValue={(value) => (
                    <Chip
                      size="small"
                      label={getOrderStatusLabel(value as OrderB2BStatus)}
                      color={getOrderStatusColor(value as OrderB2BStatus)}
                    />
                  )}
                >
                  <MenuItem value="CREATED">Créée</MenuItem>
                  <MenuItem value="SHIPPED">Expédiée</MenuItem>
                  <MenuItem value="DELIVERED">Livrée</MenuItem>
                </Select>
              </FormControl>
            )}
          </Box>

          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>

        {order && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <SectionCard>
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 1.5,
                }}
              >
                <SummaryField label="Client" value={order.client.name} />
                <SummaryField
                  label="Date"
                  value={new Date(order.created_at).toLocaleDateString()}
                />
                <SummaryField
                  label="N° facture"
                  value={order.invoice_number || "N/A"}
                />
                <SummaryField
                  label="N° commande Shopify"
                  value={order.shopify_order_id || "N/A"}
                />
                <SummaryField
                  label="Total HT"
                  value={`${Number(order.total_ht).toFixed(2)} DT`}
                />
                <SummaryField
                  label="Total TTC"
                  value={`${Number(order.total_ttc).toFixed(2)} DT`}
                />
              </Box>

              {order.invoice_pdf_url && (
                <Button
                  variant="outlined"
                  size="small"
                  href={order.invoice_pdf_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{ mt: 2 }}
                >
                  Télécharger la facture
                </Button>
              )}
            </SectionCard>

            <SectionCard>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  mb: 1,
                }}
              >
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  Paiement
                </Typography>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  <Chip
                    size="small"
                    label={getPaymentProgressLabel(order)}
                    color={getPaymentProgressColor(order)}
                  />
                  {isOrderOverdue(order) && (
                    <Tooltip title="Échéance de paiement dépassée">
                      <WarningAmberIcon fontSize="small" color="error" />
                    </Tooltip>
                  )}
                </Box>
              </Box>

              <LinearProgress
                variant="determinate"
                value={paidPercent}
                color={order.is_paid ? "success" : "info"}
                sx={{ borderRadius: 1, height: 6, mb: 0.75 }}
              />
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 2 }}>
                {order.is_paid && amountPaid === 0
                  ? `Total réglé (${Number(order.total_ttc).toFixed(2)} DT)`
                  : `${amountPaid.toFixed(2)} DT versés sur ${Number(order.total_ttc).toFixed(2)} DT${
                      remaining > 0 ? ` · reste ${remaining.toFixed(2)} DT` : ""
                    }`}
              </Typography>

              {order.payments.length > 0 && (
                <TableContainer
                  component={Paper}
                  variant="outlined"
                  sx={{ borderRadius: 2, mb: 2 }}
                >
                  <Table size="small">
                    <TableBody>
                      {order.payments.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell>
                            <Typography variant="body2">
                              {new Date(p.paid_at).toLocaleDateString()}
                            </Typography>
                            {(p.payment_method || p.reference) && (
                              <Typography variant="caption" color="text.secondary">
                                {[
                                  p.payment_method
                                    ? PAYMENT_METHOD_LABELS[p.payment_method]
                                    : null,
                                  p.reference,
                                ]
                                  .filter(Boolean)
                                  .join(" · ")}
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell align="right">
                            {Number(p.amount).toFixed(2)} DT
                          </TableCell>
                          <TableCell align="right" sx={{ width: 40 }}>
                            <IconButton
                              size="small"
                              onClick={() => handleDeletePayment(p.id)}
                              disabled={deletingPaymentId === p.id}
                            >
                              {deletingPaymentId === p.id ? (
                                <CircularProgress size={16} />
                              ) : (
                                <DeleteOutlineIcon fontSize="small" />
                              )}
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}

              {!order.is_paid && (
                <Box
                  sx={{
                    mt: order.payments.length > 0 ? 2.5 : 0,
                    pt: order.payments.length > 0 ? 2 : 0,
                    borderTop: order.payments.length > 0 ? "1px solid" : "none",
                    borderColor: "divider",
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{ display: "block", mb: 1.25, fontWeight: 600 }}
                    color="text.secondary"
                  >
                    NOUVEAU VERSEMENT
                  </Typography>

                  <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Montant (DT)"
                      type="number"
                      value={newPaymentAmount}
                      onChange={(e) => setNewPaymentAmount(e.target.value)}
                    />

                    <Box sx={{ display: "flex", gap: 1.5 }}>
                      <FormControl fullWidth size="small">
                        <InputLabel>Méthode</InputLabel>
                        <Select
                          label="Méthode"
                          value={newPaymentMethod}
                          onChange={(e: SelectChangeEvent<PaymentMethod>) =>
                            setNewPaymentMethod(e.target.value as PaymentMethod)
                          }
                        >
                          <MenuItem value="">
                            <em>Aucune</em>
                          </MenuItem>
                          <MenuItem value="BANK_TRANSFER">
                            {PAYMENT_METHOD_LABELS.BANK_TRANSFER}
                          </MenuItem>
                          <MenuItem value="CASH">{PAYMENT_METHOD_LABELS.CASH}</MenuItem>
                          <MenuItem value="CHEQUE">{PAYMENT_METHOD_LABELS.CHEQUE}</MenuItem>
                        </Select>
                      </FormControl>

                      <TextField
                        fullWidth
                        size="small"
                        label="Date"
                        type="date"
                        InputLabelProps={{ shrink: true }}
                        value={newPaymentDate}
                        onChange={(e) => setNewPaymentDate(e.target.value)}
                      />
                    </Box>

                    <TextField
                      fullWidth
                      size="small"
                      label="Référence (optionnel)"
                      value={newPaymentReference}
                      onChange={(e) => setNewPaymentReference(e.target.value)}
                    />

                    <Button
                      variant="contained"
                      size="small"
                      fullWidth
                      onClick={handleAddPayment}
                      disabled={addingPayment}
                      sx={{ mt: 0.5 }}
                    >
                      {addingPayment ? (
                        <CircularProgress size={18} />
                      ) : (
                        "Enregistrer le versement"
                      )}
                    </Button>
                  </Box>
                </Box>
              )}
            </SectionCard>

            <SectionCard title="Échéance de paiement">
              <Box sx={{ display: "flex", gap: 1.5, alignItems: "flex-start" }}>
                <TextField
                  fullWidth
                  size="small"
                  label="Date d'échéance"
                  type="date"
                  InputLabelProps={{ shrink: true }}
                  value={editPaymentDueDate}
                  onChange={(e) => setEditPaymentDueDate(e.target.value)}
                />
                <Button
                  variant="contained"
                  size="small"
                  onClick={handleSaveDueDate}
                  sx={{ flexShrink: 0 }}
                >
                  Enregistrer
                </Button>
              </Box>
              {!order.payment_due_date && (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: "block", mt: 1 }}
                >
                  Non définie : par défaut, la commande est considérée en
                  retard 1 mois après la date de facture (
                  {getEffectiveDueDate(order).toLocaleDateString()}).
                </Typography>
              )}
            </SectionCard>

            <SectionCard title="Retenue à la source">
              {isWithholdingExempt(Number(order.total_ttc)) ? (
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
            </SectionCard>

            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                Articles ({order.items.length})
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
                    {order.items.map((item) => (
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

            <Box sx={{ pt: 1, borderTop: "1px solid", borderColor: "divider" }}>
              <Button
                variant="text"
                size="small"
                color="error"
                startIcon={
                  deleting ? (
                    <CircularProgress size={16} color="error" />
                  ) : (
                    <CancelOutlinedIcon fontSize="small" />
                  )
                }
                onClick={handleDeleteOrder}
                disabled={deleting}
              >
                Annuler la commande
              </Button>
            </Box>
          </Box>
        )}
      </Box>
    </Drawer>
  );
};

export default OrderB2BDetailDrawer;
