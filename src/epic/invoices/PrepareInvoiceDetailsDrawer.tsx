import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Typography,
  Box,
  Divider,
  Grid,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import Inventory2Icon from "@mui/icons-material/Inventory2";
import { format } from "date-fns";

interface InvoiceDetailsDrawerProps {
  open: boolean;
  onClose: () => void;
  invoice: Invoice | null;
}

interface Invoice {
  id: string;
  name: string;
  processed_at: string;
  customer: {
    email?: string;
    phone?: string;
    first_name: string;
    last_name: string;
  };
  billing_address: {
    address1: string;
    city: string;
  };
  totalDiscount: number;
  shippingAmount: number;
  line_items: Array<{
    sku: string;
    name: string;
    current_quantity: number;
    price: number;
  }>;
}

const PrepareInvoiceDetailsDrawer: React.FC<InvoiceDetailsDrawerProps> = ({
  open,
  onClose,
  invoice,
}) => {
  if (!invoice) return null;

  // Separate items based on the "B_" prefix
  const gbDistributionItems = invoice.line_items.filter(
    (item) =>
      item.sku &&
      item.sku !== undefined &&
      item.sku !== "" &&
      !item.sku.startsWith("B_")
  );

  const blackItems = invoice.line_items.filter(
    (item) => !gbDistributionItems.includes(item)
  );

  // Calculate required packages, capped between 1 and 2
  const requiredPackages =
    blackItems.length === 0 && gbDistributionItems.length === 0
      ? 0
      : blackItems.length === 0 || gbDistributionItems.length === 0
      ? 1
      : 2;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">
            Détails de la facture {invoice.name}
          </Typography>
          <IconButton onClick={onClose} edge="end">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent dividers>
        {/* Order Details */}
        <Box paddingY={2}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" color="textSecondary">
                Shopify Order ID
              </Typography>
              <Typography variant="body1">{invoice.id}</Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Box display="flex" alignItems="center">
                <LocalShippingIcon
                  fontSize="small"
                  sx={{ mr: 1, color: "gray" }}
                />
                <Typography variant="subtitle2" color="textSecondary">
                  Date de la facture
                </Typography>
              </Box>
              <Typography variant="body1">
                {format(new Date(invoice.processed_at), "dd-MM-yyyy")}
              </Typography>
            </Grid>

            <Grid item xs={12} sm={6}>
              <Box display="flex" alignItems="center">
                <Inventory2Icon
                  fontSize="small"
                  sx={{ mr: 1, color: "gray" }}
                />
                <Typography variant="subtitle2" color="textSecondary">
                  Client
                </Typography>
              </Box>
              <Typography variant="body1">
                {invoice.customer.first_name} {invoice.customer.last_name} -{" "}
                {invoice.billing_address.address1},{" "}
                {invoice.billing_address.city}
              </Typography>
            </Grid>

            {invoice.customer.email && (
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="textSecondary">
                  Email
                </Typography>
                <Typography variant="body1">
                  {invoice.customer.email}
                </Typography>
              </Grid>
            )}

            {invoice.customer.phone && (
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="textSecondary">
                  Téléphone
                </Typography>
                <Typography variant="body1">
                  {invoice.customer.phone}
                </Typography>
              </Grid>
            )}

            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" color="textSecondary">
                Nombre de colis requis
              </Typography>
              <Typography variant="body1">{requiredPackages}</Typography>
            </Grid>
          </Grid>
        </Box>
        <Divider />

        {/* Black Items Section */}
        {blackItems.length > 0 && (
          <Box marginTop={2}>
            <Typography
              variant="subtitle1"
              gutterBottom
              sx={{ color: "orange", fontWeight: "bold" }}
            >
              Articles BLACK :
            </Typography>
            {blackItems.map((item, index) => (
              <Box
                key={index}
                display="flex"
                justifyContent="space-between"
                paddingY={1}
                borderBottom="1px solid #e0e0e0"
              >
                <Typography variant="body1">{item.name}</Typography>
                <Typography variant="body1">
                  {item.current_quantity} unité(s)
                </Typography>
              </Box>
            ))}
            <Box paddingY={1}>
              <Typography variant="subtitle1">Frais de livraison :</Typography>
              <Typography
                variant="body2"
                sx={{ color: "green", fontWeight: "bold" }}
              >
                0 TND
              </Typography>
              <Typography variant="subtitle1">Réduction totale :</Typography>
              <Typography
                variant="body2"
                sx={{ color: "red", fontWeight: "bold" }}
              >
                0 TND
              </Typography>
            </Box>
          </Box>
        )}

        {blackItems.length > 0 && gbDistributionItems.length > 0 && <Divider />}

        {/* GB Distribution Items Section */}
        {gbDistributionItems.length > 0 && (
          <Box marginTop={2}>
            <Typography
              variant="subtitle1"
              gutterBottom
              sx={{ color: "blue", fontWeight: "bold" }}
            >
              Articles GB Distribution :
            </Typography>
            {gbDistributionItems.map((item, index) => (
              <Box
                key={index}
                display="flex"
                justifyContent="space-between"
                paddingY={1}
                borderBottom="1px solid #e0e0e0"
              >
                <Typography variant="body1">{item.name}</Typography>
                <Typography variant="body1">
                  {item.current_quantity} unité(s)
                </Typography>
              </Box>
            ))}
            <Box paddingY={1}>
              <Typography variant="subtitle1">Frais de livraison :</Typography>
              <Typography
                variant="body2"
                sx={{ color: "green", fontWeight: "bold" }}
              >
                {invoice.shippingAmount} TND
              </Typography>
              <Typography variant="subtitle1">Réduction totale :</Typography>
              <Typography
                variant="body2"
                sx={{ color: "red", fontWeight: "bold" }}
              >
                {invoice.totalDiscount} TND
              </Typography>
            </Box>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PrepareInvoiceDetailsDrawer;
