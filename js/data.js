// Data layer. Uses Firebase (Firestore + Auth) when js/firebase-config.js is filled in,
// otherwise a DEMO store kept in this browser's localStorage so you can try everything first.
// Load the settings file fresh every time, so edits on GitHub show up right away instead of after the browser's 10-minute cache.
const { firebaseConfig, TEACHER_EMAILS } = await import("./firebase-config.js?t=" + Date.now());
import { nameKey } from "./questions.js";

const FB = "https://www.gstatic.com/firebasejs/10.12.2/";
export const configured = !!(firebaseConfig && firebaseConfig.apiKey && !/^PASTE/.test(firebaseConfig.apiKey));
export const mode = configured ? "firebase" : "demo";
const teacherList = TEACHER_EMAILS.map(e => e.trim().toLowerCase());
export const isTeacherEmail = e => !!e && teacherList.includes(String(e).toLowerCase());

const CODE_CH = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const makeCode = () => Array.from({length:5}, () => CODE_CH[Math.floor(Math.random()*CODE_CH.length)]).join("");
const ms = t => (t && typeof t.toMillis === "function") ? t.toMillis() : (typeof t === "number" ? t : Date.now());

/* ---------------- Firebase backend ---------------- */
let fb = null; // {db, auth, F (firestore fns), A (auth fns)}
let ready = null;
async function fbInit(){
  if(fb) return fb;
  const [{ initializeApp }, A, F] = await Promise.all([
    import(FB + "firebase-app.js"), import(FB + "firebase-auth.js"), import(FB + "firebase-firestore.js")
  ]);
  const app = initializeApp(firebaseConfig);
  fb = { app, A, F, auth: A.getAuth(app), db: F.getFirestore(app) };
  return fb;
}
// Students never sign in. They only type a name; the security rules check what they save instead.

/* ---------------- Demo backend (localStorage) ---------------- */
const DKEY = "aa-demo-db-v1";
function dload(){
  let d = null; try { d = JSON.parse(localStorage.getItem(DKEY)); } catch {}
  if(!d){ d = seedDemo(); dsave(d); }
  return d;
}
function dsave(d){ try { localStorage.setItem(DKEY, JSON.stringify(d)); } catch {} demoListeners.forEach(f => f()); }
const demoListeners = new Set();
function seedDemo(){ return { classes:{}, runs:[], board:{}, images:{} }; } // demo mode starts empty

/* ---------------- Public API ---------------- */
export async function init(){
  if(!configured) return mode;
  if(!ready) ready = fbInit().catch(e => { ready = null; throw e; });
  await ready; return mode;
}

export async function getClass(code){
  code = String(code).toUpperCase();
  if(!configured){ const c = dload().classes[code]; return c ? { code, ...c } : null; }
  await init(); const { db, F } = fb;
  const s = await F.getDoc(F.doc(db, "classes", code));
  return s.exists() ? { code, ...s.data() } : null;
}
export async function listClasses(){
  if(!configured){ const c = dload().classes; return Object.entries(c).map(([code,v]) => ({ code, ...v })); }
  const { db, F } = await fbInit();
  const s = await F.getDocs(F.collection(db, "classes"));
  return s.docs.map(d => ({ code:d.id, ...d.data(), createdAt: ms(d.data().createdAt) }));
}
export async function saveClass(code, data){
  const qs = data.questions.map(q => { const o = { q:q.q, a:q.a, wrong:q.wrong || [] }; if(q.imgId) o.imgId = q.imgId; if(q.notes) o.notes = q.notes; return o; });
  const body = { title:data.title, questions:qs, mode:data.mode, misses:data.misses, playTime:data.playTime ?? 45, count:qs.length };
  if(!configured){ const d = dload(); const old = d.classes[code]; d.classes[code] = { ...body, listed: old ? old.listed !== false : true, createdAt: old ? old.createdAt : Date.now() }; dsave(d); return code; }
  const { db, F } = await fbInit();
  const ref = F.doc(db, "classes", code); const old = await F.getDoc(ref);
  await F.setDoc(ref, { ...body, listed: old.exists() ? old.data().listed !== false : true, createdAt: old.exists() ? old.data().createdAt : F.serverTimestamp() });
  return code;
}
export async function createClass(data){ return saveClass(await freeCode(), data); }
export async function freeCode(){
  for(let i=0; i<10; i++){ const code = makeCode(); if(!(await getClassAsTeacher(code))) return code; }
  throw new Error("Couldn't find a free code. Try again.");
}

