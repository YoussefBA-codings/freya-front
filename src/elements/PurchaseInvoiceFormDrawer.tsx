import { useEffect, useState } from "react";
import axios from "axios";
import {
  Box,
  Typography,
  TextField,
  Button,
  CircularProgress,
  Drawer,
  IconButton,
  Divider,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import RefreshIcon from "@mui/icons-material/Refresh";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { format } from "date-fns";
import { PurchaseInvoice } from "../pages/PurchaseInvoices";

interface PurchaseInvoiceFormDrawerProps {
  open: boolean;
  onClose: () => void;
  initialValue: PurchaseInvoice | null;
  defaultExpenseMonth: Date;
  onSaved: () => void;
}

const sumAmounts = (values: {
  montant_ht: string;
  tva: string;
  fodec: string;
  timbre_facture: string;
  timbre_telephonie: string;
}) => {
  const total =
    (Number(values.montant_ht) || 0) +
    (Number(values.tva) || 0) +
    (Number(values.fodec) || 0) +
    (Number(values.timbre_facture) || 0) +
    (Number(values.timbre_telephonie) || 0);

  return total ? String(Number(total.toFixed(3))) : "";
};

const emptyForm = (defaultExpenseMonth: Date) => ({
  supplier_name: "",
  invoice_number: "",
  invoice_date: new Date(),
  expense_month: defaultExpenseMonth,
  montant_ht: "",
  tva: "",
  timbre_facture: "1",
  timbre_telephonie: "0",
  fodec: "0",
  montant_ttc: "",
  comment: "",
});

const PurchaseInvoiceFormDrawer: React.FC<PurchaseInvoiceFormDrawerProps> = ({
  open,
  onClose,
  initialValue,
  defaultExpenseMonth,
  onSaved,
}) => {
  const [form, setForm] = useState(emptyForm(defaultExpenseMonth));
  const [ttcManuallyEdited, setTtcManuallyEdited] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);

  useEffect(() => {
    if (!open) return;

    if (initialValue) {
      setForm({
        supplier_name: initialValue.supplier_name,
        invoice_number: initialValue.invoice_number,
        invoice_date: new Date(initialValue.invoice_date),
        expense_month: new Date(`${initialValue.expense_month}-01`),
        montant_ht: String(initialValue.montant_ht),
        tva: String(initialValue.tva),
        timbre_facture: String(initialValue.timbre_facture),
        timbre_telephonie: String(initialValue.timbre_telephonie),
        fodec: String(initialValue.fodec),
        montant_ttc: String(initialValue.montant_ttc),
        comment: initialValue.comment || "",
      });
      setTtcManuallyEdited(true);
    } else {
      setForm(emptyForm(defaultExpenseMonth));
      setTtcManuallyEdited(false);
    }
    setPdfFile(null);
    setError(null);
  }, [open, initialValue, defaultExpenseMonth]);

  useEffect(() => {
    if (ttcManuallyEdited) return;
    setForm((prev) => ({ ...prev, montant_ttc: sumAmounts(prev) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    form.montant_ht,
    form.tva,
    form.fodec,
    form.timbre_facture,
    form.timbre_telephonie,
    ttcManuallyEdited,
  ]);

  const handleRecalculateTtc = () => {
    setTtcManuallyEdited(false);
    setForm((prev) => ({ ...prev, montant_ttc: sumAmounts(prev) }));
  };

  const handleSubmit = async () => {
    if (
      !form.supplier_name.trim() ||
      !form.invoice_number.trim() ||
      !form.invoice_date ||
      !form.expense_month ||
      form.montant_ht === "" ||
      form.tva === "" ||
      form.montant_ttc === ""
    ) {
      setError("Veuillez remplir tous les champs obligatoires.");
      return;
    }

    if (!pdfFile) {
      setError("Veuillez joindre le PDF de la facture.");
      return;
    }

    setError(null);
    setSaving(true);

    const payload = {
      supplier_name: form.supplier_name.trim(),
      invoice_number: form.invoice_number.trim(),
      invoice_date: format(form.invoice_date, "yyyy-MM-dd"),
      expense_month: format(form.expense_month, "yyyy-MM"),
      montant_ht: Number(form.montant_ht),
      tva: Number(form.tva),
      timbre_facture: Number(form.timbre_facture) || 0,
      timbre_telephonie: Number(form.timbre_telephonie) || 0,
      fodec: Number(form.fodec) || 0,
      montant_ttc: Number(form.montant_ttc),
      comment: form.comment.trim() || null,
    };

    const savePromise = initialValue
      ? axios.patch(
          `${import.meta.env.VITE_API_URL}purchase-invoices/${initialValue.id}`,
          payload,
        )
      : axios.post(`${import.meta.env.VITE_API_URL}purchase-invoices`, payload);

    const documentData = new FormData();
    documentData.append("file", pdfFile);
    documentData.append("date", format(form.invoice_date, "yyyy-MM-dd"));
    const uploadPromise = axios.post(
      `${import.meta.env.VITE_API_URL}purchase-invoices/document`,
      documentData,
      { headers: { "Content-Type": "multipart/form-data" } },
    );

    const [saveResult, uploadResult] = await Promise.allSettled([
      savePromise,
      uploadPromise,
    ]);

    if (saveResult.status === "rejected") {
      console.error("Failed to save purchase invoice:", saveResult.reason);
      setError("Erreur lors de l'enregistrement de la facture.");
      setSaving(false);
      return;
    }

    if (uploadResult.status === "rejected") {
      console.error("Failed to upload invoice PDF:", uploadResult.reason);
      setError("Facture enregistrée, mais échec de l'envoi du PDF.");
      setSaving(false);
      return;
    }

    setSaving(false);
    onSaved();
  };

  return (
    <Drawer anchor="right" open={open} onClose={onClose}>
      <Box sx={{ width: { xs: "100vw", sm: 420 }, p: 3 }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 2,
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            {initialValue ? "Modifier la facture" : "Nouvelle facture d'achat"}
          </Typography>
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>

        <Divider sx={{ mb: 3 }} />

        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <TextField
            label="Nom du fournisseur"
            value={form.supplier_name}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, supplier_name: e.target.value }))
            }
            required
            fullWidth
          />

          <TextField
            label="Numéro de facture"
            value={form.invoice_number}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, invoice_number: e.target.value }))
            }
            required
            fullWidth
          />

          <DatePicker
            label="Date facture"
            value={form.invoice_date}
            onChange={(v) =>
              v && setForm((prev) => ({ ...prev, invoice_date: v }))
            }
            slotProps={{ textField: { fullWidth: true, required: true } }}
          />

          <DatePicker
            label="Mois/année de la dépense"
            views={["year", "month"]}
            value={form.expense_month}
            onChange={(v) =>
              v && setForm((prev) => ({ ...prev, expense_month: v }))
            }
            slotProps={{ textField: { fullWidth: true, required: true } }}
          />

          <TextField
            label="Montant HT"
            type="number"
            value={form.montant_ht}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, montant_ht: e.target.value }))
            }
            required
            fullWidth
          />

          <TextField
            label="TVA"
            type="number"
            value={form.tva}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, tva: e.target.value }))
            }
            required
            fullWidth
          />

          <TextField
            label="FODEC"
            type="number"
            value={form.fodec}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, fodec: e.target.value }))
            }
            fullWidth
          />

          <TextField
            label="Timbre sur téléphonie et internet"
            type="number"
            value={form.timbre_telephonie}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                timbre_telephonie: e.target.value,
              }))
            }
            fullWidth
          />

          <TextField
            label="Timbre sur facture"
            type="number"
            value={form.timbre_facture}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, timbre_facture: e.target.value }))
            }
            fullWidth
          />

          <TextField
            label="Montant TTC"
            type="number"
            value={form.montant_ttc}
            onChange={(e) => {
              setTtcManuallyEdited(true);
              setForm((prev) => ({ ...prev, montant_ttc: e.target.value }));
            }}
            required
            fullWidth
            InputProps={{
              endAdornment: (
                <IconButton
                  size="small"
                  title="Recalculer automatiquement"
                  onClick={handleRecalculateTtc}
                >
                  <RefreshIcon fontSize="small" />
                </IconButton>
              ),
            }}
          />

          <Box>
            <Button
              variant="outlined"
              component="label"
              fullWidth
              color={!pdfFile && error ? "error" : "primary"}
            >
              {pdfFile ? pdfFile.name : "Joindre le PDF de la facture *"}
              <input
                type="file"
                accept="application/pdf"
                hidden
                onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
              />
            </Button>
            {pdfFile && (
              <Typography
                variant="caption"
                onClick={() => setPdfFile(null)}
                sx={{
                  display: "inline-block",
                  mt: 0.5,
                  cursor: "pointer",
                  color: "primary.main",
                  fontWeight: 700,
                }}
              >
                Retirer le PDF
              </Typography>
            )}
          </Box>

          <TextField
            label="Commentaire"
            value={form.comment}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, comment: e.target.value }))
            }
            multiline
            minRows={2}
            fullWidth
          />

          {error && (
            <Typography color="error" variant="body2">
              {error}
            </Typography>
          )}

          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={saving}
            sx={{ mt: 1 }}
          >
            {saving ? <CircularProgress size={24} /> : "Enregistrer"}
          </Button>
        </Box>
      </Box>
    </Drawer>
  );
};

export default PurchaseInvoiceFormDrawer;
