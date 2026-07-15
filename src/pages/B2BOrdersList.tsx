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
  TableFooter,
  Paper,
  Button,
  Chip,
  IconButton,
  Tooltip,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import VisibilityIcon from "@mui/icons-material/Visibility";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { useNavigate } from "react-router-dom";
import { isWithholdingExempt, WITHHOLDING_THRESHOLD_TTC } from "./utils/withholding";

/* ======================================================
   🔵 TYPES
====================================================== */

type OrderB2BStatus = "CREATED" | "SHIPPED" | "DELIVERED";
type PaymentMethod = "BANK_TRANSFER" | "CASH" | "CHEQUE" | "";

interface OrderB2B {
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

  is_paid: boolean;
  payment_method?: PaymentMethod | null;

  withholding_enabled: boolean;
  withholding_received: boolean;
}

type StatusFilter = "ALL" | OrderB2BStatus;
type PaidFilter = "ALL" | "PAID" | "UNPAID";
type PaymentMethodFilter = "ALL" | "BANK_TRANSFER" | "CASH" | "CHEQUE" | "NONE";
type WithholdingFilter =
  | "ALL"
  | "ENABLED"
  | "DISABLED"
  | "RECEIVED"
  | "PENDING"
  | "EXEMPT";

const STATUS_LABELS: Record<OrderB2BStatus, string> = {
  CREATED: "Créée",
  SHIPPED: "Expédiée",
  DELIVERED: "Livrée",
};

const STATUS_COLORS: Record<OrderB2BStatus, "info" | "warning" | "success"> = {
  CREATED: "info",
  SHIPPED: "warning",
  DELIVERED: "success",
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  BANK_TRANSFER: "Virement bancaire",
  CASH: "Espèces",
  CHEQUE: "Chèque",
};

/* ======================================================
   🔵 COMPONENT
====================================================== */

