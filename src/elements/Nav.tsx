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
  Collapse,
  Tooltip,
  useMediaQuery,
} from "@mui/material";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

import {
  Menu as MenuIcon,
  Inventory as InventoryIcon,
  GroupAdd as GroupAddIcon,
  ShoppingCartOutlined as OrdersIcon,
  ArrowBackOutlined as ArrowBackIcon,
} from "@mui/icons-material";

// Portail Freya (racine du hostname Tailscale partagé, voir
// tools/freyaOMS/docs/ARCHITECTURE.md, "Topologie SSO Freya") — cette app
// est servie sous /compta sur ce même hostname.
const PORTAL_URL = "https://ip-172-26-14-45.tail515d61.ts.net/";

import { Link, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { useTheme } from "@mui/material/styles";

interface NavbarProps {
  children: React.ReactNode;
}

interface NavItemProps {
  to: string;
  label: string;
  icon?: React.ReactNode;
  tooltip?: string;
  onClick: () => void;
  indent?: boolean;
}

// Comme Shopify : seules les entrées de premier niveau ont une icône, les
// sous-catégories dépliées sont juste indentées, sans icône.
const NavItem: React.FC<NavItemProps> = ({
  to,
  label,
  icon,
  tooltip,
  onClick,
  indent,
}) => {
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
          sx={{ py: 0.75, pl: indent ? 4.5 : 2 }}
        >
          {icon && <ListItemIcon sx={{ minWidth: 36 }}>{icon}</ListItemIcon>}
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

interface NavGroupChild {
  to: string;
  label: string;
  tooltip?: string;
}

interface NavGroupProps {
  label: string;
  icon: React.ReactNode;
  children: NavGroupChild[];
  onNavigate: () => void;
}

// Regroupe des pages liées sous un menu dépliable (ex: Shopify "Orders"),
// plutôt que d'empiler tous les liens à plat dans la sidebar.
const NavGroup: React.FC<NavGroupProps> = ({ label, icon, children, onNavigate }) => {
  const location = useLocation();
  const hasActiveChild = children.some((c) => c.to === location.pathname);
  const [open, setOpen] = useState(hasActiveChild);

  useEffect(() => {
    if (hasActiveChild) setOpen(true);
  }, [hasActiveChild]);

  return (
    <>
      <ListItem disablePadding sx={{ px: 1, py: 0.25 }}>
        <ListItemButton onClick={() => setOpen((o) => !o)} sx={{ py: 0.75 }}>
          <ListItemIcon sx={{ minWidth: 36 }}>{icon}</ListItemIcon>
          <ListItemText
            primary={label}
            primaryTypographyProps={{ fontSize: "0.875rem", fontWeight: 500 }}
          />
          {open ? (
            <ExpandLessIcon fontSize="small" sx={{ color: "text.secondary" }} />
          ) : (
            <ExpandMoreIcon fontSize="small" sx={{ color: "text.secondary" }} />
          )}
        </ListItemButton>
      </ListItem>
      <Collapse in={open} timeout="auto" unmountOnExit>
        <List disablePadding>
          {children.map((child) => (
            <NavItem
              key={child.to}
              to={child.to}
              label={child.label}
              tooltip={child.tooltip}
              onClick={onNavigate}
              indent
            />
          ))}
        </List>
      </Collapse>
    </>
  );
};

const Navbar: React.FC<NavbarProps> = ({ children }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleDrawerToggle = () => setMobileOpen(!mobileOpen);

  // Organisé par entité métier (Commandes, Clients, Produits, Factures),
  // pas par ligne d'activité B2C/B2B — comme Shopify.
  const drawerContent = (
    <List dense disablePadding sx={{ py: 1.5 }}>
      <NavGroup
        label="Commandes"
        icon={<OrdersIcon fontSize="small" />}
        onNavigate={handleDrawerToggle}
        children={[
          { to: "/b2b/orders/create", label: "Créer une commande" },
          {
            to: "/b2b/orders/all",
            label: "Toutes les commandes",
            tooltip: "Toutes les commandes B2B",
          },
          {
            to: "/b2b/orders/stats",
            label: "Statistiques",
            tooltip: "Statistiques des commandes B2B",
          },
        ]}
      />

      <NavGroup
        label="Clients"
        icon={<GroupAddIcon fontSize="small" />}
        onNavigate={handleDrawerToggle}
        children={[{ to: "/b2b/customers/create", label: "Créer un client" }]}
      />

      <NavGroup
        label="Produits"
        icon={<InventoryIcon fontSize="small" />}
        onNavigate={handleDrawerToggle}
        children={[
          { to: "/b2b/products", label: "Gérer les produits" },
          {
            to: "/stock/status",
            label: "État du stock",
            tooltip: "Tableau de bord de surveillance des ruptures de stock Freya",
          },
        ]}
      />

      <NavGroup
        label="Factures"
        icon={<ReceiptLongIcon fontSize="small" />}
        onNavigate={handleDrawerToggle}
        children={[
          { to: "/all-invoices", label: "Gestion des factures" },
          { to: "/droppex-invoices", label: "Factures Droppex" },
          {
            to: "/deposit-b2b",
            label: "Déposer une facture",
            tooltip: "Déposer une facture B2B",
          },
          { to: "/achats/factures", label: "Factures d'achat" },
        ]}
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

          <Tooltip title="Retour au portail Freya" placement="bottom" arrow>
            <IconButton component="a" href={PORTAL_URL} sx={{ color: "text.secondary" }}>
              <ArrowBackIcon fontSize="small" />
            </IconButton>
          </Tooltip>
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
