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
      setError("E-mail ou mot de passe invalide");
    }
  };

  return (
    <Box
      display="flex"
      justifyContent="center"
      alignItems="center"
      height="100vh"
      sx={{ bgcolor: "background.default" }}
    >
      <Paper
        variant="outlined"
        sx={{ p: { xs: 3, sm: 5 }, borderRadius: 3, width: 380, maxWidth: "90vw" }}
      >
        <Container disableGutters maxWidth="xs">
          <Box display="flex" flexDirection="column" alignItems="center" gap={0.5}>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              Freya Hub
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Connectez-vous à votre espace admin
            </Typography>
            <TextField
              label="E-mail"
              variant="outlined"
              fullWidth
              margin="normal"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              sx={{ mt: 0 }}
            />
            <TextField
              label="Mot de passe"
              type="password"
              variant="outlined"
              fullWidth
              margin="normal"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {error && (
              <Typography color="error" variant="body2" sx={{ alignSelf: "flex-start", mt: 0.5 }}>
                {error}
              </Typography>
            )}
            <Button
              variant="contained"
              color="primary"
              onClick={handleLogin}
              fullWidth
              size="large"
              sx={{ mt: 3, py: 1.25 }}
            >
              Se connecter
            </Button>
          </Box>
        </Container>
      </Paper>
    </Box>
  );
};

export default Login;
