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

/* ------------------------------------------
   TYPES STRICTS
------------------------------------------ */

interface ClientB2B {
  id: number;
  name: string;
  responsable_name?: string | null;
}

interface ProductB2B {
  id: number;
  name: string;
  variant_id: number;
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
        inventory: 999, // temporaire
      }));

      setClients(resClients.data);
      setProducts(withStock);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  /* ------------------------------------------
     ADD PRODUCT
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
     CREATE ORDER
------------------------------------------ */

  const handleCreateOrder = async () => {
    if (!selectedClient) {
      setNotifyMessage("Please select a client.");
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

      clearCart();
      setSelectedClient(null);
    } catch {
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

      {/* CART */}
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