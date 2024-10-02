import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  TextField,
  Button,
  Box,
  Typography,
  Grid,
  FormControlLabel,
  Checkbox,
  CircularProgress,
} from "@mui/material";
import Notification from "../elements/Notification";

export interface InvoiceUpdateType {
  orderNumber?: string;
  invoiceForcedName?: string;
  invoiceDate?: Date;
  dueDate?: Date;
  customerName?: string;
  addressLine1?: string;
  city?: string;
  zip?: string;
  country?: string;
  totalTax?: number;
  totalDiscount?: number;
  shippingAmount?: number;
  items?: ItemType[];
}

export interface ItemType {
  name: string; // Name of the item
  quantity: number; // Quantity
  price: number; // Price
  sku: string; // SKU of the item
}

const UpdateInvoice: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(false);
  const [notify, setNotify] = useState(false);
  const [notifyMessage, setNotifyMessage] = useState("");
  const [notifyStatus, setNotifyStatus] = useState("error");
  const [formData, setFormData] = useState<InvoiceUpdateType>({
    orderNumber: "",
    invoiceForcedName: "",
    invoiceDate: new Date(), // Format date YYYY-MM-DD
    dueDate: new Date(),
    customerName: "",
    addressLine1: "",
    city: "",
    zip: "",
    country: "",
    totalTax: 0,
    totalDiscount: 0,
    shippingAmount: 0,
    items: [],
  });

  const [editFields, setEditFields] = useState({
    orderNumber: false,
    invoiceForcedName: false,
    invoiceDate: false,
    dueDate: false,
    customerName: false,
    addressLine1: false,
    city: false,
    zip: false,
    country: false,
    totalTax: false,
    totalDiscount: false,
    shippingAmount: false,
    items: true,
  });

  useEffect(() => {
    const fetchInvoice = async () => {
      try {
        const response = await fetch(`http://localhost:3000/invoices/${id}`);
        if (!response.ok) {
          throw new Error("Failed to fetch invoice");
        }
        const data: InvoiceUpdateType = await response.json();
        setFormData(data);
      } catch (error) {
        console.error("Error fetching invoice:", error);
      }
    };

    fetchInvoice();
  }, [id]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleItemChange = (
    index: number,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const updatedItems = [...prev.items!];
      updatedItems[index] = {
        ...updatedItems[index],
        [name]: name === "quantity" || name === "price" ? Number(value) : value,
      };
      return { ...prev, items: updatedItems };
    });
  };

  const handleAddItem = () => {
    setFormData((prev) => ({
      ...prev,
      items: [...prev.items!, { name: "", quantity: 0, price: 0, sku: "" }],
    }));
  };

  const handleRemoveItem = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items!.filter((_, i) => i !== index),
    }));
  };

  const handleFieldToggle = (field: keyof typeof editFields) => {
    setEditFields((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    try {
      console.log(JSON.stringify(formData));
      const response = await fetch(`http://localhost:3000/invoices/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error("Failed to update invoice");
      }

      setNotify(true);
      setNotifyMessage("Invoice updated successfully!");
      setNotifyStatus("success");
    } catch (error) {
      setNotify(true);
      setNotifyMessage("Error updating invoice, PLEASE check logs!");
      setNotifyStatus("error");
      console.error("Error updating invoice:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ width: "100%", padding: 2, overflowX: "hidden" }}>
      <Typography variant="h2" gutterBottom>
        Update Invoice {id}
      </Typography>

      <form onSubmit={handleSubmit}>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={editFields.orderNumber}
                  onChange={() => handleFieldToggle("orderNumber")}
                />
              }
              label="Edit Order Number"
            />
            <TextField
              fullWidth
              label="Order Number"
              name="orderNumber"
              value={formData.orderNumber}
              onChange={handleChange}
              disabled={!editFields.orderNumber}
            />
          </Grid>

          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={editFields.invoiceForcedName}
                  onChange={() => handleFieldToggle("invoiceForcedName")}
                />
              }
              label="Edit Invoice Forced Name"
            />
            <TextField
              fullWidth
              label="Invoice Forced Name"
              name="invoiceForcedName"
              value={formData.invoiceForcedName}
              onChange={handleChange}
              disabled={!editFields.invoiceForcedName}
            />
          </Grid>

          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={editFields.invoiceDate}
                  onChange={() => handleFieldToggle("invoiceDate")}
                />
              }
              label="Edit Invoice Date"
            />
            <TextField
              fullWidth
              label="Invoice Date"
              type="date"
              name="invoiceDate"
              value={formData.invoiceDate}
              onChange={handleChange}
              disabled={!editFields.invoiceDate}
              InputLabelProps={{
                shrink: true,
              }}
            />
          </Grid>

          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={editFields.dueDate}
                  onChange={() => handleFieldToggle("dueDate")}
                />
              }
              label="Edit Due Date"
            />
            <TextField
              fullWidth
              label="Due Date"
              type="date"
              name="dueDate"
              value={formData.dueDate}
              onChange={handleChange}
              disabled={!editFields.dueDate}
              InputLabelProps={{
                shrink: true,
              }}
            />
          </Grid>

          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={editFields.customerName}
                  onChange={() => handleFieldToggle("customerName")}
                />
              }
              label="Edit Customer Name"
            />
            <TextField
              fullWidth
              label="Customer Name"
              name="customerName"
              value={formData.customerName}
              onChange={handleChange}
              disabled={!editFields.customerName}
            />
          </Grid>

          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={editFields.addressLine1}
                  onChange={() => handleFieldToggle("addressLine1")}
                />
              }
              label="Edit Address Line 1"
            />
            <TextField
              fullWidth
              label="Address Line 1"
              name="addressLine1"
              value={formData.addressLine1}
              onChange={handleChange}
              disabled={!editFields.addressLine1}
            />
          </Grid>

          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={editFields.city}
                  onChange={() => handleFieldToggle("city")}
                />
              }
              label="Edit City"
            />
            <TextField
              fullWidth
              label="City"
              name="city"
              value={formData.city}
              onChange={handleChange}
              disabled={!editFields.city}
            />
          </Grid>

          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={editFields.zip}
                  onChange={() => handleFieldToggle("zip")}
                />
              }
              label="Edit Zip Code"
            />
            <TextField
              fullWidth
              label="Zip Code"
              name="zip"
              value={formData.zip}
              onChange={handleChange}
              disabled={!editFields.zip}
            />
          </Grid>

          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={editFields.country}
                  onChange={() => handleFieldToggle("country")}
                />
              }
              label="Edit Country"
            />
            <TextField
              fullWidth
              label="Country"
              name="country"
              value={formData.country}
              onChange={handleChange}
              disabled={!editFields.country}
            />
          </Grid>

          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={editFields.totalTax}
                  onChange={() => handleFieldToggle("totalTax")}
                />
              }
              label="Edit Total Tax"
            />
            <TextField
              fullWidth
              label="Total Tax"
              type="number"
              name="totalTax"
              value={formData.totalTax}
              onChange={handleChange}
              disabled={!editFields.totalTax}
            />
          </Grid>

          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={editFields.totalDiscount}
                  onChange={() => handleFieldToggle("totalDiscount")}
                />
              }
              label="Edit Total Discount"
            />
            <TextField
              fullWidth
              label="Total Discount"
              type="number"
              name="totalDiscount"
              value={formData.totalDiscount}
              onChange={handleChange}
              disabled={!editFields.totalDiscount}
            />
          </Grid>

          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={editFields.shippingAmount}
                  onChange={() => handleFieldToggle("shippingAmount")}
                />
              }
              label="Edit Shipping Amount"
            />
            <TextField
              fullWidth
              label="Shipping Amount"
              type="number"
              name="shippingAmount"
              value={formData.shippingAmount}
              onChange={handleChange}
              disabled={!editFields.shippingAmount}
            />
          </Grid>

          {/* Items Section */}
          <Grid item xs={12}>
            <Typography variant="h6">Items</Typography>
            {formData.items?.map((item, index) => (
              <Box key={index} sx={{ border: "1px solid #ccc", padding: 2, marginBottom: 2 }}>
                <Grid container spacing={2}>
                  <Grid item xs={4}>
                    <TextField
                      fullWidth
                      label="Item Name"
                      name="name"
                      value={item.name}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleItemChange(index, e)}
                    />
                  </Grid>
                  <Grid item xs={4}>
                    <TextField
                      fullWidth
                      label="Quantity"
                      type="number"
                      name="quantity"
                      value={item.quantity}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleItemChange(index, e)}
                    />
                  </Grid>
                  <Grid item xs={4}>
                    <TextField
                      fullWidth
                      label="Price"
                      type="number"
                      name="price"
                      value={item.price}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleItemChange(index, e)}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="SKU"
                      name="sku"
                      value={item.sku}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleItemChange(index, e)}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Button variant="outlined" color="error" onClick={() => handleRemoveItem(index)}>
                      Remove Item
                    </Button>
                  </Grid>
                </Grid>
              </Box>
            ))}
            <Button variant="contained" onClick={handleAddItem}>
              Add Item
            </Button>
          </Grid>

          <Grid item xs={12}>
            <Button type="submit" variant="contained" color="primary" disabled={loading}>
              {loading ? <CircularProgress size={24} /> : "Update Invoice"}
            </Button>
          </Grid>
        </Grid>
      </form>

      {notify && (
        <Notification message={notifyMessage} type={notifyStatus} />
      )}
    </Box>
  );
};

export default UpdateInvoice;
