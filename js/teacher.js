// Teacher dashboard: sign in, manage class codes, and review student progress.
import * as data from "./data.js";
import { GAMES } from "./games.js";
import { esc, parseText, readQuestionFile, compressImage } from "./questions.js";

const $ = s => document.querySelector(s);
const fmtDate = t => t ? new Date(t).toLocaleString([], { month:"short", day:"numeric", hour:"numeric", minute:"2-digit" }) : "—";
const pct = (r, n) => n ? Math.round(r / n * 100) : null;
const accPill = p => p == null ? "—" : `<span class="acc ${p >= 80 ? "hi" : p >= 60 ? "mid" : "lo"}">${p}%</span>`;
const gname = g => GAMES[g] ? GAMES[g].name : g;
const gtag = g => `<span class="gtag" style="color:${GAMES[g] ? GAMES[g].color : "inherit"}">${esc(gname(g))}</span>`;

let classes = [], runs = [], stats = null, selStudent = null, sort = { key:"name", dir:1 }, editing = null, draft = null;
let imgCache = {}, removedImgs = [], activePic = null; // pictures: saved ones by id, ones to delete on save, box that receives a paste

/* ---------------- auth ---------------- */
// Inside Google Sites the page runs in a frame, where Google sign-in is often blocked. Offer the same page in its own tab.
const inFrame = (() => { try { return window.top !== window.self; } catch { return true; } })();
{ const a = $("#gate-newtab"); a.href = location.href.split("#")[0] + "#teacher"; a.hidden = !inFrame; }
if(data.mode === "demo") $("#demo-note").hidden = false;
$("#btn-reset-demo").addEventListener("click", async () => { data.resetDemo(); await loadClasses(); });
$("#btn-signin").addEventListener("click", async () => {
  $("#gate-msg").className = "msg"; $("#gate-msg").textContent = "Opening Google sign-in…";
  try { await data.teacherSignIn(); $("#gate-msg").textContent = ""; }
  catch(e){ console.warn(e); const m = $("#gate-msg"); m.className = "msg err";
    m.textContent = e && e.code === "auth/unauthorized-domain" ? "This website isn't on Firebase's list of authorized domains yet. Add it in Firebase under Authentication → Settings → Authorized domains."
      : e && e.code === "auth/popup-closed-by-user" ? "The sign-in window was closed before you finished. Try again."
      : inFrame ? "Sign-in can't finish inside Google Sites. Use “Open in a new tab” below."
      : e && e.code === "auth/popup-blocked" ? "Your browser blocked the sign-in window. Allow pop-ups for this site and try again."
      : "Sign-in didn't finish. Try again.";
    if(inFrame) $("#gate-newtab").hidden = false; }
});
$("#btn-signout").addEventListener("click", () => data.teacherSignOut());
data.onTeacher(async u => {
  $("#btn-signout").hidden = !u || u.demo;
  $("#who").textContent = u ? (u.demo ? "Demo teacher" : u.email) : "";
  if(!u){ $("#gate").hidden = false; $("#t-app").hidden = true; return; }
  if(!u.isTeacher){ $("#gate").hidden = false; $("#t-app").hidden = true; $("#gate-msg").className = "msg err";
    $("#gate-msg").textContent = u.email + " isn't on the teacher list. Add it to TEACHER_EMAILS in js/firebase-config.js and to firestore.rules."; return; }
  $("#gate").hidden = true; $("#t-app").hidden = false;
  await loadClasses();
}).catch(e => { $("#gate").hidden = false; $("#gate-msg").className = "msg err"; $("#gate-msg").textContent = "Firebase couldn't start. Check js/firebase-config.js."; console.error(e); });

/* ---------------- tabs ---------------- */
function tab(which){
  $("#view-progress").hidden = which !== "progress"; $("#view-classes").hidden = which !== "classes";
  $("#tab-progress").setAttribute("aria-selected", String(which === "progress"));
  $("#tab-classes").setAttribute("aria-selected", String(which === "classes"));
}
$("#tab-progress").addEventListener("click", () => tab("progress"));
$("#tab-classes").addEventListener("click", () => tab("classes"));

