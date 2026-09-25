// utils/creditNoteTemplate.ts
//
// Avoir B2B (total ou partiel) - même système CSS que invoiceTemplate.ts
// (même en-tête, même bleu, même style de tableau/totaux) pour cohérence
// visuelle avec les factures B2B, mais contenu inspiré de l'avoir B2C
// (credit_template.html) : titre "Avoir", référence à la facture d'origine,
// pas de mention de paiement, pas de bloc signature (pas pertinent pour un
// avoir), pas de timbre fiscal (déjà posé sur la facture d'origine).

export type ClientB2B = {
  id: number;
  name: string;
  tax_identification_number?: string | null;
  address?: string | null;
  zip?: string | null;
  country?: string | null;
};

export type CreditLineItem = {
  name: string;
  quantity: number;
  price_ht: number;
  tva_rate: number;
};

const safe = (v: unknown): string =>
  v === null || v === undefined ? "" : String(v);

const round2 = (n: number) =>
  Math.round((Number(n) + Number.EPSILON) * 100) / 100;

export function generateCreditNoteHTML(
  client: ClientB2B | null,
  items: CreditLineItem[],
  creditNumber: string,
  creditDate: string,
  invoiceNumber: string | null | undefined,
  creditType: "TOTAL" | "PARTIAL"
): string {
  const name = safe(client?.name);
  const tax = safe(client?.tax_identification_number);
  const address = safe(client?.address);
  const zip = safe(client?.zip);
  const country = safe(client?.country);

  let totalHT = 0;
  items.forEach((item) => {
    totalHT += (Number(item.price_ht) || 0) * (Number(item.quantity) || 0);
  });

  // TVA fixe 19% (même règle que la facture B2B)
  const tva = totalHT * 0.19;
  const totalTTC = round2(totalHT + tva);

  const BLUE = "#3A63A8";

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
    /* Fix PDF: voir invoiceTemplate.ts - html2pdf ne peut couper proprement
       qu'entre <div> frères, jamais au milieu d'un <table>/<tr>. Tableau
       produits rendu ci-dessous en grille flex plutôt qu'en <table>. */
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

  <!-- CREDIT NOTE TITLE -->
  <div class="inv-block" style="text-align: right; margin-bottom: 35px;">
    <div style="color: ${BLUE}; font-size: 20px; font-weight: 700;">
      Avoir n°${safe(creditNumber)}
    </div>
    <div style="color:#444;">
      Date de l'avoir : <strong>${safe(creditDate)}</strong><br/>
      ${invoiceNumber ? `Associé à la facture n°${safe(invoiceNumber)}<br/>` : ""}
      Avoir ${creditType === "TOTAL" ? "total" : "partiel"}
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

    ${items
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

  <!-- TOTALS BOX -->
  <div class="inv-block" style="display:flex; justify-content:flex-end;">
    <div style="min-width: 260px;">
      <div style="display:flex; justify-content:space-between; padding:6px 0; border-bottom:1px solid #EEE;">
        <span>Total avoir HT</span>
        <strong>${round2(totalHT).toFixed(2)}</strong>
      </div>

      <div style="display:flex; justify-content:space-between; padding:6px 0; border-bottom:1px solid #EEE;">
        <span>TVA à 19%</span>
        <strong>${round2(tva).toFixed(2)}</strong>
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
        <span>Total avoir TTC</span>
        <span>${totalTTC.toFixed(2)}</span>
      </div>
    </div>
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
