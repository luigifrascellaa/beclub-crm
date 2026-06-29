import { useState, useEffect } from "react";
import { ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell, PieChart, Pie } from "recharts";
import { TeamView } from "./components/Team";
import { ProfiloView } from "./components/Profilo";
import { ListaNomiView } from "./components/ListaNomi";

const SB_URL = "https://kuxrpbsvnkxhsicbyupp.supabase.co";
const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt1eHJwYnN2bmt4aHNpY2J5dXBwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIwNzMwODIsImV4cCI6MjA5NzY0OTA4Mn0.s_lqOUC8939I2Wgf-Qkcq9WaiH1Nxze1uv4-PIV6s7I";

async function sbFetch(path, opts = {}) {
  const res = await fetch(SB_URL + path, {
    ...opts,
    headers: {
      "apikey": SB_KEY,
      "Authorization": "Bearer " + (opts._token || SB_KEY),
      "Content-Type": "application/json",
      "Prefer": "return=representation",
      ...(opts.headers || {}),
    },
  });
  const text = await res.text();
  if (!res.ok) {
    const e = text ? JSON.parse(text) : {};
    const msg = e.message || res.statusText;
    // Se il token è scaduto, forza logout
    if (msg.toLowerCase().includes("jwt expired") || msg.toLowerCase().includes("invalid jwt") || res.status === 401) {
      localStorage.removeItem("becrm_session");
      window.location.reload();
    }
    throw new Error(msg);
  }
  return text ? JSON.parse(text) : null;
}

const sbSignUp  = (email, pw)      => sbFetch("/auth/v1/signup", { method:"POST", body:JSON.stringify({ email, password:pw }) });
const sbSignIn  = (email, pw)      => sbFetch("/auth/v1/token?grant_type=password", { method:"POST", body:JSON.stringify({ email, password:pw }) });
const sbSignOut = (tok)            => sbFetch("/auth/v1/logout", { method:"POST", _token:tok });
const sbList    = (tok, uid)       => sbFetch("/rest/v1/prospects?select=*&order=created_at.asc&user_id=eq."+uid, { _token:tok });
const sbInsert  = (tok, row)       => sbFetch("/rest/v1/prospects", { method:"POST", _token:tok, body:JSON.stringify(row) });
const sbUpdate  = (tok, id, row)   => sbFetch("/rest/v1/prospects?id=eq."+id, { method:"PATCH", _token:tok, body:JSON.stringify(row) });
const sbDelete  = (tok, id)        => sbFetch("/rest/v1/prospects?id=eq."+id, { method:"DELETE", _token:tok });

// Profile helpers
const sbGetProfile      = (tok, uid)        => sbFetch("/rest/v1/profiles?id=eq."+uid+"&select=*", { _token:tok });
const sbCreateProfile   = (tok, row)        => sbFetch("/rest/v1/profiles", { method:"POST", _token:tok, body:JSON.stringify(row) });
const sbUpdateProfile   = (tok, uid, row)   => sbFetch("/rest/v1/profiles?id=eq."+uid, { method:"PATCH", _token:tok, body:JSON.stringify(row) });
const sbGetDownline     = (tok)             => sbFetch("/rest/v1/profiles?select=*&positioned_under=not.is.null", { _token:tok });
const sbGetAllProfiles  = (tok)             => sbFetch("/rest/v1/profiles?select=*", { _token:tok });
const sbGetDownlineProspects = (tok, uids)  => sbFetch("/rest/v1/prospects?select=*&user_id=in.("+uids.join(",")+")", { _token:tok });
const sbGetProfileByRef = (tok, code)       => sbFetch("/rest/v1/profiles?referral_code=eq."+code+"&select=*", { _token:tok });
const sbLinkDownline    = (tok, uid, uplineId) => sbFetch("/rest/v1/profiles?id=eq."+uid, { method:"PATCH", _token:tok, body:JSON.stringify({ upline_id:uplineId }) });
const sbPositionMember  = (tok, uid, positionedUnder) => sbFetch("/rest/v1/profiles?id=eq."+uid, { method:"PATCH", _token:tok, body:JSON.stringify({ positioned_under:positionedUnder }) });
const sbGetPositions    = (tok)             => sbFetch("/rest/v1/team_positions?select=*", { _token:tok });
const sbSetPosition     = (tok, uplineId, memberId, team) => sbFetch("/rest/v1/team_positions", { method:"POST", _token:tok, headers:{"Prefer":"resolution=merge-duplicates"}, body:JSON.stringify({ upline_id:uplineId, member_id:memberId, team }) });


function toApp(r) {
  return {
    id:r.id, nome:r.nome||"", cognome:r.cognome||"", citta:r.citta||"",
    fonte:r.fonte||"Instagram", fase:r.fase||"INVITO",
    conosciutoAt:r.conosciuto_at||"", followUp:r.follow_up||"",
    note:r.note||"", storico:r.storico||[], profilazione:r.profilazione||{},
    pacchetto:r.pacchetto||"", bvCustom:r.bv_custom||0,
    telefono:r.telefono||"", instagram:r.instagram||"",
    checklist:r.checklist||{kyc:false,pandadoc:false,click:false},
    interesse:r.interesse||"",
  };
}
function toDB(p, uid) {
  return {
    id:p.id, user_id:uid, nome:p.nome, cognome:p.cognome, citta:p.citta,
    fonte:p.fonte, fase:p.fase, conosciuto_at:p.conosciutoAt,
    follow_up:p.followUp||null, note:p.note, storico:p.storico, profilazione:p.profilazione,
    pacchetto:p.pacchetto||null, bv_custom:p.bvCustom||null,
    telefono:p.telefono||null, instagram:p.instagram||null,
    checklist:p.checklist||{kyc:false,pandadoc:false,click:false},
    interesse:p.interesse||null,
  };
}

const PACCHETTI = [
  { key:"starter",   label:"Starter",   bv:100  },
  { key:"standard",  label:"Standard",  bv:250  },
  { key:"premium",   label:"Premium",   bv:550  },
  { key:"signature", label:"Signature", bv:1025 },
  { key:"altro",     label:"Altro",     bv:0    },
];
function bvOfPacchetto(key, bvCustom) {
  if (key==="altro") return bvCustom||0;
  const p = PACCHETTI.find(x=>x.key===key);
  return p?p.bv:0;
}

const FASI_FUNNEL   = ["INVITO","CONOSCITIVA","FUP1","FUP2","PACK","CLOSING","SUB"];
const FASI_DASH     = ["CONOSCITIVA","FUP1","FUP2","PACK","CLOSING","SUB"];
const FASI_SPECIALI = ["FOLLOW_UP","NON_INT"];
const FASI          = [...FASI_FUNNEL, ...FASI_SPECIALI];
const FONTI         = ["Instagram","TikTok","Offline","Referenza","Lista Nomi","Modulo"];
const FONTE_ICO     = { Instagram:"", TikTok:"", Offline:"", Referenza:"", "Lista Nomi":"", Modulo:"" };
const INTERESSE     = ["Alto","Medio","Basso"];
const INTERESSE_CLR = { Alto:"#10b981", Medio:"#f59e0b", Basso:"#ef4444" };

const FASE_CLR = {
  INVITO:"#8b5cf6", CONOSCITIVA:"#7c3aed", FUP1:"#2563eb", FUP2:"#3b82f6", PACK:"var(--a2)",
  CLOSING:"#22d3ee", SUB:"#10b981", FOLLOW_UP:"#f59e0b", NON_INT:"#6b7280",
};
const FASE_LABEL = {
  INVITO:"Invito", CONOSCITIVA:"Conoscitiva", FUP1:"FUP 1", FUP2:"FUP 2", PACK:"Pack",
  CLOSING:"Closing", SUB:"Iscritto", FOLLOW_UP:"Follow Up", NON_INT:"Non Int.",
};

const PLEASURES = [
  { key:"tempo", label:"Tempo" },
  { key:"relazioni", label:"Relazioni / Esperienze" },
  { key:"crescita", label:"Crescita Personale" },
  { key:"internet_money", label:"Internet Money" },
  { key:"extra_mensile", label:"Extra Mensile" },
  { key:"investimenti", label:"Investimenti" },
];
const FORZA = [
  { key:"soldi", label:"Soldi" },
  { key:"istruzione", label:"Istruzione" },
  { key:"sociale", label:"Sociale" },
];
const PROFILO_TOTAL = PLEASURES.length + FORZA.length;

const TV = [null, "-", ".", "+"];
const TC = { null:"var(--border2)", "-":"#ef4444", ".":"#f59e0b", "+":"#10b981" };
const TL = { "-":"\u2013", ".":"\u00b7", "+":"+" };
function nextToggle(v) { const i = TV.indexOf(v); return TV[(i+1) % TV.length]; }

function profiloBadge(p) {
  const pr = p.profilazione || {};
  let pos = 0, comp = 0;
  PLEASURES.forEach(f => { const v = pr.pleasures?.[f.key]; if (v!=null) comp++; if (v==="+") pos++; });
  FORZA.forEach(f => { const v = pr.forza?.[f.key]; if (v!=null) comp++; if (v==="+") pos++; });
  return { positivi:pos, compilati:comp };
}

const JUNG = [
  { key:"blu",    label:"BLU",    sub:"Metodo e professionalita", desc:"Analitico, preciso, orientato al processo.",   bg:"linear-gradient(135deg,#3b4fd4,#6366f1)", border:"#6366f1", glow:"#6366f155" },
  { key:"rosso",  label:"ROSSO",  sub:"Risultati",                desc:"Diretto, competitivo, orientato all'azione.",  bg:"linear-gradient(135deg,#c2410c,#ef4444)", border:"#ef4444", glow:"#ef444455" },
  { key:"giallo", label:"GIALLO", sub:"Umanita e leggerezza",     desc:"Entusiasta, socievole, ottimista.",             bg:"linear-gradient(135deg,#b45309,#f59e0b)", border:"#f59e0b", glow:"#f59e0b55" },
  { key:"verde",  label:"VERDE",  sub:"Disposizione ad aiutare",  desc:"Empatico, paziente, affidabile.",              bg:"linear-gradient(135deg,#047857,#10b981)", border:"#10b981", glow:"#10b98155" },
];

const CICLI = [
  [73,"2026-01-03","2026-01-31"],[74,"2026-01-31","2026-02-28"],[75,"2026-02-28","2026-03-28"],
  [76,"2026-03-28","2026-04-25"],[77,"2026-04-25","2026-05-23"],[78,"2026-05-23","2026-06-20"],
  [79,"2026-06-20","2026-07-18"],[80,"2026-07-18","2026-08-15"],[81,"2026-08-15","2026-09-12"],
  [82,"2026-09-12","2026-10-10"],[83,"2026-10-10","2026-11-07"],[84,"2026-11-07","2026-12-05"],
  [85,"2026-12-05","2027-01-02"],
];
const CICLO_CORRENTE = (() => {
  const t = new Date().toISOString().split("T")[0];
  for (const [c,s,e] of CICLI) if (t>=s && t<e) return c;
  return CICLI[CICLI.length-1][0];
})();
const CICLO_NUMS = CICLI.map(r=>r[0]).sort((a,b)=>b-a);

function cicloOfDate(d) { if (!d) return null; for (const [c,s,e] of CICLI) if (d>=s && d<e) return c; return null; }
function cicloLabel(c) {
  const r = CICLI.find(x=>x[0]===Number(c));
  if (!r) return "Ciclo "+c;
  const fd = s => new Date(s+"T12:00:00").toLocaleDateString("it-IT",{day:"numeric",month:"short"});
  return fd(r[1])+" \u2013 "+fd(r[2]);
}
function dataByCiclo(arr,c) {
  const r = CICLI.find(x=>x[0]===Number(c));
  if (!r) return [];
  return arr.filter(p=>p.conosciutoAt && p.conosciutoAt>=r[1] && p.conosciutoAt<r[2]);
}
function buildStorico(prospect, fase, dateForFase) {
  const storico = [...(prospect.storico||[])];
  const idx = FASI_FUNNEL.indexOf(fase);
  if (idx>=0) {
    for (let i=0;i<=idx;i++) {
      const f = FASI_FUNNEL[i];
      if (!storico.some(s=>s.fase===f))
        storico.push({fase:f, data:f===fase?(dateForFase||prospect.conosciutoAt):prospect.conosciutoAt});
    }
  }
  return storico.sort((a,b)=>FASI_FUNNEL.indexOf(a.fase)-FASI_FUNNEL.indexOf(b.fase));
}
function reachedInCiclo(p,fase,c) {
  const storico = p.storico||[];
  const e = storico.find(s=>s.fase===fase);
  if (e) return cicloOfDate(e.data)===Number(c);
  // Se CONOSCITIVA non c'è ma FUP1 sì, considera CONOSCITIVA raggiunta con FUP1
  if (fase==="CONOSCITIVA") {
    const fup1 = storico.find(s=>s.fase==="FUP1");
    if (fup1) return cicloOfDate(fup1.data)===Number(c);
  }
  return false;
}

function reachedEver(p,fase) {
  const storico = p.storico||[];
  if (storico.some(s=>s.fase===fase)) return true;
  // Se CONOSCITIVA non c'è ma FUP1 sì, considera raggiunta
  if (fase==="CONOSCITIVA") return storico.some(s=>s.fase==="FUP1");
  return false;
}
function highestReached(p) {
  let best=null,bi=-1;
  (p.storico||[]).forEach(s=>{const i=FASI_FUNNEL.indexOf(s.fase);if(i>bi){bi=i;best=s.fase;}});
  return best||"INVITO";
}

const genId = () => Date.now().toString(36)+Math.random().toString(36).slice(2);
const today = () => new Date().toISOString().split("T")[0];
const isOver  = d => d && d < today();
const isToday = d => d === today();
const fmt = d => d ? new Date(d+"T12:00:00").toLocaleDateString("it-IT") : "\u2014";

function teamStats(prospects) {
  const total = prospects.length;
  const sub   = prospects.filter(p=>p.fase==="SUB").length;
  const act   = prospects.filter(p=>["CONOSCITIVA","FUP1","FUP2","PACK","CLOSING"].includes(p.fase)).length;
  const conv  = total>0 ? Math.round(sub/total*100) : 0;
  const bv    = prospects.filter(p=>p.fase==="SUB").reduce((acc,p)=>acc+bvOfPacchetto(p.pacchetto,p.bvCustom),0);
  return { total, sub, act, conv, bv };
}

