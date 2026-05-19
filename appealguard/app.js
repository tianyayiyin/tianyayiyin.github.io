const textArea = document.querySelector("#noticeText");
const sampleBtn = document.querySelector("#sampleBtn");
const checkBtn = document.querySelector("#checkBtn");
const results = document.querySelector("#results");
const scoreValue = document.querySelector("#scoreValue");
const issueList = document.querySelector("#issueList");
const evidenceList = document.querySelector("#evidenceList");
const nextAction = document.querySelector("#nextAction");
const appealDraft = document.querySelector("#appealDraft");

const sample = `Platform: Amazon
Issue: listing removed for authenticity complaint
Notice: provide invoices, supplier information, and plan of action.
Seller says products are genuine but invoices are missing supplier contact details.
Current appeal: I did nothing wrong, please reactivate my listing.`;

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
  const issues = [];
  const evidence = [];
  let readiness = 80;

  if (hasAny(text, ["authentic", "counterfeit", "invoice", "supplier"])) {
    issues.push("Authenticity / supplier documentation issue.");
    if (!hasAny(text, ["supplier address", "supplier contact", "manufacturer", "invoice date"])) {
      evidence.push("Supplier invoice needs date, supplier contact, product identifiers, and quantity match.");
      readiness -= 18;
    }
  }

  if (hasAny(text, ["late shipment", "tracking", "delivery", "item not received"])) {
    issues.push("Fulfillment / delivery-performance issue.");
    if (!hasAny(text, ["tracking", "carrier", "delivered", "ship date"])) {
      evidence.push("Add tracking, carrier status, delivery date, and shipment timeline.");
      readiness -= 16;
    }
  }

  if (hasAny(text, ["policy", "violation", "restricted", "prohibited", "intellectual property", "ip"])) {
    issues.push("Policy / restricted product / IP issue.");
    evidence.push("Map each policy claim to the exact listing text, image, document, or corrective edit.");
    readiness -= 12;
  }

  if (!hasAny(text, ["root cause", "cause", "why", "reason"])) {
    evidence.push("Root cause is missing. Platforms usually want what happened, not just denial.");
    readiness -= 15;
  }

  if (!hasAny(text, ["corrective", "fixed", "removed", "updated", "trained", "checked"])) {
    evidence.push("Corrective action is missing. Add what was changed immediately.");
    readiness -= 15;
  }

  if (!hasAny(text, ["prevent", "future", "process", "checklist", "audit"])) {
    evidence.push("Prevention plan is vague. Add the process that prevents recurrence.");
    readiness -= 12;
  }

  if (hasAny(text, ["did nothing wrong", "unfair", "angry", "ridiculous", "please reactivate"])) {
    evidence.push("Tone risk: avoid emotional denial. Use factual root cause + correction + prevention.");
    readiness -= 10;
  }

  if (issues.length === 0) {
    issues.push("General account/listing enforcement issue. Classify the exact platform claim before drafting.");
  }

  if (evidence.length === 0) {
    evidence.push("Evidence looks workable. Tighten the timeline and keep the appeal concise.");
  }

  readiness = Math.max(1, Math.min(99, readiness));

  return {
    readiness,
    issues,
    evidence,
    action: readiness < 50
      ? "Do not submit yet. Add root cause, corrective action, prevention steps, and evidence that matches the platform claim."
      : readiness < 75
        ? "Draft the appeal, but strengthen the missing evidence before sending."
        : "The structure is close. Keep the appeal short, factual, and evidence-backed.",
    draft: `Appeal outline:

1. Acknowledge the platform issue
   - State the exact warning or violation in neutral language.

2. Root cause
   - Explain what caused the issue without blaming the platform or buyer.

3. Corrective action taken
   - What was fixed, removed, updated, refunded, documented, or retrained.

4. Prevention plan
   - The checklist or process that prevents the same issue.

5. Evidence attached
   - Supplier invoice / tracking / policy screenshot / listing edit / message timeline.

6. Requested outcome
   - Request reinstatement or review based on the evidence.`
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
  scoreValue.textContent = `${report.readiness}/100`;
  addItems(issueList, report.issues);
  addItems(evidenceList, report.evidence);
  nextAction.textContent = report.action;
  appealDraft.textContent = report.draft;
  results.hidden = false;
  results.scrollIntoView({ behavior: "smooth", block: "start" });
});
