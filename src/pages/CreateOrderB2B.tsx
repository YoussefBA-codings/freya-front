/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useEffect, useState } from "react";
import axios, { AxiosError } from "axios";
import {
  Box,
  Typography,
  TextField,
  Button,
  CircularProgress,
  Card,
  CardContent,
  CardActionArea,
  Divider,
  Snackbar,
  SnackbarContent,
  IconButton,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";

import html2pdf from "html2pdf.js";
import { generateInvoiceHTML } from "./utils/invoiceTemplate";

/* ------------------------------------------
   TYPES
------------------------------------------ */

interface ClientB2B {
  id: number;
  name: string;
  tax_identification_number?: string;
  address?: string;
  zip?: string;
  country?: string;
  responsable_name?: string | null;
  responsable_phone?: string | null;
  responsable_email?: string | null;
}

interface ProductB2B {
  id: number;
  name: string;
  variant_id: string;
  price_ht: number;
  tva_rate: number;
}

interface ProductB2BWithStock extends ProductB2B {
  inventory: number;
}

interface SelectedProduct {
  product: ProductB2BWithStock;
  quantity: number;
}

interface CreateOrderItemPayload {
  product_id: number;
  quantity: number;
  price_ht: number;
  tva_rate: number;
}

interface CreateOrderPayload {
  client_id: number;
  status: string;
  invoice_number: string;
  invoice_pdf_url?: string;
  invoice_date: string;
  is_paid: boolean;
  withholding_enabled: boolean;
  items: CreateOrderItemPayload[];
}

interface InvoiceNumberResponse {
  invoiceNumber: string;
}

interface DepositResponse {
  url: string;
}

interface InvoicePdfResult {
  pdfBlob: Blob;
  invoiceNumber: string;
}

/* ------------------------------------------
   COMPONENT
------------------------------------------ */

const CreateOrderB2B: React.FC = () => {
  /* ------------------------------------------
     🔵 STATE
  ------------------------------------------ */

  const [clients, setClients] = useState<ClientB2B[]>([]);
  const [products, setProducts] = useState<ProductB2BWithStock[]>([]);

  const [searchClient, setSearchClient] = useState<string>("");
  const [searchProduct, setSearchProduct] = useState<string>("");

  const [selectedClient, setSelectedClient] = useState<ClientB2B | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>([]);

  const [invoiceDate, setInvoiceDate] = useState<string>("");

  const [withholdingEnabled, setWithholdingEnabled] = useState<boolean>(false);

  const [loading, setLoading] = useState<boolean>(true);
  const [creating, setCreating] = useState<boolean>(false);

  const [snackbarOpen, setSnackbarOpen] = useState<boolean>(false);
  const [notifyMessage, setNotifyMessage] = useState<string>("");
  const [notifyStatus, setNotifyStatus] = useState<"success" | "error">("success");

  /* ------------------------------------------
     LOAD DATA
  ------------------------------------------ */

  const loadData = async (): Promise<void> => {
    try {
      setLoading(true);

      const resClients = await axios.get<ClientB2B[]>(
        `${import.meta.env.VITE_API_URL}client-b2b`
      );

      const resProducts = await axios.get<ProductB2B[]>(
        `${import.meta.env.VITE_API_URL}product-b2b`
      );

      const withStock = resProducts.data.map<ProductB2BWithStock>((p) => ({
        ...p,
        inventory: 999,
      }));

      setClients(resClients.data);
      setProducts(withStock);
    } catch {
      setNotifyMessage("Failed to load data.");
      setNotifyStatus("error");
      setSnackbarOpen(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  /* ------------------------------------------
     GET NEXT INVOICE NUMBER
  ------------------------------------------ */

  const getNextInvoiceNumber = async (effectiveDate: string): Promise<string> => {
    const res = await axios.get<InvoiceNumberResponse>(
      `${import.meta.env.VITE_API_URL}invoices/next-number`,
      { params: { effectiveDate } }
    );
    return res.data.invoiceNumber;
  };

  /* ------------------------------------------
     ADD / UPDATE / REMOVE PRODUCT
  ------------------------------------------ */

  const handleAddProduct = (product: ProductB2BWithStock): void => {
    const existing = selectedProducts.find((p) => p.product.id === product.id);

    if (existing) {
      setSelectedProducts((prev) =>
        prev.map((p) =>
          p.product.id === product.id
            ? { ...p, quantity: p.quantity + 1 }
            : p
        )
      );
      return;
    }

    setSelectedProducts((prev) => [...prev, { product, quantity: 1 }]);
  };

  const updateQuantity = (productId: number, qty: number): void => {
    if (qty < 1) return;
    setSelectedProducts((prev) =>
      prev.map((p) =>
        p.product.id === productId ? { ...p, quantity: qty } : p
      )
    );
  };

  const removeProduct = (productId: number): void => {
    setSelectedProducts((prev) =>
      prev.filter((p) => p.product.id !== productId)
    );
  };

  const clearCart = (): void => setSelectedProducts([]);

  /* ------------------------------------------
     GENERATE PDF
  ------------------------------------------ */

  const generateInvoicePdfBlob = async (): Promise<InvoicePdfResult> => {
    if (!selectedClient) throw new Error("Please select a client.");
    if (!invoiceDate) throw new Error("Please select an invoice date.");
    if (selectedProducts.length === 0)
      throw new Error("Please add at least one product.");

    const invoiceNumber = await getNextInvoiceNumber(invoiceDate);

    const productsForInvoice = selectedProducts.map((item) => ({
      name: item.product.name,
      variant_id: String(item.product.variant_id),
      price_ht: item.product.price_ht,
      tva_rate: item.product.tva_rate,
      quantity: item.quantity,
    }));

    const html = generateInvoiceHTML(
      selectedClient,
      productsForInvoice,
      invoiceNumber,
      invoiceDate
    );

    const pdfBlob = (await html2pdf().from(html).outputPdf("blob")) as Blob;

    return { pdfBlob, invoiceNumber };
  };

  /* ------------------------------------------
     CREATE ORDER
  ------------------------------------------ */

  const handleCreateOrder = async (): Promise<void> => {
    try {
      setCreating(true);

      if (!selectedClient) throw new Error("Please select a client.");
      if (!invoiceDate) throw new Error("Please select an invoice date.");
      if (selectedProducts.length === 0) throw new Error("Please add products.");

      const { pdfBlob, invoiceNumber } = await generateInvoicePdfBlob();

      // Upload to Drive
      const formData = new FormData();
      formData.append(
        "file",
        new File([pdfBlob], `invoice-${invoiceNumber}.pdf`, {
          type: "application/pdf",
        })
      );
      formData.append("effectiveDate", invoiceDate);

      const depositRes = await axios.post<DepositResponse>(
        `${import.meta.env.VITE_API_URL}invoices/deposit-b2b-auto`,
        formData
      );

      const { url } = depositRes.data;

      const payload: CreateOrderPayload = {
        client_id: selectedClient.id,
        status: "CREATED",
        invoice_number: invoiceNumber,
        invoice_pdf_url: url,
        invoice_date: invoiceDate,
        is_paid: false,
        withholding_enabled: withholdingEnabled,
        items: selectedProducts.map((item) => ({
          product_id: item.product.id,
          quantity: item.quantity,
          price_ht: item.product.price_ht,
          tva_rate: item.product.tva_rate,
        })),
      };

      await axios.post(`${import.meta.env.VITE_API_URL}order-b2b`, payload);

      setNotifyMessage("Order created successfully!");
      setNotifyStatus("success");
      setSnackbarOpen(true);

      clearCart();
      setSelectedClient(null);
      setInvoiceDate("");
      setWithholdingEnabled(false);
    } catch (err: unknown) {
      let errorMessage = "Failed to create order.";

      if (axios.isAxiosError(err)) {
        errorMessage =
          err.response?.data?.message || err.message || "Request error.";
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }

      setNotifyMessage(errorMessage);
      setNotifyStatus("error");
      setSnackbarOpen(true);
    } finally {
      setCreating(false);
    }
  };

  /* ------------------------------------------
     UI – RENDER
  ------------------------------------------ */

  if (loading) {
    return (
      <Box sx={{ textAlign: "center", mt: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ display: "flex", gap: 3, p: 2 }}>
      {/* ======================================================
         COLUMN 1 — CLIENTS
      ====================================================== */}
      <Box
        sx={{
          flex: 1,
          p: 2,
          borderRadius: 3,
          backgroundColor: "#fafafa",
          border: "1px solid #eee",
          boxShadow: "0px 4px 15px rgba(0,0,0,0.04)",
          maxHeight: "85vh",
          overflowY: "auto",
        }}
      >
        <Typography variant="h5" sx={{ mb: 2, fontWeight: 700 }}>
          Clients
        </Typography>

        <TextField
          fullWidth
          label="Search clients"
          value={searchClient}
          onChange={(e) => setSearchClient(e.target.value)}
          sx={{ mb: 2 }}
        />

        {clients
          .filter((c) =>
            c.name.toLowerCase().includes(searchClient.toLowerCase())
          )
          .map((c) => (
            <Card
              key={c.id}
              sx={{
                mb: 2,
                borderRadius: 2,
                transition: "0.2s",
                border:
                  selectedClient?.id === c.id
                    ? "2px solid #1976d2"
                    : "1px solid #ddd",
                "&:hover": {
                  border: "1px solid #bbb",
                  boxShadow: "0px 2px 8px rgba(0,0,0,0.05)",
                },
              }}
            >
              <CardActionArea onClick={() => setSelectedClient(c)}>
                <CardContent>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    {c.name}
                  </Typography>
                  {c.responsable_name && (
                    <Typography variant="body2" color="text.secondary">
                      {c.responsable_name}
                    </Typography>
                  )}
                </CardContent>
              </CardActionArea>
            </Card>
          ))}
      </Box>

      {/* ======================================================
         COLUMN 2 — PRODUCTS
      ====================================================== */}
      <Box
        sx={{
          flex: 1.2,
          p: 2,
          borderRadius: 3,
          backgroundColor: "#fafafa",
          border: "1px solid #eee",
          boxShadow: "0px 4px 15px rgba(0,0,0,0.04)",
          maxHeight: "85vh",
          overflowY: "auto",
        }}
      >
        <Typography variant="h5" sx={{ mb: 2, fontWeight: 700 }}>
          Products
        </Typography>

        <TextField
          fullWidth
          label="Search products"
          value={searchProduct}
          onChange={(e) => setSearchProduct(e.target.value)}
          sx={{ mb: 2 }}
        />

        {products
          .filter((p) =>
            p.name.toLowerCase().includes(searchProduct.toLowerCase())
          )
          .map((p) => (
            <Card
              key={p.id}
              sx={{
                mb: 2,
                borderRadius: 2,
                border: "1px solid #eee",
                transition: "0.2s",
                "&:hover": {
                  borderColor: "#ccc",
                  boxShadow: "0px 3px 10px rgba(0,0,0,0.05)",
                },
              }}
            >
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  {p.name}
                </Typography>

                <Typography variant="body2" color="text.secondary">
                  Price: <strong>{p.price_ht} DT</strong>
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Stock: {p.inventory}
                </Typography>

                <Button
                  variant="contained"
                  size="small"
                  sx={{ mt: 1 }}
                  onClick={() => handleAddProduct(p)}
                >
                  Add
                </Button>
              </CardContent>
            </Card>
          ))}
      </Box>

      {/* ======================================================
         COLUMN 3 — ORDER SUMMARY
      ====================================================== */}
      <Box
        sx={{
          flex: 1,
          p: 2,
          borderRadius: 3,
          backgroundColor: "#fafafa",
          border: "1px solid #eee",
          boxShadow: "0px 4px 15px rgba(0,0,0,0.04)",
          maxHeight: "85vh",
          overflowY: "auto",
        }}
      >
        <Typography variant="h5" sx={{ mb: 2, fontWeight: 700 }}>
          Order Summary
        </Typography>

        {/* SELECTED CLIENT */}
        <Box
          sx={{
            background: "#ffffff",
            borderRadius: 2,
            border: "1px solid #eee",
            p: 2,
            mb: 3,
            boxShadow: "0px 2px 6px rgba(0,0,0,0.04)",
          }}
        >
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
            Selected Client
          </Typography>

          <Typography sx={{ color: selectedClient ? "black" : "gray" }}>
            {selectedClient ? selectedClient.name : "No client selected"}
          </Typography>
        </Box>

        {/* INVOICE DATE */}
        <TextField
          fullWidth
          label="Invoice Date"
          type="date"
          InputLabelProps={{ shrink: true }}
          value={invoiceDate}
          onChange={(e) => setInvoiceDate(e.target.value)}
          sx={{ mb: 3 }}
        />

        {/* WITHHOLDING */}
        <Box
          sx={{
            background: "#ffffff",
            borderRadius: 2,
            border: "1px solid #eee",
            p: 2,
            mb: 3,
          }}
        >
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
            Withholding Tax
          </Typography>

          <Button
            variant={withholdingEnabled ? "contained" : "outlined"}
            color={withholdingEnabled ? "warning" : "primary"}
            sx={{ mb: 1 }}
            fullWidth
            onClick={() => setWithholdingEnabled(!withholdingEnabled)}
          >
            {withholdingEnabled ? "Withholding Enabled" : "Enable Withholding"}
          </Button>
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* PRODUCTS IN ORDER */}
        {selectedProducts.map((item) => (
          <Card
            key={item.product.id}
            sx={{
              mb: 2,
              p: 1,
              borderRadius: 2,
              border: "1px solid #eee",
              boxShadow: "0px 2px 5px rgba(0,0,0,0.04)",
            }}
          >
            <CardContent>
              <Typography variant="h6">{item.product.name}</Typography>

              <Typography variant="body2" color="text.secondary">
                Price: {item.product.price_ht} DT
              </Typography>

              <TextField
                label="Qty"
                type="number"
                value={item.quantity}
                onChange={(e) =>
                  updateQuantity(item.product.id, Number(e.target.value))
                }
                sx={{ mt: 1, width: 100 }}
              />

              <IconButton
                color="error"
                sx={{ ml: 2 }}
                onClick={() => removeProduct(item.product.id)}
              >
                <DeleteIcon />
              </IconButton>
            </CardContent>
          </Card>
        ))}

        {/* CREATE ORDER BTN */}
        <Button
          fullWidth
          variant="contained"
          color="primary"
          sx={{ mt: 3, py: 1.5, fontWeight: 600 }}
          onClick={handleCreateOrder}
          disabled={creating}
        >
          {creating ? <CircularProgress size={22} /> : "Create Order"}
        </Button>
      </Box>

      {/* SNACKBAR */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={() => setSnackbarOpen(false)}
      >
        <SnackbarContent
          message={notifyMessage}
          sx={{
            backgroundColor: notifyStatus === "error" ? "red" : "green",
          }}
        />
      </Snackbar>
    </Box>
  );
};

export default CreateOrderB2B;