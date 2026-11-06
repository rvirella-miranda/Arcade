// Student arcade: join a class, answer questions to earn lives, post runs and best scores.
import { GAMES, W, H, shuffle, bigText } from "./games.js";
import { SAMPLE, esc, normalize, accepted, displayAnswer, isRight, nameKey } from "./questions.js";
import * as data from "./data.js";

const $ = s => document.querySelector(s);
const store = {
  get(k){ try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
  set(k,v){ try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }
};

const PRACTICE = { code:null, title:"Practice", questions:SAMPLE, mode:"auto", misses:3, playTime:45 };
let ctxSet = PRACTICE;
let nick = store.get("aa-nick") || "";
let board = [], boardState = "idle", unwatch = null, boardGame = "maze";

/* ---------------- input ---------------- */
const input = { held:{left:false,right:false,up:false,down:false,action:false}, pressed:new Set(), px:null };
const KEYMAP = {ArrowLeft:"left",KeyA:"left",ArrowRight:"right",KeyD:"right",ArrowUp:"up",KeyW:"up",ArrowDown:"down",KeyS:"down",Space:"action"};
const press = k => { input.pressed.add(k); input.held[k] = true; };
const release = k => { input.held[k] = false; };

/* ---------------- controller ---------------- */
const cv = $("#cv"), cx = cv.getContext("2d"), overlay = $("#overlay");
const A = { gid:null, game:null, state:"idle", score:0, misses:0, right:0, paused:false, token:0, readyT:0, queue:[], mcKeys:null, best:0, answers:[], timeLeft:0, needLife:true };
const api = {
  add(n){ A.score += n; $("#hud-score").textContent = A.score; },
  lose(){
    if(A.state !== "playing") return;
    A.state = "roundover"; A.needLife = true; const tok = A.token; showTime();
    showOverlay(`<div class="center"><div class="big bad">ROUND OVER</div><p style="color:var(--muted)">Score so far: <b style="color:var(--ink)">${A.score}</b>. Answer the next question to keep playing.</p></div>`);
    setTimeout(() => { if(tok === A.token && A.state === "roundover") askQuestion(); }, 1400);
  }
};
let shownTime = null;
function showTime(){
  const el = $("#hud-time"); if(!el) return;
  const v = !ctxSet.playTime ? "∞" : A.state === "playing" || A.state === "ready" ? String(Math.max(0, Math.ceil(A.timeLeft))) : "–";
  if(v !== shownTime){ el.textContent = v; shownTime = v; }
  el.classList.toggle("low", !!ctxSet.playTime && (A.state === "playing") && A.timeLeft <= 10);
}
function timeUp(){
  A.state = "roundover"; A.needLife = false; const tok = A.token; showTime();
  showOverlay(`<div class="center"><div class="big">TIME'S UP!</div><p style="color:var(--muted)">Score so far: <b style="color:var(--ink)">${A.score}</b>. Answer the next question to keep playing from right here.</p></div>`);
  setTimeout(() => { if(tok === A.token && A.state === "roundover") askQuestion(); }, 1400);
}
function showOverlay(html){ overlay.innerHTML = html; overlay.hidden = false; }
function hideOverlay(){ overlay.hidden = true; overlay.innerHTML = ""; }
function renderPips(){ const p = $("#hud-pips"); p.innerHTML = ""; for(let i=0;i<ctxSet.misses;i++){ const s = document.createElement("span"); s.className = "pip" + (i < A.misses ? " used" : ""); p.appendChild(s); } }

function startRun(gid){
  A.token++; A.gid = gid; A.game = GAMES[gid].make(api); A.game.reset();
  Object.assign(A, { score:0, misses:0, right:0, paused:false, queue:shuffle(ctxSet.questions.map((_,i)=>i)), curQ:null, answers:[], timeLeft:0, needLife:true }); showTime();
  A.best = getBest(gid);
  $("#hud-game").textContent = GAMES[gid].name; $("#hud-game").style.color = GAMES[gid].color;
  $("#hud-score").textContent = "0"; $("#hud-best").textContent = A.best; $("#hud-right").textContent = "0";
  $("#hint").textContent = A.game.hint + " Press P to pause.";
  $("#btn-pause").textContent = "Pause";
  renderPips(); showView("play"); askQuestion();
  if(!raf){ last = performance.now(); raf = requestAnimationFrame(frame); }
}
// Each question is asked once per run. When they've all been asked, the run ends.
function nextQ(){ return ctxSet.questions[A.queue.pop()]; }

function askQuestion(repeat){
  if(!repeat && !A.queue.length){ endRun(); return; }
  A.state = "question"; input.pressed.clear(); for(const k in input.held) input.held[k] = false;
  const q = repeat && A.curQ ? A.curQ : nextQ(), disp = displayAnswer(q.a); A.curQ = q;
  let mc = ctxSet.mode === "mc" || (ctxSet.mode === "auto" && q.wrong && q.wrong.length > 0), choices = null;
  if(mc){
    let wrong = (q.wrong || []).slice(0,3);
    if(!wrong.length) wrong = shuffle([...new Set(ctxSet.questions.map(o => displayAnswer(o.a)).filter(a => a && normalize(a) !== normalize(disp)))]).slice(0,3);
    if(!wrong.length) mc = false; else choices = shuffle([disp, ...wrong]);
  }
  const left = ctxSet.misses - A.misses, num = A.right + A.misses + 1, total = ctxSet.questions.length;
  const body = mc
    ? `<div class="choices">${choices.map((c,i)=>`<button class="choice" type="button" data-i="${i}"><span class="k">${i+1}</span><span>${esc(c)}</span></button>`).join("")}</div>`
    : `<form class="typed" id="typed-form" autocomplete="off"><input type="text" id="typed-in" placeholder="Type your answer" aria-label="Your answer" maxlength="100"><button class="btn" type="submit">Check</button></form>`;
  showOverlay(`<div class="qcard"><div class="qlabel">QUESTION ${num} OF ${total} · ${left} MISS${left===1?"":"ES"} LEFT</div><div class="qtext">${esc(q.q)}</div>${body}<p class="msg" style="font-size:.85rem">${mc ? "Tap an answer or press 1–"+choices.length+"." : "Press Enter to check."}</p></div>`);
  if(mc){
    A.mcKeys = choices;
    overlay.querySelectorAll(".choice").forEach(b => b.addEventListener("click", () => {
      if(A.state !== "question") return; A.state = "answered";
      const pick = choices[+b.dataset.i], ok = normalize(pick) === normalize(disp);
      overlay.querySelectorAll(".choice").forEach(x => { const c = choices[+x.dataset.i]; if(normalize(c) === normalize(disp)) x.classList.add("right"); else if(x === b) x.classList.add("wrong"); x.disabled = true; });
      A.answers.push({ q:q.q, a:disp, ok, given:pick });
      setTimeout(() => resolve(ok, disp), ok ? 450 : 900);
    }));
  } else {
    A.mcKeys = null;
    const f = $("#typed-form"), inp = $("#typed-in");
    setTimeout(() => inp.focus({ preventScroll:true }), 30);
    f.addEventListener("submit", e => { e.preventDefault(); if(!inp.value.trim() || A.state !== "question") return; A.state = "answered";
      const ok = isRight(inp.value, q.a); A.answers.push({ q:q.q, a:disp, ok, given:inp.value.trim() }); resolve(ok, disp); });
  }
}
function resolve(ok, disp){
  A.state = "answered"; A.mcKeys = null; const tok = A.token;
  if(ok){
    A.right++; $("#hud-right").textContent = A.right;
    const last = !A.queue.length;
    showOverlay(`<div class="center"><div class="big good">CORRECT!</div><p style="color:var(--muted)">${ctxSet.playTime ? `You get ${ctxSet.playTime} seconds of play.` : "+1 life."}${last ? " That was the last question, so make this round count!" : ""} Get ready…</p></div>`);
    setTimeout(() => { if(tok !== A.token) return; hideOverlay(); if(document.activeElement) document.activeElement.blur();
      if(A.needLife) A.game.startLife(); // after time's up, the game picks up right where it stopped
      A.needLife = false; A.timeLeft = ctxSet.playTime || 0; showTime();
      A.state = "ready"; A.readyT = 1.1; }, 900);
  } else {
    A.misses++; renderPips();
    const out = A.misses >= ctxSet.misses || !A.queue.length, left = ctxSet.misses - A.misses;
    showOverlay(`<div class="qcard center"><div class="big bad">NOT QUITE</div><p>The answer is <b style="color:var(--yellow)">${esc(disp)}</b>.</p>
      <p style="color:var(--muted)">${A.misses >= ctxSet.misses ? "That was your last miss." : !A.queue.length ? "That was the last question." : `${left} miss${left===1?"":"es"} left.`}</p>
      <button class="btn" type="button" id="btn-next">${out ? "See my score" : "Next question"}</button></div>`);
    const b = $("#btn-next"); b.focus({ preventScroll:true });
    b.addEventListener("click", () => { if(tok !== A.token) return; out ? endRun() : askQuestion(); });
  }
}
async function endRun(){
  A.state = "over"; const tok = A.token, gid = A.gid, score = A.score;
  const finished = !A.queue.length && A.misses < ctxSet.misses;
  showOverlay(`<div class="qcard center"><div class="qlabel">${finished ? "ALL QUESTIONS DONE!" : "RUN COMPLETE"}</div><div class="big">${score}</div>
    <p style="color:var(--muted)">${A.right} right · ${A.misses} wrong</p><p id="save-status" style="color:var(--muted)">Saving…</p>
    <div class="btnrow"><button class="btn" type="button" id="btn-again">Play again</button><button class="btn ghost" type="button" id="btn-home">Pick another game</button></div></div>`);
  $("#btn-again").addEventListener("click", () => startRun(gid));
  $("#btn-home").addEventListener("click", goHome);
  const res = await recordRun(gid, score);
  if(tok !== A.token) return;
  const el = $("#save-status");
  if(el) el.innerHTML = (res.newBest ? `<b style="color:var(--good)">New personal best!</b> ` : `Your best: ${Math.max(score, res.prev)}. `) + esc(res.msg);
}
function goHome(){ A.token++; A.state = "idle"; hideOverlay(); showView("home"); renderCabinetBests(); renderBoard(); }
function togglePause(){
  if(A.state !== "playing" && !A.paused) return;
  A.paused = !A.paused; $("#btn-pause").textContent = A.paused ? "Resume" : "Pause";
  if(A.paused){ showOverlay(`<div class="center"><div class="big">PAUSED</div><button class="btn" type="button" id="btn-resume">Resume</button></div>`); $("#btn-resume").addEventListener("click", togglePause); }
  else hideOverlay();
}
$("#btn-pause").addEventListener("click", togglePause);
$("#btn-quit").addEventListener("click", () => {
  if(A.state === "over") return goHome();
  const prevState = A.state; A.paused = true; A.state = "confirm";
  showOverlay(`<div class="qcard center"><p style="font-weight:700">End this run now? Your score of ${A.score} will still count.</p><div class="btnrow"><button class="btn" type="button" id="q-yes">End run</button><button class="btn ghost" type="button" id="q-no">Keep playing</button></div></div>`);
  $("#q-yes").addEventListener("click", () => { A.paused = false; endRun(); });
  $("#q-no").addEventListener("click", () => {
    A.paused = false; $("#btn-pause").textContent = "Pause";
    if(prevState === "playing" || prevState === "ready"){ A.state = prevState; hideOverlay(); }
    else askQuestion(true); // show the same unanswered question again
  });
});

let raf = null, last = 0;
function frame(ts){
  raf = requestAnimationFrame(frame);
  if($("#view-play").hidden){ cancelAnimationFrame(raf); raf = null; return; }
  const dt = Math.min(0.033, (ts - last) / 1000 || 0); last = ts;
  if(A.state === "ready"){ A.readyT -= dt; if(A.readyT <= 0){ A.state = "playing"; input.pressed.clear(); } }
  else if(A.state === "playing" && !A.paused){
    A.game.update(dt, input);
    if(A.state === "playing" && ctxSet.playTime){ A.timeLeft -= dt; showTime(); if(A.timeLeft <= 0) timeUp(); }
  }
  input.pressed.clear();
  cx.save(); A.game.draw(cx); cx.restore();
  if(A.state === "ready") bigText(cx, A.readyT > 0.35 ? "GET READY" : "GO!", A.readyT > 0.35 ? "#3fe0ff" : "#5bf08a");
}

addEventListener("keydown", e => {
  if($("#view-play").hidden) return;
  const tag = e.target.tagName || "";
  if(A.state === "question" && A.mcKeys && /^Digit[1-4]$/.test(e.code)){ const b = overlay.querySelector(`.choice[data-i="${+e.code.slice(5)-1}"]`); if(b){ e.preventDefault(); b.click(); } return; }
  if(tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
  if((e.code === "KeyP" || e.code === "Escape") && A.state === "playing"){ e.preventDefault(); togglePause(); return; }
  if(A.state !== "playing" && A.state !== "ready") return;
  const k = KEYMAP[e.code]; if(!k) return;
  e.preventDefault(); if(!e.repeat) input.pressed.add(k); input.held[k] = true;
});
addEventListener("keyup", e => { const k = KEYMAP[e.code]; if(k) release(k); });
addEventListener("blur", () => { for(const k in input.held) input.held[k] = false; });
const logicalX = e => { const r = cv.getBoundingClientRect(); return (e.clientX - r.left) / r.width * W; };
cv.addEventListener("pointermove", e => { if(A.gid === "brick") input.px = logicalX(e); });
cv.addEventListener("pointerdown", e => { cv.focus?.(); if(A.gid === "brick") input.px = logicalX(e); if(A.state === "playing") press("action"); });
cv.addEventListener("pointerup", () => release("action"));
cv.addEventListener("pointerleave", () => { input.px = null; release("action"); });
document.querySelectorAll(".pb").forEach(b => { const k = b.dataset.k;
  b.addEventListener("pointerdown", e => { e.preventDefault(); b.setPointerCapture(e.pointerId); b.classList.add("on"); if(A.state === "playing" || A.state === "ready"){ if(A.gid === "brick") input.px = null; press(k); } });
  const up = () => { b.classList.remove("on"); release(k); };
  b.addEventListener("pointerup", up); b.addEventListener("pointercancel", up);
});

function showView(v){ for(const id of ["home","play","teacher"]) $("#view-"+id).hidden = id !== v; $("#btn-teacher").hidden = v === "teacher"; if(v !== "play") scrollTo({ top:0 }); }

/* ---------------- teacher view (same page, behind the Teacher button) ---------------- */
let teacherLoaded = null;
function route(){
  if(location.hash === "#teacher"){
    if(!$("#view-play").hidden){ A.token++; A.state = "idle"; hideOverlay(); }
    showView("teacher");
    if(!teacherLoaded) teacherLoaded = import("./teacher.js").catch(e => { teacherLoaded = null; console.error(e); });
  } else if(!$("#view-teacher").hidden){
    showView("home");
    if(ctxSet.code) joinCode(ctxSet.code, false).then(() => { renderBoard(); renderCabinetBests(); }); // pick up edited questions
  }
}
$("#btn-teacher").addEventListener("click", () => { location.hash = "teacher"; });
$("#btn-back").addEventListener("click", () => { history.pushState("", document.title, location.pathname + location.search); route(); });
addEventListener("hashchange", route);

/* ---------------- cabinets (attract mode) ---------------- */
function buildCabinets(){
  const wrap = $("#cabinets"), previews = [];
  for(const [gid,g] of Object.entries(GAMES)){
    const b = document.createElement("button"); b.className = "cab"; b.type = "button"; b.style.setProperty("--c", g.color); b.style.setProperty("--nc", g.color.replace("var(--","var(--neon-"));
    b.innerHTML = `<canvas width="640" height="480" aria-hidden="true"></canvas><div class="info"><span class="nm">${g.name}</span><span class="ds">${g.desc}</span><span class="best" data-best="${gid}"></span></div>`;
    b.addEventListener("click", () => startRun(gid));
    wrap.appendChild(b);
    const inst = g.make({ add(){}, lose(){ inst.startLife(); } }); inst.reset();
    previews.push({ inst, pc:b.querySelector("canvas").getContext("2d"), gid, t:Math.random()*3 });
  }
  let pl = performance.now();
  const ai = { held:{left:false,right:false,up:false,down:false,action:false}, pressed:new Set(), px:null };
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const pick = () => ["left","right","up","down"][Math.floor(Math.random()*4)];
  (function tick(ts){
    requestAnimationFrame(tick);
    const dt = Math.min(0.033, (ts - pl) / 1000 || 0); pl = ts;
    if($("#view-home").hidden) return;
    for(const p of previews){
      p.t += dt; ai.pressed.clear(); for(const k in ai.held) ai.held[k] = false; ai.px = null;
      if(!reduce){
        if(p.gid === "maze" && Math.random() < 0.04) ai.pressed.add(pick());
        if(p.gid === "rush" && Math.random() < 0.03){ ai.pressed.add("up"); ai.held.up = true; }
        if(p.gid === "stack"){ if(Math.random() < 0.05) ai.pressed.add(Math.random() < .5 ? "left" : "right"); if(Math.random() < 0.03) ai.pressed.add("up"); }
        if(p.gid === "snake" && Math.random() < 0.06) ai.pressed.add(pick());
        if(p.gid === "brick"){ ai.px = 320 + Math.sin(p.t*1.7)*200; ai.pressed.add("action"); }
        if(p.gid === "hop"){ ai.held.right = Math.sin(p.t*0.7) > -0.3; ai.held.left = !ai.held.right; if(Math.random() < 0.03){ ai.pressed.add("up"); } ai.held.up = Math.random() < 0.8; }
        try { p.inst.update(dt, ai); } catch {}
      }
      p.inst.draw(p.pc);
    }
  })(pl);
}

/* ---------------- scores ---------------- */
const keyFor = gid => (ctxSet.code || "PRACTICE") + "_" + gid;
function myBoardBest(gid){ if(!ctxSet.code) return 0; const k = nameKey(nick); const e = board.find(x => x.game === gid && x.nameKey === k); return e ? e.best : 0; }
function getBest(gid){ return Math.max((store.get("aa-best") || {})[keyFor(gid)] || 0, myBoardBest(gid)); }

async function recordRun(gid, score){
  const key = keyFor(gid), prev = getBest(gid), newBest = score > prev;
  const bests = store.get("aa-best") || {}; if(score > (bests[key] || 0)){ bests[key] = score; store.set("aa-best", bests); }
  if(!ctxSet.code){
    const lb = store.get("aa-local") || {}, arr = lb[gid] || [];
    arr.push({ n:nick || "Player", s:score }); arr.sort((a,b) => b.s - a.s); lb[gid] = arr.slice(0,10); store.set("aa-local", lb);
    return { newBest, prev, msg:"Practice scores stay on this device. Join a class to save your progress." };
  }
  const parts = [];
  try { await data.submitRun({ code:ctxSet.code, name:nick, game:gid, score, right:A.right, wrong:A.misses, answers:A.answers }); parts.push("Saved for your teacher."); }
  catch(e){ console.warn(e); parts.push("This run couldn't be saved. Check your internet connection."); }
  if(score > myBoardBest(gid)){
    try { if(await data.postBest(ctxSet.code, gid, nick, score)) parts.push("Posted to the class board."); }
    catch(e){ console.warn(e); }
  }
  return { newBest, prev, msg:parts.join(" ") };
}

function boardRows(gid){
  if(!ctxSet.code) return ((store.get("aa-local") || {})[gid] || []).map(r => ({ n:r.n, s:r.s, me:false }));
  const k = nameKey(nick);
  return board.filter(e => e.game === gid && e.best > 0).map(e => ({ n:String(e.name || "Player"), s:+e.best, me:e.nameKey === k })).sort((a,b) => b.s - a.s).slice(0,10);
}
function renderBoard(){
  const chips = $("#board-chips");
  if(!chips.childElementCount){
    for(const [gid,g] of Object.entries(GAMES)){ const c = document.createElement("button"); c.type = "button"; c.className = "chip"; c.textContent = g.name; c.style.setProperty("--c", g.color); c.dataset.g = gid;
      c.addEventListener("click", () => { boardGame = gid; renderBoard(); }); chips.appendChild(c); }
  }
  chips.querySelectorAll(".chip").forEach(c => c.setAttribute("aria-pressed", String(c.dataset.g === boardGame)));
  $("#board-title").textContent = ctxSet.code ? "Class top scores" : "Top scores on this device";
  const list = $("#board-list"); list.innerHTML = "";
  const rows = boardRows(boardGame);
  if(!rows.length){
    const li = document.createElement("li"); li.className = "empty"; li.style.background = "none"; li.style.display = "block";
    li.textContent = ctxSet.code && boardState === "loading" ? "Loading the class board…" : ctxSet.code && boardState === "error" ? "The class board can't be reached right now." : "No scores yet for " + GAMES[boardGame].name + ". Play a run to set the first record.";
    list.appendChild(li);
  }
  rows.forEach((r,i) => { const li = document.createElement("li"); if(r.me) li.className = "me";
    const a = document.createElement("span"); a.className = "pl"; a.textContent = "#" + (i+1);
    const b = document.createElement("span"); b.className = "nk"; b.textContent = r.n + (r.me ? " (you)" : "");
    const c = document.createElement("span"); c.className = "sc"; c.textContent = r.s;
    li.append(a, b, c); list.appendChild(li); });
  $("#board-note").textContent = ctxSet.code ? "Each player's best score per game. Updates live." : "Join a class with a code to compete with classmates.";
}
function renderCabinetBests(){
  document.querySelectorAll("[data-best]").forEach(el => { const gid = el.dataset.best, b = getBest(gid), top = boardRows(gid)[0];
    el.textContent = (b ? "Your best " + b : "No score yet") + (top && ctxSet.code ? " · Class #1 " + top.s : ""); });
}
function setContext(set){
  ctxSet = set; $("#how-misses").textContent = set.misses; $("#how-play").textContent = set.playTime ? `Play for up to ${set.playTime} seconds` : "Play until you lose that life";
  if(unwatch){ unwatch(); unwatch = null; } board = [];
  if(set.code){
    $("#ctx-text").innerHTML = `Playing <b>${esc(set.title)}</b> · code <span class="code">${esc(set.code)}</span> · ${set.questions.length} questions`;
    $("#ctx-leave").hidden = false;
    boardState = "loading";
    const timer = setTimeout(() => { if(boardState === "loading"){ boardState = "error"; renderBoard(); } }, 10000);
    unwatch = data.watchBoard(set.code, entries => { clearTimeout(timer); board = entries; boardState = "ok"; renderBoard(); renderCabinetBests(); },
      () => { clearTimeout(timer); boardState = "error"; renderBoard(); });
  } else {
    $("#ctx-text").textContent = "Practice mode with sample 6th–8th grade questions. Scores stay on this device.";
    $("#ctx-leave").hidden = true;
  }
  renderBoard(); renderCabinetBests();
}
$("#ctx-leave").addEventListener("click", () => { store.set("aa-code", null); setContext(PRACTICE); $("#join-msg").textContent = ""; });

/* ---------------- join ---------------- */
$("#join-nick").value = nick;
$("#join-code").addEventListener("input", e => { e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""); });
$("#join-form").addEventListener("submit", async e => {
  e.preventDefault();
  const code = $("#join-code").value.trim().toUpperCase(), n = $("#join-nick").value.trim().replace(/\s+/g, " ").slice(0,16), msg = $("#join-msg");
  msg.className = "msg";
  if(!code){ msg.className = "msg err"; msg.textContent = "Type the class code your teacher gave you."; return; }
  if(!n){ msg.className = "msg err"; msg.textContent = "Add your first name and last initial so your teacher knows it's you."; $("#join-nick").focus(); return; }
  nick = n; store.set("aa-nick", nick);
  msg.textContent = "Looking up " + code + "…";
  await joinCode(code, true);
});
async function joinCode(code, announce){
  const msg = $("#join-msg");
  try {
    const c = await data.getClass(code);
    if(!c){ if(announce){ msg.className = "msg err"; msg.textContent = "No class uses the code " + code + ". Check the letters and try again."; } return false; }
    setContext({ code, title:String(c.title || "Class set"), questions:Array.isArray(c.questions) && c.questions.length ? c.questions : SAMPLE, mode:c.mode || "auto", misses:+c.misses || 3, playTime:c.playTime ?? 45 });
    store.set("aa-code", code);
    if(announce){ msg.className = "msg ok"; msg.textContent = "You're in, " + nick + "! Pick a game to start."; }
    return true;
  } catch(e){
    console.warn(e);
    if(announce){ msg.className = "msg err"; msg.textContent = "The class list can't be reached right now. Check your internet connection and try again."; }
    return false;
  }
}

/* ---------------- boot ---------------- */
buildCabinets(); setContext(PRACTICE); route();
if(data.mode === "demo"){ const n = $("#mode-note"); n.hidden = false; n.innerHTML = "<b>Demo mode.</b> Firebase isn't connected yet, so scores stay in this browser. Try class code <b>DEMO1</b>."; }
data.init().catch(e => console.warn("Firebase sign-in failed", e)).then(async () => {
  const urlCode = new URLSearchParams(location.search).get("code");
  if(urlCode) store.set("aa-code", urlCode.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0,6));
  const saved = store.get("aa-code");
  if(saved) $("#join-code").value = saved;
  if(saved && nick && await joinCode(saved, false)){ $("#join-code").value = saved; $("#join-msg").className = "msg ok"; $("#join-msg").textContent = "Welcome back, " + nick + "."; }
});
