import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import Login from "./pages/Login";
import "./index.css";
import UpdateInvoice from "./pages/UpdateInvoice";
import PrivateRoute from "./elements/PrivateRoute";
import NotFound from "./pages/NotFound";
import Navbar from "./elements/Nav";
import CreateInvoice from "./pages/CreateInvoice";
import UserProfile from "./pages/UserProfile";
import { Invoices as NewInvoices } from "./epic/invoices/Invoices";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import OrdersToProcess from "./pages/OrdersToProcess";
const queryClient = new QueryClient();

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
            path="/update-invoice/:id"
            element={
              <PrivateRoute>
                <>
                  <Navbar>
                    <UpdateInvoice />
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
            <Route
            path="/orders-to-prepare"
            element={
              <PrivateRoute>
                <>
                  <Navbar>
                    <OrdersToProcess />
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