/* ---------------- classes ---------------- */
async function loadClasses(){
  try { classes = (await data.listClasses()).sort((a,b) => (b.createdAt || 0) - (a.createdAt || 0)); }
  catch(e){ console.error(e); classes = []; $("#p-msg").className = "msg err"; $("#p-msg").textContent = "Your classes couldn't load. If you just set up Firebase, check that you published firestore.rules with your email in it."; }
  renderClassList();
  const sel = $("#p-class"), prev = sel.value;
  sel.innerHTML = classes.length ? classes.map(c => `<option value="${esc(c.code)}">${esc(c.title || "Class set")} · ${esc(c.code)}</option>`).join("") : `<option value="">No classes yet</option>`;
  if(classes.some(c => c.code === prev)) sel.value = prev;
  if(!classes.length){ tab("classes"); renderEmptyProgress(); return; }
  await loadRuns();
}
function renderClassList(){
  const ul = $("#t-classes"); ul.innerHTML = "";
  if(!classes.length){ ul.innerHTML = '<li class="m">No question sets yet. Add questions on the left, then save the set.</li>'; return; }
  for(const c of classes){
    const li = document.createElement("li");
    li.innerHTML = `<span class="c"></span><span class="t"></span><span class="m"></span><span class="row" style="gap:6px">
      <button class="btn alt small" type="button" data-a="progress">Progress</button>
      <button class="btn ghost small" type="button" data-a="edit">Edit questions</button>
      <button class="btn ghost small" type="button" data-a="del">Delete</button></span>
      <label class="vis"><input type="checkbox" data-a="vis"> Students can see this set</label>`;
    li.querySelector(".c").textContent = c.code; li.querySelector(".t").textContent = c.title || "Class set";
    li.querySelector(".m").textContent = (c.count || (c.questions || []).length) + " questions" + (c.createdAt ? " · " + new Date(c.createdAt).toLocaleDateString() : "");
    li.querySelector('[data-a="progress"]').addEventListener("click", () => { $("#p-class").value = c.code; tab("progress"); loadRuns(); });
    li.querySelector('[data-a="edit"]').addEventListener("click", () => startEdit(c));
    const vis = li.querySelector('[data-a="vis"]'); vis.checked = c.listed !== false;
    vis.addEventListener("change", async () => { vis.disabled = true; try { await data.setListed(c.code, vis.checked); c.listed = vis.checked; } catch(e){ console.error(e); vis.checked = !vis.checked; } vis.disabled = false; });
    const del = li.querySelector('[data-a="del"]');
    del.addEventListener("click", async () => {
      if(!del.dataset.confirm){ del.dataset.confirm = "1"; del.textContent = "Confirm delete"; setTimeout(() => { if(del.isConnected){ delete del.dataset.confirm; del.textContent = "Delete"; } }, 4000); return; }
      del.disabled = true;
      try { await data.deleteClass(c.code); if(editing === c.code) stopEdit(); await loadClasses(); } catch(e){ console.error(e); del.disabled = false; del.textContent = "Try again"; }
    });
    ul.appendChild(li);
  }
}
async function startEdit(c){
  draft = null; editing = c.code; removedImgs = []; imgCache = {};
  setDraft(c.questions.map(q => ({ ...q, wrong:[...(q.wrong || [])] })), "class " + c.code);
  if(c.questions.some(q => q.imgId)){ try { imgCache = await data.getImages(c.code); renderQList(); } catch(e){ console.warn(e); } }
  $("#t-title").value = c.title || ""; $("#t-mode").value = c.mode || "auto"; $("#t-misses").value = String(c.misses || 3); $("#t-time").value = String(c.playTime ?? 45);
  $("#t-step2").textContent = "2 · Update class " + c.code; $("#t-create").textContent = "Save changes"; $("#t-cancel-edit").hidden = false;
  $("#t-create-msg").className = "msg"; $("#t-create-msg").textContent = "Saving keeps the same code and all student progress. Load a new file or paste to replace the questions.";
  $("#t-newcode").hidden = true; $("#t-title").focus();
}
function stopEdit(){ editing = null; removedImgs = []; draft = null; renderQList(); $("#t-parse-msg").textContent = ""; $("#t-step2").textContent = "2 · Save the question set"; $("#t-create").textContent = "Save question set"; $("#t-cancel-edit").hidden = true; $("#t-create-msg").textContent = ""; }
$("#t-cancel-edit").addEventListener("click", stopEdit);

