import { Card, CardContent, Typography, Grid, Box } from "@mui/material";
import { Link } from "react-router-dom";

// Dummy data for services, allowing for easy future expansion
const services = [
  {
    name: "Create Invoice",
    description: "Generate and manage new invoices effortlessly.",
    path: "/create-invoice",
  },
  {
    name: "Update Invoice",
    description: "Edit existing invoices and update their details.",
    path: "/calendar",
  },
];

const InvoiceManager = () => {
  return (
    <Box sx={{ flexGrow: 1, padding: 3 }}>
      <Typography variant="h4" sx={{ marginBottom: 2, textAlign: 'center' }}>
        Invoice Manager
      </Typography>
      <Typography variant="h6" sx={{ marginBottom: 4, textAlign: 'center' }}>
        All services related to Invoices
      </Typography>
      <Grid container spacing={3} justifyContent="center">
        {services.map((service, index) => (
          <Grid item xs={12} sm={6} md={4} key={index}>
            <Card
              component={Link}
              to={service.path}
              sx={{
                textDecoration: "none",
                height: "100%",
                display: "flex",
                flexDirection: "column",
                transition: "transform 0.3s ease",
                "&:hover": {
                  transform: "scale(1.05)",
                  boxShadow: 3,
                },
              }}
            >
              <CardContent sx={{ flexGrow: 1 }}>
                <Typography variant="h6" gutterBottom>
                  {service.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {service.description}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default InvoiceManager;