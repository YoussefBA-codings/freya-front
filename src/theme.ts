import { createTheme, alpha } from "@mui/material/styles";
import { frFR as coreFrFR } from "@mui/material/locale";
import { frFR as dataGridFrFR } from "@mui/x-data-grid/locales";
import { frFR as pickersFrFR } from "@mui/x-date-pickers/locales";
import type {} from "@mui/x-data-grid/themeAugmentation";

const slate = {
  50: "#F8FAFC",
  100: "#F1F5F9",
  200: "#E2E8F0",
  300: "#CBD5E1",
  400: "#94A3B8",
  500: "#64748B",
  600: "#475569",
  700: "#334155",
  800: "#1E293B",
  900: "#0F172A",
};

const indigo = {
  light: "#6366F1",
  main: "#4F46E5",
  dark: "#4338CA",
};

// A soft, flat shadow scale (25 entries, as MUI requires) instead of the
// stock heavy drop-shadows — keeps elevation cues without the dated
// "raised card" look.
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
      primary: indigo,
      background: {
        default: slate[50],
        paper: "#FFFFFF",
      },
      text: {
        primary: slate[900],
        secondary: slate[500],
      },
      divider: slate[200],
      grey: slate,
      success: { main: "#16A34A" },
      warning: { main: "#D97706" },
      error: { main: "#DC2626" },
      info: { main: "#0284C7" },
    },
    shape: {
      borderRadius: 10,
    },
    shadows,
    typography: {
      fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
      h1: { fontWeight: 700, fontSize: "2.5rem", letterSpacing: "-0.02em" },
      h2: { fontWeight: 700, fontSize: "2rem", letterSpacing: "-0.02em" },
      h3: { fontWeight: 700, fontSize: "1.75rem", letterSpacing: "-0.01em" },
      h4: { fontWeight: 700, fontSize: "1.5rem", letterSpacing: "-0.01em" },
      h5: { fontWeight: 600, fontSize: "1.25rem" },
      h6: { fontWeight: 600, fontSize: "1.125rem" },
      subtitle1: { color: slate[500], fontSize: "0.95rem" },
      subtitle2: { color: slate[500], fontWeight: 500 },
      body1: { fontSize: "0.9375rem" },
      body2: { fontSize: "0.875rem" },
      button: { textTransform: "none", fontWeight: 600 },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            backgroundColor: slate[50],
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundColor: "#FFFFFF",
            color: slate[900],
            boxShadow: "none",
            borderBottom: `1px solid ${slate[200]}`,
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            backgroundColor: "#FFFFFF",
            borderRight: `1px solid ${slate[200]}`,
          },
        },
      },
      MuiButton: {
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
            borderColor: slate[200],
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            border: `1px solid ${slate[200]}`,
            boxShadow: "none",
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          root: {
            borderBottom: `1px solid ${slate[200]}`,
          },
          head: {
            backgroundColor: slate[50],
            color: slate[600],
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
            borderColor: slate[200],
          },
        },
      },
      MuiListItemButton: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            "&.Mui-selected": {
              backgroundColor: alpha(indigo.main, 0.08),
              color: indigo.main,
              "& .MuiListItemIcon-root": { color: indigo.main },
              "&:hover": { backgroundColor: alpha(indigo.main, 0.12) },
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
            backgroundColor: slate[800],
            fontSize: "0.75rem",
          },
        },
      },
      MuiDataGrid: {
        styleOverrides: {
          root: {
            border: `1px solid ${slate[200]}`,
            borderRadius: 10,
            backgroundColor: "#FFFFFF",
          },
          columnHeaders: {
            backgroundColor: slate[50],
            borderBottom: `1px solid ${slate[200]}`,
          },
          columnHeaderTitle: {
            fontWeight: 600,
            color: slate[600],
          },
          row: {
            "&:hover": { backgroundColor: slate[50] },
          },
          cell: {
            borderBottom: `1px solid ${slate[100]}`,
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
