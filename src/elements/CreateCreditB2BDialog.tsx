// elements/CreateCreditB2BDialog.tsx
//
// Génère un avoir (total ou partiel) pour une commande B2B existante, ouvert
// depuis la section "Avoirs" de OrderB2BDetailDrawer.tsx. Même flux que la
// création de facture dans CreateOrderB2B.tsx (numéro -> PDF -> dépôt Drive
// -> attache), mais condensé dans une modale puisqu'il n'y a pas de sélection
// de client/produits à refaire - juste des quantités à ajuster sur une
// commande qui existe déjà.

import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  RadioGroup,
  FormControlLabel,
  Radio,
  Typography,
  Box,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Checkbox,
} from "@mui/material";
import html2pdf from "html2pdf.js";
import { generateCreditNoteHTML } from "../pages/utils/creditNoteTemplate";
import {
  OrderB2BDetail,
  CreditType,
  getCreditedQuantityByItem,
} from "./OrderB2BDetailDrawer";

interface CreateCreditB2BDialogProps {
  open: boolean;
  order: OrderB2BDetail | null;
  onClose: () => void;
  onCreated: (updated: OrderB2BDetail) => void;
  onNotify: (message: string, status: "success" | "error") => void;
}

const round2 = (n: number) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

const CreateCreditB2BDialog: React.FC<CreateCreditB2BDialogProps> = ({
  open,
  order,
  onClose,
  onCreated,
  onNotify,
}) => {
  const [type, setType] = useState<CreditType>("TOTAL");
  const [creditDate, setCreditDate] = useState<string>(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [skipRestock, setSkipRestock] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Réinitialise le formulaire à chaque ouverture.
  useEffect(() => {
    if (!open) return;
    setType("TOTAL");
    setCreditDate(new Date().toISOString().slice(0, 10));
    setQuantities({});
    setSkipRestock(false);
  }, [open, order?.id]);

  const remainingByItem = useMemo(() => {
    const map = new Map<number, number>();
    if (!order) return map;
    const credited = getCreditedQuantityByItem(order);
    for (const item of order.items) {
      map.set(item.id, item.quantity - (credited.get(item.id) ?? 0));
    }
    return map;
  }, [order]);

  const lines = useMemo(() => {
    if (!order) return [];
    return order.items
      .map((item) => {
        const remaining = remainingByItem.get(item.id) ?? 0;
        const qty =
          type === "TOTAL"
            ? remaining
            : Math.max(0, Math.min(quantities[item.id] ?? 0, remaining));
        return { item, remaining, qty };
      })
      .filter((l) => l.remaining > 0);
  }, [order, remainingByItem, type, quantities]);

  const creditedLines = lines.filter((l) => l.qty > 0);

  const estimatedTotals = useMemo(() => {
    let ht = 0;
    let ttc = 0;
    for (const line of creditedLines) {
      const unitHt = Number(line.item.unit_price_ht);
      const tvaRate = Number(line.item.tva_rate);
      ht += unitHt * line.qty;
      ttc += unitHt * line.qty * (1 + tvaRate);
    }
    return { ht: round2(ht), ttc: round2(ttc) };
  }, [creditedLines]);

  const handleQuantityChange = (itemId: number, value: string, remaining: number) => {
    const n = Math.max(0, Math.min(Math.floor(Number(value) || 0), remaining));
    setQuantities((prev) => ({ ...prev, [itemId]: n }));
  };

  const handleSubmit = async () => {
    if (!order) return;
    if (creditedLines.length === 0) {
      onNotify("Sélectionnez au moins une quantité à créditer.", "error");
      return;
    }

    try {
      setSubmitting(true);

      const { data: numberData } = await axios.get<{ invoiceNumber: string }>(
        `${import.meta.env.VITE_API_URL}invoices/next-number`,
        { params: { effectiveDate: creditDate, isCredit: true } },
      );
      const creditNumber = numberData.invoiceNumber;

      const html = generateCreditNoteHTML(
        order.client,
        creditedLines.map((l) => ({
          name: l.item.product.name,
          quantity: l.qty,
          price_ht: Number(l.item.unit_price_ht),
          tva_rate: Number(l.item.tva_rate),
        })),
        creditNumber,
        creditDate,
        order.invoice_number,
        type,
      );

      // pagebreak mode "avoid-all" + "css" : voir CreateOrderB2B.tsx.
      const pdfBlob = (await html2pdf()
        .set({ pagebreak: { mode: ["avoid-all", "css", "legacy"] } } as any)
        .from(html)
        .outputPdf("blob")) as Blob;

      const formData = new FormData();
      formData.append(
        "file",
        new File([pdfBlob], `avoir-${creditNumber}.pdf`, { type: "application/pdf" }),
      );
      formData.append("effectiveDate", creditDate);

      const { data: depositData } = await axios.post<{
        url: string;
        invoiceNumber: string;
      }>(`${import.meta.env.VITE_API_URL}invoices/deposit-b2b-credit-auto`, formData);

      const { data: updatedOrder } = await axios.post<OrderB2BDetail>(
        `${import.meta.env.VITE_API_URL}order-b2b/${order.id}/credit`,
        {
          type,
          items: creditedLines.map((l) => ({
            order_item_id: l.item.id,
            quantity: l.qty,
          })),
          credit_number: depositData.invoiceNumber,
          credit_pdf_url: depositData.url,
          credit_date: creditDate,
          skip_restock: skipRestock,
        },
      );

      onCreated(updatedOrder);
      onNotify(`Avoir ${depositData.invoiceNumber} généré avec succès.`, "success");
      onClose();
    } catch (err: any) {
      onNotify(
        err.response?.data?.message || "Échec de la génération de l'avoir.",
        "error",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!order) return null;

  return (
    <Dialog
      open={open}
      onClose={submitting ? undefined : onClose}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>Générer un avoir — Commande #{order.id}</DialogTitle>
      <DialogContent dividers>
        <RadioGroup
          row
          value={type}
          onChange={(e) => setType(e.target.value as CreditType)}
          sx={{ mb: 2 }}
        >
          <FormControlLabel value="TOTAL" control={<Radio />} label="Avoir total" />
          <FormControlLabel value="PARTIAL" control={<Radio />} label="Avoir partiel" />
        </RadioGroup>

        <TextField
          label="Date de l'avoir"
          type="date"
          size="small"
          fullWidth
          value={creditDate}
          onChange={(e) => setCreditDate(e.target.value)}
          InputLabelProps={{ shrink: true }}
          sx={{ mb: 2 }}
        />

        {lines.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            Tous les articles de cette commande ont déjà été intégralement crédités.
          </Typography>
        ) : (
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Produit</TableCell>
                  <TableCell align="right">Restant créditable</TableCell>
                  <TableCell align="right">Qté à créditer</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {lines.map(({ item, remaining }) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.product.name}</TableCell>
                    <TableCell align="right">{remaining}</TableCell>
                    <TableCell align="right">
                      {type === "TOTAL" ? (
                        remaining
                      ) : (
                        <TextField
                          type="number"
                          size="small"
                          value={quantities[item.id] ?? 0}
                          onChange={(e) =>
                            handleQuantityChange(item.id, e.target.value, remaining)
                          }
                          inputProps={{
                            min: 0,
                            max: remaining,
                            style: { textAlign: "right", width: 60 },
                          }}
                        />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        <Box sx={{ mt: 2, display: "flex", justifyContent: "space-between" }}>
          <Typography variant="body2" color="text.secondary">
            Montant estimé de l'avoir
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 700 }}>
            {estimatedTotals.ttc.toFixed(2)} DT TTC
          </Typography>
        </Box>

        <FormControlLabel
          sx={{ mt: 1 }}
          control={
            <Checkbox
              size="small"
              checked={skipRestock}
              onChange={(e) => setSkipRestock(e.target.checked)}
            />
          }
          label={
            <Typography variant="body2">
              Stock déjà réajusté manuellement (ne pas réajuster)
            </Typography>
          }
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={submitting}>
          Annuler
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={submitting || creditedLines.length === 0}
          startIcon={submitting ? <CircularProgress size={16} /> : undefined}
        >
          Générer l'avoir
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CreateCreditB2BDialog;
