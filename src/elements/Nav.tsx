import {
  AppBar,
  Box,
  Toolbar,
  Typography,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemButton,
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
  Menu as MenuIcon,
  CheckCircle as CheckIcon,
  UploadFile as UploadFileIcon,
  BarChart as BarChartIcon,
  Inventory as InventoryIcon,
  GroupAdd as GroupAddIcon,
  RequestQuote as RequestQuoteIcon,
  FormatListBulleted as FormatListBulletedIcon,
} from "@mui/icons-material";

import { Link, useLocation } from "react-router-dom";
import { useState } from "react";
import { useTheme } from "@mui/material/styles";

interface NavbarProps {
  children: React.ReactNode;
}

interface NavItemProps {
  to: string;
  label: string;
  icon: React.ReactNode;
  tooltip?: string;
  onClick: () => void;
}

const NavItem: React.FC<NavItemProps> = ({ to, label, icon, tooltip, onClick }) => {
  const location = useLocation();
  const selected = location.pathname === to;

  return (
    <ListItem disablePadding sx={{ px: 1, py: 0.25 }}>
      <Tooltip title={tooltip || label} placement="right" arrow>
        <ListItemButton
          component={Link}
          to={to}
          onClick={onClick}
          selected={selected}
          sx={{ py: 0.75 }}
        >
          <ListItemIcon sx={{ minWidth: 36 }}>{icon}</ListItemIcon>
          <ListItemText
            primary={label}
            primaryTypographyProps={{
              fontSize: "0.875rem",
              fontWeight: selected ? 600 : 500,
            }}
          />
        </ListItemButton>
      </Tooltip>
    </ListItem>
  );
};

const Navbar: React.FC<NavbarProps> = ({ children }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleDrawerToggle = () => setMobileOpen(!mobileOpen);

  const subheaderSx = {
    fontWeight: 700,
    color: "text.secondary",
    fontSize: "0.7rem",
    letterSpacing: "0.06em",
    lineHeight: "28px",
    mt: 0.5,
    px: 2,
  };

  const drawerContent = (
    <List dense disablePadding sx={{ py: 1.5 }}>
      {/* ========================= */}
      {/*          B2C SECTION      */}
      {/* ========================= */}
      <ListSubheader sx={subheaderSx}>B2C</ListSubheader>

      <NavItem
        to="/all-invoices"
        label="Gestion des factures"
        icon={<InvoiceIcon fontSize="small" />}
        onClick={handleDrawerToggle}
      />
      <NavItem
        to="/droppex-invoices"
        label="Factures Droppex"
        icon={<CheckIcon fontSize="small" />}
        onClick={handleDrawerToggle}
      />
      <NavItem
        to="/stock/status"
        label="État du stock"
        tooltip="Tableau de bord de surveillance des ruptures de stock Freya"
        icon={<InventoryIcon fontSize="small" />}
        onClick={handleDrawerToggle}
      />

      {/* ========================= */}
      {/*           B2B SECTION     */}
      {/* ========================= */}
      <ListSubheader sx={subheaderSx}>B2B</ListSubheader>

      <NavItem
        to="/deposit-b2b"
        label="Déposer une facture"
        tooltip="Déposer une facture B2B"
        icon={<UploadFileIcon fontSize="small" />}
        onClick={handleDrawerToggle}
      />
      <NavItem
        to="/b2b/customers/create"
        label="Créer un client"
        icon={<GroupAddIcon fontSize="small" />}
        onClick={handleDrawerToggle}
      />
      <NavItem
        to="/b2b/products"
        label="Gérer les produits"
        icon={<InventoryIcon fontSize="small" />}
        onClick={handleDrawerToggle}
      />
      <NavItem
        to="/b2b/orders/create"
        label="Créer une commande"
        icon={<ReceiptLongIcon fontSize="small" />}
        onClick={handleDrawerToggle}
      />
      <NavItem
        to="/b2b/orders/history"
        label="Historique des commandes"
        icon={<HistoryIcon fontSize="small" />}
        onClick={handleDrawerToggle}
      />
      <NavItem
        to="/b2b/orders/all"
        label="Toutes les commandes"
        tooltip="Toutes les commandes B2B"
        icon={<FormatListBulletedIcon fontSize="small" />}
        onClick={handleDrawerToggle}
      />
      <NavItem
        to="/b2b/orders/stats"
        label="Statistiques B2B"
        tooltip="Statistiques des commandes B2B"
        icon={<BarChartIcon fontSize="small" />}
        onClick={handleDrawerToggle}
      />

      {/* ========================= */}
      {/*      COMPTABILITÉ        */}
      {/* ========================= */}
      <ListSubheader sx={subheaderSx}>Comptabilité</ListSubheader>

      <NavItem
        to="/achats/factures"
        label="Factures d'achat"
        icon={<RequestQuoteIcon fontSize="small" />}
        onClick={handleDrawerToggle}
      />
    </List>
  );

  return (
    <Box sx={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
        <Toolbar>
          {isMobile && (
            <IconButton
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 2, color: "text.secondary" }}
            >
              <MenuIcon />
            </IconButton>
          )}

          <Typography
            variant="h6"
            component={Link}
            to="/"
            sx={{ textDecoration: "none", color: "inherit", flexGrow: 1, fontWeight: 700 }}
          >
            Freya Hub
          </Typography>
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
