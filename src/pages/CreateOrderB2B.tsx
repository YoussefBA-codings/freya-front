import React, { useEffect, useState } from "react";
import axios from "axios";
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
  invoice_date: string;
  is_paid: boolean;
  withholding_enabled: boolean;
  items: CreateOrderItemPayload[];
}

/* ------------------------------------------
   COMPONENT
------------------------------------------ */

const CreateOrderB2B: React.FC = () => {
  const [clients, setClients] = useState<ClientB2B[]>([]);
  const [products, setProducts] = useState<ProductB2BWithStock[]>([]);

  const [searchClient, setSearchClient] = useState("");
  const [searchProduct, setSearchProduct] = useState("");

  const [selectedClient, setSelectedClient] = useState<ClientB2B | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>([]);

  const [invoiceNumber, setInvoiceNumber] = useState<string>("");
  const [invoiceDate, setInvoiceDate] = useState<string>("");

  // Withholding tax (retenue à la source)
  const [withholdingEnabled, setWithholdingEnabled] = useState<boolean>(false);

  const [loading, setLoading] = useState(true);

  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [notifyMessage, setNotifyMessage] = useState("");
  const [notifyStatus, setNotifyStatus] = useState<"success" | "error">("success");

  /* ------------------------------------------
     LOAD DATA
  ------------------------------------------ */

  const loadData = async () => {
    setLoading(true);
    try {
      const resClients = await axios.get<ClientB2B[]>(
        `${import.meta.env.VITE_API_URL}client-b2b`
      );

      const resProducts = await axios.get<ProductB2B[]>(
        `${import.meta.env.VITE_API_URL}product-b2b`
      );

      const withStock: ProductB2BWithStock[] = resProducts.data.map((p) => ({
        ...p,
        inventory: 999, // Temporaire, en attendant le vrai stock
      }));

      setClients(resClients.data);
      setProducts(withStock);
    } catch (error) {
      console.error("Failed to load data:", error);
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
     ADD / UPDATE / REMOVE PRODUCT
  ------------------------------------------ */

  const handleAddProduct = (product: ProductB2BWithStock) => {
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

  const updateQuantity = (productId: number, qty: number) => {
    if (qty < 1) return;
    setSelectedProducts((prev) =>
      prev.map((p) =>
        p.product.id === productId ? { ...p, quantity: qty } : p
      )
    );
  };

  const removeProduct = (productId: number) => {
    setSelectedProducts((prev) =>
      prev.filter((p) => p.product.id !== productId)
    );
  };

  const clearCart = () => setSelectedProducts([]);

  /* ------------------------------------------
     GENERATE INVOICE PDF
  ------------------------------------------ */

  const generateInvoice = () => {
    if (!selectedClient) return;

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

    html2pdf().from(html).save(`FACTURE-${invoiceNumber}.pdf`);
  };

  /* ------------------------------------------
     CREATE ORDER
  ------------------------------------------ */

  const handleCreateOrder = async () => {
    if (!selectedClient) {
      setNotifyMessage("Please select a client.");
      setNotifyStatus("error");
      setSnackbarOpen(true);
      return;
    }

    if (!invoiceNumber || !invoiceDate) {
      setNotifyMessage("Please enter invoice number and date.");
      setNotifyStatus("error");
      setSnackbarOpen(true);
      return;
    }

    if (selectedProducts.length === 0) {
      setNotifyMessage("Please add at least one product.");
      setNotifyStatus("error");
      setSnackbarOpen(true);
      return;
    }

    const payload: CreateOrderPayload = {
      client_id: selectedClient.id,
      status: "CREATED", // par défaut
      invoice_number: invoiceNumber,
      invoice_date: invoiceDate,
      is_paid: false, // paiement géré plus tard
      withholding_enabled: withholdingEnabled,
      items: selectedProducts.map((item) => ({
        product_id: item.product.id,
        quantity: item.quantity,
        price_ht: item.product.price_ht,
        tva_rate: item.product.tva_rate,
      })),
    };

    try {
      await axios.post(
        `${import.meta.env.VITE_API_URL}order-b2b`,
        payload,
        { headers: { "Content-Type": "application/json" } }
      );

      setNotifyMessage("Order created successfully!");
      setNotifyStatus("success");
      setSnackbarOpen(true);

      // Génération de la facture PDF
      generateInvoice();

      clearCart();
      setSelectedClient(null);
      setInvoiceNumber("");
      setInvoiceDate("");
      setWithholdingEnabled(false);
    } catch (error) {
      console.error("Failed to create order:", error);
      setNotifyMessage("Failed to create order.");
      setNotifyStatus("error");
      setSnackbarOpen(true);
    }
  };

  /* ------------------------------------------
     RENDER
  ------------------------------------------ */

  if (loading) {
    return (
      <Box sx={{ textAlign: "center", mt: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ display: "flex", gap: 3 }}>
      {/* CLIENTS */}
      <Box
        sx={{
          flex: 1,
          p: 2,
          borderRadius: 2,
          boxShadow: 3,
          maxHeight: "85vh",
          overflowY: "auto",
        }}
      >
        <Typography variant="h5" gutterBottom>
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
                border:
                  selectedClient?.id === c.id
                    ? "2px solid #1976d2"
                    : "1px solid #ddd",
              }}
            >
              <CardActionArea onClick={() => setSelectedClient(c)}>
                <CardContent>
                  <Typography variant="h6">{c.name}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {c.responsable_name || "No responsible"}
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          ))}
      </Box>

      {/* PRODUCTS */}
      <Box
        sx={{
          flex: 1.2,
          p: 2,
          borderRadius: 2,
          boxShadow: 3,
          maxHeight: "85vh",
          overflowY: "auto",
        }}
      >
        <Typography variant="h5" gutterBottom>
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
                border: "1px solid #ddd",
              }}
            >
              <CardContent>
                <Typography variant="h6">{p.name}</Typography>

                <Typography variant="body2" color="text.secondary">
                  Price: {p.price_ht} DT
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

      {/* CART / ORDER */}
      <Box
        sx={{
          flex: 1,
          p: 2,
          borderRadius: 2,
          boxShadow: 3,
          maxHeight: "85vh",
          overflowY: "auto",
        }}
      >
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 2,
          }}
        >
          <Typography variant="h5">Order</Typography>

          {selectedProducts.length > 0 && (
            <Button color="error" onClick={clearCart}>
              Clear
            </Button>
          )}
        </Box>

        <Typography variant="subtitle1" sx={{ mb: 2 }}>
          Client: {selectedClient ? selectedClient.name : "None selected"}
        </Typography>

        <TextField
          fullWidth
          label="Invoice Number"
          value={invoiceNumber}
          onChange={(e) => setInvoiceNumber(e.target.value)}
          sx={{ mb: 2 }}
        />

        <TextField
          fullWidth
          label="Invoice Date"
          type="date"
          InputLabelProps={{ shrink: true }}
          value={invoiceDate}
          onChange={(e) => setInvoiceDate(e.target.value)}
          sx={{ mb: 2 }}
        />

        <Typography variant="h6" sx={{ mt: 2 }}>
          Withholding Tax
        </Typography>

        <Button
          variant={withholdingEnabled ? "contained" : "outlined"}
          color={withholdingEnabled ? "warning" : "primary"}
          sx={{ mb: 2, mt: 1 }}
          onClick={() => setWithholdingEnabled(!withholdingEnabled)}
        >
          {withholdingEnabled ? "Withholding Enabled" : "Enable Withholding"}
        </Button>

        <Divider sx={{ mb: 2 }} />

        {selectedProducts.map((item) => (
          <Card key={item.product.id} sx={{ mb: 2 }}>
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
                sx={{ mt: 1, width: 80 }}
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

        <Button
          fullWidth
          variant="contained"
          color="primary"
          sx={{ mt: 3 }}
          onClick={handleCreateOrder}
        >
          Create Order
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
