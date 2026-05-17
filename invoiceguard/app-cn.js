const invoiceText = document.querySelector("#invoiceText");
const fileInput = document.querySelector("#fileInput");
const sampleBtn = document.querySelector("#sampleBtn");
const analyzeBtn = document.querySelector("#analyzeBtn");
const copyBtn = document.querySelector("#copyBtn");
const result = document.querySelector("#result");

const sample = `发票号：INV-1042
供应商：北线传媒
应付金额：¥8,600
发票日期：2026-04-22
到期日：2026-05-06
付款条款：14天内付款

邮件内容：
请今天尽快付款。我们最近更换了收款账户。
请使用这封邮件里的新账户，不要使用原来备案账户。

历史导出：
INV-1042, 北线传媒, ¥7,800, 到期 2026-05-06, 未付款
INV-1038, 北线传媒, ¥6,900, 已付款

备注：
目前还没有发出催款或确认邮件。`;

function moneyValues(text) {
  const matches = text.match(/(?:¥|￥|CNY\s*)\s?\d{1,3}(?:,\d{3})*(?:\.\d{2})?|(?:\$|USD\s*)\s?\d{1,3}(?:,\d{3})*(?:\.\d{2})?|\b\d{2,}(?:,\d{3})*(?:\.\d{2})?\s?(?:元|usd|dollars)\b/gi) || [];
  return matches.map((item) => item.trim());
}

