// ================= Base + header bits =================
const BASE = window.location.origin.includes("onrender.com")
  ? window.location.origin
  : "https://credit-6wok.onrender.com";

const el = (id) => document.getElementById(id);
const apiBase = el("apiBase");
if (apiBase) apiBase.textContent = BASE;
const year = el("year");
if (year) year.textContent = new Date().getFullYear();

const badgeEl = el("badge");
const kpdEl = el("kpd");
const goBtn = el("go");
const resetBtn = el("reset");
const purposeEl = el("purpose");
const loanAmountField = el("loan-amount-field");
const statusEl = el("status");
const resultEl = el("result");

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

  // Clear UI
  badgeEl.className = "badge";
  badgeEl.textContent = "—";
  kpdEl.textContent = "—";
  statusEl.textContent = "";
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

  // Derived for current model
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
    // NOTE: loan_amount / term not sent; model not trained with them yet.
  };
}

// ================= Funny loading sequence =================
// ---------- funny messages pool ----------
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

// ---------- utilities ----------
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
function sampleN(arr, n) {
  const copy = [...arr];
  const out = [];
  while (out.length < n && copy.length) {
    out.push(copy.splice(Math.floor(Math.random() * copy.length), 1)[0]);
  }
  return out;
}

// typing control token to cancel previous animations if user clicks again
let typingToken = 0;

/**
 * Type text at a readable pace.
 * @param {HTMLElement} el   target element
 * @param {string}      txt  message to type
 * @param {number}      speedMs  ms per char (25–40 is comfy)
 * @param {number}      token    cancellation token
 */
async function typeText(el, txt, speedMs, token) {
  el.textContent = "";
  el.classList.add("typing-caret");
  for (let i = 0; i < txt.length; i++) {
    if (token !== typingToken) return;      // cancelled by a newer run
    el.textContent += txt[i];
    await sleep(speedMs);
  }
  el.classList.remove("typing-caret");
}

/**
 * Show 3–4 messages in sequence, then resolve.
 * Ensures the first message is fully visible long enough to read.
 */
async function showLoadingSequence(statusEl, { count = 3, typeMs = 30, holdFirstMs = 1200, holdBetweenMs = 900 } = {}) {
  const token = ++typingToken;                           // new run; cancels older ones
  const picks = sampleN(FUNNY_MESSAGES, count);

  for (let i = 0; i < picks.length; i++) {
    if (token !== typingToken) return;                   // cancelled
    await typeText(statusEl, picks[i], typeMs, token);   // type slowly
    // keep first line on screen a bit longer (prevents “cut off” feel)
    await sleep(i === 0 ? holdFirstMs : holdBetweenMs);
    if (token !== typingToken) return;
    // clear between lines (optional)
    statusEl.textContent = "";
  }
}

// ---------- single click handler (sequential) ----------
goBtn.addEventListener("click", async () => {
  const statusEl = document.getElementById("status");
  const resultEl = document.getElementById("result");

  goBtn.disabled = true;
  resultEl.hidden = true;               // hide previous result
  statusEl.textContent = "Starting evaluation…";

  try {
    // 1) run the animated sequence (slow typing, 3–4 messages)
    const count = 3 + Math.floor(Math.random() * 2);  // 3 or 4
    await showLoadingSequence(statusEl, {
      count,
      typeMs: 32,            // <- slow enough to read (≈30–35ms/char)
      holdFirstMs: 1400,     // <- keep first message longer
      holdBetweenMs: 1000
    });

    // 2) only AFTER messages finish, call the API and show decision
    await runScoring();      // your existing function that sets badge + PD

    statusEl.textContent = "";     // clear the loading line
    resultEl.hidden = false;       // reveal the decision card
  } catch (err) {
    console.error(err);
    statusEl.textContent = "Something went wrong. Please try again.";
  } finally {
    goBtn.disabled = false;
  }
});
// ================= Call API and render =================
async function runScoring() {
  const payload = makePayload();

  const r = await fetch(`${BASE}/predict`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const data = await r.json();

  // Render result
  const pd = typeof data.prob_default === "number" ? data.prob_default : NaN;
  kpdEl.textContent = isFinite(pd) ? (pd * 100).toFixed(2) + "%" : "—";

  badgeEl.className = "badge";
  if (data.decision === "APPROVE") { badgeEl.classList.add("approve"); badgeEl.textContent = "APPROVE"; }
  else if (data.decision === "CONDITIONAL") { badgeEl.classList.add("conditional"); badgeEl.textContent = "CONDITIONAL"; }
  else if (data.decision === "REJECT") { badgeEl.classList.add("reject"); badgeEl.textContent = "REJECT"; }
  else { badgeEl.textContent = "—"; }

  // Show result card
  resultEl.hidden = false;
  statusEl.textContent = "";

  if (window.gsap) {
    gsap.from("#resultCard", { scale: 0.98, opacity: 0.6, duration: 0.35, ease: "power2.out" });
    gsap.from("#badge", { y: -6, duration: 0.35, ease: "power2.out" });
    gsap.from("#kpd", { y: 6, duration: 0.35, ease: "power2.out" });
  }
}

// ================= Click handler =================
goBtn.addEventListener("click", async () => {
  // prepare UI
  resultEl.hidden = true;
  badgeEl.className = "badge";
  badgeEl.textContent = "…";
  kpdEl.textContent = "—";
  statusEl.textContent = "Starting evaluation…";

  goBtn.disabled = true;
  try {
    // Start API request in parallel with the messages to smooth UX
    const apiPromise = runScoring(); // NOTE: kicks off fetch but we await after messages
    await showLoadingSequence();
    await apiPromise;               // wait for server result
  } catch (e) {
    console.error("Request failed:", e);
    badgeEl.className = "badge"; badgeEl.textContent = "—";
    kpdEl.textContent = "—";
    statusEl.textContent = "Something went wrong. Please try again.";
  } finally {
    goBtn.disabled = false;
  }
});
