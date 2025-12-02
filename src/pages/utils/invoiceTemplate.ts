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

const safe = (v: unknown): string =>
  v === null || v === undefined ? "" : String(v);

export function generateInvoiceHTML(
  client: ClientB2B | null,
  products: (SelectedProduct & { quantity: number })[],
  invoiceNumber: string,
  invoiceDate: string
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

  const tva = totalHT * 0.19;
  const totalTTC = totalHT + tva;

  // Bleu pro utilisé partout
  const BLUE = "#3A63A8";

  return `
<div style="
  font-family: Arial, sans-serif;
  width: 100%;
  max-width: 720px;
  margin: 0 auto;
  padding: 40px 30px 160px 30px; 
  font-size: 14px;
  color: #222;
  position: relative;
">

  <!-- HEADER -->
  <div style="display: flex; justify-content: space-between; margin-bottom: 45px;">

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
  <div style="text-align: right; margin-bottom: 35px;">
    <div style="color: ${BLUE}; font-size: 20px; font-weight: 700;">
      Facture n°${safe(invoiceNumber)}
    </div>
    <div style="color:#444;">
      Date de la facture : <strong>${safe(invoiceDate)}</strong>
    </div>
  </div>

  <!-- TABLE -->
  <table style="width:100%; border-collapse: collapse; margin-bottom: 40px;">
    <thead>
      <tr style="background: ${BLUE}; color:white;">
        <th style="padding: 10px; width: 40px; text-align:center;">N°</th>
        <th style="padding: 10px; text-align:left;">Désignation</th>
        <th style="padding: 10px; width: 60px; text-align:center;">Qté</th>
        <th style="padding: 10px; width: 80px; text-align:right;">PU HT</th>
        <th style="padding: 10px; width: 60px; text-align:center;">TVA</th>
        <th style="padding: 10px; width:100px; text-align:right;">Total TTC</th>
      </tr>
    </thead>

    <tbody>
      ${products
        .map((item, index) => {
          const qty = Number(item.quantity) || 0;
          const price = Number(item.price_ht) || 0;
          const tvaRate = Number(item.tva_rate) || 0;
          const lineHT = qty * price;
          const lineTTC = lineHT * (1 + tvaRate);

          return `
        <tr style="border-bottom:1px solid #DDD;">
          <td style="padding: 10px; text-align:center;">${index + 1}</td>
          <td style="padding: 10px;">${safe(item.name)}</td>
          <td style="padding: 10px; text-align:center;">${qty}</td>
          <td style="padding: 10px; text-align:right;">${price.toFixed(2)}</td>
          <td style="padding: 10px; text-align:center;">${(tvaRate * 100).toFixed(0)}%</td>
          <td style="padding: 10px; text-align:right;">${lineTTC.toFixed(2)}</td>
        </tr>`;
        })
        .join("")}
    </tbody>
  </table>

  <!-- PAYMENT INFO -->
  <div style="margin-bottom: 30px;">
    <strong>À régler en espèces ou par virement bancaire.</strong><br/>
    Paiement à réception.
  </div>

  <!-- TOTALS BOX -->
  <div style="display:flex; justify-content:flex-end;">
    <div style="min-width: 260px;">
      <div style="display:flex; justify-content:space-between; padding:6px 0; border-bottom:1px solid #EEE;">
        <span>Total HT</span>
        <strong>${totalHT.toFixed(2)}</strong>
      </div>

      <div style="display:flex; justify-content:space-between; padding:6px 0; border-bottom:1px solid #EEE;">
        <span>TVA à 19%</span>
        <strong>${tva.toFixed(2)}</strong>
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
        <span>Total TTC</span>
        <span>${totalTTC.toFixed(2)}</span>
      </div>
    </div>
  </div>

  <!-- FOOTER ALWAYS AT BOTTOM -->
  <div style="
  width: 100%;
  margin-top: 60px;
  padding-top: 15px;
  border-top: 1px solid #DDD;
  text-align: center;
  font-size: 12px;
  color: #555;
  page-break-inside: avoid;
">
  GB Distribution — 454, SARAYA EL MENZAH B4, 2037 EL MENZAH 7 BIS, Tunisie — 
  Téléphone : +216 52 546 103 — SARL — 1872451/G/B/M/000
</div>

</div>`;
}
