import React, { useEffect, useState } from "react";
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
  Switch,
  FormControlLabel,
  Chip,
  Tooltip,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";
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

  withholding_enabled: boolean;
  withholding_received: boolean;
  withholding_date?: string | null;

  items: OrderItemB2B[];
}

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

  useEffect(() => {
    if (!order) return;

    setEditStatus(order.status);
    setEditIsPaid(order.is_paid);
    setEditPaymentMethod((order.payment_method as PaymentMethod) || "");
    setEditPaymentReference(order.payment_reference || "");
    setEditPaymentDate(order.payment_date?.slice(0, 10) || "");

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

  const handleSaveStatus = async () => {
    if (!order) return;

    try {
      const res = await axios.patch<OrderB2BDetail>(
        `${import.meta.env.VITE_API_URL}order-b2b/${order.id}/status`,
        { status: editStatus },
      );

      onUpdated(res.data);
      onNotify("Statut mis à jour.", "success");
    } catch {
      onNotify("Échec de la mise à jour du statut.", "error");
    }
  };

  const handleSavePayment = async () => {
    if (!order) return;

    try {
      const res = await axios.patch<OrderB2BDetail>(
        `${import.meta.env.VITE_API_URL}order-b2b/${order.id}/pay`,
        {
          payment_method: editPaymentMethod || null,
          payment_reference: editPaymentReference || null,
          payment_date: editPaymentDate || null,
        },
      );

      onUpdated(res.data);
      setEditIsPaid(true);
      onNotify("Paiement mis à jour.", "success");
    } catch {
      onNotify("Échec de la mise à jour du paiement.", "error");
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
              <Chip
                size="small"
                label={getOrderStatusLabel(order.status)}
                color={getOrderStatusColor(order.status)}
              />
            )}
          </Box>

          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <Tooltip title="Annuler la commande">
              <span>
                <IconButton
                  color="error"
                  onClick={handleDeleteOrder}
                  disabled={deleting || !order}
                >
                  {deleting ? (
                    <CircularProgress size={20} color="error" />
                  ) : (
                    <CancelOutlinedIcon />
                  )}
                </IconButton>
              </span>
            </Tooltip>
            <IconButton onClick={onClose}>
              <CloseIcon />
            </IconButton>
          </Box>
        </Box>

        {order && (
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
                  label="Date de facture"
                  value={
                    order.invoice_date
                      ? new Date(order.invoice_date).toLocaleDateString()
                      : "N/A"
                  }
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
                  label={order.is_paid ? "Payé" : "Non payé"}
                  color={order.is_paid ? "success" : "default"}
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
                    <MenuItem value="BANK_TRANSFER">
                      {PAYMENT_METHOD_LABELS.BANK_TRANSFER}
                    </MenuItem>
                    <MenuItem value="CASH">{PAYMENT_METHOD_LABELS.CASH}</MenuItem>
                    <MenuItem value="CHEQUE">{PAYMENT_METHOD_LABELS.CHEQUE}</MenuItem>
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
                  {order.is_paid ? "Mettre à jour" : "Marquer comme payé"}
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
            </Box>

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
          </Box>
        )}
      </Box>
    </Drawer>
  );
};

export default OrderB2BDetailDrawer;
