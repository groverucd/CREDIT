(async () => {
  const r = await fetch("https://credit-6wok.onrender.com/predict_simple", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      age: 35,
      income: 50000,
      loan_amount: 10000,
      credit_score: 700
    })
  });
  const data = await r.json();
  console.log(data);
})();

