import {
  AppBar,
  Box,
  Toolbar,
  Typography,
  IconButton,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Collapse,
} from "@mui/material";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import LogoutIcon from "@mui/icons-material/Logout";

import {
  Menu as MenuIcon,
  Inventory as InventoryIcon,
  GroupAdd as GroupAddIcon,
  ShoppingCartOutlined as OrdersIcon,
  ArrowBackOutlined as ArrowBackIcon,
} from "@mui/icons-material";

import { Link, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { PORTAL_URL, getPortalUserEmail, signOutOfPortal } from "../lib/portalAuth";

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
  onClick: () => void;
  indent?: boolean;
}

// Même traitement, à l'identique (sx copié), que les NAV_ITEMS de
// tools/freyaOMS/src/components/DashboardNav.tsx : pas de <ListItem>
// enveloppant, pas de Tooltip, même pastille verte pleine à l'état
// sélectionné (pas un simple survol teinté) - copier-coller volontaire,
// décision équipe 2026-07-18 ("on dirait le même projet").
const NavItem: React.FC<NavItemProps> = ({
  to,
  label,
  icon,
  onClick,
  indent,
}) => {
  const location = useLocation();
  const selected = location.pathname === to;

  return (
    <ListItemButton
      component={Link}
      to={to}
      onClick={onClick}
      selected={selected}
      sx={{
        borderRadius: 2,
        pl: indent ? 4.5 : 2,
        color: selected ? "primary.main" : "text.secondary",
        "&.Mui-selected": {
          bgcolor: "primary.main",
          color: "primary.contrastText",
          "&:hover": { bgcolor: "primary.dark" },
          "& .MuiListItemIcon-root": { color: "primary.contrastText" },
        },
      }}
    >
      {icon && (
        <ListItemIcon sx={{ color: "inherit", minWidth: 36 }}>{icon}</ListItemIcon>
      )}
      <ListItemText
        primary={label}
        primaryTypographyProps={{
          fontSize: 14,
          fontWeight: selected ? 600 : 500,
        }}
      />
    </ListItemButton>
  );
};

interface NavGroupChild {
  to: string;
  label: string;
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
      <ListItemButton
        onClick={() => setOpen((o) => !o)}
        sx={{ borderRadius: 2, color: "text.secondary" }}
      >
        <ListItemIcon sx={{ color: "inherit", minWidth: 36 }}>{icon}</ListItemIcon>
        <ListItemText
          primary={label}
          primaryTypographyProps={{ fontSize: 14, fontWeight: 500 }}
        />
        {open ? (
          <ExpandLessIcon fontSize="small" sx={{ color: "inherit" }} />
        ) : (
          <ExpandMoreIcon fontSize="small" sx={{ color: "inherit" }} />
        )}
      </ListItemButton>
      <Collapse in={open} timeout="auto" unmountOnExit>
        <List disablePadding sx={{ display: "flex", flexDirection: "column", gap: 0.5, mt: 0.5 }}>
          {children.map((child) => (
            <NavItem
              key={child.to}
              to={child.to}
              label={child.label}
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
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    getPortalUserEmail().then(setUserEmail);
  }, []);

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
          { to: "/b2b/orders/all", label: "Toutes les commandes" },
          { to: "/b2b/orders/stats", label: "Statistiques" },
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
          { to: "/stock/status", label: "État du stock" },
        ]}
      />

      <NavGroup
        label="Factures"
        icon={<ReceiptLongIcon fontSize="small" />}
        onNavigate={handleDrawerToggle}
        children={[
          { to: "/all-invoices", label: "Gestion des factures" },
          { to: "/droppex-invoices", label: "Factures Droppex" },
          { to: "/deposit-b2b", label: "Déposer une facture" },
          { to: "/achats/factures", label: "Factures d'achat" },
        ]}
      />
    </List>
  );

  // En-tête du drawer (nom + sous-titre de l'app, puis lien vers le
  // portail) — même emplacement et même style que "Freya OMS" / "Stock &
  // insights Shopify" / "Portail Freya" dans
  // tools/freyaOMS/src/components/DashboardNav.tsx : la marque vit dans le
  // drawer, l'AppBar montre la page courante. Comportement identique partout
  // (retour au tableau de bord, décision équipe 2026-07-18).
  const drawerHeader = (
    <>
      <Toolbar sx={{ flexDirection: "column", alignItems: "flex-start", justifyContent: "center", py: 2.5 }}>
        <Typography variant="h6" noWrap component="div" sx={{ fontWeight: 800, letterSpacing: -0.3 }} color="primary.main">
          Freya Hub
        </Typography>
        <Typography variant="caption" color="text.secondary" noWrap>
          Comptabilité
        </Typography>
      </Toolbar>
      <Box sx={{ px: 1.5, pb: 1 }}>
        <ListItemButton component="a" href={PORTAL_URL} sx={{ borderRadius: 2, color: "text.secondary" }}>
          <ListItemIcon sx={{ color: "inherit", minWidth: 36 }}>
            <ArrowBackIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText
            primaryTypographyProps={{ fontSize: 14, fontWeight: 500 }}
            primary="Portail Freya"
          />
        </ListItemButton>
      </Box>
    </>
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
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}>
            {userEmail && (
              <Typography variant="body2" color="text.secondary" noWrap sx={{ display: { xs: "none", sm: "block" } }}>
                {userEmail}
              </Typography>
            )}
            {/* Attribut `title` natif (pas de Tooltip) — même choix que
                tools/freyaOMS/src/app/(dashboard)/layout.tsx, pour rester
                identique même si la raison d'origine (hydration mismatch
                SSR) ne s'applique pas à ce SPA. */}
            <IconButton
              color="inherit"
              size="small"
              title="Se déconnecter"
              onClick={() => signOutOfPortal()}
            >
              <LogoutIcon fontSize="small" />
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Drawer permanent desktop */}
      <Drawer
        variant="permanent"
        sx={{
          width: DRAWER_WIDTH,
          flexShrink: 0,
          display: { xs: "none", md: "block" },
          "& .MuiDrawer-paper": {
            width: DRAWER_WIDTH,
            boxSizing: "border-box",
            borderRight: "1px solid",
            borderColor: "divider",
          },
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
