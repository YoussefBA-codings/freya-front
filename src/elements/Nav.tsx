// Navbar.tsx
import {
  AppBar,
  Box,
  Toolbar,
  Typography,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Tooltip,
} from "@mui/material";
import {
  Receipt as InvoiceIcon,
  AccountCircle as AccountCircleIcon,
} from "@mui/icons-material";
import { Link } from "react-router-dom";
interface NavbarProps {
  children: React.ReactNode;
}

const Navbar: React.FC<NavbarProps> = ({ children }) => {
  const drawerContent = (
    <List>
      <ListItem component={Link} to="/all-invoices">
        <Tooltip title="Invoice Management" placement="right" arrow>
          <ListItemIcon>
            <InvoiceIcon />
          </ListItemIcon>
        </Tooltip>
        <ListItemText primary="Invoice Management" />
      </ListItem>
    </List>
  );

  return (
    <Box sx={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      <AppBar
        position="fixed"
        sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}
      >
        <Toolbar>
          <Typography
            variant="h6"
            component={Link}
            to="/"
            sx={{ textDecoration: "none", color: "inherit", flexGrow: 1 }}
          >
            Freya Hub
          </Typography>
          <IconButton color="inherit" component={Link} to="/profile">
            <AccountCircleIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Drawer
        variant="permanent"
        sx={{
          flexShrink: 0,
          "& .MuiDrawer-paper": {
            width: "240px",
            boxSizing: "border-box",
          },
        }}
      >
        <Toolbar />
        {drawerContent}
      </Drawer>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          transition: "padding-left 0.3s",
          marginLeft: "240px",
          width: "calc(100% - 240px)",
          overflow: "auto",
        }}
      >
        <Toolbar />
        {children}
      </Box>
    </Box>
  );
};

export default Navbar;
