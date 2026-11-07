// Question sets: sample data, answer checking, and file/paste parsing.

export const SAMPLE = [
  {q:"What is 3/4 written as a decimal?",a:"0.75",wrong:["0.34","0.43","7.5"]},
  {q:"Solve for x: 2x + 5 = 17",a:"6",wrong:["11","8.5","12"]},
  {q:"Which organelle releases energy for the cell?",a:"Mitochondria",wrong:["Nucleus","Ribosome","Cell wall"]},
  {q:"Which planet is closest to the Sun?",a:"Mercury",wrong:["Venus","Mars","Earth"]},
  {q:"What is 15% of 200?",a:"30",wrong:["15","20","300"]},
  {q:"Which word is a synonym for \"abundant\"?",a:"Plentiful",wrong:["Scarce","Tiny","Hidden"]},
  {q:"What is the chemical formula for water?",a:"H2O",wrong:[]},
  {q:"What is the area of a rectangle 8 cm long and 5 cm wide? (number only)",a:"40;40 cm;40 square cm;40 cm2",wrong:[]},
  {q:"What is the capital of Canada?",a:"Ottawa",wrong:[]},
  {q:"Which ancient civilization built the pyramids at Giza?",a:"Egyptians",wrong:["Romans","Greeks","Maya"]},
  {q:"What is 5 cubed?",a:"125",wrong:["15","25","53"]},
  {q:"What type of rock forms when lava cools?",a:"Igneous",wrong:["Sedimentary","Metamorphic","Limestone"]},
  {q:"Which part of speech describes a noun?",a:"Adjective",wrong:["Adverb","Verb","Preposition"]},
  {q:"What is the greatest common factor of 18 and 24?",a:"6;six",wrong:[]},
  {q:"Who was the first President of the United States?",a:"George Washington;Washington",wrong:[]},
  {q:"Which gas do plants take in for photosynthesis?",a:"Carbon dioxide",wrong:["Oxygen","Nitrogen","Hydrogen"]},
  {q:"Simplify the ratio 4:6",a:"2:3",wrong:["4:3","1:2","3:2"]},
  {q:"The lesson or message of a story is its…",a:"Theme",wrong:["Setting","Plot","Conflict"]},
  {q:"How many sides does a hexagon have?",a:"6;six",wrong:[]},
  {q:"Which branch of the U.S. government makes laws?",a:"Legislative",wrong:["Executive","Judicial","Military"]},
  {q:"What is −7 + 12?",a:"5;five",wrong:[]},
  {q:"What is the boiling point of water in °C at sea level? (number only)",a:"100",wrong:[]}
];

export const esc = s => String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

export function normalize(s){
  return String(s).toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g,"")
    .replace(/[−–—]/g,"-").replace(/[^a-z0-9.:\/\- ]/g,"").replace(/\s+/g," ").trim().replace(/^(the|a|an) /,"");
}
export const accepted = a => String(a).split(";").map(s=>s.trim()).filter(Boolean);
export const displayAnswer = a => accepted(a)[0] || String(a);
export function isRight(given, ans){
  const g = normalize(given); if(!g) return false;
  return accepted(ans).some(a => {
    const n = normalize(a); if(n === g) return true;
    const fa = parseFloat(n.replace(/,/g,"")), fg = parseFloat(g.replace(/,/g,""));
    return /^-?[\d.,]+$/.test(n) && /^-?[\d.,]+$/.test(g) && !isNaN(fa) && fa === fg;
  });
}
// Student name -> stable key for the leaderboard ("Jordan R." -> "jordan-r")
export const nameKey = n => normalize(n).replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,24) || "player";

