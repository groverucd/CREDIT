// Base URL (works both local and Render-hosted UI)
const BASE = window.location.origin.includes("onrender.com")
  ? window.location.origin
  : "https://credit-6wok.onrender.com";

document.getElementById("apiBase").textContent = BASE;
document.getElementById("year").textContent = new Date().getFullYear();

// ——— GSAP animations ———
(() => {
  if (!window.gsap) return;
  gsap.registerPlugin(ScrollTrigger);

  // Hero in
  gsap.from(".hero-title", { y: 20, opacity: 0, duration: 0.9, ease: "power3.out" });
  gsap.from(".hero-sub", { y: 16, opacity: 0, duration: 0.8, delay: 0.15, ease: "power3.out" });
  gsap.from(".cta-row a", { y: 12, opacity: 0, duration: 0.7, delay: 0.3, ease: "power3.out", stagger: 0.08 });

  // Panels pop on scroll
  gsap.from(".panel", {
    scrollTrigger: { trigger: ".panels", start: "top 75%" },
    y: 22, opacity: 0, duration: 0.8, ease: "power3.out", stagger: 0.1
  });
})();

// ——— Helpers ———
const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
const pct = (num, den) => (den > 0 ? (num / den) * 100 : 0);
const subGradeNum = (sg) => {
  const m = /^([A-G])([1-5])$/.exec(String(sg).toUpperCase().trim());
  if (!m) return 10; // safe middle
  const letter = m[1].charCodeAt(0) - 64; // A->1..G->7
  const num = parseInt(m[2], 10);
  return (letter - 1) * 5 + num; // 1..35
};

// ——— UI elements ———
const purposeEl = document.getElementById("purpose");
const loanAmountField = document.getElementById("loan-amount-field");
const goBtn = document.getElementById("go");
const resetBtn = document.getElementById("reset");
const badgeEl = document.getElementById("badge");
const kpdEl = document.getElementById("kpd");

// Show/hide loan amount for credit cards
function updateLoanAmountVisibility() {
  const p = purposeEl.value;
  loanAmountField.style.display = p === "credit_card" ? "none" : "";
}
purposeEl.addEventListener("change", updateLoanAmountVisibility);
updateLoanAmountVisibility();

// ——— Reset ———
resetBtn.addEventListener("click", () => {
  document.querySelectorAll("input[type=number]").forEach((el) => {
    if (el.id === "revol_util") el.value = 30;
    else if (el.id === "open_acc") el.value = 5;
    else if (el.id === "inq6") el.value = 1;
    else if (el.id === "monthly_income") el.value = 5000;
    else if (el.id === "monthly_debt") el.value = 500;
    else if (el.id === "loan_amount") el.value = 10000;
    else if (el.id === "delinq_2yrs") el.value = 0;
    else if (el.id === "pub_rec") el.value = 0;
  });
  document.getElementById("emp_length").value = "4";
  document.getElementById("grade").value = "B";
  document.getElementById("subgrade").value = "B1";
  document.getElementById("home_ownership").value = "MORTGAGE";
  document.getElementById("any_delinq").value = "0";
  document.getElementById("any_derog").value = "0";
  document.getElementById("short_emp").value = "0";
  document.getElementById("purpose").value = "car";
  document.getElementById("term").value = "36";
  updateLoanAmountVisibility();

  // Clear result
  badgeEl.className = "badge";
  badgeEl.textContent = "—";
  kpdEl.textContent = "—";
});

