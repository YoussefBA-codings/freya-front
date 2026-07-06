/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  Box,
  Typography,
  TextField,
  CircularProgress,
  Divider,
  Paper,
  Grid,
  Chip,
  Stack,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  ToggleButtonGroup,
  ToggleButton,
  Button,
  LinearProgress,
  IconButton,
  Tooltip,
  InputAdornment,
  MenuItem,
  Select,
  FormControl,
  Card,
  CardContent,
  Avatar,
} from "@mui/material";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import PaidRoundedIcon from "@mui/icons-material/PaidRounded";
import PercentRoundedIcon from "@mui/icons-material/PercentRounded";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import TrendingUpRoundedIcon from "@mui/icons-material/TrendingUpRounded";
import LocalShippingRoundedIcon from "@mui/icons-material/LocalShippingRounded";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import AccountBalanceRoundedIcon from "@mui/icons-material/AccountBalanceRounded";
import CategoryRoundedIcon from "@mui/icons-material/CategoryRounded";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";

type SummaryRes = {
  period: { from: string | null; to: string | null };
  paidOnly: boolean;
  ordersCount: number;
  totalTTC: number;
  totalHT: number;
  totalPromoTTC: number;
  avgBasketTTC: number;
};

type MonthlyRow = {
  month: string; // "YYYY-MM"
  orders: number;
  totalTTC: number;
  totalPromoTTC: number;
};

type UnpaidRow = {
  id: number;
  created_at: string;
  invoice_number?: string | null;
  total_ttc: number;
  status: string;
  payment_method?: string | null;
  client: {
    id: number;
    name: string;
    responsable_name?: string | null;
    responsable_phone?: string | null;
    responsable_email?: string | null;
  };
};

type WithholdingRow = {
  id: number;
  created_at: string;
  invoice_number?: string | null;
  total_ttc: number;
  client: {
    id: number;
    name: string;
    responsable_phone?: string | null;
    responsable_email?: string | null;
  };
  withholding_enabled: boolean;
  withholding_received: boolean;
};

type TopItemRow = {
  product_id: number;
  product: {
    id: number;
    name: string;
    variant_id: string;
    price_ht: string | number;
    tva_rate: string | number;
  } | null;
  qtySold: number;
  totalTTC: number;
  totalHT: number;
};

type TopClientRow = {
  client_id: number;
  client: {
    id: number;
    name: string;
    responsable_name?: string | null;
    responsable_phone?: string | null;
    responsable_email?: string | null;
  } | null;
  ordersCount: number;
  totalTTC: number;
  totalPromoTTC: number;
};

type BreakdownRow = {
  status?: string;
  payment_method?: string;
  orders: number;
  totalTTC: number;
};

type AgingRow = {
  bucket: string; // "0-7" | "8-30" | ...
  orders: number;
  totalTTC: number;
};

const apiBase = `${import.meta.env.VITE_API_URL}order-b2b`;

// ✅ Currency = Tunisian Dinar (TND)
const fmtMoney = (n: number) =>
  new Intl.NumberFormat("fr-TN", { style: "currency", currency: "TND" }).format(
    Number.isFinite(n) ? n : 0
  );

const fmtInt = (n: number) =>
  new Intl.NumberFormat("fr-TN").format(Number.isFinite(n) ? n : 0);

const fmtMonthLabel = (month: string) => {
  const [y, m] = month.split("-").map((x) => Number(x));
  if (!y || !m) return month;
  const d = new Date(y, m - 1, 1);
  return new Intl.DateTimeFormat("fr-FR", {
    month: "short",
    year: "numeric",
  }).format(d);
};

const fmtDateTime = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("fr-FR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
};

const toISODate = (v: string) => {
  // expects "YYYY-MM-DD"
  if (!v) return "";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString();
};

