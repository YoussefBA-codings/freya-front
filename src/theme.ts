import { createTheme } from "@mui/material/styles";
import { frFR as coreFrFR } from "@mui/material/locale";
import { frFR as dataGridFrFR } from "@mui/x-data-grid/locales";
import { frFR as pickersFrFR } from "@mui/x-date-pickers/locales";
import type {} from "@mui/x-data-grid/themeAugmentation";

// Copie exacte (mêmes clés, mêmes valeurs) de
// tools/freyaOMS/src/lib/theme/theme.ts - décision équipe 2026-07-18 ("on
// dirait le même projet", "copier coller"). Rien de plus que ce que
// freyaOMS définit lui-même : tout ce qui n'est pas explicitement surchargé
// ici retombe sur les défauts MUI, exactement comme côté freyaOMS. Les
// imports de locale française (ci-dessus) sont une exception volontaire :
// ce n'est pas une question de design mais de fonctionnalité i18n (libellés
// DataGrid/DatePicker en français), freyaOMS n'ayant simplement jamais eu
// besoin de les configurer.
const STATUS = {
  good: "#0ca30c",
  warning: "#fab219",
  critical: "#d03b3b",
};

const CHART_INK = {
  primary: "#0b0b0b",
  secondary: "#52514e",
  surface: "#fcfcfb",
};

const baseTheme = createTheme(
  {
    palette: {
      primary: { main: "#1B4332" },
      secondary: { main: "#B08968" },
      success: { main: STATUS.good },
      warning: { main: STATUS.warning },
      error: { main: STATUS.critical },
      background: {
        default: "#f9f9f7",
        paper: CHART_INK.surface,
      },
      text: {
        primary: CHART_INK.primary,
        secondary: CHART_INK.secondary,
      },
    },
    shape: { borderRadius: 12 },
    typography: {
      fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
      h4: { fontWeight: 700, letterSpacing: -0.5 },
      h6: { fontWeight: 600 },
    },
    components: {
      MuiAppBar: {
        defaultProps: { color: "inherit" },
        styleOverrides: {
          root: { backgroundColor: CHART_INK.surface },
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
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: { borderRadius: 8, textTransform: "none", fontWeight: 600 },
        },
      },
    },
  },
  coreFrFR,
  dataGridFrFR,
  pickersFrFR
);

export default baseTheme;