function setDraft(qs, source){
  const msg = $("#t-parse-msg");
  if(!qs.length){ draft = null; msg.className = "msg err"; msg.textContent = "No questions found in " + source + ". Each row needs a question and an answer."; $("#t-preview").innerHTML = ""; return; }
  const before = draft || [];
  draft = qs.slice(0, 500); const mcN = draft.filter(q => q.wrong.length).length;
  if(editing && before.length && before !== qs){ // keep each picture with the question that has the same wording
    const byText = new Map(before.filter(q => q.imgId || q.imgData).map(q => [q.q.trim().toLowerCase(), q]));
    for(const q of draft){ const old = byText.get(q.q.trim().toLowerCase()); if(old && !q.imgId && !q.imgData){ q.imgId = old.imgId; q.imgData = old.imgData; byText.delete(q.q.trim().toLowerCase()); } }
    for(const old of byText.values()) if(old.imgId) removedImgs.push(old.imgId);
  }
  msg.className = "msg ok"; msg.textContent = `Found ${draft.length} question${draft.length === 1 ? "" : "s"} in ${source}: ${mcN} multiple choice, ${draft.length - mcN} typed.`;
  if(!$("#t-title").value && /\./.test(source)) $("#t-title").value = source.replace(/\.[^.]+$/, "").slice(0,60);
  renderQList();
}
/* question list with a picture box per question */
function picSrc(q){ return q.imgData || (q.imgId && imgCache[q.imgId]) || ""; }
function renderQList(){
  if(!draft){ $("#t-preview").innerHTML = ""; return; }
  const withPics = draft.filter(q => q.imgId || q.imgData).length;
  $("#t-preview").innerHTML = `<div class="qhead"><b>Questions</b><span>${withPics} with pictures · click a picture box, then paste a screenshot (Ctrl+V or Cmd+V)</span></div>
    <ol class="qlist">${draft.map((q,i) => {
      const src = picSrc(q);
      return `<li class="qrow"><span class="qn">${i+1}</span><div class="qbody"><div class="qq">${esc(q.q)}</div>
        ${q.notes ? `<div class="qnotes">Notes: ${esc(q.notes)}</div>` : ""}<div class="qa">Answer: ${esc(q.a)}${q.wrong.length ? ` · Wrong: ${esc(q.wrong.join(", "))} <span class="pill mc">Choices</span>` : ` <span class="pill ty">Typed</span>`}</div></div>
        <div class="picbox${src ? " has" : ""}" tabindex="0" role="button" data-i="${i}" aria-label="Picture for question ${i+1}">
          ${src ? `<img src="${src}" alt="Picture for question ${i+1}"><span class="picacts"><button type="button" class="btn ghost small" data-act="replace">Replace</button><button type="button" class="btn ghost small" data-act="remove">Remove</button></span>`
                : q.imgId ? `<span class="pichint">Loading picture…</span>`
                : `<span class="pichint"><b>+ Add a picture</b>Click here, then paste a screenshot, drag an image in, or <u data-act="choose">choose a file</u></span>`}
        </div></li>`; }).join("")}</ol>`;
  document.querySelectorAll("#t-preview .picbox").forEach(box => {
    const i = +box.dataset.i;
    box.addEventListener("focus", () => { activePic = i; });
    box.addEventListener("blur", () => { setTimeout(() => { if(activePic === i && !box.contains(document.activeElement)) activePic = null; }, 0); });
    box.addEventListener("click", e => {
      const act = e.target.closest("[data-act]")?.dataset.act;
      if(act === "remove"){ removePic(i); return; }
      if(act === "replace" || act === "choose"){ pickFor(i); return; }
      box.focus();
    });
    box.addEventListener("keydown", e => { if(e.key === "Enter" || e.key === " "){ e.preventDefault(); pickFor(i); } });
    box.addEventListener("dragover", e => { e.preventDefault(); box.classList.add("over"); });
    box.addEventListener("dragleave", () => box.classList.remove("over"));
    box.addEventListener("drop", e => { e.preventDefault(); e.stopPropagation(); box.classList.remove("over"); const f = e.dataTransfer.files[0]; if(f) setPic(i, f); });
  });
}
function pickFor(i){ const inp = document.createElement("input"); inp.type = "file"; inp.accept = "image/*"; inp.onchange = () => { if(inp.files[0]) setPic(i, inp.files[0]); }; inp.click(); }
async function setPic(i, blob){
  const msg = $("#t-parse-msg"); msg.className = "msg"; msg.textContent = "Adding picture to question " + (i+1) + "…";
  try {
    const url = await compressImage(blob);
    const q = draft[i]; if(q.imgId) removedImgs.push(q.imgId);
    q.imgId = undefined; q.imgData = url; renderQList();
    msg.className = "msg ok"; msg.textContent = `Picture added to question ${i+1} (${Math.round(url.length*0.75/1024)} KB). Click Save to keep it.`;
    const box = document.querySelector(`#t-preview .picbox[data-i="${i}"]`); if(box) box.focus();
  } catch(e){ msg.className = "msg err"; msg.textContent = e.message || "That picture couldn't be added."; }
}
function removePic(i){ const q = draft[i]; if(q.imgId) removedImgs.push(q.imgId); q.imgId = undefined; q.imgData = undefined; renderQList();
  $("#t-parse-msg").className = "msg"; $("#t-parse-msg").textContent = `Picture removed from question ${i+1}. Click Save to keep this change.`; }
