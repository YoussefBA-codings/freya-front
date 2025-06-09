import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Typography,
  Box,
  Divider,
  Grid,
  Button,
  CircularProgress,
  TextField,
  DialogActions,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import EventIcon from "@mui/icons-material/Event";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import Inventory2Icon from "@mui/icons-material/Inventory2";
import { format } from "date-fns";
import axios from "axios";

interface InvoiceDetailsDrawerProps {
  open: boolean;
  onClose: () => void;
  invoice: Invoice | null;
}

interface Invoice {
  id: string;
  orderNumber: string;
  orderShopifyID: string;
  isCancelled: boolean;
  isInvoiceCreated: boolean;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  customerName: string;
  addressLine1: string;
  city: string;
  zip: string;
  totalDiscount: number;
  shippingAmount: number;
  invoiceUrl: string;
  creditUrl: string;
  items: Array<{
    sku: string;
    name: string;
    quantity: number;
    unit_cost: number;
  }>;
  countedProducts: Array<{
    sku?: string;
    name?: string;
    quantity?: number;
    unit_cost?: number;
  }>;
  ignoredProducts: Array<{
    sku?: string;
    name?: string;
    quantity?: number;
    unit_cost?: number;
  }>;
  totalAmountExcludingTax: string;
  totalAmountIncludingTax: string;
  TVA: string;
  fiscalStamp: string;
  gbDroppexRef: string;
  blkDroppexRef: string;
}