function invoiceNumbers(text) {
  const explicit = [...text.matchAll(/\b(?:invoice\s*#?|inv[-\s:]?|发票号[:：\s]*)([a-z0-9-]{3,})\b/gi)].map((m) => m[1].toUpperCase());
  const standalone = [...text.matchAll(/\bINV[-\s]?\d{3,}\b/gi)].map((m) => m[0].toUpperCase().replace(/\s+/g, "-"));
  return [...explicit, ...standalone];
}

function dateDiffDays(dateText) {
  if (!dateText) return null;
  const date = new Date(dateText + "T00:00:00");
  if (Number.isNaN(date.getTime())) return null;
  return Math.floor((new Date() - date) / 86400000);
}

function hasAny(text, words) {
  return words.some((word) => text.includes(word));
}

function addFinding(findings, severity, title, detail, action) {
  findings.push({ severity, title, detail, action });
}

function analyze() {
  const text = invoiceText.value.trim();
  const lower = text.toLowerCase();
  if (!text) {
    result.className = "result empty";
    result.textContent = "请先粘贴或上传脱敏文本。";
    return;
  }

  const findings = [];
  let score = 18;
  const numbers = invoiceNumbers(text);
  const duplicateNumbers = numbers.filter((num, idx) => numbers.indexOf(num) !== idx);
  const amounts = moneyValues(text);
  const party = document.querySelector("#partyName").value.trim();
  const expected = document.querySelector("#expectedAmount").value.trim();
  const dueDate = document.querySelector("#dueDate").value;
  const overdueDays = dateDiffDays(dueDate);

  if (hasAny(lower, ["更换收款", "换收款", "新账户", "收款账户变更", "银行信息变更", "changed bank", "new bank", "updated bank"])) {
    score += 34;
    addFinding(findings, "高危", "收款信息变更", "文本里出现了更换或新增收款账户的信号。", "不要只相信邮件。用原来备案电话、合同联系人或供应商后台二次确认。");
  }

  if (duplicateNumbers.length) {
    score += 24;
    addFinding(findings, "高危", "可能重复发票", `重复发票号：${[...new Set(duplicateNumbers)].join("、")}。`, "付款前核对金额、日期、付款状态，确认是否已经支付或应作废。");
  }

  if (hasAny(lower, ["紧急", "马上付款", "今天付款", "立即付款", "否则暂停", "urgent", "immediately"])) {
    score += 12;
    addFinding(findings, "中危", "紧急催付话术", "文本里有明显催促付款的压力话术。", "放慢一步，先核验发票和收款信息，尤其是第一次付款或账户变更。");
  }

  if (!/到期日|付款条款|due date|due by|net\s?\d+/i.test(text) && !dueDate) {
    score += 10;
    addFinding(findings, "中危", "付款条款不清楚", "没有检测到明确到期日或付款条款。", "要求对方补充书面付款条款，再决定付款或催款节奏。");
  }

  if (overdueDays !== null && overdueDays > 0) {
    score += Math.min(24, 8 + Math.floor(overdueDays / 7) * 4);
    addFinding(findings, overdueDays > 14 ? "高危" : "中危", "已逾期未处理", `到期日已过去 ${overdueDays} 天。`, "现在发送一封明确但不激烈的提醒邮件，并安排 5-7 天后的下一次跟进。");
  }

  if (party && !lower.includes(party.toLowerCase())) {
    score += 12;
    addFinding(findings, "中危", "预期对象未出现", `没有检测到预期对象：${party}。`, "确认这份发票/付款记录是否属于正确供应商或客户。");
  }

  if (expected && amounts.length && !amounts.join(" ").replace(/,/g, "").includes(expected.replace(/,/g, ""))) {
    score += 10;
    addFinding(findings, "中危", "金额可能不一致", `检测到金额：${amounts.slice(0, 6).join("、")}。`, "核对报价、合同、税费、折扣、退款或重复记录。");
  }

  if (!findings.length) {
    addFinding(findings, "低危", "未发现明显风险", "免费检查没有发现重复发票号、收款变更、逾期或压力话术。", "仍建议保留核验记录，付款前确认供应商身份和金额。");
  }

  score = Math.max(0, Math.min(100, score));
  const level = score >= 70 ? "high" : score >= 42 ? "medium" : "low";
  const nextAction = score >= 70
    ? "先不要付款。请通过可信渠道核验收款信息，并检查是否重复。"
    : score >= 42
      ? "付款或催款前，请先处理下面的风险点。"
      : "暂未发现明显风险，但付款前仍应保留核验记录。";

  const reminder = buildReminder(party || "您好", amounts[0] || "这笔款项", dueDate);

  result.className = "result";
  result.innerHTML = `
    <div class="score">
      <div class="score-number ${level}">${score}</div>
      <div>
        <h3>${level === "high" ? "高优先级复核" : level === "medium" ? "需要复核" : "明显风险较低"}</h3>
        <p>${nextAction}</p>
      </div>
    </div>
    <h3>检查结果</h3>
    ${findings.map((f) => `
      <div class="finding">
        <span class="tag">${f.severity}</span><strong>${f.title}</strong>
        <p>${f.detail}</p>
        <p><strong>建议动作：</strong>${f.action}</p>
      </div>
    `).join("")}
    <h3>确认 / 催款邮件</h3>
    <div class="email-copy">${reminder}</div>
    <p>付费复核会补充更清楚的风险清单、重复项表格和优化后的邮件话术。</p>
  `;
}

function buildReminder(party, amount, dueDate) {
  const dueLine = dueDate ? `这笔款项到期日是 ${dueDate}。` : "";
  return `${party}，

我正在复核 ${amount} 的付款/催款记录。${dueLine}

为了避免付款错误，麻烦确认：
1. 发票号和金额是否正确；
2. 收款信息是否仍为原备案信息；
3. 是否有任何账户或付款方式变更；
4. 预计付款或回款时间。

出于安全考虑，如有收款信息变更，我需要通过原有可信渠道再次确认。

谢谢。`;
}

fileInput.addEventListener("change", async () => {
  const file = fileInput.files?.[0];
  if (!file) return;
  invoiceText.value = await file.text();
});

sampleBtn.addEventListener("click", () => {
  invoiceText.value = sample;
  document.querySelector("#partyName").value = "北线传媒";
  document.querySelector("#expectedAmount").value = "8600";
  document.querySelector("#invoiceDate").value = "2026-04-22";
  document.querySelector("#dueDate").value = "2026-05-06";
  analyze();
});

analyzeBtn.addEventListener("click", analyze);

copyBtn.addEventListener("click", async () => {
  const text = result.innerText || result.textContent || "";
  await navigator.clipboard.writeText(text);
  copyBtn.textContent = "已复制";
  setTimeout(() => { copyBtn.textContent = "复制报告"; }, 1400);
});
