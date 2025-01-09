import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Box,
  Typography,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Checkbox,
  Button
} from "@mui/material";
import PrepareInvoiceDetailsDrawer from "../epic/invoices/PrepareInvoiceDetailsDrawer";
import { saveAs } from "file-saver";
import Papa from "papaparse";

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
    city: string;
  };
  totalDiscount: number;
  shippingAmount: number;
  line_items: Array<{
    sku: string;
    name: string;
    current_quantity: number;
    price: number;
    vendor: string;
  }>;
}

const OrdersToProcess: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [open, setOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchInvoices = async () => {
      try {
        const response = await axios.get(`${import.meta.env.VITE_API_URL}invoices/order-to-treat`);
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

  const handleSelectOrder = (id: string) => {
    const newSelectedOrders = new Set(selectedOrders);
    if (newSelectedOrders.has(id)) {
      newSelectedOrders.delete(id);
    } else {
      newSelectedOrders.add(id);
    }
    setSelectedOrders(newSelectedOrders);
  };

  const handleExport = () => {
    const selectedInvoices = invoices.filter((invoice) => selectedOrders.has(invoice.id));
  
    const csvData = selectedInvoices.map((invoice) => {
      const customerDetails = [
        invoice.customer.first_name ? `First Name: ${invoice.customer.first_name}` : "",
        invoice.customer.last_name ? `Last Name: ${invoice.customer.last_name}` : "",
        invoice.customer.phone ? `Phone: ${invoice.customer.phone}` : "",
        invoice.customer.email ? `Email: ${invoice.customer.email}` : ""
      ].filter(Boolean).join('\n');

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
  
      const gbTotalPrice = gbDistributionItems.reduce((total, item) => {
        return total + item.price * item.current_quantity;
      }, 0);
  
      const blackTotalPrice = blackItems.reduce((total, item) => {
        return total + item.price * item.current_quantity;
      }, 0);
  
      const combinedTotal = gbTotalPrice + blackTotalPrice;
  
      return {
        "Client": customerDetails,
        "GB Distribution Products": gbDistributionItems.map(item => `${item.vendor} - ${item.name} (${item.current_quantity})`).join(', '),
        "Black Products": blackItems.map(item => `${item.vendor} - ${item.name} (${item.current_quantity})`).join(', '),
        "Total (incl. tax)": combinedTotal.toFixed(2), 
      };
    });
  
    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    saveAs(blob, "fulfillment.csv");
  };    

  return (
    <Box padding={3}>
      <Typography variant="h4" gutterBottom>
        Orders to Process
      </Typography>

      <Divider />

      <Button
        variant="contained"
        onClick={handleExport}
        disabled={selectedOrders.size === 0}
        sx={{ margin: "16px 0" }}
      >
        Export Selected
      </Button>

      <TableContainer component={Paper} sx={{ marginTop: 2 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox
                  checked={selectedOrders.size === invoices.length}
                  onChange={() => {
                    const newSelectedOrders: Set<string> = selectedOrders.size === invoices.length 
                      ? new Set() 
                      : new Set(invoices.map((invoice) => invoice.id));
                    setSelectedOrders(newSelectedOrders);
                  }}
                  sx={{ padding: 0 }} // Align the checkbox padding
                />
              </TableCell>
              <TableCell>Shopify Order ID</TableCell>
              <TableCell>Order Number</TableCell>
              <TableCell>Processing Date</TableCell>
              <TableCell>Customer</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {invoices.map((invoice) => (
              <TableRow 
                key={invoice.id} 
                sx={{ cursor: 'pointer', '&:hover': { backgroundColor: '#f5f5f5' } }} // Change row color on hover
              >
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={selectedOrders.has(invoice.id)}
                    onChange={(event) => {
                      event.stopPropagation(); // Prevent row click event when clicking checkbox
                      handleSelectOrder(invoice.id);
                    }}
                    sx={{ padding: 0 }} // Remove padding for compactness
                  />
                </TableCell>
                <TableCell 
                  padding="none" 
                  sx={{ padding: '4px 8px' }}
                  onClick={() => handleOpen(invoice)} // Only open drawer when clicking the cell
                >
                  {invoice.id}
                </TableCell>
                <TableCell 
                  padding="none" 
                  sx={{ padding: '4px 8px' }}
                  onClick={() => handleOpen(invoice)} 
                >
                  {invoice.name}
                </TableCell>
                <TableCell 
                  padding="none" 
                  sx={{ padding: '4px 8px' }}
                  onClick={() => handleOpen(invoice)} 
                >
                  {invoice.processed_at.split("T")[0]}
                </TableCell>
                <TableCell 
                  padding="none" 
                  sx={{ padding: '4px 8px' }}
                  onClick={() => handleOpen(invoice)} 
                >
                  {`${invoice.customer.first_name} ${invoice.customer.last_name}`}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Invoice Details */}
      <PrepareInvoiceDetailsDrawer
        open={open}
        onClose={handleClose}
        invoice={selectedInvoice}
      />
    </Box>
  );
};

export default OrdersToProcess;