const InvoiceDetailsDrawer: React.FC<InvoiceDetailsDrawerProps> = ({ open, onClose, invoice }) => {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [loadingDelete, setLoadingDelete] = useState(false);

  const [editDroppexOpen, setEditDroppexOpen] = useState(false);
  const [gbDroppexRef, setGbDroppexRef] = useState("");
  const [blkDroppexRef, setBlkDroppexRef] = useState("");
  const [loadingUpdate, setLoadingUpdate] = useState(false);

  if (!invoice) return null;

  const handleDeleteInvoice = async () => {
    setLoadingDelete(true);
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL}invoices`, {
        data: { ids: [invoice.id] },
        headers: { "Content-Type": "application/json" },
      });
      onClose();
      window.location.reload();
    } catch (error) {
      console.error("Erreur lors de la suppression :", error);
      alert("La suppression a échoué.");
    } finally {
      setLoadingDelete(false);
    }
  };

  const handleOpenEditDroppex = () => {
    setGbDroppexRef(invoice.gbDroppexRef || "");
    setBlkDroppexRef(invoice.blkDroppexRef || "");
    setEditDroppexOpen(true);
  };

  const handleUpdateDroppexRefs = async () => {
    setLoadingUpdate(true);
    try {
      await axios.put(
        `${import.meta.env.VITE_API_URL}invoices/update/droppexRefs/shopifyId/${invoice.orderShopifyID}`,
        {
          gbDroppexRef: gbDroppexRef || undefined,
          blkDroppexRef: blkDroppexRef || undefined,
        },
        {
          headers: { "Content-Type": "application/json" },
        }
      );
      setEditDroppexOpen(false);
      window.location.reload();
    } catch (error) {
      console.error("Erreur lors de la mise à jour :", error);
      alert("La mise à jour a échoué.");
    } finally {
      setLoadingUpdate(false);
    }
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">Détails de la facture {invoice.orderNumber}</Typography>
            <Box display="flex" alignItems="center">
              <IconButton onClick={handleOpenEditDroppex} edge="end" title="Modifier les références Droppex">
                <EditIcon />
              </IconButton>
              {!confirmDelete && (
                <IconButton onClick={() => setConfirmDelete(true)} edge="end" title="Supprimer la facture">
                  <DeleteIcon />
                </IconButton>
              )}
              <IconButton onClick={onClose} edge="end" title="Fermer">
                <CloseIcon />
              </IconButton>
            </Box>
          </Box>
        </DialogTitle>

        <DialogContent dividers>
          {confirmDelete && (
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="body1">Confirmer la suppression de cette facture ?</Typography>
              <Box>
                <Button variant="outlined" onClick={() => setConfirmDelete(false)} disabled={loadingDelete}>
                  Annuler
                </Button>
                <Button
                  variant="contained"
                  color="error"
                  onClick={handleDeleteInvoice}
                  sx={{ ml: 2 }}
                  disabled={loadingDelete}
                  startIcon={loadingDelete ? <CircularProgress size={16} /> : null}
                >
                  {loadingDelete ? "Suppression..." : "Confirmer"}
                </Button>
              </Box>
            </Box>
          )}

          {/* Détails commande */}
          <Box paddingY={2}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12}>
                <Typography variant="subtitle1">Shopify Order ID : {invoice.orderShopifyID}</Typography>
              </Grid>
              <Grid item xs={12} md={6} display="flex" alignItems="center">
                <EventIcon fontSize="small" style={{ marginRight: 4 }} />
                <Typography variant="subtitle1">Date de la facture :</Typography>
                <Typography variant="body2" color="textSecondary" style={{ marginLeft: 8 }}>
                  {format(new Date(invoice.invoiceDate), "dd-MM-yyyy")}
                </Typography>
              </Grid>
              <Grid item xs={12} md={6} display="flex" alignItems="center">
                <LocalShippingIcon fontSize="small" style={{ marginRight: 4 }} />
                <Typography variant="subtitle1">Date d'échéance :</Typography>
                <Typography variant="body2" color="textSecondary" style={{ marginLeft: 8 }}>
                  {format(new Date(invoice.dueDate), "dd-MM-yyyy")}
                </Typography>
              </Grid>
              <Grid item xs={12} display="flex" alignItems="center">
                <Inventory2Icon fontSize="small" style={{ marginRight: 4 }} />
                <Typography variant="subtitle1">Client :</Typography>
                <Typography variant="body2" color="textSecondary" style={{ marginLeft: 8 }}>
                  {invoice.customerName} - {invoice.addressLine1}, {invoice.city}, {invoice.zip}
                </Typography>
              </Grid>
              <Grid item xs={6} md={4} display="flex" alignItems="center">
                <AttachMoneyIcon fontSize="small" style={{ marginRight: 4 }} />
                <Typography variant="subtitle1">Réduction totale :</Typography>
                <Typography variant="body2" color="textSecondary" style={{ marginLeft: 8 }}>
                  {invoice.totalDiscount || 0} TND
                </Typography>
              </Grid>
              <Grid item xs={6} md={4} display="flex" alignItems="center">
                <AttachMoneyIcon fontSize="small" style={{ marginRight: 4 }} />
                <Typography variant="subtitle1">Frais de livraison :</Typography>
                <Typography variant="body2" color="textSecondary" style={{ marginLeft: 8 }}>
                  {invoice.shippingAmount || 0} TND
                </Typography>
              </Grid>
            </Grid>
          </Box>

          <Divider />

          {/* Articles */}
          <Box marginTop={2}>
            <Typography variant="subtitle1" gutterBottom>Articles de la commande :</Typography>
            <Box>
              {invoice.items.length > 0 ? (
                invoice.items.map((item, index) => (
                  <Box key={index} display="flex" justifyContent="space-between" paddingY={1} borderBottom="1px solid #e0e0e0">
                    <Box>
                      <Typography variant="body1">{item.name}</Typography>
                      <Typography variant="caption" color="textSecondary">SKU: {item.sku}</Typography>
                    </Box>
                    <Box display="flex" alignItems="center">
                      <Typography variant="body2" style={{ marginRight: 8 }}>
                        {item.quantity} x {item.unit_cost} TND
                      </Typography>
                      <Typography variant="body2">{item.quantity * item.unit_cost} TND</Typography>
                    </Box>
                  </Box>
                ))
              ) : (
                <Typography variant="body2" color="textSecondary" textAlign="center" paddingY={2}>
                  Aucun article dans cette commande
                </Typography>
              )}
            </Box>
          </Box>

          <Divider />

          {/* Liens facture/crédit */}
          <Box marginTop={2}>
            {invoice.invoiceUrl && (
              <Typography variant="body2" color="primary">
                <a href={invoice.invoiceUrl} target="_blank" rel="noopener noreferrer">Voir la facture</a>
              </Typography>
            )}
            {invoice.creditUrl && (
              <Typography variant="body2" color="primary">
                <a href={invoice.creditUrl} target="_blank" rel="noopener noreferrer">Voir le crédit</a>
              </Typography>
            )}
          </Box>
        </DialogContent>
      </Dialog>

      {/* Dialog Edition Droppex Refs */}
      <Dialog open={editDroppexOpen} onClose={() => setEditDroppexOpen(false)}>
        <DialogTitle>Modifier les références Droppex</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            margin="normal"
            label="gbDroppexRef"
            value={gbDroppexRef}
            onChange={(e) => setGbDroppexRef(e.target.value)}
          />
          <TextField
            fullWidth
            margin="normal"
            label="blkDroppexRef"
            value={blkDroppexRef}
            onChange={(e) => setBlkDroppexRef(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDroppexOpen(false)} disabled={loadingUpdate}>Annuler</Button>
          <Button onClick={handleUpdateDroppexRefs} variant="contained" disabled={loadingUpdate}>
            {loadingUpdate ? <CircularProgress size={16} /> : "Enregistrer"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default InvoiceDetailsDrawer;