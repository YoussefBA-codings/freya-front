// utils/invoiceTemplate.ts

export type ClientB2B = {
  id: number;
  name: string;
  tax_identification_number?: string;
  address?: string;
  zip?: string;
  country?: string;

  responsable_name?: string | null;
  responsable_phone?: string | null;
  responsable_email?: string | null;
};

export type SelectedProduct = {
  name: string;
  variant_id: string;
  price_ht: number;
  tva_rate: number;
};

export type FixedPromotionLine = {
  title?: string;   // ✅ optionnel (facture only)
  amount: number;   // ✅ TTC
};

export type PromotionBreakdown = {
  totalPromoAmount: number; // ✅ somme finale (fixes + pallier)
  promoFixedAmount?: number; // ✅ optionnel (total fixes)
  fixedPromotions?: FixedPromotionLine[]; // ✅ NEW (plusieurs lignes)
  tierRate?: 0 | 0.03 | 0.04 | 0.06; // optionnel (affichage)
  promoTierAmount?: number; // optionnel (affichage)
};

const safe = (v: unknown): string =>
  v === null || v === undefined ? "" : String(v);

const round2 = (n: number) =>
  Math.round((Number(n) + Number.EPSILON) * 100) / 100;

const clamp0 = (n: number) =>
  Number.isFinite(n) ? Math.max(0, n) : 0;

