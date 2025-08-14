// Map sub-grade like "A1".."G5" -> integer 1..35 (A1=1, A2=2, ..., G5=35)
function subGradeToNum(sg) {
  const gradeMap = { A:0, B:5, C:10, D:15, E:20, F:25, G:30 };
  const g = sg[0].toUpperCase();
  const n = parseInt(sg.slice(1), 10); // 1..5
  return (gradeMap[g] || 0) + (n || 1);
}

// Simple monthly payment estimate (very rough): loan / term
function estimateMonthlyPayment(total, termMonths) {
  const t = Math.max(1, Number(termMonths) || 36);
  return Number(total || 0) / t;
}

document.getElementById("score-form").addEventListener("submit", async (e) => {
  e.preventDefault();

  // Raw inputs
  const delinq_2yrs = Number(document.getElementById("delinq_2yrs").value || 0);
  const monthly_income = Number(document.getElementById("monthly_income").value || 0);
  const monthly_debt = Number(document.getElementById("monthly_debt").value || 0);
  const loan_amount = Number(document.getElementById("loan_amount").value || 0);
  const loan_term = Number(document.getElementById("loan_term").value || 36);

  const emp_length_num = Number(document.getElementById("emp_length_num").value);
  const grade = document.getElementById("grade").value;
  const sub_grade = document.getElementById("sub_grade").value;
  const home_ownership = document.getElementById("home_ownership").value;
  const inq_last_6mths = Number(document.getElementById("inq_last_6mths").value || 0);
  const open_acc = Number(document.getElementById("open_acc").value || 0);
  const purpose = document.getElementById("purpose").value;
  const revol_util = Number(document.getElementById("revol_util").value || 0);
  const pub_rec = Number(document.getElementById("pub_rec").value || 0);
  const last_delinq_none = Number(document.getElementById("last_delinq_none").value);
  const last_major_derog_none = Number(document.getElementById("last_major_derog_none").value);
  let short_emp = Number(document.getElementById("short_emp").value);

  // Derive booleans & ratios the model expects
  const delinq_2yrs_zero = delinq_2yrs === 0 ? 1 : 0;
  const pub_rec_zero = pub_rec === 0 ? 1 : 0;

  // very rough estimated loan monthly payment
  const est_payment = estimateMonthlyPayment(loan_amount, loan_term);

  const monthly_income_pos = Math.max(1, monthly_income); // avoid /0
  const dti = ((monthly_debt + est_payment) / monthly_income_pos) * 100;
  const payment_inc_ratio = (est_payment / monthly_income_pos) * 100;

  // If user marks short_emp incorrectly, we can gently derive it (<1yr)
  if (short_emp !== 0 && short_emp !== 1) {
    short_emp = emp_length_num < 1 ? 1 : 0;
  }

  const sub_grade_num = subGradeToNum(sub_grade);

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
  };

  try {
    const r = await fetch("/predict", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const resultBox = document.getElementById("result");
    const pre = document.getElementById("result-json");

    if (!r.ok) {
      const msg = await r.text();
      pre.textContent = `Error ${r.status}: ${msg}`;
      resultBox.classList.remove("hidden");
      return;
    }

    const data = await r.json();
    pre.textContent = JSON.stringify({ inputs: payload, ...data }, null, 2);
    resultBox.classList.remove("hidden");

  } catch (err) {
    const pre = document.getElementById("result-json");
    pre.textContent = `Network error: ${err}`;
    document.getElementById("result").classList.remove("hidden");
  }
});