const TEMI = {
  blu:   { label:"Blu",   preview:"linear-gradient(135deg,#1e40af,#0ea5e9)", vars:{"--bg":"#060b18","--bg2":"#080f1f","--bg3":"#0a1426","--bg4":"#0d1b33","--border":"#11203a","--border2":"#1e3a5f","--a1":"#2563eb","--a2":"#0ea5e9","--a1-10":"#2563eb1a","--a1-12":"#2563eb1f","--a1-13":"#2563eb21","--a1-18":"#2563eb2e","--a1-25":"#2563eb40","--a1-31":"#2563eb4f","--text":"#eff6ff","--muted":"#5278a8","--muted2":"#2a4060","--sidebar-active":"#0d1b33","--sidebar-border":"#2563eb40"} },
  verde: { label:"Verde", preview:"linear-gradient(135deg,#065f46,#10b981)", vars:{"--bg":"#030d08","--bg2":"#041208","--bg3":"#06180d","--bg4":"#082014","--border":"#0a2a14","--border2":"#134d28","--a1":"#059669","--a2":"#10b981","--a1-10":"#0596691a","--a1-12":"#0596691f","--a1-13":"#05966921","--a1-18":"#0596692e","--a1-25":"#05966940","--a1-31":"#0596694f","--text":"#ecfdf5","--muted":"#3d7a5a","--muted2":"#1a3d2a","--sidebar-active":"#082014","--sidebar-border":"#05966940"} },
  viola: { label:"Viola", preview:"linear-gradient(135deg,#4c1d95,#a78bfa)", vars:{"--bg":"#06030f","--bg2":"#0a0518","--bg3":"#0f0820","--bg4":"#140b2a","--border":"#1a1035","--border2":"#2e1a55","--a1":"#7c3aed","--a2":"#a78bfa","--a1-10":"#7c3aed1a","--a1-12":"#7c3aed1f","--a1-13":"#7c3aed21","--a1-18":"#7c3aed2e","--a1-25":"#7c3aed40","--a1-31":"#7c3aed4f","--text":"#f5f3ff","--muted":"#6b5a9a","--muted2":"#2d1a55","--sidebar-active":"#140b2a","--sidebar-border":"#7c3aed40"} },
  rosa:  { label:"Rosa",  preview:"linear-gradient(135deg,#9d174d,#f472b6)", vars:{"--bg":"#0f0308","--bg2":"#180510","--bg3":"#200718","--bg4":"#2a0a20","--border":"#380d2a","--border2":"#5a1a42","--a1":"#db2777","--a2":"#f472b6","--a1-10":"#db27771a","--a1-12":"#db27771f","--a1-13":"#db277721","--a1-18":"#db27772e","--a1-25":"#db277740","--a1-31":"#db27774f","--text":"#fdf2f8","--muted":"#8a4a6b","--muted2":"#4a1530","--sidebar-active":"#2a0a20","--sidebar-border":"#db277740"} },
  oro:   { label:"Oro",   preview:"linear-gradient(135deg,#78350f,#fbbf24)", vars:{"--bg":"#080600","--bg2":"#0f0c00","--bg3":"#181200","--bg4":"#201800","--border":"#2a2000","--border2":"#3d3000","--a1":"#d97706","--a2":"#fbbf24","--a1-10":"#d977061a","--a1-12":"#d977061f","--a1-13":"#d9770621","--a1-18":"#d977062e","--a1-25":"#d9770640","--a1-31":"#d977064f","--text":"#fffbeb","--muted":"#7a6530","--muted2":"#3d3000","--sidebar-active":"#201800","--sidebar-border":"#d9770640"} },
};