const getInitials = (name?: string | null) => {
  const n = (name ?? "").trim();
  if (!n) return "?";
  const parts = n.split(" ").filter(Boolean);
  const a = parts[0]?.[0] ?? "?";
  const b = parts.length > 1 ? parts[parts.length - 1]?.[0] : "";
  return (a + b).toUpperCase();
};

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
const pad2 = (n: number) => String(n).padStart(2, "0");

const STATUS_LABELS: Record<string, string> = {
  CREATED: "Créée",
  SHIPPED: "Expédiée",
  DELIVERED: "Livrée",
};
const getStatusLabel = (status?: string | null) =>
  status ? STATUS_LABELS[status] ?? status : "?";

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  BANK_TRANSFER: "Virement bancaire",
  CASH: "Espèces",
  CHEQUE: "Chèque",
};
const getPaymentMethodLabel = (method?: string | null) =>
  method ? PAYMENT_METHOD_LABELS[method] ?? method : "Inconnu";

const getMonthToTodayRange = () => {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = pad2(now.getMonth() + 1);
  const dd = pad2(now.getDate());
  return {
    from: `${yyyy}-${mm}-01`,
    to: `${yyyy}-${mm}-${dd}`,
  };
};

const MetricCard: React.FC<{
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ReactNode;
  rightChip?: string;
}> = ({ title, value, subtitle, icon, rightChip }) => (
  <Card
    elevation={0}
    sx={{
      borderRadius: 3,
      border: "1px solid",
      borderColor: "divider",
      overflow: "hidden",
      height: "100%",
      background:
        "linear-gradient(180deg, rgba(0,0,0,0.02), rgba(0,0,0,0))",
    }}
  >
    <CardContent sx={{ p: 2.2 }}>
      <Box
        sx={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
        }}
      >
        <Box sx={{ display: "flex", gap: 1.25, alignItems: "center" }}>
          <Avatar
            variant="rounded"
            sx={{
              borderRadius: 2,
              width: 42,
              height: 42,
              bgcolor: "action.hover",
              color: "text.primary",
            }}
          >
            {icon}
          </Avatar>

          <Box>
            <Typography variant="body2" sx={{ opacity: 0.75 }}>
              {title}
            </Typography>
            <Typography
              variant="h5"
              sx={{ mt: 0.2, fontWeight: 800, letterSpacing: -0.5 }}
            >
              {value}
            </Typography>
          </Box>
        </Box>

        {rightChip ? <Chip size="small" label={rightChip} /> : null}
      </Box>

      {subtitle ? (
        <Typography
          variant="caption"
          sx={{ display: "block", opacity: 0.7, mt: 1.2 }}
        >
          {subtitle}
        </Typography>
      ) : null}
    </CardContent>
  </Card>
);

const SectionCard: React.FC<{
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}> = ({ title, subtitle, right, children }) => (
  <Paper
    elevation={0}
    sx={{
      borderRadius: 3,
      border: "1px solid",
      borderColor: "divider",
      overflow: "hidden",
    }}
  >
    <Box
      sx={{
        px: 2.2,
        py: 1.8,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 2,
      }}
    >
      <Box>
        <Typography variant="h6" sx={{ fontWeight: 800 }}>
          {title}
        </Typography>
        {subtitle ? (
          <Typography variant="body2" sx={{ opacity: 0.7, mt: 0.3 }}>
            {subtitle}
          </Typography>
        ) : null}
      </Box>
      {right}
    </Box>
    <Divider />
    <Box sx={{ p: 2.2 }}>{children}</Box>
  </Paper>
);

const DenseTable: React.FC<{
  head: Array<{ label: string; align?: "left" | "right" }>;
  children: React.ReactNode;
}> = ({ head, children }) => (
  <Table size="small" sx={{ "& td, & th": { borderBottomColor: "divider" } }}>
    <TableHead>
      <TableRow>
        {head.map((h) => (
          <TableCell
            key={h.label}
            align={h.align ?? "left"}
            sx={{ fontWeight: 800 }}
          >
            {h.label}
          </TableCell>
        ))}
      </TableRow>
    </TableHead>
    <TableBody>{children}</TableBody>
  </Table>
);

