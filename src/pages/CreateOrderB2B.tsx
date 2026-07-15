// CreateOrderB2B.tsx
import React, { useEffect, useMemo, useState } from "react";
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
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Drawer,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";

import html2pdf from "html2pdf.js";
import { generateInvoiceHTML } from "./utils/invoiceTemplate";
import { isWithholdingExempt, WITHHOLDING_THRESHOLD_TTC } from "./utils/withholding";

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
  comment?: string;
  promotion_amount?: number;
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

type PromoLine = { title: string; amount: string };

/* ------------------------------------------
   UTILS
------------------------------------------ */

const round2 = (n: number) =>
  Math.round((Number(n) + Number.EPSILON) * 100) / 100;

const clamp0 = (n: number) => (Number.isFinite(n) ? Math.max(0, n) : 0);

type BrandKey = "ALL" | "COSRX" | "SKIN1004" | "DR ALTHEA" | "OTHER";

const getBrandFromName = (name: string): Exclude<BrandKey, "ALL"> => {
  const raw = (name || "").trim();
  const n = raw.toLowerCase();

  if (n.startsWith("dr. althea") || n.startsWith("dr althea")) return "DR ALTHEA";

  const first = raw.split(/\s+/)[0]?.toLowerCase() ?? "";
  if (first === "cosrx") return "COSRX";
  if (first === "skin1004") return "SKIN1004";

  return "OTHER";
};

const formatBrand = (b: Exclude<BrandKey, "ALL">) => {
  if (b === "DR ALTHEA") return "Dr. Althea";
  return b;
};

const toQtyInt = (v: string) => {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) ? Math.max(0, n) : 0;
};

/* ------------------------------------------
   COMPONENT
------------------------------------------ */

