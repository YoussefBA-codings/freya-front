import { Button, Box, TextField, CircularProgress } from "@mui/material";
import { DataGrid, GridColDef, GridRenderCellParams } from "@mui/x-data-grid";
import { useGetInvoicesByOrderNameQuery, useGetInvoicesQuery } from "../../api/invoices/getInvoices/useGetInvoicesQuery";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useSyncsInvoicesQuery } from "../../api/invoices/syncInvoice/useSyncInvoiceQuery";
import { useGenerateRecapQuery } from "../../api/invoices/generateRecap/useGenerateRecapQuery";
import { saveAs } from "file-saver";
import Papa from "papaparse";

interface Invoice {
  id: string;
  orderNumber: string;
  orderShopifyID: string;
  isCancelled: boolean;
  isInvoiceCreated: boolean;
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
}

export const Invoices = () => {
  const navigate = useNavigate();
  const [generateRecap] = useState(false);
  const [syncInvoiceId, setSyncInvoiceId] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [isSyncLoading, setIsSyncLoading] = useState<boolean>(false);
  const [isGlobalLoading, setIsGlobalLoading] = useState<boolean>(false);

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  const handleEditClick = (invoiceId: string) => {
    navigate(`/update-invoice/${invoiceId}`);
  };

  const handleSyncClick = (invoiceId: string) => {
    setSyncInvoiceId(invoiceId);
    setIsSyncLoading(true);
    setIsGlobalLoading(true);
  };

  const handleExport = () => {
    const csvData = Papa.unparse(invoices);
    const blob = new Blob([csvData], { type: "text/csv;charset=utf-8;" });
    saveAs(blob, "invoices.csv");
  };

  const [searchParams] = useSearchParams();
  const monthNumber = searchParams.get("month") as string;
  const year = searchParams.get("year") as string;

  const { data: invoicesData, refetch: refetchInvoices } = useGetInvoicesQuery({
    monthNumber,
    year,
    page: "1",
    limit: "500",
  });

  const { data: searchData } = useGetInvoicesByOrderNameQuery({
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

  const invoices: Invoice[] =
    searchData?.data?.length > 0 ? searchData.data : invoicesData?.data || [];

  useEffect(() => {
    if (!isSyncInvoiceFetching && syncInvoiceId !== null) {
      refetchInvoices();
      setIsSyncLoading(false);
      setIsGlobalLoading(false);
    }
  }, [isSyncInvoiceFetching, syncInvoiceId, refetchInvoices]);

  const columns: GridColDef<Invoice>[] = [
    { field: "orderNumber", headerName: "Order Number", width: 150 },
    { field: "orderShopifyID", headerName: "Shopify ID", width: 150 },
    { field: "isCancelled", headerName: "Cancelled", width: 120 },
    { field: "isInvoiceCreated", headerName: "Invoice Created", width: 150 },
    { field: "invoiceNumber", headerName: "Invoice Number", width: 180 },
    { field: "invoiceDate", headerName: "Invoice Date", width: 180 },
    { field: "dueDate", headerName: "Due Date", width: 180 },
    { field: "customerName", headerName: "Customer Name", width: 150 },
    { field: "addressLine1", headerName: "Address", width: 200 },
    { field: "city", headerName: "City", width: 120 },
    { field: "zip", headerName: "ZIP", width: 100 },
    { field: "totalDiscount", headerName: "Total Discount", width: 150 },
    { field: "shippingAmount", headerName: "Shipping Amount", width: 150 },
    {
      field: "invoiceUrl",
      headerName: "Invoice URL",
      width: 150,
      renderCell: (params: GridRenderCellParams<Invoice>) => (
        <a href={params.value} target="_blank" rel="noopener noreferrer">
          View Invoice
        </a>
      ),
    },
    {
      field: "sync",
      headerName: "Action",
      width: 220,
      renderCell: (params: GridRenderCellParams<Invoice>) => (
        <Box
          display="flex"
          justifyContent="space-between"
          gap="1rem"
          width="100%"
        >
          <Button
            variant="contained"
            color="primary"
            onClick={() => handleSyncClick(params.row.id)}
            disabled={isSyncLoading}
            sx={{ flexGrow: 1 }}
          >
            Sync
          </Button>
          <Button
            variant="outlined"
            color="primary"
            onClick={() => handleEditClick(params.row.id)}
            sx={{ flexGrow: 1 }}
          >
            Edit
          </Button>
        </Box>
      ),
    },
  ];

  return (
    <Box
      padding="2rem"
      sx={{
        backgroundColor: "#f5f5f5",
        minHeight: "100vh",
        position: "relative",
      }}
    >
      {isGlobalLoading && (
        <Box
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(255, 255, 255, 0.7)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 9999,
          }}
        >
          <CircularProgress />
        </Box>
      )}
      <Button
        variant="contained"
        color="primary"
        onClick={() => navigate("/calendar")}
        sx={{ marginBottom: "1rem" }}
      >
        Back to Months
      </Button>
      <Button
        variant="contained"
        color="secondary"
        onClick={handleExport}
        sx={{ marginBottom: "1rem", marginLeft: "1rem" }}
      >
        Export Invoices
      </Button>
      <TextField
        label="Search by Order Number"
        variant="outlined"
        onChange={handleSearch}
        fullWidth
        sx={{ marginBottom: "1rem" }}
      />
      <div style={{ height: "90%", width: "100%" }}>
        <DataGrid rows={invoices} columns={columns} />
      </div>
    </Box>
  );
};
