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

import { Link, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";

// Portail Freya (racine du hostname Tailscale partagé, voir
// tools/freyaOMS/docs/ARCHITECTURE.md, "Topologie SSO Freya") — cette app
// est servie sous /compta sur ce même hostname.
const PORTAL_URL = "https://ip-172-26-14-45.tail515d61.ts.net/";

// Même largeur que freyaOMS (tools/freyaOMS/src/components/DashboardNav.tsx,
// DRAWER_WIDTH) — même seuil de bascule desktop/mobile (breakpoint "md", pas
// "sm") : les deux apps doivent se comporter et se dimensionner à l'identique.
const DRAWER_WIDTH = 248;

// Titre de page affiché dans l'AppBar (comme freyaOMS : le nom de l'app vit
// dans l'en-tête du drawer, l'AppBar montre la page courante) — une seule
// source de vérité avec les routes de main.tsx.
const PAGE_TITLES: Record<string, string> = {
  "/": "Gestion des factures",
  "/all-invoices": "Gestion des factures",
  "/stock/status": "État du stock",
  "/droppex-invoices": "Factures Droppex",
  "/deposit-b2b": "Déposer une facture",
  "/create-invoice": "Créer une facture",
  "/b2b/products": "Gérer les produits",
  "/b2b/orders/create": "Créer une commande",
  "/b2b/customers/create": "Créer un client",
  "/b2b/orders/history": "Historique commandes",
  "/b2b/orders/stats": "Statistiques",
  "/b2b/orders/all": "Toutes les commandes",
  "/achats/factures": "Factures d'achat",
};

function pageTitleFor(pathname: string): string {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  if (pathname.startsWith("/b2b/orders/history/")) return "Historique client";
  return "Freya Hub";
}

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
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleDrawerToggle = () => setMobileOpen(!mobileOpen);
  const pageTitle = pageTitleFor(location.pathname);

  // Organisé par entité métier (Commandes, Clients, Produits, Factures),
  // pas par ligne d'activité B2C/B2B — comme Shopify.
  const drawerContent = (
    <List dense disablePadding sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
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

  // En-tête du drawer (nom + sous-titre de l'app) — même emplacement et
  // même style que "Freya OMS" / "Stock & insights Shopify" dans
  // tools/freyaOMS/src/components/DashboardNav.tsx : la marque vit dans le
  // drawer, l'AppBar montre la page courante.
  const drawerHeader = (
    <Toolbar sx={{ flexDirection: "column", alignItems: "flex-start", justifyContent: "center", py: 2.5 }}>
      <Typography variant="h6" noWrap component="div" sx={{ fontWeight: 800, letterSpacing: -0.3 }} color="primary.main">
        Freya Hub
      </Typography>
      <Typography variant="caption" color="text.secondary" noWrap>
        Comptabilité
      </Typography>
    </Toolbar>
  );

  return (
    <Box sx={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      <AppBar
        position="fixed"
        color="inherit"
        elevation={0}
        sx={{
          width: { xs: "100%", md: `calc(100% - ${DRAWER_WIDTH}px)` },
          ml: { xs: 0, md: `${DRAWER_WIDTH}px` },
          borderBottom: "1px solid",
          borderColor: "divider",
          zIndex: (theme) => theme.zIndex.drawer + 1,
        }}
      >
        <Toolbar sx={{ display: "flex", justifyContent: "space-between", gap: 1 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}>
            <IconButton
              color="inherit"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ display: { xs: "inline-flex", md: "none" } }}
            >
              <MenuIcon />
            </IconButton>
            <Typography variant="subtitle1" noWrap sx={{ fontWeight: 600 }}>
              {pageTitle}
            </Typography>
          </Box>
          <Tooltip title="Retour au portail Freya" placement="bottom" arrow>
            <IconButton component="a" href={PORTAL_URL} sx={{ color: "text.secondary" }}>
              <ArrowBackIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>

      {/* Drawer permanent desktop */}
      <Drawer
        variant="permanent"
        sx={{
          width: DRAWER_WIDTH,
          flexShrink: 0,
          display: { xs: "none", md: "block" },
          "& .MuiDrawer-paper": { width: DRAWER_WIDTH, boxSizing: "border-box" },
        }}
      >
        {drawerHeader}
        <Box sx={{ overflow: "auto", px: 1.5 }}>{drawerContent}</Box>
      </Drawer>

      {/* Drawer temporaire mobile */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: "block", md: "none" },
          "& .MuiDrawer-paper": { width: DRAWER_WIDTH, boxSizing: "border-box" },
        }}
      >
        {drawerHeader}
        <Box sx={{ overflow: "auto", px: 1.5 }}>{drawerContent}</Box>
      </Drawer>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 2, sm: 3 },
          width: { xs: "100%", md: `calc(100% - ${DRAWER_WIDTH}px)` },
          minWidth: 0,
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