function applyTema(temaKey) {
  const t = TEMI[temaKey] || TEMI.blu;
  const root = document.documentElement;
  Object.entries(t.vars).forEach(([k,v]) => root.style.setProperty(k, v));
  document.body.style.background = t.vars["--bg"];
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
:root{
  --bg:#060b18; --bg2:#080f1f; --bg3:#0a1426; --bg4:#0d1b33;
  --border:#11203a; --border2:#1e3a5f;
  --a1:#2563eb; --a2:#0ea5e9;
  --text:#dbeafe; --muted:#5278a8; --glow:#2563eb;
}
*{box-sizing:border-box;margin:0;padding:0}
html,body,#root{height:100%;font-family:'Inter',sans-serif}
body{background:var(--bg);color:var(--text);overflow:hidden}
::-webkit-scrollbar{width:5px;height:5px}
::-webkit-scrollbar-thumb{background:var(--border2);border-radius:99px}
input,select,textarea{background:var(--bg3);border:1px solid var(--border2);border-radius:10px;padding:9px 13px;color:var(--text);font-size:13px;font-family:'Inter',sans-serif;outline:none;width:100%;transition:border .2s}
input:focus,select:focus,textarea:focus{border-color:var(--a1);box-shadow:0 0 0 3px var(--a1-13)}
input::placeholder,textarea::placeholder{color:var(--muted)}
select option{background:var(--bg3)}
input[type=date]::-webkit-calendar-picker-indicator{filter:invert(.6) sepia(1) hue-rotate(180deg);cursor:pointer}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes popIn{from{transform:scale(.95);opacity:0}to{transform:scale(1);opacity:1}}
@keyframes barIn{from{width:0}to{width:var(--w)}}
@keyframes pulse{0%,100%{box-shadow:0 0 14px #ef444430}50%{box-shadow:0 0 26px #ef444460}}
@keyframes spin{to{transform:rotate(360deg)}}
.kpi:hover{transform:translateY(-3px);transition:transform .25s}
.hrow:hover{background:var(--bg4)}
.pop{animation:popIn .22s cubic-bezier(.34,1.3,.64,1)}
.pulse{animation:pulse 2.5s ease-in-out infinite}
.bar{border-radius:99px;animation:barIn .8s cubic-bezier(.4,0,.2,1) forwards}
.tabbtn{padding:8px 16px;border-radius:8px;border:none;cursor:pointer;font-size:12px;font-weight:700;font-family:'Inter',sans-serif;transition:all .2s}
.togbtn{width:34px;height:28px;border-radius:7px;border:none;cursor:pointer;font-size:13px;font-weight:900;font-family:'Inter',sans-serif;transition:all .18s;display:flex;align-items:center;justify-content:center}
.spinner{width:18px;height:18px;border:2px solid var(--border2);border-top-color:var(--a1);border-radius:50%;animation:spin .7s linear infinite;display:inline-block}
@media(max-width:768px){
  body{overflow:auto}
  aside.sb{display:none!important}
  nav.mobnav{display:flex!important}
  main.mc{height:calc(100vh - 60px)!important}
  .kpi-grid{grid-template-columns:repeat(2,1fr)!important;gap:8px!important}
  .page-wrap{padding:1rem!important}
  .tbl-wrap{overflow-x:auto!important;-webkit-overflow-scrolling:touch}
  .modal-overlay{align-items:flex-end!important;padding:0!important}
  .modal-box{border-radius:20px 20px 0 0!important;max-height:92vh!important}
  .filt-row{flex-wrap:wrap!important}
  .filt-row>*{min-width:calc(50% - 4px)!important;flex:1 1 calc(50% - 4px)!important}
  h1.ptitle{font-size:20px!important}
  .toast-pos{bottom:68px!important;right:12px!important;left:12px!important;text-align:center}
}
nav.mobnav{display:none}
`;


function Av({ n, c, color, size=34 }) {
  return (
    <div style={{width:size,height:size,borderRadius:"50%",flexShrink:0,background:"linear-gradient(135deg,"+color+","+color+"99)",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:900,fontSize:size*0.32,boxShadow:"0 0 10px "+color+"35"}}>
      {(n||"?")[0]}{(c||"")[0]}
    </div>
  );
}

//  AUTH SCREEN 
function AuthScreen({ onAuth }) {
  const [mode, setMode]     = useState("login");
  const [email, setEmail]   = useState("");
  const [pass, setPass]     = useState("");
  const [err, setErr]       = useState("");
  const [loading, setLoading] = useState(false);
  const [nome, setNome]       = useState("");
  const [cognome, setCognome] = useState("");
  const [remember, setRemember] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (ref) {
      // Salva ref con timestamp — scade dopo 30 minuti
      localStorage.setItem("pending_ref", ref);
      localStorage.setItem("pending_ref_expires", Date.now() + 10 * 60 * 1000);
      setMode("signup");
    }

    // Auto-restore session
    const saved = localStorage.getItem("becrm_session");
    if (saved) {
      try {
        const session = JSON.parse(saved);
        if (session.token && session.userId) {
          onAuth({ token:session.token, userId:session.userId, email:session.email, profile:session.profile||null });
        }
      } catch(e) { localStorage.removeItem("becrm_session"); }
    }
  }, []);

  async function submit() {
    if (!email.trim() || !pass.trim()) { setErr("Compila email e password"); return; }
    if (mode === "signup" && (!nome.trim() || !cognome.trim())) { setErr("Compila nome e cognome"); return; }
    setLoading(true); setErr("");
    try {
      if (mode === "signup") {
        const res = await sbSignUp(email, pass);
        if (res && res.access_token) {
          const tok    = res.access_token;
          const userId = res.user.id;
          const pendingRef = localStorage.getItem("pending_ref");
          const pendingExpires = localStorage.getItem("pending_ref_expires");
          let uplineId = null;
          if (pendingRef && pendingExpires && Date.now() < Number(pendingExpires)) {
            const profiles = await sbGetProfileByRef(tok, pendingRef);
            if (profiles && profiles.length > 0) uplineId = profiles[0].id;
          }
          localStorage.removeItem("pending_ref");
          localStorage.removeItem("pending_ref_expires");
          await sbCreateProfile(tok, { id:userId, email, nome:nome.trim(), cognome:cognome.trim(), upline_id:uplineId, positioned_under:uplineId });
          const profile = await sbGetProfile(tok, userId);
          const authData = { token:tok, userId, email, profile:profile?.[0]||null };
          if (remember) localStorage.setItem("becrm_session", JSON.stringify(authData));
          onAuth(authData);
        } else {
          setErr("Registrazione ok! Ora accedi.");
          setMode("login");
        }
      } else {
        const res = await sbSignIn(email, pass);
        if (res && res.access_token) {
          const tok    = res.access_token;
          const userId = res.user.id;
          let profile  = await sbGetProfile(tok, userId);
          if (!profile || profile.length === 0) {
            await sbCreateProfile(tok, { id:userId, email });
            profile = await sbGetProfile(tok, userId);
          }
          const authData = { token:tok, userId, email, profile:profile?.[0]||null };
          if (remember) localStorage.setItem("becrm_session", JSON.stringify(authData));
          onAuth(authData);
        } else {
          setErr("Credenziali non valide");
        }
      }
    } catch(e) { setErr(e.message||"Errore di connessione"); }
    setLoading(false);
  }

  return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",background:"var(--bg)",padding:16}}>
      <div className="pop" style={{width:"100%",maxWidth:400,background:"var(--bg2)",border:"1px solid var(--border2)",borderRadius:20,padding:"2.2rem",boxShadow:"0 20px 70px #000000aa"}}>
        <div style={{textAlign:"center",marginBottom:28}}>
          <div style={{fontWeight:900,fontSize:20,color:"var(--text)",letterSpacing:-0.5}}>BE Club CRM</div>
        </div>
        <div style={{display:"flex",background:"var(--bg3)",borderRadius:10,padding:4,marginBottom:24,border:"1px solid var(--border)"}}>
          {["login","signup"].map(m=>(
            <button key={m} onClick={()=>{setMode(m);setErr("");}} className="tabbtn"
              style={{flex:1,background:mode===m?"var(--bg4)":"transparent",color:mode===m?"var(--a2)":"var(--muted)",boxShadow:mode===m?"inset 0 0 0 1px var(--sidebar-border)":"none"}}>
              {m==="login"?"Accedi":"Registrati"}
            </button>
          ))}
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:12,marginBottom:16}}>
          {mode==="signup" && (
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <div>
                <label style={{fontSize:11,fontWeight:700,color:"var(--muted)",textTransform:"uppercase",letterSpacing:.8,marginBottom:5,display:"block"}}>Nome *</label>
                <input value={nome} onChange={e=>setNome(e.target.value)} placeholder="Luigi" />
              </div>
              <div>
                <label style={{fontSize:11,fontWeight:700,color:"var(--muted)",textTransform:"uppercase",letterSpacing:.8,marginBottom:5,display:"block"}}>Cognome *</label>
                <input value={cognome} onChange={e=>setCognome(e.target.value)} placeholder="Rossi" />
              </div>
            </div>
          )}
          <div>
            <label style={{fontSize:11,fontWeight:700,color:"var(--muted)",textTransform:"uppercase",letterSpacing:.8,marginBottom:5,display:"block"}}>Email</label>
            <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="tua@email.com" onKeyDown={e=>e.key==="Enter"&&submit()} />
          </div>
          <div>
            <label style={{fontSize:11,fontWeight:700,color:"var(--muted)",textTransform:"uppercase",letterSpacing:.8,marginBottom:5,display:"block"}}>Password</label>
            <input type="password" value={pass} onChange={e=>setPass(e.target.value)} placeholder="••••••••" onKeyDown={e=>e.key==="Enter"&&submit()} />
          </div>
        </div>
        {err && <div style={{background:"#ef444415",border:"1px solid #ef444435",borderRadius:9,padding:"9px 13px",fontSize:12,color:"#f87171",marginBottom:14,lineHeight:1.5}}>{err}</div>}

        {mode==="login" && (
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:16,cursor:"pointer"}} onClick={()=>setRemember(r=>!r)}>
            <div style={{width:18,height:18,borderRadius:5,border:"1.5px solid "+(remember?"var(--a1)":"var(--border2)"),background:remember?"var(--a1)":"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"all .2s"}}>
              {remember && <span style={{color:"#fff",fontSize:11,fontWeight:900}}></span>}
            </div>
            <span style={{fontSize:12,color:"var(--muted)",userSelect:"none"}}>Ricordami su questo dispositivo</span>
          </div>
        )}
        <button onClick={submit} disabled={loading}
          style={{width:"100%",padding:"11px",background:"linear-gradient(135deg,var(--a1),var(--a2))",color:"#fff",border:"none",borderRadius:10,cursor:loading?"not-allowed":"pointer",fontWeight:800,fontSize:14,display:"flex",alignItems:"center",justifyContent:"center",gap:8,opacity:loading?0.7:1}}>
          {loading && <span className="spinner" />}
          {mode==="login"?"Accedi":"Crea account"}
        </button>
        {mode==="login" && (
          <div style={{textAlign:"center",marginTop:16,fontSize:11,color:"var(--muted)"}}>
            Non hai un account?{" "}
            <span onClick={()=>{setMode("signup");setErr("");}} style={{color:"var(--a2)",cursor:"pointer",fontWeight:700}}>Registrati</span>
          </div>
        )}
      </div>
    </div>
  );
}

//  APP 
export default function App() {
  const [auth, setAuth]           = useState(null);
  const [data, setData]           = useState([]);
  const [view, setView]           = useState("dash");
  const [dashCiclo, setDashCiclo] = useState(CICLO_CORRENTE);
  const [modal, setModal]         = useState(null);
  const [sel, setSel]             = useState(null);
  const [form, setForm]           = useState({});
  const [toast, setToast]         = useState(null);
  const [search, setSearch]       = useState("");
  const [fFase, setFFase]         = useState("");
  const [fFonte, setFFonte]       = useState("");
  const [fCiclo, setFCiclo]       = useState("");
  const [fCitta, setFCitta]       = useState("");
  const [fInteresse, setFInteresse] = useState("");
  const [ready, setReady]         = useState(false);
  const [saving, setSaving]       = useState(false);
  const [downline, setDownline]   = useState([]);
  const [dlProspects, setDlProspects] = useState([]);
  const [positions, setPositions] = useState([]);
  const [dashMode, setDashMode]   = useState("personale");
  const [sidebarMode, setSidebarMode] = useState("tutti");
  const [listaMode, setListaMode] = useState("personale");

  useEffect(()=>{
    const el=document.createElement("style");
    el.textContent=CSS;
    document.head.appendChild(el);
    applyTema("blu"); // default
    return ()=>document.head.removeChild(el);
  },[]);

  useEffect(()=>{
    if (auth?.profile?.tema) applyTema(auth.profile.tema);
  },[auth?.profile?.tema]);

  useEffect(()=>{
    if (!auth) { setData([]); setReady(true); return; }
    setReady(false);
    sbList(auth.token, auth.userId).then(rows=>{
      const arr=(rows||[]).map(r=>{
        const p=toApp(r);
        if (!p.storico.length) p.storico=buildStorico(p,p.fase,p.conosciutoAt);
        return p;
      });
      setData(arr);
    }).catch(e=>showToast("Errore: "+e.message,"#ef4444")).finally(()=>setReady(true));

    // Load downline ricorsiva + posizioni
    Promise.all([
      sbGetAllProfiles(auth.token),
      sbGetPositions(auth.token).catch(()=>[]),
    ]).then(async ([allProfiles, allPositions]) => {
      const all = allProfiles || [];
      const pos = allPositions || [];
      setPositions(pos);
      function buildFullDownline(parentId) {
        const result = [];
        function collect(pid) {
          const children = all.filter(p => p.positioned_under === pid);
          children.forEach(child => { result.push(child); collect(child.id); });
        }
        collect(parentId);
        return result;
      }
      const posizionati = buildFullDownline(auth.userId);
      // Aggiungi anche chi ha upline_id = me ma non è ancora posizionato (in attesa)
      const inAttesaIds = new Set(posizionati.map(p=>p.id));
      const inAttesa = all.filter(p => 
        p.upline_id === auth.userId && 
        !p.positioned_under && 
        !inAttesaIds.has(p.id)
      );
      const mine = [...posizionati, ...inAttesa];
      setDownline(mine);
      if (mine.length > 0) {
        const uids = mine.map(p => p.id);
        const dp = await sbGetDownlineProspects(auth.token, uids);
        setDlProspects((dp||[]).map(r=>({...toApp(r), _userId:r.user_id})));
      }
    }).catch(()=>{});
  },[auth]);

  function isMyDownline(profile, myId, allProfiles) {
    if (profile.positioned_under === myId) return true;
    if (!profile.positioned_under) return false;
    const parent = allProfiles.find(p=>p.id===profile.positioned_under);
    if (!parent) return false;
    return isMyDownline(parent, myId, allProfiles);
  }

  function showToast(msg,color="#22d3ee") { setToast({msg,color}); setTimeout(()=>setToast(null),2800); }
  function updateLocalProspect(upd) {
    if (data.find(x=>x.id===upd.id)) {
      setData(d=>d.map(x=>x.id===upd.id?upd:x));
    } else {
      setDlProspects(d=>d.map(x=>x.id===upd.id?{...upd,_userId:x._userId,_ownerName:x._ownerName}:x));
    }
    setSel(upd);
  }

  function getProspectById(id) {
    return data.find(x=>x.id===id) || dlProspects.find(x=>x.id===id);
  }

  function getOwnerToken() { return auth.token; }
  function openAdd()    { setForm({fase:"INVITO",fonte:"Instagram",conosciutoAt:today()}); setModal("add"); }
  function openDetail(p){ setSel(p); setModal("detail"); }
  function closeModal() { setModal(null); setSel(null); setForm({}); }

  async function handleLogout() {
    try { await sbSignOut(auth.token); } catch(e){}
    localStorage.removeItem("becrm_session");
    setAuth(null); setData([]); setReady(true);
  }

  async function saveForm() {
    if (!form.nome?.trim()) return;
    if (form.fase === "SUB" && !form.pacchetto) { showToast("Seleziona il pacchetto per un iscritto ", "#ef4444"); return; }
    setSaving(true);
    try {
      const conosciutoAt = form.conosciutoAt||today();
      const storico = buildStorico({...form,conosciutoAt},form.fase,conosciutoAt);
      const record  = {...form,conosciutoAt,storico};
      // usa l'owner originale se è un prospect del team, altrimenti auth.userId
      const ownerId = form._userId || auth.userId;
      if (modal==="add") {
        const np={...record,id:genId()};
        await sbInsert(auth.token,toDB(np,auth.userId));
        setData(d=>[...d,np]);
        showToast("Prospect aggiunto ");
      } else {
        await sbUpdate(auth.token,record.id,toDB(record,ownerId));
        // aggiorna in data (personali) o dlProspects (team)
        if (data.find(p=>p.id===record.id)) {
          setData(d=>d.map(p=>p.id===record.id?record:p));
        } else {
          setDlProspects(d=>d.map(p=>p.id===record.id?{...record,_userId:ownerId,_ownerName:p._ownerName}:p));
        }
        showToast("Aggiornato ");
      }
    } catch(e) { showToast("Errore: "+e.message,"#ef4444"); }
    setSaving(false); closeModal();
  }

  async function deleteProp(id) {
    try {
      await sbDelete(auth.token,id);
      setData(d=>d.filter(p=>p.id!==id));
      showToast("Rimosso","#ef4444");
    } catch(e) { showToast("Errore: "+e.message,"#ef4444"); }
    closeModal();
  }

  async function invitaProspect(fields) {
    const np = {
      id: genId(),
      nome: fields.nome||"",
      cognome: fields.cognome||"",
      citta: fields.citta||"",
      telefono: fields.telefono||"",
      instagram: fields.instagram||"",
      note: fields.note||"",
      profilazione: fields.profilazione||{},
      fonte: "Lista Nomi",
      fase: "INVITO",
      conosciutoAt: fields.conosciutoAt||today(),
      followUp: "",
      storico: [],
      pacchetto: "",
      checklist: { kyc:false, pandadoc:false, click:false },
    };
    np.storico = buildStorico(np, "INVITO", np.conosciutoAt);
    try {
      await sbInsert(auth.token, toDB(np, auth.userId));
      setData(d=>[...d, np]);
      showToast((np.nome||"")+" aggiunto ai prospect");
    } catch(e) { showToast("Errore: "+e.message,"#ef4444"); }
  }

  async function advanceFase(p) {
    const i=FASI_FUNNEL.indexOf(p.fase);
    if (i<0||i>=FASI_FUNNEL.length-1) return;
    const next=FASI_FUNNEL[i+1];
    const storico=buildStorico(p,next,today());
    const upd={...p,fase:next,storico};
    try {
      await sbUpdate(auth.token,p.id,toDB(upd,auth.userId));
      setData(d=>d.map(x=>x.id===p.id?upd:x));
      setSel(upd); showToast("→ "+FASE_LABEL[next]);
    } catch(e) { showToast("Errore: "+e.message,"#ef4444"); }
  }

  async function moveFase(p,fase) {
    const newFase=fase==="RIATTIVA"?highestReached(p):fase;
    const upd={...p,fase:newFase};
    try {
      await sbUpdate(auth.token,p.id,toDB(upd,auth.userId));
      setData(d=>d.map(x=>x.id===p.id?upd:x)); setSel(upd);
      showToast(fase==="FOLLOW_UP"?" Follow Up":fase==="NON_INT"?" Non interessato":"↩ Riattivato",
        fase==="FOLLOW_UP"?"#f59e0b":fase==="NON_INT"?"#6b7280":"var(--a1)");
    } catch(e) { showToast("Errore: "+e.message,"#ef4444"); }
  }

  async function updateProfilo(id,profilazione) {
    const p=data.find(x=>x.id===id)||dlProspects.find(x=>x.id===id); if (!p) return;
    const ownerId=p._userId||auth.userId;
    const upd={...p,profilazione};
    try {
      await sbUpdate(auth.token,id,toDB(upd,ownerId));
      if (data.find(x=>x.id===id)) setData(d=>d.map(x=>x.id===id?upd:x));
      else setDlProspects(d=>d.map(x=>x.id===id?{...upd,_userId:ownerId,_ownerName:x._ownerName}:x));
      setSel(upd);
    } catch(e) { showToast("Errore salvataggio","#ef4444"); }
  }

  async function updateChecklist(id, checklist) {
    const p=data.find(x=>x.id===id)||dlProspects.find(x=>x.id===id); if (!p) return;
    const ownerId=p._userId||auth.userId;
    const upd={...p,checklist};
    try {
      await sbUpdate(auth.token,id,toDB(upd,ownerId));
      if (data.find(x=>x.id===id)) setData(d=>d.map(x=>x.id===id?upd:x));
      else setDlProspects(d=>d.map(x=>x.id===id?{...upd,_userId:ownerId,_ownerName:x._ownerName}:x));
      setSel(upd);
    } catch(e) { showToast("Errore salvataggio","#ef4444"); }
  }

  async function deleteStorico(id, faseToRemove) {
    const p=data.find(x=>x.id===id)||dlProspects.find(x=>x.id===id); if (!p) return;
    const ownerId=p._userId||auth.userId;
    const newStorico = p.storico.filter(s=>s.fase!==faseToRemove);
    // Calcola la nuova fase (l'ultima rimasta nello storico)
    const FASI_ORDER = ["INVITO","CONOSCITIVA","FUP1","FUP2","PACK","CLOSING","SUB","FOLLOW_UP","NON_INT"];
    const lastFase = newStorico.reduce((best, s) => {
      const bi = FASI_ORDER.indexOf(best);
      const si = FASI_ORDER.indexOf(s.fase);
      return si > bi ? s.fase : best;
    }, newStorico[0]?.fase || "INVITO");
    const upd = {...p, storico:newStorico, fase:lastFase};
    try {
      await sbUpdate(auth.token,id,toDB(upd,ownerId));
      if (data.find(x=>x.id===id)) setData(d=>d.map(x=>x.id===id?upd:x));
      else setDlProspects(d=>d.map(x=>x.id===id?{...upd,_userId:ownerId,_ownerName:x._ownerName}:x));
      setSel(upd);
      showToast("Fase rimossa");
    } catch(e) { showToast("Errore","#ef4444"); }
  }

  async function updateStoricoData(id, fase, newData, newFase, newStorico) {
    const p=data.find(x=>x.id===id)||dlProspects.find(x=>x.id===id); if (!p) return;
    const ownerId=p._userId||auth.userId;
    const updStorico = newStorico || p.storico.map(s=>s.fase===fase?{...s,data:newData}:s);
    const updFase = newFase || p.fase;
    const upd = {...p, storico:updStorico, fase:updFase};
    try {
      await sbUpdate(auth.token,id,toDB(upd,ownerId));
      if (data.find(x=>x.id===id)) setData(d=>d.map(x=>x.id===id?upd:x));
      else setDlProspects(d=>d.map(x=>x.id===id?{...upd,_userId:ownerId,_ownerName:x._ownerName}:x));
      setSel(upd);
      showToast("Aggiornato");
    } catch(e) { showToast("Errore","#ef4444"); }
  }

  async function updateProfile(fields) {
    try {
      await sbUpdateProfile(auth.token, auth.userId, fields);
      const newProfile = { ...auth.profile, ...fields };
      setAuth(a => {
        const updated = { ...a, profile: newProfile };
        const saved = localStorage.getItem("becrm_session");
        if (saved) localStorage.setItem("becrm_session", JSON.stringify(updated));
        return updated;
      });
      showToast("Profilo aggiornato ");
      // Se cambia positioned_under ricarica la downline
      if (fields.positioned_under !== undefined) {
        const allProfiles = await sbGetAllProfiles(auth.token);
        const all = allProfiles || [];
        function buildFull(pid) {
          const res = [];
          function collect(id) { all.filter(p=>p.positioned_under===id).forEach(c=>{res.push(c);collect(c.id);}); }
          collect(pid); return res;
        }
        const mine = buildFull(auth.userId);
        setDownline(mine);
      }
    } catch(e) { showToast("Errore: "+e.message,"#ef4444"); }
  }

  async function assignTeam(memberId, team) {
    try {
      // Salva la squadra relativa a me in team_positions
      await sbSetPosition(auth.token, auth.userId, memberId, team);
      const newPositions = positions.filter(x => !(x.upline_id===auth.userId && x.member_id===memberId));
      newPositions.push({ upline_id:auth.userId, member_id:memberId, team });
      setPositions(newPositions);

      // Controlla se ho già un diretto posizionato in quella leg usando lo state locale
      const myDirectsInLeg = downline.filter(m =>
        m.positioned_under === auth.userId &&
        m.id !== memberId &&
        newPositions.some(p => p.upline_id===auth.userId && p.member_id===m.id && p.team===team)
      );

      if (myDirectsInLeg.length === 0) {
        // Slot libero — posiziona automaticamente sotto di me
        await sbPositionMember(auth.token, memberId, auth.userId);
        setDownline(d=>d.map(m=>m.id===memberId?{...m,positioned_under:auth.userId}:m));
        showToast("Posizionato nella leg "+team);
      } else {
        // Slot occupato — va in lista d'attesa
        // Se era già posizionato, rimuovilo dall'albero
        if (downline.find(m=>m.id===memberId)?.positioned_under) {
          await sbPositionMember(auth.token, memberId, null);
          setDownline(d=>d.map(m=>m.id===memberId?{...m,positioned_under:null}:m));
        }
        showToast("Slot occupato — in attesa, selezionalo nell albero per piazzarlo");
      }
    } catch(e) { showToast("Errore: "+e.message,"#ef4444"); }
  }

  async function positionInTree(memberId, targetNodeId, team) {
    try {
      await sbPositionMember(auth.token, memberId, targetNodeId);
      if (team) await sbSetPosition(auth.token, targetNodeId, memberId, team);
      setDownline(d=>d.map(m=>m.id===memberId?{...m,positioned_under:targetNodeId}:m));
      if (team) setPositions(p=>{
        const filtered=p.filter(x=>!(x.member_id===memberId&&x.upline_id===targetNodeId));
        return [...filtered,{upline_id:targetNodeId,member_id:memberId,team}];
      });
      showToast("Posizionato nell albero");
    } catch(e) { showToast("Errore: "+e.message,"#ef4444"); }
  }

  async function addDownlineManually(referralCode, positionedUnder, team) {
    try {
      const profiles = await sbGetProfileByRef(auth.token, referralCode.trim().toLowerCase());
      if (!profiles || profiles.length === 0) { showToast("Nessun account trovato con questo ID ","#ef4444"); return false; }
      const target = profiles[0];
      if (target.id === auth.userId) { showToast("Non puoi aggiungere te stesso ","#ef4444"); return false; }
      if (downline.some(m=>m.id===target.id)) { showToast("Questo membro è già nel tuo team ","#ef4444"); return false; }
      const posUnder = positionedUnder || auth.userId;
      await sbPositionMember(auth.token, target.id, posUnder);
      if (team) await sbSetPosition(auth.token, posUnder, target.id, team);
      const updated = { ...target, positioned_under: posUnder };
      setDownline(d=>[...d, updated]);
      if (team) setPositions(p=>[...p, { upline_id:posUnder, member_id:target.id, team }]);
      showToast((target.nome||target.email)+" aggiunto al team ");
      return true;
    } catch(e) { showToast("Errore: "+e.message,"#ef4444"); return false; }
  }

  function onExport() {
    try {
      const b=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});
      const u=URL.createObjectURL(b);
      const a=document.createElement("a");
      a.href=u; a.download="becrm_backup_"+today()+".json";
      document.body.appendChild(a); a.click();
      setTimeout(()=>{document.body.removeChild(a);URL.revokeObjectURL(u);},800);
      showToast("Backup esportato ");
    } catch(e) { showToast("Errore export","#ef4444"); }
  }

  // Dati da usare nella dashboard in base alla modalità
  const dashData = dashMode === "team" ? [...data, ...dlProspects] : data;

  const cd    = dataByCiclo(dashData, dashCiclo);
  const cdSub = cd.filter(p=>p.fase==="SUB");
  const cdAct = cd.filter(p=>["CONOSCITIVA","FUP1","FUP2","PACK","CLOSING"].includes(p.fase));
  const cdFU  = dashData.filter(p=>p.fase==="FOLLOW_UP");
  const cdNI  = cd.filter(p=>p.fase==="NON_INT");
  const cdConv= cd.length?Math.round(cdSub.length/cd.length*100):0;
  const totSub  = dashData.filter(p=>p.fase==="SUB").length;
  const totConv = dashData.length?Math.round(totSub/dashData.length*100):0;
  const urgenti = data.filter(p=>(isOver(p.followUp)||isToday(p.followUp))&&p.fase!=="NON_INT");
  const funnelCounts=FASI_DASH.map(f=>({f,n:cd.filter(p=>p.fase===f).length}));
  const funnelMax=Math.max(cd.length,1);

  // Prospect del team con owner name
  const teamProspects = dlProspects.map(p => {
    const owner = downline.find(m => m.id === p._userId);
    return { ...p, _ownerName: owner ? (owner.nome||owner.email)+" "+(owner.cognome||"") : "" };
  });

  const listaSource = listaMode === "team" ? teamProspects : data;
  const listaData=listaSource.filter(p=>{
    const q=search.toLowerCase();
    return (!q||(p.nome+" "+p.cognome+" "+(p.citta||"")).toLowerCase().includes(q))
      &&(!fFase||p.fase===fFase)&&(!fFonte||p.fonte===fFonte)
      &&(!fCiclo||cicloOfDate(p.conosciutoAt)===Number(fCiclo))
      &&(!fCitta||( p.citta||"").toLowerCase().includes(fCitta.toLowerCase()))
      &&(!fInteresse||p.interesse===fInteresse);
  });

  if (!auth) return <AuthScreen onAuth={setAuth} />;
  if (!ready) return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",background:"var(--bg)",flexDirection:"column",gap:12}}>
      <span className="spinner" style={{width:28,height:28,borderWidth:3}} />
      <span style={{fontSize:13,color:"var(--muted)"}}>Caricamento...</span>
    </div>
  );


  return (
    <div style={{display:"flex",flexDirection:"row",height:"100vh",width:"100vw",overflow:"hidden",background:"var(--bg)"}}>
      {toast && <div className="toast-pos" style={{position:"fixed",bottom:24,right:24,zIndex:9999,background:toast.color,color:"#fff",padding:"12px 22px",borderRadius:12,fontWeight:700,fontSize:13,boxShadow:"0 8px 30px #00000060",animation:"fadeIn .25s ease"}}>{toast.msg}</div>}
      {saving && <div style={{position:"fixed",top:14,right:14,zIndex:9998,background:"var(--bg4)",border:"1px solid var(--border2)",borderRadius:9,padding:"7px 14px",fontSize:12,color:"var(--a2)",display:"flex",alignItems:"center",gap:7}}><span className="spinner" />Salvataggio...</div>}

      <Sidebar view={view} setView={setView} data={data} urgenti={urgenti} onAdd={openAdd} onExport={onExport} auth={auth} onLogout={handleLogout} downlineCount={downline.length} sidebarMode={sidebarMode} setSidebarMode={setSidebarMode} />

      <main className="mc" style={{flex:1,overflowY:"auto",height:"100vh",paddingBottom:0}}>
        {view==="dash"  && <Dash cd={cd} cdSub={cdSub} cdAct={cdAct} cdFU={cdFU} cdNI={cdNI} cdConv={cdConv} totSub={totSub} totConv={totConv} totAll={dashData.length} funnelCounts={funnelCounts} funnelMax={funnelMax} urgenti={urgenti} dashCiclo={dashCiclo} setDashCiclo={setDashCiclo} onOpen={openDetail} dashMode={dashMode} setDashMode={setDashMode} hasTeam={dlProspects.length>0} />}
        {view==="lista" && <Lista prospects={listaData} total={listaMode==="team"?teamProspects.length:data.length} search={search} setSearch={setSearch} fFase={fFase} setFFase={setFFase} fFonte={fFonte} setFFonte={setFFonte} fCiclo={fCiclo} setFCiclo={setFCiclo} fCitta={fCitta} setFCitta={setFCitta} fInteresse={fInteresse} setFInteresse={setFInteresse} onOpen={openDetail} onAdd={openAdd} listaMode={listaMode} setListaMode={setListaMode} hasTeam={dlProspects.length>0} />}
        {view==="stats"   && <Statistiche data={data} dlProspects={dlProspects} />}
        {view==="team"    && <TeamView auth={auth} downline={downline} dlProspects={dlProspects} onAssignTeam={assignTeam} onAddManual={addDownlineManually} positions={positions} onOpenProspect={openDetail} onPositionInTree={positionInTree} />}
        {view==="nomi"    && <ListaNomiView auth={auth} onInvitaProspect={invitaProspect} />}
        {view==="profilo" && <ProfiloView auth={auth} onUpdateProfile={updateProfile} downlineCount={downline.length} showToast={showToast} />}
      </main>

      {/* Mobile bottom nav - shown via CSS on mobile only */}
      <nav className="mobnav" style={{position:"fixed",bottom:0,left:0,right:0,height:60,background:"var(--bg2)",borderTop:"1px solid var(--border)",alignItems:"center",justifyContent:"space-around",zIndex:500,padding:"0 4px"}}>
        {[
          {id:"dash",label:"Home"},
          {id:"lista",label:"Prospect",badge:data.length},
          {id:"team",label:"Team",badge:downline.length||0},
          {id:"nomi",label:"Lista"},
          {id:"profilo",label:"Profilo"},
        ].map(item=>{
          const active=view===item.id;
          return (
            <button key={item.id} onClick={()=>setView(item.id)}
              style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:2,background:"none",border:"none",cursor:"pointer",padding:"6px 2px",position:"relative"}}>
              {item.badge>0&&<span style={{position:"absolute",top:2,right:"18%",background:"#10b981",color:"#fff",borderRadius:99,fontSize:9,fontWeight:900,padding:"1px 5px",minWidth:16,textAlign:"center"}}>{item.badge}</span>}
              <div style={{width:5,height:5,borderRadius:"50%",background:active?"var(--a1)":"transparent",marginBottom:1}}/>
              <span style={{fontSize:10,fontWeight:active?800:600,color:active?"var(--a1)":"var(--muted)"}}>{item.label}</span>
            </button>
          );
        })}
        <button onClick={openAdd} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:2,background:"none",border:"none",cursor:"pointer",padding:"6px 2px"}}>
          <div style={{width:30,height:30,borderRadius:"50%",background:"linear-gradient(135deg,var(--a1),var(--a2))",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:18,fontWeight:900}}>+</div>
        </button>
      </nav>

      {modal && (
        <div onClick={closeModal} style={{position:"fixed",inset:0,background:"#00000090",backdropFilter:"blur(8px)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:16,animation:"fadeIn .2s"}}>
          <div className={"pop"} onClick={e=>e.stopPropagation()} style={{width:"100%",maxWidth:520,maxHeight:"90vh",overflowY:"auto",borderRadius:"16px"}}>
            {modal==="detail"
              ? <DetailModal p={sel} onEdit={()=>{setForm({...sel});setModal("edit");}} onAdvance={()=>advanceFase(sel)} onFollowUp={()=>moveFase(sel,"FOLLOW_UP")} onNonInt={()=>moveFase(sel,"NON_INT")} onRiattiva={()=>moveFase(sel,"RIATTIVA")} onClose={closeModal} onUpdateProfilo={pr=>updateProfilo(sel.id,pr)} onUpdateChecklist={cl=>updateChecklist(sel.id,cl)} onDeleteStorico={fase=>deleteStorico(sel.id,fase)} onUpdateStoricoData={(fase,data,newFase,newStorico)=>updateStoricoData(sel.id,fase,data,newFase,newStorico)} />
              : <FormModal form={form} setForm={setForm} onSave={saveForm} onClose={closeModal} onDelete={modal==="edit"?()=>deleteProp(form.id):null} isEdit={modal==="edit"} />
            }
          </div>
        </div>
      )}
    </div>
  );
}

//  SIDEBAR 
function Sidebar({ view, setView, data, urgenti, onAdd, onExport, auth, onLogout, downlineCount, sidebarMode, setSidebarMode }) {
  const navs = [
    { id:"dash",    icon:"", label:"Dashboard" },
    { id:"lista",   icon:"", label:"Prospect", badge:data.length },
    { id:"stats",   icon:"", label:"Statistiche" },
    { id:"team",    icon:"", label:"Team", badge:downlineCount||0 },
    { id:"nomi",    icon:"", label:"Lista Nomi" },
    { id:"profilo", icon:"", label:"Profilo" },
  ];
  return (
    <aside className="sb" style={{width:222,minWidth:222,background:"var(--bg2)",borderRight:"1px solid #11203a",padding:"1.5rem .9rem",display:"flex",flexDirection:"column",gap:4,height:"100vh",overflowY:"auto"}}>
      <div style={{marginBottom:24,paddingLeft:4}}>
        <div style={{fontWeight:900,fontSize:15,color:"var(--text)",lineHeight:1.2}}>BE Club CRM</div>
      </div>

      {navs.map(item=>(
        <button key={item.id} onClick={()=>setView(item.id)}
          style={{display:"flex",alignItems:"center",gap:9,width:"100%",padding:"10px 12px",background:view===item.id?"var(--bg4)":"transparent",boxShadow:view===item.id?"inset 0 0 0 1px var(--sidebar-border)":"none",color:view===item.id?"var(--a2)":"var(--muted)",borderRadius:10,cursor:"pointer",fontSize:13,fontWeight:600,textAlign:"left",border:"none",transition:"all .2s"}}>
          <span>{item.icon}</span>{item.label}
          {item.badge>0 && <span style={{marginLeft:"auto",background:"var(--a1-12)",color:"var(--a2)",borderRadius:99,padding:"1px 8px",fontSize:11,fontWeight:700}}>{item.badge}</span>}
        </button>
      ))}

      <button onClick={onAdd} style={{marginTop:14,padding:"10px",fontSize:13,fontWeight:800,background:"linear-gradient(135deg,var(--a1),var(--a2))",color:"#fff",border:"none",borderRadius:10,cursor:"pointer"}}>
        + Nuovo Prospect
      </button>

      {urgenti.length>0 && (
        <div className="pulse" style={{marginTop:8,background:"#ef444412",border:"1px solid #ef444435",borderRadius:10,padding:"10px 12px",display:"flex",alignItems:"center",gap:8,color:"#f87171",fontSize:12,fontWeight:700}}>
           {urgenti.length} urgent{urgenti.length===1?"e":"i"}
        </div>
      )}

      <div style={{borderTop:"1px solid #11203a",paddingTop:14,marginTop:16,display:"flex",flexDirection:"column",gap:7}}>
        <div style={{fontSize:10,fontWeight:800,color:"var(--border2)",textTransform:"uppercase",letterSpacing:1.2,marginBottom:2}}>Backup</div>
        <button onClick={onExport} style={{padding:"8px 10px",background:"var(--bg4)",color:"var(--a2)",border:"1px solid var(--border2)",borderRadius:9,cursor:"pointer",fontWeight:700,fontSize:12,textAlign:"left"}}> Esporta JSON</button>
      </div>

      <div style={{marginTop:14,borderTop:"1px solid var(--border)",paddingTop:14}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
          <div style={{fontSize:10,fontWeight:800,color:"var(--border2)",textTransform:"uppercase",letterSpacing:1.2}}>Totale ora</div>
          <div style={{display:"flex",background:"var(--bg3)",borderRadius:6,padding:2,border:"1px solid var(--border)"}}>
            {["tutti","ciclo"].map(m=>(
              <button key={m} onClick={()=>setSidebarMode(m)}
                style={{padding:"2px 7px",borderRadius:4,border:"none",cursor:"pointer",fontSize:9,fontWeight:800,fontFamily:"inherit",background:sidebarMode===m?"var(--a1)":"transparent",color:sidebarMode===m?"#fff":"var(--muted)",transition:"all .15s"}}>
                {m==="tutti"?"Tutti":"C"+CICLO_CORRENTE}
              </button>
            ))}
          </div>
        </div>
        {FASI.map(f=>{
          const n = sidebarMode==="ciclo"
            ? data.filter(p=>p.fase===f && cicloOfDate(p.conosciutoAt)===CICLO_CORRENTE).length
            : data.filter(p=>p.fase===f).length;
          return (
            <div key={f} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"3px 2px"}}>
              <span style={{display:"flex",alignItems:"center",gap:7,fontSize:11,color:"var(--muted)"}}>
                <span style={{width:7,height:7,borderRadius:99,background:FASE_CLR[f],flexShrink:0}} />{FASE_LABEL[f]}
              </span>
              <span style={{fontWeight:800,fontSize:12,color:n>0?FASE_CLR[f]:"var(--border2)"}}>{n}</span>
            </div>
          );
        })}
      </div>

      <div style={{marginTop:"auto",paddingTop:14,borderTop:"1px solid #11203a"}}>
        <div style={{fontSize:10,color:"var(--muted)",marginBottom:6,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{auth?.email}</div>
        <button onClick={onLogout} style={{width:"100%",padding:"8px 10px",background:"#ef444415",color:"#f87171",border:"1px solid #ef444430",borderRadius:9,cursor:"pointer",fontWeight:700,fontSize:12}}>Esci</button>
      </div>
    </aside>
  );
}

//  DASHBOARD 
function Dash({ cd, cdSub, cdAct, cdFU, cdNI, cdConv, totSub, totConv, totAll, funnelCounts, funnelMax, urgenti, dashCiclo, setDashCiclo, onOpen, dashMode, setDashMode, hasTeam }) {
  const cc = v => v>=20?"#10b981":v>=10?"var(--a2)":"#f59e0b";
  const bvCiclo = cdSub.reduce((acc,p)=>acc+bvOfPacchetto(p.pacchetto,p.bvCustom),0);
  const kpis = [
    {label:"In percorso",value:cdAct.length,icon:"",color:"var(--a1)",sub:cd.length+" totali nel ciclo",detail:"FUP1 → Closing"},
    {label:"Conv. ciclo",value:cdConv+"%",icon:"",color:cc(cdConv),sub:cdSub.length+" iscritti / "+cd.length,detail:cdConv>=20?"Ottimo ":cdConv>=10?"Nella media":"Da migliorare"},
    {label:"Iscritti ciclo",value:cdSub.length,icon:"",color:"#10b981",sub:"su "+cd.length+" conosciuti",detail:"questo ciclo"},
    {label:"BV ciclo",value:bvCiclo,icon:"",color:"#f59e0b",sub:"da "+cdSub.length+" iscritti",detail:"Business Volume"},
  ];
  return (
    <div style={{padding:"2rem 2.2rem",maxWidth:1280,margin:"0 auto"}}>
      <div style={{display:"flex",alignItems:"flex-end",justifyContent:"space-between",marginBottom:"1.2rem",gap:12,flexWrap:"wrap"}}>
        <div>
          <div style={{fontSize:11,fontWeight:700,color:"var(--a1)",textTransform:"uppercase",letterSpacing:1.4,marginBottom:4}}>Ciclo {dashCiclo}{dashCiclo===CICLO_CORRENTE?" \u00b7 in corso":""}</div>
          <h1 style={{fontWeight:900,fontSize:26,color:"var(--text)",letterSpacing:-0.8,lineHeight:1}}>Dashboard</h1>
          <p style={{color:"var(--muted)",fontSize:12,marginTop:4}}>{cicloLabel(dashCiclo)}</p>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
          {/* Toggle Personale / Team */}
          {hasTeam && (
            <div style={{display:"flex",background:"var(--bg3)",borderRadius:10,padding:4,border:"1px solid var(--border)"}}>
              {["personale","team"].map(m=>(
                <button key={m} onClick={()=>setDashMode(m)} className="tabbtn"
                  style={{background:dashMode===m?"var(--bg4)":"transparent",color:dashMode===m?"var(--a2)":"var(--muted)",boxShadow:dashMode===m?"inset 0 0 0 1px var(--sidebar-border)":"none",fontSize:11,padding:"6px 14px"}}>
                  {m==="personale"?" Personale":" Team"}
                </button>
              ))}
            </div>
          )}
          {/* Selettore ciclo */}
          <div style={{display:"flex",alignItems:"center",gap:6,background:"var(--bg2)",border:"1px solid var(--border)",borderRadius:11,padding:"5px 10px"}}>
            <button onClick={()=>setDashCiclo(c=>Math.max(CICLO_NUMS[CICLO_NUMS.length-1],c-1))} style={{background:"none",border:"none",color:"var(--muted)",fontSize:18,cursor:"pointer",padding:"2px 8px",fontWeight:700}}>‹</button>
            <select value={dashCiclo} onChange={e=>setDashCiclo(Number(e.target.value))} style={{background:"none",border:"none",color:"var(--text)",fontWeight:800,fontSize:12,padding:"2px 4px",width:"auto",cursor:"pointer"}}>
              {CICLO_NUMS.map(c=><option key={c} value={c}>Ciclo {c}</option>)}
            </select>
            <button onClick={()=>setDashCiclo(c=>Math.min(CICLO_NUMS[0],c+1))} style={{background:"none",border:"none",color:"var(--muted)",fontSize:18,cursor:"pointer",padding:"2px 8px",fontWeight:700}}>›</button>
          </div>
        </div>
      </div>
      <div className="kpi-grid" style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:16}}>
        {kpis.map((k,i)=>(
          <div key={i} className="kpi" style={{background:"var(--bg2)",border:"1px solid var(--border)",borderRadius:14,padding:"18px 20px",position:"relative",overflow:"hidden"}}>
            <div style={{position:"absolute",top:0,left:0,right:0,height:3,background:"linear-gradient(90deg,"+k.color+","+k.color+"44)",borderRadius:"14px 14px 0 0"}} />
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
              <span style={{fontSize:10,color:"var(--muted)",fontWeight:700,textTransform:"uppercase",letterSpacing:.8}}>{k.label}</span>
              <span style={{fontSize:15,padding:7,borderRadius:9,background:k.color+"18"}}>{k.icon}</span>
            </div>
            <div style={{fontSize:34,fontWeight:900,color:k.color,lineHeight:1,letterSpacing:-1,textShadow:"0 0 24px "+k.color+"35"}}>{k.value}</div>
            <div style={{fontSize:11,color:"var(--muted)",marginTop:6}}>{k.sub}</div>
            <div style={{fontSize:11,color:k.color+"99",marginTop:3,fontWeight:600}}>{k.detail}</div>
          </div>
        ))}
      </div>
      <div style={{display:"grid",gridTemplateColumns:(urgenti.length>0||cdFU.length>0)?"1.5fr 1fr":"1fr",gap:14}}>
        <div style={{background:"var(--bg2)",border:"1px solid var(--border)",borderRadius:14,padding:"1.4rem"}}>
          <div style={{fontSize:10,fontWeight:700,color:"var(--muted)",textTransform:"uppercase",letterSpacing:1.2,marginBottom:4}}>Funnel — Ciclo {dashCiclo}</div>
          <div style={{fontSize:11,color:"var(--border2)",marginBottom:16}}>{cd.length} prospect conosciuti in questo ciclo</div>
          {cd.length===0
            ?<div style={{textAlign:"center",padding:"2rem",color:"var(--border2)",fontSize:13}}>Nessun prospect in questo ciclo</div>
            :<div style={{display:"flex",flexDirection:"column",gap:12}}>
              {funnelCounts.map(({f,n})=>{
                const pct=Math.round(n/(cd.length||1)*100);
                const w=Math.round((n/funnelMax)*100)+"%";
                return (
                  <div key={f} style={{display:"flex",alignItems:"center",gap:11}}>
                    <span style={{display:"inline-flex",alignItems:"center",justifyContent:"center",borderRadius:6,padding:"3px 9px",fontSize:10,fontWeight:700,color:"#fff",background:FASE_CLR[f],minWidth:68,boxShadow:"0 0 10px "+FASE_CLR[f]+"35"}}>{FASE_LABEL[f]}</span>
                    <div style={{flex:1,height:9,background:"var(--bg4)",borderRadius:99,overflow:"hidden"}}>
                      <div style={{width:w,height:"100%",background:"linear-gradient(90deg,"+FASE_CLR[f]+"88,"+FASE_CLR[f]+")",boxShadow:"0 0 8px "+FASE_CLR[f]+"50",borderRadius:99,transition:"width .6s cubic-bezier(.4,0,.2,1)"}} />
                    </div>
                    <span style={{fontWeight:800,color:"var(--text)",minWidth:16,textAlign:"right",fontSize:13}}>{n}</span>
                    <span style={{color:"var(--muted)",fontSize:11,minWidth:30,textAlign:"right"}}>{pct}%</span>
                  </div>
                );
              })}
            </div>
          }
          <div style={{display:"flex",gap:10,marginTop:16,paddingTop:14,borderTop:"1px dashed #11203a"}}>
            {[{f:"FOLLOW_UP",n:cdFU.length},{f:"NON_INT",n:cdNI.length}].map(({f,n})=>(
              <div key={f} style={{flex:1,background:FASE_CLR[f]+"12",border:"1px solid "+FASE_CLR[f]+"28",borderRadius:10,padding:"10px 12px",display:"flex",alignItems:"center",gap:8}}>
                <div style={{width:8,height:8,borderRadius:99,background:FASE_CLR[f],flexShrink:0}} />
                <div><div style={{fontWeight:900,fontSize:18,color:FASE_CLR[f]}}>{n}</div><div style={{fontSize:10,color:"var(--muted)",marginTop:1}}>{FASE_LABEL[f]}</div></div>
              </div>
            ))}
          </div>
        </div>
        {(urgenti.length>0||cdFU.length>0)&&(
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            {cdFU.length>0&&(
              <div style={{background:"var(--bg2)",border:"1px solid #f59e0b28",borderRadius:14,padding:"1.2rem",flex:1}}>
                <div style={{fontSize:10,fontWeight:700,color:"#fbbf24",textTransform:"uppercase",letterSpacing:1.2,marginBottom:12}}> Da ricontattare</div>
                <div style={{display:"flex",flexDirection:"column",gap:7,maxHeight:170,overflowY:"auto"}}>
                  {cdFU.map(p=>(
                    <div key={p.id} className="hrow" onClick={()=>onOpen(p)} style={{display:"flex",alignItems:"center",justifyContent:"space-between",background:"#f59e0b09",border:"1px solid #f59e0b1e",borderRadius:9,padding:"8px 11px",cursor:"pointer"}}>
                      <div style={{display:"flex",alignItems:"center",gap:9}}>
                        <Av n={p.nome} c={p.cognome} color={FASE_CLR.FOLLOW_UP} />
                        <span style={{fontWeight:700,color:"var(--text)",fontSize:12}}>{p.nome} {p.cognome}</span>
                      </div>
                      <span style={{fontSize:10,color:"#fbbf24"}}>{fmt(p.followUp)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {urgenti.length>0&&(
              <div style={{background:"var(--bg2)",border:"1px solid #ef444422",borderRadius:14,padding:"1.2rem",flex:1}}>
                <div style={{fontSize:10,fontWeight:700,color:"#f87171",textTransform:"uppercase",letterSpacing:1.2,marginBottom:12}}> Follow-up urgenti</div>
                <div style={{display:"flex",flexDirection:"column",gap:7,maxHeight:200,overflowY:"auto"}}>
                  {urgenti.map(p=>(
                    <div key={p.id} className="hrow" onClick={()=>onOpen(p)} style={{display:"flex",alignItems:"center",justifyContent:"space-between",background:"#ef44440b",border:"1px solid #ef44441e",borderRadius:9,padding:"8px 11px",cursor:"pointer"}}>
                      <div style={{display:"flex",alignItems:"center",gap:9}}>
                        <Av n={p.nome} c={p.cognome} color={FASE_CLR[p.fase]} />
                        <div>
                          <div style={{fontWeight:700,color:"var(--text)",fontSize:12}}>{p.nome} {p.cognome}</div>
                          <div style={{fontSize:10,color:isOver(p.followUp)?"#f87171":"#fbbf24",marginTop:1,fontWeight:600}}>{isOver(p.followUp)?" Scaduto":" Oggi"}</div>
                        </div>
                      </div>
                      <span style={{display:"inline-flex",alignItems:"center",borderRadius:6,padding:"2px 8px",fontSize:10,fontWeight:700,color:"#fff",background:FASE_CLR[p.fase]}}>{FASE_LABEL[p.fase]}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

//  STATISTICHE 
function Statistiche({ data, dlProspects }) {
  const hasTeam = (dlProspects||[]).length > 0;
  const [statsMode, setStatsMode] = useState(data.length > 0 ? "personale" : (hasTeam ? "team" : "personale"));
  const [linePhase, setLinePhase] = useState("CONOSCITIVA");
  const [barCiclo,  setBarCiclo]  = useState("ALL");

  const activeData = statsMode === "team" ? [...data, ...(dlProspects||[])] : data;

  const cicliPresenti=[...new Set(activeData.flatMap(p=>(p.storico||[]).map(s=>cicloOfDate(s.data)).filter(Boolean)))].sort((a,b)=>a-b);
  const cicli=cicliPresenti.length?cicliPresenti:[CICLO_CORRENTE];
  const lineData=cicli.map(c=>{const row={ciclo:"C"+c};FASI_FUNNEL.forEach(f=>{row[f]=activeData.filter(p=>reachedInCiclo(p,f,c)).length;});return row;});
  const barData=FASI_FUNNEL.map(f=>{const count=barCiclo==="ALL"?activeData.filter(p=>reachedEver(p,f)).length:activeData.filter(p=>reachedInCiclo(p,f,Number(barCiclo))).length;return{fase:FASE_LABEL[f],key:f,count,fill:FASE_CLR[f]};});
  const tableRows=[...cicli].sort((a,b)=>b-a).map(c=>{const r={c};FASI_FUNNEL.forEach(f=>{r[f]=activeData.filter(p=>reachedInCiclo(p,f,c)).length;});r.conv=r.INVITO>0?Math.round(r.SUB/r.INVITO*100):r.FUP1>0?Math.round(r.SUB/r.FUP1*100):0;return r;});
  const ts={background:"var(--bg3)",border:"1px solid var(--border2)",borderRadius:8,color:"var(--text)",fontSize:12};
  const tProps={contentStyle:ts,itemStyle:{color:"var(--text)"},labelStyle:{color:"var(--text)",fontWeight:700}};
  if (!activeData.length) return <div style={{padding:"2rem 2.2rem"}}><h1 style={{fontWeight:900,fontSize:26,color:"var(--text)",marginBottom:8}}>Statistiche</h1><div style={{textAlign:"center",padding:"5rem",color:"var(--border2)"}}><div style={{fontSize:44,marginBottom:12}}></div><p>{hasTeam ? "Nessun dato in questa modalita — prova a switchare su Team" : "Aggiungi prospect per vedere le statistiche"}</p></div></div>;
  return (
    <div style={{padding:"2rem 2.2rem",maxWidth:1280,margin:"0 auto"}}>
      <div style={{display:"flex",alignItems:"flex-end",justifyContent:"space-between",marginBottom:24,gap:12,flexWrap:"wrap"}}>
        <div>
          <h1 style={{fontWeight:900,fontSize:26,color:"var(--text)",letterSpacing:-0.8}}>Statistiche</h1>
          <p style={{color:"var(--muted)",fontSize:12,marginTop:4}}>Andamento e conversione del percorso, ciclo per ciclo</p>
        </div>
        {hasTeam && (
          <div style={{display:"flex",background:"var(--bg3)",borderRadius:10,padding:4,border:"1px solid var(--border)"}}>
            {["personale","team"].map(m=>(
              <button key={m} onClick={()=>setStatsMode(m)} className="tabbtn"
                style={{background:statsMode===m?"var(--bg4)":"transparent",color:statsMode===m?"var(--a2)":"var(--muted)",boxShadow:statsMode===m?"inset 0 0 0 1px var(--sidebar-border)":"none",fontSize:11,padding:"6px 14px"}}>
                {m==="personale"?" Personale":" Team"}
              </button>
            ))}
          </div>
        )}
      </div>
      <div style={{background:"var(--bg2)",border:"1px solid var(--border)",borderRadius:14,padding:"1.4rem",marginBottom:16}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:10}}>
          <div><div style={{fontSize:13,fontWeight:800,color:"var(--text)"}}> Andamento nei cicli</div><div style={{fontSize:11,color:"var(--muted)",marginTop:2}}>Quanti ne fai per ciclo</div></div>
          <select value={linePhase} onChange={e=>setLinePhase(e.target.value)} style={{width:"auto",minWidth:160}}><option value="ALL">Tutte le fasi</option>{FASI_FUNNEL.map(f=><option key={f} value={f}>{FASE_LABEL[f]}</option>)}</select>
        </div>
        <div style={{height:300}}><ResponsiveContainer width="100%" height="100%"><LineChart data={lineData} margin={{top:5,right:10,left:-15,bottom:5}}><CartesianGrid strokeDasharray="3 3" stroke="var(--border)"/><XAxis dataKey="ciclo" stroke="var(--muted)" fontSize={12}/><YAxis stroke="var(--muted)" fontSize={12} allowDecimals={false}/><Tooltip {...tProps} cursor={{stroke:"var(--border2)"}}/>{linePhase==="ALL"?FASI_FUNNEL.map(f=><Line key={f} type="monotone" dataKey={f} name={FASE_LABEL[f]} stroke={FASE_CLR[f]} strokeWidth={2} dot={{r:3}}/>):<Line type="monotone" dataKey={linePhase} name={FASE_LABEL[linePhase]} stroke={FASE_CLR[linePhase]} strokeWidth={3} dot={{r:4}} activeDot={{r:6}}/>}{linePhase==="ALL"&&<Legend wrapperStyle={{fontSize:11}}/>}</LineChart></ResponsiveContainer></div>
      </div>
      <div style={{background:"var(--bg2)",border:"1px solid var(--border)",borderRadius:14,padding:"1.4rem",marginBottom:16}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:10}}>
          <div><div style={{fontSize:13,fontWeight:800,color:"var(--text)"}}> Conversione del percorso</div></div>
          <select value={barCiclo} onChange={e=>setBarCiclo(e.target.value)} style={{width:"auto",minWidth:160}}><option value="ALL">Tutti i cicli</option>{[...cicli].sort((a,b)=>b-a).map(c=><option key={c} value={c}>Ciclo {c}</option>)}</select>
        </div>
        <div style={{height:300}}><ResponsiveContainer width="100%" height="100%"><BarChart data={barData} margin={{top:5,right:10,left:-15,bottom:5}}><CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false}/><XAxis dataKey="fase" stroke="var(--muted)" fontSize={12}/><YAxis stroke="var(--muted)" fontSize={12} allowDecimals={false}/><Tooltip {...tProps} cursor={{fill:"#0d1b3360"}}/><Bar dataKey="count" name="Raggiunti" radius={[6,6,0,0]}>{barData.map((e,i)=><Cell key={i} fill={e.fill}/>)}</Bar></BarChart></ResponsiveContainer></div>
        <div style={{display:"flex",gap:8,marginTop:14,flexWrap:"wrap"}}>{barData.slice(0,-1).map((b,i)=>{const next=barData[i+1];const rate=b.count>0?Math.round(next.count/b.count*100):0;return(<div key={i} style={{flex:"1 1 120px",background:"var(--bg3)",border:"1px solid var(--border)",borderRadius:9,padding:"9px 11px"}}><div style={{fontSize:10,color:"var(--muted)",fontWeight:600}}>{b.fase} → {next.fase}</div><div style={{fontSize:18,fontWeight:900,color:next.fill,marginTop:2}}>{rate}%</div></div>);})}</div>
      </div>
      <div style={{background:"var(--bg2)",border:"1px solid var(--border)",borderRadius:14,overflow:"hidden"}}>
        <div style={{padding:"1.1rem 1.4rem",borderBottom:"1px solid #11203a"}}><div style={{fontSize:13,fontWeight:800,color:"var(--text)"}}> Cicli a confronto</div></div>
        <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",minWidth:600}}><thead><tr style={{borderBottom:"1px solid #11203a"}}><th style={{textAlign:"left",color:"var(--muted)",fontWeight:700,fontSize:10,textTransform:"uppercase",padding:"11px 16px"}}>Ciclo</th>{FASI_FUNNEL.map(f=><th key={f} style={{textAlign:"center",color:FASE_CLR[f],fontWeight:700,fontSize:10,textTransform:"uppercase",padding:"11px 10px"}}>{FASE_LABEL[f]}</th>)}<th style={{textAlign:"center",color:"var(--muted)",fontWeight:700,fontSize:10,textTransform:"uppercase",padding:"11px 16px"}}>Conv%</th></tr></thead><tbody>{tableRows.map(r=>(<tr key={r.c} className="hrow" style={{borderBottom:"1px solid #0d1b3355"}}><td style={{padding:"11px 16px"}}><span style={{background:r.c===CICLO_CORRENTE?"var(--a1-13)":"var(--border)",color:r.c===CICLO_CORRENTE?"var(--a2)":"var(--muted)",borderRadius:6,padding:"3px 9px",fontSize:11,fontWeight:700}}>C{r.c}</span></td>{FASI_FUNNEL.map(f=><td key={f} style={{textAlign:"center",padding:"11px 10px",fontWeight:700,fontSize:13,color:r[f]>0?"var(--text)":"var(--border2)"}}>{r[f]}</td>)}<td style={{textAlign:"center",padding:"11px 16px",fontWeight:800,fontSize:13,color:r.conv>=20?"#10b981":r.conv>=10?"var(--a2)":"#f59e0b"}}>{r.conv}%</td></tr>))}</tbody></table></div>
      </div>
    </div>
  );
}

//  LISTA 
function Lista({ prospects, total, search, setSearch, fFase, setFFase, fFonte, setFFonte, fCiclo, setFCiclo, fCitta, setFCitta, fInteresse, setFInteresse, onOpen, onAdd, listaMode, setListaMode, hasTeam }) {
  return (
    <div style={{padding:"2rem 2.2rem",maxWidth:1280,margin:"0 auto"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"1.4rem",flexWrap:"wrap",gap:12}}>
        <div>
          <h1 style={{fontWeight:900,fontSize:26,color:"var(--text)",letterSpacing:-0.8}}>Prospect</h1>
          <p style={{color:"var(--muted)",fontSize:12,marginTop:3}}>{prospects.length} di {total} visualizzati</p>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          {hasTeam && (
            <div style={{display:"flex",background:"var(--bg3)",borderRadius:10,padding:4,border:"1px solid var(--border)"}}>
              {["personale","team"].map(m=>(
                <button key={m} onClick={()=>setListaMode(m)}
                  style={{padding:"6px 14px",borderRadius:8,border:"none",cursor:"pointer",fontSize:11,fontWeight:700,fontFamily:"inherit",background:listaMode===m?"var(--bg4)":"transparent",color:listaMode===m?"var(--a2)":"var(--muted)",boxShadow:listaMode===m?"inset 0 0 0 1px var(--sidebar-border)":"none"}}>
                  {m==="personale"?" Personale":" Team"}
                </button>
              ))}
            </div>
          )}
          <button onClick={onAdd} style={{padding:"9px 18px",fontSize:13,fontWeight:800,background:"linear-gradient(135deg,var(--a1),var(--a2))",color:"#fff",border:"none",borderRadius:10,cursor:"pointer"}}>+ Aggiungi</button>
        </div>
      </div>
      <div style={{display:"flex",gap:10,marginBottom:14,flexWrap:"wrap"}}>
        <input placeholder="Cerca..." value={search} onChange={e=>setSearch(e.target.value)} style={{flex:2,minWidth:200}} />
        <select value={fFase} onChange={e=>setFFase(e.target.value)} style={{flex:1,minWidth:130}}>
          <option value="">Tutte le fasi</option>
          <optgroup label="Funnel">{FASI_FUNNEL.map(f=><option key={f} value={f}>{FASE_LABEL[f]}</option>)}</optgroup>
          <optgroup label="Speciali">{FASI_SPECIALI.map(f=><option key={f} value={f}>{FASE_LABEL[f]}</option>)}</optgroup>
        </select>
        <select value={fFonte} onChange={e=>setFFonte(e.target.value)} style={{flex:1,minWidth:120}}><option value="">Tutte le fonti</option>{FONTI.map(f=><option key={f}>{f}</option>)}</select>
        <select value={fCiclo} onChange={e=>setFCiclo(e.target.value)} style={{flex:1,minWidth:140}}><option value="">Tutti i cicli</option>{CICLO_NUMS.map(c=><option key={c} value={c}>Ciclo {c}</option>)}</select>
        <input value={fCitta} onChange={e=>setFCitta(e.target.value)} placeholder="Filtra per citta..." style={{flex:1,minWidth:130}} />
        <select value={fInteresse} onChange={e=>setFInteresse(e.target.value)} style={{flex:1,minWidth:120}}>
          <option value="">Tutto l interesse</option>
          {INTERESSE.map(v=><option key={v} value={v}>{v}</option>)}
        </select>
      </div>
      {prospects.length===0
        ?<div style={{textAlign:"center",padding:"4rem",color:"var(--border2)"}}><div style={{fontSize:44,marginBottom:12}}></div><p style={{fontSize:14,marginBottom:14}}>Nessun prospect trovato</p><button onClick={onAdd} style={{padding:"9px 20px",fontSize:13,fontWeight:800,background:"linear-gradient(135deg,var(--a1),var(--a2))",color:"#fff",border:"none",borderRadius:10,cursor:"pointer"}}>Aggiungi il primo</button></div>
        :<div className="tbl-wrap" style={{background:"var(--bg2)",border:"1px solid var(--border)",borderRadius:14,overflow:"hidden"}}>
          <table style={{width:"100%",borderCollapse:"collapse",minWidth:700}}>
            <thead><tr style={{borderBottom:"1px solid #11203a"}}>{["Prospect",...(listaMode==="team"?["Di"]:[]),"Ciclo","Conosciuto","Fonte","Fase","Interesse","Checklist","Profilo","Pers.",""].map(h=>(<th key={h} style={{textAlign:"left",color:"var(--muted)",fontWeight:700,fontSize:10,textTransform:"uppercase",letterSpacing:.8,padding:"12px 16px",whiteSpace:"nowrap"}}>{h}</th>))}</tr></thead>
            <tbody>{prospects.map(p=>{
              const c=cicloOfDate(p.conosciutoAt);
              const badge=profiloBadge(p);
              const bc=badge.compilati===0?"var(--border2)":badge.positivi>=6?"#10b981":badge.positivi>=3?"var(--a2)":"#f59e0b";
              const jung = (() => {
                const j = p.profilazione?.jung;
                if (!j) return [];
                if (Array.isArray(j)) return JUNG.filter(x=>j.includes(x.key));
                return JUNG.filter(x=>x.key===j);
              })();
              return (
                <tr key={p.id} className="hrow" onClick={()=>onOpen(p)} style={{cursor:"pointer",borderBottom:"1px solid #0d1b3355"}}>
                  <td style={{padding:"12px 16px"}}><div style={{display:"flex",alignItems:"center",gap:10}}><Av n={p.nome} c={p.cognome} color={FASE_CLR[p.fase]}/><span style={{color:"var(--text)",fontWeight:700,fontSize:13}}>{p.nome} {p.cognome}</span></div></td>
                  {listaMode==="team"&&<td style={{padding:"12px 16px"}}><span style={{fontSize:11,color:"#8b5cf6",fontWeight:700,background:"#8b5cf618",borderRadius:6,padding:"2px 8px"}}>{p._ownerName||"\u2014"}</span></td>}
                  <td style={{padding:"12px 16px"}}>{c?<span style={{background:c===CICLO_CORRENTE?"var(--a1-13)":"var(--border)",color:c===CICLO_CORRENTE?"var(--a2)":"var(--muted)",borderRadius:6,padding:"2px 8px",fontSize:11,fontWeight:700}}>C{c}</span>:<span style={{color:"var(--border2)"}}>\u2014</span>}</td>
                  <td style={{padding:"12px 16px",color:"var(--muted)",fontSize:12}}>{fmt(p.conosciutoAt)}</td>
                  <td style={{padding:"12px 16px",color:"var(--muted)",fontSize:12}}>{FONTE_ICO[p.fonte]} {p.fonte}</td>
                  <td style={{padding:"12px 16px"}}><span style={{display:"inline-flex",alignItems:"center",borderRadius:6,padding:"3px 9px",fontSize:11,fontWeight:700,color:"#fff",background:FASE_CLR[p.fase],boxShadow:"0 0 8px "+FASE_CLR[p.fase]+"35"}}>{FASE_LABEL[p.fase]}</span></td>
                  <td style={{padding:"12px 16px"}}>
                    {p.interesse
                      ? <span style={{fontSize:11,fontWeight:800,padding:"2px 8px",borderRadius:6,color:INTERESSE_CLR[p.interesse],background:INTERESSE_CLR[p.interesse]+"20"}}>{p.interesse}</span>
                      : <span style={{color:"var(--border2)",fontSize:11}}>\u2014</span>
                    }
                  </td>
                  <td style={{padding:"12px 16px"}}>
                    {p.fase==="SUB"
                      ? <div style={{display:"flex",gap:6}}>
                          {["kyc","pandadoc","click"].map(k=>{
                            const done=p.checklist?.[k];
                            const label=k==="pandadoc"?"PD":k.toUpperCase();
                            return <span key={k} style={{fontSize:10,fontWeight:800,padding:"2px 7px",borderRadius:5,background:done?"#10b98120":"#1e3a5f20",color:done?"#10b981":"var(--muted)",border:"1px solid "+(done?"#10b98140":"var(--border2)")}}>{label}</span>;
                          })}
                        </div>
                      : <span style={{color:"var(--border2)",fontSize:11}}>\u2014</span>
                    }
                  </td>
                  <td style={{padding:"12px 16px"}}>{badge.compilati===0?<span style={{color:"var(--border2)",fontSize:11}}>\u2014</span>:<span style={{display:"inline-flex",alignItems:"center",gap:4,borderRadius:6,padding:"3px 9px",fontSize:11,fontWeight:800,color:bc,background:bc+"18",border:"1px solid "+bc+"30"}}> {badge.positivi}/{PROFILO_TOTAL}</span>}</td>
                  <td style={{padding:"12px 16px"}}>{jung.length>0?<div style={{display:"flex",gap:4,flexWrap:"wrap"}}>{jung.map(j=><span key={j.key} title={j.sub} style={{display:"inline-flex",alignItems:"center",gap:4,borderRadius:6,padding:"2px 7px",fontSize:10,fontWeight:800,color:j.border,background:j.border+"18",border:"1px solid "+j.border+"35"}}><span style={{width:6,height:6,borderRadius:"50%",background:j.border,flexShrink:0}}/>{j.label}</span>)}</div>:<span style={{color:"var(--border2)",fontSize:11}}>{"—"}</span>}</td>
                  <td style={{padding:"12px 16px",color:"var(--border2)",fontSize:16}}>{"\u203a"}</td>
                </tr>
              );
            })}</tbody>
          </table>
        </div>
      }
    </div>
  );
}

//  FORM MODAL 
function FormModal({ form, setForm, onSave, onClose, onDelete, isEdit }) {
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));
  const lbl={fontSize:11,fontWeight:700,color:"var(--muted)",textTransform:"uppercase",letterSpacing:.8,marginBottom:5,display:"block"};
  const dataBase=form.conosciutoAt||today();
  const cicloCalc=cicloOfDate(dataBase)||CICLO_CORRENTE;
  const onCicloChange=cNum=>{const r=CICLI.find(x=>x[0]===cNum);if(r)set("conosciutoAt",r[1]);};
  return (
    <div style={{background:"var(--bg2)",border:"1px solid var(--border2)",borderRadius:16,padding:"1.6rem",maxHeight:"90vh",overflowY:"auto",boxShadow:"0 20px 70px #000000aa"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
        <h2 style={{fontWeight:900,fontSize:17,color:"var(--text)"}}>{isEdit?" Modifica":"+ Nuovo Prospect"}</h2>
        <button onClick={onClose} style={{background:"var(--bg4)",color:"#7da8d8",border:"1px solid var(--border2)",borderRadius:8,cursor:"pointer",padding:"4px 10px",fontSize:14}}></button>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
        <div><label style={lbl}>Nome *</label><input value={form.nome||""} onChange={e=>set("nome",e.target.value)} placeholder="Nome" /></div>
        <div><label style={lbl}>Cognome</label><input value={form.cognome||""} onChange={e=>set("cognome",e.target.value)} placeholder="Cognome" /></div>
        <div style={{gridColumn:"1/-1"}}><label style={lbl}>Citta</label><input value={form.citta||""} onChange={e=>set("citta",e.target.value)} placeholder="es. Milano" /></div>
        <div><label style={lbl}>Telefono</label><input value={form.telefono||""} onChange={e=>set("telefono",e.target.value)} placeholder="+39 333 000 0000" /></div>
        <div><label style={lbl}>Instagram</label><input value={form.instagram||""} onChange={e=>set("instagram",e.target.value)} placeholder="@username" /></div>
        <div><label style={lbl}>Fonte</label><select value={form.fonte||"Instagram"} onChange={e=>set("fonte",e.target.value)}>{FONTI.map(f=><option key={f} value={f}>{FONTE_ICO[f]} {f}</option>)}</select></div>
        <div><label style={lbl}>Fase</label><select value={form.fase||"INVITO"} onChange={e=>set("fase",e.target.value)}><optgroup label="Funnel">{FASI_FUNNEL.map(f=><option key={f} value={f}>{FASE_LABEL[f]}</option>)}</optgroup><optgroup label="Speciali">{FASI_SPECIALI.map(f=><option key={f} value={f}>{FASE_LABEL[f]}</option>)}</optgroup></select></div>
        <div style={{gridColumn:"1/-1"}}><label style={lbl}>Data conoscenza</label><input type="date" value={form.conosciutoAt||today()} onChange={e=>set("conosciutoAt",e.target.value)} /></div>
        <div style={{gridColumn:"1/-1"}}><label style={lbl}>Ciclo</label><select value={cicloCalc} onChange={e=>onCicloChange(Number(e.target.value))}>{CICLO_NUMS.map(c=><option key={c} value={c}>Ciclo {c} — {cicloLabel(c)}</option>)}</select></div>
        <div style={{gridColumn:"1/-1"}}><label style={lbl}>Prossimo Follow-up</label><input type="date" value={form.followUp||""} onChange={e=>set("followUp",e.target.value)} /></div>
        <div style={{gridColumn:"1/-1"}}>
          <label style={lbl}>Grado di interesse</label>
          <div style={{display:"flex",gap:8}}>
            {INTERESSE.map(v=>{
              const active=form.interesse===v;
              const color=INTERESSE_CLR[v];
              return(
                <button key={v} onClick={()=>set("interesse",active?null:v)}
                  style={{flex:1,padding:"9px",background:active?color+"25":"var(--bg3)",border:"2px solid "+(active?color:"var(--border2)"),borderRadius:9,cursor:"pointer",color:active?color:"var(--muted)",fontWeight:700,fontSize:13,fontFamily:"inherit",transition:"all .2s"}}>
                  {v}
                </button>
              );
            })}
          </div>
        </div>
        {form.fase==="SUB" && (
          <div style={{gridColumn:"1/-1"}}>
            <label style={lbl}>Pacchetto</label>
            <select value={form.pacchetto||""} onChange={e=>set("pacchetto",e.target.value)}>
              <option value="">Seleziona pacchetto...</option>
              {PACCHETTI.map(p=><option key={p.key} value={p.key}>{p.label}{p.key!=="altro"?" — "+p.bv+" BV":""}</option>)}
            </select>
            {form.pacchetto==="altro" && (
              <div style={{marginTop:8}}>
                <label style={lbl}>BV prodotti</label>
                <input type="number" min="0" step="1" value={form.bvCustom||""} onChange={e=>set("bvCustom",parseInt(e.target.value,10)||0)} placeholder="es. 300" />
              </div>
            )}
            {form.pacchetto && (
              <div style={{marginTop:8,background:"#10b98115",border:"1px solid #10b98130",borderRadius:9,padding:"8px 12px",fontSize:12,color:"#10b981",fontWeight:700}}>
                {form.pacchetto==="altro" ? (form.bvCustom||0)+" BV prodotti" : bvOfPacchetto(form.pacchetto)+" BV prodotti"}
              </div>
            )}
          </div>
        )}
      </div>
      <div style={{marginBottom:18}}><label style={lbl}>Note</label><textarea value={form.note||""} onChange={e=>set("note",e.target.value)} style={{height:76,resize:"vertical"}} placeholder="Dove lo hai conosciuto, contesto..." /></div>
      <div style={{display:"flex",gap:9,justifyContent:"flex-end",flexWrap:"wrap"}}>
        {onDelete&&<button onClick={onDelete} style={{padding:"9px 15px",background:"#ef444415",color:"#f87171",border:"1px solid #ef444438",borderRadius:9,cursor:"pointer",fontWeight:700,fontSize:13}}>Elimina</button>}
        <button onClick={onClose} style={{padding:"9px 15px",background:"var(--bg4)",color:"#7da8d8",border:"1px solid var(--border2)",borderRadius:9,cursor:"pointer",fontWeight:600,fontSize:13}}>Annulla</button>
        <button onClick={onSave} style={{padding:"9px 20px",background:"linear-gradient(135deg,var(--a1),var(--a2))",color:"#fff",border:"none",borderRadius:9,cursor:"pointer",fontWeight:800,fontSize:13}}>{isEdit?"Aggiorna":"Aggiungi"}</button>
      </div>
    </div>
  );
}

//  PROFILAZIONE 
function ProfilazioneTab({ p, onUpdateProfilo }) {
  const pr=p.profilazione||{pleasures:{},forza:{}};
  function toggle(section,key){const current=pr[section]?.[key]??null;const next=nextToggle(current);onUpdateProfilo({pleasures:{...pr.pleasures},forza:{...pr.forza},[section]:{...(pr[section]||{}),[key]:next}});}
  function selectJung(key){
    const current = Array.isArray(pr.jung) ? pr.jung : (pr.jung ? [pr.jung] : []);
    const next = current.includes(key) ? current.filter(k=>k!==key) : [...current, key];
    onUpdateProfilo({pleasures:{...pr.pleasures},forza:{...pr.forza},jung:next.length===0?null:next});
  }
  function ToggleGroup({title,fields,section,icon}){
    return(
      <div style={{marginBottom:18}}>
        <div style={{fontSize:10,fontWeight:800,color:"var(--muted)",textTransform:"uppercase",letterSpacing:1.2,marginBottom:10,display:"flex",alignItems:"center",gap:6}}><span>{icon}</span>{title}</div>
        <div style={{display:"flex",flexDirection:"column",gap:7}}>
          {fields.map(f=>{
            const val=pr[section]?.[f.key]??null;const clr=TC[val]||TC.null;
            return(
              <div key={f.key} style={{display:"flex",alignItems:"center",justifyContent:"space-between",background:"var(--bg3)",borderRadius:9,padding:"9px 12px",border:"1px solid "+(val!=null?clr+"40":"var(--border)")}}>
                <span style={{fontSize:12,color:val!=null?"var(--text)":"var(--muted)",fontWeight:val!=null?600:400}}>{f.label}</span>
                <div style={{display:"flex",gap:5}}>
                  {TV.filter(v=>v!==null).map(v=>{
                    const active=val===v;
                    const vc=TC[v];
                    return(
                      <button key={v} className="togbtn"
                        onClick={()=>{
                          const next = active ? null : v;
                          const updSection = {...(pr[section]||{}), [f.key]: next};
                          onUpdateProfilo({pleasures:{...pr.pleasures}, forza:{...pr.forza}, jung:pr.jung, [section]:updSection});
                        }}
                        style={{background:active?vc+"33":"var(--bg4)",color:active?vc:"var(--muted)",border:"1.5px solid "+(active?vc:"var(--border2)"),boxShadow:active?"0 0 8px "+vc+"40":"none"}}
                        title={v==="-"?"No":v==="."?"Forse":"Si"}>
                        {TL[v]}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
  const badge=profiloBadge(p);const pct=Math.round(badge.positivi/PROFILO_TOTAL*100);const bc=pct>=60?"#10b981":pct>=30?"var(--a2)":"#f59e0b";
  const sj = Array.isArray(pr.jung) ? pr.jung : (pr.jung ? [pr.jung] : []);
  const selectedJungs = JUNG.filter(j=>sj.includes(j.key));
  return(
    <div>
      <div style={{background:"var(--bg3)",borderRadius:10,padding:"12px 14px",marginBottom:16,border:"1px solid var(--border)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}><span style={{fontSize:11,fontWeight:700,color:"var(--muted)",textTransform:"uppercase",letterSpacing:.8}}>Score profilazione</span><span style={{fontWeight:900,fontSize:16,color:bc}}> {badge.positivi}/{PROFILO_TOTAL}</span></div>
        <div style={{height:6,background:"var(--bg4)",borderRadius:99,overflow:"hidden"}}><div style={{height:"100%",width:pct+"%",background:"linear-gradient(90deg,"+bc+"88,"+bc+")",borderRadius:99,transition:"width .4s ease",boxShadow:"0 0 8px "+bc+"50"}}/></div>
        <div style={{display:"flex",justifyContent:"space-between",marginTop:5}}><span style={{fontSize:10,color:"var(--muted)"}}>{badge.compilati}/{PROFILO_TOTAL} compilati</span><span style={{fontSize:10,color:bc,fontWeight:700}}>{pct}% positivi</span></div>
      </div>
      <ToggleGroup title="Pleasures — Cosa lo motiva" icon="" fields={PLEASURES} section="pleasures"/>
      <ToggleGroup title="Punti di Forza — Cosa ha gia" icon="" fields={FORZA} section="forza"/>
      <div style={{marginBottom:4}}>
        <div style={{fontSize:10,fontWeight:800,color:"var(--muted)",textTransform:"uppercase",letterSpacing:1.2,marginBottom:10,display:"flex",alignItems:"center",gap:6}}><span></span>Personalita — Colori Jung</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9,marginBottom:10}}>
          {JUNG.map(j=>{const active=sj.includes(j.key);return(<button key={j.key} onClick={()=>selectJung(j.key)} style={{background:active?j.bg:"var(--bg3)",border:"2px solid "+(active?j.border:"var(--border2)"),borderRadius:12,padding:"14px 14px 12px",cursor:"pointer",textAlign:"left",transition:"all .2s",boxShadow:active?"0 0 18px "+j.glow:"none",position:"relative",overflow:"hidden"}}>{active&&<div style={{position:"absolute",top:8,right:10,width:18,height:18,borderRadius:"50%",background:"#ffffff33",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:900,color:"#fff"}}></div>}<div style={{fontWeight:900,fontSize:14,color:active?"#fff":j.border,marginBottom:3}}>{j.label}</div><div style={{fontSize:10,fontWeight:700,color:active?"rgba(255,255,255,.85)":"var(--muted)",marginBottom:5}}>{j.sub}</div><div style={{fontSize:10,color:active?"rgba(255,255,255,.65)":"var(--muted)",lineHeight:1.45}}>{j.desc}</div></button>);})}
        </div>
        {selectedJungs.length>0
          ?<div style={{display:"flex",flexDirection:"column",gap:6}}>{selectedJungs.map(j=><div key={j.key} style={{background:j.border+"15",border:"1px solid "+j.border+"35",borderRadius:10,padding:"10px 13px",display:"flex",alignItems:"center",gap:10}}><div style={{width:10,height:10,borderRadius:"50%",background:j.border,flexShrink:0,boxShadow:"0 0 8px "+j.border}}/><div><span style={{fontSize:11,fontWeight:800,color:j.border}}>{j.label}</span><span style={{fontSize:11,color:"var(--muted)",marginLeft:6}}>{"\u00b7"} {j.sub}</span></div></div>)}</div>
          :<div style={{background:"var(--bg3)",borderRadius:9,padding:"9px 12px",border:"1px dashed var(--border2)",textAlign:"center"}}><span style={{fontSize:11,color:"var(--border2)"}}>Nessun colore selezionato</span></div>
        }
      </div>
      <div style={{background:"var(--bg3)",borderRadius:9,padding:"10px 12px",border:"1px solid var(--border)",marginTop:12}}><div style={{fontSize:10,color:"var(--border2)",fontStyle:"italic",lineHeight:1.5}}>Le persone non comprano il prodotto, ma la trasformazione</div></div>
    </div>
  );
}

//  DETAIL MODAL 
function DetailModal({ p, onEdit, onAdvance, onFollowUp, onNonInt, onRiattiva, onClose, onUpdateProfilo, onUpdateChecklist, onDeleteStorico, onUpdateStoricoData }) {
  const [activeTab,setActiveTab]=useState("dettagli");
  const [stepPopup, setStepPopup]=useState(null); // {fase, date}
  const [stepDate, setStepDate]=useState("");
  const clr=FASE_CLR[p.fase];const ci=FASI_FUNNEL.indexOf(p.fase);const isSpeciale=FASI_SPECIALI.includes(p.fase);
  const od=isOver(p.followUp);const dt=isToday(p.followUp);const ciclo=cicloOfDate(p.conosciutoAt);
  const lbl={fontSize:10,fontWeight:700,color:"var(--muted)",textTransform:"uppercase",letterSpacing:.8,marginBottom:4};
  const box={background:"var(--bg3)",borderRadius:10,padding:"11px 13px",border:"1px solid var(--border)"};
  const storico=[...(p.storico||[])].sort((a,b)=>FASI_FUNNEL.indexOf(a.fase)-FASI_FUNNEL.indexOf(b.fase));
  const badge=profiloBadge(p);
  return(
    <div style={{background:"var(--bg2)",border:"1px solid var(--border2)",borderRadius:16,padding:"1.6rem",maxHeight:"90vh",overflowY:"auto",boxShadow:"0 20px 70px #000000aa"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16}}>
        <div style={{display:"flex",alignItems:"center",gap:13}}>
          <Av n={p.nome} c={p.cognome} color={clr} size={50}/>
          <div>
            <h2 style={{fontWeight:900,fontSize:19,color:"var(--text)",letterSpacing:-0.5}}>{p.nome} {p.cognome}</h2>
            <div style={{color:"var(--muted)",fontSize:12,marginTop:2}}>{p.citta||"\u2014"} {"\u00b7"} {FONTE_ICO[p.fonte]} {p.fonte}</div>
            <div style={{display:"flex",gap:6,marginTop:7,flexWrap:"wrap"}}>
              <span style={{display:"inline-flex",alignItems:"center",borderRadius:6,padding:"2px 9px",fontSize:11,fontWeight:700,color:"#fff",background:clr,boxShadow:"0 0 10px "+clr+"45"}}>{FASE_LABEL[p.fase]}</span>
              {ciclo&&<span style={{display:"inline-flex",alignItems:"center",borderRadius:6,padding:"2px 9px",fontSize:11,fontWeight:700,color:"#fff",background:ciclo===CICLO_CORRENTE?"var(--a1)":"var(--border2)"}}>Ciclo {ciclo}</span>}
              {badge.compilati>0&&<span style={{display:"inline-flex",alignItems:"center",borderRadius:6,padding:"2px 9px",fontSize:11,fontWeight:700,color:"#10b981",background:"#10b98118",border:"1px solid #10b98130"}}> {badge.positivi}/{PROFILO_TOTAL}</span>}
              {p._ownerName&&<span style={{display:"inline-flex",alignItems:"center",borderRadius:6,padding:"2px 9px",fontSize:11,fontWeight:700,color:"#8b5cf6",background:"#8b5cf618",border:"1px solid #8b5cf630"}}> {p._ownerName.trim()}</span>}
              {p.interesse&&<span style={{display:"inline-flex",alignItems:"center",borderRadius:6,padding:"2px 9px",fontSize:11,fontWeight:700,color:INTERESSE_CLR[p.interesse],background:INTERESSE_CLR[p.interesse]+"18",border:"1px solid "+INTERESSE_CLR[p.interesse]+"30"}}>{p.interesse}</span>}
            </div>
          </div>
        </div>
        <button onClick={onClose} style={{background:"var(--bg4)",color:"#7da8d8",border:"1px solid var(--border2)",borderRadius:8,cursor:"pointer",padding:"4px 10px",fontSize:14}}></button>
      </div>
      <div style={{display:"flex",gap:6,marginBottom:16,background:"var(--bg3)",padding:4,borderRadius:10,border:"1px solid var(--border)"}}>
        {[{id:"dettagli",label:" Dettagli"},{id:"profilazione",label:" Profilazione"}].map(t=>(
          <button key={t.id} className="tabbtn" onClick={()=>setActiveTab(t.id)} style={{flex:1,background:activeTab===t.id?"var(--bg4)":"transparent",color:activeTab===t.id?"var(--a2)":"var(--muted)",boxShadow:activeTab===t.id?"inset 0 0 0 1px var(--sidebar-border)":"none"}}>{t.label}</button>
        ))}
      </div>
      {activeTab==="dettagli"&&(
        <>
          {!isSpeciale&&(
            <div style={{display:"flex",alignItems:"center",marginBottom:20,overflowX:"auto",paddingBottom:4}}>
              {FASI_FUNNEL.map((f,i)=>(
                <div key={f} style={{display:"flex",alignItems:"center",flex:i<FASI_FUNNEL.length-1?1:"none",position:"relative"}}>
                  <div onClick={()=>{
                    const existing=p.storico?.find(s=>s.fase===f);
                    setStepDate(existing?.data||today());
                    setStepPopup(f);
                  }}
                    style={{width:38,height:38,borderRadius:"50%",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",background:i<=ci?FASE_CLR[f]:"var(--bg4)",border:"2px solid "+(i===ci?FASE_CLR[f]:i<ci?FASE_CLR[f]+"66":"var(--border2)"),color:i<=ci?"#fff":"var(--muted)",fontSize:7.5,fontWeight:900,boxShadow:i===ci?"0 0 18px "+FASE_CLR[f]+"66":"none",transition:"all .3s",cursor:"pointer"}}>{FASE_LABEL[f]}</div>
                  {i<FASI_FUNNEL.length-1&&<div style={{flex:1,height:3,background:i<ci?FASE_CLR[FASI_FUNNEL[i+1]]+"66":"var(--bg4)",margin:"0 3px",minWidth:4,borderRadius:99}}/>}
                </div>
              ))}
            </div>
          )}
          {stepPopup&&(
            <div onClick={()=>setStepPopup(null)} style={{position:"fixed",inset:0,zIndex:2000,display:"flex",alignItems:"center",justifyContent:"center"}}>
              <div onClick={e=>e.stopPropagation()} style={{background:"var(--bg2)",border:"1px solid var(--border2)",borderRadius:14,padding:"1.2rem 1.4rem",minWidth:260,boxShadow:"0 10px 40px #00000080"}}>
                <div style={{fontWeight:800,fontSize:14,color:"var(--text)",marginBottom:12}}>
                  <span style={{color:FASE_CLR[stepPopup]}}>{FASE_LABEL[stepPopup]}</span> — quando?
                </div>
                <input type="date" value={stepDate} onChange={e=>setStepDate(e.target.value)} style={{marginBottom:12}} />
                <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
                  <button onClick={()=>setStepPopup(null)} style={{padding:"7px 14px",background:"var(--bg4)",color:"var(--muted)",border:"1px solid var(--border2)",borderRadius:8,cursor:"pointer",fontWeight:600,fontSize:12}}>Annulla</button>
                  {p.storico?.some(s=>s.fase===stepPopup)&&(
                    <button onClick={()=>{onDeleteStorico(stepPopup);setStepPopup(null);}} style={{padding:"7px 14px",background:"#ef444415",color:"#f87171",border:"1px solid #ef444430",borderRadius:8,cursor:"pointer",fontWeight:700,fontSize:12}}>Rimuovi</button>
                  )}
                  <button onClick={()=>{
                    if(!stepDate)return;
                    if(p.storico?.some(s=>s.fase===stepPopup)){
                      onUpdateStoricoData(stepPopup,stepDate);
                    } else {
                      // Aggiungi la fase allo storico e aggiorna la fase se necessaria
                      const FASI_ORDER=["INVITO","CONOSCITIVA","FUP1","FUP2","PACK","CLOSING","SUB"];
                      const currentIdx=FASI_ORDER.indexOf(p.fase);
                      const newIdx=FASI_ORDER.indexOf(stepPopup);
                      const newFase=newIdx>currentIdx?stepPopup:p.fase;
                      const newStorico=[...(p.storico||[]).filter(s=>s.fase!==stepPopup),{fase:stepPopup,data:stepDate}];
                      onUpdateStoricoData(stepPopup,stepDate,newFase,newStorico);
                    }
                    setStepPopup(null);
                  }} style={{padding:"7px 14px",background:"linear-gradient(135deg,var(--a1),var(--a2))",color:"#fff",border:"none",borderRadius:8,cursor:"pointer",fontWeight:800,fontSize:12}}>Salva</button>
                </div>
              </div>
            </div>
          )}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9,marginBottom:9}}>
            {[{l:"Fase ora",v:FASE_LABEL[p.fase],color:clr},{l:"Ciclo conoscenza",v:ciclo?"Ciclo "+ciclo:"\u2014",color:ciclo===CICLO_CORRENTE?"var(--a1)":undefined},{l:"Conosciuto il",v:fmt(p.conosciutoAt)},{l:"Follow-up",v:p.followUp?(od?"Scaduto \u00b7 ":dt?"Oggi \u00b7 ":"")+fmt(p.followUp):"Non impostato",color:od?"#f87171":dt?"#fbbf24":undefined}].map(({l,v,color:col})=>(<div key={l} style={box}><div style={lbl}>{l}</div><div style={{color:col||"var(--text)",fontWeight:700,fontSize:13}}>{v}</div></div>))}
            {p.telefono&&(
              <div style={box}>
                <div style={lbl}> Telefono</div>
                <a href={"tel:"+p.telefono} style={{color:"var(--a2)",fontWeight:700,fontSize:13,textDecoration:"none"}}>{p.telefono}</a>
              </div>
            )}
            {p.instagram&&(
              <div style={box}>
                <div style={lbl}> Instagram</div>
                <a href={"https://instagram.com/"+p.instagram.replace("@","")} target="_blank" rel="noreferrer" style={{color:"#c084fc",fontWeight:700,fontSize:13,textDecoration:"none"}}>{p.instagram.startsWith("@")?p.instagram:"@"+p.instagram}</a>
              </div>
            )}
            {p.fase==="SUB"&&(
              <div style={{...box,gridColumn:"1/-1",background:"#10b98112",border:"1px solid #10b98130"}}>
                <div style={lbl}>Pacchetto</div>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                  <span style={{color:"#10b981",fontWeight:800,fontSize:13}}>{p.pacchetto?PACCHETTI.find(x=>x.key===p.pacchetto)?.label||"\u2014":"Non impostato"}</span>
                  {p.pacchetto&&<span style={{fontWeight:900,fontSize:16,color:"#10b981"}}> {bvOfPacchetto(p.pacchetto,p.bvCustom)} BV</span>}
                </div>
              </div>
            )}
          </div>
          {storico.length>0&&(<div style={{...box,marginBottom:9}}><div style={lbl}> Storico percorso</div><div style={{display:"flex",flexDirection:"column",gap:6,marginTop:8}}>{storico.map((s,i)=>(<div key={i} style={{display:"flex",alignItems:"center",gap:9}}><span style={{width:8,height:8,borderRadius:99,background:FASE_CLR[s.fase],flexShrink:0,boxShadow:"0 0 6px "+FASE_CLR[s.fase]+"70"}}/><span style={{fontSize:12.5,fontWeight:700,color:"var(--text)",minWidth:64}}>{FASE_LABEL[s.fase]}</span><input type="date" defaultValue={s.data} onBlur={e=>{if(e.target.value&&e.target.value!==s.data)onUpdateStoricoData(s.fase,e.target.value);}} style={{fontSize:11,padding:"2px 6px",width:"auto",minWidth:0,background:"var(--bg3)",border:"1px solid var(--border2)",borderRadius:6,color:"var(--muted)",cursor:"pointer"}}/><span style={{fontSize:10,color:"var(--muted)",marginLeft:"auto"}}>Ciclo {cicloOfDate(s.data)||"\u2014"}</span>{storico.length>1&&<button onClick={()=>onDeleteStorico(s.fase)} style={{background:"#ef444415",border:"1px solid #ef444430",borderRadius:6,color:"#f87171",cursor:"pointer",fontSize:11,fontWeight:800,padding:"2px 7px",marginLeft:4,lineHeight:1}}>x</button>}</div>))}</div></div>)}
          {p.note&&<div style={{...box,marginBottom:9}}><div style={lbl}> Note</div><p style={{color:"var(--text)",lineHeight:1.6,fontSize:13,marginTop:4}}>{p.note}</p></div>}
          {p.fase==="SUB"&&(
            <div style={{...box,marginBottom:9}}>
              <div style={lbl}>Checklist</div>
              <div style={{display:"flex",gap:10,marginTop:8}}>
                {[{key:"kyc",label:"KYC"},{key:"pandadoc",label:"PANDA DOC"},{key:"click",label:"CLICK"}].map(({key,label})=>{
                  const done=p.checklist?.[key]||false;
                  return(
                    <button key={key} onClick={()=>onUpdateChecklist({...p.checklist,[key]:!done})}
                      style={{display:"flex",alignItems:"center",gap:7,padding:"8px 14px",background:done?"#10b98118":"var(--bg3)",border:"1.5px solid "+(done?"#10b981":"var(--border2)"),borderRadius:9,cursor:"pointer",color:done?"#10b981":"var(--muted)",fontWeight:700,fontSize:12,transition:"all .2s"}}>
                      <div style={{width:16,height:16,borderRadius:4,border:"1.5px solid "+(done?"#10b981":"var(--muted)"),background:done?"#10b981":"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                        {done&&<span style={{color:"#fff",fontSize:10,fontWeight:900,lineHeight:1}}>{"\u2713"}</span>}
                      </div>
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          <div style={{display:"flex",gap:9,marginTop:16,flexWrap:"wrap"}}>
            {!isSpeciale&&ci<FASI_FUNNEL.length-1&&<button onClick={onAdvance} style={{padding:"9px 16px",background:"linear-gradient(135deg,"+FASE_CLR[FASI_FUNNEL[ci+1]]+","+FASE_CLR[FASI_FUNNEL[ci+1]]+"bb)",color:"#fff",border:"none",borderRadius:9,cursor:"pointer",fontWeight:800,fontSize:12}}>Avanza → {FASE_LABEL[FASI_FUNNEL[ci+1]]}</button>}
            {isSpeciale&&<button onClick={onRiattiva} style={{padding:"9px 16px",background:"linear-gradient(135deg,var(--a1),var(--a2))",color:"#fff",border:"none",borderRadius:9,cursor:"pointer",fontWeight:800,fontSize:12}}>↩ Riattiva nel Funnel</button>}
            <button onClick={onEdit} style={{padding:"9px 16px",background:"var(--bg4)",color:"#7da8d8",border:"1px solid var(--border2)",borderRadius:9,cursor:"pointer",fontWeight:600,fontSize:12}}> Modifica</button>
          </div>
          {!isSpeciale&&(<div style={{borderTop:"1px solid #0d1b33",marginTop:13,paddingTop:13,display:"flex",gap:9,flexWrap:"wrap"}}><div style={{fontSize:10,color:"var(--border2)",width:"100%",fontWeight:700,textTransform:"uppercase",letterSpacing:.8,marginBottom:2}}>Stato speciale</div>{p.fase!=="FOLLOW_UP"&&<button onClick={onFollowUp} style={{padding:"8px 13px",background:"#f59e0b16",color:"#fbbf24",border:"1px solid #f59e0b38",borderRadius:9,cursor:"pointer",fontWeight:700,fontSize:12}}> Follow Up caldo</button>}{p.fase!=="NON_INT"&&<button onClick={onNonInt} style={{padding:"8px 13px",background:"#ef444414",color:"#f87171",border:"1px solid #ef444436",borderRadius:9,cursor:"pointer",fontWeight:700,fontSize:12}}> Non interessato</button>}</div>)}
        </>
      )}
      {activeTab==="profilazione"&&<ProfilazioneTab p={p} onUpdateProfilo={onUpdateProfilo}/>}
    </div>
  );
}