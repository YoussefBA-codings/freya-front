import React from "react";
import { Dialog, DialogTitle, DialogContent, IconButton, Typography, Box, Divider, Grid } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import EventIcon from "@mui/icons-material/Event";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import Inventory2Icon from "@mui/icons-material/Inventory2";
import { format } from "date-fns";

interface InvoiceDetailsDrawerProps {
  open: boolean;
  onClose: () => void;
  invoice: Invoice | null;
}

interface Invoice {
  orderShopifyID: string;
  orderNumber: string;
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
}

const InvoiceDetailsDrawer: React.FC<InvoiceDetailsDrawerProps> = ({ open, onClose, invoice }) => {
  if (!invoice) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">Détails de la facture {invoice.orderNumber}</Typography>
          <IconButton onClick={onClose} edge="end">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent dividers>
        {/* Détails principaux de la commande */}
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
                {invoice.totalDiscount ? invoice.totalDiscount : 0 } TND
              </Typography>
            </Grid>
            <Grid item xs={6} md={4} display="flex" alignItems="center">
              <AttachMoneyIcon fontSize="small" style={{ marginRight: 4 }} />
              <Typography variant="subtitle1">Frais de livraison :</Typography>
              <Typography variant="body2" color="textSecondary" style={{ marginLeft: 8 }}>
                {invoice.shippingAmount ? invoice.shippingAmount : 0} TND
              </Typography>
            </Grid>
          </Grid>
        </Box>

        <Divider />

        {/* Section des items */}
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
                    <Typography variant="body2">{(item.quantity * item.unit_cost)} TND</Typography>
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

        {/* Liens pour la facture et le crédit */}
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
  );
};

export default InvoiceDetailsDrawer;