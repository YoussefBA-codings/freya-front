// PaymentInstrumentsList.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import {
  Box,
  Typography,
  CircularProgress,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  SelectChangeEvent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Chip,
  Tooltip,
  Snackbar,
  SnackbarContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  IconButton,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import RefreshIcon from "@mui/icons-material/Refresh";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import AddIcon from "@mui/icons-material/Add";
import {
  ConfirmResult,
  InstrumentStatus,
  PaymentInstrument,
  STATUS_COLORS,
  STATUS_LABELS,
  TYPE_LABELS,
  errorMessageOf,
  isDueSoon,
  isOverdue,
} from "./paymentInstruments/shared";

const PaymentInstrumentsList: React.FC = () => {
  const navigate = useNavigate();
  const [instruments, setInstruments] = useState<PaymentInstrument[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"ALL" | InstrumentStatus>("PENDING");

  // Confirmation / rejet / suppression
  const [pendingConfirm, setPendingConfirm] = useState<PaymentInstrument | null>(null);
  const [pendingReject, setPendingReject] = useState<PaymentInstrument | null>(null);
  const [pendingDelete, setPendingDelete] = useState<PaymentInstrument | null>(null);
  const [confirmResult, setConfirmResult] = useState<{ instrument: PaymentInstrument; result: ConfirmResult } | null>(
    null,
  );
  const [actionLoading, setActionLoading] = useState(false);

  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [notifyMessage, setNotifyMessage] = useState("");
  const [notifyStatus, setNotifyStatus] = useState<"success" | "error">("success");

  const notify = (message: string, status: "success" | "error") => {
    setNotifyMessage(message);
    setNotifyStatus(status);
    setSnackbarOpen(true);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await axios.get<PaymentInstrument[]>(`${import.meta.env.VITE_API_URL}payment-instruments`);
      setInstruments(res.data);
    } catch (error) {
      console.error("Failed to load payment instruments:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filtered = useMemo(
    () => (statusFilter === "ALL" ? instruments : instruments.filter((i) => i.status === statusFilter)),
    [instruments, statusFilter],
  );

  const overdueCount = useMemo(() => instruments.filter(isOverdue).length, [instruments]);
  const dueSoonCount = useMemo(() => instruments.filter(isDueSoon).length, [instruments]);

  const handleConfirm = async () => {
    if (!pendingConfirm) return;
    setActionLoading(true);
    try {
      const res = await axios.patch<{ instrument: PaymentInstrument } & ConfirmResult>(
        `${import.meta.env.VITE_API_URL}payment-instruments/${pendingConfirm.id}/confirm`,
      );
      setConfirmResult({
        instrument: pendingConfirm,
        result: { allocations: res.data.allocations, unallocated: res.data.unallocated },
      });
      notify("Encaissement confirmé - commandes mises à jour.", "success");
      loadData();
    } catch (error) {
      notify(errorMessageOf(error), "error");
    } finally {
      setActionLoading(false);
      setPendingConfirm(null);
    }
  };

  const handleReject = async () => {
    if (!pendingReject) return;
    setActionLoading(true);
    try {
      await axios.patch(`${import.meta.env.VITE_API_URL}payment-instruments/${pendingReject.id}/reject`);
      notify("Marqué rejeté - aucune commande n'est affectée.", "success");
      loadData();
    } catch (error) {
      notify(errorMessageOf(error), "error");
    } finally {
      setActionLoading(false);
      setPendingReject(null);
    }
  };

  const handleDelete = async () => {
    if (!pendingDelete) return;
    setActionLoading(true);
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL}payment-instruments/${pendingDelete.id}`);
      notify("Supprimé.", "success");
      loadData();
    } catch (error) {
      notify(errorMessageOf(error), "error");
    } finally {
      setActionLoading(false);
      setPendingDelete(null);
    }
  };

  // Justificatif (photo/scan du chèque/traite ou reçu de virement) -
  // ajoutable et consultable quel que soit le statut de l'instrument.
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadTargetId, setUploadTargetId] = useState<number | null>(null);
  const [uploadingId, setUploadingId] = useState<number | null>(null);

  const triggerUpload = (id: number) => {
    setUploadTargetId(id);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const id = uploadTargetId;
    e.target.value = "";
    if (!file || id == null) return;

    setUploadingId(id);
    try {
      const formData = new FormData();
      formData.append("file", file);
      await axios.post(`${import.meta.env.VITE_API_URL}payment-instruments/${id}/justificatif`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      notify("Justificatif ajouté.", "success");
      loadData();
    } catch (error) {
      notify(errorMessageOf(error), "error");
    } finally {
      setUploadingId(null);
      setUploadTargetId(null);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 1, flexWrap: "wrap", gap: 1 }}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          Chèques, virements &amp; traites
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate("/b2b/payments/declare")}>
          Déclarer un paiement
        </Button>
      </Box>
      <Typography variant="subtitle1" sx={{ mb: 3 }}>
        Confirmez l&apos;encaissement quand l&apos;argent est réellement reçu - le montant est alors réparti
        automatiquement sur les commandes impayées du client, de la plus ancienne à la plus récente. Rien ne change
        sur les commandes tant que ce n&apos;est pas confirmé.
      </Typography>

      {(overdueCount > 0 || dueSoonCount > 0) && (
        <Box sx={{ display: "flex", gap: 1.5, mb: 3, flexWrap: "wrap" }}>
          {overdueCount > 0 && (
            <Chip
              icon={<WarningAmberIcon />}
              color="error"
              label={`${overdueCount} en retard`}
              onClick={() => setStatusFilter("PENDING")}
            />
          )}
          {dueSoonCount > 0 && (
            <Chip
              icon={<WarningAmberIcon />}
              color="warning"
              label={`${dueSoonCount} à encaisser dans les 7 jours`}
              onClick={() => setStatusFilter("PENDING")}
            />
          )}
        </Box>
      )}

      <Box sx={{ display: "flex", gap: 2, mb: 2, alignItems: "center" }}>
        <FormControl sx={{ minWidth: 160 }}>
          <InputLabel>Statut</InputLabel>
          <Select
            label="Statut"
            value={statusFilter}
            onChange={(e: SelectChangeEvent) => setStatusFilter(e.target.value as "ALL" | InstrumentStatus)}
          >
            <MenuItem value="ALL">Tous</MenuItem>
            <MenuItem value="PENDING">En attente</MenuItem>
            <MenuItem value="RECEIVED">Encaissé</MenuItem>
            <MenuItem value="REJECTED">Rejeté</MenuItem>
          </Select>
        </FormControl>
        <Box sx={{ flexGrow: 1 }} />
        <Button variant="outlined" startIcon={<RefreshIcon />} onClick={loadData}>
          Actualiser
        </Button>
      </Box>

      <input
        type="file"
        accept=".pdf,.jpg,.jpeg,.png"
        ref={fileInputRef}
        style={{ display: "none" }}
        onChange={handleFileChange}
      />

      {loading ? (
        <Box sx={{ textAlign: "center", mt: 10 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell><strong>Client</strong></TableCell>
                <TableCell><strong>Type</strong></TableCell>
                <TableCell align="right"><strong>Montant</strong></TableCell>
                <TableCell><strong>Référence</strong></TableCell>
                <TableCell><strong>Encaissement prévu</strong></TableCell>
                <TableCell><strong>Statut</strong></TableCell>
                <TableCell><strong>Commandes couvertes</strong></TableCell>
                <TableCell><strong>Justificatif</strong></TableCell>
                <TableCell align="right" />
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} align="center">
                    Aucun instrument ne correspond à ce filtre.
                  </TableCell>
                </TableRow>
              )}
              {filtered.map((instrument) => {
                const overdue = isOverdue(instrument);
                const dueSoon = isDueSoon(instrument);
                return (
                  <TableRow key={instrument.id} hover>
                    <TableCell>{instrument.client.name}</TableCell>
                    <TableCell>{TYPE_LABELS[instrument.type]}</TableCell>
                    <TableCell align="right">{Number(instrument.amount).toFixed(2)} DT</TableCell>
                    <TableCell>{instrument.reference || "-"}</TableCell>
                    <TableCell>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                        {new Date(instrument.expected_date).toLocaleDateString("fr-FR")}
                        {overdue && (
                          <Tooltip title="Échéance dépassée">
                            <WarningAmberIcon fontSize="small" color="error" />
                          </Tooltip>
                        )}
                        {!overdue && dueSoon && (
                          <Tooltip title="À encaisser dans les 7 jours">
                            <WarningAmberIcon fontSize="small" color="warning" />
                          </Tooltip>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip size="small" label={STATUS_LABELS[instrument.status]} color={STATUS_COLORS[instrument.status]} />
                    </TableCell>
                    <TableCell>
                      {instrument.payments.length === 0 ? (
                        "-"
                      ) : (
                        <Tooltip
                          title={instrument.payments
                            .map((p) => `Commande #${p.order_id} (${p.order?.invoice_number ?? "sans facture"}) : ${Number(p.amount).toFixed(2)} DT`)
                            .join(" · ")}
                        >
                          <span>{instrument.payments.length} commande(s)</span>
                        </Tooltip>
                      )}
                    </TableCell>
                    <TableCell>
                      {uploadingId === instrument.id ? (
                        <CircularProgress size={16} />
                      ) : instrument.justificatif_url ? (
                        <Tooltip title="Voir le justificatif">
                          <IconButton
                            size="small"
                            component="a"
                            href={instrument.justificatif_url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <AttachFileIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      ) : (
                        <Tooltip title="Ajouter un justificatif">
                          <IconButton size="small" onClick={() => triggerUpload(instrument.id)}>
                            <UploadFileIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </TableCell>
                    <TableCell align="right">
                      {instrument.status === "PENDING" && (
                        <Box sx={{ display: "flex", gap: 0.5, justifyContent: "flex-end" }}>
                          <Tooltip title="Confirmer l'encaissement">
                            <IconButton size="small" color="success" onClick={() => setPendingConfirm(instrument)}>
                              <CheckCircleOutlineIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Marquer rejeté">
                            <IconButton size="small" color="error" onClick={() => setPendingReject(instrument)}>
                              <CancelOutlinedIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Supprimer (erreur de saisie)">
                            <IconButton size="small" onClick={() => setPendingDelete(instrument)}>
                              <DeleteOutlineIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Confirmation d'encaissement */}
      <Dialog open={!!pendingConfirm} onClose={() => setPendingConfirm(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Confirmer l&apos;encaissement ?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {pendingConfirm && (
              <>
                <strong>{Number(pendingConfirm.amount).toFixed(2)} DT</strong> ({TYPE_LABELS[pendingConfirm.type]}) du
                client <strong>{pendingConfirm.client.name}</strong> sera réparti automatiquement sur ses commandes
                impayées, de la plus ancienne à la plus récente, jusqu&apos;à épuisement du montant. Les commandes
                concernées passeront en payé (total) ou en paiement partiel selon ce qui reste.
              </>
            )}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPendingConfirm(null)} disabled={actionLoading}>
            Annuler
          </Button>
          <Button variant="contained" color="success" onClick={handleConfirm} disabled={actionLoading}>
            {actionLoading ? <CircularProgress size={20} /> : "Confirmer l'encaissement"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Rejet */}
      <Dialog open={!!pendingReject} onClose={() => setPendingReject(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Marquer ce moyen de paiement rejeté ?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Aucune commande n&apos;est affectée (rien n&apos;avait encore été appliqué). Cet instrument passe
            simplement en statut &laquo; Rejeté &raquo; dans l&apos;historique.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPendingReject(null)} disabled={actionLoading}>
            Annuler
          </Button>
          <Button variant="contained" color="error" onClick={handleReject} disabled={actionLoading}>
            {actionLoading ? <CircularProgress size={20} /> : "Marquer rejeté"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Suppression */}
      <Dialog open={!!pendingDelete} onClose={() => setPendingDelete(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Supprimer cette déclaration ?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            À utiliser uniquement en cas d&apos;erreur de saisie - aucune commande n&apos;est affectée par cette
            suppression.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPendingDelete(null)} disabled={actionLoading}>
            Annuler
          </Button>
          <Button variant="contained" color="error" onClick={handleDelete} disabled={actionLoading}>
            {actionLoading ? <CircularProgress size={20} /> : "Supprimer"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Résultat de la répartition */}
      <Dialog open={!!confirmResult} onClose={() => setConfirmResult(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Répartition appliquée</DialogTitle>
        <DialogContent>
          {confirmResult && (
            <>
              <Typography variant="body2" sx={{ mb: 1.5 }}>
                {Number(confirmResult.instrument.amount).toFixed(2)} DT réparti sur{" "}
                {confirmResult.result.allocations.length} commande(s) :
              </Typography>
              <Table size="small">
                <TableBody>
                  {confirmResult.result.allocations.map((a) => (
                    <TableRow key={a.order_id}>
                      <TableCell>Commande #{a.order_id}</TableCell>
                      <TableCell align="right">{a.amount.toFixed(2)} DT</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {confirmResult.result.unallocated > 0 && (
                <Typography variant="body2" color="warning.main" sx={{ mt: 1.5 }}>
                  {confirmResult.result.unallocated.toFixed(2)} DT n&apos;a pu être affecté à aucune commande (le
                  client n&apos;a pas/plus de commande impayée pour ce montant).
                </Typography>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmResult(null)}>Fermer</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbarOpen} autoHideDuration={3000} onClose={() => setSnackbarOpen(false)}>
        <SnackbarContent
          message={notifyMessage}
          sx={{ backgroundColor: notifyStatus === "error" ? "red" : "green" }}
        />
      </Snackbar>
    </Box>
  );
};

export default PaymentInstrumentsList;
