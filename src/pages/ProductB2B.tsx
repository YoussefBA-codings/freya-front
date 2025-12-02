import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  Snackbar,
  SnackbarContent,
  TextField,
  Button,
  Box,
  Typography,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  ListItemButton,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

interface ProductB2B {
  id: number;
  name: string;
  variant_id: string;
  price_ht: number;
  tva_rate: number;
  created_at: string;
  updated_at: string;
}

const ProductB2B: React.FC = () => {
  const [products, setProducts] = useState<ProductB2B[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<ProductB2B[]>([]);

  const [loadingList, setLoadingList] = useState(false);
  const [loadingCreate, setLoadingCreate] = useState(false);
  const [loadingSelected, setLoadingSelected] = useState(false);

  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [notifyMessage, setNotifyMessage] = useState("");
  const [notifyStatus, setNotifyStatus] = useState<"success" | "error">("success");

  // ---- Create fields ----
  const [name, setName] = useState("");
  const [variantId, setVariantId] = useState("");
  const [priceHT, setPriceHT] = useState("");
  const [tvaRate, setTvaRate] = useState("0.19");

  // ---- Edit product ----
  const [selectedProduct, setSelectedProduct] = useState<ProductB2B | null>(null);
  const [editName, setEditName] = useState("");
  const [editVariantId, setEditVariantId] = useState("");
  const [editPriceHT, setEditPriceHT] = useState("");
  const [editTvaRate, setEditTvaRate] = useState("");

  const [search, setSearch] = useState("");

  // Load products
  const loadProducts = async () => {
    try {
      setLoadingList(true);
      const res = await axios.get<ProductB2B[]>(
        `${import.meta.env.VITE_API_URL}product-b2b`
      );
      setProducts(res.data);
      setFilteredProducts(res.data);
    } catch (error) {
      console.error("Failed to load products:", error);
      setNotifyMessage("Failed to load products.");
      setNotifyStatus("error");
      setSnackbarOpen(true);
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  // Search filter
  useEffect(() => {
    if (!search.trim()) {
      setFilteredProducts(products);
    } else {
      const q = search.toLowerCase();
      setFilteredProducts(
        products.filter((p) => p.name.toLowerCase().includes(q))
      );
    }
  }, [search, products]);

  // Create product
  const handleCreate = async () => {
    if (!name.trim() || !variantId.trim() || !priceHT.trim()) {
      setNotifyMessage("Please fill all required fields.");
      setNotifyStatus("error");
      setSnackbarOpen(true);
      return;
    }

    setLoadingCreate(true);
    try {
      await axios.post(
        `${import.meta.env.VITE_API_URL}product-b2b`,
        {
          name,
          variant_id: variantId,
          price_ht: Number(priceHT),
          tva_rate: Number(tvaRate),
        },
        { headers: { "Content-Type": "application/json" } }
      );

      setNotifyMessage("Product created!");
      setNotifyStatus("success");
      setSnackbarOpen(true);

      setName("");
      setVariantId("");
      setPriceHT("");
      setTvaRate("0.19");

      loadProducts();
    } catch (error) {
      console.error("Failed to create product:", error);
      setNotifyMessage("Failed to create product.");
      setNotifyStatus("error");
      setSnackbarOpen(true);
    } finally {
      setLoadingCreate(false);
    }
  };

  // Select product for edit
  const handleSelectProduct = (id: number) => {
    const product = products.find((p) => p.id === id);
    if (!product) return;

    setSelectedProduct(product);
    setEditName(product.name);
    setEditVariantId(product.variant_id);
    setEditPriceHT(String(product.price_ht));
    setEditTvaRate(String(product.tva_rate));
  };

  const handleCloseDialog = () => setSelectedProduct(null);

  const handleSaveSelected = async () => {
    if (!selectedProduct) return;

    setLoadingSelected(true);
    try {
      await axios.put(
        `${import.meta.env.VITE_API_URL}product-b2b/${selectedProduct.id}`,
        {
          name: editName,
          variant_id: editVariantId,
          price_ht: Number(editPriceHT),
          tva_rate: Number(editTvaRate),
        },
        { headers: { "Content-Type": "application/json" } }
      );

      setNotifyMessage("Product updated!");
      setNotifyStatus("success");
      setSnackbarOpen(true);

      loadProducts();
    } catch (error) {
      console.error("Failed to update product:", error);
      setNotifyMessage("Failed to update product.");
      setNotifyStatus("error");
      setSnackbarOpen(true);
    } finally {
      setLoadingSelected(false);
    }
  };

  return (
    <Box sx={{ display: "flex", gap: 4 }}>
      {/* LEFT: LIST */}
      <Box
        sx={{
          flex: 1,
          padding: 3,
          borderRadius: 2,
          boxShadow: 3,
          maxHeight: "80vh",
          overflowY: "auto",
        }}
      >
        <Typography variant="h5" gutterBottom>
          B2B Products List
        </Typography>

        <TextField
          fullWidth
          label="Search products"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ mb: 2 }}
        />

        {loadingList ? (
          <Box sx={{ textAlign: "center", mt: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <List>
            {filteredProducts.map((p) => (
              <React.Fragment key={p.id}>
                <ListItem disablePadding>
                  <ListItemButton
                    onClick={() => handleSelectProduct(p.id)}
                  >
                    <ListItemText
                      primary={p.name}
                      secondary={`Price: ${p.price_ht} DT — Variant ID: ${p.variant_id}`}
                    />
                  </ListItemButton>
                </ListItem>
                <Divider />
              </React.Fragment>
            ))}
          </List>
        )}
      </Box>

      {/* RIGHT: CREATE */}
      <Box
        sx={{
          flex: 1,
          padding: 3,
          borderRadius: 2,
          boxShadow: 3,
        }}
      >
        <Typography variant="h5" gutterBottom>
          Create B2B Product
        </Typography>

        <TextField
          fullWidth
          label="Product Name *"
          value={name}
          onChange={(e) => setName(e.target.value)}
          sx={{ mb: 2 }}
        />

        <TextField
          fullWidth
          label="Variant ID *"
          value={variantId}
          onChange={(e) => setVariantId(e.target.value)}
          sx={{ mb: 2 }}
        />

        <TextField
          fullWidth
          label="Price HT *"
          value={priceHT}
          onChange={(e) => setPriceHT(e.target.value)}
          sx={{ mb: 2 }}
          type="number"
        />

        <TextField
          fullWidth
          label="TVA Rate"
          value={tvaRate}
          onChange={(e) => setTvaRate(e.target.value)}
          sx={{ mb: 2 }}
          type="number"
        />

        <Button
          variant="contained"
          onClick={handleCreate}
          disabled={loadingCreate}
        >
          {loadingCreate ? <CircularProgress size={24} /> : "Create Product"}
        </Button>
      </Box>

      {/* MODAL / DIALOG */}
      <Dialog
        open={Boolean(selectedProduct)}
        onClose={handleCloseDialog}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          {selectedProduct ? `Edit Product — ${selectedProduct.name}` : ""}
          <IconButton
            onClick={handleCloseDialog}
            sx={{ position: "absolute", right: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers>
          <TextField
            fullWidth
            label="Product Name"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            sx={{ mb: 2 }}
          />

          <TextField
            fullWidth
            label="Variant ID"
            value={editVariantId}
            onChange={(e) => setEditVariantId(e.target.value)}
            sx={{ mb: 2 }}
          />

          <TextField
            fullWidth
            label="Price HT"
            value={editPriceHT}
            onChange={(e) => setEditPriceHT(e.target.value)}
            sx={{ mb: 2 }}
            type="number"
          />

          <TextField
            fullWidth
            label="TVA Rate"
            value={editTvaRate}
            onChange={(e) => setEditTvaRate(e.target.value)}
            sx={{ mb: 2 }}
            type="number"
          />
        </DialogContent>

        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSaveSelected}
            disabled={loadingSelected}
          >
            {loadingSelected ? <CircularProgress size={20} /> : "Save changes"}
          </Button>
        </DialogActions>
      </Dialog>

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

export default ProductB2B;