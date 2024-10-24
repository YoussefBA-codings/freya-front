import {
  Button,
  Box,
  CircularProgress,
  Typography,
  TextField,
  Grid,
  Card,
  CardContent,
  IconButton,
  Snackbar,
  SnackbarContent,
} from "@mui/material";
import {
  useGetInvoicesByOrderNameQuery,
  useGetInvoicesQuery,
} from "../../api/invoices/getInvoices/useGetInvoicesQuery";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  AccountCircle,
  AttachMoney,
  ContentCopy,
  ExpandMore,
  LocalOffer,
  ReceiptLong,
} from "@mui/icons-material";
import { DateTime } from "luxon";
import { useEffect, useState } from "react";
import { GetInvoiceDB } from "../../api/invoices/getInvoices/getInvoices";
import { useSyncsInvoicesQuery } from "../../api/invoices/syncInvoice/useSyncInvoiceQuery";
import { useGenerateRecapQuery } from "../../api/invoices/generateRecap/useGenerateRecapQuery";

export const Invoices = () => {
  const navigate = useNavigate();
  const [generateRecap, setGenerateRecap] = useState(false);
  const [oponedInvoiceId, setOpenedInvoiceId] = useState<number | null>();
  const [syncInvoiceId, setSyncInvoiceId] = useState<string>("");
  const [page, setPage] = useState<number>(1);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const toggleInvoice = (id: number) => {
    setOpenedInvoiceId((value) => (value === id ? undefined : id));
  };
  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };
  const handleSyncClick = (invoiceId: string) => {
    setSyncInvoiceId(invoiceId);
  };
  const handleGenerateRecap = () => {
    setGenerateRecap(!generateRecap)
  }
  const [searchParams] = useSearchParams();
  const monthNumber = searchParams.get("month") as string;
  const year = searchParams.get("year") as string;
  const currentMonth = DateTime.fromObject({
    year: parseInt(year),
    month: parseInt(monthNumber),
    day: 1,
  });

  const { data: invoicesData, isFetching: isInvoicesFetching, refetch: refetchInvoices } =
    useGetInvoicesQuery({
      monthNumber,
      year,
      page: page.toString(),
      limit: "9",
    });

  const { data: searchData, isFetching: isSearchFetching } =
    useGetInvoicesByOrderNameQuery({
      orderNumber: searchTerm,
    });
  const { isFetching: isSyncInvoiceFetching } = useSyncsInvoicesQuery({
    invoiceId: syncInvoiceId,
  });
  useGenerateRecapQuery({
    monthNumber: monthNumber,
    currentYear: year,
    generate: generateRecap,
  });
  const invoices =
    searchData?.data?.length > 0 ? searchData.data : invoicesData?.data || [];
  const currentPage = searchTerm ? 1 : invoicesData?.currentPage;
  const totalPages = searchTerm ? 1 : invoicesData?.totalPages;

  const isLoading = isSyncInvoiceFetching
    ? isSyncInvoiceFetching
    : searchTerm
    ? isSearchFetching
    : isInvoicesFetching;

    useEffect(() => {
        if (!isSyncInvoiceFetching && syncInvoiceId !== null) {
          refetchInvoices();
        }
      }, [isSyncInvoiceFetching, syncInvoiceId, refetchInvoices]);  

  const handleCopyClick = (url: string) => {
    navigator.clipboard.writeText(url);
    setSnackbarOpen(true);
  };

  const handleEditClick = (invoiceId: number) => {
    navigate(`/update-invoice/${invoiceId}`);
  };

  return (
    <Box padding="2rem" sx={{ backgroundColor: "#f5f5f5", minHeight: "100vh" }}>
      <Button
        variant="contained"
        color="primary"
        onClick={() => navigate("/calendar")}
        sx={{ marginBottom: "1rem" }}
      >
        Back to Months
      </Button>
      {isLoading && (
        <Box display="flex" justifyContent="center" marginTop="2rem">
          <CircularProgress />
        </Box>
      )}

      {/* Bloc des couleurs déplacé ici */}
      {!isLoading && invoices?.length > 0 && (
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

          <Box
            display="flex"
            alignItems="center"
            justifyContent="space-between"
            sx={{
              mb: 2,
              p: 2,
              borderRadius: "8px",
              boxShadow: "0 4px 16px rgba(0, 0, 0, 0.1)",
              backgroundColor: "#f9f9f9",
            }}
          >
            {/* Champ de recherche à gauche */}
            <TextField
              label="Search by Order Number"
              variant="outlined"
              value={searchTerm}
              onChange={handleSearch}
              sx={{
                flex: 1,
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

            {/* Filtres et bouton collés à droite */}
            <Box display="flex" alignItems="center" ml="auto">
              <Box ml={2}>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleGenerateRecap}
                  disabled={isLoading}
                  sx={{
                    borderRadius: "50px",
                    padding: "10px 20px",
                    backgroundColor: "#1976d2",
                    boxShadow: "0 4px 16px rgba(0, 0, 0, 0.3)",
                    "&:hover": {
                      backgroundColor: "#1565c0",
                    },
                  }}
                >
                  {isLoading ? "Generating..." : "Generate Recap"}
                </Button>
              </Box>
            </Box>
          </Box>

          <Box marginTop="2rem">
            <Typography variant="h6" align="center" marginBottom="1rem">
              Invoices for {currentMonth.toFormat("LLLL")}
            </Typography>
            <Grid
              container
              spacing={2}
              justifyContent="center"
              marginTop="1rem"
            >
              {invoices.map((invoice: GetInvoiceDB) => (
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
                          onClick={() => toggleInvoice(invoice.id)}
                          sx={{
                            color: "#1976d2",
                            "&:hover": { color: "#1565c0" },
                          }}
                        >
                          <ExpandMore />
                        </IconButton>
                      </Box>
                      <Typography variant="h6">
                        Invoice: {invoice.invoiceNumber}
                      </Typography>
                      <Typography>
                        <AccountCircle
                          sx={{
                            verticalAlign: "middle",
                            marginRight: "0.5rem",
                          }}
                        />{" "}
                        Customer: {invoice.customerName}
                      </Typography>
                      <Typography>
                        <ReceiptLong
                          sx={{
                            verticalAlign: "middle",
                            marginRight: "0.5rem",
                          }}
                        />{" "}
                        Order Number: {invoice.orderNumber}
                      </Typography>
                      <Typography>
                        <LocalOffer
                          sx={{
                            verticalAlign: "middle",
                            marginRight: "0.5rem",
                          }}
                        />{" "}
                        Date:{" "}
                        {new Date(invoice.invoiceDate).toLocaleDateString()}
                      </Typography>
                      <Box display="flex" alignItems="center" marginTop="1rem">
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
                              <ContentCopy />
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
                        onClick={() => handleSyncClick(invoice.id.toString())}
                        sx={{ marginTop: "1rem", borderRadius: "8px" }}
                      >
                        Sync Invoice
                      </Button>
                    </CardContent>
                    {oponedInvoiceId === invoice.id && (
                      <CardContent sx={{ backgroundColor: "#e3f2fd" }}>
                        <Typography>
                          <AttachMoney
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
                          <AttachMoney
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
                                  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
                                  transition:
                                    "transform 0.3s ease-in-out, box-shadow 0.3s ease-in-out",
                                  "&:hover": {
                                    transform: "translateY(-10px)",
                                    boxShadow: "0 6px 18px rgba(0, 0, 0, 0.15)",
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
                                  <strong>Unit Cost:</strong> {item.unit_cost}{" "}
                                  DT
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
      {!isLoading && invoices.length > 0 && (
        <Box display="flex" justifyContent="center" marginTop="2rem">
          <Button
            variant="outlined"
            onClick={() => setPage(page - 1)}
            disabled={page === 1}
            sx={{ marginRight: "1rem" }}
          >
            Previous
          </Button>
          <Typography variant="body1" sx={{ margin: "0 1rem" }}>
            Page {currentPage} of {totalPages}
          </Typography>
          <Button
            variant="outlined"
            onClick={() => setPage(page + 1)}
            disabled={page === totalPages}
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

      {!isLoading && invoices?.length === 0 && (
        <Typography align="center" variant="h6" marginTop="2rem">
          No invoices found for {monthNumber}
        </Typography>
      )}
    </Box>
  );
};
