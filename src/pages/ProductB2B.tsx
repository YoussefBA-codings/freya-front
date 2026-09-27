import React, { useEffect, useState } from "react";
import axios from "axios";
import {
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
import { notify, notifyError } from "../lib/notify";

interface ProductB2B {
  id: number;
  name: string;
  variant_id: string;
  // Legacy - n'est plus jamais saisi ici, le prix vit désormais au niveau
  // de chaque liste de prix (page "Listes de prix").
  price_ht: number | null;
  tva_rate: number;
  gamme: string | null;
  ppr: number | null;
  created_at: string;
  updated_at: string;
}

const ProductB2B: React.FC = () => {
  const [products, setProducts] = useState<ProductB2B[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<ProductB2B[]>([]);

  const [loadingList, setLoadingList] = useState(false);
  const [loadingCreate, setLoadingCreate] = useState(false);
  const [loadingSelected, setLoadingSelected] = useState(false);


  // ---- Create fields ----
  const [name, setName] = useState("");
  const [variantId, setVariantId] = useState("");
  const [tvaRate, setTvaRate] = useState("0.19");
  const [gamme, setGamme] = useState("");
  const [ppr, setPpr] = useState("");

  // ---- Edit product ----
  const [selectedProduct, setSelectedProduct] = useState<ProductB2B | null>(null);
  const [editName, setEditName] = useState("");
  const [editVariantId, setEditVariantId] = useState("");
  const [editTvaRate, setEditTvaRate] = useState("");
  const [editGamme, setEditGamme] = useState("");
  const [editPpr, setEditPpr] = useState("");

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
      notifyError(error, "Chargement des produits impossible");
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
    if (!name.trim() || !variantId.trim()) {
      notify("Veuillez remplir tous les champs obligatoires.", "error");
      return;
    }

    setLoadingCreate(true);
    try {
      await axios.post(
        `${import.meta.env.VITE_API_URL}product-b2b`,
        {
          name,
          variant_id: variantId,
          tva_rate: Number(tvaRate),
          gamme: gamme || undefined,
          ppr: ppr ? Number(ppr) : undefined,
        },
        { headers: { "Content-Type": "application/json" } }
      );

      notify("Produit créé ! Pensez à lui donner un prix dans vos listes de prix.", "success");

      setName("");
      setVariantId("");
      setTvaRate("0.19");
      setGamme("");
      setPpr("");

      loadProducts();
    } catch (error) {
      notifyError(error, "Création du produit impossible");
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
    setEditTvaRate(String(product.tva_rate));
    setEditGamme(product.gamme ?? "");
    setEditPpr(product.ppr != null ? String(product.ppr) : "");
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
          tva_rate: Number(editTvaRate),
          gamme: editGamme || undefined,
          ppr: editPpr ? Number(editPpr) : undefined,
        },
        { headers: { "Content-Type": "application/json" } }
      );

      notify("Produit mis à jour !", "success");

      loadProducts();
    } catch (error) {
      notifyError(error, "Mise à jour du produit impossible");
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
          Liste des produits B2B
        </Typography>

        <TextField
          fullWidth
          label="Rechercher des produits"
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
                      secondary={`PPR : ${p.ppr != null ? `${p.ppr} DT` : "non renseigné"} · ${p.gamme ?? "Gamme non renseignée"}`}
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
          Créer un produit B2B
        </Typography>

        <TextField
          fullWidth
          label="Nom du produit *"
          value={name}
          onChange={(e) => setName(e.target.value)}
          sx={{ mb: 2 }}
        />

        <TextField
          fullWidth
          label="ID Variante *"
          value={variantId}
          onChange={(e) => setVariantId(e.target.value)}
          sx={{ mb: 2 }}
        />

        <TextField
          fullWidth
          label="Taux TVA"
          value={tvaRate}
          onChange={(e) => setTvaRate(e.target.value)}
          sx={{ mb: 2 }}
          type="number"
        />

        <TextField
          fullWidth
          label="Gamme (ex: Centella, Tea-Trica...)"
          value={gamme}
          onChange={(e) => setGamme(e.target.value)}
          sx={{ mb: 2 }}
        />

        <TextField
          fullWidth
          label="PPR (Prix Public Recommandé)"
          value={ppr}
          onChange={(e) => setPpr(e.target.value)}
          sx={{ mb: 2 }}
          type="number"
        />

        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 2 }}>
          Ce produit n'a pas de prix ici - donnez-lui un prix dans chacune de vos{" "}
          <strong>listes de prix</strong> (menu Produits → Listes de prix) une fois créé.
        </Typography>

        <Button
          variant="contained"
          onClick={handleCreate}
          disabled={loadingCreate}
        >
          {loadingCreate ? <CircularProgress size={24} /> : "Créer le produit"}
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
          {selectedProduct ? `Modifier le produit : ${selectedProduct.name}` : ""}
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
            label="Nom du produit"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            sx={{ mb: 2 }}
          />

          <TextField
            fullWidth
            label="ID Variante"
            value={editVariantId}
            onChange={(e) => setEditVariantId(e.target.value)}
            sx={{ mb: 2 }}
          />

          <TextField
            fullWidth
            label="Taux TVA"
            value={editTvaRate}
            onChange={(e) => setEditTvaRate(e.target.value)}
            sx={{ mb: 2 }}
            type="number"
          />

          <TextField
            fullWidth
            label="Gamme (ex: Centella, Tea-Trica...)"
            value={editGamme}
            onChange={(e) => setEditGamme(e.target.value)}
            sx={{ mb: 2 }}
          />

          <TextField
            fullWidth
            label="PPR (Prix Public Recommandé)"
            value={editPpr}
            onChange={(e) => setEditPpr(e.target.value)}
            sx={{ mb: 2 }}
            type="number"
          />

          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 2 }}>
            Le prix de ce produit se modifie dans chaque <strong>liste de prix</strong> (menu
            Produits → Listes de prix), pas ici.
          </Typography>

        </DialogContent>

        <DialogActions>
          <Button onClick={handleCloseDialog}>Annuler</Button>
          <Button
            variant="contained"
            onClick={handleSaveSelected}
            disabled={loadingSelected}
          >
            {loadingSelected ? <CircularProgress size={20} /> : "Enregistrer les modifications"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* SNACKBAR */}
    </Box>
  );
};

export default ProductB2B;