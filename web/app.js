(() => {
    // ------------- Utils -------------
    const BASE = window.location.origin.includes("onrender.com")
      ? window.location.origin
      : "https://credit-6wok.onrender.com";
  
    const $ = (id) => document.getElementById(id);
    const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
    const pct = (a, b) => (b > 0 ? (a / b) * 100 : 0);
    const subGradeNum = (sg) => {
      const m = /^([A-G])([1-5])$/.exec(String(sg).toUpperCase().trim());
      if (!m) return 10;
      return (m[1].charCodeAt(0) - 65) * 5 + parseInt(m[2], 10) + 1; // 1..35
    };
  
    const apiBaseEl = $("apiBase"); if (apiBaseEl) apiBaseEl.textContent = BASE;
    const yearEl = $("year"); if (yearEl) yearEl.textContent = new Date().getFullYear();
  
    // ------------- Three.js background -------------
    (function stars() {
      const canvas = $("bg3d");
      if (!canvas || !window.THREE) return;
      
  
      const { Scene, PerspectiveCamera, WebGLRenderer, PointsMaterial, BufferGeometry, Float32BufferAttribute, Points, Color } = THREE;
      const scene = new Scene();
      const camera = new PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 1000);
      camera.position.z = 1;
  
      const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true });
      renderer.setPixelRatio(devicePixelRatio);
      renderer.setSize(innerWidth, innerHeight);
      const COUNT = 800;
      const pos = new Float32Array(COUNT * 3);
      for (let i = 0; i < pos.length; i += 3) {
        pos[i] = (Math.random() - 0.5) * 20;
        pos[i + 1] = (Math.random() - 0.5) * 12;
        pos[i + 2] = Math.random() * -20;
      }
      const geom = new BufferGeometry(); geom.setAttribute("position", new Float32BufferAttribute(pos, 3));
      const mat = new PointsMaterial({ size: 0.02, color: new Color("#8ab4ff") });
      mat.transparent = true;            // allow opacity
      mat.opacity = 0.9;                 // crisp dots
      mat.sizeAttenuation = true;        // scale with distance
      mat.depthWrite = false;            // prevent z-write artifacts

// expose to theme toggle
window.__starsMat = mat;
window.__starsRenderer = renderer; // optional if you ever need renderer later
      window.__starsMat = mat; // <-- expose so toggle can edit it
      scene.add(new Points(geom, mat));
      const isLight = document.body.getAttribute('data-theme') === 'light';
      mat.color.set(isLight ? 0x000000 : 0xffffff);
      mat.needsUpdate = true;
  
      addEventListener("resize", () => {
        camera.aspect = innerWidth / innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(innerWidth, innerHeight);
      });

      
      const loop = () => {
        const t = performance.now();
        camera.position.x = Math.sin(t * 0.0008) * 0.3;
        camera.position.y = Math.cos(t * 0.0005) * 0.15;
        camera.lookAt(0, 0, 0);
        renderer.render(scene, camera);
        requestAnimationFrame(loop);
      };
      loop();
      // -------- Theme toggle: flips CSS vars + stars color white<->black --------

      // ---- Dark Mode Toggle ----
})();
  
    // ------------- GSAP + ScrollTrigger (HERO + MOSAIC ONLY) -------------
    (function gsapAnims() {
      if (!window.gsap) return;
      gsap.registerPlugin(ScrollTrigger);
  
      // Fade the huge hero headline out as you scroll past the hero
      gsap.to(".hero-text", {
        opacity: 0,
        yPercent: -10,
        ease: "power2.out",
        scrollTrigger: { trigger: "#hero", start: "top top", end: "bottom top", scrub: true }
      });
  
      // Mosaic images parallax: slight y and alternating x motion
      const grid = document.querySelector(".images");
      if (grid) {
        gsap.utils.toArray(".images img").forEach((img, i) => {
          const s = parseFloat(img.getAttribute("data-speed") || "1");
          const dir = i % 2 === 0 ? -1 : 1;   // alternate left/right
          gsap.to(img, {
            xPercent: dir * 40 * (2 - s),    // stronger for slower speeds
            yPercent: (1 - s) * 30,
            ease: "none",
            scrollTrigger: { trigger: grid, start: "top bottom", end: "bottom top", scrub: true }
          });
        });
      }
    })();
  
    // ------------- Scroll-driven Credit Dial (pinned, ticks) -------------
    (function dial() {
      if (!window.gsap) return;
      const section = document.querySelector("#dial");
      const svg = document.querySelector(".dial-svg");
      const bgArc = document.querySelector("#bg-arc");
      const arc = document.querySelector("#progress-arc");
      const pointer = document.querySelector("#pointer");
      const ticksGroup = document.querySelector("#ticks");
      const scoreEl = $("score-text");
      if (!section || !svg || !bgArc || !arc || !pointer || !ticksGroup || !scoreEl) return;
  
      // Prepare arc dash
      const ARC_LEN = bgArc.getTotalLength();
      arc.style.strokeDasharray = `${ARC_LEN}`;
      arc.style.strokeDashoffset = `${ARC_LEN}`;
  
      // Build ticks (every 25; major at 100s + ends)
      const fromScore = 300, toScore = 850;
      const range = toScore - fromScore; // 550
      const scoreToLen = (score) => ((score - fromScore) / range) * ARC_LEN;
  
      const mkTick = (score, major = false) => {
        const l = scoreToLen(score);
        const p = bgArc.getPointAtLength(l);
  
        // approximate tangent by sampling a nearby point
        const eps = 0.5;
        const p2 = bgArc.getPointAtLength(Math.min(ARC_LEN, l + eps));
        const dx = p2.x - p.x;
        const dy = p2.y - p.y;
  
        // normal vector (perpendicular to tangent)
        const nx = -dy;
        const ny = dx;
        const nLen = Math.hypot(nx, ny);
        const ux = nx / nLen;
        const uy = ny / nLen;
  
        const tickLength = major ? 14 : 9;
        const labelOffset = 22;
  
        const x1 = p.x;
        const y1 = p.y;
        const x2 = p.x + ux * tickLength;
        const y2 = p.y + uy * tickLength;

        // add label for major
        if (major) {
          const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
          label.setAttribute("x", p.x + ux * labelOffset);
          label.setAttribute("y", p.y + uy * labelOffset + 4);
          label.setAttribute("text-anchor", "middle");
          label.setAttribute("alignment-baseline", "middle");
          label.setAttribute("class", "tick-label");
          label.textContent = score.toString();
          ticksGroup.appendChild(label);
        }
      };
  
      // draw ticks now
      for (let s = fromScore; s <= toScore; s += 25) {
        mkTick(s, s % 100 === 0 || s === fromScore || s === toScore);
      }
  
      // Helpers
      const lerp = (a, b, t) => a + (b - a) * t;
      const scoreFrom = (p) => Math.round(lerp(fromScore, toScore, p));
      const colorFor = (score) => {
        // red (0deg) -> yellow (50%) -> green (120deg). Map 300..850 to 0..1
        const t = (score - fromScore) / range;
        const hue = lerp(0, 120, t); // HSL hue
        return `hsl(${hue} 80% 56%)`;
      };
  
      // Dial pin & scrub (shorter, with spacing)
      ScrollTrigger.create({
        trigger: section,
        start: "top top",
        end: "bottom+=60% top",
        pin: true,
        pinSpacing: true,
        anticipatePin: 1,
        scrub: true,
        onUpdate: (self) => {
          const p = clamp(self.progress, 0, 1);
          const score = scoreFrom(p);
          const color = colorFor(score);
          const offset = ARC_LEN * (1 - p);
  
          arc.style.strokeDashoffset = `${offset}`;
          arc.style.stroke = color;
          scoreEl.textContent = String(score);
  
          // Move pointer to arc point
          const pt = bgArc.getPointAtLength(ARC_LEN * p);
          pointer.setAttribute("cx", pt.x);
          pointer.setAttribute("cy", pt.y);
          pointer.setAttribute("fill", color);
        }
      });
    })();
  
    // ============ POST-DIAL ANIMATIONS (About, Training, CTA, Demo) ============
    (function postDialAnims() {
      if (!window.gsap || !window.ScrollTrigger) return;
  
      // ABOUT: copy + viz enter
      gsap.from("#about .explain-copy > *", {
        scrollTrigger: { trigger: "#about", start: "top 70%", once: true },
        y: 24, opacity: 0, duration: 0.7, ease: "power2.out", stagger: 0.08
      });
  
      gsap.from("#about .viz-card", {
        scrollTrigger: { trigger: "#about .viz-card", start: "top 80%", once: true },
        y: 28, opacity: 0, scale: 0.98, duration: 0.7, ease: "power2.out"
      });
  
      // Bars grow once (single source of truth)
      const bars = document.querySelectorAll("#about .viz-bars .bar rect");
      bars.forEach((rect) => {
        const w = parseFloat(rect.parentElement.getAttribute("data-w") || "160");
        gsap.fromTo(rect, { width: 0 }, {
          scrollTrigger: { trigger: "#about .viz-bars", start: "top 75%", once: true },
          width: w, duration: 1.0, ease: "power3.out"
        });
      });
  
      // TRAINING: staggered cards
      gsap.from("#training .slide", {
        scrollTrigger: { trigger: "#training", start: "top 70%", once: true },
        y: 30, opacity: 0, rotateX: 6, transformOrigin: "top center",
        duration: 0.7, ease: "power2.out", stagger: 0.12
      });
  
      // CTA: entrance + gentle breathing
      const ctaTl = gsap.timeline({
        scrollTrigger: { trigger: "#cta", start: "top 75%", once: true }
      });
      ctaTl
        .from("#cta h2", { y: 20, opacity: 0, duration: 0.6, ease: "power2.out" })
        .from("#cta .cta-diff", { y: 18, opacity: 0, duration: 0.55, ease: "power2.out" }, "-=0.25")
        .from("#cta .cta-animated", { y: 12, opacity: 0, duration: 0.55, ease: "power2.out" }, "-=0.25");
  
      gsap.to("#cta .cta-animated", {
        scrollTrigger: { trigger: "#cta", start: "top 80%", end: "bottom top", toggleActions: "play pause resume pause" },
        y: -2, duration: 2.2, repeat: -1, yoyo: true, ease: "sine.inOut"
      });
  
      // DEMO panels
      gsap.from("#demo .panel", {
        scrollTrigger: { trigger: "#demo", start: "top 75%", once: true },
        y: 24, opacity: 0, duration: 0.6, ease: "power2.out", stagger: 0.08
      });
  
      // Subtle parallax on training/cta (optional)
      gsap.to("#training", {
        backgroundPositionY: "-5vh",
        scrollTrigger: { trigger: "#training", start: "top bottom", end: "bottom top", scrub: 0.5 }
      });
      gsap.to("#cta", {
        backgroundPositionY: "-4vh",
        scrollTrigger: { trigger: "#cta", start: "top bottom", end: "bottom top", scrub: 0.5 }
      });
    })();
  
    // ------------- Wizard + API + Funny loader -------------
    const steps = Array.from(document.querySelectorAll(".step"));
    const dots  = Array.from(document.querySelectorAll("[data-step-dot]"));
    let current = 0;
  
    function showStep(i){
      current = i;
      steps.forEach((s, idx) => s.classList.toggle("active", idx === i));
      dots.forEach((d, idx) => d.classList.toggle("active", idx <= i));
      if (window.gsap) {
        const s = steps[i];
        gsap.fromTo(s, { y: 12, opacity: 0 }, { y: 0, opacity: 1, duration: .35, ease: "power2.out" });
      }
    }
    function nextStep(){ if (current < steps.length - 1) showStep(current + 1); }
    function prevStep(){ if (current > 0) showStep(current - 1); }
    document.querySelectorAll(".step .next").forEach(b => b.addEventListener("click", nextStep));
    document.querySelectorAll(".step .prev").forEach(b => b.addEventListener("click", prevStep));
  
    const purposeEl = $("purpose");
    const loanAmountField = $("loan-amount-field");
    function updateLoanAmountVisibility(){
      if (!purposeEl || !loanAmountField) return;
      loanAmountField.style.display = purposeEl.value === "credit_card" ? "none" : "";
    }
    if (purposeEl) purposeEl.addEventListener("change", updateLoanAmountVisibility);
    updateLoanAmountVisibility();
  
    const badgeEl = $("badge");
    const kpdEl = $("kpd");
    const resetBtn = $("reset");
    if (resetBtn) resetBtn.addEventListener("click", () => {
      document.querySelectorAll("input[type=number]").forEach(inp => {
        const defaults = { revol_util:30, open_acc:5, inq6:1, monthly_income:5000, monthly_debt:500, loan_amount:10000, delinq_2yrs:0, pub_rec:0 };
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
      badgeEl.className = "badge"; badgeEl.textContent = "—";
      kpdEl.textContent = "—";
      $("status").textContent = "";
      $("result").hidden = true;
      showStep(0);
    });
  
    function makePayload(){
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
        delinq_2yrs, delinq_2yrs_zero, dti, emp_length_num, grade, home_ownership, inq_last_6mths,
        last_delinq_none, last_major_derog_none, open_acc, payment_inc_ratio, pub_rec, pub_rec_zero,
        purpose, revol_util, short_emp, sub_grade_num
      };
    }
  
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
      "Processing your application—please hold while we consult the Magic 8-Ball..."
    ];
    const sleep = (ms) => new Promise(r => setTimeout(r, ms));
    const pickRandom = (arr, n) => { const p=[...arr], o=[]; while(o.length<n && p.length){ o.push(p.splice(Math.floor(Math.random()*p.length),1)[0]); } return o; };
    async function typeText(el, text, speed = 22){
      el.textContent = ""; el.classList.add("typing-caret");
      for (let i=0;i<text.length;i++){ el.textContent += text[i]; await sleep(speed); }
      el.classList.remove("typing-caret");
    }
    async function showLoadingSequence(statusEl){
      const lines = pickRandom(FUNNY_MESSAGES, 3 + Math.floor(Math.random()*2)); // 3-4 lines
      for (const line of lines){ await typeText(statusEl, line, 22); await sleep(800); statusEl.textContent = ""; }
    }
  
    async function runScoring(){
      const r = await fetch(`${BASE}/predict`, { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify(makePayload()) });
      return r.json();
    }
  
    // --------- Reasons (why decision) ----------
    function getCurrentInputs() {
      const valN = (id, d=0) => parseFloat((document.getElementById(id)?.value ?? d));
      const valI = (id, d=0) => parseInt((document.getElementById(id)?.value ?? d), 10);
      const valS = (id) => (document.getElementById(id)?.value ?? "");
  
      const monthly_income = valN("monthly_income", 0);
      const monthly_debt   = valN("monthly_debt", 0);
      const dti            = clamp((monthly_debt / Math.max(1, monthly_income)) * 100, 0, 100);
      const revol_util     = clamp(valN("revol_util", 0), 0, 100);
      const inq6           = valI("inq6", 0);
      const delinq_2yrs    = valI("delinq_2yrs", 0);
      const pub_rec        = valI("pub_rec", 0);
      const any_derog      = (document.getElementById("any_derog")?.value === "1");
      const any_delinq     = (document.getElementById("any_delinq")?.value === "1");
      const emp_length_num = valI("emp_length", 0);
      const open_acc       = valI("open_acc", 0);
      const grade          = valS("grade");
      const subgrade       = valS("subgrade");
  
      return {
        monthly_income, monthly_debt, dti, revol_util, inq6,
        delinq_2yrs, pub_rec, any_derog, any_delinq,
        emp_length_num, open_acc, grade, subgrade
      };
    }
    function explainDecision(decision) {
      const x = getCurrentInputs();
      const bullets = [];
  
      // Negative contributors
      if (x.dti > 45)       bullets.push(`High debt‑to‑income (${x.dti.toFixed(1)}% > 45%).`);
      else if (x.dti > 35)  bullets.push(`Moderate debt‑to‑income (${x.dti.toFixed(1)}% > 35%).`);
  
      if (x.revol_util > 80)       bullets.push(`Very high credit utilization (${x.revol_util.toFixed(0)}% > 80%).`);
      else if (x.revol_util > 60)  bullets.push(`High credit utilization (${x.revol_util.toFixed(0)}% > 60%).`);
  
      if (x.inq6 >= 3)       bullets.push(`Several recent hard inquiries (${x.inq6}).`);
      if (x.delinq_2yrs > 0) bullets.push(`Recent delinquencies (${x.delinq_2yrs} in last 2 years).`);
      if (x.pub_rec > 0)     bullets.push(`Public records present (${x.pub_rec}).`);
      if (x.any_derog)       bullets.push(`Major derogatory item reported (e.g., bankruptcy/charge‑off).`);
  
      // Positive contributors
      const positives = [];
      if (x.dti <= 30)         positives.push(`Low debt‑to‑income (${x.dti.toFixed(1)}% ≤ 30%).`);
      if (x.revol_util <= 40)  positives.push(`Low credit utilization (${x.revol_util.toFixed(0)}% ≤ 40%).`);
      if (x.inq6 <= 1)         positives.push(`Few recent inquiries (${x.inq6}).`);
      if (x.delinq_2yrs === 0) positives.push(`No recent delinquencies.`);
      if (x.pub_rec === 0)     positives.push(`No public records.`);
      if (!x.any_derog)        positives.push(`No major derogatory items.`);
      if (x.emp_length_num >= 8) positives.push(`Stable employment history (≥ 6 years).`);
  
      let headline = "";
      let reasons = [];
      if (decision === "APPROVE") {
        headline = "Key factors that supported approval:";
        reasons  = positives.slice(0, 4).concat(bullets.slice(0, 2));
      } else if (decision === "REJECT") {
        headline = "Primary factors that led to rejection:";
        reasons  = bullets.slice(0, 5);
        if (reasons.length < 3) reasons = bullets.concat(positives.slice(0, 2));
      } else { // CONDITIONAL
        headline = "Why this is conditional (what to improve):";
        reasons  = bullets.slice(0, 4).concat(positives.slice(0, 2));
      }
  
      return { headline, reasons };
    }
  
    function renderDecision(data){
      const pd = typeof data.prob_default === "number" ? data.prob_default : NaN;
      $("kpd").textContent = isFinite(pd) ? (pd*100).toFixed(2) + "%" : "—";
      const b = $("badge"); b.className = "badge";
  
      // ---- Render reasons in details box ----
      const box = document.getElementById("reasonsBox");
      const list = document.getElementById("reasonsList");
      if (box && list) {
        const { headline, reasons } = explainDecision(data.decision || "");
        const summary = box.querySelector("summary");
        if (summary) summary.textContent = headline;
        list.innerHTML = "";
        reasons.forEach(r => {
          const li = document.createElement("li");
          li.textContent = r;
          list.appendChild(li);
        });
      }
  
      if (data.decision === "APPROVE") {
        b.classList.add("approve");
        b.textContent = "APPROVE";
  
        // Confetti celebration
        try {
          const duration = 1500;
          const end = Date.now() + duration;
          const colors = ["#34d399", "#8ab4ff", "#fbbf24", "#ffffff"];
          (function frame() {
            confetti({ particleCount: 10, spread: 70, startVelocity: 40, ticks: 200, origin: { x: 0.12 + Math.random()*0.1, y: 0.1 }, colors });
            confetti({ particleCount: 10, spread: 70, startVelocity: 40, ticks: 200, origin: { x: 0.88 - Math.random()*0.1, y: 0.1 }, colors });
            if (Date.now() < end) requestAnimationFrame(frame);
          })();
        } catch {}
      }
      else if (data.decision === "CONDITIONAL") {
        b.classList.add("conditional");
        b.textContent = "CONDITIONAL";
  
        // Floating question marks
        for (let i = 0; i < 5; i++) {
          const q = document.createElement("div");
          q.textContent = "❓";
          q.style.position = "fixed";
          q.style.left = Math.random() * 100 + "vw";
          q.style.bottom = "-50px";
          q.style.fontSize = "32px";
          q.style.opacity = "0.7";
          document.body.appendChild(q);
  
          gsap.to(q, { y: -200, opacity: 0, duration: 2 + Math.random(), ease: "power1.out", onComplete: () => q.remove() });
        }
      }
      else if (data.decision === "REJECT") {
        b.classList.add("reject");
        b.textContent = "REJECT";
  
        // Shake the result card quickly
        gsap.fromTo("#resultCard",
          { x: -6 },
          { x: 6, duration: 0.1, yoyo: true, repeat: 5, ease: "power1.inOut" }
        );
      }
      else { b.textContent = "—"; }
  
      $("result").hidden = false;
      if (window.gsap){
        gsap.from("#resultCard",{ scale:0.98, opacity:0.6, duration:0.35, ease:"power2.out" });
        gsap.from("#badge",{ y:-6, duration:0.35, ease:"power2.out" });
        gsap.from("#kpd",{ y:6, duration:0.35, ease:"power2.out" });
      }
    }
  
    const goBtn = $("go");
    if (goBtn){
      goBtn.addEventListener("click", async () => {
        const statusEl = $("status");
        const resultEl = $("result");
        goBtn.disabled = true; resultEl.hidden = true; statusEl.textContent = "Starting evaluation…";
        const apiPromise = runScoring().catch(err => ({ error:String(err) }));
        await showLoadingSequence(statusEl);
        const data = await apiPromise; statusEl.textContent = "";
        if (data && !data.error) renderDecision(data);
        else statusEl.textContent = "Sorry, something went wrong. Please try again.";
        goBtn.disabled = false;
      });
    }
  })();
  // ===== Theme toggle (persisted, safe with hero/dial) =====
