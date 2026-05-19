const textArea = document.querySelector("#caseText");
const sampleBtn = document.querySelector("#sampleBtn");
const checkBtn = document.querySelector("#checkBtn");
const results = document.querySelector("#results");
const scoreValue = document.querySelector("#scoreValue");
const missingList = document.querySelector("#missingList");
const angleList = document.querySelector("#angleList");
const nextAction = document.querySelector("#nextAction");
const responseDraft = document.querySelector("#responseDraft");

const sample = `Platform: PayPal
Reason: item not received
Customer says the package never arrived.
Order date: May 2
Tracking says delivered May 8.
Messages: customer asked for refund after delivery.
Policy: refunds accepted within 7 days if unused.
Evidence available: tracking screenshot, order confirmation, message thread.`;

function hasAny(text, words) {
  return words.some((word) => text.includes(word));
}

function addItems(list, items) {
  list.innerHTML = "";
  items.forEach((item) => {
    const li = document.createElement("li");
    li.textContent = item;
    list.appendChild(li);
  });
}

function analyze(raw) {
  const text = raw.toLowerCase();
  const missing = [];
  const angles = [];
  let score = 25;

  if (!hasAny(text, ["tracking", "delivered", "delivery", "shipment", "carrier"])) {
    missing.push("Proof of delivery or service completion is not visible.");
    score += 18;
  } else {
    angles.push("Lead with delivery/completion proof and exact dates.");
  }

  if (!hasAny(text, ["order date", "invoice date", "paid", "payment date", "date:", "may", "202"])) {
    missing.push("Timeline is weak. Add order date, payment date, delivery date, and dispute date.");
    score += 15;
  } else {
    angles.push("Build a simple chronological timeline.");
  }

  if (!hasAny(text, ["policy", "refund", "terms", "return", "cancellation"])) {
    missing.push("Refund/return/cancellation policy is not cited.");
    score += 12;
  } else {
    angles.push("Cite the policy only after stating the facts.");
  }

  if (!hasAny(text, ["message", "email", "chat", "conversation", "thread"])) {
    missing.push("Customer communication evidence is missing.");
    score += 12;
  } else {
    angles.push("Use customer messages to show expectation, delivery, or acceptance.");
  }

  if (hasAny(text, ["angry", "scam", "fraud", "liar", "ridiculous", "threat"])) {
    missing.push("Tone risk: emotional wording may weaken the response.");
    score += 10;
  }

  if (hasAny(text, ["not received", "never arrived", "item not received"])) {
    angles.push("For item-not-received disputes, focus on tracking, delivery address match, and carrier status.");
  }

  if (hasAny(text, ["not as described", "defective", "broken", "quality"])) {
    angles.push("For quality disputes, compare customer claim against listing, scope, screenshots, and delivery notes.");
  }

  if (hasAny(text, ["unauthorized", "stolen", "fraudulent"])) {
    angles.push("For unauthorized-payment disputes, include IP/device/platform signals only if the platform provides them.");
  }

  if (missing.length === 0) {
    missing.push("No obvious missing evidence in the pasted text. Tighten the timeline and response tone.");
  }

  if (angles.length === 0) {
    angles.push("Start with facts, then attach evidence, then ask the platform to uphold the transaction.");
  }

  score = Math.max(1, Math.min(99, score));

  return {
    score,
    missing,
    angles,
    action: score >= 70
      ? "Do not submit yet. Add missing evidence and rewrite into a factual timeline before the deadline."
      : score >= 45
        ? "Prepare a concise response and attach only evidence that maps directly to the customer claim."
        : "Evidence looks workable. Keep the response short, factual, and ordered by date.",
    draft: `Suggested structure:

1. Transaction summary
   - Order/payment date
   - Product/service
   - Amount

2. Customer claim
   - Quote the dispute reason in neutral language

3. Evidence timeline
   - Date: order accepted
   - Date: delivery/completion
   - Date: customer message or refund request

4. Attached evidence
   - Invoice/order confirmation
   - Tracking or completion proof
   - Relevant customer messages
   - Refund/terms policy

5. Requested outcome
   - Based on the attached evidence, please uphold the transaction.`
  };
}

sampleBtn.addEventListener("click", () => {
  textArea.value = sample;
});

checkBtn.addEventListener("click", () => {
  const value = textArea.value.trim();
  if (!value) {
    textArea.focus();
    return;
  }

  const report = analyze(value);
  scoreValue.textContent = `${report.score}/100`;
  addItems(missingList, report.missing);
  addItems(angleList, report.angles);
  nextAction.textContent = report.action;
  responseDraft.textContent = report.draft;
  results.hidden = false;
  results.scrollIntoView({ behavior: "smooth", block: "start" });
});
