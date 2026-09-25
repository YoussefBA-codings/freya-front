// PriceListsPage.tsx
import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  Box,
  Typography,
  TextField,
  Button,
  CircularProgress,
  List,
  ListItemButton,
  ListItemText,
  Divider,
  Chip,
  Snackbar,
  SnackbarContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from "@mui/material";

interface ProductB2B {
  id: number;
  name: string;
  ppr: number | null;
  gamme: string | null;
}

interface PriceList {
  id: number;
  name: string;
  description: string | null;
  nb_prix: number;
  nb_produits_total: number;
  is_complete: boolean;
}

interface PriceListDetail extends PriceList {
  items: { product_id: number; price_ht: number; product: { id: number; name: string } }[];
}

const PriceListsPage: React.FC = () => {
  const [products, setProducts] = useState<ProductB2B[]>([]);
  const [priceLists, setPriceLists] = useState<PriceList[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [saving, setSaving] = useState(false);

  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [notifyMessage, setNotifyMessage] = useState("");
  const [notifyStatus, setNotifyStatus] = useState<"success" | "error">("success");

  const notify = (message: string, status: "success" | "error") => {
    setNotifyMessage(message);
    setNotifyStatus(status);
    setSnackbarOpen(true);
  };

  // Panneau d'édition : null id = nouvelle liste
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [priceInputs, setPriceInputs] = useState<Record<number, string>>({});
  const [search, setSearch] = useState("");

  const loadAll = async () => {
    try {
      setLoadingList(true);
      const [resProducts, resLists] = await Promise.all([
        axios.get<ProductB2B[]>(`${import.meta.env.VITE_API_URL}product-b2b`),
        axios.get<PriceList[]>(`${import.meta.env.VITE_API_URL}price-list`),
      ]);
      setProducts(resProducts.data);
      setPriceLists(resLists.data);
    } catch {
      notify("Échec du chargement.", "error");
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const resetPanelToNew = () => {
    setEditingId(null);
    setEditName("");
    setEditDescription("");
    setPriceInputs({});
  };

  const openForEdit = async (id: number) => {
    try {
      const res = await axios.get<PriceListDetail>(
        `${import.meta.env.VITE_API_URL}price-list/${id}`
      );
      setEditingId(id);
      setEditName(res.data.name);
      setEditDescription(res.data.description ?? "");
      const inputs: Record<number, string> = {};
      for (const item of res.data.items) {
        inputs[item.product_id] = String(item.price_ht);
      }
      setPriceInputs(inputs);
    } catch {
      notify("Échec du chargement de la liste.", "error");
    }
  };

  const filteredProducts = useMemo(() => {
    if (!search.trim()) return products;
    const q = search.toLowerCase();
    return products.filter((p) => p.name.toLowerCase().includes(q));
  }, [products, search]);

  const nbFilled = useMemo(
    () => products.filter((p) => priceInputs[p.id]?.trim()).length,
    [products, priceInputs]
  );
  const isComplete = nbFilled === products.length && products.length > 0;

  const handleSave = async () => {
    if (!editName.trim()) {
      notify("Le nom de la liste est obligatoire.", "error");
      return;
    }
    if (!isComplete) {
      notify(
        `Impossible d'enregistrer : il manque le prix de ${products.length - nbFilled} produit(s).`,
        "error"
      );
      return;
    }

    const prices = products.map((p) => ({
      product_id: p.id,
      price_ht: Number(priceInputs[p.id]),
    }));

    setSaving(true);
    try {
      if (editingId) {
        await axios.put(`${import.meta.env.VITE_API_URL}price-list/${editingId}`, {
          name: editName.trim(),
          description: editDescription.trim() || undefined,
          prices,
        });
        notify("Liste mise à jour.", "success");
      } else {
        const res = await axios.post(`${import.meta.env.VITE_API_URL}price-list`, {
          name: editName.trim(),
          description: editDescription.trim() || undefined,
          prices,
        });
        notify("Liste créée.", "success");
        setEditingId(res.data.id);
      }
      await loadAll();
    } catch (error: any) {
      notify(
        error?.response?.data?.message || "Échec de l'enregistrement.",
        "error"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editingId) return;
    if (!window.confirm(`Supprimer la liste "${editName}" ?`)) return;
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL}price-list/${editingId}`);
      notify("Liste supprimée.", "success");
      resetPanelToNew();
      await loadAll();
    } catch {
      notify("Échec de la suppression.", "error");
    }
  };

  const setPrice = (productId: number, value: string) => {
    setPriceInputs((prev) => ({ ...prev, [productId]: value }));
  };

  return (
    <Box sx={{ display: "flex", gap: 3, p: 2 }}>
      {/* LEFT: existing lists */}
      <Box sx={{ width: 320, flexShrink: 0 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>
            Listes de prix
          </Typography>
          <Button variant="contained" size="small" onClick={resetPanelToNew}>
            + Nouvelle
          </Button>
        </Box>

        {loadingList ? (
          <Box sx={{ textAlign: "center", mt: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <List sx={{ borderRadius: 2, border: "1px solid", borderColor: "divider" }}>
            {priceLists.map((l) => (
              <React.Fragment key={l.id}>
                <ListItemButton
                  selected={editingId === l.id}
                  onClick={() => openForEdit(l.id)}
                >
                  <ListItemText
                    primary={l.name}
                    secondary={`${l.nb_prix}/${l.nb_produits_total} prix renseignés`}
                  />
                  <Chip
                    size="small"
                    label={l.is_complete ? "Complète" : "Incomplète"}
                    color={l.is_complete ? "success" : "warning"}
                  />
                </ListItemButton>
                <Divider />
              </React.Fragment>
            ))}
            {priceLists.length === 0 && (
              <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
                Aucune liste de prix.
              </Typography>
            )}
          </List>
        )}
      </Box>

      {/* RIGHT: editor panel */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>
          {editingId ? `Modifier : ${editName || "..."}` : "Nouvelle liste de prix"}
        </Typography>

        <Box sx={{ display: "flex", gap: 2, mb: 2, flexWrap: "wrap" }}>
          <TextField
            label="Nom de la liste *"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            sx={{ minWidth: 260 }}
          />
          <TextField
            label="Description (optionnel)"
            value={editDescription}
            onChange={(e) => setEditDescription(e.target.value)}
            sx={{ flex: 1, minWidth: 260 }}
          />
        </Box>

        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1.5, flexWrap: "wrap", gap: 1 }}>
          <TextField
            label="Rechercher un produit"
            size="small"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ minWidth: 260 }}
          />
          <Chip
            label={`${nbFilled}/${products.length} prix renseignés`}
            color={isComplete ? "success" : "default"}
            size="small"
          />
        </Box>

        <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 480, borderRadius: 2 }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell>Produit</TableCell>
                <TableCell align="right" sx={{ width: 130 }}>
                  PPR
                </TableCell>
                <TableCell align="right" sx={{ width: 180 }}>
                  Prix HT pour cette liste *
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredProducts.map((p) => {
                const filled = !!priceInputs[p.id]?.trim();
                return (
                  <TableRow key={p.id} hover>
                    <TableCell>{p.name}</TableCell>
                    <TableCell align="right">
                      {p.ppr != null ? `${Number(p.ppr).toFixed(2)} DT` : "—"}
                    </TableCell>
                    <TableCell align="right">
                      <TextField
                        size="small"
                        type="number"
                        value={priceInputs[p.id] ?? ""}
                        onChange={(e) => setPrice(p.id, e.target.value)}
                        error={!filled}
                        sx={{ width: 130 }}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>

        <Box sx={{ display: "flex", gap: 2, mt: 2 }}>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving || !isComplete || !editName.trim()}
          >
            {saving ? (
              <CircularProgress size={22} />
            ) : editingId ? (
              "Enregistrer les modifications"
            ) : (
              "Créer la liste"
            )}
          </Button>
          {editingId && (
            <Button
              variant="outlined"
              onClick={() =>
                window.open(
                  `${import.meta.env.VITE_API_URL}price-list/${editingId}/export/excel`,
                  "_blank"
                )
              }
            >
              Exporter Excel
            </Button>
          )}
          {editingId && (
            <Button variant="outlined" color="error" onClick={handleDelete}>
              Supprimer la liste
            </Button>
          )}
        </Box>
        {!isComplete && (
          <Typography variant="body2" color="error" sx={{ mt: 1 }}>
            Impossible d'enregistrer tant qu'il manque le prix d'un produit ({products.length - nbFilled} restant(s)).
          </Typography>
        )}
      </Box>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={4000}
        onClose={() => setSnackbarOpen(false)}
      >
        <SnackbarContent
          message={notifyMessage}
          sx={{ backgroundColor: notifyStatus === "error" ? "error.main" : "success.main" }}
        />
      </Snackbar>
    </Box>
  );
};

export default PriceListsPage;