export function parseDelimited(text, delim){
  const rows=[]; let row=[], f="", q=false;
  for(let i=0;i<text.length;i++){ const c=text[i];
    if(q){ if(c==='"'){ if(text[i+1]==='"'){f+='"';i++;} else q=false; } else f+=c; }
    else if(c==='"'&&f==="") q=true;
    else if(c===delim){ row.push(f); f=""; }
    else if(c==="\n"||c==="\r"){ if(c==="\r"&&text[i+1]==="\n") i++; row.push(f); rows.push(row); row=[]; f=""; }
    else f+=c; }
  if(f!==""||row.length){ row.push(f); rows.push(row); }
  return rows;
}
// Columns: A question, B answer, C–E wrong choices (optional), F notes to study (optional).
// With a header row, a column titled "Notes" (or "Reference" / "Lesson") is used wherever it is.
export function rowsToQuestions(rows){
  rows = rows.map(r=>r.map(c=>String(c??"").trim())).filter(r=>r.some(Boolean));
  let notesCol = 5, wrongCols = [2,3,4];
  if(rows.length && /^(question|questions|prompt|q)$/i.test(rows[0][0])){
    const head = rows.shift().map(h => h.toLowerCase());
    const n = head.findIndex(h => /^(notes?|reference|ref|lesson|study|see)\b/.test(h));
    if(n >= 0){ notesCol = n; wrongCols = head.map((_,i) => i).filter(i => i >= 2 && i !== n).slice(0,4); }
  }
  return rows.filter(r=>r[0]&&r[1]).map(r=>{
    const q = {q:r[0].slice(0,400), a:r[1].slice(0,200), wrong:wrongCols.map(i => r[i]).filter(Boolean).slice(0,4).map(s=>s.slice(0,200))};
    if(r[notesCol]) q.notes = r[notesCol].slice(0,120);
    return q;
  });
}
export function parseText(text){
  text = text.replace(/^﻿/,"");
  if(/^\s*Q\s*\d*\s*[:.)]/im.test(text) && /^\s*A\s*\d*\s*[:.)]/im.test(text)){
    const out=[]; let cur=null;
    for(const raw of text.split(/\r?\n/)){ const line=raw.trim(); if(!line) continue; let m;
      if((m=line.match(/^Q\s*\d*\s*[:.)]\s*(.*)$/i))){ if(cur&&cur.q&&cur.a) out.push(cur); cur={q:m[1],a:"",wrong:[]}; }
      else if(cur&&(m=line.match(/^A\s*\d*\s*[:.)]\s*(.*)$/i))) cur.a=m[1];
      else if(cur&&(m=line.match(/^(W|Wrong|X)\s*\d*\s*[:.)]\s*(.*)$/i))) cur.wrong.push(m[2]);
      else if(cur&&(m=line.match(/^(N|Notes?|Ref|Reference)\s*[:.)]\s*(.*)$/i))) cur.notes=m[2];
      else if(cur&&!cur.a) cur.q+=" "+line; }
    if(cur&&cur.q&&cur.a) out.push(cur);
    return out.map(o=>{ const q={q:o.q.slice(0,400), a:o.a.slice(0,200), wrong:o.wrong.slice(0,4)}; if(o.notes) q.notes=o.notes.slice(0,120); return q; });
  }
  const first = text.split(/\r?\n/).find(l=>l.trim()) || "";
  const delim = first.includes("|") ? "|" : first.includes("\t") ? "\t" : ",";
  if(delim==="|") return rowsToQuestions(text.split(/\r?\n/).map(l=>l.split("|")));
  return rowsToQuestions(parseDelimited(text, delim));
}

let xlsxLoading = null;
function loadXLSX(){
  if(window.XLSX) return Promise.resolve();
  if(xlsxLoading) return xlsxLoading;
  xlsxLoading = new Promise((res,rej)=>{ const s=document.createElement("script");
    s.src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"; s.onload=res; s.onerror=()=>{xlsxLoading=null;rej(new Error("load"));};
    document.head.appendChild(s); });
  return xlsxLoading;
}
// Returns an array of questions, or throws an Error whose message is shown to the teacher.
export async function readQuestionFile(file){
  if(/\.xlsx?$/i.test(file.name)){
    await loadXLSX();
    const wb = window.XLSX.read(await file.arrayBuffer(), {type:"array"});
    return rowsToQuestions(window.XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], {header:1, defval:""}));
  }
  if(/\.docx?$/i.test(file.name)) throw new Error("Word files can't be read directly. Open the file, copy the questions, and paste them in the box below.");
  const text = await file.text();
  return /\.tsv$/i.test(file.name) ? rowsToQuestions(parseDelimited(text,"\t")) : parseText(text);
}

// Shrink a picture (file, pasted screenshot or dragged image) so it fits in the database.
// Returns a data: URL, usually 20–200 KB. Throws an Error with a message for the teacher.
export async function compressImage(blob){
  if(!blob || !/^image\//.test(blob.type)) throw new Error("That isn't a picture. Use a PNG, JPG, GIF or WebP image, or paste a screenshot.");
  const url = URL.createObjectURL(blob);
  try {
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error("That picture couldn't be opened. Try a PNG or JPG.")); i.src = url; });
    let maxSide = 1000, best = null;
    for(let attempt = 0; attempt < 4; attempt++){
      const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
      const w = Math.max(1, Math.round(img.naturalWidth * scale)), h = Math.max(1, Math.round(img.naturalHeight * scale));
      const c = document.createElement("canvas"); c.width = w; c.height = h;
      const g = c.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, w, h); g.drawImage(img, 0, 0, w, h);
      // Graphs and shapes are usually smallest as PNG; photos as WebP/JPEG. Keep whichever is smaller.
      const tries = [c.toDataURL("image/png"), c.toDataURL("image/webp", 0.85), c.toDataURL("image/jpeg", 0.85)].filter(d => /^data:image\/(png|webp|jpeg)/.test(d));
      best = tries.sort((a, b) => a.length - b.length)[0];
      if(best.length < 650000) return best;
      maxSide = Math.round(maxSide * 0.7);
    }
    if(best && best.length < 900000) return best;
    throw new Error("That picture is too detailed to save. Try a smaller screenshot.");
  } finally { URL.revokeObjectURL(url); }
}
