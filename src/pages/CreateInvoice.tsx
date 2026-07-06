import React, { useState } from "react";
import axios from 'axios';
import {
  Snackbar,
  SnackbarContent,
  TextField,
  Button,
  Box,
  Typography,
  CircularProgress,
} from "@mui/material";

const SyncInvoice: React.FC = () => {
  const [invoiceShopifyId, setInvoiceShopifyId] = useState("");
  const [invoiceForcedName, setInvoiceForcedName] = useState<string>("");
  const [forcedDate, setForcedDate] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [notifyMessage, setNotifyMessage] = useState("");
  const [notifyStatus, setNotifyStatus] = useState<"success" | "error">("success");

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInvoiceShopifyId(e.target.value);
  };

  const handleSync = async () => {
    setLoading(true);
    setProgress(0);
    setNotifyMessage("");
    setNotifyStatus("success");

    try {
      for (let i = 0; i <= 100; i += 10) {
        setProgress(i);
        await new Promise((resolve) => setTimeout(resolve, 200));
      }

      await axios.post(
        `${import.meta.env.VITE_API_URL}invoices/create-sync`,
        {
          orderShopifyId: invoiceShopifyId,
          invoiceForcedName: invoiceForcedName || undefined,
          forcedDate: forcedDate || undefined,
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      setNotifyMessage("Facture synchronisée avec succès !");
      setNotifyStatus("success");
    } catch (error) {
      console.error("Failed to create invoice:", error);
      setNotifyMessage("Échec de la création de la facture.");
      setNotifyStatus("error");
    } finally {
      setLoading(false);
      setSnackbarOpen(true);
    }
  };

  return (
    <Box sx={{ padding: 3, borderRadius: 2, boxShadow: 3, textAlign: "center" }}>
      <Typography variant="h4" gutterBottom>
        Créer une facture
      </Typography>
      <TextField
        fullWidth
        variant="outlined"
        label="ID Shopify de la facture"
        name="invoiceShopifyId"
        value={invoiceShopifyId}
        onChange={handleInputChange}
        required
        sx={{ marginBottom: 3 }}
      />
      <TextField
        fullWidth
        variant="outlined"
        label="Nom forcé de la facture (facultatif)"
        name="invoiceForcedName"
        value={invoiceForcedName}
        onChange={(e) => setInvoiceForcedName(e.target.value)}
        sx={{ marginBottom: 3 }}
      />
      <TextField
        fullWidth
        variant="outlined"
        label="Date forcée (facultatif)"
        name="forcedDate"
        type="date"
        InputLabelProps={{ shrink: true }}
        value={forcedDate}
        onChange={(e) => setForcedDate(e.target.value)}
        sx={{ marginBottom: 3 }}
      />
      <Button
        variant="contained"
        color="primary"
        onClick={handleSync}
        disabled={loading}
        sx={{ position: "relative" }}
      >
        {loading ? (
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <CircularProgress size={24} sx={{ marginRight: 2 }} />
            {`${progress}% Récupération depuis Shopify`}
          </Box>
        ) : (
          "Créer"
        )}
      </Button>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={() => setSnackbarOpen(false)}
      >
        <SnackbarContent
          message={notifyMessage}
          sx={{ backgroundColor: notifyStatus === "error" ? "red" : "green" }}
        />
      </Snackbar>
    </Box>
  );
};

export default SyncInvoice;
