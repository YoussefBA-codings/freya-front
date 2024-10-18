import React, { useState } from "react";
import {
  TextField,
  Snackbar,
  SnackbarContent,
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
  ContentCopy as ContentCopyIcon,
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
  invoiceUrl: string;
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
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [invoicesPerPage] = useState<number>(9);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [view, setView] = useState<"months" | "invoices">("months");
  const [expandedInvoiceId, setExpandedInvoiceId] = useState<number | null>(
    null
  );
  const [searchTerm, setSearchTerm] = useState<string>(""); // State for search term
  const navigate = useNavigate();

  const indexOfLastInvoice = currentPage * invoicesPerPage;
  const indexOfFirstInvoice = indexOfLastInvoice - invoicesPerPage;
  const currentInvoices = invoices.slice(
    indexOfFirstInvoice,
    indexOfLastInvoice
  );
  const totalPages = Math.ceil(invoices.length / invoicesPerPage);

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

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

  const handleSyncClick = async (invoiceId: number) => {
    setLoading(true);
    try {
      await axios.get(
        `${import.meta.env.VITE_API_URL}invoices/sync/${invoiceId}`
      );
      if (selectedMonth) {
        fetchInvoices(selectedMonth);
      }
    } catch (error) {
      console.error("Error syncing invoice:", error);
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

  const handleCopyClick = (url: string) => {
    navigator.clipboard.writeText(url);
    setSnackbarOpen(true);
  };

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  const filteredInvoices = currentInvoices.filter((invoice) =>
    invoice.orderNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
                        backgroundColor: "grey",
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

              <div className="search-bar-container">
                <TextField
                  label="Search by Order Number"
                  variant="outlined"
                  fullWidth
                  value={searchTerm}
                  onChange={handleSearch}
                  sx={{
                    maxWidth: 400,
                    borderRadius: "50px",
                    boxShadow: "0 4px 16px rgba(0, 0, 0, 0.3)",
                    "& .MuiOutlinedInput-root": {
                      borderRadius: "50px",
                      "&:hover .MuiOutlinedInput-notchedOutline": {
                        borderColor: "#1565c0",
                      },
                      "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                        borderColor: "#1976d2",
                      },
                    },
                    "& .MuiInputLabel-root": {
                      color: "#1976d2",
                    },
                    "& .MuiOutlinedInput-notchedOutline": {
                      borderColor: "#1976d2",
                    },
                  }}
                />
              </div>

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
                  {filteredInvoices.map((invoice) => (
                    <Grid item xs={12} sm={6} md={4} key={invoice.id}>
                      <Card
                        variant="outlined"
                        sx={{
                          minHeight: "320px",
                          width: "100%",
                          marginBottom: "1rem",
                          position: "relative",
                          borderRadius: "12px",
                          boxShadow: 2,
                          backgroundColor: invoice.isInvoiceCreated
                            ? "#ffffff"
                            : "grey",
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
                          <Box
                            display="flex"
                            alignItems="center"
                            marginTop="1rem"
                          >
                            {invoice.invoiceUrl ? (
                              <>
                                <Typography variant="body2">
                                  Invoice URL:
                                  <a
                                    href={invoice.invoiceUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{
                                      marginLeft: "0.5rem",
                                      color: "#1976d2",
                                      textDecoration: "underline",
                                    }}
                                  >
                                    {invoice.invoiceUrl.length > 40
                                      ? `${invoice.invoiceUrl.slice(0, 40)}...`
                                      : invoice.invoiceUrl}
                                  </a>
                                </Typography>
                                <IconButton
                                onClick={() =>
                                  handleCopyClick(invoice.invoiceUrl)
                                }
                                sx={{ marginLeft: "0.5rem" }}
                              >
                                <ContentCopyIcon />
                              </IconButton>
                              </>
                            ) : (
                              <Typography
                              variant="h6"
                              align="center"
                              style={{
                                fontWeight: "bold",
                              }}
                            >
                              No invoice associated with this order.
                            </Typography>
                            )}
                          </Box>
                          <Button
                            variant="contained"
                            color="secondary"
                            onClick={() => handleSyncClick(invoice.id)}
                            sx={{ marginTop: "1rem", borderRadius: "8px" }}
                          >
                            Sync Invoice
                          </Button>
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
                            {invoice.items.length > 0 ? (
                              <Typography variant="h6" marginTop="1rem">
                                Products
                              </Typography>
                            ) : (
                              <Typography
                                variant="h6"
                                sx={{ marginTop: "10px", color: "#333" }}
                              >
                                No Products for this order
                              </Typography>
                            )}
                            <Grid container spacing={1}>
                              {invoice.items.map((item, index) => (
                                <Grid item xs={12} sm={6} md={4} key={index}>
                                  <Card
                                    variant="outlined"
                                    sx={{
                                      marginBottom: "1.5rem",
                                      padding: "1rem",
                                      backgroundColor:
                                        !item.sku || item.sku.startsWith("B_")
                                          ? "#cecece"
                                          : "#f9f9f9", // Change background color based on SKU
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
                                      <strong>Unit Cost:</strong>{" "}
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
      {!loading && invoices.length > 0 && (
        <Box display="flex" justifyContent="center" marginTop="2rem">
          <Button
            variant="outlined"
            onClick={handlePreviousPage}
            disabled={currentPage === 1}
            sx={{ marginRight: "1rem" }}
          >
            Previous
          </Button>
          <Typography variant="body1" sx={{ margin: "0 1rem" }}>
            Page {currentPage} of {totalPages}
          </Typography>
          <Button
            variant="outlined"
            onClick={handleNextPage}
            disabled={currentPage === totalPages}
          >
            Next
          </Button>
        </Box>
      )}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={() => setSnackbarOpen(false)}
      >
        <SnackbarContent
          message="Invoice URL copied to clipboard!"
          sx={{ backgroundColor: "green" }}
        />
      </Snackbar>
    </Box>
  );
};

export default Invoices;
