import { useEffect, useState } from "react";
import { Alert, Snackbar } from "@mui/material";
import { errorMessage } from "./errors";

// Notification unique pour tout l'outil : notify("Facture enregistrée.") ou notifyError(e, "Enregistrement impossible").
type Status = "success" | "error" | "info" | "warning";
type Notice = { id: number; message: string; status: Status };

let listener: ((n: Notice) => void) | null = null;
let seq = 0;

export function notify(message: string, status: Status = "success") {
  listener?.({ id: ++seq, message, status });
}

export function notifyError(e: unknown, action?: string) {
  console.error(action ?? "Erreur", e);
  notify(errorMessage(e, action), "error");
}

/** À monter une seule fois (main.tsx). */
export function Notifier() {
  const [notice, setNotice] = useState<Notice | null>(null);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    listener = (n) => { setNotice(n); setOpen(true); };
    return () => { listener = null; };
  }, []);
  return (
    <Snackbar
      key={notice?.id}
      open={open}
      onClose={(_, reason) => reason !== "clickaway" && setOpen(false)}
      autoHideDuration={notice?.status === "error" ? 8000 : 4000}
      anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
    >
      <Alert onClose={() => setOpen(false)} severity={notice?.status ?? "info"} variant="filled" sx={{ width: "100%", maxWidth: 560, whiteSpace: "pre-line" }}>
        {notice?.message}
      </Alert>
    </Snackbar>
  );
}
