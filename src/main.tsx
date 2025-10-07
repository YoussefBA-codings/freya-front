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
const queryClient = new QueryClient();

pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <Router>
        <Routes>
          {/* Routes sans Navbar */}
          <Route path="/login" element={<Login />} />

          {/* Routes avec la Navbar */}
          <Route
            path="/"
            element={
              <PrivateRoute>
                <>
                  <Navbar>
                    <NewInvoices />
                  </Navbar>
                </>
              </PrivateRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <PrivateRoute>
                <>
                  <Navbar>
                    <UserProfile />
                  </Navbar>
                </>
              </PrivateRoute>
            }
          />
           <Route
            path="/statistics"
            element={
              <PrivateRoute>
                <>
                  <Navbar>
                    <CompareStats />
                  </Navbar>
                </>
              </PrivateRoute>
            }
          />
          <Route
            path="/all-invoices"
            element={
              <PrivateRoute>
                <>
                  <Navbar>
                    <NewInvoices />
                  </Navbar>
                </>
              </PrivateRoute>
            }
          />
          <Route
            path="/droppex-invoices"
            element={
              <PrivateRoute>
                <>
                  <Navbar>
                    <DroppexInvoices />
                  </Navbar>
                </>
              </PrivateRoute>
            }
          />
          <Route
            path="/deposit-b2b"
            element={
              <PrivateRoute>
                <>
                  <Navbar>
                    <B2BInvoiceDeposit />
                  </Navbar>
                </>
              </PrivateRoute>
            }
          />
          <Route
            path="/create-invoice"
            element={
              <PrivateRoute>
                <>
                  <Navbar>
                    <CreateInvoice />
                  </Navbar>
                </>
              </PrivateRoute>
            }
          />
          {/* Route Not Found */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
    </QueryClientProvider>
  </React.StrictMode>
);
