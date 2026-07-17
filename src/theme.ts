import { createTheme, alpha } from "@mui/material/styles";
import { frFR as coreFrFR } from "@mui/material/locale";
import { frFR as dataGridFrFR } from "@mui/x-data-grid/locales";
import { frFR as pickersFrFR } from "@mui/x-date-pickers/locales";
import type {} from "@mui/x-data-grid/themeAugmentation";

// Identité de marque Freya — mêmes valeurs que tools/freyaOMS/src/lib/theme/theme.ts
// et chartColors.ts (CHART_INK/STATUS). Deux repos séparés, pas de package
// partagé : ces constantes doivent être reportées à la main ici si jamais
// elles changent côté freyaOMS, pour que Freya Hub reste visuellement iso.
const brand = {
  primary: "#1B4332",
  secondary: "#B08968",
};

const status = {
  good: "#0ca30c",
  warning: "#fab219",
  critical: "#d03b3b",
};

const ink = {
  primary: "#0b0b0b",
  secondary: "#52514e",
  grid: "#e1e0d9",
  surface: "#fcfcfb",
};

const pageBackground = "#f9f9f7";

// Échelle d'ombres douce et plate (25 entrées, requis par MUI) — pas une
// convention freyaOMS (son thème n'a pas d'avis sur les ombres), gardée
// telle quelle : propre à freya-front, pas de raison de la retirer.
const subtleShadow = "0 1px 2px rgba(15, 23, 42, 0.06)";
const softShadow = "0 4px 12px rgba(15, 23, 42, 0.08)";
const shadows = Array(25).fill(softShadow) as any;
shadows[0] = "none";
shadows[1] = subtleShadow;
shadows[2] = subtleShadow;

const baseTheme = createTheme(
  {
    palette: {
      mode: "light",
      primary: { main: brand.primary },
      secondary: { main: brand.secondary },
      background: {
        default: pageBackground,
        paper: ink.surface,
      },
      text: {
        primary: ink.primary,
        secondary: ink.secondary,
      },
      divider: ink.grid,
      success: { main: status.good },
      warning: { main: status.warning },
      error: { main: status.critical },
      info: { main: "#0284C7" },
    },
    shape: {
      borderRadius: 12,
    },
    shadows,
    typography: {
      // system-ui (pas Inter) — même pile de police que freyaOMS.
      fontFamily: 'system-ui, -apple-system, "Segoe UI", "Roboto", "Helvetica", "Arial", sans-serif',
      h1: { fontWeight: 700, fontSize: "2.5rem", letterSpacing: "-0.02em" },
      h2: { fontWeight: 700, fontSize: "2rem", letterSpacing: "-0.02em" },
      h3: { fontWeight: 700, fontSize: "1.75rem", letterSpacing: "-0.01em" },
      h4: { fontWeight: 700, fontSize: "1.5rem", letterSpacing: "-0.5px" },
      h5: { fontWeight: 600, fontSize: "1.25rem" },
      h6: { fontWeight: 600, fontSize: "1.125rem" },
      subtitle1: { color: ink.secondary, fontSize: "0.95rem" },
      subtitle2: { color: ink.secondary, fontWeight: 500 },
      body1: { fontSize: "0.9375rem" },
      body2: { fontSize: "0.875rem" },
      button: { textTransform: "none", fontWeight: 600 },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            backgroundColor: pageBackground,
          },
        },
      },
      MuiAppBar: {
        defaultProps: { color: "inherit" },
        styleOverrides: {
          root: {
            backgroundColor: ink.surface,
            color: ink.primary,
            boxShadow: "none",
            borderBottom: `1px solid ${ink.grid}`,
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            backgroundColor: ink.surface,
            borderRight: `1px solid ${ink.grid}`,
          },
        },
      },
      MuiButton: {
        defaultProps: {
          disableElevation: true,
        },
        styleOverrides: {
          root: {
            borderRadius: 8,
            boxShadow: "none",
          },
          contained: {
            boxShadow: "none",
            "&:hover": { boxShadow: "none" },
          },
        },
      },
      MuiPaper: {
        defaultProps: {
          elevation: 0,
        },
        styleOverrides: {
          root: {
            backgroundImage: "none",
          },
          outlined: {
            borderColor: ink.grid,
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            border: "1px solid rgba(11,11,11,0.08)",
            boxShadow: "none",
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          root: {
            borderBottom: `1px solid ${ink.grid}`,
          },
          head: {
            backgroundColor: pageBackground,
            color: ink.secondary,
            fontWeight: 600,
            fontSize: "0.8125rem",
          },
        },
      },
      MuiTableRow: {
        styleOverrides: {
          root: {
            "&:last-child td": { borderBottom: 0 },
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 6,
            fontWeight: 600,
          },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: 8,
          },
          notchedOutline: {
            borderColor: ink.grid,
          },
        },
      },
      MuiListItemButton: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            "&.Mui-selected": {
              backgroundColor: alpha(brand.primary, 0.08),
              color: brand.primary,
              "& .MuiListItemIcon-root": { color: brand.primary },
              "&:hover": { backgroundColor: alpha(brand.primary, 0.12) },
            },
          },
        },
      },
      MuiListSubheader: {
        styleOverrides: {
          root: {
            backgroundColor: "transparent",
          },
        },
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            backgroundColor: ink.primary,
            fontSize: "0.75rem",
          },
        },
      },
      MuiDataGrid: {
        styleOverrides: {
          root: {
            border: `1px solid ${ink.grid}`,
            borderRadius: 12,
            backgroundColor: ink.surface,
          },
          columnHeaders: {
            backgroundColor: pageBackground,
            borderBottom: `1px solid ${ink.grid}`,
          },
          columnHeaderTitle: {
            fontWeight: 600,
            color: ink.secondary,
          },
          row: {
            "&:hover": { backgroundColor: pageBackground },
          },
          cell: {
            borderBottom: `1px solid ${ink.grid}`,
            "&:focus": { outline: "none" },
            "&:focus-within": { outline: "none" },
          },
        },
      },
    },
  },
  coreFrFR,
  dataGridFrFR,
  pickersFrFR
);

export default baseTheme;