/* ---------------- question pictures (one small document per picture) ---------------- */
export async function saveImage(code, dataUrl){
  if(!configured){ const d = dload(); d.images = d.images || {}; const id = "img" + Date.now().toString(36) + Math.random().toString(36).slice(2,7); d.images[id] = { code, data:dataUrl }; dsave(d); return id; }
  const { db, F } = await fbInit();
  const ref = await F.addDoc(F.collection(db, "images"), { code, data:dataUrl });
  return ref.id;
}
export async function deleteImage(id){
  if(!configured){ const d = dload(); if(d.images) delete d.images[id]; dsave(d); return; }
  const { db, F } = await fbInit(); await F.deleteDoc(F.doc(db, "images", id));
}
// All pictures for one question set, as {id: dataUrl}
export async function getImages(code){
  if(!configured){ const out = {}; for(const [id, v] of Object.entries(dload().images || {})) if(v.code === code) out[id] = v.data; return out; }
  await init(); const { db, F } = fb;
  const s = await F.getDocs(F.query(F.collection(db, "images"), F.where("code", "==", code)));
  const out = {}; s.docs.forEach(d => out[d.id] = d.data().data); return out;
}
async function getClassAsTeacher(code){
  if(!configured) return dload().classes[code] || null;
  const { db, F } = await fbInit(); const s = await F.getDoc(F.doc(db, "classes", code)); return s.exists() ? s.data() : null;
}
// Question sets students can pick from (title + code only; hidden sets are left out).
export async function listSets(){
  let all;
  if(!configured) all = Object.entries(dload().classes).map(([code,v]) => ({ code, ...v }));
  else { await init(); const { db, F } = fb; const s = await F.getDocs(F.collection(db, "classes")); all = s.docs.map(d => ({ code:d.id, ...d.data(), createdAt: ms(d.data().createdAt) })); }
  return all.filter(c => c.listed !== false).map(c => ({ code:c.code, title:c.title || "Question set", count:c.count || (c.questions || []).length, createdAt:c.createdAt || 0 }))
    .sort((a,b) => (b.createdAt || 0) - (a.createdAt || 0));
}
export async function setListed(code, listed){
  if(!configured){ const d = dload(); if(d.classes[code]) d.classes[code].listed = !!listed; dsave(d); return; }
  const { db, F } = await fbInit(); await F.updateDoc(F.doc(db, "classes", code), { listed: !!listed });
}
// Plain-language reason for a failed save or load, for students and teacher.
export function explain(e){
  const c = (e && e.code) || "";
  if(c.includes("permission-denied")) return "Firebase blocked this. The security rules need to be updated: paste the newest firestore.rules into Firebase and click Publish.";
  if(c.includes("unavailable") || c.includes("network")) return "The internet connection to Firebase dropped, or the school network is blocking firestore.googleapis.com.";
  return "Something went wrong talking to Firebase" + (c ? " (" + c + ")" : "") + ".";
}
export async function deleteClass(code){
  if(!configured){ const d = dload(); delete d.classes[code]; for(const [id, v] of Object.entries(d.images || {})) if(v.code === code) delete d.images[id]; dsave(d); return; }
  const { db, F } = await fbInit(); await F.deleteDoc(F.doc(db, "classes", code));
  await deleteWhere("images", code).catch(e => console.warn("Pictures not removed", e));
}

