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
  ListSubheader,
  Tooltip,
  useMediaQuery,
} from "@mui/material";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";

import {
  Receipt as InvoiceIcon,
  AccountCircle as AccountCircleIcon,
  Menu as MenuIcon,
  CheckCircle as CheckIcon,
  UploadFile as UploadFileIcon,
  BarChart as BarChartIcon,
  Inventory as InventoryIcon,
  GroupAdd as GroupAddIcon,
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

  const handleDrawerToggle = () => setMobileOpen(!mobileOpen);

  const drawerContent = (
    <List>
      {/* ========================= */}
      {/*          B2C SECTION      */}
      {/* ========================= */}
      <ListSubheader
        sx={{
          fontWeight: "bold",
          color: "primary.main",
          fontSize: "0.9rem",
          mt: 1,
        }}
      >
        B2C
      </ListSubheader>

      {/* Invoice Management */}
      <ListItem
        component={Link}
        to="/all-invoices"
        onClick={handleDrawerToggle}
      >
        <Tooltip title="Invoice Management" placement="right" arrow>
          <ListItemIcon>
            <InvoiceIcon color="action" />
          </ListItemIcon>
        </Tooltip>
        <ListItemText primary="Invoice Management" />
      </ListItem>

      {/* Droppex Invoices */}
      <ListItem
        component={Link}
        to="/droppex-invoices"
        onClick={handleDrawerToggle}
      >
        <Tooltip title="Droppex Invoices" placement="right" arrow>
          <ListItemIcon>
            <CheckIcon color="action" />
          </ListItemIcon>
        </Tooltip>
        <ListItemText primary="Droppex Invoices" />
      </ListItem>

      {/* Price Comparison */}
      <ListItem component={Link} to="/statistics" onClick={handleDrawerToggle}>
        <Tooltip title="Compare Freya vs TunisiaMarka" placement="right" arrow>
          <ListItemIcon>
            <BarChartIcon color="action" />
          </ListItemIcon>
        </Tooltip>
        <ListItemText primary="Price Comparison" />
      </ListItem>

      {/* Stock Status */}
      <ListItem
        component={Link}
        to="/stock/status"
        onClick={handleDrawerToggle}
      >
        <Tooltip
          title="Freya Out-of-Stock Monitoring Dashboard"
          placement="right"
          arrow
        >
          <ListItemIcon>
            <InventoryIcon color="action" />
          </ListItemIcon>
        </Tooltip>
        <ListItemText primary="Stock Status" />
      </ListItem>

      {/* ========================= */}
      {/*           B2B SECTION     */}
      {/* ========================= */}
      <ListSubheader
        sx={{
          fontWeight: "bold",
          color: "primary.main",
          fontSize: "0.9rem",
          mt: 3,
        }}
      >
        B2B
      </ListSubheader>

      {/* Create Customer B2B */}
      {/* Deposit B2B Invoice */}
      <ListItem component={Link} to="/deposit-b2b" onClick={handleDrawerToggle}>
        <Tooltip title="Deposit B2B Invoice" placement="right" arrow>
          <ListItemIcon>
            <UploadFileIcon color="action" />
          </ListItemIcon>
        </Tooltip>
        <ListItemText primary="Deposit B2B Invoice" />
      </ListItem>

      <ListItem
        component={Link}
        to="/b2b/customers/create"
        onClick={handleDrawerToggle}
      >
        <Tooltip title="Create B2B Customer" placement="right" arrow>
          <ListItemIcon>
            <GroupAddIcon color="action" />
          </ListItemIcon>
        </Tooltip>
        <ListItemText primary="Create Customer" />
      </ListItem>
      <ListItem
        component={Link}
        to="/b2b/products"
        onClick={handleDrawerToggle}
      >
        <Tooltip title="Manage B2B Products" placement="right" arrow>
          <ListItemIcon>
            <InventoryIcon color="action" />
          </ListItemIcon>
        </Tooltip>
        <ListItemText primary="Products B2B" />
      </ListItem>
      <ListItem
        component={Link}
        to="/b2b/orders/create"
        onClick={handleDrawerToggle}
      >
        <Tooltip title="Create B2B Order" placement="right" arrow>
          <ListItemIcon>
            <ReceiptLongIcon color="action" />
          </ListItemIcon>
        </Tooltip>
        <ListItemText primary="Create B2B Order" />
      </ListItem>
      <ListItem
        component={Link}
        to="/b2b/orders/history"
        onClick={handleDrawerToggle}
      >
        <Tooltip title="B2B Orders History" placement="right" arrow>
          <ListItemIcon>
            <ReceiptLongIcon color="action" />
          </ListItemIcon>
        </Tooltip>
        <ListItemText primary="B2B Orders History" />
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
            sx={{
              textDecoration: "none",
              color: "inherit",
              flexGrow: 1,
            }}
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
