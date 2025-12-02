import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  Snackbar,
  SnackbarContent,
  TextField,
  Button,
  Box,
  Typography,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  ListItemButton,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

// Type basé sur ton Prisma
interface ClientB2B {
  id: number;
  name: string;
  tax_identification_number?: string | null;
  address?: string | null;
  zip?: string | null;
  country?: string | null;
  responsable_name?: string | null;
  responsable_phone?: string | null;
  responsable_email?: string | null;
  created_at: string;
  updated_at: string;
}

const CreateCustomerB2B: React.FC = () => {
  const [customers, setCustomers] = useState<ClientB2B[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<ClientB2B[]>([]);

  const [loadingList, setLoadingList] = useState(false);
  const [loadingCreate, setLoadingCreate] = useState(false);
  const [loadingSelected, setLoadingSelected] = useState(false);

  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [notifyMessage, setNotifyMessage] = useState("");
  const [notifyStatus, setNotifyStatus] = useState<"success" | "error">("success");

  // ---- Champs pour CREATE ----
  const [name, setName] = useState("");
  const [taxNumber, setTaxNumber] = useState("");
  const [address, setAddress] = useState("");
  const [zip, setZip] = useState("");
  const [country, setCountry] = useState("Tunisia");
  const [responsableName, setResponsableName] = useState("");
  const [responsablePhone, setResponsablePhone] = useState("");
  const [responsableEmail, setResponsableEmail] = useState("");

  // ---- Champs pour EDIT (client sélectionné) ----
  const [selectedCustomer, setSelectedCustomer] = useState<ClientB2B | null>(null);
  const [editName, setEditName] = useState("");
  const [editTaxNumber, setEditTaxNumber] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editZip, setEditZip] = useState("");
  const [editCountry, setEditCountry] = useState("");
  const [editResponsableName, setEditResponsableName] = useState("");
  const [editResponsablePhone, setEditResponsablePhone] = useState("");
  const [editResponsableEmail, setEditResponsableEmail] = useState("");

  const [search, setSearch] = useState("");

  // ---- Load all customers ----
  const loadCustomers = async () => {
    try {
      setLoadingList(true);
      const res = await axios.get<ClientB2B[]>(
        `${import.meta.env.VITE_API_URL}client-b2b`
      );
      setCustomers(res.data);
      setFilteredCustomers(res.data);
    } catch (error) {
      console.error("Failed to load customers:", error);
      setNotifyMessage("Failed to load customers.");
      setNotifyStatus("error");
      setSnackbarOpen(true);
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  // ---- Filtre de recherche ----
  useEffect(() => {
    if (search.trim() === "") {
      setFilteredCustomers(customers);
    } else {
      const term = search.toLowerCase();
      setFilteredCustomers(
        customers.filter((client) =>
          client.name.toLowerCase().includes(term)
        )
      );
    }
  }, [search, customers]);

  // ---- Create customer ----
  const handleCreate = async () => {
    if (!name.trim()) {
      setNotifyMessage("Name is required.");
      setNotifyStatus("error");
      setSnackbarOpen(true);
      return;
    }

    setLoadingCreate(true);
    try {
      await axios.post(
        `${import.meta.env.VITE_API_URL}client-b2b`,
        {
          name,
          tax_identification_number: taxNumber || undefined,
          address: address || undefined,
          zip: zip || undefined,
          country,
          responsable_name: responsableName || undefined,
          responsable_phone: responsablePhone || undefined,
          responsable_email: responsableEmail || undefined,
        },
        {
          headers: { "Content-Type": "application/json" },
        }
      );

      setNotifyMessage("Customer created successfully!");
      setNotifyStatus("success");
      setSnackbarOpen(true);

      // Reset form create
      setName("");
      setTaxNumber("");
      setAddress("");
      setZip("");
      setCountry("Tunisia");
      setResponsableName("");
      setResponsablePhone("");
      setResponsableEmail("");

      await loadCustomers();
    } catch (error) {
      console.error("Failed to create customer:", error);
      setNotifyMessage("Failed to create customer.");
      setNotifyStatus("error");
      setSnackbarOpen(true);
    } finally {
      setLoadingCreate(false);
    }
  };

  // ---- Quand tu cliques sur un client dans la liste ----
  const handleSelectCustomer = (id: number) => {
    const customer = customers.find((c) => c.id === id);
    if (!customer) return;

    setSelectedCustomer(customer);

    // Pré-remplir les champs EDIT
    setEditName(customer.name);
    setEditTaxNumber(customer.tax_identification_number || "");
    setEditAddress(customer.address || "");
    setEditZip(customer.zip || "");
    setEditCountry(customer.country || "Tunisia");
    setEditResponsableName(customer.responsable_name || "");
    setEditResponsablePhone(customer.responsable_phone || "");
    setEditResponsableEmail(customer.responsable_email || "");
  };

  const handleCloseDialog = () => {
    setSelectedCustomer(null);
  };

  // ---- Save modifications du client sélectionné ----
  const handleSaveSelected = async () => {
    if (!selectedCustomer) return;

    try {
      setLoadingSelected(true);
      await axios.put(
        `${import.meta.env.VITE_API_URL}client-b2b/${selectedCustomer.id}`,
        {
          name: editName,
          tax_identification_number: editTaxNumber || undefined,
          address: editAddress || undefined,
          zip: editZip || undefined,
          country: editCountry,
          responsable_name: editResponsableName || undefined,
          responsable_phone: editResponsablePhone || undefined,
          responsable_email: editResponsableEmail || undefined,
        },
        { headers: { "Content-Type": "application/json" } }
      );

      setNotifyMessage("Customer updated successfully!");
      setNotifyStatus("success");
      setSnackbarOpen(true);

      await loadCustomers();

      // Optionnel : maj local + fermer
      setSelectedCustomer((prev) =>
        prev
          ? {
              ...prev,
              name: editName,
              tax_identification_number: editTaxNumber || null,
              address: editAddress || null,
              zip: editZip || null,
              country: editCountry || null,
              responsable_name: editResponsableName || null,
              responsable_phone: editResponsablePhone || null,
              responsable_email: editResponsableEmail || null,
            }
          : prev
      );
    } catch (error) {
      console.error("Failed to update customer:", error);
      setNotifyMessage("Failed to update customer.");
      setNotifyStatus("error");
      setSnackbarOpen(true);
    } finally {
      setLoadingSelected(false);
    }
  };

  return (
    <Box sx={{ display: "flex", gap: 4 }}>
      {/* LEFT: Liste + Search */}
      <Box
        sx={{
          flex: 1,
          padding: 3,
          borderRadius: 2,
          boxShadow: 3,
          maxHeight: "80vh",
          overflowY: "auto",
        }}
      >
        <Typography variant="h5" gutterBottom>
          B2B Customers List
        </Typography>

        <TextField
          fullWidth
          variant="outlined"
          label="Search customers"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ marginBottom: 2 }}
        />

        {loadingList ? (
          <Box sx={{ textAlign: "center", mt: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <List>
            {filteredCustomers.map((client) => (
              <React.Fragment key={client.id}>
                <ListItem disablePadding>
                  <ListItemButton
                    onClick={() => handleSelectCustomer(client.id)}
                  >
                    <ListItemText
                      primary={client.name}
                      secondary={
                        client.responsable_name
                          ? `Responsible: ${client.responsable_name}`
                          : "No responsible assigned"
                      }
                    />
                  </ListItemButton>
                </ListItem>
                <Divider />
              </React.Fragment>
            ))}
          </List>
        )}
      </Box>

      {/* RIGHT: Create form */}
      <Box
        sx={{
          flex: 1,
          padding: 3,
          borderRadius: 2,
          boxShadow: 3,
        }}
      >
        <Typography variant="h5" gutterBottom>
          Create B2B Customer
        </Typography>

        <TextField
          fullWidth
          label="Customer Name *"
          value={name}
          onChange={(e) => setName(e.target.value)}
          sx={{ mb: 2 }}
        />

        <TextField
          fullWidth
          label="Tax Identification Number"
          value={taxNumber}
          onChange={(e) => setTaxNumber(e.target.value)}
          sx={{ mb: 2 }}
        />

        <TextField
          fullWidth
          label="Address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          sx={{ mb: 2 }}
        />

        <TextField
          fullWidth
          label="ZIP"
          value={zip}
          onChange={(e) => setZip(e.target.value)}
          sx={{ mb: 2 }}
        />

        <TextField
          fullWidth
          label="Country"
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          sx={{ mb: 2 }}
        />

        <TextField
          fullWidth
          label="Responsible Name"
          value={responsableName}
          onChange={(e) => setResponsableName(e.target.value)}
          sx={{ mb: 2 }}
        />

        <TextField
          fullWidth
          label="Responsible Phone"
          value={responsablePhone}
          onChange={(e) => setResponsablePhone(e.target.value)}
          sx={{ mb: 2 }}
        />

        <TextField
          fullWidth
          label="Responsible Email"
          value={responsableEmail}
          onChange={(e) => setResponsableEmail(e.target.value)}
          sx={{ mb: 2 }}
        />

        <Button
          variant="contained"
          color="primary"
          onClick={handleCreate}
          disabled={loadingCreate}
          sx={{ mt: 1 }}
        >
          {loadingCreate ? <CircularProgress size={24} /> : "Create Customer"}
        </Button>
      </Box>

      {/* MODAL / DIALOG POUR LE CLIENT SÉLECTIONNÉ */}
      <Dialog
        open={Boolean(selectedCustomer)}
        onClose={handleCloseDialog}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle sx={{ m: 0, p: 2 }}>
          {selectedCustomer ? `Customer Details — ${selectedCustomer.name}` : "Customer Details"}
          <IconButton
            aria-label="close"
            onClick={handleCloseDialog}
            sx={{
              position: "absolute",
              right: 8,
              top: 8,
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers>
          {loadingSelected && !editName ? (
            <Box sx={{ textAlign: "center", mt: 2, mb: 2 }}>
              <CircularProgress size={24} />
            </Box>
          ) : (
            <>
              <TextField
                fullWidth
                label="Customer Name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                sx={{ mb: 2 }}
              />

              <TextField
                fullWidth
                label="Tax Number"
                value={editTaxNumber}
                onChange={(e) => setEditTaxNumber(e.target.value)}
                sx={{ mb: 2 }}
              />

              <TextField
                fullWidth
                label="Address"
                value={editAddress}
                onChange={(e) => setEditAddress(e.target.value)}
                sx={{ mb: 2 }}
              />

              <TextField
                fullWidth
                label="ZIP"
                value={editZip}
                onChange={(e) => setEditZip(e.target.value)}
                sx={{ mb: 2 }}
              />

              <TextField
                fullWidth
                label="Country"
                value={editCountry}
                onChange={(e) => setEditCountry(e.target.value)}
                sx={{ mb: 2 }}
              />

              <TextField
                fullWidth
                label="Responsible Name"
                value={editResponsableName}
                onChange={(e) => setEditResponsableName(e.target.value)}
                sx={{ mb: 2 }}
              />

              <TextField
                fullWidth
                label="Responsible Phone"
                value={editResponsablePhone}
                onChange={(e) => setEditResponsablePhone(e.target.value)}
                sx={{ mb: 2 }}
              />

              <TextField
                fullWidth
                label="Responsible Email"
                value={editResponsableEmail}
                onChange={(e) => setEditResponsableEmail(e.target.value)}
                sx={{ mb: 2 }}
              />
            </>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handleSaveSelected}
            disabled={loadingSelected}
          >
            {loadingSelected ? <CircularProgress size={20} /> : "Save changes"}
          </Button>
        </DialogActions>
      </Dialog>

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

export default CreateCustomerB2B;