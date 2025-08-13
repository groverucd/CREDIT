const BASE = window.API_BASE || "";
document.getElementById("apiBase").textContent = BASE;

const form = document.getElementById("form");
const spinner = document.getElementById("spinner");
const result = document.getElementById("result");
const decisionEl = document.getElementById("decision");
const probEl = document.getElementById("prob");
const jsonEl = document.getElementById("json");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const age = +document.getElementById("age").value;
  const income = +document.getElementById("income").value;
  const loan = +document.getElementById("loan").value;
  const score = +document.getElementById("score").value;

  // simple validation
  if (age < 18 || income < 0 || loan < 0 || score < 300 || score > 850) {
    alert("Please check your inputs (age≥18, income≥0, loan≥0, score 300–850).");
    return;
  }

  spinner.classList.remove("hidden");

  try {
    const r = await fetch(`${BASE}/predict_simple`, {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify({ age, income, loan_amount: loan, credit_score: score })
    });

    const data = await r.json();
    spinner.classList.add("hidden");
    result.classList.remove("hidden");

    // set decision badge
    decisionEl.textContent = data.decision || "—";
    decisionEl.classList.remove("ok","warn","bad");
    if (data.decision === "APPROVE") decisionEl.classList.add("ok");
    else if (data.decision === "CONDITIONAL") decisionEl.classList.add("warn");
    else decisionEl.classList.add("bad");

    // format probability
    const p = (data.prob_default ?? 0);
    probEl.textContent = (Math.round(p * 10000) / 100).toFixed(2) + "%";

    // raw JSON
    jsonEl.textContent = JSON.stringify(data, null, 2);
  } catch (err) {
    spinner.classList.add("hidden");
    result.classList.remove("hidden");
    decisionEl.textContent = "ERROR";
    decisionEl.classList.remove("ok","warn"); decisionEl.classList.add("bad");
    probEl.textContent = "—";
    jsonEl.textContent = String(err);
  }
});
