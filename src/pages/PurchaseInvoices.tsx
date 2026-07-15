import { useEffect, useState } from "react";
import axios from "axios";
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableFooter,
  TableHead,
  TableRow,
  Paper,
  Snackbar,
  SnackbarContent,
  Tooltip,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { format, startOfMonth } from "date-fns";
import ExcelJS from "exceljs";
import PurchaseInvoiceFormDrawer from "../elements/PurchaseInvoiceFormDrawer";

export interface PurchaseInvoice {
  id: number;
  supplier_name: string;
  invoice_number: string;
  invoice_date: string;
  expense_month: string;
  montant_ht: number;
  tva: number;
  timbre_facture: number;
  timbre_telephonie: number;
  fodec: number;
  montant_ttc: number;
  comment: string | null;
  created_at: string;
  updated_at: string;
}

const formatAmount = (value: number) =>
  Number(value).toLocaleString("fr-TN", { minimumFractionDigits: 3, maximumFractionDigits: 3 });

// The API serializes Prisma Decimal fields as strings even though the documented
// contract is `number` — normalize once here so the rest of the app can trust the type.
const normalizeInvoice = (raw: PurchaseInvoice): PurchaseInvoice => ({
  ...raw,
  montant_ht: Number(raw.montant_ht),
  tva: Number(raw.tva),
  timbre_facture: Number(raw.timbre_facture),
  timbre_telephonie: Number(raw.timbre_telephonie),
  fodec: Number(raw.fodec),
  montant_ttc: Number(raw.montant_ttc),
});