document.addEventListener("paste", e => {
  if(activePic === null || !draft || $("#view-teacher").hidden) return;
  const item = [...(e.clipboardData?.items || [])].find(it => it.type.startsWith("image/"));
  if(!item){ $("#t-parse-msg").className = "msg err"; $("#t-parse-msg").textContent = "There's no picture on your clipboard. Take a screenshot first (Windows: Win+Shift+S, Mac: Cmd+Ctrl+Shift+4), then paste."; return; }
  e.preventDefault(); setPic(activePic, item.getAsFile());
});
async function handleFile(file){
  const msg = $("#t-parse-msg"); msg.className = "msg"; msg.textContent = "Reading " + file.name + "…";
  try { setDraft(await readQuestionFile(file), file.name); }
  catch(e){ msg.className = "msg err"; msg.textContent = e && e.message && e.message.length > 20 ? e.message : "That file couldn't be read. Try saving it as CSV, or paste the questions below."; }
}
$("#t-file").addEventListener("change", e => { const f = e.target.files[0]; if(f) handleFile(f); e.target.value = ""; });
const drop = $("#drop");
drop.addEventListener("dragover", e => { e.preventDefault(); drop.classList.add("over"); });
drop.addEventListener("dragleave", () => drop.classList.remove("over"));
drop.addEventListener("drop", e => { e.preventDefault(); drop.classList.remove("over"); const f = e.dataTransfer.files[0]; if(f) handleFile(f); });
$("#t-parse").addEventListener("click", () => setDraft(parseText($("#t-paste").value), "pasted text"));

$("#t-create").addEventListener("click", async () => {
  const m = $("#t-create-msg"); m.className = "msg";
  if(!draft){ m.className = "msg err"; m.textContent = "Add questions first: choose a file or paste them."; return; }
  const settings = { title:$("#t-title").value.trim().slice(0,60) || "Class set", mode:$("#t-mode").value, misses:+$("#t-misses").value, playTime:+$("#t-time").value, questions:draft };
  const btn = $("#t-create"); btn.disabled = true; m.textContent = "Saving…";
  try {
    const code = editing || await data.freeCode();
    const newPics = draft.filter(q => q.imgData);
    for(let k = 0; k < newPics.length; k++){ m.textContent = `Saving pictures (${k+1} of ${newPics.length})…`;
      const q = newPics[k]; q.imgId = await data.saveImage(code, q.imgData); imgCache[q.imgId] = q.imgData; q.imgData = undefined; }
    m.textContent = "Saving questions…";
    await data.saveClass(code, settings);
    for(const id of removedImgs) await data.deleteImage(id).catch(e => console.warn(e));
    removedImgs = [];
    $("#t-code-val").textContent = code; $("#t-newcode").hidden = false;
    m.className = "msg ok"; m.textContent = editing ? "Saved. Students see the new questions on their next run." : "Saved. Students can pick it from the question set list now.";
    if(editing) stopEdit(), m.className = "msg ok", m.textContent = "Saved. Students see the new questions on their next run.";
    else { draft = null; renderQList(); $("#t-parse-msg").textContent = ""; m.textContent += " To change questions or pictures later, click Edit questions in the list below."; }
    $("#p-class").value = code; await loadClasses();
  } catch(e){ console.error(e); m.className = "msg err"; m.textContent = "The class couldn't be saved. Check your connection, and that your email is in firestore.rules."; }
  btn.disabled = false;
});
$("#t-copy").addEventListener("click", async () => {
  const c = $("#t-code-val").textContent;
  try { await navigator.clipboard.writeText(c); $("#t-copy").textContent = "Copied"; setTimeout(() => $("#t-copy").textContent = "Copy code", 1500); }
  catch { const r = document.createRange(); r.selectNodeContents($("#t-code-val")); const s = getSelection(); s.removeAllRanges(); s.addRange(r); }
});

