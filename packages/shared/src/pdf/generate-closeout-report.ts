import "server-only";

import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";

interface PromoterData {
  promoter_id: string;
  promoter_name: string;
  checkins_count: number;
  actual_checkins_count: number;
  manual_checkins_override: number | null;
  manual_checkins_reason: string | null;
  calculated_payout: number;
  manual_adjustment_amount: number | null;
  manual_adjustment_reason: string | null;
  final_payout: number;
}

interface AttendeeData {
  name: string;
  checked_in_at: string;
}

interface PromoterWithAttendees extends PromoterData {
  attendees: AttendeeData[];
}

interface CloseoutReportData {
  event_id: string;
  event_name: string;
  event_date?: string;
  currency: string;
  total_checkins: number;
  total_payout: number;
  promoters: PromoterWithAttendees[];
  generated_at: Date;
}

/**
 * Generate a closeout report PDF using Puppeteer
 */
export async function generateCloseoutReportPDF(
  data: CloseoutReportData
): Promise<Buffer> {
  const html = generateReportHTML(data);

  // Use @sparticuz/chromium for Vercel serverless environments
  const browser = await puppeteer.launch({
    args: chromium.args,
    executablePath: await chromium.executablePath(),
    headless: true,
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: "15mm",
        right: "15mm",
        bottom: "15mm",
        left: "15mm",
      },
    });

    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}

/**
 * Generate HTML template for closeout report with CrowdStack branding
 */
