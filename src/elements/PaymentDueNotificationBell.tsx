// PaymentDueNotificationBell.tsx - cloche de notification globale (visible
// sur toutes les pages, pas seulement la liste des paiements). Deux
// catégories à contrôler, doublées par un récap email quotidien à 10h (voir
// PaymentInstrumentService.notifyDueInstruments, backend) - demande
// utilisateur du 2026-07-25 :
// 1. Chèques/virements/traites PENDING dont la date d'encaissement est atteinte.
// 2. Commandes impayées dont l'échéance est dépassée (à relancer le client).
import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Badge, Box, IconButton, Menu, MenuItem, Typography, Divider } from "@mui/material";
import NotificationsIcon from "@mui/icons-material/Notifications";
import { useNavigate } from "react-router-dom";
import { PaymentInstrument, TYPE_LABELS, isOverdue } from "../pages/paymentInstruments/shared";

interface OverdueUnpaidOrder {
  id: number;
  invoice_number: string | null;
  client_name: string;
  total_ttc: number;
  remaining: number;
  effective_due_date: string;
}

// Poll léger - même esprit que le reste de freyaOMS (pas de webhook/SSE),
// suffisant pour des compteurs qui ne bougent qu'au fil des journées.
const POLL_INTERVAL_MS = 60_000;

const daysLate = (date: string) =>
  Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));

const PaymentDueNotificationBell: React.FC = () => {
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [dueInstruments, setDueInstruments] = useState<PaymentInstrument[]>([]);
  const [overdueOrders, setOverdueOrders] = useState<OverdueUnpaidOrder[]>([]);

  const loadDue = () => {
    axios
      .get<PaymentInstrument[]>(`${import.meta.env.VITE_API_URL}payment-instruments`, {
        params: { status: "PENDING" },
      })
      .then((res) => setDueInstruments(res.data.filter(isOverdue)))
      .catch(() => setDueInstruments([]));

    axios
      .get<OverdueUnpaidOrder[]>(`${import.meta.env.VITE_API_URL}order-b2b/stats/overdue-unpaid`)
      .then((res) => setOverdueOrders(res.data))
      .catch(() => setOverdueOrders([]));
  };

  useEffect(() => {
    loadDue();
    const interval = setInterval(loadDue, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  const sortedInstruments = useMemo(
    () => [...dueInstruments].sort((a, b) => new Date(a.expected_date).getTime() - new Date(b.expected_date).getTime()),
    [dueInstruments],
  );

  const sortedOrders = useMemo(
    () => [...overdueOrders].sort((a, b) => new Date(a.effective_due_date).getTime() - new Date(b.effective_due_date).getTime()),
    [overdueOrders],
  );

  const totalCount = sortedInstruments.length + sortedOrders.length;

  const handleOpen = (e: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(e.currentTarget);
    loadDue();
  };

  const handleGoToPayments = () => {
    setAnchorEl(null);
    navigate("/b2b/payments");
  };

  const handleGoToOrders = () => {
    setAnchorEl(null);
    navigate("/b2b/orders/all");
  };

  return (
    <>
      <IconButton color="inherit" size="small" title="Paiements à contrôler" onClick={handleOpen}>
        <Badge badgeContent={totalCount} color="error">
          <NotificationsIcon fontSize="small" />
        </Badge>
      </IconButton>

      <Menu anchorEl={anchorEl} open={!!anchorEl} onClose={() => setAnchorEl(null)} PaperProps={{ sx: { width: 360 } }}>
        <Box sx={{ px: 2, py: 1 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            Encaissements à faire
          </Typography>
        </Box>
        <Divider />
        {sortedInstruments.length === 0 ? (
          <MenuItem disabled>
            <Typography variant="body2" color="text.secondary">
              Rien à encaisser pour le moment.
            </Typography>
          </MenuItem>
        ) : (
          sortedInstruments.slice(0, 5).map((i) => (
            <MenuItem key={`instrument-${i.id}`} onClick={handleGoToPayments} sx={{ whiteSpace: "normal" }}>
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {i.client.name} - {Number(i.amount).toFixed(2)} DT ({TYPE_LABELS[i.type]})
                </Typography>
                <Typography variant="caption" color="error">
                  {daysLate(i.expected_date) > 0
                    ? `${daysLate(i.expected_date)} jour(s) de retard`
                    : "Échéance aujourd'hui"}
                </Typography>
              </Box>
            </MenuItem>
          ))
        )}

        <Box sx={{ px: 2, py: 1 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            Commandes impayées en retard
          </Typography>
        </Box>
        <Divider />
        {sortedOrders.length === 0 ? (
          <MenuItem disabled>
            <Typography variant="body2" color="text.secondary">
              Aucune commande en retard de paiement.
            </Typography>
          </MenuItem>
        ) : (
          sortedOrders.slice(0, 5).map((o) => (
            <MenuItem key={`order-${o.id}`} onClick={handleGoToOrders} sx={{ whiteSpace: "normal" }}>
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {o.client_name} - {o.remaining.toFixed(2)} DT ({o.invoice_number || `#${o.id}`})
                </Typography>
                <Typography variant="caption" color="error">
                  {daysLate(o.effective_due_date)} jour(s) de retard
                </Typography>
              </Box>
            </MenuItem>
          ))
        )}

        {totalCount > 0 && (
          <>
            <Divider />
            <MenuItem onClick={handleGoToPayments}>
              <Typography variant="body2" color="primary.main" sx={{ fontWeight: 600 }}>
                Voir tous les paiements
              </Typography>
            </MenuItem>
          </>
        )}
      </Menu>
    </>
  );
};

export default PaymentDueNotificationBell;
