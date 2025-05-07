import {
  Box,
  Button,
  TextField,
  CircularProgress,
  Typography,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormHelperText,
} from "@mui/material";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import { useState } from "react";
import Papa from "papaparse";
import { saveAs } from "file-saver";
import { AxiosInstance } from "../../api/axios/axiosInstance";

interface DroppexInvoice {
  orderNumber: string;
  orderShopifyID: string;
  gbDroppexRef: string;
  blkDroppexRef: string;
  invoiceNumber: string;
  invoiceDate: string;
  customerName: string;
  totalAmountExcludingTax: string;
  TVA: string;
  fiscalStamp: string;
  totalAmountIncludingTax: string;
  invoiceUrl: string;
  creditUrl: string;
  inputRef?: string; // reference entered by the user
}

export const DroppexInvoices = () => {
  const [refs, setRefs] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [data, setData] = useState<DroppexInvoice[]>([]);
  const [selection, setSelection] = useState<number[]>([]); // To store selected rows
  const [openDialog, setOpenDialog] = useState<boolean>(false); // To open the dialog
  const [paymentReference, setPaymentReference] = useState<string>(""); // Payment reference state
  const [paymentReferenceError, setPaymentReferenceError] = useState<boolean>(false); // For input validation

  const handleFetch = async () => {
    setLoading(true);
    try {
      const cleanedRefs = refs
        .split(",")
        .map((r) => r.trim())
        .filter((r) => r !== "");

      const url = `/invoices/by-droppex-refs?refs=[${cleanedRefs.join(",")}]`;
      const response = await AxiosInstance.get<DroppexInvoice[]>(url);
      const fetchedData = response.data || [];

      // Map by reference found
      const byRef = new Map<string, DroppexInvoice>();
      fetchedData.forEach((inv) => {
        if (inv.gbDroppexRef) {
          byRef.set(inv.gbDroppexRef, inv);
        }
        if (inv.blkDroppexRef) {
          byRef.set(inv.blkDroppexRef, inv);
        }
      });

      // Merge: found refs + not found
      const mergedData: DroppexInvoice[] = cleanedRefs.map((ref) => {
        if (byRef.has(ref)) {
          return { ...byRef.get(ref)!, inputRef: ref };
        }
        return {
          inputRef: ref,
          orderNumber: "_",
          orderShopifyID: "_",
          gbDroppexRef: ref,
          blkDroppexRef: "_",
          invoiceNumber: "_",
          invoiceDate: "_",
          customerName: "_",
          totalAmountExcludingTax: "_",
          TVA: "_",
          fiscalStamp: "_",
          totalAmountIncludingTax: "_",
          invoiceUrl: "",
          creditUrl: "",
        };
      });

      setData(mergedData);
    } catch (error) {
      console.error("API Error:", error);
    }
    setLoading(false);
  };

  const handleExportCSV = () => {
    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    saveAs(blob, "droppex-invoices.csv");
  };

  const handleOpenDialog = () => {
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  const handleMarkAsPaid = async () => {
    if (!paymentReference.trim()) {
      setPaymentReferenceError(true);
      return;
    }
  
    try {
      const orderIds = selection.map((rowId) => data[rowId].orderShopifyID);
        await AxiosInstance.post(`/invoices/orders/mark-as-cashed`, {
        orderIds,
        refEncaissement: paymentReference,
      });
  
      handleCloseDialog();
      setPaymentReference("");
      setSelection([]);
    } catch (error) {
      console.error("Error marking orders as paid", error);
    }
  };
  

  const columns: GridColDef<DroppexInvoice>[] = [
    { field: "inputRef", headerName: "Searched Ref", flex: 1 },
    { field: "orderNumber", headerName: "Order Number", flex: 1 },
    { field: "orderShopifyID", headerName: "Shopify ID", flex: 1 },
    {
      field: "gbDroppexRef",
      headerName: "GB Ref",
      flex: 1,
      renderCell: (params) =>
        params.value?.startsWith("default") ? "" : params.value,
    },
    {
      field: "blkDroppexRef",
      headerName: "BLK Ref",
      flex: 1,
      renderCell: (params) =>
        params.value?.startsWith("default") ? "" : params.value,
    },
    { field: "invoiceNumber", headerName: "Invoice No", flex: 1 },
    {
      field: "invoiceDate",
      headerName: "Invoice Date",
      flex: 1,
      renderCell: (params) => {
        const date = new Date(params.value);
        if (isNaN(date.getTime())) return "-";
        return `${date.getDate().toString().padStart(2, "0")}-${(date.getMonth() + 1)
          .toString()
          .padStart(2, "0")}-${date.getFullYear()}`;
      },
    },
    { field: "customerName", headerName: "Customer", flex: 1 },
    { field: "totalAmountExcludingTax", headerName: "HT", flex: 1 },
    { field: "TVA", headerName: "TVA", flex: 1 },
    { field: "fiscalStamp", headerName: "Fiscal Stamp", flex: 1 },
    { field: "totalAmountIncludingTax", headerName: "TTC", flex: 1 },
    {
      field: "invoiceUrl",
      headerName: "Invoice",
      flex: 1,
      renderCell: (params) =>
        params.value ? (
          <a href={params.value} target="_blank" rel="noopener noreferrer">
            View
          </a>
        ) : (
          "-"
        ),
    },
    {
      field: "creditUrl",
      headerName: "Credit",
      flex: 1,
      renderCell: (params) =>
        params.value ? (
          <a href={params.value} target="_blank" rel="noopener noreferrer">
            View
          </a>
        ) : (
          "-"
        ),
    },
  ];
  return (
    <Box padding="2rem" sx={{ backgroundColor: "#f5f5f5", minHeight: "100vh" }}>
      <Typography variant="h5" mb={2}>
        Droppex Invoices
      </Typography>

      <TextField
        label="Droppex References (comma-separated)"
        variant="outlined"
        value={refs}
        onChange={(e) => setRefs(e.target.value)}
        fullWidth
        margin="normal"
      />

      <Box display="flex" gap={2} marginY={2}>
        <Button
          variant="contained"
          color="primary"
          onClick={handleFetch}
          disabled={loading || !refs.trim()}
        >
          {loading ? <CircularProgress size={24} /> : "Search"}
        </Button>
        <Button
          variant="contained"
          color="secondary"
          onClick={handleExportCSV}
          disabled={data.length === 0}
        >
          Export CSV
        </Button>
        {selection.length > 0 && (
          <Button
            variant="contained"
            color="success"
            onClick={handleOpenDialog}
          >
            Mark as Paid
          </Button>
        )}
      </Box>

      <DataGrid
        rows={data.map((row, i) => ({ ...row, id: i }))}
        columns={columns}
        checkboxSelection
        autoHeight
        rowHeight={30}
        disableRowSelectionOnClick
        rowSelectionModel={selection}
        onRowSelectionModelChange={(newSelection) => {
          setSelection(newSelection as number[]);
        }}
      />

      {/* Dialog to enter Payment Reference */}
      <Dialog open={openDialog} onClose={handleCloseDialog}>
        <DialogTitle>Mark Orders as Paid</DialogTitle>
        <DialogContent>
          <FormControl fullWidth error={paymentReferenceError}>
            <TextField
              label="Payment Reference"
              variant="outlined"
              value={paymentReference}
              onChange={(e) => {
                setPaymentReference(e.target.value);
                setPaymentReferenceError(false);
              }}
              fullWidth
            />
            {paymentReferenceError && (
              <FormHelperText>This field is required</FormHelperText>
            )}
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} color="primary">
            Cancel
          </Button>
          <Button onClick={handleMarkAsPaid} color="primary">
            Submit
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