const PurchaseInvoices = () => {
  const [month, setMonth] = useState<Date>(new Date());
  const [invoices, setInvoices] = useState<PurchaseInvoice[]>([]);
  const [loading, setLoading] = useState(false);

  const [uploadingJda, setUploadingJda] = useState(false);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<PurchaseInvoice | null>(
    null,
  );

  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [notifyMessage, setNotifyMessage] = useState("");
  const [notifyStatus, setNotifyStatus] = useState<"success" | "error">(
    "success",
  );

  const notify = (message: string, status: "success" | "error") => {
    setNotifyMessage(message);
    setNotifyStatus(status);
    setSnackbarOpen(true);
  };

  const loadInvoices = async () => {
    setLoading(true);
    try {
      const year = month.getFullYear();
      const monthNumber = String(month.getMonth() + 1).padStart(2, "0");

      const res = await axios.get<PurchaseInvoice[]>(
        `${import.meta.env.VITE_API_URL}purchase-invoices`,
        { params: { year, month: monthNumber } },
      );

      setInvoices(res.data.map(normalizeInvoice));
    } catch (error) {
      console.error("Failed to load purchase invoices:", error);
      notify("Erreur lors du chargement des factures.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvoices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month.getFullYear(), month.getMonth()]);

  const openCreateDrawer = () => {
    setEditingInvoice(null);
    setDrawerOpen(true);
  };

  const openEditDrawer = (invoice: PurchaseInvoice) => {
    setEditingInvoice(invoice);
    setDrawerOpen(true);
  };

  const handleSaved = () => {
    setDrawerOpen(false);
    notify("Facture enregistrée avec succès.", "success");
    loadInvoices();
  };

  const handleDelete = async (invoice: PurchaseInvoice) => {
    const confirmed = window.confirm(
      `Supprimer la facture ${invoice.invoice_number} (${invoice.supplier_name}) ?`,
    );
    if (!confirmed) return;

    try {
      await axios.delete(
        `${import.meta.env.VITE_API_URL}purchase-invoices/${invoice.id}`,
      );
      setInvoices((prev) => prev.filter((i) => i.id !== invoice.id));
      notify("Facture supprimée.", "success");
    } catch (error) {
      console.error("Failed to delete purchase invoice:", error);
      notify("Erreur lors de la suppression.", "error");
    }
  };

  const handleUploadJda = async () => {
    setUploadingJda(true);
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("JDA");

      worksheet.columns = [
        { header: "Numéro facture", key: "invoice_number", width: 20 },
        { header: "Date facture", key: "invoice_date", width: 15 },
        { header: "Nom fournisseur", key: "supplier_name", width: 25 },
        { header: "Total HT", key: "montant_ht", width: 12 },
        { header: "TVA", key: "tva", width: 12 },
        { header: "FODEC", key: "fodec", width: 12 },
        { header: "Timbre sur téléphonie et internet", key: "timbre_telephonie", width: 18 },
        { header: "Timbre sur facture", key: "timbre_facture", width: 15 },
        { header: "Total TTC", key: "montant_ttc", width: 12 },
        { header: "Commentaire", key: "comment", width: 30 },
      ];

      invoices.forEach((invoice) => {
        worksheet.addRow({
          invoice_number: invoice.invoice_number,
          invoice_date: invoice.invoice_date?.slice(0, 10),
          supplier_name: invoice.supplier_name,
          montant_ht: invoice.montant_ht,
          tva: invoice.tva,
          fodec: invoice.fodec,
          timbre_telephonie: invoice.timbre_telephonie,
          timbre_facture: invoice.timbre_facture,
          montant_ttc: invoice.montant_ttc,
          comment: invoice.comment || "",
        });
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const monthLabel = format(month, "MM-yyyy");
      const file = new File([buffer], `JDA_${monthLabel}.xlsx`, {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      const documentData = new FormData();
      documentData.append("file", file);
      documentData.append("date", format(startOfMonth(month), "yyyy-MM-dd"));

      await axios.post(
        `${import.meta.env.VITE_API_URL}purchase-invoices/document`,
        documentData,
        { headers: { "Content-Type": "multipart/form-data" } },
      );

      notify("JDA envoyé sur le Drive avec succès.", "success");
    } catch (error) {
      console.error("Failed to upload JDA:", error);
      notify("Erreur lors de l'envoi du JDA sur le Drive.", "error");
    } finally {
      setUploadingJda(false);
    }
  };

  const totals = invoices.reduce(
    (acc, invoice) => ({
      montant_ht: acc.montant_ht + Number(invoice.montant_ht),
      tva: acc.tva + Number(invoice.tva),
      fodec: acc.fodec + Number(invoice.fodec),
      timbre_telephonie: acc.timbre_telephonie + Number(invoice.timbre_telephonie),
      timbre_facture: acc.timbre_facture + Number(invoice.timbre_facture),
      montant_ttc: acc.montant_ttc + Number(invoice.montant_ttc),
    }),
    {
      montant_ht: 0,
      tva: 0,
      fodec: 0,
      timbre_telephonie: 0,
      timbre_facture: 0,
      montant_ttc: 0,
    },
  );

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 1, fontWeight: 700 }}>
        Factures d'achat
      </Typography>
      <Typography variant="subtitle1" sx={{ mb: 4 }}>
        Journal d'achat (JDA) mensuel
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
        <DatePicker
          label="Mois"
          views={["year", "month"]}
          value={month}
          onChange={(v) => v && setMonth(v)}
        />

        <Box sx={{ flexGrow: 1 }} />

        <Button
          variant="outlined"
          startIcon={
            uploadingJda ? (
              <CircularProgress size={16} />
            ) : (
              <CloudUploadIcon />
            )
          }
          onClick={handleUploadJda}
          disabled={invoices.length === 0 || uploadingJda}
        >
          Envoyer le JDA sur le Drive
        </Button>

        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={openCreateDrawer}
        >
          Nouvelle facture
        </Button>
      </Box>

      {loading ? (
        <Box sx={{ textAlign: "center", mt: 10 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer
          component={Paper}
          variant="outlined"
          sx={{ borderRadius: 2 }}
        >
          <Table>
            <TableHead>
              <TableRow>
                <TableCell><strong>Numéro facture</strong></TableCell>
                <TableCell><strong>Date facture</strong></TableCell>
                <TableCell><strong>Fournisseur</strong></TableCell>
                <TableCell align="right"><strong>Total HT</strong></TableCell>
                <TableCell align="right"><strong>TVA</strong></TableCell>
                <TableCell align="right"><strong>FODEC</strong></TableCell>
                <TableCell align="right"><strong>Timbre tél.</strong></TableCell>
                <TableCell align="right"><strong>Timbre facture</strong></TableCell>
                <TableCell align="right"><strong>Total TTC</strong></TableCell>
                <TableCell><strong>Commentaire</strong></TableCell>
                <TableCell align="right"><strong>Actions</strong></TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {invoices.length === 0 && (
                <TableRow>
                  <TableCell colSpan={11} align="center">
                    Aucune facture d'achat pour ce mois.
                  </TableCell>
                </TableRow>
              )}

              {invoices.map((invoice) => (
                <TableRow key={invoice.id} hover>
                  <TableCell>{invoice.invoice_number}</TableCell>
                  <TableCell>
                    {new Date(invoice.invoice_date).toLocaleDateString("fr-FR")}
                  </TableCell>
                  <TableCell>{invoice.supplier_name}</TableCell>
                  <TableCell align="right">{formatAmount(invoice.montant_ht)}</TableCell>
                  <TableCell align="right">{formatAmount(invoice.tva)}</TableCell>
                  <TableCell align="right">{formatAmount(invoice.fodec)}</TableCell>
                  <TableCell align="right">{formatAmount(invoice.timbre_telephonie)}</TableCell>
                  <TableCell align="right">{formatAmount(invoice.timbre_facture)}</TableCell>
                  <TableCell align="right">{formatAmount(invoice.montant_ttc)}</TableCell>
                  <TableCell>{invoice.comment}</TableCell>
                  <TableCell align="right">
                    <Tooltip title="Modifier">
                      <IconButton size="small" onClick={() => openEditDrawer(invoice)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Supprimer">
                      <IconButton size="small" onClick={() => handleDelete(invoice)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>

            {invoices.length > 0 && (
              <TableFooter>
                <TableRow sx={{ background: "grey.50" }}>
                  <TableCell colSpan={3}><strong>Total</strong></TableCell>
                  <TableCell align="right"><strong>{formatAmount(totals.montant_ht)}</strong></TableCell>
                  <TableCell align="right"><strong>{formatAmount(totals.tva)}</strong></TableCell>
                  <TableCell align="right"><strong>{formatAmount(totals.fodec)}</strong></TableCell>
                  <TableCell align="right"><strong>{formatAmount(totals.timbre_telephonie)}</strong></TableCell>
                  <TableCell align="right"><strong>{formatAmount(totals.timbre_facture)}</strong></TableCell>
                  <TableCell align="right"><strong>{formatAmount(totals.montant_ttc)}</strong></TableCell>
                  <TableCell colSpan={2} />
                </TableRow>
              </TableFooter>
            )}
          </Table>
        </TableContainer>
      )}

      <PurchaseInvoiceFormDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        initialValue={editingInvoice}
        defaultExpenseMonth={month}
        onSaved={handleSaved}
      />

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={4000}
        onClose={() => setSnackbarOpen(false)}
      >
        <SnackbarContent
          message={notifyMessage}
          sx={{
            backgroundColor: notifyStatus === "success" ? "green" : "red",
          }}
        />
      </Snackbar>
    </Box>
  );
};

export default PurchaseInvoices;
