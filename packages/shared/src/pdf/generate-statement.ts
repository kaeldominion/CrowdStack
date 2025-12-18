import "server-only";

import puppeteer from "puppeteer";
import { uploadToStorage } from "../storage/upload";
import type { PayoutRun, PayoutLine, Promoter, Event } from "../types";

/**
 * Generate a payout statement PDF using Puppeteer
 */
export async function generatePayoutStatementPDF(
  payoutRun: PayoutRun,
  payoutLines: Array<PayoutLine & { promoter: Promoter }>,
  event: Event
): Promise<Buffer> {
  const html = generateStatementHTML(payoutRun, payoutLines, event);

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: "20mm",
        right: "15mm",
        bottom: "20mm",
        left: "15mm",
      },
    });

    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}

/**
 * Generate HTML template for payout statement
 */
function generateStatementHTML(
  payoutRun: PayoutRun,
  payoutLines: Array<PayoutLine & { promoter: Promoter }>,
  event: Event
): string {
  const totalAmount = payoutLines.reduce(
    (sum, line) => sum + Number(line.commission_amount),
    0
  );
  const totalCheckins = payoutLines.reduce(
    (sum, line) => sum + line.checkins_count,
    0
  );

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: Arial, sans-serif;
      font-size: 12px;
      line-height: 1.6;
      color: #333;
      margin: 0;
      padding: 20px;
    }
    .header {
      border-bottom: 2px solid #000;
      padding-bottom: 10px;
      margin-bottom: 20px;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
    }
    .header p {
      margin: 5px 0;
      color: #666;
    }
    .summary {
      background: #f5f5f5;
      padding: 15px;
      border-radius: 5px;
      margin-bottom: 20px;
    }
    .summary-row {
      display: flex;
      justify-content: space-between;
      margin: 5px 0;
    }
    .summary-label {
      font-weight: bold;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 20px;
    }
    th, td {
      border: 1px solid #ddd;
      padding: 8px;
      text-align: left;
    }
    th {
      background-color: #f2f2f2;
      font-weight: bold;
    }
    .total-row {
      font-weight: bold;
      background-color: #f9f9f9;
    }
    .footer {
      margin-top: 30px;
      padding-top: 10px;
      border-top: 1px solid #ddd;
      font-size: 10px;
      color: #666;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Payout Statement</h1>
    <p><strong>Event:</strong> ${event.name}</p>
    <p><strong>Generated:</strong> ${new Date(payoutRun.generated_at).toLocaleDateString()}</p>
  </div>

  <div class="summary">
    <div class="summary-row">
      <span class="summary-label">Total Promoters:</span>
      <span>${payoutLines.length}</span>
    </div>
    <div class="summary-row">
      <span class="summary-label">Total Check-ins:</span>
      <span>${totalCheckins}</span>
    </div>
    <div class="summary-row">
      <span class="summary-label">Total Payout:</span>
      <span>$${totalAmount.toFixed(2)}</span>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Promoter</th>
        <th>Check-ins</th>
        <th>Commission Amount</th>
      </tr>
    </thead>
    <tbody>
      ${payoutLines
        .map(
          (line) => `
        <tr>
          <td>${line.promoter.name}</td>
          <td>${line.checkins_count}</td>
          <td>$${Number(line.commission_amount).toFixed(2)}</td>
        </tr>
      `
        )
        .join("")}
      <tr class="total-row">
        <td>Total</td>
        <td>${totalCheckins}</td>
        <td>$${totalAmount.toFixed(2)}</td>
      </tr>
    </tbody>
  </table>

  <div class="footer">
    <p>This is an automated statement. For questions, please contact support.</p>
  </div>
</body>
</html>
  `;
}

/**
 * Generate and upload payout statement PDF to storage
 */
export async function generateAndUploadPayoutStatement(
  payoutRun: PayoutRun,
  payoutLines: Array<PayoutLine & { promoter: Promoter }>,
  event: Event
): Promise<string> {
  const pdfBuffer = await generatePayoutStatementPDF(
    payoutRun,
    payoutLines,
    event
  );

  const fileName = `payout-${payoutRun.event_id}-${payoutRun.id}.pdf`;
  const path = `statements/${fileName}`;

  await uploadToStorage("statements", path, pdfBuffer, "application/pdf");

  return path;
}