function generateReportHTML(data: CloseoutReportData): string {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: data.currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Generate promoter breakdown rows
  const promoterRows = data.promoters
    .map((p) => {
      const hasOverride = p.manual_checkins_override !== null;
      const hasAdjustment = p.manual_adjustment_amount !== null && p.manual_adjustment_amount !== 0;

      let checkinDisplay = `${p.checkins_count}`;
      if (hasOverride) {
        checkinDisplay = `${p.checkins_count} <span class="override-note">(actual: ${p.actual_checkins_count})</span>`;
      }

      let notes = [];
      if (hasOverride && p.manual_checkins_reason) {
        notes.push(`Override: ${p.manual_checkins_reason}`);
      }
      if (hasAdjustment && p.manual_adjustment_reason) {
        const sign = (p.manual_adjustment_amount || 0) > 0 ? "+" : "";
        notes.push(`Adjustment ${sign}${formatCurrency(p.manual_adjustment_amount || 0)}: ${p.manual_adjustment_reason}`);
      }

      return `
        <tr>
          <td>${p.promoter_name}</td>
          <td class="center">${checkinDisplay}</td>
          <td class="right">${formatCurrency(p.calculated_payout)}</td>
          <td class="right ${hasAdjustment ? 'has-adjustment' : ''}">${hasAdjustment ? formatCurrency(p.manual_adjustment_amount || 0) : '-'}</td>
          <td class="right bold">${formatCurrency(p.final_payout)}</td>
        </tr>
        ${notes.length > 0 ? `
        <tr class="notes-row">
          <td colspan="5" class="notes-cell">${notes.join(' | ')}</td>
        </tr>
        ` : ''}
      `;
    })
    .join("");

  // Generate attendee sections (grouped by promoter)
  const attendeeSections = data.promoters
    .filter((p) => p.attendees.length > 0)
    .map((p) => {
      const attendeeRows = p.attendees
        .map((a) => `
          <tr>
            <td>${a.name}</td>
            <td class="right timestamp">${formatDateTime(a.checked_in_at)}</td>
          </tr>
        `)
        .join("");

      return `
        <div class="attendee-section">
          <h4>${p.promoter_name} <span class="count">(${p.attendees.length} check-in${p.attendees.length !== 1 ? 's' : ''})</span></h4>
          <table class="attendee-table">
            <thead>
              <tr>
                <th>Attendee Name</th>
                <th class="right">Check-in Time</th>
              </tr>
            </thead>
            <tbody>
              ${attendeeRows}
            </tbody>
          </table>
        </div>
      `;
    })
    .join("");

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * {
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      font-size: 11px;
      line-height: 1.5;
      color: #1a1a1a;
      margin: 0;
      padding: 0;
      background: #fff;
    }

    /* Header with branding */
    .header {
      background: linear-gradient(135deg, #A855F7 0%, #7C3AED 100%);
      color: white;
      padding: 24px 30px;
      margin: -15mm -15mm 20px -15mm;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .header-left h1 {
      margin: 0 0 4px 0;
      font-size: 22px;
      font-weight: 700;
      letter-spacing: -0.5px;
    }
    .header-left p {
      margin: 0;
      font-size: 12px;
      opacity: 0.9;
    }
    .logo {
      font-size: 20px;
      font-weight: 800;
      letter-spacing: -0.5px;
    }
    .logo-crowd {
      color: #fff;
    }
    .logo-stack {
      color: #E9D5FF;
    }

    /* Event info */
    .event-info {
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      border-radius: 8px;
      padding: 16px 20px;
      margin-bottom: 20px;
    }
    .event-info h2 {
      margin: 0 0 8px 0;
      font-size: 16px;
      color: #0F172A;
    }
    .event-meta {
      display: flex;
      gap: 24px;
      font-size: 11px;
      color: #64748B;
    }
    .event-meta span {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    /* Summary stats */
    .summary {
      display: flex;
      gap: 16px;
      margin-bottom: 24px;
    }
    .stat-card {
      flex: 1;
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      border-radius: 8px;
      padding: 16px;
      text-align: center;
    }
    .stat-card.primary {
      background: linear-gradient(135deg, #A855F7 0%, #7C3AED 100%);
      border: none;
      color: white;
    }
    .stat-value {
      font-size: 24px;
      font-weight: 700;
      color: #0F172A;
    }
    .stat-card.primary .stat-value {
      color: white;
    }
    .stat-label {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #64748B;
      margin-top: 4px;
    }
    .stat-card.primary .stat-label {
      color: #E9D5FF;
    }

    /* Section headers */
    .section-header {
      font-size: 13px;
      font-weight: 600;
      color: #0F172A;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin: 24px 0 12px 0;
      padding-bottom: 8px;
      border-bottom: 2px solid #A855F7;
    }

    /* Tables */
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 11px;
    }
    th {
      background: #F1F5F9;
      padding: 10px 12px;
      text-align: left;
      font-weight: 600;
      color: #475569;
      border-bottom: 2px solid #E2E8F0;
    }
    td {
      padding: 10px 12px;
      border-bottom: 1px solid #E2E8F0;
      color: #334155;
    }
    tr:last-child td {
      border-bottom: none;
    }
    .center { text-align: center; }
    .right { text-align: right; }
    .bold { font-weight: 600; }

    .override-note {
      font-size: 9px;
      color: #F59E0B;
      font-weight: 500;
    }
    .has-adjustment {
      color: #A855F7;
      font-weight: 500;
    }
    .notes-row td {
      padding: 4px 12px 10px 12px;
      border-bottom: 1px solid #E2E8F0;
    }
    .notes-cell {
      font-size: 9px;
      color: #64748B;
      font-style: italic;
    }

    /* Total row */
    .total-row td {
      background: #F8FAFC;
      font-weight: 700;
      color: #0F172A;
      border-top: 2px solid #E2E8F0;
      border-bottom: none;
    }

    /* Attendee sections */
    .attendees-container {
      margin-top: 24px;
    }
    .attendee-section {
      margin-bottom: 20px;
      page-break-inside: avoid;
    }
    .attendee-section h4 {
      font-size: 12px;
      font-weight: 600;
      color: #0F172A;
      margin: 0 0 8px 0;
      padding: 8px 12px;
      background: #F1F5F9;
      border-radius: 6px;
    }
    .attendee-section h4 .count {
      font-weight: 400;
      color: #64748B;
    }
    .attendee-table {
      font-size: 10px;
    }
    .attendee-table th {
      padding: 6px 12px;
      font-size: 9px;
    }
    .attendee-table td {
      padding: 6px 12px;
    }
    .timestamp {
      color: #64748B;
      font-size: 10px;
    }

    /* Privacy notice */
    .privacy-notice {
      margin-top: 16px;
      padding: 12px 16px;
      background: #FEF3C7;
      border: 1px solid #FCD34D;
      border-radius: 6px;
      font-size: 10px;
      color: #92400E;
    }

    /* Footer */
    .footer {
      margin-top: 30px;
      padding-top: 16px;
      border-top: 1px solid #E2E8F0;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 9px;
      color: #94A3B8;
    }
    .footer-brand {
      font-weight: 600;
      color: #64748B;
    }

    @media print {
      .attendee-section {
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-left">
      <h1>Event Closeout Report</h1>
      <p>Generated ${formatDate(data.generated_at)}</p>
    </div>
    <div class="logo">
      <span class="logo-crowd">Crowd</span><span class="logo-stack">Stack</span>
    </div>
  </div>

  <div class="event-info">
    <h2>${data.event_name}</h2>
    <div class="event-meta">
      <span><strong>Event ID:</strong> ${data.event_id.slice(0, 8)}...</span>
      <span><strong>Currency:</strong> ${data.currency}</span>
      ${data.event_date ? `<span><strong>Date:</strong> ${data.event_date}</span>` : ''}
    </div>
  </div>

  <div class="summary">
    <div class="stat-card">
      <div class="stat-value">${data.total_checkins}</div>
      <div class="stat-label">Total Check-ins</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${data.promoters.length}</div>
      <div class="stat-label">Promoters</div>
    </div>
    <div class="stat-card primary">
      <div class="stat-value">${formatCurrency(data.total_payout)}</div>
      <div class="stat-label">Total Payout</div>
    </div>
  </div>

  <div class="section-header">Promoter Breakdown</div>
  <table>
    <thead>
      <tr>
        <th>Promoter</th>
        <th class="center">Check-ins</th>
        <th class="right">Calculated</th>
        <th class="right">Adjustment</th>
        <th class="right">Final Payout</th>
      </tr>
    </thead>
    <tbody>
      ${promoterRows}
      <tr class="total-row">
        <td>Total</td>
        <td class="center">${data.total_checkins}</td>
        <td class="right">-</td>
        <td class="right">-</td>
        <td class="right">${formatCurrency(data.total_payout)}</td>
      </tr>
    </tbody>
  </table>

  ${data.promoters.some(p => p.attendees.length > 0) ? `
  <div class="attendees-container">
    <div class="section-header">Checked-in Attendees</div>
    <div class="privacy-notice">
      <strong>Privacy Notice:</strong> Contact information (email, phone) has been redacted from this report for data protection purposes.
    </div>
    ${attendeeSections}
  </div>
  ` : ''}

  <div class="footer">
    <div class="footer-brand">Generated by CrowdStack</div>
    <div>crowdstack.app</div>
  </div>
</body>
</html>
  `;
}

export type { CloseoutReportData, PromoterWithAttendees, AttendeeData };