// ——— Submit ———
goBtn.addEventListener("click", async () => {
  // read inputs
  const delinq_2yrs = parseInt(document.getElementById("delinq_2yrs").value || 0, 10);
  const monthly_income = parseFloat(document.getElementById("monthly_income").value || 0);
  const monthly_debt = parseFloat(document.getElementById("monthly_debt").value || 0);
  const emp_length_num = parseInt(document.getElementById("emp_length").value, 10);
  const grade = document.getElementById("grade").value;
  const subgrade = document.getElementById("subgrade").value;
  const home_ownership = document.getElementById("home_ownership").value;
  const inq_last_6mths = parseInt(document.getElementById("inq6").value || 0, 10);
  const open_acc = parseInt(document.getElementById("open_acc").value || 0, 10);
  const revol_util = clamp(parseFloat(document.getElementById("revol_util").value || 0), 0, 100);
  const pub_rec = parseInt(document.getElementById("pub_rec").value || 0, 10);
  const last_delinq_none = document.getElementById("any_delinq").value === "0" ? 1 : 0;
  const last_major_derog_none = document.getElementById("any_derog").value === "0" ? 1 : 0;
  const short_emp = parseInt(document.getElementById("short_emp").value, 10);
  const purpose = purposeEl.value;
  const loan_amount = parseFloat(document.getElementById("loan_amount").value || 0);
  const term = parseInt(document.getElementById("term").value, 10);

  // derive features (model expects 17 fixed fields)
  const dti = clamp(pct(monthly_debt, monthly_income), 0, 100);
  const payment_inc_ratio = dti; // stand-in
  const delinq_2yrs_zero = delinq_2yrs === 0 ? 1 : 0;
  const pub_rec_zero = pub_rec === 0 ? 1 : 0;
  const sub_grade_num = subGradeNum(subgrade);

  const payload = {
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
    // NOTE: loan_amount/term not sent to model (unless you retrain with these features).
  };

  // UI state
  goBtn.disabled = true;

  try {
    // hover micro-feedback (button nudge)
    goBtn.style.transform = "translateY(1px)";
    const r = await fetch(`${BASE}/predict`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await r.json();

    // Update PD text
    const pd = typeof data.prob_default === "number" ? data.prob_default : NaN;
    kpdEl.textContent = isFinite(pd) ? (pd * 100).toFixed(2) + "%" : "—";

    // Update badge
    badgeEl.className = "badge";
    if (data.decision === "APPROVE") badgeEl.classList.add("approve"), (badgeEl.textContent = "APPROVE");
    else if (data.decision === "CONDITIONAL") badgeEl.classList.add("conditional"), (badgeEl.textContent = "CONDITIONAL");
    else if (data.decision === "REJECT") badgeEl.classList.add("reject"), (badgeEl.textContent = "REJECT");
    else badgeEl.textContent = "—";

    // Animate result card pop
    if (window.gsap) {
      gsap.from("#resultCard", { scale: 0.98, opacity: 0.6, duration: 0.35, ease: "power2.out" });
      gsap.from("#badge", { y: -6, duration: 0.35, ease: "power2.out" });
      gsap.from("#kpd", { y: 6, duration: 0.35, ease: "power2.out" });
    }
  } catch (e) {
    console.error("Request failed:", e);
    badgeEl.className = "badge"; badgeEl.textContent = "—";
    kpdEl.textContent = "—";
    alert("Something went wrong scoring this application. Please try again.");
  } finally {
    goBtn.disabled = false;
    goBtn.style.transform = "";
  }
  // ---------- Funny messages pool ----------
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

// ---------- Utilities ----------
const sleep = (ms) => new Promise(res => setTimeout(res, ms));

function pickRandomMessages(arr, n) {
  const pool = [...arr];
  const picks = [];
  while (picks.length < n && pool.length) {
    const i = Math.floor(Math.random() * pool.length);
    picks.push(pool.splice(i, 1)[0]);
  }
  return picks;
}

// Typewriter effect for a single message
async function typeText(el, text, speed = 20) {
  el.textContent = "";
  el.classList.add("typing-caret");
  for (let i = 0; i < text.length; i++) {
    el.textContent += text[i];
    await sleep(speed);
  }
  el.classList.remove("typing-caret");
}

// Erase text (optional little fade)
async function clearText(el, holdMs = 500) {
  await sleep(holdMs);
  el.textContent = "";
}

// Show 3 typed messages in sequence
async function showTypedLoading(statusEl) {
  const messages = pickRandomMessages(FUNNY_MESSAGES, 3);
  for (const msg of messages) {
    await typeText(statusEl, msg, 16); // typing speed (ms per char)
    await clearText(statusEl, 700);    // pause before next line
  }
}

// ---------- Hook up the button ----------
document.getElementById("go").addEventListener("click", async () => {
  const statusEl = document.getElementById("status");
  const resultEl = document.getElementById("result");
  const btn = document.getElementById("go");

  // hide old result, show status
  resultEl.hidden = true;
  statusEl.textContent = "Starting evaluation…";
  btn.disabled = true;

  // Build your payload from the form (replace with your existing code)
  const payload = buildPayloadFromForm(); // <- use your current builder

  // Start API call in parallel
  const apiPromise = fetch(`${BASE}/predict`, {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify(payload)
  }).then(r => r.json()).catch(err => ({ error: String(err) }));

  // Run the typewriter loading sequence
  await showTypedLoading(statusEl);

  // Wait for (or use) the API result
  const data = await apiPromise;

  // Render final outcome
  statusEl.textContent = "";
  btn.disabled = false;

  if (data && !data.error) {
    // Update your badge + PD UI
    const badge = document.getElementById('badge');
    const kpd = document.getElementById('kpd');

    const pd = typeof data.prob_default === "number" ? data.prob_default : NaN;
    kpd.textContent = isFinite(pd) ? (pd * 100).toFixed(2) + "%" : "—";

    badge.className = "badge";
    if (data.decision === "APPROVE") { badge.classList.add("approve"); badge.textContent="APPROVE"; }
    else if (data.decision === "CONDITIONAL") { badge.classList.add("conditional"); badge.textContent="CONDITIONAL"; }
    else if (data.decision === "REJECT") { badge.classList.add("reject"); badge.textContent="REJECT"; }
    else { badge.textContent = "—"; }

    resultEl.hidden = false;
  } else {
    statusEl.textContent = "Something went wrong. Please try again.";
  }
});

// Example stub — replace with your real form collector
function buildPayloadFromForm() {
  const get = (id) => document.getElementById(id);
  const delinq_2yrs = parseInt(get('delinq_2yrs').value || 0, 10);
  const monthly_income = parseFloat(get('monthly_income').value || 0);
  const monthly_debt = parseFloat(get('monthly_debt').value || 0);
  const emp_length_num = parseInt(get('emp_length').value, 10);
  const grade = get('grade').value;
  const subgrade = get('subgrade').value;
  const home_ownership = get('home_ownership').value;
  const inq_last_6mths = parseInt(get('inq6').value || 0, 10);
  const open_acc = parseInt(get('open_acc').value || 0, 10);
  const revol_util = Math.max(0, Math.min(100, parseFloat(get('revol_util').value || 0)));
  const pub_rec = parseInt(get('pub_rec').value || 0, 10);
  const last_delinq_none = get('any_delinq').value === "0" ? 1 : 0;
  const last_major_derog_none = get('any_derog').value === "0" ? 1 : 0;
  const short_emp = parseInt(get('short_emp').value, 10);
  const purpose = get('purpose').value;

  const subGradeNum = (sg) => {
    const m = /^([A-G])([1-5])$/.exec(String(sg).toUpperCase().trim());
    if (!m) return 10;
    const letter = m[1].charCodeAt(0) - 64; // A=1..G=7
    const num = parseInt(m[2], 10);         // 1..5
    return (letter - 1) * 5 + num;          // 1..35
  };

  const pct = (num, den) => den > 0 ? (num / den) * 100 : 0;
  const dti = Math.max(0, Math.min(100, pct(monthly_debt, monthly_income)));
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
}

});
