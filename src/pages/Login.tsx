import React, { useState } from "react";
import { Container, TextField, Button, Typography, Box, Paper } from "@mui/material";
import { useNavigate } from "react-router-dom";

const Login: React.FC = () => {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [error, setError] = useState<string>("");

  const navigate = useNavigate();

  const handleLogin = () => {
    const envEmail = import.meta.env.VITE_EMAIL;
    const envPassword = import.meta.env.VITE_PASSWORD;

    if (email === envEmail && password === envPassword) {
      setError("");
      localStorage.setItem("isAuthenticated", "true"); // Enregistrement de l'état d'authentification
      navigate("/invoices");
    } else {
      setError("Invalid email or password");
    }
  };

  return (
    <Box
      display="flex"
      justifyContent="center"
      alignItems="center"
      height="100vh"
      bgcolor="white"
    >
      <Paper elevation={3} style={{ padding: "2rem", borderRadius: "10px" }}>
        <Container maxWidth="xs">
          <Box display="flex" flexDirection="column" alignItems="center">
            <Typography variant="h4" gutterBottom>
              Freya Hub Admin
            </Typography>
            <TextField
              label="Email"
              variant="outlined"
              fullWidth
              margin="normal"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <TextField
              label="Password"
              type="password"
              variant="outlined"
              fullWidth
              margin="normal"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {error && (
              <Typography color="error" variant="body2">
                {error}
              </Typography>
            )}
            <Button variant="contained" color="primary" onClick={handleLogin} fullWidth>
              Login
            </Button>
          </Box>
        </Container>
      </Paper>
    </Box>
  );
};

export default Login;
