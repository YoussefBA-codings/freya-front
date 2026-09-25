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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Drawer,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
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
  default_price_list_id?: number | null;
}

interface PriceList {
  id: number;
  name: string;
  is_complete: boolean;
  nb_prix: number;
  nb_produits_total: number;
}

interface PriceListItem {
  product_id: number;
  price_ht: number;
}

interface PriceListDetail {
  id: number;
  items: PriceListItem[];
}

interface ProductB2B {
  id: number;
  name: string;
  variant_id: string;
  // Legacy - le prix vit désormais dans la liste sélectionnée (priceMap),
  // jamais sur le produit lui-même.
  price_ht: number | null;
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
  invoice_number?: string;
  invoice_pdf_url?: string;
  invoice_date: string;
  payment_due_date?: string;
  is_paid: boolean;
  withholding_enabled: boolean;
  items: CreateOrderItemPayload[];
  comment?: string;
  promo_exceptionnelle_ttc?: number;
  promo_exceptionnelle_motif?: string;
  price_list_id: number;
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
   UTILS
------------------------------------------ */

const round2 = (n: number) =>
  Math.round((Number(n) + Number.EPSILON) * 100) / 100;

const clamp0 = (n: number) => (Number.isFinite(n) ? Math.max(0, n) : 0);

// Palier de remise B2B (2026-09) : calculé automatiquement, sur le TTC avant
// remise, indépendamment pour chaque commande - aucun cumul entre commandes.
// Doit rester strictement identique à la logique serveur (OrderB2BService),
// qui seule fait foi - cette copie ne sert qu'à l'aperçu en direct.
const DISCOUNT_TIERS = [
  { minTTC: 21000, rate: 0.05 },
  { minTTC: 14000, rate: 0.03 },
  { minTTC: 7000, rate: 0.02 },
  { minTTC: 0, rate: 0 },
];

const getDiscountRate = (ttcBeforeDiscount: number): number => {
  for (const tier of DISCOUNT_TIERS) {
    if (ttcBeforeDiscount >= tier.minTTC) return tier.rate;
  }
  return 0;
};

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
  const [priceLists, setPriceLists] = useState<PriceList[]>([]);
  const [selectedPriceListId, setSelectedPriceListId] = useState<string>("");
  const [priceMap, setPriceMap] = useState<Record<number, number>>({});
  const [priceMapLoading, setPriceMapLoading] = useState<boolean>(false);

  const [searchClient, setSearchClient] = useState<string>("");
  const [searchProduct, setSearchProduct] = useState<string>("");

  const [selectedClient, setSelectedClient] = useState<ClientB2B | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>([]);

  const [invoiceDate, setInvoiceDate] = useState<string>("");
  const [paymentDueDate, setPaymentDueDate] = useState<string>("");
  const [withholdingEnabled, setWithholdingEnabled] = useState<boolean>(false);
  const [withholdingManuallySet, setWithholdingManuallySet] = useState<boolean>(false);
  const [comment, setComment] = useState<string>("");
  const [promoExceptionnelleInput, setPromoExceptionnelleInput] = useState<string>("");
  const [promoExceptionnelleMotif, setPromoExceptionnelleMotif] = useState<string>("");

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

      const resPriceLists = await axios.get<PriceList[]>(
        `${import.meta.env.VITE_API_URL}price-list`
      );

      const inventoryMap = new Map(
        resInventory.data.map((i) => [String(i.variant_id), i.inventory_quantity])
      );

      const productsWithStock: ProductB2BWithStock[] = resProducts.data.map((p) => ({
        ...p,
        inventory: inventoryMap.get(String(p.variant_id)) ?? 0,
      }));

      setClients(resClients.data);
      setProducts(productsWithStock);
      setPriceLists(resPriceLists.data.filter((l) => l.is_complete));
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

