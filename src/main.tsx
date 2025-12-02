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
import UserProfile from "./pages/UserProfile";
import { Invoices as NewInvoices } from "./epic/invoices/Invoices";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DroppexInvoices } from "./epic/invoices/DroppexInvoices";
import { B2BInvoiceDeposit } from "./epic/invoices/B2BInvoiceUploader";
import CompareStats from "./pages/CompareStats";
import FreyaOutOfStockDashboard from "./pages/FreyaOutOfStockDashboard";
import CreateCustomerB2B from "./pages/CreateCustomerB2B";
import ProductB2B from "./pages/ProductB2B";
import CreateOrderB2B from "./pages/CreateOrderB2B";
import ClientOrderHistory from "./pages/ClientOrderHistory";
import B2BOrderHistorySelectClient from "./pages/B2BOrderHistorySelectClient";

// 👉 IMPORT MUI X Date Pickers (OBLIGATOIRE)
import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";

const queryClient = new QueryClient();

pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    {/* 👉 GLOBAL DATE PICKER CONTEXT */}
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <QueryClientProvider client={queryClient}>
        <Router>
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
              path="/profile"
              element={
                <PrivateRoute>
                  <Navbar>
                    <UserProfile />
                  </Navbar>
                </PrivateRoute>
              }
            />

            <Route
              path="/stock/status"
              element={
                <PrivateRoute>
                  <Navbar>
                    <FreyaOutOfStockDashboard />
                  </Navbar>
                </PrivateRoute>
              }
            />

            <Route
              path="/statistics"
              element={
                <PrivateRoute>
                  <Navbar>
                    <CompareStats />
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
              path="/b2b/orders/history/:clientId"
              element={
                <PrivateRoute>
                  <Navbar>
                    <ClientOrderHistory />
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
  </React.StrictMode>
)