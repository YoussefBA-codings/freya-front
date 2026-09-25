import React from "react";
import { pdfjs } from "react-pdf";
import ReactDOM from "react-dom/client";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import Login from "./pages/Login";
import "./index.css";
import PrivateRoute from "./elements/PrivateRoute";
import NotFound from "./pages/NotFound";
import Navbar from "./elements/Nav";
import CreateInvoice from "./pages/CreateInvoice";
import { Invoices as NewInvoices } from "./epic/invoices/Invoices";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DroppexInvoices } from "./epic/invoices/DroppexInvoices";
import { B2BInvoiceDeposit } from "./epic/invoices/B2BInvoiceUploader";
import CreateCustomerB2B from "./pages/CreateCustomerB2B";
import ProductB2B from "./pages/ProductB2B";
import PriceListsPage from "./pages/PriceListsPage";
import CreateOrderB2B from "./pages/CreateOrderB2B";
import ClientOrderHistory from "./pages/ClientOrderHistory";
import B2BOrderHistorySelectClient from "./pages/B2BOrderHistorySelectClient";
import DeclarePaymentInstrument from "./pages/DeclarePaymentInstrument";
import PaymentInstrumentsList from "./pages/PaymentInstrumentsList";
import ClientB2BSelect from "./pages/ClientB2BSelect";
import ClientB2BDetail from "./pages/ClientB2BDetail";
import AnimationsList from "./pages/AnimationsList";
import AnimationDashboard from "./pages/AnimationDashboard";
import AnimationCreditsDashboard from "./pages/AnimationCreditsDashboard";
import AnimatricesList from "./pages/AnimatricesList";

// 👉 IMPORT MUI X Date Pickers (OBLIGATOIRE)
import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { fr } from "date-fns/locale";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import theme from "./theme";
import B2BOrdersStats from "./pages/B2BOrdersStats";
import B2BOrdersList from "./pages/B2BOrdersList";
import FreyaSalesDashboard from "./pages/FreyaSalesDashboard";
import PurchaseInvoices from "./pages/PurchaseInvoices";

const queryClient = new QueryClient();

pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
    <CssBaseline />
    {/* 👉 GLOBAL DATE PICKER CONTEXT */}
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={fr}>
      <QueryClientProvider client={queryClient}>
        {/* Servi sous /compta (voir vite.config.ts, `base`) — basename doit rester synchronisé. */}
        <Router basename="/compta">
          <Routes>
            {/* Routes sans Navbar */}
            <Route path="/login" element={<Login />} />

            {/* Routes avec Navbar */}
            <Route
              path="/"
              element={
                <PrivateRoute>
                  <Navbar>
                    <NewInvoices />
                  </Navbar>
                </PrivateRoute>
              }
            />

            <Route
              path="/stock/status"
              element={
                <PrivateRoute>
                  <Navbar>
                    <FreyaSalesDashboard />
                  </Navbar>
                </PrivateRoute>
              }
            />
            <Route
              path="/all-invoices"
              element={
                <PrivateRoute>
                  <Navbar>
                    <NewInvoices />
                  </Navbar>
                </PrivateRoute>
              }
            />

            <Route
              path="/droppex-invoices"
              element={
                <PrivateRoute>
                  <Navbar>
                    <DroppexInvoices />
                  </Navbar>
                </PrivateRoute>
              }
            />

            <Route
              path="/deposit-b2b"
              element={
                <PrivateRoute>
                  <Navbar>
                    <B2BInvoiceDeposit />
                  </Navbar>
                </PrivateRoute>
              }
            />

            <Route
              path="/create-invoice"
              element={
                <PrivateRoute>
                  <Navbar>
                    <CreateInvoice />
                  </Navbar>
                </PrivateRoute>
              }
            />

            <Route
              path="/b2b/products"
              element={
                <PrivateRoute>
                  <Navbar>
                    <ProductB2B />
                  </Navbar>
                </PrivateRoute>
              }
            />

            <Route
              path="/b2b/price-lists"
              element={
                <PrivateRoute>
                  <Navbar>
                    <PriceListsPage />
                  </Navbar>
                </PrivateRoute>
              }
            />

            <Route
              path="/b2b/orders/create"
              element={
                <PrivateRoute>
                  <Navbar>
                    <CreateOrderB2B />
                  </Navbar>
                </PrivateRoute>
              }
            />

            <Route
              path="/b2b/customers/create"
              element={
                <PrivateRoute>
                  <Navbar>
                    <CreateCustomerB2B />
                  </Navbar>
                </PrivateRoute>
              }
            />

            <Route
              path="/b2b/orders/history"
              element={
                <PrivateRoute>
                  <Navbar>
                    <B2BOrderHistorySelectClient />
                  </Navbar>
                </PrivateRoute>
              }
            />
             <Route
              path="/b2b/orders/stats"
              element={
                <PrivateRoute>
                  <Navbar>
                    <B2BOrdersStats />
                  </Navbar>
                </PrivateRoute>
              }
            />

            <Route
              path="/b2b/orders/all"
              element={
                <PrivateRoute>
                  <Navbar>
                    <B2BOrdersList />
                  </Navbar>
                </PrivateRoute>
              }
            />

            <Route
              path="/b2b/payments/declare"
              element={
                <PrivateRoute>
                  <Navbar>
                    <DeclarePaymentInstrument />
                  </Navbar>
                </PrivateRoute>
              }
            />

            <Route
              path="/b2b/payments"
              element={
                <PrivateRoute>
                  <Navbar>
                    <PaymentInstrumentsList />
                  </Navbar>
                </PrivateRoute>
              }
            />

            <Route
              path="/b2b/orders/history/:clientId"
              element={
                <PrivateRoute>
                  <Navbar>
                    <ClientOrderHistory />
                  </Navbar>
                </PrivateRoute>
              }
            />

            <Route
              path="/achats/factures"
              element={
                <PrivateRoute>
                  <Navbar>
                    <PurchaseInvoices />
                  </Navbar>
                </PrivateRoute>
              }
            />

            <Route
              path="/b2b/clients"
              element={
                <PrivateRoute>
                  <Navbar>
                    <ClientB2BSelect />
                  </Navbar>
                </PrivateRoute>
              }
            />

            <Route
              path="/b2b/clients/:clientId"
              element={
                <PrivateRoute>
                  <Navbar>
                    <ClientB2BDetail />
                  </Navbar>
                </PrivateRoute>
              }
            />

            <Route
              path="/b2b/animations"
              element={
                <PrivateRoute>
                  <Navbar>
                    <AnimationsList />
                  </Navbar>
                </PrivateRoute>
              }
            />

            <Route
              path="/b2b/animations/dashboard"
              element={
                <PrivateRoute>
                  <Navbar>
                    <AnimationDashboard />
                  </Navbar>
                </PrivateRoute>
              }
            />

            <Route
              path="/b2b/animatrices"
              element={
                <PrivateRoute>
                  <Navbar>
                    <AnimatricesList />
                  </Navbar>
                </PrivateRoute>
              }
            />

            <Route
              path="/b2b/animations/credits"
              element={
                <PrivateRoute>
                  <Navbar>
                    <AnimationCreditsDashboard />
                  </Navbar>
                </PrivateRoute>
              }
            />

            {/* 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Router>
      </QueryClientProvider>
    </LocalizationProvider>
    </ThemeProvider>
  </React.StrictMode>
)