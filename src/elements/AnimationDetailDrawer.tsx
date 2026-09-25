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
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";

/* ======================================================
   🔵 TYPES
====================================================== */

export type AnimationStatus = "PLANIFIEE" | "CONFIRMEE" | "REALISEE" | "ANNULEE" | "REPORTEE";

export const ANIMATION_STATUS_LABELS: Record<AnimationStatus, string> = {
  PLANIFIEE: "Planifiée",
  CONFIRMEE: "Confirmée",
  REALISEE: "Réalisée",
  ANNULEE: "Annulée",
  REPORTEE: "Reportée",
};

export const getAnimationStatusColor = (
  s: AnimationStatus,
): "default" | "primary" | "success" | "error" | "warning" => {
  switch (s) {
    case "PLANIFIEE":
      return "default";
    case "CONFIRMEE":
      return "primary";
    case "REALISEE":
      return "success";
    case "ANNULEE":
      return "error";
    case "REPORTEE":
      return "warning";
  }
};

export interface AnimationDetail {
  id: number;
  client_id: number;
  animatrice_id: number | null;
  date: string;
  heure_debut: string | null;
  heure_fin: string | null;
  responsable_freya: string | null;
  objectif_ventes: string | null;
  cout_animatrice: string | null;
  autres_depenses: string;
  statut: AnimationStatus;
  commentaire_avant: string | null;
  compte_rendu_apres: string | null;
  nb_clientes: number | null;
  client: { id: number; name: string };
  animatrice_ref: { id: number; name: string } | null;
}

interface ProductB2B {
  id: number;
  name: string;
  points_challenge: string;
}

interface Vendeuse {
  id: number;
  name: string;
}

interface Animatrice {
  id: number;
  name: string;
}

interface AnimationSaleItem {
  id: number;
  product_id: number;
  vendeuse_id: number | null;
  quantite: number;
  prix_vente_unitaire_reel: string;
  montant_total: string;
  points_challenge_generes: string;
  product: { id: number; name: string };
  vendeuse: { id: number; name: string } | null;
}

interface AnimationGift {
  id: number;
  product_id: number | null;
  description: string | null;
  quantite: number;
  product: { id: number; name: string } | null;
}

interface Performance {
  nb_total_produits_vendus: number;
  ca_total: number;
  nb_clientes: number | null;
  panier_moyen: number | null;
  moyenne_produits_par_cliente: number | null;
  produit_le_plus_vendu: { name: string; quantite: number } | null;
  gamme_la_plus_vendue: { gamme: string; quantite: number } | null;
  ecart_moyen_pv_reel_vs_ppr: number | null;
  nb_lignes_sans_ppr: number;
  cout_total_animation: number;
  ca_genere_par_dt_depense: number | null;
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

interface AnimationDetailDrawerProps {
  animation: AnimationDetail | null;
  products: ProductB2B[];
  onClose: () => void;
  onUpdated: (updated: AnimationDetail) => void;
  onDeleted: (id: number) => void;
  onNotify: (message: string, status: "success" | "error") => void;
}

const AnimationDetailDrawer: React.FC<AnimationDetailDrawerProps> = ({
  animation,
  products,
  onClose,
  onUpdated,
  onDeleted,
  onNotify,
}) => {
  const [saleItems, setSaleItems] = useState<AnimationSaleItem[]>([]);
  const [gifts, setGifts] = useState<AnimationGift[]>([]);
  const [performance, setPerformance] = useState<Performance | null>(null);
  const [vendeuses, setVendeuses] = useState<Vendeuse[]>([]);
  const [animatrices, setAnimatrices] = useState<Animatrice[]>([]);
  const [loadingSub, setLoadingSub] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);

  const [nbClientes, setNbClientes] = useState<string>("");
  const [commentaireAvant, setCommentaireAvant] = useState("");
  const [compteRenduApres, setCompteRenduApres] = useState("");
  const [autresDepenses, setAutresDepenses] = useState("0");

  const [newItem, setNewItem] = useState({ product_id: "", vendeuse_id: "", quantite: "1", prix: "" });
  const [newGift, setNewGift] = useState({ product_id: "", description: "", quantite: "1" });