const CreateOrderB2B: React.FC = () => {
  /* ------------------------------------------
     STATE
  ------------------------------------------ */

  const [clients, setClients] = useState<ClientB2B[]>([]);
  const [products, setProducts] = useState<ProductB2BWithStock[]>([]);

  const [searchClient, setSearchClient] = useState<string>("");
  const [searchProduct, setSearchProduct] = useState<string>("");

  const [selectedClient, setSelectedClient] = useState<ClientB2B | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>([]);

  const [invoiceDate, setInvoiceDate] = useState<string>("");
  const [withholdingEnabled, setWithholdingEnabled] = useState<boolean>(false);
  const [withholdingManuallySet, setWithholdingManuallySet] = useState<boolean>(false);
  const [comment, setComment] = useState<string>("");

  const [promoLines, setPromoLines] = useState<PromoLine[]>([{ title: "", amount: "" }]);
  const [tierPromoRate, setTierPromoRate] = useState<0 | 0.03 | 0.04 | 0.06>(0);

  const [loading, setLoading] = useState<boolean>(true);
  const [creating, setCreating] = useState<boolean>(false);

  const [snackbarOpen, setSnackbarOpen] = useState<boolean>(false);
  const [notifyMessage, setNotifyMessage] = useState<string>("");
  const [notifyStatus, setNotifyStatus] = useState<"success" | "error">("success");

  // ✅ Excel sheet draft
  const [draftQty, setDraftQty] = useState<Record<number, string>>({});

  // ✅ brand sections collapse
  const [collapsedBrands, setCollapsedBrands] = useState<Record<string, boolean>>({
    COSRX: false,
    SKIN1004: false,
    "DR ALTHEA": false,
    OTHER: true,
  });

  // ✅ Clients drawer (new layout)
  const [clientsDrawerOpen, setClientsDrawerOpen] = useState(false);

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

      const resInventory = await axios.get<
        { variant_id: number; inventory_quantity: number }[]
      >(`${import.meta.env.VITE_API_URL}shopify/activeVariantsInventoryLevel`);

      const inventoryMap = new Map(
        resInventory.data.map((i) => [String(i.variant_id), i.inventory_quantity])
      );

      const productsWithStock: ProductB2BWithStock[] = resProducts.data.map((p) => ({
        ...p,
        inventory: inventoryMap.get(String(p.variant_id)) ?? 0,
      }));

      setClients(resClients.data);
      setProducts(productsWithStock);
    } catch {
      setNotifyMessage("Échec du chargement des données.");
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
     PROMO LINES HELPERS
  ------------------------------------------ */

  const updatePromoLine = (index: number, patch: Partial<PromoLine>) => {
    setPromoLines((prev) =>
      prev.map((l, i) => (i === index ? { ...l, ...patch } : l))
    );
  };

  const addPromoLine = () => setPromoLines((prev) => [...prev, { title: "", amount: "" }]);

  const removePromoLine = (index: number) => {
    setPromoLines((prev) => prev.filter((_, i) => i !== index));
  };

  /* ------------------------------------------
     TOTALS (TVA FIXE 19%)
  ------------------------------------------ */

  const totals = useMemo(() => {
    const totalHT = selectedProducts.reduce(
      (acc, item) =>
        acc + (Number(item.product.price_ht) || 0) * (item.quantity || 0),
      0
    );

    const tva = totalHT * 0.19;
    const totalTTC = totalHT + tva;

    const promoFixed = round2(
      promoLines.reduce((sum, l) => sum + clamp0(Number(l.amount || 0)), 0)
    );

    const totalAfterFixed = clamp0(totalTTC - promoFixed);
    const promoTier = round2(totalAfterFixed * (tierPromoRate || 0));

    const totalPromo = round2(promoFixed + promoTier);
    const totalAfterPromo = clamp0(totalTTC - totalPromo);

    const fixedPromosForInvoice = promoLines
      .map((l) => ({
        title: (l.title || "").trim(),
        amount: round2(clamp0(Number(l.amount || 0))),
      }))
      .filter((l) => l.amount > 0);

    return {
      totalHT: round2(totalHT),
      tva: round2(tva),
      totalTTC: round2(totalTTC),

      promoFixed,
      fixedPromosForInvoice,

      tierRate: tierPromoRate,
      promoTier: round2(promoTier),

      totalPromo: round2(totalPromo),
      totalAfterPromo: round2(totalAfterPromo),
    };
  }, [selectedProducts, promoLines, tierPromoRate]);

  const promoFixedTooHigh = totals.promoFixed > totals.totalTTC;

  // Sous le seuil légal (1000 DT TTC), la commande est exonérée : impossible
  // de forcer la retenue, quelle que soit l'action précédente de l'utilisateur.
  // Au-dessus du seuil, activée par défaut sauf si l'utilisateur l'a désactivée
  // manuellement.
  useEffect(() => {
    if (isWithholdingExempt(totals.totalAfterPromo)) {
      setWithholdingEnabled(false);
      setWithholdingManuallySet(false);
      return;
    }
    if (!withholdingManuallySet) {
      setWithholdingEnabled(true);
    }
  }, [totals.totalAfterPromo, withholdingManuallySet]);

  /* ------------------------------------------
     CART HELPERS
  ------------------------------------------ */

  const updateQuantity = (productId: number, qty: number): void => {
    if (qty < 1) return;
    setSelectedProducts((prev) =>
      prev.map((p) => (p.product.id === productId ? { ...p, quantity: qty } : p))
    );
  };

  const removeProduct = (productId: number): void => {
    setSelectedProducts((prev) => prev.filter((p) => p.product.id !== productId));
  };

  const clearCart = (): void => setSelectedProducts([]);

  /* ------------------------------------------
     EXCEL SHEET HELPERS
  ------------------------------------------ */

  const setDraft = (productId: number, value: string) => {
    setDraftQty((prev) => ({ ...prev, [productId]: value }));
  };

  const clearDraft = () => setDraftQty({});

  const applyDraftToCart = () => {
    const productById = new Map<number, ProductB2BWithStock>(
      products.map((p) => [p.id, p])
    );

    setSelectedProducts((prev) => {
      const map = new Map<number, SelectedProduct>(
        prev.map((x) => [x.product.id, x])
      );

      for (const [idStr, v] of Object.entries(draftQty)) {
        const id = Number(idStr);
        const qty = toQtyInt(v);

        const product = productById.get(id);
        if (!product) continue;

        if (product.inventory === 0) {
          map.delete(id);
          continue;
        }

        if (qty === 0) map.delete(id);
        else map.set(id, { product, quantity: qty });
      }

      return Array.from(map.values());
    });

    setDraftQty({});
  };

  const draftStats = useMemo(() => {
    let lines = 0;
    let qtySum = 0;

    for (const v of Object.values(draftQty)) {
      const q = toQtyInt(v);
      if (q > 0) {
        lines += 1;
        qtySum += q;
      }
    }

    return { lines, qtySum };
  }, [draftQty]);

  /* ------------------------------------------
     PROMO TOTAL (safe)
  ------------------------------------------ */

  const getPromotionTotalAmount = (): number | null => {
    const allowedRates = new Set([0, 0.03, 0.04, 0.06]);
    if (!allowedRates.has(tierPromoRate)) {
      throw new Error("Taux de promo palier invalide.");
    }

    if (totals.promoFixed > totals.totalTTC) {
      throw new Error(
        `Le montant de la promotion doit être <= au total de la facture (${totals.totalTTC.toFixed(2)} DT).`
      );
    }

    const totalPromo = round2(totals.totalPromo);

    if (totalPromo <= 0) return null;
    if (totalPromo > totals.totalTTC) {
      throw new Error("Le total de la promotion doit être <= au total de la facture.");
    }

    return totalPromo;
  };

  /* ------------------------------------------
     GENERATE PDF
  ------------------------------------------ */

  const generateInvoicePdfBlob = async (): Promise<InvoicePdfResult> => {
    if (!selectedClient) throw new Error("Veuillez sélectionner un client.");
    if (!invoiceDate) throw new Error("Veuillez sélectionner une date de facture.");
    if (selectedProducts.length === 0) throw new Error("Veuillez ajouter au moins un produit.");

    const invoiceNumber = await getNextInvoiceNumber(invoiceDate);
    const totalPromoAmount = getPromotionTotalAmount();

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
      invoiceDate,
      {
        totalPromoAmount: totalPromoAmount ?? 0,
        promoFixedAmount: totals.promoFixed,
        fixedPromotions: totals.fixedPromosForInvoice,
        tierRate: totals.tierRate,
        promoTierAmount: totals.promoTier,
      }
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

      if (!selectedClient) throw new Error("Veuillez sélectionner un client.");
      if (!invoiceDate) throw new Error("Veuillez sélectionner une date de facture.");
      if (selectedProducts.length === 0) throw new Error("Veuillez ajouter des produits.");

      const totalPromoAmount = getPromotionTotalAmount();
      const { pdfBlob, invoiceNumber } = await generateInvoicePdfBlob();

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

      const basePayload: CreateOrderPayload = {
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

      const trimmedComment = comment.trim();
      let payload: CreateOrderPayload = trimmedComment
        ? { ...basePayload, comment: trimmedComment }
        : basePayload;

      if (totalPromoAmount) payload = { ...payload, promotion_amount: totalPromoAmount };

      await axios.post(`${import.meta.env.VITE_API_URL}order-b2b`, payload);

      setNotifyMessage("Commande créée avec succès !");
      setNotifyStatus("success");
      setSnackbarOpen(true);

      clearCart();
      setSelectedClient(null);
      setInvoiceDate("");
      setWithholdingEnabled(false);
      setWithholdingManuallySet(false);
      setComment("");
      setPromoLines([{ title: "", amount: "" }]);
      setTierPromoRate(0);
      setDraftQty({});
    } catch (err: unknown) {
      let errorMessage = "Échec de la création de la commande.";

      if (axios.isAxiosError(err)) {
        errorMessage = err.response?.data?.message || err.message || "Erreur de requête.";
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
     PRODUCTS GROUPING (Excel)
  ------------------------------------------ */

  const groupedProducts = useMemo(() => {
    const q = searchProduct.trim().toLowerCase();

    const base = products
      .slice()
      .filter((p) => (!q ? true : p.name.toLowerCase().includes(q)))
      .sort((a, b) => {
        if (a.inventory > 0 && b.inventory === 0) return -1;
        if (a.inventory === 0 && b.inventory > 0) return 1;
        return b.inventory - a.inventory;
      });

    const groups: Record<Exclude<BrandKey, "ALL">, ProductB2BWithStock[]> = {
      COSRX: [],
      SKIN1004: [],
      "DR ALTHEA": [],
      OTHER: [],
    };

    for (const p of base) {
      const b = getBrandFromName(p.name);
      groups[b].push(p);
    }

    return groups;
  }, [products, searchProduct]);

  const selectedQtyById = useMemo(() => {
    const m = new Map<number, number>();
    for (const it of selectedProducts) m.set(it.product.id, it.quantity);
    return m;
  }, [selectedProducts]);

  /* ------------------------------------------
     UI
  ------------------------------------------ */

  if (loading) {
    return (
      <Box sx={{ textAlign: "center", mt: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  // ✅ New layout sizing
  const rightPanelWidth = 410;

  return (
    <Box sx={{ p: 2 }}>
      {/* ==============================
          MAIN LAYOUT: Products (wide) + Summary (fixed)
         ============================== */}
      <Box sx={{ display: "flex", gap: 2, alignItems: "flex-start" }}>
        {/* LEFT: Products + top bar */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          {/* Top bar: client + excel actions */}
          <Box
            sx={{
              mb: 2,
              p: 2,
              borderRadius: 3,
              backgroundColor: "#fafafa",
              border: "1px solid #eee",
              boxShadow: "0px 4px 15px rgba(0,0,0,0.04)",
            }}
          >
            <Box sx={{ display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap" }}>
              <Button
                variant="outlined"
                onClick={() => setClientsDrawerOpen(true)}
                sx={{ fontWeight: 800 }}
              >
                Clients
              </Button>

              <Box sx={{ flex: 1, minWidth: 260 }}>
                <Typography variant="body2" color="text.secondary">
                  Client sélectionné
                </Typography>
                <Typography sx={{ fontWeight: 800 }}>
                  {selectedClient ? selectedClient.name : "— Aucun client —"}
                </Typography>
              </Box>

              <Button
                variant="contained"
                onClick={applyDraftToCart}
                disabled={draftStats.lines === 0}
                sx={{ fontWeight: 900 }}
              >
                Ajouter au panier
              </Button>

              <Button
                variant="outlined"
                color="warning"
                onClick={clearDraft}
                disabled={Object.keys(draftQty).length === 0}
                sx={{ fontWeight: 900 }}
              >
                Vider
              </Button>

              {draftStats.lines > 0 && (
                <Chip
                  label={`Prêt: ${draftStats.lines} produits • ${draftStats.qtySum} unités`}
                />
              )}
            </Box>
          </Box>

          {/* PRODUCTS (EXCEL) - FULL WIDTH */}
          <Box
            sx={{
              p: 2,
              borderRadius: 3,
              backgroundColor: "#fafafa",
              border: "1px solid #eee",
              boxShadow: "0px 4px 15px rgba(0,0,0,0.04)",
            }}
          >
            <Typography variant="h5" sx={{ mb: 2, fontWeight: 900 }}>
              Produits (Excel)
            </Typography>

            <TextField
              fullWidth
              label="Rechercher des produits"
              value={searchProduct}
              onChange={(e) => setSearchProduct(e.target.value)}
              sx={{ mb: 2 }}
            />

            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Tu saisis les Qté dans la feuille, puis <strong>Ajouter au panier</strong>.
              (Qté vide ou 0 = pas ajouté)
            </Typography>

            {(["COSRX", "SKIN1004", "DR ALTHEA", "OTHER"] as const).map((brand) => {
              const list = groupedProducts[brand];
              if (!list || list.length === 0) return null;

              const isCollapsed = !!collapsedBrands[brand];

              return (
                <Box key={brand} sx={{ mb: 2 }}>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      mb: 1,
                    }}
                  >
                    <Typography variant="h6" sx={{ fontWeight: 900 }}>
                      {formatBrand(brand)}{" "}
                      <Chip size="small" label={`${list.length}`} sx={{ ml: 1 }} />
                    </Typography>

                    <Button
                      size="small"
                      variant="text"
                      onClick={() =>
                        setCollapsedBrands((prev) => ({
                          ...prev,
                          [brand]: !prev[brand],
                        }))
                      }
                    >
                      {isCollapsed ? "Afficher" : "Masquer"}
                    </Button>
                  </Box>

                  {!isCollapsed && (
                    <TableContainer
                      component={Paper}
                      sx={{ borderRadius: 2, overflow: "hidden" }}
                    >
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 900 }}>Produit</TableCell>
                            <TableCell sx={{ fontWeight: 900, width: 90 }}>
                              Stock
                            </TableCell>
                            <TableCell sx={{ fontWeight: 900, width: 140 }}>
                              Prix (HT)
                            </TableCell>
                            <TableCell sx={{ fontWeight: 900, width: 140 }}>
                              Qté
                            </TableCell>
                          </TableRow>
                        </TableHead>

                        <TableBody>
                          {list.map((p) => {
                            const out = p.inventory === 0;
                            const cartQty = selectedQtyById.get(p.id) ?? 0;

                            const value =
                              draftQty[p.id] !== undefined
                                ? draftQty[p.id]
                                : cartQty > 0
                                  ? String(cartQty)
                                  : "";

                            return (
                              <TableRow key={p.id} hover sx={{ opacity: out ? 0.55 : 1 }}>
                                <TableCell>
                                  <Typography sx={{ fontWeight: 650 }}>
                                    {p.name}
                                  </Typography>
                                  <Typography variant="body2" color="text.secondary">
                                    Variante : {p.variant_id}
                                  </Typography>
                                </TableCell>

                                <TableCell>
                                  <Typography color={out ? "error" : "text.secondary"}>
                                    {p.inventory}
                                  </Typography>
                                </TableCell>

                                <TableCell>
                                  <Typography>
                                    <strong>{round2(p.price_ht).toFixed(2)}</strong> DT
                                  </Typography>
                                </TableCell>

                                <TableCell>
                                  <TextField
                                    type="number"
                                    size="small"
                                    disabled={out}
                                    value={value}
                                    onChange={(e) => setDraft(p.id, e.target.value)}
                                    inputProps={{ min: 0, step: 1 }}
                                    sx={{ width: 120 }}
                                    placeholder="0"
                                  />
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                </Box>
              );
            })}
          </Box>
        </Box>

        {/* RIGHT: Order Summary (fixed width + sticky) */}
        <Box
          sx={{
            width: rightPanelWidth,
            flex: "0 0 auto",
            position: "sticky",
            top: 16,
            alignSelf: "flex-start",
          }}
        >
          <Box
            sx={{
              p: 2,
              borderRadius: 3,
              backgroundColor: "#fafafa",
              border: "1px solid #eee",
              boxShadow: "0px 4px 15px rgba(0,0,0,0.04)",
              maxHeight: "85vh",
              overflowY: "auto",
            }}
          >
            <Typography variant="h5" sx={{ mb: 2, fontWeight: 900 }}>
              Résumé de la commande
            </Typography>

            {/* INVOICE DATE */}
            <TextField
              fullWidth
              label="Date de facture"
              type="date"
              InputLabelProps={{ shrink: true }}
              value={invoiceDate}
              onChange={(e) => setInvoiceDate(e.target.value)}
              sx={{ mb: 2 }}
            />

            {/* WITHHOLDING */}
            <Box
              sx={{
                background: "#ffffff",
                borderRadius: 2,
                border: "1px solid #eee",
                p: 2,
                mb: 2,
              }}
            >
              <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1 }}>
                Retenue à la source
              </Typography>

              {isWithholdingExempt(totals.totalAfterPromo) ? (
                <Typography variant="caption" sx={{ display: "block", opacity: 0.7 }}>
                  Commande exonérée : non exigée par l'administration fiscale
                  pour les commandes inférieures à {WITHHOLDING_THRESHOLD_TTC} DT
                  (total actuel : {totals.totalAfterPromo.toFixed(2)} DT).
                </Typography>
              ) : (
                <>
                  <Button
                    variant={withholdingEnabled ? "contained" : "outlined"}
                    color={withholdingEnabled ? "warning" : "primary"}
                    fullWidth
                    onClick={() => {
                      setWithholdingManuallySet(true);
                      setWithholdingEnabled(!withholdingEnabled);
                    }}
                    sx={{ fontWeight: 800 }}
                  >
                    {withholdingEnabled ? "Retenue activée" : "Activer la retenue"}
                  </Button>

                  <Typography variant="caption" sx={{ display: "block", mt: 1, opacity: 0.7 }}>
                    La retenue à la source n'est pas exigée par l'administration
                    fiscale pour les commandes inférieures à {WITHHOLDING_THRESHOLD_TTC} DT
                    (total actuel : {totals.totalAfterPromo.toFixed(2)} DT).
                    {withholdingManuallySet && (
                      <>
                        {" "}
                        <Box
                          component="span"
                          onClick={() => setWithholdingManuallySet(false)}
                          sx={{
                            cursor: "pointer",
                            color: "primary.main",
                            fontWeight: 700,
                          }}
                        >
                          Revenir à la suggestion automatique
                        </Box>
                      </>
                    )}
                  </Typography>
                </>
              )}
            </Box>

            {/* PROMOTIONS */}
            <Box
              sx={{
                background: "#ffffff",
                borderRadius: 2,
                border: "1px solid #eee",
                p: 2,
                mb: 2,
              }}
            >
              <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1 }}>
                Promotions (fixes)
              </Typography>

              {promoLines.map((line, index) => (
                <Box key={index} sx={{ display: "flex", gap: 1, mb: 1 }}>
                  <TextField
                    fullWidth
                    label="Titre"
                    value={line.title}
                    onChange={(e) => updatePromoLine(index, { title: e.target.value })}
                    placeholder="Ex: geste commercial"
                  />
                  <TextField
                    label="Montant (DT)"
                    type="number"
                    value={line.amount}
                    onChange={(e) => updatePromoLine(index, { amount: e.target.value })}
                    inputProps={{ min: 0, step: "0.01" }}
                    sx={{ width: 140 }}
                  />
                  <IconButton
                    color="error"
                    onClick={() => removePromoLine(index)}
                    disabled={promoLines.length === 1}
                  >
                    <DeleteIcon />
                  </IconButton>
                </Box>
              ))}

              <Button variant="outlined" onClick={addPromoLine} sx={{ mt: 1 }}>
                + Ajouter une promotion
              </Button>

              {promoFixedTooHigh && (
                <Typography sx={{ mt: 1, color: "error.main" }}>
                  Le total des promos fixes doit être &lt;= au total TTC ({totals.totalTTC.toFixed(2)} DT)
                </Typography>
              )}

              <Divider sx={{ my: 2 }} />

              <FormControl fullWidth>
                <InputLabel id="tier-promo-label">
                  Promo pallier (après promos fixes)
                </InputLabel>
                <Select
                  labelId="tier-promo-label"
                  label="Promo pallier (après promos fixes)"
                  value={tierPromoRate}
                  onChange={(e) =>
                    setTierPromoRate(e.target.value as 0 | 0.03 | 0.04 | 0.06)
                  }
                >
                  <MenuItem value={0}>Aucune</MenuItem>
                  <MenuItem value={0.03}>3%</MenuItem>
                  <MenuItem value={0.04}>4%</MenuItem>
                  <MenuItem value={0.06}>6%</MenuItem>
                </Select>
              </FormControl>

              {totals.totalPromo > 0 && !promoFixedTooHigh && (
                <Typography sx={{ mt: 1, color: "text.secondary" }}>
                  Promo totale: <strong>-{totals.totalPromo.toFixed(2)} DT</strong>
                  {totals.promoFixed > 0 && <> (fixes: -{totals.promoFixed.toFixed(2)} DT)</>}
                  {totals.promoTier > 0 && <> (pallier: -{totals.promoTier.toFixed(2)} DT)</>}
                </Typography>
              )}
            </Box>

            {/* COMMENT */}
            <TextField
              fullWidth
              label="Commentaire (optionnel)"
              multiline
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              sx={{ mb: 2 }}
            />

            <Divider sx={{ my: 2 }} />

            {/* CART ITEMS */}
            <Typography variant="subtitle1" sx={{ fontWeight: 900, mb: 1 }}>
              Panier
            </Typography>

            {selectedProducts.length === 0 ? (
              <Typography color="text.secondary" sx={{ mb: 2 }}>
                Aucun produit ajouté.
              </Typography>
            ) : (
              selectedProducts.map((item) => (
                <Card
                  key={item.product.id}
                  sx={{
                    mb: 1.5,
                    p: 1,
                    borderRadius: 2,
                    border: "1px solid #eee",
                    boxShadow: "0px 2px 5px rgba(0,0,0,0.04)",
                  }}
                >
                  <CardContent sx={{ p: 1.5, "&:last-child": { pb: 1.5 } }}>
                    <Typography sx={{ fontWeight: 700 }}>
                      {item.product.name}
                    </Typography>

                    <Typography variant="body2" color="text.secondary">
                      Prix : {round2(item.product.price_ht).toFixed(2)} DT
                    </Typography>

                    <Box sx={{ display: "flex", gap: 1, alignItems: "center", mt: 1 }}>
                      <TextField
                        label="Qté"
                        type="number"
                        value={item.quantity}
                        onChange={(e) =>
                          updateQuantity(item.product.id, Number(e.target.value))
                        }
                        sx={{ width: 110 }}
                      />

                      <IconButton
                        color="error"
                        onClick={() => removeProduct(item.product.id)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  </CardContent>
                </Card>
              ))
            )}

            {/* TOTALS */}
            <Box
              sx={{
                mt: 1,
                p: 1.5,
                background: "#fff",
                border: "1px solid #eee",
                borderRadius: 2,
              }}
            >
              <Typography variant="body2">
                Total HT: <strong>{totals.totalHT.toFixed(2)} DT</strong>
              </Typography>
              <Typography variant="body2">
                TVA 19%: <strong>{totals.tva.toFixed(2)} DT</strong>
              </Typography>
              <Typography variant="body2">
                Total TTC: <strong>{totals.totalTTC.toFixed(2)} DT</strong>
              </Typography>

              {totals.totalPromo > 0 && !promoFixedTooHigh && (
                <Typography variant="body2">
                  Promo totale: <strong>-{totals.totalPromo.toFixed(2)} DT</strong>
                </Typography>
              )}

              <Typography variant="body2" sx={{ mt: 0.5 }}>
                Total à payer: <strong>{totals.totalAfterPromo.toFixed(2)} DT</strong>
              </Typography>
            </Box>

            {/* CREATE */}
            <Button
              fullWidth
              variant="contained"
              color="primary"
              sx={{ mt: 2, py: 1.5, fontWeight: 900 }}
              onClick={handleCreateOrder}
              disabled={creating}
            >
              {creating ? <CircularProgress size={22} /> : "Créer la commande"}
            </Button>
          </Box>
        </Box>
      </Box>

      {/* ==============================
          CLIENTS DRAWER (NEW)
         ============================== */}
      <Drawer
        anchor="left"
        open={clientsDrawerOpen}
        onClose={() => setClientsDrawerOpen(false)}
      >
        <Box sx={{ width: 380, p: 2 }}>
          <Typography variant="h5" sx={{ mb: 2, fontWeight: 900 }}>
            Clients
          </Typography>

          <TextField
            fullWidth
            label="Rechercher des clients"
            value={searchClient}
            onChange={(e) => setSearchClient(e.target.value)}
            sx={{ mb: 2 }}
          />

          <Box sx={{ maxHeight: "80vh", overflowY: "auto", pr: 1 }}>
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
                  }}
                >
                  <CardActionArea
                    onClick={() => {
                      setSelectedClient(c);
                      setClientsDrawerOpen(false);
                    }}
                  >
                    <CardContent>
                      <Typography variant="h6" sx={{ fontWeight: 700 }}>
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

          <Button
            fullWidth
            variant="outlined"
            sx={{ mt: 1, fontWeight: 900 }}
            onClick={() => setClientsDrawerOpen(false)}
          >
            Fermer
          </Button>
        </Box>
      </Drawer>

      {/* SNACKBAR */}
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

export default CreateOrderB2B;