const PillBar: React.FC<{
  items: Array<{ label: string; value: number; hint?: string }>;
  formatValue?: (n: number) => string;
}> = ({ items, formatValue }) => {
  const total = items.reduce(
    (s, it) => s + (Number.isFinite(it.value) ? it.value : 0),
    0
  );
  return (
    <Box>
      <Box sx={{ display: "flex", gap: 1, alignItems: "center", mb: 1.2 }}>
        <Typography variant="body2" sx={{ fontWeight: 800 }}>
          Total
        </Typography>
        <Chip
          size="small"
          label={formatValue ? formatValue(total) : fmtInt(total)}
        />
      </Box>

      <Stack spacing={1}>
        {items.map((it) => {
          const ratio = total > 0 ? it.value / total : 0;
          return (
            <Box
              key={it.label}
              sx={{ display: "flex", alignItems: "center", gap: 1.2 }}
            >
              <Box sx={{ minWidth: 120 }}>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  {it.label}
                </Typography>
                {it.hint ? (
                  <Typography variant="caption" sx={{ opacity: 0.7 }}>
                    {it.hint}
                  </Typography>
                ) : null}
              </Box>

              <Box sx={{ flex: 1 }}>
                <LinearProgress
                  variant="determinate"
                  value={clamp01(ratio) * 100}
                  sx={{ height: 10, borderRadius: 999 }}
                />
              </Box>

              <Box sx={{ minWidth: 120, textAlign: "right" }}>
                <Typography variant="body2" sx={{ fontWeight: 800 }}>
                  {formatValue ? formatValue(it.value) : fmtInt(it.value)}
                </Typography>
              </Box>
            </Box>
          );
        })}
      </Stack>
    </Box>
  );
};

