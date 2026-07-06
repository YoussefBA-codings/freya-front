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
import HistoryIcon from "@mui/icons-material/History";

import {
  Receipt as InvoiceIcon,
  AccountCircle as AccountCircleIcon,
  Menu as MenuIcon,
  CheckCircle as CheckIcon,
  UploadFile as UploadFileIcon,
  BarChart as BarChartIcon,
  Inventory as InventoryIcon,
  GroupAdd as GroupAddIcon,
  RequestQuote as RequestQuoteIcon,
  FormatListBulleted as FormatListBulletedIcon,
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
      <ListItem component={Link} to="/all-invoices" onClick={handleDrawerToggle}>
        <Tooltip title="Gestion des factures" placement="right" arrow>
          <ListItemIcon>
            <InvoiceIcon color="action" />
          </ListItemIcon>
        </Tooltip>
        <ListItemText primary="Gestion des factures" />
      </ListItem>

      {/* Droppex Invoices */}
      <ListItem
        component={Link}
        to="/droppex-invoices"
        onClick={handleDrawerToggle}
      >
        <Tooltip title="Factures Droppex" placement="right" arrow>
          <ListItemIcon>
            <CheckIcon color="action" />
          </ListItemIcon>
        </Tooltip>
        <ListItemText primary="Factures Droppex" />
      </ListItem>
      {/* Stock Status */}
      <ListItem component={Link} to="/stock/status" onClick={handleDrawerToggle}>
        <Tooltip
          title="Tableau de bord de surveillance des ruptures de stock Freya"
          placement="right"
          arrow
        >
          <ListItemIcon>
            <InventoryIcon color="action" />
          </ListItemIcon>
        </Tooltip>
        <ListItemText primary="État du stock" />
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

      {/* Deposit B2B Invoice */}
      <ListItem component={Link} to="/deposit-b2b" onClick={handleDrawerToggle}>
        <Tooltip title="Déposer une facture B2B" placement="right" arrow>
          <ListItemIcon>
            <UploadFileIcon color="action" />
          </ListItemIcon>
        </Tooltip>
        <ListItemText primary="Déposer une facture" />
      </ListItem>

      {/* Create Customer */}
      <ListItem
        component={Link}
        to="/b2b/customers/create"
        onClick={handleDrawerToggle}
      >
        <Tooltip title="Créer un client" placement="right" arrow>
          <ListItemIcon>
            <GroupAddIcon color="action" />
          </ListItemIcon>
        </Tooltip>
        <ListItemText primary="Créer un client" />
      </ListItem>

      {/* Manage Products */}
      <ListItem component={Link} to="/b2b/products" onClick={handleDrawerToggle}>
        <Tooltip title="Gérer les produits" placement="right" arrow>
          <ListItemIcon>
            <InventoryIcon color="action" />
          </ListItemIcon>
        </Tooltip>
        <ListItemText primary="Gérer les produits" />
      </ListItem>

      {/* Create Order */}
      <ListItem
        component={Link}
        to="/b2b/orders/create"
        onClick={handleDrawerToggle}
      >
        <Tooltip title="Créer une commande" placement="right" arrow>
          <ListItemIcon>
            <ReceiptLongIcon color="action" />
          </ListItemIcon>
        </Tooltip>
        <ListItemText primary="Créer une commande" />
      </ListItem>

      {/* Orders History */}
      <ListItem
        component={Link}
        to="/b2b/orders/history"
        onClick={handleDrawerToggle}
      >
        <Tooltip title="Historique des commandes" placement="right" arrow>
          <ListItemIcon>
            <HistoryIcon color="action" />
          </ListItemIcon>
        </Tooltip>
        <ListItemText primary="Historique des commandes" />
      </ListItem>

      {/* Toutes les commandes (vue globale) */}
      <ListItem
        component={Link}
        to="/b2b/orders/all"
        onClick={handleDrawerToggle}
      >
        <Tooltip title="Toutes les commandes B2B" placement="right" arrow>
          <ListItemIcon>
            <FormatListBulletedIcon color="action" />
          </ListItemIcon>
        </Tooltip>
        <ListItemText primary="Toutes les commandes" />
      </ListItem>

      {/* ✅ B2B Stats (NEW) */}
      <ListItem
        component={Link}
        to="/b2b/orders/stats"
        onClick={handleDrawerToggle}
      >
        <Tooltip title="Statistiques des commandes B2B" placement="right" arrow>
          <ListItemIcon>
            <BarChartIcon color="action" />
          </ListItemIcon>
        </Tooltip>
        <ListItemText primary="Statistiques B2B" />
      </ListItem>

      {/* ========================= */}
      {/*      COMPTABILITÉ        */}
      {/* ========================= */}
      <ListSubheader
        sx={{
          fontWeight: "bold",
          color: "primary.main",
          fontSize: "0.9rem",
          mt: 3,
        }}
      >
        Comptabilité
      </ListSubheader>

      <ListItem
        component={Link}
        to="/achats/factures"
        onClick={handleDrawerToggle}
      >
        <Tooltip title="Factures d'achat" placement="right" arrow>
          <ListItemIcon>
            <RequestQuoteIcon color="action" />
          </ListItemIcon>
        </Tooltip>
        <ListItemText primary="Factures d'achat" />
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
          "& .MuiDrawer-paper": { width: 240, boxSizing: "border-box" },
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