import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Box,
  Button,
  Typography,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from "@mui/material";
import PrepareInvoiceDetailsDrawer from "../epic/invoices/PrepareInvoiceDetailsDrawer";

interface Invoice {
  id: string;
  name: string;
  processed_at: string;
  customer: {
    phone: string;
    email: string;
    first_name: string;
    last_name: string;
  };
  billing_address: {
    address1: string;
    city: string
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

const OrdersToProcess: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [open, setOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  useEffect(() => {
    const fetchInvoices = async () => {
      try {
        const response = await axios.get( `${import.meta.env.VITE_API_URL}invoices/order-to-treat`);
        setInvoices(response.data);
      } catch (error) {
        console.error("Error fetching invoices:", error);
      }
    };

    fetchInvoices();
  }, []);

  const handleOpen = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setSelectedInvoice(null);
  };

  return (
    <Box padding={3}>
      <Typography variant="h4" gutterBottom>
        Commandes à traiter
      </Typography>

      <Divider />

      <TableContainer component={Paper} sx={{ marginTop: 2 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Shopify Order ID</TableCell>
              <TableCell>Numéro de commande</TableCell>
              <TableCell>Date de traitement</TableCell>
              <TableCell>Client</TableCell>
              <TableCell>Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {invoices.map((invoice) => (
              <TableRow key={invoice.id}>
                <TableCell>{invoice.id}</TableCell>
                <TableCell>{invoice.name}</TableCell>
                <TableCell>{invoice.processed_at.split("T")[0]}</TableCell>
                <TableCell>{`${invoice.customer.first_name} ${invoice.customer.last_name}`}</TableCell>
                <TableCell>
                  <Button
                    variant="contained"
                    onClick={() => handleOpen(invoice)}
                  >
                    Voir Détails
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Détails de la facture */}
      <PrepareInvoiceDetailsDrawer
        open={open}
        onClose={handleClose}
        invoice={selectedInvoice}
      />
    </Box>
  );
};

export default OrdersToProcess;
