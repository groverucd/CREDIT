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
    camera.position.z = 5;

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
    scene.add(new Points(geom, mat));

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
  })();

  // ------------- GSAP + ScrollTrigger + ScrollSmoother -------------
  (function gsapAnims() {
    if (!window.gsap) return;
    gsap.registerPlugin(ScrollTrigger, ScrollSmoother);

    // Smooth scroll for whole page
    const scrollerSmoother = ScrollSmoother.create({
      wrapper: '#scrollwrapper',
      content: '#content',
      smooth: 1,
      effects: false
    });

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

   // ===== Techy SCROLL overlay: noise circles + timeline =====
gsap.registerPlugin(ScrollTrigger);

// use the renamed outer container if present
const techContent = document.querySelector('#smooth-content') || document.body;

/* circles */
const simplex = new SimplexNoise();
for (let i = 0; i < 1800; i++) {              // keep this ~2k; 5k is heavy
  const div = document.createElement('div');
  div.classList.add('circle');
  const n1 = simplex.noise2D(i * 0.003, i * 0.0033);
  const n2 = simplex.noise2D(i * 0.002, i * 0.001);
  Object.assign(div.style, {
    transform: `translate(${n2 * 200}px) rotate(${n2 * 270}deg) scale(${3 + n1 * 2}, ${3 + n2 * 2})`,
    boxShadow: `0 0 0 .2px hsla(${Math.floor(i * 0.3)}, 70%, 70%, .6)`
  });
  techContent.appendChild(div);
}
const Circles = document.querySelectorAll('.circle');
const main = gsap.timeline({
  scrollTrigger: {
    scrub: 0.7,
    start: "top 25%",
    end: "bottom bottom"
  }
});
Circles.forEach((circle) => main.to(circle, { opacity: 1 }, 0));

    // Training cards pop
    gsap.from(".slide", {
      scrollTrigger: { trigger: ".training", start: "top 70%" },
      y: 24, opacity: 0, duration: 0.7, stagger: 0.12, ease: "power2.out"
    });

    // CTA entrance + button micro-motion
    gsap.from("#cta .cta-inner > *", {
      scrollTrigger: { trigger: "#cta", start: "top 75%" },
      y: 20, opacity: 0, duration: 0.7, stagger: 0.08, ease: "power2.out"
    });
    gsap.to(".cta-animated", {
      scrollTrigger: { trigger: "#cta", start: "top 75%" },
      duration: 2.5, repeat: -1, yoyo: true, ease: "sine.inOut",
      y: -2
    });
  })();

  // ------------- Scroll-driven Credit Dial (horizontal, glowing, ticks) -------------
  (function dial() {
    if (!window.gsap) return;
    const section = document.querySelector("#dial");
    const bgArc = document.querySelector("#bg-arc");
    const arc = document.querySelector("#progress-arc");
    const pointer = document.querySelector("#pointer");
    const ticksGroup = document.querySelector("#ticks");
    const scoreEl = $("score-text");
    if (!section || !bgArc || !arc || !pointer || !ticksGroup || !scoreEl) return;

    const ARC_LEN = bgArc.getTotalLength();
    arc.style.strokeDasharray = `${ARC_LEN}`;
    arc.style.strokeDashoffset = `${ARC_LEN}`;

    // Build ticks (every 25, major every 100 from 300..850) with radial normals
    const fromScore = 300, toScore = 850;
    const range = toScore - fromScore; // 550
    const scoreToLen = (score) => ((score - fromScore) / range) * ARC_LEN;
    const mkTick = (score, major=false) => {
      const l = scoreToLen(score);
      const p = bgArc.getPointAtLength(l);
      const p2 = bgArc.getPointAtLength(Math.min(l + 0.1, ARC_LEN));
      const dx = p2.x - p.x, dy = p2.y - p.y;
      const len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len, ny = dx / len; // normal
      const lenTick = major ? 14 : 9;

      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("x1", p.x);
      line.setAttribute("y1", p.y);
      line.setAttribute("x2", p.x + nx * lenTick);
      line.setAttribute("y2", p.y + ny * lenTick);
      line.setAttribute("class", "tick-line" + (major ? " major" : ""));
      ticksGroup.appendChild(line);

      if (major) {
        const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
        label.setAttribute("x", p.x + nx * (lenTick + 10));
        label.setAttribute("y", p.y + ny * (lenTick + 10));
        label.setAttribute("class", "tick-label");
        label.textContent = score.toString();
        ticksGroup.appendChild(label);
      }
    };
    for (let s = fromScore; s <= toScore; s += 25) {
      mkTick(s, s % 100 === 0 || s === fromScore || s === toScore);
    }

    const lerp = (a, b, t) => a + (b - a) * t;
    const scoreFrom = (p) => Math.round(lerp(fromScore, toScore, p));
    const colorFor = (score) => {
      const t = (score - fromScore) / range;
      const hue = lerp(0, 120, t); // red->green
      return `hsl(${hue} 80% 56%)`;
    };

    ScrollTrigger.create({
      trigger: section,
      start: "top top",
      end: "bottom+=120% top",
      pin: true,
      scrub: true,
      onUpdate: (self) => {
        const p = clamp(self.progress, 0, 1);
        const score = scoreFrom(p);
        const color = colorFor(score);
        const offset = ARC_LEN * (1 - p);

        arc.style.strokeDashoffset = `${offset}`;
        arc.style.stroke = color;
        scoreEl.textContent = String(score);

        const pt = bgArc.getPointAtLength(ARC_LEN * p);
        pointer.setAttribute("cx", pt.x);
        pointer.setAttribute("cy", pt.y);
        pointer.setAttribute("fill", color);
      }
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
  function renderDecision(data){
    const pd = typeof data.prob_default === "number" ? data.prob_default : NaN;
    $("kpd").textContent = isFinite(pd) ? (pd*100).toFixed(2) + "%" : "—";
    const b = $("badge"); b.className = "badge";
    if (data.decision === "APPROVE") { b.classList.add("approve"); b.textContent = "APPROVE"; }
    else if (data.decision === "CONDITIONAL") { b.classList.add("conditional"); b.textContent = "CONDITIONAL"; }
    else if (data.decision === "REJECT") { b.classList.add("reject"); b.textContent = "REJECT"; }
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
      await showLoadingSequence(statusEl);   // wait for all fun lines
      const data = await apiPromise; statusEl.textContent = "";
      if (data && !data.error) renderDecision(data);
      else statusEl.textContent = "Sorry, something went wrong. Please try again.";
      goBtn.disabled = false;
    });
  }
})();
