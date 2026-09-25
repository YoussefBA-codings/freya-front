import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  Box,
  Typography,
  TextField,
  Drawer,
  IconButton,
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
  Button,
  Chip,
  Divider,
  CircularProgress,
  Alert,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";

/* ======================================================
   🔵 TYPES
====================================================== */

export type ReleveMensuelStatus = "BROUILLON" | "ENVOYE" | "EN_VERIFICATION" | "VALIDE" | "REJETE" | "CORRIGE";
export type ChallengePrimeStatus = "EN_COURS" | "ENVOYE" | "VALIDE" | "PAYE" | "REJETE";

export const RELEVE_STATUS_LABELS: Record<ReleveMensuelStatus, string> = {
  BROUILLON: "Brouillon",
  ENVOYE: "Envoyé",
  EN_VERIFICATION: "En vérification",
  VALIDE: "Validé",
  REJETE: "Rejeté",
  CORRIGE: "Corrigé",
};

export const PRIME_STATUS_LABELS: Record<ChallengePrimeStatus, string> = {
  EN_COURS: "En cours",
  ENVOYE: "Envoyé",
  VALIDE: "Validé",
  PAYE: "Payé",
  REJETE: "Rejeté",
};

export const getReleveStatusColor = (s: ReleveMensuelStatus): "default" | "primary" | "success" | "error" | "warning" => {
  switch (s) {
    case "BROUILLON": return "default";
    case "ENVOYE": return "primary";
    case "EN_VERIFICATION": return "warning";
    case "VALIDE": return "success";
    case "REJETE": return "error";
    case "CORRIGE": return "warning";
  }
};

export const getPrimeStatusColor = (s: ChallengePrimeStatus): "default" | "primary" | "success" | "error" | "warning" => {
  switch (s) {
    case "EN_COURS": return "default";
    case "ENVOYE": return "primary";
    case "VALIDE": return "warning";
    case "PAYE": return "success";
    case "REJETE": return "error";
  }
};

export interface ReleveMensuelDetail {
  id: number;
  client_id: number;
  mois: number;
  annee: number;
  date_reception: string | null;
  transmis_par: string | null;
  saisi_par: string | null;
  commentaire: string | null;
  piece_jointe_url: string | null;
  statut: ReleveMensuelStatus;
  statut_prime: ChallengePrimeStatus;
  client: { id: number; name: string };
}

interface ProductB2B {
  id: number;
  name: string;
}

interface ReleveLigne {
  id: number;
  product_id: number;
  qte_vendue: number;
  prix_vente_moyen_reel: string | null;
  ca_realise: string | null;
  points_generes: string;
  qte_animation: number;
  qte_hors_animation: number;
  product: { id: number; name: string };
}

interface Vendeuse {
  id: number;
  name: string;
}

interface VendeuseLigne {
  id: number;
  releve_ligne_id: number;
  vendeuse_id: number;
  qte_vendue: number;
  qte_retournee: number;
  points_generes: string;
  vendeuse: { id: number; name: string };
}

interface Summary {
  total_unites: number;
  ca_total: number;
  total_points: number;
  qte_animation_total: number;
  qte_hors_animation_total: number;
  produit_le_plus_vendu: { name: string; quantite: number } | null;
  gamme_la_plus_vendue: { gamme: string; quantite: number } | null;
  evolution_ca_pct_vs_mois_precedent: number | null;
  evolution_unites_pct_vs_mois_precedent: number | null;
  ventes_animation_reelles: {
    nb_animations: number;
    qte_totale: number;
    ca_total: number;
    qte_restant_a_declarer: number;
  };
}

interface PrimeSummary {
  statut_prime: ChallengePrimeStatus;
  points_hors_animation: number;
  prime_dt: number;
}

const SectionCard: React.FC<{ title?: string; children: React.ReactNode }> = ({ title, children }) => (
  <Box sx={{ background: "grey.50", p: 2, borderRadius: 2, border: "1px solid", borderColor: "divider" }}>
    {title && (
      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5 }}>
        {title}
      </Typography>
    )}
    {children}
  </Box>
);

/* ======================================================
   🔵 COMPONENT
====================================================== */

interface ReleveMensuelDetailDrawerProps {
  releve: ReleveMensuelDetail | null;
  products: ProductB2B[];
  onClose: () => void;
  onUpdated: (updated: ReleveMensuelDetail) => void;
  onDeleted: (id: number) => void;
  onNotify: (message: string, status: "success" | "error") => void;
}

