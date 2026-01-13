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
  comment?: string;

  // ✅ total promo (somme TTC de toutes les promos + pallier)
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

type PromoLine = { title: string; amount: string }; // amount string for TextField

/* ------------------------------------------
   UTILS
------------------------------------------ */

const round2 = (n: number) =>
  Math.round((Number(n) + Number.EPSILON) * 100) / 100;

const clamp0 = (n: number) => (Number.isFinite(n) ? Math.max(0, n) : 0);

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
  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>(
    []
  );

  const [invoiceDate, setInvoiceDate] = useState<string>("");
  const [withholdingEnabled, setWithholdingEnabled] =
    useState<boolean>(false);

  const [comment, setComment] = useState<string>("");

  // ✅ NEW : plusieurs promos fixes (affichage facture only, PAS envoyé au back en détail)
  const [promoLines, setPromoLines] = useState<PromoLine[]>([
    { title: "", amount: "" },
  ]);

  // ✅ Promo 2 : pallier (0 | 3% | 4% | 6%)
  const [tierPromoRate, setTierPromoRate] = useState<0 | 0.03 | 0.04 | 0.06>(0);

  const [loading, setLoading] = useState<boolean>(true);
  const [creating, setCreating] = useState<boolean>(false);

  const [snackbarOpen, setSnackbarOpen] = useState<boolean>(false);
  const [notifyMessage, setNotifyMessage] = useState<string>("");
  const [notifyStatus, setNotifyStatus] = useState<"success" | "error">(
    "success"
  );

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
        resInventory.data.map((i) => [
          String(i.variant_id),
          i.inventory_quantity,
        ])
      );

      const productsWithStock: ProductB2BWithStock[] = resProducts.data.map(
        (p) => ({
          ...p,
          inventory: inventoryMap.get(String(p.variant_id)) ?? 0,
        })
      );

      setClients(resClients.data);
      setProducts(productsWithStock);
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

  const getNextInvoiceNumber = async (
    effectiveDate: string
  ): Promise<string> => {
    const res = await axios.get<InvoiceNumberResponse>(
      `${import.meta.env.VITE_API_URL}invoices/next-number`,
      { params: { effectiveDate } }
    );
    return res.data.invoiceNumber;
  };

  /* ------------------------------------------
     PROMO LINES (UI helpers)
  ------------------------------------------ */

  const updatePromoLine = (index: number, patch: Partial<PromoLine>) => {
    setPromoLines((prev) =>
      prev.map((l, i) => (i === index ? { ...l, ...patch } : l))
    );
  };

  const addPromoLine = () => {
    setPromoLines((prev) => [...prev, { title: "", amount: "" }]);
  };

  const removePromoLine = (index: number) => {
    setPromoLines((prev) => prev.filter((_, i) => i !== index));
  };

  /* ------------------------------------------
     CART TOTALS (TVA FIXE 19%)
     ✅ pallier appliqué APRES promos fixes
  ------------------------------------------ */

  const totals = useMemo(() => {
    const totalHT = selectedProducts.reduce(
      (acc, item) =>
        acc +
        (Number(item.product.price_ht) || 0) * (item.quantity || 0),
      0
    );

    const tva = totalHT * 0.19;
    const totalTTC = totalHT + tva;

    // ✅ somme des promos fixes (TTC)
    const promoFixed = round2(
      promoLines.reduce((sum, l) => sum + clamp0(Number(l.amount || 0)), 0)
    );

    const totalAfterFixed = clamp0(totalTTC - promoFixed);

    // ✅ promo pallier sur le TTC APRES promos fixes
    const promoTier = round2(totalAfterFixed * (tierPromoRate || 0));

    const totalPromo = round2(promoFixed + promoTier);
    const totalAfterPromo = clamp0(totalTTC - totalPromo);

    // ✅ détails propres pour la facture (on garde celles qui ont un montant > 0)
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

      promoFixed: promoFixed,
      fixedPromosForInvoice,

      tierRate: tierPromoRate,
      promoTier: round2(promoTier),

      totalPromo: round2(totalPromo),
      totalAfterPromo: round2(totalAfterPromo),
    };
  }, [selectedProducts, promoLines, tierPromoRate]);

  /* ------------------------------------------
     ADD / UPDATE / REMOVE PRODUCT
  ------------------------------------------ */

  const handleAddProduct = (product: ProductB2BWithStock): void => {
    const existing = selectedProducts.find((p) => p.product.id === product.id);

    if (existing) {
      setSelectedProducts((prev) =>
        prev.map((p) =>
          p.product.id === product.id ? { ...p, quantity: p.quantity + 1 } : p
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
     PROMO HELPERS (SAFE)
     ✅ retourne totalPromoAmount (somme TTC)
     ✅ si pas de promo => null
  ------------------------------------------ */

  const getPromotionTotalAmount = (): number | null => {
    const allowedRates = new Set([0, 0.03, 0.04, 0.06]);
    if (!allowedRates.has(tierPromoRate)) {
      throw new Error("Invalid tier promo rate.");
    }

    if (totals.promoFixed > totals.totalTTC) {
      throw new Error(
        `Promotion amount must be <= invoice total (${totals.totalTTC.toFixed(
          2
        )} DT).`
      );
    }

    const totalPromo = round2(totals.totalPromo);

    if (totalPromo <= 0) return null;
    if (totalPromo > totals.totalTTC) {
      throw new Error("Total promotion must be <= invoice total.");
    }

    return totalPromo;
  };

  /* ------------------------------------------
     GENERATE PDF
  ------------------------------------------ */

  const generateInvoicePdfBlob = async (): Promise<InvoicePdfResult> => {
    if (!selectedClient) throw new Error("Please select a client.");
    if (!invoiceDate) throw new Error("Please select an invoice date.");
    if (selectedProducts.length === 0)
      throw new Error("Please add at least one product.");

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

        // ✅ détails pour la facture
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

      if (!selectedClient) throw new Error("Please select a client.");
      if (!invoiceDate) throw new Error("Please select an invoice date.");
      if (selectedProducts.length === 0)
        throw new Error("Please add products.");

      const totalPromoAmount = getPromotionTotalAmount();
      const { pdfBlob, invoiceNumber } = await generateInvoicePdfBlob();

      // Upload PDF to Drive
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

      // ✅ back = juste le total TTC des promos
      if (totalPromoAmount) {
        payload = {
          ...payload,
          promotion_amount: totalPromoAmount,
        };
      }

      await axios.post(`${import.meta.env.VITE_API_URL}order-b2b`, payload);

      setNotifyMessage("Order created successfully!");
      setNotifyStatus("success");
      setSnackbarOpen(true);

      clearCart();
      setSelectedClient(null);
      setInvoiceDate("");
      setWithholdingEnabled(false);
      setComment("");

      // ✅ reset promos
      setPromoLines([{ title: "", amount: "" }]);
      setTierPromoRate(0);
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

  const promoFixedTooHigh = totals.promoFixed > totals.totalTTC;

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
          .sort((a, b) => {
            if (a.inventory > 0 && b.inventory === 0) return -1;
            if (a.inventory === 0 && b.inventory > 0) return 1;
            return b.inventory - a.inventory;
          })
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
                opacity: p.inventory === 0 ? 0.5 : 1,
                pointerEvents: p.inventory === 0 ? "none" : "auto",
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

                <Typography
                  variant="body2"
                  color={p.inventory === 0 ? "error" : "text.secondary"}
                >
                  {p.inventory === 0 ? "Out of stock" : `Stock: ${p.inventory}`}
                </Typography>

                <Button
                  variant="contained"
                  size="small"
                  sx={{ mt: 1 }}
                  disabled={p.inventory === 0}
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

        {/* ✅ PROMOTIONS (MULTI) */}
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
            Promotions (fixed)
          </Typography>

          {promoLines.map((line, index) => (
            <Box key={index} sx={{ display: "flex", gap: 1, mb: 1 }}>
              <TextField
                fullWidth
                label="Title"
                value={line.title}
                onChange={(e) => updatePromoLine(index, { title: e.target.value })}
                placeholder="Ex: geste commercial"
              />
              <TextField
                label="Amount (DT)"
                type="number"
                value={line.amount}
                onChange={(e) => updatePromoLine(index, { amount: e.target.value })}
                inputProps={{ min: 0, step: "0.01" }}
                sx={{ width: 160 }}
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
            + Add promotion
          </Button>

          {promoFixedTooHigh && (
            <Typography sx={{ mt: 1, color: "error.main" }}>
              Total fixed promos must be &lt;= total TTC ({totals.totalTTC.toFixed(2)} DT)
            </Typography>
          )}

          <Divider sx={{ my: 2 }} />

          {/* Promo pallier */}
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
          label="Comment (optional)"
          multiline
          rows={3}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          sx={{ mb: 3 }}
        />

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

        {/* QUICK TOTAL PREVIEW */}
        <Box
          sx={{
            mt: 2,
            mb: 1,
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