  const loadSub = async (a: AnimationDetail) => {
    setLoadingSub(true);
    try {
      const [itemsRes, giftsRes, perfRes, vendeusesRes] = await Promise.all([
        axios.get<AnimationSaleItem[]>(`${import.meta.env.VITE_API_URL}animation-sale-item/animation/${a.id}`),
        axios.get<AnimationGift[]>(`${import.meta.env.VITE_API_URL}animation-gift/animation/${a.id}`),
        axios.get<Performance>(`${import.meta.env.VITE_API_URL}animation-sale-item/animation/${a.id}/performance`),
        axios.get<Vendeuse[]>(`${import.meta.env.VITE_API_URL}vendeuse/client/${a.client_id}`),
      ]);
      setSaleItems(itemsRes.data);
      setGifts(giftsRes.data);
      setPerformance(perfRes.data);
      setVendeuses(vendeusesRes.data);
    } catch (error) {
      console.error("Failed to load animation sub-resources:", error);
    } finally {
      setLoadingSub(false);
    }
  };

  useEffect(() => {
    if (!animation) return;
    setNbClientes(animation.nb_clientes != null ? String(animation.nb_clientes) : "");
    setCommentaireAvant(animation.commentaire_avant ?? "");
    setCompteRenduApres(animation.compte_rendu_apres ?? "");
    setAutresDepenses(animation.autres_depenses ?? "0");
    loadSub(animation);

    axios
      .get<Animatrice[]>(`${import.meta.env.VITE_API_URL}animatrice`)
      .then((res) => setAnimatrices(res.data))
      .catch(() => setAnimatrices([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animation?.id]);

  const handleChangeStatus = async (statut: AnimationStatus) => {
    if (!animation) return;
    try {
      setSavingStatus(true);
      const res = await axios.patch<AnimationDetail>(
        `${import.meta.env.VITE_API_URL}animation/${animation.id}/status`,
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

  const handleSaveMeta = async () => {
    if (!animation) return;
    try {
      const res = await axios.put<AnimationDetail & { warnings: string[] }>(
        `${import.meta.env.VITE_API_URL}animation/${animation.id}`,
        {
          nb_clientes: nbClientes ? Number(nbClientes) : undefined,
          commentaire_avant: commentaireAvant,
          compte_rendu_apres: compteRenduApres,
          autres_depenses: Number(autresDepenses) || 0,
        },
      );
      onUpdated(res.data);
      if (res.data.warnings?.length) {
        onNotify(res.data.warnings.join(" · "), "error");
      } else {
        onNotify("Animation mise à jour.", "success");
      }
      loadSub(res.data);
    } catch {
      onNotify("Échec de la mise à jour.", "error");
    }
  };

  const handleDeleteAnimation = async () => {
    if (!animation) return;
    if (!window.confirm(`Supprimer l'animation #${animation.id} ? Le crédit consommé (le cas échéant) sera restitué.`)) return;
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL}animation/${animation.id}`);
      onDeleted(animation.id);
      onNotify("Animation supprimée.", "success");
    } catch {
      onNotify("Échec de la suppression.", "error");
    }
  };

  const handleAddItem = async () => {
    if (!animation || !newItem.product_id || !newItem.quantite || !newItem.prix) return;
    try {
      await axios.post(`${import.meta.env.VITE_API_URL}animation-sale-item`, {
        animation_id: animation.id,
        product_id: Number(newItem.product_id),
        vendeuse_id: newItem.vendeuse_id ? Number(newItem.vendeuse_id) : undefined,
        quantite: Number(newItem.quantite),
        prix_vente_unitaire_reel: Number(newItem.prix),
      });
      setNewItem({ product_id: "", vendeuse_id: "", quantite: "1", prix: "" });
      onNotify("Vente ajoutée.", "success");
      loadSub(animation);
    } catch (error: any) {
      onNotify(error?.response?.data?.message || "Échec de l'ajout.", "error");
    }
  };

  const handleDeleteItem = async (id: number) => {
    if (!animation) return;
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL}animation-sale-item/${id}`);
      loadSub(animation);
    } catch {
      onNotify("Échec de la suppression.", "error");
    }
  };

  const handleAddGift = async () => {
    if (!animation || !newGift.quantite) return;
    try {
      await axios.post(`${import.meta.env.VITE_API_URL}animation-gift`, {
        animation_id: animation.id,
        product_id: newGift.product_id ? Number(newGift.product_id) : undefined,
        description: newGift.description || undefined,
        quantite: Number(newGift.quantite),
      });
      setNewGift({ product_id: "", description: "", quantite: "1" });
      onNotify("Cadeau ajouté.", "success");
      loadSub(animation);
    } catch (error: any) {
      onNotify(error?.response?.data?.message || "Échec de l'ajout.", "error");
    }
  };

  const handleDeleteGift = async (id: number) => {
    if (!animation) return;
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL}animation-gift/${id}`);
      loadSub(animation);
    } catch {
      onNotify("Échec de la suppression.", "error");
    }
  };

  return (
    <Drawer
      anchor="right"
      open={!!animation}
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
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Animation #{animation?.id}
            </Typography>
            {animation && (
              <FormControl size="small" variant="standard">
                <Select
                  disableUnderline
                  value={animation.statut}
                  disabled={savingStatus}
                  onChange={(e: SelectChangeEvent<AnimationStatus>) =>
                    handleChangeStatus(e.target.value as AnimationStatus)
                  }
                  renderValue={(value) => (
                    <Chip size="small" label={ANIMATION_STATUS_LABELS[value as AnimationStatus]} color={getAnimationStatusColor(value as AnimationStatus)} />
                  )}
                >
                  {(Object.keys(ANIMATION_STATUS_LABELS) as AnimationStatus[]).map((s) => (
                    <MenuItem key={s} value={s}>
                      {ANIMATION_STATUS_LABELS[s]}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
          </Box>
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>

        {animation && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <SectionCard title="Informations">
              <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5, mb: 1.5 }}>
                <Typography variant="body2">
                  <strong>Client :</strong> {animation.client.name}
                </Typography>
                <Typography variant="body2">
                  <strong>Date :</strong> {new Date(animation.date).toLocaleDateString()}
                </Typography>
              </Box>
              <FormControl fullWidth size="small" sx={{ mb: 1.5 }}>
                <InputLabel>Animatrice</InputLabel>
                <Select
                  label="Animatrice"
                  value={animation.animatrice_id ?? ""}
                  onChange={async (e) => {
                    const res = await axios.put<AnimationDetail>(
                      `${import.meta.env.VITE_API_URL}animation/${animation.id}`,
                      { animatrice_id: e.target.value ? Number(e.target.value) : undefined },
                    );
                    onUpdated(res.data);
                  }}
                >
                  <MenuItem value="">Aucune</MenuItem>
                  {animatrices.map((a) => (
                    <MenuItem key={a.id} value={a.id}>
                      {a.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                fullWidth
                size="small"
                label="Nombre de clientes"
                type="number"
                value={nbClientes}
                onChange={(e) => setNbClientes(e.target.value)}
                sx={{ mb: 1.5 }}
              />
              <TextField
                fullWidth
                size="small"
                label="Autres dépenses (DT)"
                type="number"
                value={autresDepenses}
                onChange={(e) => setAutresDepenses(e.target.value)}
                sx={{ mb: 1.5 }}
              />
              <TextField
                fullWidth
                size="small"
                multiline
                minRows={2}
                label="Commentaire avant"
                value={commentaireAvant}
                onChange={(e) => setCommentaireAvant(e.target.value)}
                sx={{ mb: 1.5 }}
              />
              <TextField
                fullWidth
                size="small"
                multiline
                minRows={2}
                label="Compte-rendu après"
                value={compteRenduApres}
                onChange={(e) => setCompteRenduApres(e.target.value)}
                sx={{ mb: 1.5 }}
              />
              <Button variant="outlined" size="small" onClick={handleSaveMeta}>
                Enregistrer
              </Button>
            </SectionCard>

            {loadingSub ? (
              <Box sx={{ textAlign: "center", py: 3 }}>
                <CircularProgress size={24} />
              </Box>
            ) : (
              <>
                {performance && (
                  <SectionCard title="Performance">
                    <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1 }}>
                      <Typography variant="body2">Produits vendus : <strong>{performance.nb_total_produits_vendus}</strong></Typography>
                      <Typography variant="body2">CA total : <strong>{performance.ca_total.toFixed(2)} DT</strong></Typography>
                      <Typography variant="body2">Panier moyen : <strong>{performance.panier_moyen != null ? `${performance.panier_moyen.toFixed(2)} DT` : "—"}</strong></Typography>
                      <Typography variant="body2">Produits/cliente : <strong>{performance.moyenne_produits_par_cliente ?? "—"}</strong></Typography>
                      <Typography variant="body2">Plus vendu : <strong>{performance.produit_le_plus_vendu?.name ?? "—"}</strong></Typography>
                      <Typography variant="body2">Gamme phare : <strong>{performance.gamme_la_plus_vendue?.gamme ?? "—"}</strong></Typography>
                      <Typography variant="body2">Coût total : <strong>{performance.cout_total_animation.toFixed(2)} DT</strong></Typography>
                      <Typography variant="body2">CA / DT dépensé : <strong>{performance.ca_genere_par_dt_depense?.toFixed(2) ?? "—"}</strong></Typography>
                    </Box>
                    {performance.nb_lignes_sans_ppr > 0 && (
                      <Typography variant="caption" color="warning.main" sx={{ display: "block", mt: 1 }}>
                        {performance.nb_lignes_sans_ppr} ligne(s) sans PPR renseigné - écart PV/PPR non calculable pour ces produits.
                      </Typography>
                    )}
                  </SectionCard>
                )}

                <SectionCard title={`Ventes produit par produit (${saleItems.length})`}>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Produit</TableCell>
                          <TableCell>Vendeuse</TableCell>
                          <TableCell align="right">Qté</TableCell>
                          <TableCell align="right">PV réel</TableCell>
                          <TableCell align="right">Total</TableCell>
                          <TableCell />
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {saleItems.map((it) => (
                          <TableRow key={it.id}>
                            <TableCell>{it.product.name}</TableCell>
                            <TableCell>{it.vendeuse?.name ?? "—"}</TableCell>
                            <TableCell align="right">{it.quantite}</TableCell>
                            <TableCell align="right">{Number(it.prix_vente_unitaire_reel).toFixed(2)}</TableCell>
                            <TableCell align="right">{Number(it.montant_total).toFixed(2)}</TableCell>
                            <TableCell>
                              <IconButton size="small" onClick={() => handleDeleteItem(it.id)}>
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </TableCell>
                          </TableRow>
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
                        value={newItem.product_id}
                        onChange={(e) => setNewItem({ ...newItem, product_id: e.target.value })}
                      >
                        {products.map((p) => (
                          <MenuItem key={p.id} value={p.id}>
                            {p.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <FormControl size="small" sx={{ minWidth: 130 }}>
                      <InputLabel>Vendeuse</InputLabel>
                      <Select
                        label="Vendeuse"
                        value={newItem.vendeuse_id}
                        onChange={(e) => setNewItem({ ...newItem, vendeuse_id: e.target.value })}
                      >
                        <MenuItem value="">Aucune</MenuItem>
                        {vendeuses.map((v) => (
                          <MenuItem key={v.id} value={v.id}>
                            {v.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <TextField
                      size="small"
                      label="Qté"
                      type="number"
                      sx={{ width: 80 }}
                      value={newItem.quantite}
                      onChange={(e) => setNewItem({ ...newItem, quantite: e.target.value })}
                    />
                    <TextField
                      size="small"
                      label="PV réel"
                      type="number"
                      sx={{ width: 100 }}
                      value={newItem.prix}
                      onChange={(e) => setNewItem({ ...newItem, prix: e.target.value })}
                    />
                    <IconButton color="primary" onClick={handleAddItem}>
                      <AddIcon />
                    </IconButton>
                  </Box>
                </SectionCard>

                <SectionCard title={`Cadeaux distribués (${gifts.length})`}>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Produit / description</TableCell>
                          <TableCell align="right">Qté</TableCell>
                          <TableCell />
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {gifts.map((g) => (
                          <TableRow key={g.id}>
                            <TableCell>{g.product?.name ?? g.description ?? "—"}</TableCell>
                            <TableCell align="right">{g.quantite}</TableCell>
                            <TableCell>
                              <IconButton size="small" onClick={() => handleDeleteGift(g.id)}>
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                  <Divider sx={{ my: 1.5 }} />
                  <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", alignItems: "center" }}>
                    <FormControl size="small" sx={{ minWidth: 160 }}>
                      <InputLabel>Produit catalogue</InputLabel>
                      <Select
                        label="Produit catalogue"
                        value={newGift.product_id}
                        onChange={(e) => setNewGift({ ...newGift, product_id: e.target.value })}
                      >
                        <MenuItem value="">Hors catalogue</MenuItem>
                        {products.map((p) => (
                          <MenuItem key={p.id} value={p.id}>
                            {p.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    {!newGift.product_id && (
                      <TextField
                        size="small"
                        label="Description"
                        value={newGift.description}
                        onChange={(e) => setNewGift({ ...newGift, description: e.target.value })}
                      />
                    )}
                    <TextField
                      size="small"
                      label="Qté"
                      type="number"
                      sx={{ width: 80 }}
                      value={newGift.quantite}
                      onChange={(e) => setNewGift({ ...newGift, quantite: e.target.value })}
                    />
                    <IconButton color="primary" onClick={handleAddGift}>
                      <AddIcon />
                    </IconButton>
                  </Box>
                </SectionCard>
              </>
            )}

            <Button color="error" variant="outlined" onClick={handleDeleteAnimation}>
              Supprimer cette animation
            </Button>
          </Box>
        )}
      </Box>
    </Drawer>
  );
};

export default AnimationDetailDrawer;