/* ---------------- progress ---------------- */
$("#p-class").addEventListener("change", () => { selStudent = null; loadRuns(); });
$("#p-refresh").addEventListener("click", loadRuns);
async function loadRuns(){
  const code = $("#p-class").value; if(!code){ renderEmptyProgress(); return; }
  const msg = $("#p-msg"); msg.className = "msg"; msg.textContent = "Loading progress…";
  try { runs = (await data.listRuns(code)).sort((a,b) => (b.t || 0) - (a.t || 0)); msg.textContent = runs.length ? `Updated ${fmtDate(Date.now())}.` : "No runs yet. Progress shows up here after students finish a run."; }
  catch(e){ console.error(e); runs = []; msg.className = "msg err"; msg.textContent = "Progress couldn't load. Check your connection and try Refresh."; }
  stats = computeStats(runs); renderProgress();
}
function computeStats(rs){
  const st = new Map(), qs = new Map();
  for(const r of [...rs].reverse()){ // oldest first so latest name wins
    let s = st.get(r.nameKey);
    if(!s){ s = { key:r.nameKey, name:r.name, runs:0, right:0, wrong:0, best:{}, top:0, topGame:null, last:0, missed:new Map(), list:[] }; st.set(r.nameKey, s); }
    s.name = r.name; s.runs++; s.right += r.right || 0; s.wrong += r.wrong || 0; s.last = Math.max(s.last, r.t || 0); s.list.push(r);
    if((r.score || 0) > (s.best[r.game] || 0)) s.best[r.game] = r.score;
    if((r.score || 0) >= s.top){ s.top = r.score || 0; s.topGame = r.game; }
    for(const a of r.answers || []){
      let q = qs.get(a.q); if(!q){ q = { q:a.q, a:a.a, asked:0, right:0, givens:new Map(), who:new Set() }; qs.set(a.q, q); }
      q.asked++; if(a.ok) q.right++; else { q.givens.set(a.given, (q.givens.get(a.given) || 0) + 1); q.who.add(r.name); }
      if(!a.ok){ let m = s.missed.get(a.q); if(!m){ m = { q:a.q, a:a.a, count:0, givens:[] }; s.missed.set(a.q, m); } m.count++; if(!m.givens.includes(a.given)) m.givens.push(a.given); }
    }
  }
  for(const s of st.values()) s.acc = pct(s.right, s.right + s.wrong);
  return { students:[...st.values()], questions:[...qs.values()] };
}
function renderEmptyProgress(){ runs = []; stats = computeStats([]); renderProgress(); }
function renderProgress(){
  const S = stats.students, totR = S.reduce((n,s) => n + s.right, 0), totW = S.reduce((n,s) => n + s.wrong, 0);
  const active7 = S.filter(s => s.last > Date.now() - 7*864e5).length;
  $("#p-tiles").innerHTML = [
    ["Students", S.length, active7 + " played this week"],
    ["Runs", runs.length, runs.length ? "Last " + fmtDate(runs[0].t) : "None yet"],
    ["Questions answered", totR + totW, totR + " right · " + totW + " wrong"],
    ["Class accuracy", pct(totR, totR + totW) == null ? "—" : pct(totR, totR + totW) + "%", "Right answers ÷ all answers"]
  ].map(([l,v,s]) => `<div class="tile"><small>${l}</small><b>${v}</b><span>${esc(s)}</span></div>`).join("");
  renderStudents(); renderDetail(); renderQuestions(); renderBests();
}
const COLS = [["name","Student"],["runs","Runs"],["right","Right"],["wrong","Wrong"],["acc","Accuracy"],["top","Best score"],["last","Last played"]];
function renderStudents(){
  const t = $("#p-students"), S = [...stats.students];
  S.sort((a,b) => { const x = a[sort.key], y = b[sort.key]; return (typeof x === "string" ? x.localeCompare(y) : (x ?? -1) - (y ?? -1)) * sort.dir; });
  t.innerHTML = `<thead><tr>${COLS.map(([k,l]) => `<th class="${k === "name" ? "" : "num"}"><button type="button" data-k="${k}" ${sort.key === k ? `aria-sort="${sort.dir > 0 ? "ascending" : "descending"}"` : ""}>${l}</button></th>`).join("")}</tr></thead>
    <tbody>${S.length ? S.map(s => `<tr class="click${selStudent === s.key ? " sel" : ""}" data-s="${esc(s.key)}" tabindex="0"><td>${esc(s.name)}</td><td class="num">${s.runs}</td><td class="num">${s.right}</td><td class="num">${s.wrong}</td><td class="num">${accPill(s.acc)}</td><td class="num">${s.top} ${s.topGame ? gtag(s.topGame) : ""}</td><td class="num">${fmtDate(s.last)}</td></tr>`).join("")
      : `<tr><td colspan="7" class="empty">No students have finished a run in this class yet.</td></tr>`}</tbody>`;
  t.querySelectorAll("th button").forEach(b => b.addEventListener("click", () => { const k = b.dataset.k; sort = { key:k, dir: sort.key === k ? -sort.dir : (k === "name" ? 1 : -1) }; renderStudents(); }));
  t.querySelectorAll("tr.click").forEach(tr => { const go = () => { selStudent = selStudent === tr.dataset.s ? null : tr.dataset.s; renderStudents(); renderDetail(); if(selStudent) $("#p-detail").scrollIntoView({ behavior:"smooth", block:"nearest" }); };
    tr.addEventListener("click", go); tr.addEventListener("keydown", e => { if(e.key === "Enter" || e.key === " "){ e.preventDefault(); go(); } }); });
}
function renderDetail(){
  const box = $("#p-detail"), s = stats.students.find(x => x.key === selStudent);
  if(!s){ box.hidden = true; return; }
  box.hidden = false;
  const missed = [...s.missed.values()].sort((a,b) => b.count - a.count);
  box.innerHTML = `<div class="detail-head"><h2>${esc(s.name)}</h2><button class="btn ghost small" type="button" id="d-close">Close</button></div>
    <div class="tiles" style="margin-bottom:16px">
      <div class="tile"><small>Runs</small><b>${s.runs}</b><span>Last ${fmtDate(s.last)}</span></div>
      <div class="tile"><small>Accuracy</small><b>${s.acc ?? "—"}${s.acc != null ? "%" : ""}</b><span>${s.right} right · ${s.wrong} wrong</span></div>
      <div class="tile"><small>Best score</small><b>${s.top}</b><span>${s.topGame ? esc(gname(s.topGame)) : ""}</span></div>
      <div class="tile"><small>Questions missed</small><b>${missed.length}</b><span>Different questions</span></div>
    </div>
    <h3 style="margin-bottom:8px">Questions missed</h3>
    <div class="tablewrap" style="margin-bottom:16px"><table class="data"><thead><tr><th>Question</th><th>Correct answer</th><th>Their answer</th><th class="num">Times missed</th></tr></thead><tbody>
    ${missed.length ? missed.map(m => `<tr><td class="wrap">${esc(m.q)}</td><td>${esc(m.a)}</td><td class="given">${m.givens.map(esc).join(", ")}</td><td class="num">${m.count}</td></tr>`).join("") : `<tr><td colspan="4" class="empty">No missed questions.</td></tr>`}
    </tbody></table></div>
    <h3 style="margin-bottom:8px">Runs</h3>
    <div class="tablewrap"><table class="data"><thead><tr><th>When</th><th>Game</th><th class="num">Score</th><th class="num">Right</th><th class="num">Wrong</th></tr></thead><tbody>
    ${[...s.list].reverse().map(r => `<tr><td>${fmtDate(r.t)}</td><td>${gtag(r.game)}</td><td class="num">${r.score}</td><td class="num">${r.right}</td><td class="num">${r.wrong}</td></tr>`).join("")}
    </tbody></table></div>`;
  $("#d-close").addEventListener("click", () => { selStudent = null; renderStudents(); renderDetail(); });
}
function renderQuestions(){
  const Q = stats.questions.map(q => ({ ...q, p:pct(q.right, q.asked) })).sort((a,b) => a.p - b.p || b.asked - a.asked);
  $("#p-questions").innerHTML = `<thead><tr><th>Question</th><th>Correct answer</th><th class="num">Asked</th><th class="num">Correct</th><th>Most common wrong answer</th><th>Missed by</th></tr></thead><tbody>
    ${Q.length ? Q.map(q => { const top = [...q.givens.entries()].sort((a,b) => b[1] - a[1])[0];
      return `<tr><td class="wrap">${esc(q.q)}</td><td>${esc(q.a)}</td><td class="num">${q.asked}</td><td class="num">${accPill(q.p)}</td><td class="given">${top ? esc(top[0]) + (top[1] > 1 ? ` (${top[1]}×)` : "") : "—"}</td><td class="wrap" style="min-width:10em">${[...q.who].map(esc).join(", ") || "—"}</td></tr>`; }).join("")
      : `<tr><td colspan="6" class="empty">Question results show up after students play.</td></tr>`}</tbody>`;
}
function renderBests(){
  $("#p-bests").innerHTML = Object.entries(GAMES).map(([gid,g]) => {
    const top = stats.students.filter(s => s.best[gid]).map(s => [s.name, s.best[gid]]).sort((a,b) => b[1] - a[1]).slice(0,5);
    return `<div><span class="gtag" style="color:${g.color}">${g.name}</span><ol>${top.length ? top.map(([n,v]) => `<li><span>${esc(n)}</span><b>${v}</b></li>`).join("") : `<li><span class="empty" style="padding:0">No runs yet</span></li>`}</ol></div>`;
  }).join("");
}

