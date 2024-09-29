import React from "react";
import { Box, Typography, Button } from "@mui/material";
import { useNavigate } from "react-router-dom";

const NotFound: React.FC = () => {
  const navigate = useNavigate();

  const handleGoHome = () => {
    navigate("/login");
  };

  return (
    <Box
      display="flex"
      flexDirection="column"
      justifyContent="center"
      alignItems="center"
      height="100vh"
      bgcolor="#f5f5f5"
    >
      <Typography variant="h1" color="primary" gutterBottom>
        404
      </Typography>
      <Typography variant="h5" gutterBottom>
        Oups! Cette page n'existe pas.
      </Typography>
      <Typography variant="body1" color="textSecondary" paragraph>
        La page que vous recherchez est introuvable.
      </Typography>
      <Button variant="contained" color="primary" onClick={handleGoHome}>
        Retour à la page de connexion
      </Button>
    </Box>
  );
};

export default NotFound;