export function generateInvoiceHTML(
  client: ClientB2B | null,
  products: (SelectedProduct & { quantity: number })[],
  invoiceNumber: string,
  invoiceDate: string,
  promotion?: PromotionBreakdown | null
): string {
  const name = safe(client?.name);
  const tax = safe(client?.tax_identification_number);
  const address = safe(client?.address);
  const zip = safe(client?.zip);
  const country = safe(client?.country);

  let totalHT = 0;
  products.forEach((item) => {
    totalHT += (Number(item.price_ht) || 0) * (Number(item.quantity) || 0);
  });

  // TVA fixe 19%
  const tva = totalHT * 0.19;
  const totalTTCBeforePromo = totalHT + tva;

  // ✅ total promo (somme) + cap
  const promoTotalRaw = clamp0(Number(promotion?.totalPromoAmount ?? 0));
  const appliedPromo = Math.min(promoTotalRaw, totalTTCBeforePromo);
  const totalTTCBeforeStamp = Math.max(0, totalTTCBeforePromo - appliedPromo);

  // ✅ Timbre fiscal (fixe 1 DT / facture)
  const TIMBRE_FISCAL = 1;
  const timbreFiscal = round2(clamp0(TIMBRE_FISCAL));
  const totalTTC = round2(totalTTCBeforeStamp + timbreFiscal);

  // ✅ détails optionnels (affichage)
  const promoFixed = clamp0(Number(promotion?.promoFixedAmount ?? 0));
  const promoTier = clamp0(Number(promotion?.promoTierAmount ?? 0));
  const tierRate = promotion?.tierRate ?? 0;

  const fixedPromotions: FixedPromotionLine[] = Array.isArray(
    promotion?.fixedPromotions
  )
    ? promotion!.fixedPromotions!
        .map((p) => ({
          title: safe(p.title).trim(),
          amount: round2(clamp0(Number(p.amount ?? 0))),
        }))
        .filter((p) => p.amount > 0)
    : [];

  const BLUE = "#3A63A8";
  const showPromo = appliedPromo > 0;

  // ✅ Lignes détaillées promos fixes (multiples)
  const fixedPromoLinesHtml =
    fixedPromotions.length > 0
      ? fixedPromotions
          .map(
            (p) =>
              `<div>• ${p.title ? `Promo fixe (${safe(p.title)})` : "Promo fixe"} : -${p.amount.toFixed(
                2
              )}</div>`
          )
          .join("")
      : "";

  const tierPromoLineHtml =
    promoTier > 0
      ? `<div>• Promo pallier (${(tierRate * 100).toFixed(
          0
        )}%) : -${round2(promoTier).toFixed(2)}</div>`
      : "";

  // ✅ Détails sous la ligne "Promotion"
  const promoDetails =
    showPromo && (fixedPromotions.length > 0 || promoTier > 0 || promoFixed > 0)
      ? `
        <div style="margin-top:6px; font-size:12px; color:#666; line-height:1.4;">
          ${
            fixedPromoLinesHtml ||
            (promoFixed > 0
              ? `<div>• Promo fixe : -${round2(promoFixed).toFixed(2)}</div>`
              : "")
          }
          ${tierPromoLineHtml}
        </div>
      `
      : "";

  // ✅ Si pas de promo => rien n'apparait
  const promoRow = showPromo
    ? `
      <div style="display:flex; justify-content:space-between; padding:6px 0; border-bottom:1px solid #EEE;">
        <span>Promotion</span>
        <strong>-${appliedPromo.toFixed(2)}</strong>
      </div>
      ${promoDetails}
    `
    : "";

  return `
<div style="
  font-family: Arial, sans-serif;
  width: 100%;
  max-width: 720px;
  margin: 0 auto;
  padding: 40px 30px 40px 30px; 
  font-size: 14px;
  color: #222;
  position: relative;
">

  <style>
    /* Fix PDF: html2pdf/html2canvas rasterise le document puis découpe le
       canvas en pages - le mode "css" de html2pdf ne sait insérer une
       coupure propre qu'entre des <div> frères, pas au milieu d'un
       <table>/<tr> (comportement documenté de html2pdf.js). D'où le
       tableau produits ci-dessous rendu en <div> (grille flex) plutôt
       qu'en vrai <table> : chaque ligne peut alors être poussée en entier
       sur la page suivante au lieu d'être tranchée en deux. */
    .inv-row, .inv-block {
      page-break-inside: avoid;
      break-inside: avoid;
    }
    @media print {
      .inv-row, .inv-block {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
    }
  </style>

  <!-- HEADER -->
  <div class="inv-block" style="display: flex; justify-content: space-between; margin-bottom: 45px;">

    <div>
      <div style="font-size: 28px; font-weight: 700; letter-spacing: -0.3px;">GB Distribution</div>
      <div style="margin-top: 8px; line-height: 1.4;">
        454, SARAYA EL MENZAH B4<br/>
        2037 EL MENZAH 7 BIS<br/>
        Tunisie
      </div>
    </div>

    <div style="text-align: right; max-width: 260px;">
      <div style="font-size: 20px; font-weight: 600;">${name}</div>
      <div style="margin-top: 5px; line-height: 1.4; color:#444;">
        ${tax}<br/>
        ${address}<br/>
        ${zip} ${country}
      </div>
    </div>
  </div>

  <!-- INVOICE TITLE -->
  <div class="inv-block" style="text-align: right; margin-bottom: 35px;">
    <div style="color: ${BLUE}; font-size: 20px; font-weight: 700;">
      Facture / Bon de livraison n°${safe(invoiceNumber)}
    </div>
    <div style="color:#444;">
      Date de la facture : <strong>${safe(invoiceDate)}</strong>
    </div>
  </div>

  <!-- TABLE (grille flex - voir commentaire de style ci-dessus) -->
  <div style="width:100%; margin-bottom: 40px;">
    <div class="inv-row" style="display:flex; background: ${BLUE}; color:white;">
      <div style="padding: 10px; width: 40px; text-align:center;">N°</div>
      <div style="padding: 10px; flex:1; text-align:left;">Désignation</div>
      <div style="padding: 10px; width: 60px; text-align:center;">Qté</div>
      <div style="padding: 10px; width: 80px; text-align:right;">PU HT</div>
      <div style="padding: 10px; width: 60px; text-align:center;">TVA</div>
      <div style="padding: 10px; width:100px; text-align:right;">Total TTC</div>
    </div>

    ${products
      .map((item, index) => {
        const qty = Number(item.quantity) || 0;
        const price = Number(item.price_ht) || 0;
        const tvaRate = Number(item.tva_rate) || 0;

        const lineHT = qty * price;
        const lineTTC = lineHT * (1 + tvaRate);

        return `
      <div class="inv-row" style="display:flex; border-bottom:1px solid #DDD;">
        <div style="padding: 10px; width: 40px; text-align:center;">${index + 1}</div>
        <div style="padding: 10px; flex:1;">${safe(item.name)}</div>
        <div style="padding: 10px; width: 60px; text-align:center;">${qty}</div>
        <div style="padding: 10px; width: 80px; text-align:right;">${price.toFixed(2)}</div>
        <div style="padding: 10px; width: 60px; text-align:center;">${(tvaRate * 100).toFixed(
          0
        )}%</div>
        <div style="padding: 10px; width:100px; text-align:right;">${lineTTC.toFixed(2)}</div>
      </div>`;
      })
      .join("")}
  </div>

  <!-- PAYMENT INFO -->
  <div class="inv-block" style="margin-bottom: 30px;">
    <strong>À régler en espèces ou par virement bancaire.</strong><br/>
    Paiement à réception.
  </div>

  <!-- TOTALS BOX -->
  <div class="inv-block" style="display:flex; justify-content:flex-end;">
    <div style="min-width: 260px;">
      <div style="display:flex; justify-content:space-between; padding:6px 0; border-bottom:1px solid #EEE;">
        <span>Total HT</span>
        <strong>${round2(totalHT).toFixed(2)}</strong>
      </div>

      <div style="display:flex; justify-content:space-between; padding:6px 0; border-bottom:1px solid #EEE;">
        <span>TVA à 19%</span>
        <strong>${round2(tva).toFixed(2)}</strong>
      </div>

      ${promoRow}

      <!-- ✅ Timbre fiscal -->
      <div style="display:flex; justify-content:space-between; padding:6px 0; border-bottom:1px solid #EEE;">
        <span>Timbre fiscal</span>
        <strong>${timbreFiscal.toFixed(2)}</strong>
      </div>

      <div style="
        display:flex;
        justify-content:space-between;
        padding:10px;
        margin-top:8px;
        background:${BLUE};
        color:white;
        font-weight:700;
        font-size:16px;
      ">
        <span>Total TTC à payer</span>
        <span>${totalTTC.toFixed(2)}</span>
      </div>
    </div>
  </div>

  <!-- SIGNATURE CLIENT (reçu conforme) -->
  <div class="inv-block" style="margin-top: 50px;">
    <div style="color:#444; margin-bottom: 10px;">
      Reçu conforme le : ______________________
    </div>
    <div style="color:#444; margin-bottom: 10px;">
      Cachet et signature du client :
    </div>
    <div style="height: 70px; border: 1px solid #CCC; border-radius: 4px;"></div>
  </div>

  <!-- FOOTER -->
  <div class="inv-block" style="
  width: 100%;
  margin-top: 60px;
  padding-top: 15px;
  border-top: 1px solid #DDD;
  text-align: center;
  font-size: 12px;
  color: #555;
">
  GB Distribution — 454, SARAYA EL MENZAH B4, 2037 EL MENZAH 7 BIS, Tunisie —
  Téléphone : +216 52 546 103 — SARL — 1872451/G/B/M/000
</div>

</div>`;
}