/* ---------------- export + cleanup ---------------- */
$("#p-export").addEventListener("click", () => {
  const code = $("#p-class").value; if(!runs.length){ $("#p-msg").className = "msg err"; $("#p-msg").textContent = "There are no runs to download yet."; return; }
  const q = v => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lines = [["Date","Student","Game","Score","Right","Wrong","Accuracy %","Missed questions"].join(",")];
  for(const r of runs) lines.push([new Date(r.t).toLocaleString(), r.name, gname(r.game), r.score, r.right, r.wrong, pct(r.right, r.right + r.wrong) ?? "",
    (r.answers || []).filter(a => !a.ok).map(a => `${a.q} (answered: ${a.given}; correct: ${a.a})`).join(" | ")].map(q).join(","));
  const url = URL.createObjectURL(new Blob(["﻿" + lines.join("\r\n")], { type:"text/csv" }));
  const a = document.createElement("a"); a.href = url; a.download = `answer-arcade-${code}-${new Date().toISOString().slice(0,10)}.csv`; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
});
function confirmButton(btn, label, action){
  btn.addEventListener("click", async () => {
    const code = $("#p-class").value; if(!code) return;
    if(!btn.dataset.confirm){ btn.dataset.confirm = "1"; const old = btn.textContent; btn.dataset.old = old; btn.textContent = label + " " + code + "?"; setTimeout(() => { if(btn.dataset.confirm){ delete btn.dataset.confirm; btn.textContent = old; } }, 4000); return; }
    delete btn.dataset.confirm; btn.textContent = btn.dataset.old; btn.disabled = true;
    try { await action(code); } catch(e){ console.error(e); $("#p-msg").className = "msg err"; $("#p-msg").textContent = "That didn't work. Try again."; }
    btn.disabled = false;
  });
}
confirmButton($("#p-clear-board"), "Reset leaderboard for", async code => { await data.clearBoard(code); $("#p-msg").className = "msg ok"; $("#p-msg").textContent = "Leaderboard reset. Student progress was kept."; });
confirmButton($("#p-clear-runs"), "Delete all progress for", async code => { await data.clearRuns(code); await loadRuns(); $("#p-msg").className = "msg ok"; $("#p-msg").textContent = "All progress for " + code + " was deleted."; });
