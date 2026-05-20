const form = document.querySelector("#readingForm");
const result = document.querySelector("#result");
const resultTitle = document.querySelector("#resultTitle");
const keywordEl = document.querySelector("#keyword");
const strengthEl = document.querySelector("#strength");
const watchoutEl = document.querySelector("#watchout");
const readingText = document.querySelector("#readingText");
const shareText = document.querySelector("#shareText");
const copyShare = document.querySelector("#copyShare");

const keywords = [
  "换轨与重启", "贵人窗口", "慢火成事", "断舍离", "暗线机会", "表达变现",
  "关系修复", "向外生长", "现金流整理", "作品出圈", "稳中求变", "边界感"
];
const strengths = [
  "你适合把复杂问题拆成小步骤，越具体越有好运。",
  "你的优势在于感知细节，能比别人更早发现机会的苗头。",
  "你不是爆发型，而是累积型；坚持做一件事会带来复利。",
  "你的表达会影响运势，清楚说出需求比默默忍耐更有效。",
  "你有把混乱重新排布的能力，适合做整理、复盘、升级。"
];
const watchouts = [
  "不要为了讨好别人牺牲自己的节奏。",
  "别在情绪最高的时候做重大决定。",
  "不要把短期焦虑误判成长期方向。",
  "谨慎承诺超出能力范围的事。",
  "先看证据，再听感觉。"
];
const focusLines = {
  career: [
    "事业和赚钱的关键不是盲目加速，而是把一个能交付的东西推到人前。",
    "接下来适合减少无效准备，多做公开展示、报价和成交动作。"
  ],
  love: [
    "关系里的关键是边界和表达。你需要被理解，也需要更直接地说出期待。",
    "感情不是猜谜游戏，模糊会消耗运势，清楚会带来转机。"
  ],
  study: [
    "学习运来自节奏感。今天适合做错题、整理框架，而不是硬塞更多内容。",
    "你会在复盘里找到突破口，别只追求速度。"
  ],
  change: [
    "变化已经在靠近，但它更像换轨，不是逃离。",
    "先整理资源，再决定方向；越清楚现状，转身越稳。"
  ]
};

function hashText(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h >>> 0);
}

function pick(list, seed, offset = 0) {
  return list[(seed + offset) % list.length];
}

function westernSign(month, day) {
  const dates = [20,19,21,20,21,21,23,23,23,23,22,22];
  const signs = ["摩羯","水瓶","双鱼","白羊","金牛","双子","巨蟹","狮子","处女","天秤","天蝎","射手"];
  return day < dates[month - 1] ? signs[month - 1] : signs[month % 12];
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const nickname = document.querySelector("#nickname").value.trim() || "你";
  const birthday = document.querySelector("#birthday").value;
  const birthtime = document.querySelector("#birthtime").value || "12:00";
  const focus = document.querySelector("#focus").value;
  const question = document.querySelector("#question").value.trim() || "接下来我该关注什么？";
  const seed = hashText(`${nickname}|${birthday}|${birthtime}|${focus}|${question}|2026`);
  const date = birthday ? new Date(`${birthday}T00:00:00`) : new Date(1996, seed % 12, (seed % 27) + 1);
  const sign = westernSign(date.getMonth() + 1, date.getDate());
  const keyword = pick(keywords, seed);
  const strength = pick(strengths, seed, 3);
  const watchout = pick(watchouts, seed, 7);
  const focusLine = pick(focusLines[focus], seed, 11);
  const lucky = ["3", "6", "8", "12", "19", "27"][(seed + 5) % 6];
  const color = ["雾蓝", "莓果粉", "松石绿", "金色", "黑曜石", "奶油白"][(seed + 9) % 6];

  resultTitle.textContent = `${nickname}的${sign}能量卡`;
  keywordEl.textContent = keyword;
  strengthEl.textContent = strength;
  watchoutEl.textContent = watchout;
  readingText.textContent = `${nickname}，你的主线是“${keyword}”。${strength} ${focusLine} 你问的是“${question}”，这件事的突破口不在更用力，而在先把选择变少、把行动变具体。幸运数字 ${lucky}，今日适合色 ${color}。`;
  shareText.textContent = `我生成了 FateSpark 今日命盘：\n关键词：${keyword}\n星座能量：${sign}\n提醒：${watchout}\n幸运数字：${lucky}\n适合色：${color}\n\n免费生成你的：${location.href.split("#")[0]}`;
  result.hidden = false;
  result.scrollIntoView({ behavior: "smooth", block: "start" });
});

copyShare.addEventListener("click", async () => {
  await navigator.clipboard.writeText(shareText.textContent);
  copyShare.textContent = "已复制";
  setTimeout(() => { copyShare.textContent = "复制分享文案"; }, 1600);
});