(() => {
    const btn = document.getElementById('themeToggle');
    if (!btn) return;
  
    const getStored = () => localStorage.getItem('theme');
    const prefersLight = () => window.matchMedia('(prefers-color-scheme: light)').matches;
  
    const apply = (mode) => {
      if (mode === 'light') document.body.setAttribute('data-theme', 'light');
      else document.body.removeAttribute('data-theme'); // default dark
      localStorage.setItem('theme', mode);
      if (window.__starsMat && window.THREE) {
        if (mode === 'light') {
          // darker, thicker dots that pop on white
          window.__starsMat.color.set("#0b1220");                      // deep navy/black
          window.__starsMat.size = 0.045;                              // a bit larger
          window.__starsMat.blending = THREE.MultiplyBlending;         // multiplies nicely on light bg
        } else {
          // glowy, smaller stars for dark
          window.__starsMat.color.set("#ffffff");
          window.__starsMat.size = 0.02;
          window.__starsMat.blending = THREE.AdditiveBlending;         // glow vibe on dark
        }
        window.__starsMat.needsUpdate = true;
    }
};
    // init
    const saved = getStored();
    apply(saved ? saved : (prefersLight() ? 'light' : 'dark'));
    // Sync stars material on load
    if (window.__starsMat) {
        const current = document.body.dataset.theme;
        window.__starsMat.color.set(current === "light" ? "#000000" : "#ffffff");
    }
    // click to toggle
    btn.addEventListener('click', () => {
    const isLight = document.body.getAttribute('data-theme') === 'light';
    const next = isLight ? 'dark' : 'light';
    apply(next);
    if (window.__starsMat) {
        window.__starsMat.color.set(next === 'light' ? 0x000000 : 0xffffff);
        window.__starsMat.needsUpdate = true;
    }
});
})();
(() => {
    const y = document.getElementById('yearFooter');
    if (y) y.textContent = new Date().getFullYear();
})();
