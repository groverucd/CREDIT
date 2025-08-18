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
});
