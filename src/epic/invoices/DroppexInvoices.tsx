import {
    Box,
    Button,
    TextField,
    CircularProgress,
    Typography,
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
    invoiceUrl: string;
    creditUrl: string;
  }
  
  export const DroppexInvoices = () => {
    const [refs, setRefs] = useState<string>("");
    const [loading, setLoading] = useState<boolean>(false);
    const [data, setData] = useState<DroppexInvoice[]>([]);
  
    const handleFetch = async () => {
      setLoading(true);
      try {
        const cleanedRefs = refs
          .split(",")
          .map((r) => r.trim())
          .filter((r) => r !== "");
  
        const url = `/invoices/by-droppex-refs?refs=[${cleanedRefs.join(",")}]`;
        const response = await AxiosInstance.get(url);
        setData(response.data || []);
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
  
    const columns: GridColDef<DroppexInvoice>[] = [
      { field: "orderNumber", headerName: "Order Number", flex: 1 },
      { field: "orderShopifyID", headerName: "Shopify ID", flex: 1 },
      { field: "gbDroppexRef", headerName: "GB Ref", flex: 1 },
      { field: "blkDroppexRef", headerName: "BLK Ref", flex: 1 },
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
        </Box>
  
        <DataGrid
          rows={data.map((row, i) => ({ ...row, id: i }))}
          columns={columns}
          autoHeight
          rowHeight={30}
          disableRowSelectionOnClick
        />
      </Box>
    );
  };
  