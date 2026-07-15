// La retenue à la source n'est pas exigée par l'administration fiscale
// tunisienne pour les commandes dont le montant TTC est < 1000 DT.
export const WITHHOLDING_THRESHOLD_TTC = 1000;

export const isWithholdingExempt = (totalTTC: number): boolean =>
  totalTTC < WITHHOLDING_THRESHOLD_TTC;
