import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import Login from "./pages/Login";
import "./index.css";
import Invoices from "./pages/Invoices";
import UpdateInvoice from "./pages/UpdateInvoice";
import PrivateRoute from "./elements/PrivateRoute";
import NotFound from "./pages/NotFound";
import Navbar from "./elements/Nav";
import CreateInvoice from "./pages/CreateInvoice";
import HomePage from "./pages/Home";
import UserProfile from "./pages/UserProfile";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
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
                <Navbar /> {/* La Navbar sera affichée ici */}
                <HomePage />
              </>
            </PrivateRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <PrivateRoute>
              <>
              <Navbar /> {/* La Navbar sera affichée ici */}
              <UserProfile />
              </>
            </PrivateRoute>
          }
        />
        <Route
          path="/invoices"
          element={
            <PrivateRoute>
              <>
                <Navbar /> {/* La Navbar sera affichée ici */}
                <Invoices />
              </>
            </PrivateRoute>
          }
        />
        <Route
          path="/update-invoice/:id"
          element={
            <PrivateRoute>
              <>
                <Navbar /> {/* La Navbar sera affichée ici */}
                <UpdateInvoice />
              </>
            </PrivateRoute>
          }
        />
        <Route
          path="/create-invoice"
          element={
            <PrivateRoute>
              <>
                <Navbar /> {/* La Navbar sera affichée ici */}
                <CreateInvoice />
              </>
            </PrivateRoute>
          }
        />
        
        {/* Route Not Found */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  </React.StrictMode>
);
