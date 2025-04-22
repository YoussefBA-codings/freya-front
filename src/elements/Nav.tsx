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
  useMediaQuery,
} from "@mui/material";
import {
  Receipt as InvoiceIcon,
  AccountCircle as AccountCircleIcon,
  Menu as MenuIcon,
} from "@mui/icons-material";
import { Link } from "react-router-dom";
import { useState } from "react";
import { useTheme } from "@mui/material/styles";

interface NavbarProps {
  children: React.ReactNode;
}

const Navbar: React.FC<NavbarProps> = ({ children }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const drawerContent = (
    <List>
      <ListItem component={Link} to="/all-invoices" onClick={handleDrawerToggle}>
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
      <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
        <Toolbar>
          {isMobile && (
            <IconButton
              color="inherit"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 2 }}
            >
              <MenuIcon />
            </IconButton>
          )}
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
        variant={isMobile ? "temporary" : "permanent"}
        open={!isMobile || mobileOpen}
        onClose={handleDrawerToggle}
        sx={{
          display: { xs: isMobile ? "block" : "none", md: "block" },
          "& .MuiDrawer-paper": {
            width: 240,
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
          marginLeft: { xs: 0, sm: "240px" },
          width: { xs: "100%", sm: "calc(100% - 240px)" },
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