const ReleveMensuelDetailDrawer: React.FC<ReleveMensuelDetailDrawerProps> = ({
  releve,
  products,
  onClose,
  onUpdated,
  onDeleted,
  onNotify,
}) => {
  const [lignes, setLignes] = useState<ReleveLigne[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [primeSummary, setPrimeSummary] = useState<PrimeSummary | null>(null);
  const [vendeuses, setVendeuses] = useState<Vendeuse[]>([]);
  const [vendeuseLignesByLigne, setVendeuseLignesByLigne] = useState<Record<number, VendeuseLigne[]>>({});
  const [loadingSub, setLoadingSub] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);

  const [commentaire, setCommentaire] = useState("");
  const [transmisPar, setTransmisPar] = useState("");
  const [saisiPar, setSaisiPar] = useState("");

  const [newLigne, setNewLigne] = useState({ product_id: "", qte_vendue: "", prix: "" });
  const [expandedLigneId, setExpandedLigneId] = useState<number | null>(null);
  const [newVendeuseLigne, setNewVendeuseLigne] = useState({ vendeuse_id: "", qte_vendue: "", qte_retournee: "0" });

  const loadSub = async (r: ReleveMensuelDetail) => {
    setLoadingSub(true);
    try {
      const [lignesRes, summaryRes, primeRes, vendeusesRes] = await Promise.all([
        axios.get<ReleveLigne[]>(`${import.meta.env.VITE_API_URL}releve-mensuel-ligne/releve/${r.id}`),
        axios.get<Summary>(`${import.meta.env.VITE_API_URL}releve-mensuel/${r.id}/summary`),
        axios.get<PrimeSummary>(`${import.meta.env.VITE_API_URL}releve-mensuel/${r.id}/prime-summary`),
        axios.get<Vendeuse[]>(`${import.meta.env.VITE_API_URL}vendeuse/client/${r.client_id}`),
      ]);
      setLignes(lignesRes.data);
      setSummary(summaryRes.data);
      setPrimeSummary(primeRes.data);
      setVendeuses(vendeusesRes.data);

      const vlEntries = await Promise.all(
        lignesRes.data.map((l) =>
          axios
            .get<VendeuseLigne[]>(`${import.meta.env.VITE_API_URL}releve-mensuel-vendeuse-ligne/ligne/${l.id}`)
            .then((res) => [l.id, res.data] as const),
        ),
      );
      setVendeuseLignesByLigne(Object.fromEntries(vlEntries));
    } catch (error) {
      console.error("Failed to load relevé sub-resources:", error);
    } finally {
      setLoadingSub(false);
    }
  };

  useEffect(() => {
    if (!releve) return;
    setCommentaire(releve.commentaire ?? "");
    setTransmisPar(releve.transmis_par ?? "");
    setSaisiPar(releve.saisi_par ?? "");
    loadSub(releve);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [releve?.id]);

  const handleChangeStatus = async (statut: ReleveMensuelStatus) => {
    if (!releve) return;
    try {
      setSavingStatus(true);
      const res = await axios.patch<ReleveMensuelDetail>(
        `${import.meta.env.VITE_API_URL}releve-mensuel/${releve.id}/status`,
        { statut },
      );
      onUpdated(res.data);
      onNotify("Statut mis à jour.", "success");
    } catch {
      onNotify("Échec de la mise à jour du statut.", "error");
    } finally {
      setSavingStatus(false);
    }
  };

  const handleChangePrimeStatus = async (statut_prime: ChallengePrimeStatus) => {
    if (!releve) return;
    try {
      const res = await axios.patch<ReleveMensuelDetail>(
        `${import.meta.env.VITE_API_URL}releve-mensuel/${releve.id}/prime-status`,
        { statut_prime },
      );
      onUpdated(res.data);
      onNotify("Statut de la prime mis à jour.", "success");
    } catch {
      onNotify("Échec de la mise à jour.", "error");
    }
  };

  const handleSaveMeta = async () => {
    if (!releve) return;
    try {
      const res = await axios.put<ReleveMensuelDetail>(
        `${import.meta.env.VITE_API_URL}releve-mensuel/${releve.id}`,
        { commentaire, transmis_par: transmisPar, saisi_par: saisiPar },
      );
      onUpdated(res.data);
      onNotify("Relevé mis à jour.", "success");
    } catch {
      onNotify("Échec de la mise à jour.", "error");
    }
  };

  const handleDeleteReleve = async () => {
    if (!releve) return;
    if (!window.confirm(`Supprimer le relevé #${releve.id} (${releve.mois}/${releve.annee}) ?`)) return;
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL}releve-mensuel/${releve.id}`);
      onDeleted(releve.id);
      onNotify("Relevé supprimé.", "success");
    } catch {
      onNotify("Échec de la suppression.", "error");
    }
  };

  const handleAddLigne = async () => {
    if (!releve || !newLigne.product_id || !newLigne.qte_vendue) return;
    try {
      const res = await axios.post<{ warnings: string[] }>(
        `${import.meta.env.VITE_API_URL}releve-mensuel-ligne`,
        {
          releve_id: releve.id,
          product_id: Number(newLigne.product_id),
          qte_vendue: Number(newLigne.qte_vendue),
          prix_vente_moyen_reel: newLigne.prix ? Number(newLigne.prix) : undefined,
        },
      );
      setNewLigne({ product_id: "", qte_vendue: "", prix: "" });
      if (res.data.warnings?.length) {
        onNotify(res.data.warnings.join(" · "), "error");
      } else {
        onNotify("Ligne ajoutée.", "success");
      }
      loadSub(releve);
    } catch (error: any) {
      onNotify(error?.response?.data?.message || "Échec de l'ajout.", "error");
    }
  };

  const handleDeleteLigne = async (id: number) => {
    if (!releve) return;
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL}releve-mensuel-ligne/${id}`);
      loadSub(releve);
    } catch {
      onNotify("Échec de la suppression.", "error");
    }
  };

  const handleAddVendeuseLigne = async (ligneId: number) => {
    if (!releve || !newVendeuseLigne.vendeuse_id || !newVendeuseLigne.qte_vendue) return;
    try {
      const res = await axios.post<{ warnings: string[] }>(
        `${import.meta.env.VITE_API_URL}releve-mensuel-vendeuse-ligne`,
        {
          releve_ligne_id: ligneId,
          vendeuse_id: Number(newVendeuseLigne.vendeuse_id),
          qte_vendue: Number(newVendeuseLigne.qte_vendue),
          qte_retournee: Number(newVendeuseLigne.qte_retournee) || 0,
        },
      );
      setNewVendeuseLigne({ vendeuse_id: "", qte_vendue: "", qte_retournee: "0" });
      if (res.data.warnings?.length) {
        onNotify(res.data.warnings.join(" · "), "error");
      } else {
        onNotify("Répartition ajoutée.", "success");
      }
      loadSub(releve);
    } catch (error: any) {
      onNotify(error?.response?.data?.message || "Échec de l'ajout.", "error");
    }
  };

  const handleDeleteVendeuseLigne = async (id: number) => {
    if (!releve) return;
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL}releve-mensuel-vendeuse-ligne/${id}`);
      loadSub(releve);
    } catch {
      onNotify("Échec de la suppression.", "error");
    }
  };

  const MOIS_LABELS = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"];

  return (
    <Drawer
      anchor="right"
      open={!!releve}
      onClose={onClose}
      sx={{ zIndex: (theme) => theme.zIndex.drawer + 2 }}
      PaperProps={{ sx: { width: { xs: "100vw", sm: 640 }, borderLeft: "1px solid", borderColor: "divider" } }}
    >
      <Box sx={{ height: "100vh", overflowY: "auto", p: 3, display: "flex", flexDirection: "column", gap: 3 }}>
        <Box
          sx={{
            position: "sticky",
            top: 0,
            backgroundColor: "background.paper",
            zIndex: 10,
            pb: 2,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderBottom: "1px solid",
            borderColor: "divider",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Relevé {releve ? `${MOIS_LABELS[releve.mois - 1]} ${releve.annee}` : ""}
            </Typography>
            {releve && (
              <>
                <FormControl size="small" variant="standard">
                  <Select
                    disableUnderline
                    value={releve.statut}
                    disabled={savingStatus}
                    onChange={(e: SelectChangeEvent<ReleveMensuelStatus>) => handleChangeStatus(e.target.value as ReleveMensuelStatus)}
                    renderValue={(value) => (
                      <Chip size="small" label={RELEVE_STATUS_LABELS[value as ReleveMensuelStatus]} color={getReleveStatusColor(value as ReleveMensuelStatus)} />
                    )}
                  >
                    {(Object.keys(RELEVE_STATUS_LABELS) as ReleveMensuelStatus[]).map((s) => (
                      <MenuItem key={s} value={s}>{RELEVE_STATUS_LABELS[s]}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl size="small" variant="standard">
                  <Select
                    disableUnderline
                    value={releve.statut_prime}
                    onChange={(e: SelectChangeEvent<ChallengePrimeStatus>) => handleChangePrimeStatus(e.target.value as ChallengePrimeStatus)}
                    renderValue={(value) => (
                      <Chip size="small" variant="outlined" label={`Prime : ${PRIME_STATUS_LABELS[value as ChallengePrimeStatus]}`} color={getPrimeStatusColor(value as ChallengePrimeStatus)} />
                    )}
                  >
                    {(Object.keys(PRIME_STATUS_LABELS) as ChallengePrimeStatus[]).map((s) => (
                      <MenuItem key={s} value={s}>{PRIME_STATUS_LABELS[s]}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </>
            )}
          </Box>
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>

        {releve && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <SectionCard title="Informations">
              <Typography variant="body2" sx={{ mb: 1.5 }}>
                <strong>Point de vente :</strong> {releve.client.name}
              </Typography>
              <TextField fullWidth size="small" label="Transmis par" value={transmisPar} onChange={(e) => setTransmisPar(e.target.value)} sx={{ mb: 1.5 }} />
              <TextField fullWidth size="small" label="Saisi par" value={saisiPar} onChange={(e) => setSaisiPar(e.target.value)} sx={{ mb: 1.5 }} />
              <TextField fullWidth size="small" multiline minRows={2} label="Commentaire" value={commentaire} onChange={(e) => setCommentaire(e.target.value)} sx={{ mb: 1.5 }} />
              <Button variant="outlined" size="small" onClick={handleSaveMeta}>Enregistrer</Button>
            </SectionCard>

            {loadingSub ? (
              <Box sx={{ textAlign: "center", py: 3 }}>
                <CircularProgress size={24} />
              </Box>
            ) : (
              <>
                {summary && primeSummary && (
                  <>
                    {summary.ventes_animation_reelles.nb_animations > 0 && (
                      <Alert severity={summary.ventes_animation_reelles.qte_restant_a_declarer > 0 ? "warning" : "success"}>
                        {summary.ventes_animation_reelles.nb_animations} animation(s) réelle(s) ce mois pour ce
                        client : {summary.ventes_animation_reelles.qte_totale} unité(s) vendues,{" "}
                        {summary.ventes_animation_reelles.ca_total.toFixed(2)} DT de CA.
                        {summary.ventes_animation_reelles.qte_restant_a_declarer > 0 ? (
                          <> Il reste <strong>{summary.ventes_animation_reelles.qte_restant_a_declarer}</strong> unité(s)
                          à déclarer dans les lignes de ce relevé (ajoute une ligne par produit ci-dessous).</>
                        ) : (
                          <> Entièrement reflété dans les lignes de ce relevé.</>
                        )}
                      </Alert>
                    )}

                    <SectionCard title="Résumé">
                      <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1 }}>
                        <Typography variant="body2">Unités : <strong>{summary.total_unites}</strong></Typography>
                        <Typography variant="body2">CA total : <strong>{summary.ca_total.toFixed(2)} DT</strong></Typography>
                        <Typography variant="body2">Points totaux : <strong>{summary.total_points}</strong></Typography>
                        <Typography variant="body2">Prime hors-animation : <strong>{primeSummary.prime_dt.toFixed(2)} DT</strong></Typography>
                        {summary.produit_le_plus_vendu && (
                          <Typography variant="body2">Plus vendu : <strong>{summary.produit_le_plus_vendu.name}</strong></Typography>
                        )}
                      </Box>
                      {summary.evolution_ca_pct_vs_mois_precedent != null && (
                        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
                          Évolution vs mois précédent : CA {summary.evolution_ca_pct_vs_mois_precedent > 0 ? "+" : ""}{summary.evolution_ca_pct_vs_mois_precedent}% · Unités {summary.evolution_unites_pct_vs_mois_precedent! > 0 ? "+" : ""}{summary.evolution_unites_pct_vs_mois_precedent}%
                        </Typography>
                      )}
                    </SectionCard>
                  </>
                )}

                <SectionCard title={`Lignes produit (${lignes.length})`}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
                    Saisis le total du mois (animation comprise, tel que reçu du point de vente) - la part
                    "Qté animation" est reprise automatiquement des ventes déjà enregistrées sur les animations,
                    jamais à ressaisir.
                  </Typography>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Produit</TableCell>
                          <TableCell align="right">Qté totale</TableCell>
                          <TableCell align="right">dont Qté animation</TableCell>
                          <TableCell align="right">Points</TableCell>
                          <TableCell />
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {lignes.map((l) => (
                          <React.Fragment key={l.id}>
                            <TableRow hover sx={{ cursor: "pointer" }} onClick={() => setExpandedLigneId(expandedLigneId === l.id ? null : l.id)}>
                              <TableCell>{l.product.name}</TableCell>
                              <TableCell align="right">{l.qte_vendue}</TableCell>
                              <TableCell align="right">{l.qte_animation}</TableCell>
                              <TableCell align="right">{Number(l.points_generes).toFixed(1)}</TableCell>
                              <TableCell>
                                <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleDeleteLigne(l.id); }}>
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </TableCell>
                            </TableRow>
                            {expandedLigneId === l.id && (
                              <TableRow>
                                <TableCell colSpan={5} sx={{ background: "background.paper" }}>
                                  <Typography variant="caption" sx={{ fontWeight: 600, display: "block", mb: 1 }}>
                                    Répartition par vendeuse
                                  </Typography>
                                  <Table size="small">
                                    <TableBody>
                                      {(vendeuseLignesByLigne[l.id] ?? []).map((vl) => (
                                        <TableRow key={vl.id}>
                                          <TableCell>{vl.vendeuse.name}</TableCell>
                                          <TableCell align="right">{vl.qte_vendue} vendues / {vl.qte_retournee} retournées</TableCell>
                                          <TableCell align="right">{Number(vl.points_generes).toFixed(1)} pts</TableCell>
                                          <TableCell>
                                            <IconButton size="small" onClick={() => handleDeleteVendeuseLigne(vl.id)}>
                                              <DeleteIcon fontSize="small" />
                                            </IconButton>
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                  <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", alignItems: "center", mt: 1 }}>
                                    <FormControl size="small" sx={{ minWidth: 130 }}>
                                      <InputLabel>Vendeuse</InputLabel>
                                      <Select
                                        label="Vendeuse"
                                        value={newVendeuseLigne.vendeuse_id}
                                        onChange={(e) => setNewVendeuseLigne({ ...newVendeuseLigne, vendeuse_id: e.target.value })}
                                      >
                                        {vendeuses.map((v) => (
                                          <MenuItem key={v.id} value={v.id}>{v.name}</MenuItem>
                                        ))}
                                      </Select>
                                    </FormControl>
                                    <TextField
                                      size="small"
                                      label="Qté vendue"
                                      type="number"
                                      sx={{ width: 100 }}
                                      value={newVendeuseLigne.qte_vendue}
                                      onChange={(e) => setNewVendeuseLigne({ ...newVendeuseLigne, qte_vendue: e.target.value })}
                                    />
                                    <TextField
                                      size="small"
                                      label="Retournée"
                                      type="number"
                                      sx={{ width: 90 }}
                                      value={newVendeuseLigne.qte_retournee}
                                      onChange={(e) => setNewVendeuseLigne({ ...newVendeuseLigne, qte_retournee: e.target.value })}
                                    />
                                    <IconButton color="primary" onClick={() => handleAddVendeuseLigne(l.id)}>
                                      <AddIcon />
                                    </IconButton>
                                  </Box>
                                </TableCell>
                              </TableRow>
                            )}
                          </React.Fragment>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                  <Divider sx={{ my: 1.5 }} />
                  <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", alignItems: "center" }}>
                    <FormControl size="small" sx={{ minWidth: 160 }}>
                      <InputLabel>Produit</InputLabel>
                      <Select
                        label="Produit"
                        value={newLigne.product_id}
                        onChange={(e) => setNewLigne({ ...newLigne, product_id: e.target.value })}
                      >
                        {products.map((p) => (
                          <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <TextField size="small" label="Qté vendue" type="number" sx={{ width: 100 }} value={newLigne.qte_vendue} onChange={(e) => setNewLigne({ ...newLigne, qte_vendue: e.target.value })} />
                    <TextField size="small" label="PV moyen" type="number" sx={{ width: 100 }} value={newLigne.prix} onChange={(e) => setNewLigne({ ...newLigne, prix: e.target.value })} />
                    <IconButton color="primary" onClick={handleAddLigne}>
                      <AddIcon />
                    </IconButton>
                  </Box>
                </SectionCard>
              </>
            )}

            <Button color="error" variant="outlined" onClick={handleDeleteReleve}>
              Supprimer ce relevé
            </Button>
          </Box>
        )}
      </Box>
    </Drawer>
  );
};

export default ReleveMensuelDetailDrawer;