const B2BOrdersList: React.FC = () => {
  const navigate = useNavigate();

  const [orders, setOrders] = useState<OrderB2B[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [clientFilter, setClientFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [paidFilter, setPaidFilter] = useState<PaidFilter>("ALL");
  const [paymentMethodFilter, setPaymentMethodFilter] =
    useState<PaymentMethodFilter>("ALL");
  const [withholdingFilter, setWithholdingFilter] =
    useState<WithholdingFilter>("ALL");

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await axios.get<OrderB2B[]>(
        `${import.meta.env.VITE_API_URL}order-b2b`,
      );
      setOrders(res.data);
    } catch (error) {
      console.error("Failed to load orders:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const clientOptions = useMemo(() => {
    const names = new Map<number, string>();
    orders.forEach((o) => names.set(o.client.id, o.client.name));
    return Array.from(names.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [orders]);

  const filteredOrders = useMemo(() => {
    let result = [...orders];

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (o) =>
          o.client.name.toLowerCase().includes(q) ||
          o.invoice_number?.toLowerCase().includes(q) ||
          String(o.id).includes(q),
      );
    }

    if (startDate) {
      result = result.filter((o) => new Date(o.created_at) >= startDate);
    }

    if (endDate) {
      result = result.filter((o) => new Date(o.created_at) <= endDate);
    }

    if (clientFilter !== "ALL") {
      result = result.filter((o) => String(o.client.id) === clientFilter);
    }

    if (statusFilter !== "ALL") {
      result = result.filter((o) => o.status === statusFilter);
    }

    if (paidFilter !== "ALL") {
      result = result.filter((o) =>
        paidFilter === "PAID" ? o.is_paid : !o.is_paid,
      );
    }

    if (paymentMethodFilter !== "ALL") {
      result = result.filter((o) =>
        paymentMethodFilter === "NONE"
          ? !o.payment_method
          : o.payment_method === paymentMethodFilter,
      );
    }

    if (withholdingFilter !== "ALL") {
      result = result.filter((o) => {
        switch (withholdingFilter) {
          case "ENABLED":
            return o.withholding_enabled;
          case "DISABLED":
            return !o.withholding_enabled;
          case "RECEIVED":
            return o.withholding_enabled && o.withholding_received;
          case "PENDING":
            return o.withholding_enabled && !o.withholding_received;
          case "EXEMPT":
            return isWithholdingExempt(Number(o.total_ttc));
          default:
            return true;
        }
      });
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
      result.sort((a, b) => Number(b.total_ttc) - Number(a.total_ttc));
    }

    return result;
  }, [
    orders,
    search,
    startDate,
    endDate,
    clientFilter,
    statusFilter,
    paidFilter,
    paymentMethodFilter,
    withholdingFilter,
    sortBy,
  ]);

  const totalTTC = filteredOrders.reduce(
    (sum, o) => sum + Number(o.total_ttc),
    0,
  );

  const getWithholdingLabel = (o: OrderB2B) => {
    if (!o.withholding_enabled) {
      return isWithholdingExempt(Number(o.total_ttc))
        ? `Exonérée (< ${WITHHOLDING_THRESHOLD_TTC} DT)`
        : "Non activée";
    }
    return o.withholding_received ? "Reçue" : "En attente";
  };

  // Anomalie : retenue activée manuellement alors que la commande est
  // légalement exonérée (total TTC sous le seuil). À vérifier au cas par cas.
  const isWithholdingAnomaly = (o: OrderB2B) =>
    o.withholding_enabled && isWithholdingExempt(Number(o.total_ttc));

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 1, fontWeight: 700 }}>
        Toutes les commandes B2B
      </Typography>
      <Typography variant="subtitle1" sx={{ mb: 4 }}>
        Vue globale, tous clients confondus
      </Typography>

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
          label="Rechercher (client, n° facture, n° commande)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ minWidth: 260 }}
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

        <FormControl sx={{ minWidth: 180 }}>
          <InputLabel>Client</InputLabel>
          <Select
            label="Client"
            value={clientFilter}
            onChange={(e: SelectChangeEvent) => setClientFilter(e.target.value)}
          >
            <MenuItem value="ALL">Tous les clients</MenuItem>
            {clientOptions.map(([id, name]) => (
              <MenuItem key={id} value={String(id)}>
                {name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl sx={{ minWidth: 150 }}>
          <InputLabel>Statut</InputLabel>
          <Select
            label="Statut"
            value={statusFilter}
            onChange={(e: SelectChangeEvent) =>
              setStatusFilter(e.target.value as StatusFilter)
            }
          >
            <MenuItem value="ALL">Tous</MenuItem>
            <MenuItem value="CREATED">Créée</MenuItem>
            <MenuItem value="SHIPPED">Expédiée</MenuItem>
            <MenuItem value="DELIVERED">Livrée</MenuItem>
          </Select>
        </FormControl>

        <FormControl sx={{ minWidth: 130 }}>
          <InputLabel>Paiement</InputLabel>
          <Select
            label="Paiement"
            value={paidFilter}
            onChange={(e: SelectChangeEvent) =>
              setPaidFilter(e.target.value as PaidFilter)
            }
          >
            <MenuItem value="ALL">Tous</MenuItem>
            <MenuItem value="PAID">Payées</MenuItem>
            <MenuItem value="UNPAID">Impayées</MenuItem>
          </Select>
        </FormControl>

        <FormControl sx={{ minWidth: 180 }}>
          <InputLabel>Méthode de paiement</InputLabel>
          <Select
            label="Méthode de paiement"
            value={paymentMethodFilter}
            onChange={(e: SelectChangeEvent) =>
              setPaymentMethodFilter(e.target.value as PaymentMethodFilter)
            }
          >
            <MenuItem value="ALL">Toutes</MenuItem>
            <MenuItem value="BANK_TRANSFER">Virement bancaire</MenuItem>
            <MenuItem value="CASH">Espèces</MenuItem>
            <MenuItem value="CHEQUE">Chèque</MenuItem>
            <MenuItem value="NONE">Aucune</MenuItem>
          </Select>
        </FormControl>

        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>Retenue à la source</InputLabel>
          <Select
            label="Retenue à la source"
            value={withholdingFilter}
            onChange={(e: SelectChangeEvent) =>
              setWithholdingFilter(e.target.value as WithholdingFilter)
            }
          >
            <MenuItem value="ALL">Toutes</MenuItem>
            <MenuItem value="ENABLED">Activée</MenuItem>
            <MenuItem value="DISABLED">Non activée</MenuItem>
            <MenuItem value="RECEIVED">Reçue</MenuItem>
            <MenuItem value="PENDING">En attente de réception</MenuItem>
            <MenuItem value="EXEMPT">
              Exonérée (&lt; {WITHHOLDING_THRESHOLD_TTC} DT)
            </MenuItem>
          </Select>
        </FormControl>

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

        <Box sx={{ flexGrow: 1 }} />

        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={loadData}
        >
          Actualiser
        </Button>
      </Box>

      {loading ? (
        <Box sx={{ textAlign: "center", mt: 10 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          <Typography variant="body2" sx={{ mb: 1, opacity: 0.7 }}>
            {filteredOrders.length} commande(s) affichée(s) sur {orders.length}
          </Typography>

          <TableContainer
            component={Paper}
            sx={{ borderRadius: 2, boxShadow: "0 4px 16px rgba(0,0,0,0.05)" }}
          >
            <Table>
              <TableHead>
                <TableRow sx={{ background: "#f6f8fa" }}>
                  <TableCell><strong>Client</strong></TableCell>
                  <TableCell><strong>N° facture</strong></TableCell>
                  <TableCell><strong>Date</strong></TableCell>
                  <TableCell><strong>Statut</strong></TableCell>
                  <TableCell align="right"><strong>Total TTC</strong></TableCell>
                  <TableCell><strong>Payé</strong></TableCell>
                  <TableCell><strong>Méthode de paiement</strong></TableCell>
                  <TableCell><strong>Retenue à la source</strong></TableCell>
                  <TableCell align="right"><strong>Actions</strong></TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {filteredOrders.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} align="center">
                      Aucune commande ne correspond à ces filtres.
                    </TableCell>
                  </TableRow>
                )}

                {filteredOrders.map((order) => (
                  <TableRow key={order.id} hover>
                    <TableCell>{order.client.name}</TableCell>
                    <TableCell>{order.invoice_number || "—"}</TableCell>
                    <TableCell>
                      {new Date(order.created_at).toLocaleDateString("fr-FR")}
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={STATUS_LABELS[order.status]}
                        color={STATUS_COLORS[order.status]}
                      />
                    </TableCell>
                    <TableCell align="right">
                      {Number(order.total_ttc).toFixed(2)} DT
                    </TableCell>
                    <TableCell>{order.is_paid ? "Oui" : "Non"}</TableCell>
                    <TableCell>
                      {order.payment_method
                        ? PAYMENT_METHOD_LABELS[order.payment_method]
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                        {getWithholdingLabel(order)}
                        {isWithholdingAnomaly(order) && (
                          <Tooltip title="Retenue activée alors que la commande est sous le seuil légal de 1000 DT — à vérifier">
                            <WarningAmberIcon fontSize="small" color="warning" />
                          </Tooltip>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Voir l'historique du client">
                        <IconButton
                          size="small"
                          onClick={() =>
                            navigate(`/b2b/orders/history/${order.client.id}`)
                          }
                        >
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>

              {filteredOrders.length > 0 && (
                <TableFooter>
                  <TableRow sx={{ background: "#f6f8fa" }}>
                    <TableCell colSpan={4}><strong>Total</strong></TableCell>
                    <TableCell align="right">
                      <strong>{totalTTC.toFixed(2)} DT</strong>
                    </TableCell>
                    <TableCell colSpan={4} />
                  </TableRow>
                </TableFooter>
              )}
            </Table>
          </TableContainer>
        </>
      )}
    </Box>
  );
};

export default B2BOrdersList;
