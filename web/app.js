// ================= Base =================
const BASE = window.location.origin.includes("onrender.com")
  ? window.location.origin
  : "https://credit-6wok.onrender.com";

const el = (id) => document.getElementById(id);
const badgeEl = el("badge");
const kpdEl = el("kpd");
const goBtn = el("go");
const resetBtn = el("reset");
const purposeEl = el("purpose");
const loanAmountField = el("loan-amount-field");
const resultEl = el("result");
const loadingMessagesEl = el("loadingMessages");

const apiBase = el("apiBase"); if (apiBase) apiBase.textContent = BASE;
const year = el("year"); if (year) year.textContent = new Date().getFullYear();

// ================= GSAP (optional) =================
(() => {
  if (!window.gsap) return;
  const { gsap } = window;
  if (window.ScrollTrigger) gsap.registerPlugin(window.ScrollTrigger);

  gsap.from(".hero-title", { y: 20, opacity: 0, duration: 0.9, ease: "power3.out" });
  gsap.from(".hero-sub", { y: 16, opacity: 0, duration: 0.8, delay: 0.15, ease: "power3.out" });
  gsap.from(".cta-row a", { y: 12, opacity: 0, duration: 0.7, delay: 0.3, ease: "power3.out", stagger: 0.08 });

  gsap.from(".panel", {
    scrollTrigger: { trigger: ".panels", start: "top 75%" },
    y: 22, opacity: 0, duration: 0.8, ease: "power3.out", stagger: 0.1
  });
})();

// ================= Helpers =================
const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
const pct = (num, den) => (den > 0 ? (num / den) * 100 : 0);
const subGradeNum = (sg) => {
  const m = /^([A-G])([1-5])$/.exec(String(sg).toUpperCase().trim());
  if (!m) return 10;
  const letter = m[1].charCodeAt(0) - 64; // A->1..G->7
  const num = parseInt(m[2], 10);
  return (letter - 1) * 5 + num; // 1..35
};

// ================= Show/hide Desired Loan Amount =================
function updateLoanAmountVisibility() {
  loanAmountField.style.display = (purposeEl.value === "credit_card") ? "none" : "";
}
purposeEl.addEventListener("change", updateLoanAmountVisibility);
updateLoanAmountVisibility();

// ================= Reset =================
resetBtn.addEventListener("click", () => {
  document.querySelectorAll("input[type=number]").forEach((inp) => {
    switch (inp.id) {
      case "revol_util": inp.value = 30; break;
      case "open_acc": inp.value = 5; break;
      case "inq6": inp.value = 1; break;
      case "monthly_income": inp.value = 5000; break;
      case "monthly_debt": inp.value = 500; break;
      case "loan_amount": inp.value = 10000; break;
      case "delinq_2yrs": inp.value = 0; break;
      case "pub_rec": inp.value = 0; break;
      default: break;
    }
  });
  el("emp_length").value = "4";
  el("grade").value = "B";
  el("subgrade").value = "B1";
  el("home_ownership").value = "MORTGAGE";
  el("any_delinq").value = "0";
  el("any_derog").value = "0";
  el("short_emp").value = "0";
  el("purpose").value = "car";
  el("term").value = "36";
  updateLoanAmountVisibility();

  badgeEl.className = "badge";
  badgeEl.textContent = "—";
  kpdEl.textContent = "—";
  loadingMessagesEl.textContent = "";
  resultEl.hidden = true;
});

// ================= Payload builder (17 model features) =================
function makePayload() {
  const getN = (id) => parseFloat(el(id).value || 0);
  const getI = (id) => parseInt(el(id).value || 0, 10);

  const delinq_2yrs = getI("delinq_2yrs");
  const monthly_income = getN("monthly_income");
  const monthly_debt = getN("monthly_debt");
  const emp_length_num = getI("emp_length");
  const grade = el("grade").value;
  const subgrade = el("subgrade").value;
  const home_ownership = el("home_ownership").value;
  const inq_last_6mths = getI("inq6");
  const open_acc = getI("open_acc");
  const revol_util = clamp(getN("revol_util"), 0, 100);
  const pub_rec = getI("pub_rec");
  const last_delinq_none = el("any_delinq").value === "0" ? 1 : 0;
  const last_major_derog_none = el("any_derog").value === "0" ? 1 : 0;
  const short_emp = getI("short_emp");
  const purpose = el("purpose").value;

  // Derived for current model (no direct loan_amount/term in baseline model)
  const dti = clamp(pct(monthly_debt, monthly_income), 0, 100);
  const payment_inc_ratio = dti;
  const delinq_2yrs_zero = delinq_2yrs === 0 ? 1 : 0;
  const pub_rec_zero = pub_rec === 0 ? 1 : 0;
  const sub_grade_num = subGradeNum(subgrade);

  return {
    delinq_2yrs,
    delinq_2yrs_zero,
    dti,
    emp_length_num,
    grade,
    home_ownership,
    inq_last_6mths,
    last_delinq_none,
    last_major_derog_none,
    open_acc,
    payment_inc_ratio,
    pub_rec,
    pub_rec_zero,
    purpose,
    revol_util,
    short_emp,
    sub_grade_num
  };
}

