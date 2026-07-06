import {
  Box,
  Button,
  TextField,
  CircularProgress,
  Typography,
  Paper,
} from "@mui/material";
import { useState } from "react";
import { AxiosInstance } from "../../api/axios/axiosInstance";

export const B2BInvoiceDeposit = () => {
  const [invoiceName, setInvoiceName] = useState("");
  const [effectiveDate, setEffectiveDate] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setFile(event.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!invoiceName.trim() || !effectiveDate || !file) {
      setError("Tous les champs sont obligatoires.");
      return;
    }
    setError(null);
    setLoading(true);
    setUploadedUrl(null);

    try {
      const formData = new FormData();
      // Ici on envoie seulement la partie utile
      formData.append("invoiceName", invoiceName);
      formData.append("effectiveDate", effectiveDate);
      formData.append("file", file);

      const response = await AxiosInstance.post(
        "/invoices/deposit-b2b",
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );

      setUploadedUrl(response.data.url);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setError(err.response?.data || "Erreur lors du dépôt.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box padding="2rem" sx={{ backgroundColor: "#f5f5f5", minHeight: "100vh" }}>
      <Typography variant="h5" mb={3}>
        Dépôt de facture B2B
      </Typography>

      {/* Champ invoiceName avec préfixe/suffixe */}
      <Box display="flex" alignItems="center" gap={1} marginY={2}>
        <Typography color="textSecondary">invoice_</Typography>
        <TextField
          placeholder="12345"
          variant="outlined"
          value={invoiceName}
          onChange={(e) => setInvoiceName(e.target.value)}
        />
        <Typography color="textSecondary">.pdf</Typography>
      </Box>

      <TextField
        label="Date effective"
        type="date"
        value={effectiveDate}
        onChange={(e) => setEffectiveDate(e.target.value)}
        fullWidth
        margin="normal"
        InputLabelProps={{ shrink: true }}
      />

      {/* Drag & drop zone */}
      <Paper
        variant="outlined"
        sx={{
          mt: 2,
          mb: 2,
          p: 3,
          textAlign: "center",
          border: "2px dashed #aaa",
          backgroundColor: "#fafafa",
          cursor: "pointer",
        }}
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => document.getElementById("fileInput")?.click()}
      >
        <input
          id="fileInput"
          type="file"
          accept="application/pdf"
          style={{ display: "none" }}
          onChange={handleFileChange}
        />
        {file ? (
          <Typography>{file.name}</Typography>
        ) : (
          <Typography color="textSecondary">
            Glissez-déposez le PDF ici ou cliquez pour sélectionner
          </Typography>
        )}
      </Paper>

      <Box display="flex" gap={2} marginY={2}>
        <Button
          variant="contained"
          color="primary"
          onClick={handleUpload}
          disabled={loading}
        >
          {loading ? <CircularProgress size={24} /> : "Uploader"}
        </Button>
      </Box>

      {uploadedUrl && (
        <Typography color="success.main">
          Facture déposée avec succès :{" "}
          <a href={uploadedUrl} target="_blank" rel="noopener noreferrer">
            Voir le fichier
          </a>
        </Typography>
      )}

      {error && (
        <Typography color="error" mt={2}>
          {error}
        </Typography>
      )}
    </Box>
  );
};
