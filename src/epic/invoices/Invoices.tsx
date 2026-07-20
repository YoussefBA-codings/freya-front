import {
  Button,
  Box,
  TextField,
  CircularProgress,
  Select,
  MenuItem,
} from "@mui/material";
import { DataGrid, GridColDef, GridRenderCellParams } from "@mui/x-data-grid";
import {
  useGetInvoicesByOrderNameQuery,
  useGetInvoicesQuery,
} from "../../api/invoices/getInvoices/useGetInvoicesQuery";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useSyncsInvoicesQuery } from "../../api/invoices/syncInvoice/useSyncInvoiceQuery";
import { useGenerateRecapQuery } from "../../api/invoices/generateRecap/useGenerateRecapQuery";
import { saveAs } from "file-saver";
import Papa from "papaparse";
import { format } from "date-fns";
import InvoiceDetailsDrawer from "./InvoiceDetailsDrawer";

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
  creditNumber?: string;
  items: Array<{
    sku: string;
    name: string;
    quantity: number;
    unit_cost: number;
  }>;
  countedProducts: Array<{
    sku?: string;
    name?: string;
    quantity?: number;
    unit_cost?: number;
  }>;
  ignoredProducts: Array<{
    sku?: string;
    name?: string;
    quantity?: number;
    unit_cost?: number;
  }>
  totalAmountExcludingTax: string,
  totalAmountIncludingTax: string,
  TVA: string,
  fiscalStamp: string,
  gbDroppexRef: string;
  blkDroppexRef: string;

}

