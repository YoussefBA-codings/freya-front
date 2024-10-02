import React, { useState } from "react";
import {
  TextField,
  Button,
  Box,
  Typography,
  Grid,
  CircularProgress,
} from "@mui/material";
import Notification from "../elements/Notification";

// Interface pour l'InvoiceData
export interface InvoiceData {
  shipping_address: {
    first_name: string;
    address1: string;
    city: string;
    zip: string;
    country: string;
  };
  name: string;
  processed_at: string;
  line_items: {
    sku?: string;
    name: string;
    quantity: number;
    price: number;
  }[];
  total_shipping_price_set: {
    presentment_money: {
      amount: number;
    };
  };
  total_discounts: number;
  total_tax: number;
  invoice_forced_name?: string; // Ajout du champ optionnel
}

const CreateInvoice: React.FC = () => {
  const [formData, setFormData] = useState({
    first_name: "",
    address1: "",
    city: "",
    zip: "",
    country: "",
    name: "",
    processed_at: new Date().toISOString(),
    line_items: [{ sku: "", name: "", quantity: 1, price: 0 }],
    total_shipping_price: 0,
    total_discounts: 0,
    total_tax: 0,
    invoice_forced_name: "", // Champ optionnel pour le nom de la facture
  });

  const [loading, setLoading] = useState(false);
  const [notify, setNotify] = useState(false);
  const [notifyMessage, setNotifyMessage] = useState("");
  const [notifyStatus, setNotifyStatus] = useState<"success" | "error">("success");

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>, index?: number) => {
    const { name, value } = e.target;

    if (index !== undefined) {
      const updatedItems = formData.line_items.map((item, idx) =>
        idx === index ? { ...item, [name]: value } : item
      );
      setFormData({ ...formData, line_items: updatedItems });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const addItem = () => {
    setFormData({
      ...formData,
      line_items: [...formData.line_items, { sku: "", name: "", quantity: 1, price: 0 }],
    });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const invoiceData: InvoiceData = {
      shipping_address: {
        first_name: formData.first_name,
        address1: formData.address1,
        city: formData.city,
        zip: formData.zip,
        country: formData.country,
      },
      name: formData.name,
      processed_at: formData.processed_at,
      line_items: formData.line_items.map((item) => ({
        sku: item.sku,
        name: item.name,
        quantity: Number(item.quantity),
        price: Number(item.price),
      })),
      total_shipping_price_set: {
        presentment_money: {
          amount: Number(formData.total_shipping_price),
        },
      },
      total_discounts: Number(formData.total_discounts),
      total_tax: Number(formData.total_tax),
      invoice_forced_name: formData.invoice_forced_name, // Ajout du champ optionnel dans le body
    };

    try {
      const response = await fetch("http://localhost:3000/invoices/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(invoiceData),
      });

      if (!response.ok) {
        throw new Error("Failed to create invoice");
      }

      setNotify(true);
      setNotifyMessage("Invoice created successfully!");
      setNotifyStatus("success");

      // Reset form after successful submission
      setFormData({
        first_name: "",
        address1: "",
        city: "",
        zip: "",
        country: "",
        name: "",
        processed_at: new Date().toISOString(),
        line_items: [{ sku: "", name: "", quantity: 1, price: 0 }],
        total_shipping_price: 0,
        total_discounts: 0,
        total_tax: 0,
        invoice_forced_name: "", // Réinitialiser le champ optionnel
      });
    } catch (error) {
      setNotify(true);
      setNotifyMessage("Error creating invoice, please check logs!");
      setNotifyStatus("error");
      console.error("Error creating invoice:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ padding: 3, borderRadius: 2, boxShadow: 3 }}>
        <Typography variant="h2" gutterBottom>
        Create Invoice 
      </Typography>
      <Typography variant="h5" gutterBottom>Shipping Information</Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            variant="outlined"
            label="First Name"
            name="first_name"
            value={formData.first_name}
            onChange={handleInputChange}
            required
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            variant="outlined"
            label="Address"
            name="address1"
            value={formData.address1}
            onChange={handleInputChange}
            required
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            variant="outlined"
            label="City"
            name="city"
            value={formData.city}
            onChange={handleInputChange}
            required
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            variant="outlined"
            label="Zip Code"
            name="zip"
            value={formData.zip}
            onChange={handleInputChange}
            required
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth
            variant="outlined"
            label="Country"
            name="country"
            value={formData.country}
            onChange={handleInputChange}
            required
          />
        </Grid>
      </Grid>

      <Typography variant="h5" gutterBottom sx={{ marginTop: 3 }}>Invoice Details</Typography>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <TextField
            fullWidth
            variant="outlined"
            label="Order Name"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            required
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth
            variant="outlined"
            type="datetime-local"
            name="processed_at"
            value={formData.processed_at}
            onChange={handleInputChange}
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth
            variant="outlined"
            label="Forced Invoice Name (Optional)"
            name="invoice_forced_name"
            value={formData.invoice_forced_name}
            onChange={handleInputChange}
          />
        </Grid>
      </Grid>

      <Typography variant="h5" gutterBottom sx={{ marginTop: 3 }}>Line Items</Typography>
      {formData.line_items.map((item, index) => (
        <Grid container spacing={2} key={index}>
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              variant="outlined"
              label="SKU"
              name="sku"
              value={item.sku}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange(e, index)}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              variant="outlined"
              label="Product Name"
              name="name"
              value={item.name}
              onChange={(e:React.ChangeEvent<HTMLInputElement>) => handleInputChange(e, index)}
              required
            />
          </Grid>
          <Grid item xs={12} sm={2}>
            <TextField
              fullWidth
              variant="outlined"
              type="number"
              label="Quantity"
              name="quantity"
              value={item.quantity}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange(e, index)}
              required
            />
          </Grid>
          <Grid item xs={12} sm={2}>
            <TextField
              fullWidth
              variant="outlined"
              type="number"
              name="price"
              value={item.price}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange(e, index)}
              required
            />
          </Grid>
        </Grid>
      ))}
      <Button variant="outlined" onClick={addItem} sx={{ marginTop: 2 }}>
        Add Item
      </Button>

      <Typography variant="h5" gutterBottom sx={{ marginTop: 3 }}>Additional Costs</Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            variant="outlined"
            type="number"
            label="Total Shipping Price"
            name="total_shipping_price"
            value={formData.total_shipping_price}
            onChange={handleInputChange}
            required
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            variant="outlined"
            type="number"
            label="Total Discounts"
            name="total_discounts"
            value={formData.total_discounts}
            onChange={handleInputChange}
            required
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            variant="outlined"
            type="number"
            label="Total Tax"
            name="total_tax"
            value={formData.total_tax}
            onChange={handleInputChange}
            required
          />
        </Grid>
      </Grid>

      <Box sx={{ display: "flex", justifyContent: "center", marginTop: 3 }}>
        <Button variant="contained" color="primary" type="submit" disabled={loading}>
          {loading ? <CircularProgress size={24} /> : "Create Invoice"}
        </Button>
      </Box>

      {notify && (
        <Notification message={notifyMessage} type={notifyStatus} />
      )}
    </Box>
  );
};

export default CreateInvoice;