// ================= Fun loading sequence =================
const FUNNY_MESSAGES = [
  "Calculating your score—powered by state-of-the-art algorithms and questionable office snacks...",
  "Reviewing your application, your credit history, and your Spotify playlist for good measure...",
  "Crunching numbers and pretending not to judge your coffee intake...",
  "Factoring in your employment length and your ability to remember all your passwords...",
  "Checking your loan purpose and your weekend plans for optimal results...",
  "Consulting your credit cards and your favorite browser tabs for consensus...",
  "Running simulations and hoping “Grade: A” means extra credit...",
  "Analyzing your financials and resisting the urge to order pizza...",
  "Verifying your public records and your social media privacy settings...",
  "Asking your bank account if it’s ready for this commitment...",
  "Processing your application—please hold while we consult the Magic 8-Ball...",
  "Reviewing your financial profile and wishing we had your Netflix password...",
  "Checking your credit utilization and your snack stash for hidden assets...",
  "Analyzing your data and wondering if “no major derogatory” means no office drama...",
  "Determining if your open accounts are open for business or just window shopping...",
  "Running a simulation with imaginary money for maximum accuracy...",
  "Crunching numbers and hoping your cat isn’t your financial advisor...",
  "Factoring in your employment history and your ability to make small talk at the water cooler...",
  "Verifying your income and your ability to say “synergy” in meetings...",
  "Consulting the credit gods and crossing our fingers for a positive outcome..."
];

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

function pickRandom(arr, n) {
  const pool = [...arr], out = [];
  while (out.length < n && pool.length) {
    out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  }
  return out;
}

async function typeText(node, text, speed = 40) {
  node.classList.add("typing-caret");
  node.textContent = "";
  for (let i = 0; i < text.length; i++) {
    node.textContent += text[i];
    await sleep(speed);           // typing speed
  }
  node.classList.remove("typing-caret");
  await sleep(700);               // hold message after typing
}

async function showLoadingSequence() {
  const count = 3 + Math.floor(Math.random() * 2); // 3–4 messages
  const picks = pickRandom(FUNNY_MESSAGES, count);
  for (const msg of picks) {
    await typeText(loadingMessagesEl, msg, 42); // slower so it’s readable
  }
  loadingMessagesEl.textContent = "";
}

// ================= Call API and render =================
async function runScoring() {
  const payload = makePayload();

  const r = await fetch(`${BASE}/predict`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const data = await r.json();

  const pd = typeof data.prob_default === "number" ? data.prob_default : NaN;
  kpdEl.textContent = isFinite(pd) ? (pd * 100).toFixed(2) + "%" : "—";

  badgeEl.className = "badge";
  if (data.decision === "APPROVE") { badgeEl.classList.add("approve"); badgeEl.textContent = "APPROVE"; }
  else if (data.decision === "CONDITIONAL") { badgeEl.classList.add("conditional"); badgeEl.textContent = "CONDITIONAL"; }
  else if (data.decision === "REJECT") { badgeEl.classList.add("reject"); badgeEl.textContent = "REJECT"; }
  else { badgeEl.textContent = "—"; }

  // reveal result and animate
  resultEl.hidden = false;
  if (window.gsap) {
    gsap.from("#resultCard", { scale: 0.98, opacity: 0.6, duration: 0.35, ease: "power2.out" });
    gsap.from("#badge", { y: -6, duration: 0.35, ease: "power2.out" });
    gsap.from("#kpd", { y: 6, duration: 0.35, ease: "power2.out" });
  }
}

// ================= Single click handler =================
goBtn.addEventListener("click", async () => {
  // reset decision panel
  resultEl.hidden = true;
  badgeEl.className = "badge";
  badgeEl.textContent = "—";
  kpdEl.textContent = "—";
  loadingMessagesEl.textContent = "Starting evaluation…";

  goBtn.disabled = true;
  try {
    // do the messages first…
    await showLoadingSequence();
    // …then fetch and show the real result
    await runScoring();
  } catch (e) {
    console.error("Request failed:", e);
    badgeEl.className = "badge"; badgeEl.textContent = "—";
    kpdEl.textContent = "—";
    loadingMessagesEl.textContent = "Something went wrong. Please try again.";
  } finally {
    goBtn.disabled = false;
  }
});
