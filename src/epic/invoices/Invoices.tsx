import {
  Button,
  Box,
  TextField,
  CircularProgress,
  Select,
  MenuItem
} from "@mui/material";
import { DataGrid, GridColDef, GridRenderCellParams } from "@mui/x-data-grid";
import {
  useGetInvoicesByOrderNameQuery,
  useGetInvoicesQuery
} from "../../api/invoices/getInvoices/useGetInvoicesQuery";
import { useNavigate } from "react-router-dom";
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
  creditUrl: string;
}

export const Invoices = () => {
  const navigate = useNavigate();
  const [syncInvoiceId, setSyncInvoiceId] = useState<string | null>(null);
  const [editInvoiceId, setEditInvoiceId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [isSyncLoading, setIsSyncLoading] = useState<boolean>(false);
  const [launchSync, setLaunchSync] = useState<boolean>(false);
  const [, setIsGlobalLoading] = useState<boolean>(false);
  const [monthNumber, setMonth] = useState<number>(new Date().getMonth() + 1);
  const [year, setYear] = useState<number>(new Date().getFullYear());

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  const handleEditClick = () => {
    if (editInvoiceId) navigate(`/update-invoice/${editInvoiceId}`);
  };

  const handleSyncClick = () => {
    if (syncInvoiceId) {
      setLaunchSync(true);
      setIsSyncLoading(true);
      setIsGlobalLoading(true);
    }
  };

  const handleExport = () => {
    const csvData = Papa.unparse(invoices);
    const blob = new Blob([csvData], { type: "text/csv;charset=utf-8;" });
    saveAs(blob, "invoices.csv");
  };

  const handleFilterChange = () => {
    navigate(`/all-invoices?month=${monthNumber}&year=${year}`);
  };

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
    invoiceId: syncInvoiceId || "",
    launchSync
  });

  useGenerateRecapQuery({
    monthNumber: monthNumber,
    currentYear: year,
    generate: false,
  });

  const invoices: Invoice[] =
    searchData?.data?.length > 0 ? searchData.data : invoicesData?.data || [];

  useEffect(() => {
    if (!isSyncInvoiceFetching && syncInvoiceId) {
      refetchInvoices();
      setIsSyncLoading(false);
      setIsGlobalLoading(false);
      setLaunchSync(false);
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
        params.value ? (
          <a href={params.value} target="_blank" rel="noopener noreferrer">
            View Invoice
          </a>
        ) : null
      ),
    },
    {
      field: "creditUrl",
      headerName: "Credit URL",
      width: 150,
      renderCell: (params: GridRenderCellParams<Invoice>) => (
        params.value ? (
          <a href={params.value} target="_blank" rel="noopener noreferrer">
            View Credit
          </a>
        ) : null
      ),
    },
  ];

  return (
    <Box
      padding="2rem"
      sx={{
        backgroundColor: "#f5f5f5",
        minHeight: "100vh",
      }}
    >
      <Box display="flex" gap={2} marginBottom={2} alignItems="center">
        <Select
          value={monthNumber}
          onChange={(e) => setMonth(e.target.value as number)}
          displayEmpty
          sx={{ width: "100px" }}
        >
          {[...Array(12)].map((_, i) => (
            <MenuItem key={i + 1} value={i + 1}>
              {i + 1}
            </MenuItem>
          ))}
        </Select>
        <Select
          value={year}
          onChange={(e) => setYear(e.target.value as number)}
          displayEmpty
          sx={{ width: "120px" }}
        >
          {[2022, 2023, 2024, 2025].map((yearOption) => (
            <MenuItem key={yearOption} value={yearOption}>
              {yearOption}
            </MenuItem>
          ))}
        </Select>
        <Button
          variant="contained"
          color="primary"
          onClick={handleFilterChange}
          sx={{ minWidth: "100px" }}
        >
          Filter
        </Button>
      </Box>

      <TextField
        label="Search by Order Number"
        variant="outlined"
        value={searchTerm}
        onChange={handleSearch}
        fullWidth
        margin="normal"
      />

      <Box display="flex" gap={2} marginY={2} justifyContent="center">
        <Button
          variant="contained"
          onClick={handleSyncClick}
          disabled={!syncInvoiceId || isSyncLoading}
          sx={{ flex: "1", minWidth: "120px" }}
        >
          {isSyncLoading ? <CircularProgress size={24} /> : "Sync"}
        </Button>
        <Button
          variant="contained"
          onClick={handleEditClick}
          disabled={!editInvoiceId}
          sx={{ flex: "1", minWidth: "120px" }}
        >
          Edit
        </Button>
        <Button
          variant="contained"
          onClick={handleExport}
          sx={{ flex: "1", minWidth: "120px" }}
        >
          Export
        </Button>
      </Box>

      <DataGrid
        rows={invoices}
        columns={columns}
        onRowSelectionModelChange={(newSelection) => {
          if (newSelection.length === 1) {
            setSyncInvoiceId(String(newSelection[0]));
            setEditInvoiceId(String(newSelection[0]));
          } else {
            setSyncInvoiceId(null);
            setEditInvoiceId(null);
          }
        }}
        checkboxSelection
      />
    </Box>
  );
};