  // Pré-remplit la liste de prix avec la dernière utilisée pour ce client
  // (client.default_price_list_id, mis à jour par le back à chaque commande),
  // mais seulement si cette liste est toujours complète - reste modifiable.
  useEffect(() => {
    if (!selectedClient) return;
    if (
      selectedClient.default_price_list_id &&
      priceLists.some((l) => l.id === selectedClient.default_price_list_id)
    ) {
      setSelectedPriceListId(String(selectedClient.default_price_list_id));
    }
  }, [selectedClient, priceLists]);

  // Charge le tableau de prix de la liste sélectionnée - c'est ce tableau
  // (et lui seul) qui pilote l'aperçu du panier, jamais product.price_ht une
  // fois une liste choisie.
  useEffect(() => {
    if (!selectedPriceListId) {
      setPriceMap({});
      return;
    }
    let cancelled = false;
    setPriceMapLoading(true);
    axios
      .get<PriceListDetail>(
        `${import.meta.env.VITE_API_URL}price-list/${selectedPriceListId}`
      )
      .then((res) => {
        if (cancelled) return;
        const map: Record<number, number> = {};
        for (const item of res.data.items) {
          map[item.product_id] = Number(item.price_ht);
        }
        setPriceMap(map);
      })
      .catch(() => {
        if (cancelled) return;
        setNotifyMessage("Échec du chargement de la liste de prix.");
        setNotifyStatus("error");
        setSnackbarOpen(true);
      })
      .finally(() => {
        if (!cancelled) setPriceMapLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedPriceListId]);

  // Prix effectif d'un produit : uniquement celui de la liste sélectionnée -
  // le produit n'a plus de prix propre. Retourne null tant qu'aucune liste
  // n'est choisie ou chargée, pour ne jamais afficher un prix inventé.
  const getEffectivePrice = (product: ProductB2B): number | null =>
    priceMap[product.id] ?? null;

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
     TOTALS (TVA FIXE 19%)
  ------------------------------------------ */

  const totals = useMemo(() => {
    const totalHT = selectedProducts.reduce(
      (acc, item) =>
        acc + (getEffectivePrice(item.product) ?? 0) * (item.quantity || 0),
      0
    );

    const tva = totalHT * 0.19;
    const totalTTC = totalHT + tva;

    const discountRate = getDiscountRate(totalTTC);
    const tierPromo = round2(totalTTC * discountRate);

    // Remise exceptionnelle : ajoutée par-dessus le palier automatique,
    // jamais négative, jamais au-delà de ce qu'il reste à remiser - même
    // plafonnage que côté serveur (OrderB2BService.create), qui seul fait foi.
    const promoExceptionnelleRaw = Number(promoExceptionnelleInput) || 0;
    const promoExceptionnelle = round2(
      clamp0(Math.min(promoExceptionnelleRaw, totalTTC - tierPromo))
    );

    const totalPromo = round2(tierPromo + promoExceptionnelle);
    const totalAfterPromo = clamp0(totalTTC - totalPromo);

    return {
      totalHT: round2(totalHT),
      tva: round2(tva),
      totalTTC: round2(totalTTC),

      discountRate,
      tierPromo,
      promoExceptionnelle,
      totalPromo,
      totalAfterPromo: round2(totalAfterPromo),
    };
  }, [selectedProducts, promoExceptionnelleInput, priceMap]);

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
     GENERATE PDF
  ------------------------------------------ */

  const generateInvoicePdfBlob = async (): Promise<InvoicePdfResult> => {
    if (!selectedClient) throw new Error("Veuillez sélectionner un client.");
    if (!invoiceDate) throw new Error("Veuillez sélectionner une date de facture.");
    if (selectedProducts.length === 0) throw new Error("Veuillez ajouter au moins un produit.");

    const invoiceNumber = await getNextInvoiceNumber(invoiceDate);

    const productsForInvoice = selectedProducts.map((item) => ({
      name: item.product.name,
      variant_id: String(item.product.variant_id),
      price_ht: getEffectivePrice(item.product) ?? 0,
      tva_rate: item.product.tva_rate,
      quantity: item.quantity,
    }));

    const html = generateInvoiceHTML(
      selectedClient,
      productsForInvoice,
      invoiceNumber,
      invoiceDate,
      { totalPromoAmount: totals.totalPromo }
    );

    // pagebreak mode "avoid-all" + "css" : renforce le comportement par
    // défaut de html2pdf (déjà ['css','legacy']) pour qu'aucun bloc/ligne du
    // template ne soit tranché au milieu par le découpage en pages. Absent
    // des types fournis par html2pdf.js (option bien réelle à l'exécution),
    // d'où le cast.
    const pdfBlob = (await html2pdf()
      .set({ pagebreak: { mode: ["avoid-all", "css", "legacy"] } } as any)
      .from(html)
      .outputPdf("blob")) as Blob;
    return { pdfBlob, invoiceNumber };
  };

  /* ------------------------------------------
     CREATE ORDER
  ------------------------------------------ */

  const handleCreateOrder = async (): Promise<void> => {
    // Distingue, en cas d'échec, "la commande n'a jamais été créée" (rien à
    // faire de spécial, on peut resoumettre normalement) de "la commande
    // existe déjà, seule la facture a échoué" (ne JAMAIS resoumettre tout le
    // formulaire, ça créerait une commande en double - juste redéposer la
    // facture pour cette commande).
    let createdOrderId: number | null = null;

    try {
      setCreating(true);

      if (!selectedClient) throw new Error("Veuillez sélectionner un client.");
      if (!invoiceDate) throw new Error("Veuillez sélectionner une date de facture.");
      if (selectedProducts.length === 0) throw new Error("Veuillez ajouter des produits.");
      if (!selectedPriceListId) throw new Error("Veuillez sélectionner une liste de prix.");
      if (totals.promoExceptionnelle > 0 && !promoExceptionnelleMotif.trim()) {
        throw new Error("Veuillez indiquer un motif pour la remise exceptionnelle.");
      }

      // La commande Shopify est créée AVANT toute génération/dépôt de
      // facture - jamais l'inverse. Si createB2BOrder échoue (client
      // introuvable, stock insuffisant, etc.), on s'arrête ici : aucune
      // facture n'a été déposée sur le Drive pour une commande qui n'existe
      // pas (incident du 2026-07-03, client Paramédical Paradiso - un email
      // cassé avait fait échouer la commande APRÈS que la facture soit déjà
      // sur le Drive).
      const basePayload: CreateOrderPayload = {
        client_id: selectedClient.id,
        price_list_id: Number(selectedPriceListId),
        status: "CREATED",
        invoice_date: invoiceDate,
        payment_due_date: paymentDueDate || undefined,
        is_paid: false,
        withholding_enabled: withholdingEnabled,
        items: selectedProducts.map((item) => ({
          product_id: item.product.id,
          quantity: item.quantity,
          price_ht: getEffectivePrice(item.product) ?? 0,
          tva_rate: item.product.tva_rate,
        })),
      };

      const trimmedComment = comment.trim();
      const trimmedPromoMotif = promoExceptionnelleMotif.trim();
      const payload: CreateOrderPayload = {
        ...basePayload,
        ...(trimmedComment ? { comment: trimmedComment } : {}),
        ...(totals.promoExceptionnelle > 0
          ? {
              promo_exceptionnelle_ttc: totals.promoExceptionnelle,
              promo_exceptionnelle_motif: trimmedPromoMotif,
            }
          : {}),
      };

      const orderRes = await axios.post<{ id: number }>(
        `${import.meta.env.VITE_API_URL}order-b2b`,
        payload
      );
      const orderId = orderRes.data.id;
      createdOrderId = orderId;

      // Commande confirmée créée : on peut maintenant générer et déposer la
      // facture en toute sécurité. Un échec à partir d'ici n'affecte plus
      // que la facture (rattrapable en relançant juste l'attache), jamais la
      // commande elle-même.
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

      await axios.patch(`${import.meta.env.VITE_API_URL}order-b2b/${orderId}/invoice`, {
        invoice_pdf_url: url,
        invoice_number: invoiceNumber,
        invoice_date: invoiceDate,
      });

      setNotifyMessage("Commande créée avec succès !");
      setNotifyStatus("success");
      setSnackbarOpen(true);

      clearCart();
      setSelectedClient(null);
      setSelectedPriceListId("");
      setInvoiceDate("");
      setWithholdingEnabled(false);
      setWithholdingManuallySet(false);
      setComment("");
      setPromoExceptionnelleInput("");
      setPromoExceptionnelleMotif("");
      setDraftQty({});
    } catch (err: unknown) {
      let errorMessage = createdOrderId
        ? `Commande #${createdOrderId} créée sur Shopify, mais échec du dépôt de la facture - NE PAS resoumettre le formulaire (doublon). `
        : "Échec de la création de la commande. ";

      if (axios.isAxiosError(err)) {
        errorMessage += err.response?.data?.message || err.message || "Erreur de requête.";
      } else if (err instanceof Error) {
        errorMessage += err.message;
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
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          gap: 2,
          alignItems: "flex-start",
        }}
      >
        {/* LEFT: Products + top bar */}
        <Box sx={{ flex: 1, minWidth: 0, width: "100%" }}>
          {/* Top bar: client + excel actions */}
          <Box
            sx={{
              mb: 2,
              p: 2,
              borderRadius: 3,
              backgroundColor: "grey.50",
              border: "1px solid",
              borderColor: "divider",
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
                  {selectedClient ? selectedClient.name : "Aucun client sélectionné"}
                </Typography>
              </Box>

              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <FormControl sx={{ minWidth: 220 }} required>
                  <InputLabel>Liste de prix</InputLabel>
                  <Select
                    label="Liste de prix"
                    value={selectedPriceListId}
                    onChange={(e) => setSelectedPriceListId(e.target.value)}
                  >
                    {priceLists.map((l) => (
                      <MenuItem key={l.id} value={String(l.id)}>
                        {l.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                {priceMapLoading && <CircularProgress size={20} />}
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
              backgroundColor: "grey.50",
              border: "1px solid",
              borderColor: "divider",
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
                                    {getEffectivePrice(p) != null ? (
                                      <>
                                        <strong>{round2(getEffectivePrice(p)!).toFixed(2)}</strong> DT
                                      </>
                                    ) : (
                                      <Typography component="span" color="text.secondary">
                                        Choisir une liste de prix
                                      </Typography>
                                    )}
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

        {/* RIGHT: Order Summary (fixed width + sticky on desktop, full width & static on mobile) */}
        <Box
          sx={{
            width: { xs: "100%", md: rightPanelWidth },
            flex: "0 0 auto",
            position: { xs: "static", md: "sticky" },
            top: 16,
            alignSelf: "flex-start",
          }}
        >
          <Box
            sx={{
              p: 2,
              borderRadius: 3,
              backgroundColor: "grey.50",
              border: "1px solid",
              borderColor: "divider",
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

            {/* PAYMENT DUE DATE */}
            <TextField
              fullWidth
              label="Échéance de paiement (optionnel)"
              type="date"
              InputLabelProps={{ shrink: true }}
              value={paymentDueDate}
              onChange={(e) => setPaymentDueDate(e.target.value)}
              helperText="Non définie : la commande sera considérée en retard 1 mois après la date de facture."
              sx={{ mb: 2 }}
            />

            {/* WITHHOLDING */}
            <Box
              sx={{
                background: "background.paper",
                borderRadius: 2,
                border: "1px solid",
                borderColor: "divider",
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
                background: "background.paper",
                borderRadius: 2,
                border: "1px solid",
                borderColor: "divider",
                p: 2,
                mb: 2,
              }}
            >
              <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1 }}>
                Remise automatique
              </Typography>

              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                Calculée automatiquement sur le total TTC de cette commande, sans
                saisie manuelle : &lt;7 000 DT = 0% · 7 000-13 999,999 DT = 2% ·
                14 000-20 999,999 DT = 3% · à partir de 21 000 DT = 5%.
              </Typography>

              <Typography sx={{ mt: 1 }}>
                Taux applicable : <strong>{(totals.discountRate * 100).toFixed(0)}%</strong>
                {totals.tierPromo > 0 && (
                  <> — Remise : <strong>-{totals.tierPromo.toFixed(2)} DT</strong></>
                )}
              </Typography>

              <Divider sx={{ my: 1.5 }} />

              <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1 }}>
                Remise exceptionnelle
              </Typography>

              <Typography variant="body2" sx={{ color: "text.secondary", mb: 1 }}>
                Remise ponctuelle décidée pour cette commande, en plus de la remise
                automatique. Un motif est obligatoire dès qu'un montant est saisi.
              </Typography>

              <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}>
                <TextField
                  label="Montant (DT TTC)"
                  type="number"
                  value={promoExceptionnelleInput}
                  onChange={(e) => setPromoExceptionnelleInput(e.target.value)}
                  sx={{ width: 180 }}
                />
                <TextField
                  label="Motif"
                  value={promoExceptionnelleMotif}
                  onChange={(e) => setPromoExceptionnelleMotif(e.target.value)}
                  required={totals.promoExceptionnelle > 0}
                  error={totals.promoExceptionnelle > 0 && !promoExceptionnelleMotif.trim()}
                  helperText={
                    totals.promoExceptionnelle > 0 && !promoExceptionnelleMotif.trim()
                      ? "Obligatoire"
                      : " "
                  }
                  sx={{ flex: 1, minWidth: 220 }}
                />
              </Box>

              {totals.promoExceptionnelle > 0 && (
                <Typography sx={{ mt: 1 }}>
                  Remise exceptionnelle : <strong>-{totals.promoExceptionnelle.toFixed(2)} DT</strong>
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
                  variant="outlined"
                  sx={{
                    mb: 1.5,
                    p: 1,
                    borderRadius: 2,
                  }}
                >
                  <CardContent sx={{ p: 1.5, "&:last-child": { pb: 1.5 } }}>
                    <Typography sx={{ fontWeight: 700 }}>
                      {item.product.name}
                    </Typography>

                    <Typography variant="body2" color="text.secondary">
                      Prix :{" "}
                      {getEffectivePrice(item.product) != null
                        ? `${round2(getEffectivePrice(item.product)!).toFixed(2)} DT`
                        : "en attente d'une liste de prix"}
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
                background: "background.paper",
                border: "1px solid",
                borderColor: "divider",
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

              {totals.tierPromo > 0 && (
                <Typography variant="body2">
                  Remise palier: <strong>-{totals.tierPromo.toFixed(2)} DT</strong>
                </Typography>
              )}
              {totals.promoExceptionnelle > 0 && (
                <Typography variant="body2">
                  Remise exceptionnelle: <strong>-{totals.promoExceptionnelle.toFixed(2)} DT</strong>
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
              disabled={creating || !selectedPriceListId || priceMapLoading}
            >
              {creating ? <CircularProgress size={22} /> : "Créer la commande"}
            </Button>
            {!selectedPriceListId && (
              <Typography variant="body2" color="error" sx={{ mt: 1 }}>
                Sélectionnez une liste de prix pour pouvoir créer la commande.
              </Typography>
            )}
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
        sx={{ zIndex: (theme) => theme.zIndex.drawer + 2 }}
      >
        <Box sx={{ width: { xs: "100vw", sm: 380 }, p: 2 }}>
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
                  variant="outlined"
                  sx={{
                    mb: 2,
                    borderRadius: 2,
                    transition: "0.2s",
                    borderWidth: selectedClient?.id === c.id ? 2 : 1,
                    borderColor:
                      selectedClient?.id === c.id ? "primary.main" : "divider",
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