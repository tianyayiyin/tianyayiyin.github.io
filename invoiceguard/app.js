const invoiceText = document.querySelector("#invoiceText");
const fileInput = document.querySelector("#fileInput");
const sampleBtn = document.querySelector("#sampleBtn");
const analyzeBtn = document.querySelector("#analyzeBtn");
const copyBtn = document.querySelector("#copyBtn");
const result = document.querySelector("#result");

const sample = `Invoice #INV-1042
Vendor: Northline Media LLC
Amount due: $1,240.00
Invoice date: 2026-04-22
Due date: 2026-05-06
Payment terms: Net 14

Email from vendor:
Please pay urgently today. We recently changed our bank details.
Use the new account in this email instead of the account on file.

Earlier invoice export:
INV-1042, Northline Media LLC, $1,120.00, due 2026-05-06, unpaid
INV-1038, Northline Media LLC, $980.00, paid

Client note:
No reminder has been sent yet.`;

function moneyValues(text) {
  const matches = text.match(/(?:\$|USD\s*)\s?\d{1,3}(?:,\d{3})*(?:\.\d{2})?|\b\d{2,}(?:,\d{3})*(?:\.\d{2})?\s?(?:usd|dollars)\b/gi) || [];
  return matches.map((item) => item.trim());
}

function invoiceNumbers(text) {
  const explicit = [...text.matchAll(/\b(?:invoice\s*#?|inv[-\s:]?)([a-z0-9-]{3,})\b/gi)].map((m) => m[1].toUpperCase());
  const standalone = [...text.matchAll(/\bINV[-\s]?\d{3,}\b/gi)].map((m) => m[0].toUpperCase().replace(/\s+/g, "-"));
  return [...explicit, ...standalone];
}

function dateDiffDays(dateText) {
  if (!dateText) return null;
  const date = new Date(dateText + "T00:00:00");
  if (Number.isNaN(date.getTime())) return null;
  const now = new Date();
  return Math.floor((now - date) / 86400000);
}

function hasAny(text, words) {
  const lower = text.toLowerCase();
  return words.some((word) => lower.includes(word));
}

function addFinding(findings, severity, title, detail, action) {
  findings.push({ severity, title, detail, action });
}

function analyze() {
  const text = invoiceText.value.trim();
  const lower = text.toLowerCase();
  if (!text) {
    result.className = "result empty";
    result.textContent = "Paste or upload invoice/payment text first.";
    return;
  }

  const findings = [];
  let score = 18;
  const numbers = invoiceNumbers(text);
  const duplicateNumbers = numbers.filter((num, idx) => numbers.indexOf(num) !== idx);
  const amounts = moneyValues(text);
  const party = document.querySelector("#partyName").value.trim();
  const expected = document.querySelector("#expectedAmount").value.trim();
  const invoiceDate = document.querySelector("#invoiceDate").value;
  const dueDate = document.querySelector("#dueDate").value;
  const overdueDays = dateDiffDays(dueDate);

  if (hasAny(lower, ["changed bank", "new bank", "updated bank", "wire details", "account changed", "different account", "instead of the account"])) {
    score += 32;
    addFinding(findings, "High", "Payment details changed", "The text mentions changed or new bank/payment details.", "Verify through a known phone number or vendor portal before paying. Do not trust the email thread alone.");
  }

  if (duplicateNumbers.length) {
    score += 24;
    addFinding(findings, "High", "Possible duplicate invoice", `Repeated invoice number detected: ${[...new Set(duplicateNumbers)].join(", ")}.`, "Compare amounts, dates, and payment status before paying. Mark one record as duplicate if confirmed.");
  }

  if (hasAny(lower, ["urgent", "immediately", "today only", "final warning", "avoid suspension", "past due now"])) {
    score += 12;
    addFinding(findings, "Medium", "Pressure language", "The invoice/payment message uses urgency or pressure language.", "Slow down and verify vendor identity, especially if payment instructions changed.");
  }

  if (!/due date|due by|net\s?\d+|payment terms/i.test(text) && !dueDate) {
    score += 10;
    addFinding(findings, "Medium", "Missing payment terms", "No clear due date or payment terms were detected.", "Ask for written terms before paying or chasing the invoice.");
  }

  if (overdueDays !== null && overdueDays > 0) {
    score += Math.min(24, 8 + Math.floor(overdueDays / 7) * 4);
    addFinding(findings, overdueDays > 14 ? "High" : "Medium", "Invoice is overdue", `Due date is ${overdueDays} day(s) ago.`, "Send a calm reminder now and schedule a firmer follow-up in 5-7 days.");
  }

  if (party && !lower.includes(party.toLowerCase())) {
    score += 12;
    addFinding(findings, "Medium", "Expected party name not found", `Expected party "${party}" was not detected in the text.`, "Confirm this invoice belongs to the right vendor/client before taking action.");
  }

  if (expected && amounts.length && !amounts.join(" ").replace(/,/g, "").includes(expected.replace(/,/g, ""))) {
    score += 10;
    addFinding(findings, "Medium", "Expected amount mismatch", `Detected amount(s): ${amounts.slice(0, 6).join(", ")}.`, "Check whether taxes, discounts, refunds, or duplicate records explain the mismatch.");
  }

  if (!findings.length) {
    addFinding(findings, "Low", "No obvious risk flags", "The free check did not find duplicate numbers, bank-detail changes, overdue dates, or pressure language.", "Still verify vendor identity and payment details before sending money.");
  }

  score = Math.max(0, Math.min(100, score));
  const level = score >= 70 ? "high" : score >= 42 ? "medium" : "low";
  const nextAction = score >= 70
    ? "Do not pay yet. Verify payment instructions through a trusted channel and review duplicates."
    : score >= 42
      ? "Review the flagged items before paying or chasing."
      : "Looks relatively clean, but keep a verification trail.";

  const reminder = buildReminder(party || "there", amounts[0] || "the outstanding amount", dueDate);

  result.className = "result";
  result.innerHTML = `
    <div class="score">
      <div class="score-number ${level}">${score}</div>
      <div>
        <h3>${level === "high" ? "High review priority" : level === "medium" ? "Needs review" : "Low obvious risk"}</h3>
        <p>${nextAction}</p>
      </div>
    </div>
    <h3>Findings</h3>
    ${findings.map((f) => `
      <div class="finding">
        <span class="tag">${f.severity}</span><strong>${f.title}</strong>
        <p>${f.detail}</p>
        <p><strong>Action:</strong> ${f.action}</p>
      </div>
    `).join("")}
    <h3>Reminder / verification email</h3>
    <div class="email-copy">${reminder}</div>
    <p>Paid $9 review adds a human-readable checklist, duplicate table, and refined email copy. <a href="https://ko-fi.com/leadleakdetector">Pay on Ko-fi</a>.</p>
  `;
}

function buildReminder(party, amount, dueDate) {
  const dueLine = dueDate ? ` It was due on ${dueDate}.` : "";
  return `Hi ${party},

I am reviewing ${amount} before the next payment run.${dueLine}

Could you please confirm:
1. the invoice number and amount,
2. the correct payment details already on file,
3. whether any bank/payment instructions have changed?

For security, I need confirmation through our usual channel before making or updating any payment.

Thanks.`;
}

fileInput.addEventListener("change", async () => {
  const file = fileInput.files?.[0];
  if (!file) return;
  invoiceText.value = await file.text();
});

sampleBtn.addEventListener("click", () => {
  invoiceText.value = sample;
  document.querySelector("#partyName").value = "Northline Media LLC";
  document.querySelector("#expectedAmount").value = "1240.00";
  document.querySelector("#invoiceDate").value = "2026-04-22";
  document.querySelector("#dueDate").value = "2026-05-06";
  analyze();
});

analyzeBtn.addEventListener("click", analyze);

copyBtn.addEventListener("click", async () => {
  const text = result.innerText || result.textContent || "";
  await navigator.clipboard.writeText(text);
  copyBtn.textContent = "Copied";
  setTimeout(() => {
    copyBtn.textContent = "Copy report";
  }, 1400);
});