const B2BOrdersStats: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // ✅ Default: current month (from 1st day to today)
  const initialRange = useMemo(() => getMonthToTodayRange(), []);
  const [from, setFrom] = useState<string>(initialRange.from);
  const [to, setTo] = useState<string>(initialRange.to);

  const [paidMode, setPaidMode] = useState<"all" | "paidOnly">("all");
  const [limit, setLimit] = useState<number>(20);
  const [search, setSearch] = useState("");
  const [quickRange, setQuickRange] = useState<
    "none" | "thisMonth" | "30d" | "90d" | "ytd"
  >("thisMonth");

  // Data
  const [summary, setSummary] = useState<SummaryRes | null>(null);
  const [monthly, setMonthly] = useState<MonthlyRow[]>([]);
  const [unpaid, setUnpaid] = useState<UnpaidRow[]>([]);
  const [withholding, setWithholding] = useState<WithholdingRow[]>([]);
  const [topItems, setTopItems] = useState<TopItemRow[]>([]);
  const [topClients, setTopClients] = useState<TopClientRow[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<BreakdownRow[]>([]);
  const [statusBreakdown, setStatusBreakdown] = useState<BreakdownRow[]>([]);
  const [aging, setAging] = useState<AgingRow[]>([]);

  const paidOnly = paidMode === "paidOnly";

  const paramsBase = useMemo(() => {
    const p: Record<string, string> = {};
    const f = toISODate(from);
    const t = toISODate(to);
    if (f) p.from = f;
    if (t) p.to = t;
    return p;
  }, [from, to]);

  const applyQuickRange = (
    mode: "none" | "thisMonth" | "30d" | "90d" | "ytd"
  ) => {
    setQuickRange(mode);

    if (mode === "none") return;

    if (mode === "thisMonth") {
      const r = getMonthToTodayRange();
      setFrom(r.from);
      setTo(r.to);
      return;
    }

    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = pad2(now.getMonth() + 1);
    const dd = pad2(now.getDate());
    const toStr = `${yyyy}-${mm}-${dd}`;

    if (mode === "ytd") {
      setFrom(`${yyyy}-01-01`);
      setTo(toStr);
      return;
    }

    const days = mode === "30d" ? 30 : 90;
    const fromD = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    const fyyyy = fromD.getFullYear();
    const fmm = pad2(fromD.getMonth() + 1);
    const fdd = pad2(fromD.getDate());
    setFrom(`${fyyyy}-${fmm}-${fdd}`);
    setTo(toStr);
  };

  const loadAll = async (silent = false) => {
    if (!silent) setLoading(true);
    setRefreshing(true);

    try {
      const [
        summaryRes,
        monthlyRes,
        unpaidRes,
        withholdingRes,
        topItemsRes,
        topClientsRes,
        paymentMethodsRes,
        statusBreakdownRes,
        agingRes,
      ] = await Promise.all([
        axios.get<SummaryRes>(`${apiBase}/stats/summary`, {
          params: { ...paramsBase, paidOnly: String(paidOnly) },
        }),
        axios.get<MonthlyRow[]>(`${apiBase}/stats/monthly`, {
          params: { ...paramsBase, paidOnly: String(paidOnly) },
        }),
        axios.get<UnpaidRow[]>(`${apiBase}/stats/unpaid`, {
          params: paramsBase,
        }),
        axios.get<WithholdingRow[]>(`${apiBase}/stats/withholding-pending`, {
          params: paramsBase,
        }),
        axios.get<TopItemRow[]>(`${apiBase}/stats/top-items`, {
          params: { ...paramsBase, limit: String(limit) },
        }),
        axios.get<TopClientRow[]>(`${apiBase}/stats/top-clients`, {
          params: {
            ...paramsBase,
            limit: String(limit),
            paidOnly: String(paidOnly),
          },
        }),
        axios.get<BreakdownRow[]>(`${apiBase}/stats/payment-methods`, {
          params: paramsBase,
        }),
        axios.get<BreakdownRow[]>(`${apiBase}/stats/status-breakdown`, {
          params: paramsBase,
        }),
        axios.get<AgingRow[]>(`${apiBase}/stats/ar-aging`),
      ]);

      setSummary(summaryRes.data);
      setMonthly(monthlyRes.data);
      setUnpaid(unpaidRes.data);
      setWithholding(withholdingRes.data);
      setTopItems(topItemsRes.data);
      setTopClients(topClientsRes.data);
      setPaymentMethods(paymentMethodsRes.data);
      setStatusBreakdown(statusBreakdownRes.data);
      setAging(agingRes.data);
    } catch (e) {
      console.error("Failed to load B2B stats:", e);
    } finally {
      if (!silent) setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredUnpaid = useMemo(() => {
    if (!search.trim()) return unpaid;
    const s = search.toLowerCase();
    return unpaid.filter(
      (o) =>
        o.client.name.toLowerCase().includes(s) ||
        (o.invoice_number ?? "").toLowerCase().includes(s) ||
        String(o.id).includes(s)
    );
  }, [unpaid, search]);

  const filteredWithholding = useMemo(() => {
    if (!search.trim()) return withholding;
    const s = search.toLowerCase();
    return withholding.filter(
      (o) =>
        o.client.name.toLowerCase().includes(s) ||
        (o.invoice_number ?? "").toLowerCase().includes(s) ||
        String(o.id).includes(s)
    );
  }, [withholding, search]);

  const kpiUnpaidCount = filteredUnpaid.length;

  const monthlyMaxTTC = useMemo(() => {
    if (!monthly.length) return 0;
    return Math.max(...monthly.map((m) => m.totalTTC));
  }, [monthly]);

  const monthBars = useMemo(() => {
    return monthly.slice(-8).map((m) => {
      const ratio = monthlyMaxTTC > 0 ? m.totalTTC / monthlyMaxTTC : 0;
      return { ...m, ratio: clamp01(ratio) };
    });
  }, [monthly, monthlyMaxTTC]);

  const paymentBarItems = useMemo(
    () =>
      paymentMethods.map((r) => ({
        label: getPaymentMethodLabel(r.payment_method),
        value: r.totalTTC,
        hint: `${r.orders} commandes`,
      })),
    [paymentMethods]
  );

  const statusBarItems = useMemo(
    () =>
      statusBreakdown.map((r) => ({
        label: getStatusLabel(r.status),
        value: r.totalTTC,
        hint: `${r.orders} commandes`,
      })),
    [statusBreakdown]
  );

  if (loading) {
    return (
      <Box sx={{ textAlign: "center", mt: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, maxWidth: 1320, margin: "0 auto" }}>
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          mb: 2,
        }}
      >
        <Box>
          <Typography
            variant="h4"
            sx={{ mb: 0.5, fontWeight: 900, letterSpacing: -0.7 }}
          >
            Commandes B2B — Tableau de bord
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.75 }}>
            Par défaut: mois en cours. KPIs, tendances, risques, top ventes.
          </Typography>
        </Box>

        <Stack direction="row" spacing={1} alignItems="center">
          <Chip
            size="small"
            label={paidOnly ? "Payées uniquement" : "Toutes les commandes"}
            icon={<PaidRoundedIcon />}
            variant="outlined"
          />
          <Tooltip title="Actualiser">
            <IconButton onClick={() => loadAll(true)} disabled={refreshing}>
              <RefreshRoundedIcon />
            </IconButton>
          </Tooltip>
        </Stack>
      </Box>

      {/* Filters */}
      <Paper
        elevation={0}
        sx={{
          p: 2.2,
          borderRadius: 3,
          border: "1px solid",
          borderColor: "divider",
          mb: 3,
        }}
      >
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              type="date"
              label="Du"
              InputLabelProps={{ shrink: true }}
              value={from}
              onChange={(e) => {
                setFrom(e.target.value);
                setQuickRange("none");
              }}
            />
          </Grid>

          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              type="date"
              label="Au"
              InputLabelProps={{ shrink: true }}
              value={to}
              onChange={(e) => {
                setTo(e.target.value);
                setQuickRange("none");
              }}
            />
          </Grid>

          <Grid item xs={12} md={3}>
            <ToggleButtonGroup
              fullWidth
              exclusive
              value={paidMode}
              onChange={(_, v) => v && setPaidMode(v)}
              size="small"
            >
              <ToggleButton value="all">Toutes</ToggleButton>
              <ToggleButton value="paidOnly">Payées uniquement</ToggleButton>
            </ToggleButtonGroup>
          </Grid>

          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              type="number"
              label="Limite du Top"
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value) || 20)}
              inputProps={{ min: 5, max: 200 }}
            />
          </Grid>

          <Grid item xs={12} md={8}>
            <TextField
              fullWidth
              label="Recherche (client / facture / n° commande)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchRoundedIcon />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>

          <Grid item xs={12} md={4}>
            <Stack direction="row" spacing={1}>
              <FormControl fullWidth size="small">
                <Select
                  value={quickRange}
                  onChange={(e) => applyQuickRange(e.target.value as any)}
                  displayEmpty
                >
                  <MenuItem value="thisMonth">Ce mois-ci (par défaut)</MenuItem>
                  <MenuItem value="30d">30 derniers jours</MenuItem>
                  <MenuItem value="90d">90 derniers jours</MenuItem>
                  <MenuItem value="ytd">Depuis le début de l'année</MenuItem>
                  <MenuItem value="none">Personnalisé</MenuItem>
                </Select>
              </FormControl>

              <Button
                variant="contained"
                onClick={() => loadAll()}
                disabled={refreshing}
                sx={{ minWidth: 120 }}
              >
                Actualiser
              </Button>
            </Stack>
          </Grid>

          {refreshing ? (
            <Grid item xs={12}>
              <LinearProgress />
            </Grid>
          ) : null}
        </Grid>
      </Paper>

      {/* KPI Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={3}>
          <MetricCard
            title="Total TTC"
            value={fmtMoney(summary?.totalTTC ?? 0)}
            subtitle={
              paidOnly
                ? "Chiffre TTC (commandes payées uniquement)"
                : "Chiffre TTC (toutes commandes)"
            }
            icon={<PaidRoundedIcon />}
          />
        </Grid>

        <Grid item xs={12} md={3}>
          <MetricCard
            title="Total HT"
            value={fmtMoney(summary?.totalHT ?? 0)}
            subtitle="Total hors taxe sur la période"
            icon={<ReceiptLongRoundedIcon />}
          />
        </Grid>

        <Grid item xs={12} md={3}>
          <MetricCard
            title="Promo TTC"
            value={fmtMoney(summary?.totalPromoTTC ?? 0)}
            subtitle="Total promotions appliquées"
            icon={<PercentRoundedIcon />}
          />
        </Grid>

        <Grid item xs={12} md={3}>
          <MetricCard
            title="Commandes"
            value={fmtInt(summary?.ordersCount ?? 0)}
            subtitle={`Panier moyen: ${fmtMoney(summary?.avgBasketTTC ?? 0)}`}
            icon={<TrendingUpRoundedIcon />}
            rightChip={`${kpiUnpaidCount} impayées`}
          />
        </Grid>
      </Grid>

      {/* Visual trend + Monthly table */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={5}>
          <SectionCard
            title="Tendance (derniers mois)"
            subtitle="Intensité = TTC relatif (sur les 8 derniers mois affichés)"
            right={
              <Chip
                size="small"
                variant="outlined"
                label="Visuel"
                icon={<TrendingUpRoundedIcon />}
              />
            }
          >
            {monthBars.length ? (
              <Stack spacing={1.2}>
                {monthBars.map((m) => (
                  <Box
                    key={m.month}
                    sx={{ display: "flex", alignItems: "center", gap: 1.2 }}
                  >
                    <Box sx={{ minWidth: 92 }}>
                      <Typography variant="body2" sx={{ fontWeight: 800 }}>
                        {fmtMonthLabel(m.month)}
                      </Typography>
                      <Typography variant="caption" sx={{ opacity: 0.7 }}>
                        {m.orders} commandes
                      </Typography>
                    </Box>

                    <Box sx={{ flex: 1 }}>
                      <LinearProgress
                        variant="determinate"
                        value={m.ratio * 100}
                        sx={{ height: 12, borderRadius: 999 }}
                      />
                    </Box>

                    <Box sx={{ minWidth: 140, textAlign: "right" }}>
                      <Typography variant="body2" sx={{ fontWeight: 900 }}>
                        {fmtMoney(m.totalTTC)}
                      </Typography>
                      <Typography variant="caption" sx={{ opacity: 0.7 }}>
                        promo {fmtMoney(m.totalPromoTTC)}
                      </Typography>
                    </Box>
                  </Box>
                ))}
              </Stack>
            ) : (
              <Typography variant="body2" sx={{ opacity: 0.7 }}>
                Aucune donnée pour cette période.
              </Typography>
            )}
          </SectionCard>
        </Grid>

        <Grid item xs={12} md={7}>
          <SectionCard
            title="Tendance mensuelle (détails)"
            subtitle="Table complète mensuelle"
            right={
              <Chip
                size="small"
                variant="outlined"
                label={`${monthly.length} lignes`}
              />
            }
          >
            <DenseTable
              head={[
                { label: "Mois" },
                { label: "Commandes", align: "right" },
                { label: "Total TTC", align: "right" },
                { label: "Promo TTC", align: "right" },
              ]}
            >
              {monthly.map((r) => (
                <TableRow key={r.month}>
                  <TableCell sx={{ fontWeight: 700 }}>
                    {fmtMonthLabel(r.month)}
                  </TableCell>
                  <TableCell align="right">{fmtInt(r.orders)}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 800 }}>
                    {fmtMoney(r.totalTTC)}
                  </TableCell>
                  <TableCell align="right">
                    {fmtMoney(r.totalPromoTTC)}
                  </TableCell>
                </TableRow>
              ))}
            </DenseTable>
          </SectionCard>
        </Grid>
      </Grid>

      {/* Distribution panels */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <SectionCard
            title="Méthodes de paiement"
            subtitle="Répartition TTC (barres)"
            right={
              <Chip
                size="small"
                variant="outlined"
                icon={<AccountBalanceRoundedIcon />}
                label="TTC"
              />
            }
          >
            {paymentBarItems.length ? (
              <PillBar items={paymentBarItems} formatValue={fmtMoney} />
            ) : (
              <Typography variant="body2" sx={{ opacity: 0.7 }}>
                Aucune donnée.
              </Typography>
            )}
          </SectionCard>
        </Grid>

        <Grid item xs={12} md={4}>
          <SectionCard
            title="Répartition par statut"
            subtitle="Répartition TTC par status"
            right={
              <Chip
                size="small"
                variant="outlined"
                icon={<LocalShippingRoundedIcon />}
                label="Opérations"
              />
            }
          >
            {statusBarItems.length ? (
              <PillBar items={statusBarItems} formatValue={fmtMoney} />
            ) : (
              <Typography variant="body2" sx={{ opacity: 0.7 }}>
                Aucune donnée.
              </Typography>
            )}
          </SectionCard>
        </Grid>

        <Grid item xs={12} md={4}>
          <SectionCard
            title="Ancienneté des créances"
            subtitle="Impayés par tranche"
            right={
              <Chip
                size="small"
                variant="outlined"
                icon={<WarningAmberRoundedIcon />}
                label="Risque"
              />
            }
          >
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {aging.map((r) => (
                <Chip
                  key={r.bucket}
                  label={`${r.bucket} jours • ${r.orders} • ${fmtMoney(r.totalTTC)}`}
                  variant="outlined"
                />
              ))}
            </Stack>
          </SectionCard>
        </Grid>
      </Grid>

      {/* Top lists */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <SectionCard
            title="Meilleures ventes"
            subtitle="Produits les plus vendus sur la période"
            right={
              <Chip
                size="small"
                variant="outlined"
                icon={<CategoryRoundedIcon />}
                label={`Top ${limit}`}
              />
            }
          >
            <DenseTable
              head={[
                { label: "Produit" },
                { label: "Qté", align: "right" },
                { label: "Total TTC", align: "right" },
              ]}
            >
              {topItems.map((r) => (
                <TableRow key={r.product_id}>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 800 }}>
                      {r.product?.name ?? `Produit #${r.product_id}`}
                    </Typography>
                    <Typography variant="caption" sx={{ opacity: 0.7 }}>
                      Variante : {r.product?.variant_id ?? "-"}
                    </Typography>
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 800 }}>
                    {fmtInt(r.qtySold)}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 900 }}>
                    {fmtMoney(r.totalTTC)}
                  </TableCell>
                </TableRow>
              ))}
            </DenseTable>
          </SectionCard>
        </Grid>

        <Grid item xs={12} md={6}>
          <SectionCard
            title="Top clients"
            subtitle="Meilleurs clients sur la période"
            right={
              <Chip
                size="small"
                variant="outlined"
                icon={<GroupsRoundedIcon />}
                label={`Top ${limit}`}
              />
            }
          >
            <DenseTable
              head={[
                { label: "Client" },
                { label: "Commandes", align: "right" },
                { label: "Total TTC", align: "right" },
              ]}
            >
              {topClients.map((r) => (
                <TableRow key={r.client_id}>
                  <TableCell>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1.2,
                      }}
                    >
                      <Avatar
                        sx={{
                          width: 34,
                          height: 34,
                          bgcolor: "action.hover",
                          color: "text.primary",
                        }}
                      >
                        {getInitials(r.client?.name)}
                      </Avatar>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 900 }}>
                          {r.client?.name ?? `Client #${r.client_id}`}
                        </Typography>
                        <Typography variant="caption" sx={{ opacity: 0.7 }}>
                          {(r.client?.responsable_name ?? "").trim()}
                          {r.client?.responsable_phone
                            ? ` • ${r.client.responsable_phone}`
                            : ""}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 800 }}>
                    {fmtInt(r.ordersCount)}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 900 }}>
                    {fmtMoney(r.totalTTC)}
                  </TableCell>
                </TableRow>
              ))}
            </DenseTable>
          </SectionCard>
        </Grid>
      </Grid>

      {/* Ops lists */}
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <SectionCard
            title="Commandes impayées"
            subtitle="À relancer (impayés)"
            right={
              <Chip
                color="warning"
                variant="outlined"
                label={`${filteredUnpaid.length}`}
              />
            }
          >
            <DenseTable
              head={[
                { label: "Commande" },
                { label: "Client" },
                { label: "Total TTC", align: "right" },
              ]}
            >
              {filteredUnpaid.map((o) => (
                <TableRow key={o.id} hover>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 900 }}>
                      #{o.id}
                    </Typography>
                    <Typography variant="caption" sx={{ opacity: 0.7 }}>
                      {fmtDateTime(o.created_at)}
                      {o.invoice_number ? ` • ${o.invoice_number}` : ""}
                    </Typography>
                    <Box sx={{ mt: 0.7 }}>
                      <Chip size="small" variant="outlined" label={getStatusLabel(o.status)} />
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 800 }}>
                      {o.client.name}
                    </Typography>
                    <Typography variant="caption" sx={{ opacity: 0.7 }}>
                      {o.client.responsable_phone ||
                        o.client.responsable_email ||
                        ""}
                    </Typography>
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 900 }}>
                    {fmtMoney(o.total_ttc)}
                  </TableCell>
                </TableRow>
              ))}
            </DenseTable>

            {!filteredUnpaid.length ? (
              <Typography variant="body2" sx={{ opacity: 0.7, mt: 1.5 }}>
                Aucun impayé sur cette période.
              </Typography>
            ) : null}
          </SectionCard>
        </Grid>

        <Grid item xs={12} md={6}>
          <SectionCard
            title="Retenue à la source en attente"
            subtitle="Attestation / document RS à récupérer"
            right={
              <Chip
                color="warning"
                variant="outlined"
                label={`${filteredWithholding.length}`}
              />
            }
          >
            <DenseTable
              head={[
                { label: "Commande" },
                { label: "Client" },
                { label: "Total TTC", align: "right" },
              ]}
            >
              {filteredWithholding.map((o) => (
                <TableRow key={o.id} hover>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 900 }}>
                      #{o.id}
                    </Typography>
                    <Typography variant="caption" sx={{ opacity: 0.7 }}>
                      {fmtDateTime(o.created_at)}
                      {o.invoice_number ? ` • ${o.invoice_number}` : ""}
                    </Typography>
                    <Box sx={{ mt: 0.7 }}>
                      <Chip
                        size="small"
                        variant="outlined"
                        label={o.withholding_received ? "Reçue" : "En attente"}
                      />
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 800 }}>
                      {o.client.name}
                    </Typography>
                    <Typography variant="caption" sx={{ opacity: 0.7 }}>
                      {o.client.responsable_phone ||
                        o.client.responsable_email ||
                        ""}
                    </Typography>
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 900 }}>
                    {fmtMoney(o.total_ttc)}
                  </TableCell>
                </TableRow>
              ))}
            </DenseTable>

            {!filteredWithholding.length ? (
              <Typography variant="body2" sx={{ opacity: 0.7, mt: 1.5 }}>
                Aucun document withholding en attente sur cette période.
              </Typography>
            ) : null}
          </SectionCard>
        </Grid>
      </Grid>
    </Box>
  );
};

export default B2BOrdersStats;