export async function submitRun(run){
  // run: {code,name,game,score,right,wrong,answers:[{q,a,ok,given}]}
  const body = { code:run.code, name:run.name.slice(0,24), nameKey:nameKey(run.name), game:run.game,
    score:Math.max(0, Math.floor(run.score)), right:run.right|0, wrong:run.wrong|0,
    answers:run.answers.slice(0,300).map(x => ({ q:String(x.q).slice(0,400), a:String(x.a).slice(0,200), ok:!!x.ok, given:String(x.given).slice(0,100) })) };
  if(!configured){ const d = dload(); d.runs.push({ ...body, t:Date.now() }); dsave(d); return; }
  await init(); const { db, F } = fb;
  await F.addDoc(F.collection(db, "runs"), { ...body, endedAt:F.serverTimestamp() });
}

export async function postBest(code, game, name, score){
  const key = nameKey(name), id = `${code}_${game}_${key}`;
  const body = { code, game, name:name.slice(0,24), nameKey:key, best:Math.max(0, Math.floor(score)) };
  if(!configured){ const d = dload(); if(d.board[id] && d.board[id].best >= body.best) return false; d.board[id] = { ...body, t:Date.now() }; dsave(d); return true; }
  await init(); const { db, F } = fb;
  const ref = F.doc(db, "leaderboard", id); const old = await F.getDoc(ref);
  if(old.exists() && old.data().best >= body.best) return false;
  await F.setDoc(ref, { ...body, updatedAt:F.serverTimestamp() });
  return true;
}
// Live leaderboard for one class. cb(entries) where entry = {game,name,nameKey,best}
export function watchBoard(code, cb, onError){
  if(!configured){
    const send = () => cb(Object.values(dload().board).filter(e => e.code === code));
    send(); demoListeners.add(send);
    const onStorage = e => { if(e.key === DKEY) send(); }; addEventListener("storage", onStorage);
    return () => { demoListeners.delete(send); removeEventListener("storage", onStorage); };
  }
  let off = () => {}, dead = false;
  init().then(() => { if(dead) return; const { db, F } = fb;
    off = F.onSnapshot(F.query(F.collection(db, "leaderboard"), F.where("code", "==", code)),
      s => cb(s.docs.map(d => d.data())), e => onError && onError(e));
  }).catch(e => onError && onError(e));
  return () => { dead = true; off(); };
}

export async function listRuns(code){
  if(!configured) return dload().runs.filter(r => r.code === code).map((r,i) => ({ id:"d"+i, ...r }));
  const { db, F } = await fbInit();
  const s = await F.getDocs(F.query(F.collection(db, "runs"), F.where("code", "==", code)));
  return s.docs.map(d => { const v = d.data(); return { id:d.id, ...v, t:ms(v.endedAt) }; });
}
async function deleteWhere(coll, code){
  const { db, F } = await fbInit();
  const s = await F.getDocs(F.query(F.collection(db, coll), F.where("code", "==", code)));
  for(let i=0; i<s.docs.length; i+=400){ const b = F.writeBatch(db); s.docs.slice(i, i+400).forEach(d => b.delete(d.ref)); await b.commit(); }
  return s.size;
}
export async function clearBoard(code){
  if(!configured){ const d = dload(); for(const k of Object.keys(d.board)) if(d.board[k].code === code) delete d.board[k]; dsave(d); return; }
  return deleteWhere("leaderboard", code);
}
export async function clearRuns(code){
  if(!configured){ const d = dload(); d.runs = d.runs.filter(r => r.code !== code); dsave(d); return; }
  return deleteWhere("runs", code);
}
export function resetDemo(){ try { localStorage.removeItem(DKEY); } catch {} dload(); }

/* ---------------- Teacher sign-in ---------------- */
// cb({email, isTeacher}) or cb(null) when signed out
export async function onTeacher(cb){
  if(!configured){ cb({ email:"demo teacher", isTeacher:true, demo:true }); return; }
  const { auth, A } = await fbInit();
  A.onAuthStateChanged(auth, u => cb(u && !u.isAnonymous ? { email:u.email, isTeacher:isTeacherEmail(u.email) } : null));
}
export async function teacherSignIn(){
  const { auth, A } = await fbInit();
  await A.signInWithPopup(auth, new A.GoogleAuthProvider());
}
export async function teacherSignOut(){ const { auth, A } = await fbInit(); await A.signOut(auth); }
