// DeclarePaymentInstrument.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
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
  Button,
  Chip,
  Tooltip,
  Snackbar,
  SnackbarContent,
  Card,
  CardContent,
  Alert,
} from "@mui/material";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { useNavigate } from "react-router-dom";
import {
  ClientB2B,
  InstrumentType,
  OutstandingOrder,
  errorMessageOf,
} from "./paymentInstruments/shared";

const DeclarePaymentInstrument: React.FC = () => {
  const navigate = useNavigate();
  const [clients, setClients] = useState<ClientB2B[]>([]);

  const [clientId, setClientId] = useState<number | "">("");
  const [type, setType] = useState<InstrumentType>("CHEQUE");
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [expectedDate, setExpectedDate] = useState<Date | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Justificatif (photo/scan du chèque/traite ou reçu de virement) -
  // optionnel dès la déclaration, mais ajoutable/remplaçable à tout moment
  // depuis la liste des paiements (voir PaymentInstrumentsList).
  const [justificatifFile, setJustificatifFile] = useState<File | null>(null);
  const justificatifInputRef = useRef<HTMLInputElement>(null);

  // Résumé des commandes impayées du client sélectionné - même ordre que la
  // répartition FIFO les traiterait (la plus ancienne d'abord).
  const [outstandingOrders, setOutstandingOrders] = useState<OutstandingOrder[]>([]);
  // Chèques/virements/traites déjà déclarés (PENDING) pour ce client - à
  // soustraire du total impayé pour estimer le reste à payer réel (voir
  // backend PaymentInstrumentService.getOutstandingOrders).
  const [pendingInstrumentsTotal, setPendingInstrumentsTotal] = useState(0);
  const [loadingOutstanding, setLoadingOutstanding] = useState(false);

  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [notifyMessage, setNotifyMessage] = useState("");
  const [notifyStatus, setNotifyStatus] = useState<"success" | "error">("success");

  const notify = (message: string, status: "success" | "error") => {
    setNotifyMessage(message);
    setNotifyStatus(status);
    setSnackbarOpen(true);
  };

  useEffect(() => {
    axios
      .get<ClientB2B[]>(`${import.meta.env.VITE_API_URL}client-b2b`)
      .then((res) => setClients(res.data))
      .catch(() => setClients([]));
  }, []);

  useEffect(() => {
    if (!clientId) {
      setOutstandingOrders([]);
      setPendingInstrumentsTotal(0);
      return;
    }
    setLoadingOutstanding(true);
    axios
      .get<{ orders: OutstandingOrder[]; pendingInstrumentsTotal: number }>(
        `${import.meta.env.VITE_API_URL}payment-instruments/outstanding/${clientId}`,
      )
      .then((res) => {
        setOutstandingOrders(res.data.orders);
        setPendingInstrumentsTotal(res.data.pendingInstrumentsTotal);
      })
      .catch(() => {
        setOutstandingOrders([]);
        setPendingInstrumentsTotal(0);
      })
      .finally(() => setLoadingOutstanding(false));
  }, [clientId]);

  const outstandingTotal = useMemo(
    () => outstandingOrders.reduce((sum, o) => sum + o.remaining, 0),
    [outstandingOrders],
  );

  // Reste à payer réel estimé : le total impayé moins ce qui est déjà
  // couvert par d'autres chèques/virements/traites en attente pour ce
  // client (pas encore confirmés, donc pas encore déduit de `remaining`
  // ci-dessus). Purement indicatif - n'empêche jamais de déclarer, voir
  // amountExceedsEstimate.
  const estimatedRemaining = Math.max(0, outstandingTotal - pendingInstrumentsTotal);

  // Avertissement en temps réel, jamais bloquant (décision équipe
  // 2026-07-25 : un chèque peut légitimement arriver un peu au-dessus - le
  // reliquat non affecté est juste signalé à la confirmation, pas de crédit
  // client en v1).
  const amountExceedsEstimate =
    !!clientId && !loadingOutstanding && amount !== "" && Number(amount) > estimatedRemaining + 0.001;

  const handleDeclare = async () => {
    if (!clientId) return notify("Choisissez un client.", "error");
    const amountNum = Number(amount);
    if (!(amountNum > 0)) return notify("Le montant doit être positif.", "error");
    if (!expectedDate) return notify("La date d'encaissement prévue est requise.", "error");
    if (loadingOutstanding) return notify("Chargement des commandes impayées en cours, réessayez.", "error");

    setSubmitting(true);
    try {
      const res = await axios.post<{ id: number }>(`${import.meta.env.VITE_API_URL}payment-instruments`, {
        client_id: clientId,
        type,
        amount: amountNum,
        reference: reference.trim() || undefined,
        expected_date: expectedDate.toISOString().slice(0, 10),
      });

      // Le justificatif n'est joint qu'une fois l'instrument créé (il faut
      // son id) - un échec ici n'annule jamais la déclaration, qui a déjà
      // réussi : on informe juste l'utilisateur qu'il peut le rajouter
      // depuis la liste des paiements.
      if (justificatifFile) {
        try {
          const formData = new FormData();
          formData.append("file", justificatifFile);
          await axios.post(
            `${import.meta.env.VITE_API_URL}payment-instruments/${res.data.id}/justificatif`,
            formData,
            { headers: { "Content-Type": "multipart/form-data" } },
          );
          notify("Déclaré avec justificatif - il apparaît dans la liste en attente.", "success");
        } catch {
          notify(
            "Déclaré, mais l'envoi du justificatif a échoué - vous pouvez le rajouter depuis la liste des paiements.",
            "error",
          );
        }
      } else {
        notify("Déclaré - il apparaît dans la liste en attente.", "success");
      }

      setClientId("");
      setType("CHEQUE");
      setAmount("");
      setReference("");
      setExpectedDate(null);
      setJustificatifFile(null);
    } catch (error) {
      notify(errorMessageOf(error), "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 1, flexWrap: "wrap", gap: 1 }}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          Déclarer un paiement
        </Typography>
        <Button variant="outlined" onClick={() => navigate("/b2b/payments")}>
          Voir les paiements
        </Button>
      </Box>
      <Typography variant="subtitle1" sx={{ mb: 3 }}>
        Déclarez un chèque, virement ou traite reçu. Rien ne change sur les commandes du client tant que
        l&apos;encaissement n&apos;est pas confirmé depuis la liste des paiements.
      </Typography>

      <Card variant="outlined">
        <CardContent>
          <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", alignItems: "flex-start" }}>
            <FormControl sx={{ minWidth: 220 }}>
              <InputLabel>Client</InputLabel>
              <Select
                label="Client"
                value={clientId}
                onChange={(e: SelectChangeEvent<number | "">) => setClientId(e.target.value as number | "")}
              >
                {clients.map((c) => (
                  <MenuItem key={c.id} value={c.id}>
                    {c.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl sx={{ minWidth: 160 }}>
              <InputLabel>Type</InputLabel>
              <Select label="Type" value={type} onChange={(e: SelectChangeEvent) => setType(e.target.value as InstrumentType)}>
                <MenuItem value="CHEQUE">Chèque</MenuItem>
                <MenuItem value="VIREMENT">Virement</MenuItem>
                <MenuItem value="TRAITE">Traite</MenuItem>
              </Select>
            </FormControl>

            <TextField
              label="Montant (DT)"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              inputProps={{ min: 0, step: "0.001" }}
              sx={{ width: 160 }}
            />

            <TextField
              label="Référence (n° chèque/traite, optionnel)"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              sx={{ minWidth: 220 }}
            />

            <DatePicker
              label="Date d'encaissement prévue"
              value={expectedDate}
              onChange={(v) => setExpectedDate(v)}
            />

            <Button
              variant="outlined"
              startIcon={<AttachFileIcon />}
              onClick={() => justificatifInputRef.current?.click()}
              sx={{ height: 56 }}
            >
              {justificatifFile ? justificatifFile.name : "Justificatif (optionnel)"}
            </Button>
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              ref={justificatifInputRef}
              style={{ display: "none" }}
              onChange={(e) => setJustificatifFile(e.target.files?.[0] ?? null)}
            />

            <Button
              variant="contained"
              onClick={handleDeclare}
              disabled={submitting}
              sx={{ height: 56 }}
            >
              {submitting ? <CircularProgress size={20} /> : "Déclarer"}
            </Button>
          </Box>

          {amountExceedsEstimate && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              Ce montant ({Number(amount).toFixed(2)} DT) dépasse le reste à payer estimé pour ce
              client ({estimatedRemaining.toFixed(2)} DT
              {pendingInstrumentsTotal > 0
                ? `, déjà couvert à hauteur de ${pendingInstrumentsTotal.toFixed(2)} DT par d'autres paiements en attente`
                : ""}
              ). La déclaration reste possible, mais une partie du montant pourrait ne pas être
              affectée à une commande lors de la confirmation.
            </Alert>
          )}

          {clientId && (
            <Box sx={{ mt: 2, pt: 2, borderTop: "1px solid", borderColor: "divider" }}>
              {loadingOutstanding ? (
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <CircularProgress size={16} />
                  <Typography variant="body2" color="text.secondary">
                    Chargement des commandes impayées...
                  </Typography>
                </Box>
              ) : outstandingOrders.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  Ce client n&apos;a aucune commande impayée pour le moment.
                </Typography>
              ) : (
                <>
                  <Typography variant="body2" sx={{ fontWeight: 600, mb: pendingInstrumentsTotal > 0 ? 0.5 : 1 }}>
                    {outstandingOrders.length} commande(s) impayée(s) - {outstandingTotal.toFixed(2)} DT au total
                    (ordre dans lequel un encaissement les couvrirait) :
                  </Typography>
                  {pendingInstrumentsTotal > 0 && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
                      Dont {pendingInstrumentsTotal.toFixed(2)} DT déjà couverts par d&apos;autres paiements en
                      attente de confirmation - reste à payer estimé : {estimatedRemaining.toFixed(2)} DT.
                    </Typography>
                  )}
                  <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                    {outstandingOrders.map((o) => {
                      const hasWithholding = o.payable_amount < o.total_ttc;
                      const hasPartialPayment = o.remaining < o.payable_amount;
                      return (
                        <Tooltip
                          key={o.id}
                          title={
                            hasWithholding
                              ? `Commande de ${o.total_ttc.toFixed(2)} DT, retenue à la source de 1% déduite (montant à encaisser: ${o.payable_amount.toFixed(2)} DT)`
                              : ""
                          }
                        >
                          <Chip
                            size="small"
                            label={`#${o.id}${o.invoice_number ? ` (${o.invoice_number})` : ""} - ${o.remaining.toFixed(2)} DT${hasWithholding ? " (retenue 1% déduite)" : ""}${hasPartialPayment ? " restant" : ""}`}
                          />
                        </Tooltip>
                      );
                    })}
                  </Box>
                </>
              )}
            </Box>
          )}
        </CardContent>
      </Card>

      <Snackbar open={snackbarOpen} autoHideDuration={3000} onClose={() => setSnackbarOpen(false)}>
        <SnackbarContent
          message={notifyMessage}
          sx={{ backgroundColor: notifyStatus === "error" ? "red" : "green" }}
        />
      </Snackbar>
    </Box>
  );
};

export default DeclarePaymentInstrument;