export const Invoices = () => {
  const navigate = useNavigate();
  const [syncInvoiceId, setSyncInvoiceId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [isSyncLoading, setIsSyncLoading] = useState<boolean>(false);
  const [launchSync, setLaunchSync] = useState<boolean>(false);
  const [, setIsGlobalLoading] = useState<boolean>(false);
  const [monthNumber, setMonth] = useState<number>(new Date().getMonth() + 1);
  const [year, setYear] = useState<number>(new Date().getFullYear());

  const [isDrawerOpen, setDrawerOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  const handleRowClick = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setDrawerOpen(true);
  };

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  const handleSyncClick = () => {
    if (syncInvoiceId) {
      setLaunchSync(true);
      setIsSyncLoading(true);
      setIsGlobalLoading(true);
    }
  };

  const handleExport = () => {
    const formatDate = (dateStr?: string) =>
      dateStr ? new Date(dateStr).toISOString().split("T")[0] : "";

    const cleanDroppexRef = (ref?: string) =>
      ref?.startsWith("default") ? "" : ref;

    // Les avoirs créditent toujours 100% de la facture d'origine (createCredit
    // ne gère pas le crédit partiel) - négativer les montants stockés sur la
    // facture donne donc exactement le montant de l'avoir, sans avoir besoin
    // de le recalculer ni de le stocker séparément.
    const negateAmount = (value?: string) => {
      if (!value) return value ?? "";
      const num = Number(value);
      return Number.isNaN(num) ? value : String(-num);
    };

    // TOTAL = Montant HT + TVA + Timbre (le vrai montant dû, timbre fiscal
    // inclus - différent de l'ancien totalAmountIncludingTax qui n'incluait
    // que HT+TVA).
    const sumAmounts = (...values: Array<string | undefined>) =>
      values.reduce((sum, v) => sum + (Number(v) || 0), 0).toFixed(2);

    const rows: Record<string, unknown>[] = [];

    invoices
      .filter((invoice) => invoice.isInvoiceCreated)
      .forEach((invoice) => {
        rows.push({
          type: "invoice",
          orderNumber: invoice.orderNumber,
          invoiceNumber: invoice.invoiceNumber,
          invoiceDate: formatDate(invoice.invoiceDate),
          customerName: invoice.customerName,
          addressLine1: invoice.addressLine1,
          invoiceUrl: invoice.invoiceUrl,
          creditUrl: invoice.creditUrl,
          "Montant HT": invoice.totalAmountExcludingTax,
          TVA: invoice.TVA,
          Timbre: invoice.fiscalStamp,
          TOTAL: sumAmounts(
            invoice.totalAmountExcludingTax,
            invoice.TVA,
            invoice.fiscalStamp
          ),
          gbDroppexRef: cleanDroppexRef(invoice.gbDroppexRef),
          blkDroppexRef: cleanDroppexRef(invoice.blkDroppexRef),
        });

        const hasCreditNote = invoice.isCancelled && !!invoice.creditUrl;
        if (hasCreditNote) {
          const creditHT = negateAmount(invoice.totalAmountExcludingTax);
          const creditTVA = negateAmount(invoice.TVA);
          rows.push({
            type: "credit_note",
            orderNumber: invoice.orderNumber,
            invoiceNumber: invoice.creditNumber || invoice.invoiceNumber,
            invoiceDate: formatDate(invoice.invoiceDate),
            customerName: invoice.customerName,
            addressLine1: invoice.addressLine1,
            invoiceUrl: invoice.creditUrl,
            creditUrl: "",
            "Montant HT": creditHT,
            TVA: creditTVA,
            Timbre: "0",
            TOTAL: sumAmounts(creditHT, creditTVA, "0"),
            gbDroppexRef: "",
            blkDroppexRef: "",
          });
        }
      });

    const csvData = Papa.unparse(rows);
    const blob = new Blob([csvData], { type: "text/csv;charset=utf-8;" });
    saveAs(blob, "accounting_export.csv");
  };
  

  const handleFilterChange = () => {
    navigate(`/all-invoices?month=${monthNumber}&year=${year}`);
  };
  const handleCreateInvoice = () => {
    navigate(`/create-invoice`);
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
    launchSync,
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
    { field: "orderNumber", headerName: "Numéro de commande", flex: 1 },
    { field: "invoiceNumber", headerName: "Numéro de facture", flex: 1 },
    {
      field: "isCancelled",
      headerName: "Annulée",
      flex: 1,
      renderCell: (params: GridRenderCellParams<Invoice>) =>
        params.value ? "Oui" : "Non",
    },
    {
      field: "invoiceDate",
      headerName: "Date de facture",
      flex: 1,
      renderCell: (params: GridRenderCellParams<Invoice>) => {
        const date = new Date(params.value);
        return !isNaN(date.getTime()) ? format(date, "dd-MM-yyyy") : "";
      },
    },
    { field: "customerName", headerName: "Nom du client", flex: 1 },
    {
      field: "isInvoiceCreated",
      headerName: "Facture créée",
      flex: 1,
      renderCell: (params: GridRenderCellParams<Invoice>) =>
        params.value ? "Oui" : "Non",
    },
    {
      field: "invoiceUrl",
      headerName: "URL de la facture",
      flex: 1,
      renderCell: (params: GridRenderCellParams<Invoice>) =>
        params.value ? (
          <a href={params.value} target="_blank" rel="noopener noreferrer">
            Voir la facture
          </a>
        ) : null,
    },
    {
      field: "creditUrl",
      headerName: "URL de l'avoir",
      flex: 1,
      renderCell: (params: GridRenderCellParams<Invoice>) =>
        params.value ? (
          <a href={params.value} target="_blank" rel="noopener noreferrer">
            Voir l'avoir
          </a>
        ) : null,
    },
  ];

  return (
    <Box
      padding="2rem"
      sx={{
        backgroundColor: "background.default",
        minHeight: "100vh",
      }}
    >
      <Box
        display="flex"
        flexDirection={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "stretch", sm: "center" }}
        gap={{ xs: 1, sm: 2 }} 
      >
        <Box
          display="flex"
          gap={2}
          marginBottom={{ xs: 1, sm: 2 }}
          alignItems="center"
          flexWrap="wrap"
        >
          <Select
            value={monthNumber}
            onChange={(e) => setMonth(e.target.value as number)}
            displayEmpty
            sx={{ width: { xs: "100%", sm: "100px" } }}
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
            sx={{ width: { xs: "100%", sm: "120px" } }}
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
            sx={{ minWidth: "100px", width: { xs: "100%", sm: "auto" } }}
          >
            Filtrer
          </Button>
        </Box>
        <Button
          variant="contained"
          color="primary"
          onClick={handleCreateInvoice}
          sx={{
            minWidth: "100px",
            width: { xs: "100%", sm: "auto" },
            height: { xs: "auto", sm: "100%" },
          }}
        >
          CRÉER UNE FACTURE
        </Button>
      </Box>

      <TextField
        label="Rechercher par numéro de commande"
        variant="outlined"
        value={searchTerm}
        onChange={handleSearch}
        fullWidth
        margin="normal"
      />

      <Box display="flex" gap={2} marginY={2} justifyContent="left">
        <Button
          variant="contained"
          onClick={handleSyncClick}
          disabled={!syncInvoiceId || isSyncLoading}
          sx={{ maxWidth: "120px" }}
        >
          {isSyncLoading ? <CircularProgress size={24} /> : "Synchroniser"}
        </Button>
        <Button
          variant="contained"
          onClick={handleExport}
          sx={{ maxWidth: "120px" }}
        >
          Exporter
        </Button>
      </Box>

      <DataGrid
        rowHeight={30}
        rows={invoices}
        columns={columns}
        initialState={{
          sorting: {
            sortModel: [{ field: "invoiceDate", sort: "desc" }],
          },
        }}
        onRowClick={(params) => handleRowClick(params.row as Invoice)}
        onRowSelectionModelChange={(newSelection) => {
          if (newSelection.length === 1) {
            setSyncInvoiceId(String(newSelection[0]));
          } else {
            setSyncInvoiceId(null);
          }
        }}
        checkboxSelection
      />
      <InvoiceDetailsDrawer
        open={isDrawerOpen}
        onClose={() => setDrawerOpen(false)}
        invoice={selectedInvoice}
      />
    </Box>
  );
};
