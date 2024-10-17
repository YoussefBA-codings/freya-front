import React, { useState } from "react";
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CircularProgress,
  Button,
  IconButton,
} from "@mui/material";
import {
  AccountCircle as AccountCircleIcon,
  AttachMoney as AttachMoneyIcon,
  LocalOffer as LocalOfferIcon,
  ExpandMore as ExpandMoreIcon,
  ReceiptLong as ReceiptLongIcon, // Nouvelle icône pour Order Number
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import axios from "axios";

interface Invoice {
  id: number;
  orderNumber: string;
  invoiceNumber: string;
  invoiceDate: Date;
  customerName: string;
  totalDiscount: number | null;
  shippingAmount: number | null;
  isInvoiceCreated: boolean; // Ajout de cette propriété
  items: Array<{
    sku: string;
    name: string;
    quantity: number;
    unit_cost: number;
  }>;
}

const months = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const getMonthNumber = (monthName: string): number | null => {
  const monthIndex = months.indexOf(monthName);
  return monthIndex !== -1 ? monthIndex + 1 : null;
};

const Invoices: React.FC = () => {
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [view, setView] = useState<"months" | "invoices">("months");
  const [expandedInvoiceId, setExpandedInvoiceId] = useState<number | null>(
    null
  );
  const navigate = useNavigate();

  const fetchInvoices = async (month: string) => {
    setLoading(true);
    try {
      const currentYear = new Date().getFullYear();
      const monthNumber = getMonthNumber(month);
      if (monthNumber !== null) {
        const response = await axios.get(
          `${
            import.meta.env.VITE_API_URL
          }invoices?month=${monthNumber}&year=${currentYear}`
        );
        setInvoices(response.data);
        setView("invoices");
      }
    } catch (error) {
      console.error("Error fetching invoices:", error);
    }
    setLoading(false);
  };

  const handleMonthClick = (month: string) => {
    setSelectedMonth(month);
    fetchInvoices(month);
  };

  const handleBackClick = () => {
    setView("months");
    setInvoices([]);
  };

  const handleExpandClick = (invoiceId: number) => {
    setExpandedInvoiceId(expandedInvoiceId === invoiceId ? null : invoiceId);
  };

  const handleEditClick = (invoiceId: number) => {
    navigate(`/update-invoice/${invoiceId}`);
  };

  return (
    <Box padding="2rem" sx={{ backgroundColor: "#f5f5f5", minHeight: "100vh" }}>
      {view === "months" && (
        <>
          <Typography
            variant="h4"
            gutterBottom
            align="center"
            marginBottom="3rem"
          >
            Invoices 2024
          </Typography>
          <Grid container spacing={2} justifyContent="center">
            {months.map((month) => (
              <Grid item xs={6} sm={4} md={3} key={month}>
                <Card
                  variant="outlined"
                  sx={{
                    backgroundColor: "#1976d2",
                    color: "#fff",
                    "&:hover": { backgroundColor: "#1565c0" },
                    cursor: "pointer",
                    height: "100%",
                    borderRadius: "12px",
                    boxShadow: 2,
                  }}
                  onClick={() => handleMonthClick(month)}
                >
                  <CardContent>
                    <Typography variant="h5" align="center">
                      {month}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </>
      )}

      {view === "invoices" && (
        <>
          <Button
            variant="contained"
            color="primary"
            onClick={handleBackClick}
            sx={{ marginBottom: "1rem" }}
          >
            Back to Months
          </Button>
          {loading && (
            <Box display="flex" justifyContent="center" marginTop="2rem">
              <CircularProgress />
            </Box>
          )}

          {/* Bloc des couleurs déplacé ici */}
          {!loading && invoices.length > 0 && (
            <>
              <Box marginBottom="2rem">
                <Typography variant="h6" align="center" gutterBottom>
                  Color Codes:
                </Typography>
                <Box display="flex" justifyContent="center" gap="2rem">
                  <Box display="flex" alignItems="center">
                    <Box
                      sx={{
                        width: "20px",
                        height: "20px",
                        backgroundColor: "red",
                        marginRight: "0.5rem",
                      }}
                    />
                    <Typography>Invoice Not Created</Typography>
                  </Box>
                  <Box display="flex" alignItems="center">
                    <Box
                      sx={{
                        width: "20px",
                        height: "20px",
                        backgroundColor: "#ffffff",
                        marginRight: "0.5rem",
                      }}
                    />
                    <Typography>Invoice Created</Typography>
                  </Box>
                </Box>
              </Box>

              <Box marginTop="2rem">
                <Typography variant="h6" align="center" marginBottom="1rem">
                  Invoices for {selectedMonth}
                </Typography>
                <Grid
                  container
                  spacing={2}
                  justifyContent="center"
                  marginTop="1rem"
                >
                  {invoices.map((invoice) => (
                    <Grid item xs={12} sm={6} md={4} key={invoice.id}>
                      <Card
                        variant="outlined"
                        sx={{
                          width: "100%",
                          marginBottom: "1rem",
                          position: "relative",
                          borderRadius: "12px",
                          boxShadow: 2,
                          backgroundColor: invoice.isInvoiceCreated
                            ? "#ffffff"
                            : "red", // Couleur de fond en fonction de isInvoiceCreated
                        }}
                      >
                        <CardContent>
                          <Box
                            display="flex"
                            justifyContent="space-between"
                            alignItems="center"
                          >
                            <Button
                              variant="outlined"
                              color="primary"
                              onClick={() => handleEditClick(invoice.id)}
                              sx={{ marginBottom: "1rem", borderRadius: "8px" }}
                            >
                              Edit
                            </Button>
                            <IconButton
                              onClick={() => handleExpandClick(invoice.id)}
                              sx={{
                                color: "#1976d2",
                                "&:hover": { color: "#1565c0" },
                              }}
                            >
                              <ExpandMoreIcon />
                            </IconButton>
                          </Box>
                          <Typography variant="h6">
                            Invoice: {invoice.invoiceNumber}
                          </Typography>
                          <Typography>
                            <AccountCircleIcon
                              sx={{
                                verticalAlign: "middle",
                                marginRight: "0.5rem",
                              }}
                            />{" "}
                            Customer: {invoice.customerName}
                          </Typography>
                          <Typography>
                            <ReceiptLongIcon
                              sx={{
                                verticalAlign: "middle",
                                marginRight: "0.5rem",
                              }}
                            />{" "}
                            Order Number: {invoice.orderNumber}
                          </Typography>
                          <Typography>
                            <LocalOfferIcon
                              sx={{
                                verticalAlign: "middle",
                                marginRight: "0.5rem",
                              }}
                            />{" "}
                            Date:{" "}
                            {new Date(invoice.invoiceDate).toLocaleDateString()}
                          </Typography>
                        </CardContent>
                        {expandedInvoiceId === invoice.id && (
                          <CardContent sx={{ backgroundColor: "#e3f2fd" }}>
                            <Typography>
                              <AttachMoneyIcon
                                sx={{
                                  verticalAlign: "middle",
                                  marginRight: "0.5rem",
                                }}
                              />{" "}
                              Total Discount:{" "}
                              {invoice.totalDiscount !== undefined
                                ? invoice.totalDiscount
                                : "0.00"}{" "}
                            </Typography>
                            <Typography>
                              <AttachMoneyIcon
                                sx={{
                                  verticalAlign: "middle",
                                  marginRight: "0.5rem",
                                }}
                              />{" "}
                              Shipping Amount:{" "}
                              {invoice.shippingAmount !== undefined
                                ? invoice.shippingAmount
                                : "0.00"}{" "}
                            </Typography>
                            <Typography variant="h6" marginTop="1rem">
                              {invoice.items.length > 0 ? 'Items' : 'No items for this order'}
                            </Typography>
                            <Grid container spacing={1}>
                              {invoice.items.map((item, index) => (
                                <Grid item xs={12} sm={6} md={4} key={index}>
                                  <Card
                                    variant="outlined"
                                    sx={{
                                      marginBottom: "1.5rem",
                                      padding: "1rem",
                                      backgroundColor: "#f9f9f9",
                                      borderRadius: "12px",
                                      boxShadow:
                                        "0 4px 12px rgba(0, 0, 0, 0.1)",
                                      transition:
                                        "transform 0.3s ease-in-out, box-shadow 0.3s ease-in-out",
                                      "&:hover": {
                                        transform: "translateY(-10px)",
                                        boxShadow:
                                          "0 6px 18px rgba(0, 0, 0, 0.15)",
                                      },
                                    }}
                                  >
                                    <Typography
                                      variant="h6"
                                      sx={{
                                        fontSize: "1.1rem",
                                        fontWeight: 600,
                                        marginBottom: "0.5rem",
                                        color: "#333",
                                      }}
                                    >
                                      {item.name}
                                    </Typography>
                                    <Typography
                                      variant="body2"
                                      sx={{
                                        color: "#555",
                                        marginBottom: "0.25rem",
                                      }}
                                    >
                                      <strong>SKU:</strong> {item.sku}
                                    </Typography>
                                    <Typography
                                      variant="body2"
                                      sx={{
                                        color: "#555",
                                        marginBottom: "0.25rem",
                                      }}
                                    >
                                      <strong>Quantity:</strong> {item.quantity}
                                    </Typography>
                                    <Typography
                                      variant="body2"
                                      sx={{
                                        color: "#555",
                                      }}
                                    >
                                      <strong>Unit Cost:</strong> 
                                      {item.unit_cost} DT
                                    </Typography>
                                  </Card>
                                </Grid>
                              ))}
                            </Grid>
                          </CardContent>
                        )}
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            </>
          )}

          {!loading && invoices.length === 0 && (
            <Typography align="center" variant="h6" marginTop="2rem">
              No invoices found for {selectedMonth}
            </Typography>
          )}
        </>
      )}
    </Box>
  );
};

export default Invoices;
