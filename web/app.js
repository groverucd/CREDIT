(() => {
  // ==========================
  // Base & small utilities
  // ==========================
  const BASE = window.location.origin.includes("onrender.com")
    ? window.location.origin
    : "https://credit-6wok.onrender.com";

  const $ = (id) => document.getElementById(id);
  const apiBaseEl = $("apiBase");
  if (apiBaseEl) apiBaseEl.textContent = BASE;
  const yearEl = $("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
  const pct = (num, den) => (den > 0 ? (num / den) * 100 : 0);

  const subGradeNum = (sg) => {
    const m = /^([A-G])([1-5])$/.exec(String(sg).toUpperCase().trim());
    if (!m) return 10;
    const letter = m[1].charCodeAt(0) - 64; // A->1..G->7
    const num = parseInt(m[2], 10);
    return (letter - 1) * 5 + num; // 1..35
  };

  // ==========================
  // Subtle Three.js background (optional)
  // ==========================
  (function threeBG() {
    const canvas = $("bg3d");
    if (!canvas || !window.THREE) return;

    const {
      Scene,
      PerspectiveCamera,
      WebGLRenderer,
      PointsMaterial,
      BufferGeometry,
      Float32BufferAttribute,
      Points,
      Color,
    } = THREE;

    const scene = new Scene();
    const camera = new PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 1000);
    camera.position.z = 5;

    const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(devicePixelRatio);
    renderer.setSize(innerWidth, innerHeight);

    const COUNT = 800;
    const positions = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * 20;
      positions[i + 1] = (Math.random() - 0.5) * 12;
      positions[i + 2] = Math.random() * -20;
    }
    const geom = new BufferGeometry();
    geom.setAttribute("position", new Float32BufferAttribute(positions, 3));
    const mat = new PointsMaterial({ size: 0.02, color: new Color("#8ab4ff") });
    const stars = new Points(geom, mat);
    scene.add(stars);

    const onResize = () => {
      camera.aspect = innerWidth / innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(innerWidth, innerHeight);
    };
    addEventListener("resize", onResize);

    let t = 0;
    const loop = () => {
      t += 0.0025;
      camera.position.x = Math.sin(t) * 0.3;
      camera.position.y = Math.cos(t * 0.7) * 0.15;
      camera.lookAt(0, 0, 0);
      renderer.render(scene, camera);
      requestAnimationFrame(loop);
    };
    loop();
  })();

  // ==========================
  // GSAP section animations
  // ==========================
  (function gsapSections() {
    if (!window.gsap) return;
    gsap.registerPlugin(ScrollTrigger);

    // Hero in
    gsap.from(".hero-title", { y: 20, opacity: 0, duration: 0.9, ease: "power3.out" });
    gsap.from(".hero-sub", { y: 16, opacity: 0, duration: 0.8, delay: 0.15, ease: "power3.out" });
    gsap.from(".cta-row a", {
      y: 12,
      opacity: 0,
      duration: 0.7,
      delay: 0.3,
      ease: "power3.out",
      stagger: 0.08,
    });

    // Bars animate when visible
    gsap.utils.toArray(".viz-bars .bar").forEach((g) => {
      const rect = g.querySelector("rect");
      const w = parseFloat(g.getAttribute("data-w") || "160");
      gsap.fromTo(
        rect,
        { width: 0 },
        {
          width: w,
          duration: 1,
          ease: "power2.out",
          scrollTrigger: { trigger: ".viz-bars", start: "top 80%" },
        }
      );
    });

    // Training slides pop
    gsap.from(".slide", {
      scrollTrigger: { trigger: ".training", start: "top 70%" },
      y: 24,
      opacity: 0,
      duration: 0.7,
      stagger: 0.12,
      ease: "power2.out",
    });

    // Subtle parallax on hero
    gsap.to("#hero .hero-inner", {
      scrollTrigger: {
        trigger: "#hero",
        start: "top top",
        end: "bottom top",
        scrub: true,
      },
      yPercent: -10,
    });
  })();

  // ==========================
  // SCROLL-DRIVEN CREDIT DIAL
  // ==========================
  (function creditDial() {
    if (!window.gsap) return; // needs GSAP + ScrollTrigger loaded
    const arc = document.querySelector("#progress-arc");
    const scoreEl = $("score-text");
    const section = document.querySelector("#dial");
    if (!arc || !scoreEl || !section) return;

    // Geometry: our path's half-circle length ~377 (already set in markup)
    const ARC_LEN = 377;

    // Map a 0..1 progress to 300..850 with easing
    const lerp = (a, b, t) => a + (b - a) * t;
    const scoreFromProg = (p) => Math.round(lerp(300, 850, p));

    // Color blend: 300-499 (red) -> 500-700 (yellow) -> 701-850 (green)
    function colorFromScore(score) {
      if (score < 500) return "#ef4444"; // red
      if (score <= 700) return "#f59e0b"; // yellow
      return "#10b981"; // green
    }

    // Create a pinned, scrubbed ScrollTrigger for the section
    ScrollTrigger.create({
      trigger: section,
      start: "top top",
      end: "bottom+=100% top", // give extra space to scrub
      pin: true,
      scrub: true,
      onUpdate: (self) => {
        const p = clamp(self.progress, 0, 1); // 0..1
        const score = scoreFromProg(p);
        const color = colorFromScore(score);
        const offset = ARC_LEN * (1 - p);

        arc.style.strokeDasharray = `${ARC_LEN}`;
        arc.style.strokeDashoffset = `${offset}`;
        arc.style.stroke = color;
        scoreEl.textContent = String(score);
      },
    });
  })();

  // ==========================
  // Wizard (4 steps) + UI bits
  // ==========================
  const steps = Array.from(document.querySelectorAll(".step"));
  const dots = Array.from(document.querySelectorAll("[data-step-dot]"));
  let current = 0;

  function showStep(i) {
    current = i;
    steps.forEach((s, idx) => {
      if (idx === i) {
        s.classList.add("active");
        if (window.gsap)
          gsap.fromTo(s, { y: 14, opacity: 0 }, { y: 0, opacity: 1, duration: 0.35, ease: "power2.out" });
      } else {
        s.classList.remove("active");
      }
    });
    dots.forEach((d, idx) => d.classList.toggle("active", idx <= i));
  }
  function nextStep() {
    if (current < steps.length - 1) showStep(current + 1);
  }
  function prevStep() {
    if (current > 0) showStep(current - 1);
  }
  document.querySelectorAll(".step .next").forEach((btn) => btn.addEventListener("click", nextStep));
  document.querySelectorAll(".step .prev").forEach((btn) => btn.addEventListener("click", prevStep));

  // Loan amount visibility rule
  const purposeEl = $("purpose");
  const loanAmountField = $("loan-amount-field");
  function updateLoanAmountVisibility() {
    if (!purposeEl || !loanAmountField) return;
    loanAmountField.style.display = purposeEl.value === "credit_card" ? "none" : "";
  }
  if (purposeEl) purposeEl.addEventListener("change", updateLoanAmountVisibility);
  updateLoanAmountVisibility();

  // Reset
  const badgeEl = $("badge");
  const kpdEl = $("kpd");
  const resetBtn = $("reset");
  if (resetBtn)
    resetBtn.addEventListener("click", () => {
      document.querySelectorAll("input[type=number]").forEach((inp) => {
        const defaults = {
          revol_util: 30,
          open_acc: 5,
          inq6: 1,
          monthly_income: 5000,
          monthly_debt: 500,
          loan_amount: 10000,
          delinq_2yrs: 0,
          pub_rec: 0,
        };
        inp.value = defaults[inp.id] ?? (inp.min || 0);
      });
      $("emp_length").value = "4";
      $("grade").value = "B";
      $("subgrade").value = "B1";
      $("home_ownership").value = "MORTGAGE";
      $("any_delinq").value = "0";
      $("any_derog").value = "0";
      $("short_emp").value = "0";
      $("term").value = "36";
      $("purpose").value = "car";
      updateLoanAmountVisibility();

      badgeEl.className = "badge";
      badgeEl.textContent = "—";
      kpdEl.textContent = "—";
      $("status").textContent = "";
      $("result").hidden = true;
      showStep(0);
    });

  // ==========================
  // Build payload for server (17 features)
  // ==========================
  function makePayload() {
    const getN = (id) => parseFloat($(id).value || 0);
    const getI = (id) => parseInt($(id).value || 0, 10);

    const delinq_2yrs = getI("delinq_2yrs");
    const monthly_income = getN("monthly_income");
    const monthly_debt = getN("monthly_debt");
    const emp_length_num = getI("emp_length");
    const grade = $("grade").value;
    const subgrade = $("subgrade").value;
    const home_ownership = $("home_ownership").value;
    const inq_last_6mths = getI("inq6");
    const open_acc = getI("open_acc");
    const revol_util = clamp(getN("revol_util"), 0, 100);
    const pub_rec = getI("pub_rec");
    const last_delinq_none = $("any_delinq").value === "0" ? 1 : 0;
    const last_major_derog_none = $("any_derog").value === "0" ? 1 : 0;
    const short_emp = getI("short_emp");
    const purpose = $("purpose").value;

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
      sub_grade_num,
    };
  }

  // ==========================
  // Funny loading sequence
  // ==========================
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
    "Consulting the credit gods and crossing our fingers for a positive outcome...",
  ];
  const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
  const pickRandom = (arr, n) => {
    const pool = [...arr],
      out = [];
    while (out.length < n && pool.length) {
      out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
    }
    return out;
  };
  async function typeText(el, text, speed = 22) {
    el.textContent = "";
    el.classList.add("typing-caret");
    for (let i = 0; i < text.length; i++) {
      el.textContent += text[i];
      await sleep(speed);
    }
    el.classList.remove("typing-caret");
  }
  async function showLoadingSequence(statusEl) {
    const count = 3 + Math.floor(Math.random() * 2); // 3 or 4
    const lines = pickRandom(FUNNY_MESSAGES, count);
    for (const line of lines) {
      await typeText(statusEl, line, 22);
      await sleep(800);
      statusEl.textContent = "";
    }
  }

  // ==========================
  // API + result render
  // ==========================
  async function runScoring() {
    const payload = makePayload();
    const r = await fetch(`${BASE}/predict`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return r.json();
  }
  function renderDecision(data) {
    const resultEl = $("result");
    const pd = typeof data.prob_default === "number" ? data.prob_default : NaN;
    const kpd = $("kpd");
    kpd.textContent = isFinite(pd) ? (pd * 100).toFixed(2) + "%" : "—";

    const badge = $("badge");
    badge.className = "badge";
    if (data.decision === "APPROVE") {
      badge.classList.add("approve");
      badge.textContent = "APPROVE";
    } else if (data.decision === "CONDITIONAL") {
      badge.classList.add("conditional");
      badge.textContent = "CONDITIONAL";
    } else if (data.decision === "REJECT") {
      badge.classList.add("reject");
      badge.textContent = "REJECT";
    } else {
      badge.textContent = "—";
    }

    resultEl.hidden = false;
    if (window.gsap) {
      gsap.from("#resultCard", { scale: 0.98, opacity: 0.6, duration: 0.35, ease: "power2.out" });
      gsap.from("#badge", { y: -6, duration: 0.35, ease: "power2.out" });
      gsap.from("#kpd", { y: 6, duration: 0.35, ease: "power2.out" });
    }
  }

  // ==========================
  // Score button handler
  // ==========================
  const goBtn = $("go");
  if (goBtn) {
    goBtn.addEventListener("click", async () => {
      const statusEl = $("status");
      const resultEl = $("result");

      goBtn.disabled = true;
      resultEl.hidden = true;
      statusEl.textContent = "Starting evaluation…";

      const apiPromise = runScoring().catch((err) => ({ error: String(err) }));

      await showLoadingSequence(statusEl); // wait for all lines first

      const data = await apiPromise;
      statusEl.textContent = "";
      if (data && !data.error) {
        renderDecision(data);
      } else {
        statusEl.textContent = "Something went wrong. Please try again.";
      }
      goBtn.disabled = false;
    });
  }

  // ==========================
  // (Optional) parallax for hero images grid if present
  // ==========================
  (function simpleParallax() {
    const grid = document.querySelector(".images");
    if (!grid || !window.gsap) return;
    gsap.utils.toArray(".images img").forEach((img) => {
      const speed = parseFloat(img.getAttribute("data-speed") || "1");
      gsap.to(img, {
        yPercent: (1 - speed) * 30,
        ease: "none",
        scrollTrigger: { trigger: grid, start: "top bottom", end: "bottom top", scrub: true },
      });
    });
  })();
})();
