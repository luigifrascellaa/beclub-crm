import { useState, useEffect } from "react";
import { ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell, PieChart, Pie } from "recharts";

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
    throw new Error(e.message || res.statusText);
  }
  return text ? JSON.parse(text) : null;
}

const sbSignUp  = (email, pw)      => sbFetch("/auth/v1/signup", { method:"POST", body:JSON.stringify({ email, password:pw }) });
const sbSignIn  = (email, pw)      => sbFetch("/auth/v1/token?grant_type=password", { method:"POST", body:JSON.stringify({ email, password:pw }) });
const sbSignOut = (tok)            => sbFetch("/auth/v1/logout", { method:"POST", _token:tok });
const sbList    = (tok)            => sbFetch("/rest/v1/prospects?select=*&order=created_at.asc", { _token:tok });
const sbInsert  = (tok, row)       => sbFetch("/rest/v1/prospects", { method:"POST", _token:tok, body:JSON.stringify(row) });
const sbUpdate  = (tok, id, row)   => sbFetch("/rest/v1/prospects?id=eq."+id, { method:"PATCH", _token:tok, body:JSON.stringify(row) });
const sbDelete  = (tok, id)        => sbFetch("/rest/v1/prospects?id=eq."+id, { method:"DELETE", _token:tok });

// Profile helpers
const sbGetProfile      = (tok, uid)        => sbFetch("/rest/v1/profiles?id=eq."+uid+"&select=*", { _token:tok });
const sbCreateProfile   = (tok, row)        => sbFetch("/rest/v1/profiles", { method:"POST", _token:tok, body:JSON.stringify(row) });
const sbUpdateProfile   = (tok, uid, row)   => sbFetch("/rest/v1/profiles?id=eq."+uid, { method:"PATCH", _token:tok, body:JSON.stringify(row) });
const sbGetDownline     = (tok)             => sbFetch("/rest/v1/profiles?select=*&upline_id=not.is.null", { _token:tok });
const sbGetDownlineProspects = (tok, uids)  => sbFetch("/rest/v1/prospects?select=*&user_id=in.("+uids.join(",")+")", { _token:tok });
const sbGetProfileByRef = (tok, code)       => sbFetch("/rest/v1/profiles?referral_code=eq."+code+"&select=*", { _token:tok });
const sbUpdateTeam      = (tok, uid, team)  => sbFetch("/rest/v1/profiles?id=eq."+uid, { method:"PATCH", _token:tok, body:JSON.stringify({ team }) });

function toApp(r) {
  return {
    id:r.id, nome:r.nome||"", cognome:r.cognome||"", citta:r.citta||"",
    fonte:r.fonte||"Instagram", fase:r.fase||"INVITO",
    conosciutoAt:r.conosciuto_at||"", followUp:r.follow_up||"",
    note:r.note||"", storico:r.storico||[], profilazione:r.profilazione||{},
    pacchetto:r.pacchetto||"",
  };
}
function toDB(p, uid) {
  return {
    id:p.id, user_id:uid, nome:p.nome, cognome:p.cognome, citta:p.citta,
    fonte:p.fonte, fase:p.fase, conosciuto_at:p.conosciutoAt,
    follow_up:p.followUp||null, note:p.note, storico:p.storico, profilazione:p.profilazione,
    pacchetto:p.pacchetto||null,
  };
}

const PACCHETTI = [
  { key:"starter",   label:"Starter",   bv:100  },
  { key:"standard",  label:"Standard",  bv:250  },
  { key:"premium",   label:"Premium",   bv:550  },
  { key:"signature", label:"Signature", bv:1025 },
];
function bvOfPacchetto(key) { const p = PACCHETTI.find(x=>x.key===key); return p?p.bv:0; }

const FASI_FUNNEL   = ["INVITO","FUP1","FUP2","PACK","CLOSING","SUB"];
const FASI_DASH     = ["FUP1","FUP2","PACK","CLOSING","SUB"];
const FASI_SPECIALI = ["FOLLOW_UP","NON_INT"];
const FASI          = [...FASI_FUNNEL, ...FASI_SPECIALI];
const FONTI         = ["Instagram","TikTok","Offline","Referenza"];
const FONTE_ICO     = { Instagram:"📸", TikTok:"🎵", Offline:"🤝", Referenza:"👥" };

const FASE_CLR = {
  INVITO:"#8b5cf6", FUP1:"#2563eb", FUP2:"#3b82f6", PACK:"#0ea5e9",
  CLOSING:"#22d3ee", SUB:"#10b981", FOLLOW_UP:"#f59e0b", NON_INT:"#6b7280",
};
const FASE_LABEL = {
  INVITO:"Invito", FUP1:"FUP 1", FUP2:"FUP 2", PACK:"Pack",
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
const TC = { null:"#1e3a5f", "-":"#ef4444", ".":"#f59e0b", "+":"#10b981" };
const TL = { "-":"–", ".":"·", "+":"+" };
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
function reachedEver(p,fase)       { return (p.storico||[]).some(s=>s.fase===fase); }
function reachedInCiclo(p,fase,c)  { const e=(p.storico||[]).find(s=>s.fase===fase); return e?cicloOfDate(e.data)===Number(c):false; }
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
  const act   = prospects.filter(p=>["FUP1","FUP2","PACK","CLOSING"].includes(p.fase)).length;
  const conv  = total>0 ? Math.round(sub/total*100) : 0;
  const bv    = prospects.filter(p=>p.fase==="SUB").reduce((acc,p)=>acc+bvOfPacchetto(p.pacchetto),0);
  return { total, sub, act, conv, bv };
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
html,body,#root{height:100%;font-family:'Inter',sans-serif}
body{background:#060b18;color:#dbeafe;overflow:hidden}
::-webkit-scrollbar{width:5px;height:5px}
::-webkit-scrollbar-thumb{background:#1e3a5f;border-radius:99px}
input,select,textarea{background:#0a1426;border:1px solid #1e3a5f;border-radius:10px;padding:9px 13px;color:#dbeafe;font-size:13px;font-family:'Inter',sans-serif;outline:none;width:100%;transition:border .2s}
input:focus,select:focus,textarea:focus{border-color:#2563eb;box-shadow:0 0 0 3px #2563eb22}
input::placeholder,textarea::placeholder{color:#3b5478}
select option{background:#0a1426}
input[type=date]::-webkit-calendar-picker-indicator{filter:invert(.6) sepia(1) hue-rotate(180deg);cursor:pointer}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes popIn{from{transform:scale(.95);opacity:0}to{transform:scale(1);opacity:1}}
@keyframes barIn{from{width:0}to{width:var(--w)}}
@keyframes pulse{0%,100%{box-shadow:0 0 14px #ef444430}50%{box-shadow:0 0 26px #ef444460}}
@keyframes spin{to{transform:rotate(360deg)}}
.kpi:hover{transform:translateY(-3px);transition:transform .25s}
.hrow:hover{background:#0b1730}
.pop{animation:popIn .22s cubic-bezier(.34,1.3,.64,1)}
.pulse{animation:pulse 2.5s ease-in-out infinite}
.bar{border-radius:99px;animation:barIn .8s cubic-bezier(.4,0,.2,1) forwards}
.tabbtn{padding:8px 16px;border-radius:8px;border:none;cursor:pointer;font-size:12px;font-weight:700;font-family:'Inter',sans-serif;transition:all .2s}
.togbtn{width:34px;height:28px;border-radius:7px;border:none;cursor:pointer;font-size:13px;font-weight:900;font-family:'Inter',sans-serif;transition:all .18s;display:flex;align-items:center;justify-content:center}
.spinner{width:18px;height:18px;border:2px solid #1e3a5f;border-top-color:#2563eb;border-radius:50%;animation:spin .7s linear infinite;display:inline-block}
`;

function Av({ n, c, color, size=34 }) {
  return (
    <div style={{width:size,height:size,borderRadius:"50%",flexShrink:0,background:"linear-gradient(135deg,"+color+","+color+"99)",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:900,fontSize:size*0.32,boxShadow:"0 0 10px "+color+"35"}}>
      {(n||"?")[0]}{(c||"")[0]}
    </div>
  );
}

// ─── AUTH SCREEN ──────────────────────────────────────────────────────────────
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
    if (ref) { localStorage.setItem("pending_ref", ref); setMode("signup"); }

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
          let uplineId = null;
          if (pendingRef) {
            const profiles = await sbGetProfileByRef(tok, pendingRef);
            if (profiles && profiles.length > 0) uplineId = profiles[0].id;
            localStorage.removeItem("pending_ref");
          }
          await sbCreateProfile(tok, { id:userId, email, nome:nome.trim(), cognome:cognome.trim(), upline_id:uplineId });
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
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",background:"#060b18",padding:16}}>
      <div className="pop" style={{width:"100%",maxWidth:400,background:"#080f1f",border:"1px solid #1e3a5f",borderRadius:20,padding:"2.2rem",boxShadow:"0 20px 70px #000000aa"}}>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:28}}>
          <div style={{width:40,height:40,borderRadius:12,background:"linear-gradient(135deg,#2563eb,#0ea5e9)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,boxShadow:"0 0 20px #2563eb50"}}>◆</div>
          <div>
            <div style={{fontWeight:900,fontSize:17,color:"#eff6ff",lineHeight:1.1}}>BE Club CRM</div>
            <div style={{fontSize:11,color:"#3b5478",marginTop:2}}>Pipeline · Profilazione · Team</div>
          </div>
        </div>
        <div style={{display:"flex",background:"#0a1426",borderRadius:10,padding:4,marginBottom:24,border:"1px solid #11203a"}}>
          {["login","signup"].map(m=>(
            <button key={m} onClick={()=>{setMode(m);setErr("");}} className="tabbtn"
              style={{flex:1,background:mode===m?"#0d1b33":"transparent",color:mode===m?"#7dd3fc":"#5278a8",boxShadow:mode===m?"inset 0 0 0 1px #2563eb40":"none"}}>
              {m==="login"?"Accedi":"Registrati"}
            </button>
          ))}
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:12,marginBottom:16}}>
          {mode==="signup" && (
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <div>
                <label style={{fontSize:11,fontWeight:700,color:"#3b5478",textTransform:"uppercase",letterSpacing:.8,marginBottom:5,display:"block"}}>Nome *</label>
                <input value={nome} onChange={e=>setNome(e.target.value)} placeholder="Luigi" />
              </div>
              <div>
                <label style={{fontSize:11,fontWeight:700,color:"#3b5478",textTransform:"uppercase",letterSpacing:.8,marginBottom:5,display:"block"}}>Cognome *</label>
                <input value={cognome} onChange={e=>setCognome(e.target.value)} placeholder="Rossi" />
              </div>
            </div>
          )}
          <div>
            <label style={{fontSize:11,fontWeight:700,color:"#3b5478",textTransform:"uppercase",letterSpacing:.8,marginBottom:5,display:"block"}}>Email</label>
            <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="tua@email.com" onKeyDown={e=>e.key==="Enter"&&submit()} />
          </div>
          <div>
            <label style={{fontSize:11,fontWeight:700,color:"#3b5478",textTransform:"uppercase",letterSpacing:.8,marginBottom:5,display:"block"}}>Password</label>
            <input type="password" value={pass} onChange={e=>setPass(e.target.value)} placeholder="••••••••" onKeyDown={e=>e.key==="Enter"&&submit()} />
          </div>
        </div>
        {err && <div style={{background:"#ef444415",border:"1px solid #ef444435",borderRadius:9,padding:"9px 13px",fontSize:12,color:"#f87171",marginBottom:14,lineHeight:1.5}}>{err}</div>}

        {mode==="login" && (
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:16,cursor:"pointer"}} onClick={()=>setRemember(r=>!r)}>
            <div style={{width:18,height:18,borderRadius:5,border:"1.5px solid "+(remember?"#2563eb":"#1e3a5f"),background:remember?"#2563eb":"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"all .2s"}}>
              {remember && <span style={{color:"#fff",fontSize:11,fontWeight:900}}>✓</span>}
            </div>
            <span style={{fontSize:12,color:"#5278a8",userSelect:"none"}}>Ricordami su questo dispositivo</span>
          </div>
        )}
        <button onClick={submit} disabled={loading}
          style={{width:"100%",padding:"11px",background:"linear-gradient(135deg,#2563eb,#0ea5e9)",color:"#fff",border:"none",borderRadius:10,cursor:loading?"not-allowed":"pointer",fontWeight:800,fontSize:14,display:"flex",alignItems:"center",justifyContent:"center",gap:8,opacity:loading?0.7:1}}>
          {loading && <span className="spinner" />}
          {mode==="login"?"Accedi":"Crea account"}
        </button>
        {mode==="login" && (
          <div style={{textAlign:"center",marginTop:16,fontSize:11,color:"#3b5478"}}>
            Non hai un account?{" "}
            <span onClick={()=>{setMode("signup");setErr("");}} style={{color:"#60a5fa",cursor:"pointer",fontWeight:700}}>Registrati</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── APP ──────────────────────────────────────────────────────────────────────
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
  const [ready, setReady]         = useState(false);
  const [saving, setSaving]       = useState(false);
  const [downline, setDownline]   = useState([]);
  const [dlProspects, setDlProspects] = useState([]);

  useEffect(()=>{
    const el=document.createElement("style");
    el.textContent=CSS;
    document.head.appendChild(el);
    return ()=>document.head.removeChild(el);
  },[]);

  useEffect(()=>{
    if (!auth) { setData([]); setReady(true); return; }
    setReady(false);
    sbList(auth.token).then(rows=>{
      const arr=(rows||[]).map(r=>{
        const p=toApp(r);
        if (!p.storico.length) p.storico=buildStorico(p,p.fase,p.conosciutoAt);
        return p;
      });
      setData(arr);
    }).catch(e=>showToast("Errore: "+e.message,"#ef4444")).finally(()=>setReady(true));

    // Load downline
    sbGetDownline(auth.token).then(async profiles=>{
      const mine = (profiles||[]).filter(p=>isMyDownline(p, auth.userId, profiles||[]));
      setDownline(mine);
      if (mine.length>0) {
        const uids = mine.map(p=>p.id);
        const dp = await sbGetDownlineProspects(auth.token, uids);
        setDlProspects((dp||[]).map(r=>({...toApp(r), _userId:r.user_id})));
      }
    }).catch(()=>{});
  },[auth]);

  function isMyDownline(profile, myId, allProfiles) {
    if (profile.upline_id === myId) return true;
    if (!profile.upline_id) return false;
    const parent = allProfiles.find(p=>p.id===profile.upline_id);
    if (!parent) return false;
    return isMyDownline(parent, myId, allProfiles);
  }

  function showToast(msg,color="#22d3ee") { setToast({msg,color}); setTimeout(()=>setToast(null),2800); }
  function closeModal() { setModal(null); setSel(null); setForm({}); }
  function openAdd()    { setForm({fase:"INVITO",fonte:"Instagram",conosciutoAt:today()}); setModal("add"); }
  function openDetail(p){ setSel(p); setModal("detail"); }

  async function handleLogout() {
    try { await sbSignOut(auth.token); } catch(e){}
    localStorage.removeItem("becrm_session");
    setAuth(null); setData([]); setReady(true);
  }

  async function saveForm() {
    if (!form.nome?.trim()) return;
    if (form.fase === "SUB" && !form.pacchetto) { showToast("Seleziona il pacchetto per un iscritto ❌", "#ef4444"); return; }
    setSaving(true);
    try {
      const conosciutoAt = form.conosciutoAt||today();
      const storico = buildStorico({...form,conosciutoAt},form.fase,conosciutoAt);
      const record  = {...form,conosciutoAt,storico};
      if (modal==="add") {
        const np={...record,id:genId()};
        await sbInsert(auth.token,toDB(np,auth.userId));
        setData(d=>[...d,np]);
        showToast("Prospect aggiunto ✅");
      } else {
        await sbUpdate(auth.token,record.id,toDB(record,auth.userId));
        setData(d=>d.map(p=>p.id===record.id?record:p));
        showToast("Aggiornato ✅");
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
      showToast(fase==="FOLLOW_UP"?"🔥 Follow Up":fase==="NON_INT"?"❌ Non interessato":"↩ Riattivato",
        fase==="FOLLOW_UP"?"#f59e0b":fase==="NON_INT"?"#6b7280":"#2563eb");
    } catch(e) { showToast("Errore: "+e.message,"#ef4444"); }
  }

  async function updateProfilo(id,profilazione) {
    const p=data.find(x=>x.id===id); if (!p) return;
    const upd={...p,profilazione};
    try {
      await sbUpdate(auth.token,id,toDB(upd,auth.userId));
      setData(d=>d.map(x=>x.id===id?upd:x)); setSel(upd);
    } catch(e) { showToast("Errore salvataggio","#ef4444"); }
  }

  async function assignTeam(memberId, team) {
    try {
      await sbUpdateTeam(auth.token, memberId, team);
      setDownline(d=>d.map(m=>m.id===memberId?{...m,team}:m));
      showToast("Squadra aggiornata ✅");
    } catch(e) { showToast("Errore: "+e.message,"#ef4444"); }
  }

  function onExport() {
    try {
      const b=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});
      const u=URL.createObjectURL(b);
      const a=document.createElement("a");
      a.href=u; a.download="becrm_backup_"+today()+".json";
      document.body.appendChild(a); a.click();
      setTimeout(()=>{document.body.removeChild(a);URL.revokeObjectURL(u);},800);
      showToast("Backup esportato ✅");
    } catch(e) { showToast("Errore export","#ef4444"); }
  }

  const cd    = dataByCiclo(data,dashCiclo);
  const cdSub = cd.filter(p=>p.fase==="SUB");
  const cdAct = cd.filter(p=>["FUP1","FUP2","PACK","CLOSING"].includes(p.fase));
  const cdFU  = cd.filter(p=>p.fase==="FOLLOW_UP");
  const cdNI  = cd.filter(p=>p.fase==="NON_INT");
  const cdConv= cd.length?Math.round(cdSub.length/cd.length*100):0;
  const totSub  = data.filter(p=>p.fase==="SUB").length;
  const totConv = data.length?Math.round(totSub/data.length*100):0;
  const urgenti = data.filter(p=>(isOver(p.followUp)||isToday(p.followUp))&&p.fase!=="NON_INT");
  const funnelCounts=FASI_DASH.map(f=>({f,n:cd.filter(p=>p.fase===f).length}));
  const funnelMax=Math.max(...funnelCounts.map(x=>x.n),1);
  const listaData=data.filter(p=>{
    const q=search.toLowerCase();
    return (!q||(p.nome+" "+p.cognome+" "+(p.citta||"")).toLowerCase().includes(q))
      &&(!fFase||p.fase===fFase)&&(!fFonte||p.fonte===fFonte)
      &&(!fCiclo||cicloOfDate(p.conosciutoAt)===Number(fCiclo));
  });

  if (!auth) return <AuthScreen onAuth={setAuth} />;
  if (!ready) return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",background:"#060b18",flexDirection:"column",gap:12}}>
      <span className="spinner" style={{width:28,height:28,borderWidth:3}} />
      <span style={{fontSize:13,color:"#3b5478"}}>Caricamento...</span>
    </div>
  );

  return (
    <div style={{display:"flex",height:"100vh",width:"100vw",overflow:"hidden",background:"#060b18"}}>
      {toast && <div style={{position:"fixed",bottom:24,right:24,zIndex:9999,background:toast.color,color:"#fff",padding:"12px 22px",borderRadius:12,fontWeight:700,fontSize:13,boxShadow:"0 8px 30px #00000060",animation:"fadeIn .25s ease"}}>{toast.msg}</div>}
      {saving && <div style={{position:"fixed",top:14,right:14,zIndex:9998,background:"#0d1b33",border:"1px solid #1e3a5f",borderRadius:9,padding:"7px 14px",fontSize:12,color:"#60a5fa",display:"flex",alignItems:"center",gap:7}}><span className="spinner" />Salvataggio...</div>}

      <Sidebar view={view} setView={setView} data={data} urgenti={urgenti} onAdd={openAdd} onExport={onExport} auth={auth} onLogout={handleLogout} downlineCount={downline.length} />

      <main style={{flex:1,overflowY:"auto",height:"100vh"}}>
        {view==="dash"  && <Dash cd={cd} cdSub={cdSub} cdAct={cdAct} cdFU={cdFU} cdNI={cdNI} cdConv={cdConv} totSub={totSub} totConv={totConv} totAll={data.length} funnelCounts={funnelCounts} funnelMax={funnelMax} urgenti={urgenti} dashCiclo={dashCiclo} setDashCiclo={setDashCiclo} onOpen={openDetail} />}
        {view==="lista" && <Lista prospects={listaData} total={data.length} search={search} setSearch={setSearch} fFase={fFase} setFFase={setFFase} fFonte={fFonte} setFFonte={setFFonte} fCiclo={fCiclo} setFCiclo={setFCiclo} onOpen={openDetail} onAdd={openAdd} />}
        {view==="stats" && <Statistiche data={data} />}
        {view==="team"  && <TeamView auth={auth} downline={downline} dlProspects={dlProspects} onAssignTeam={assignTeam} />}
      </main>

      {modal && (
        <div onClick={closeModal} style={{position:"fixed",inset:0,background:"#00000090",backdropFilter:"blur(8px)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:16,animation:"fadeIn .2s"}}>
          <div className="pop" onClick={e=>e.stopPropagation()} style={{width:"100%",maxWidth:520}}>
            {modal==="detail"
              ? <DetailModal p={sel} onEdit={()=>{setForm({...sel});setModal("edit");}} onAdvance={()=>advanceFase(sel)} onFollowUp={()=>moveFase(sel,"FOLLOW_UP")} onNonInt={()=>moveFase(sel,"NON_INT")} onRiattiva={()=>moveFase(sel,"RIATTIVA")} onClose={closeModal} onUpdateProfilo={pr=>updateProfilo(sel.id,pr)} />
              : <FormModal form={form} setForm={setForm} onSave={saveForm} onClose={closeModal} onDelete={modal==="edit"?()=>deleteProp(form.id):null} isEdit={modal==="edit"} />
            }
          </div>
        </div>
      )}
    </div>
  );
}

// ─── SIDEBAR ──────────────────────────────────────────────────────────────────
function Sidebar({ view, setView, data, urgenti, onAdd, onExport, auth, onLogout, downlineCount }) {
  const navs = [
    { id:"dash",  icon:"▦", label:"Dashboard" },
    { id:"lista", icon:"☰", label:"Prospect", badge:data.length },
    { id:"stats", icon:"◪", label:"Statistiche" },
    { id:"team",  icon:"◈", label:"Team", badge:downlineCount||0 },
  ];
  return (
    <aside style={{width:222,minWidth:222,background:"#080f1f",borderRight:"1px solid #11203a",padding:"1.5rem .9rem",display:"flex",flexDirection:"column",gap:4,height:"100vh",overflowY:"auto"}}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:24,paddingLeft:4}}>
        <div style={{width:34,height:34,borderRadius:10,background:"linear-gradient(135deg,#2563eb,#0ea5e9)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,boxShadow:"0 0 16px #2563eb50"}}>◆</div>
        <div style={{fontWeight:900,fontSize:14,color:"#bfdbfe",lineHeight:1.2}}>BE Club<br/>CRM</div>
      </div>

      {navs.map(item=>(
        <button key={item.id} onClick={()=>setView(item.id)}
          style={{display:"flex",alignItems:"center",gap:9,width:"100%",padding:"10px 12px",background:view===item.id?"#0d1b33":"transparent",boxShadow:view===item.id?"inset 0 0 0 1px #2563eb40":"none",color:view===item.id?"#7dd3fc":"#5278a8",borderRadius:10,cursor:"pointer",fontSize:13,fontWeight:600,textAlign:"left",border:"none",transition:"all .2s"}}>
          <span>{item.icon}</span>{item.label}
          {item.badge>0 && <span style={{marginLeft:"auto",background:"#2563eb20",color:"#60a5fa",borderRadius:99,padding:"1px 8px",fontSize:11,fontWeight:700}}>{item.badge}</span>}
        </button>
      ))}

      <button onClick={onAdd} style={{marginTop:14,padding:"10px",fontSize:13,fontWeight:800,background:"linear-gradient(135deg,#2563eb,#0ea5e9)",color:"#fff",border:"none",borderRadius:10,cursor:"pointer"}}>
        + Nuovo Prospect
      </button>

      {urgenti.length>0 && (
        <div className="pulse" style={{marginTop:8,background:"#ef444412",border:"1px solid #ef444435",borderRadius:10,padding:"10px 12px",display:"flex",alignItems:"center",gap:8,color:"#f87171",fontSize:12,fontWeight:700}}>
          🔔 {urgenti.length} urgent{urgenti.length===1?"e":"i"}
        </div>
      )}

      <div style={{borderTop:"1px solid #11203a",paddingTop:14,marginTop:16,display:"flex",flexDirection:"column",gap:7}}>
        <div style={{fontSize:10,fontWeight:800,color:"#2a4060",textTransform:"uppercase",letterSpacing:1.2,marginBottom:2}}>Backup</div>
        <button onClick={onExport} style={{padding:"8px 10px",background:"#0d1b33",color:"#60a5fa",border:"1px solid #1e3a5f",borderRadius:9,cursor:"pointer",fontWeight:700,fontSize:12,textAlign:"left"}}>⬇ Esporta JSON</button>
      </div>

      <div style={{marginTop:14,borderTop:"1px solid #11203a",paddingTop:14}}>
        <div style={{fontSize:10,fontWeight:800,color:"#2a4060",textTransform:"uppercase",letterSpacing:1.2,marginBottom:8}}>Totale ora</div>
        {FASI.map(f=>{
          const n=data.filter(p=>p.fase===f).length;
          return (
            <div key={f} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"3px 2px"}}>
              <span style={{display:"flex",alignItems:"center",gap:7,fontSize:11,color:"#4a6a8a"}}>
                <span style={{width:7,height:7,borderRadius:99,background:FASE_CLR[f],flexShrink:0}} />{FASE_LABEL[f]}
              </span>
              <span style={{fontWeight:800,fontSize:12,color:n>0?FASE_CLR[f]:"#2a4060"}}>{n}</span>
            </div>
          );
        })}
      </div>

      <div style={{marginTop:"auto",paddingTop:14,borderTop:"1px solid #11203a"}}>
        <div style={{fontSize:10,color:"#3b5478",marginBottom:6,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{auth?.email}</div>
        <button onClick={onLogout} style={{width:"100%",padding:"8px 10px",background:"#ef444415",color:"#f87171",border:"1px solid #ef444430",borderRadius:9,cursor:"pointer",fontWeight:700,fontSize:12}}>Esci</button>
      </div>
    </aside>
  );
}

// ─── TEAM VIEW ────────────────────────────────────────────────────────────────
function TeamView({ auth, downline, dlProspects, onAssignTeam }) {
  const [selectedMember, setSelectedMember] = useState(null);
  const [teamFilter, setTeamFilter] = useState("all");
  const [copied, setCopied] = useState(false);

  const referralLink = auth?.profile?.referral_code
    ? window.location.origin + "?ref=" + auth.profile.referral_code
    : null;

  function copyLink() {
    if (!referralLink) return;
    navigator.clipboard.writeText(referralLink).then(()=>{
      setCopied(true); setTimeout(()=>setCopied(false),2000);
    });
  }

  const sinistra = downline.filter(m=>m.team==="sinistra");
  const destra   = downline.filter(m=>m.team==="destra");
  const noTeam   = downline.filter(m=>!m.team);

  const filteredMembers = teamFilter==="all" ? downline :
    teamFilter==="sinistra" ? sinistra :
    teamFilter==="destra"   ? destra   : noTeam;

  function getMemberProspects(memberId) {
    return dlProspects.filter(p=>p._userId===memberId);
  }

  // Stats per squadra
  function squadraStats(members) {
    const prospects = members.flatMap(m=>getMemberProspects(m.id));
    return teamStats(prospects);
  }

  const statsS = squadraStats(sinistra);
  const statsD = squadraStats(destra);
  const statsTot = teamStats(dlProspects);

  const convColor = v => v>=20?"#10b981":v>=10?"#0ea5e9":"#f59e0b";

  const compareData = [
    { name:"Prospect", sinistra:statsS.total, destra:statsD.total },
    { name:"Iscritti",  sinistra:statsS.sub,   destra:statsD.sub },
    { name:"Attivi",    sinistra:statsS.act,   destra:statsD.act },
  ];

  if (selectedMember) {
    const mProspects = getMemberProspects(selectedMember.id);
    const mStats = teamStats(mProspects);
    return (
      <div style={{padding:"2rem 2.2rem",maxWidth:1280,margin:"0 auto"}}>
        <button onClick={()=>setSelectedMember(null)} style={{display:"flex",alignItems:"center",gap:8,background:"none",border:"none",color:"#60a5fa",cursor:"pointer",fontSize:13,fontWeight:700,marginBottom:20}}>
          ← Torna al Team
        </button>
        <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:24}}>
          <Av n={selectedMember.nome||selectedMember.email} c={selectedMember.cognome} color={selectedMember.team==="sinistra"?"#2563eb":selectedMember.team==="destra"?"#10b981":"#6b7280"} size={50} />
          <div>
            <h2 style={{fontWeight:900,fontSize:22,color:"#eff6ff"}}>{selectedMember.nome||selectedMember.email}</h2>
            <div style={{fontSize:12,color:"#5278a8",marginTop:3}}>{selectedMember.email}</div>
            <div style={{display:"flex",gap:8,marginTop:6}}>
              {selectedMember.team
                ? <span style={{display:"inline-flex",alignItems:"center",borderRadius:6,padding:"2px 10px",fontSize:11,fontWeight:700,color:"#fff",background:selectedMember.team==="sinistra"?"#2563eb":"#10b981"}}>Squadra {selectedMember.team}</span>
                : <span style={{fontSize:11,color:"#3b5478"}}>Nessuna squadra</span>
              }
            </div>
          </div>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:20}}>
          {[
            {label:"Prospect totali",value:mStats.total,color:"#2563eb",icon:"👥"},
            {label:"Iscritti",value:mStats.sub,color:"#10b981",icon:"✅"},
            {label:"In percorso",value:mStats.act,color:"#0ea5e9",icon:"📊"},
            {label:"BV prodotti",value:mStats.bv,color:"#f59e0b",icon:"🏆"},
          ].map((k,i)=>(
            <div key={i} style={{background:"#080f1f",border:"1px solid #11203a",borderRadius:14,padding:"16px 18px",position:"relative",overflow:"hidden"}}>
              <div style={{position:"absolute",top:0,left:0,right:0,height:3,background:"linear-gradient(90deg,"+k.color+","+k.color+"44)",borderRadius:"14px 14px 0 0"}} />
              <div style={{fontSize:10,color:"#3b5478",fontWeight:700,textTransform:"uppercase",letterSpacing:.8,marginBottom:8}}>{k.label}</div>
              <div style={{fontSize:28,fontWeight:900,color:k.color}}>{k.value}</div>
            </div>
          ))}
        </div>

        <div style={{background:"#080f1f",border:"1px solid #11203a",borderRadius:14,overflow:"hidden"}}>
          <div style={{padding:"1rem 1.4rem",borderBottom:"1px solid #11203a",fontSize:13,fontWeight:800,color:"#eff6ff"}}>Prospect di {selectedMember.nome||selectedMember.email}</div>
          {mProspects.length===0
            ? <div style={{padding:"3rem",textAlign:"center",color:"#1e3a5f"}}>Nessun prospect ancora</div>
            : <table style={{width:"100%",borderCollapse:"collapse"}}>
                <thead><tr style={{borderBottom:"1px solid #11203a"}}>
                  {["Nome","Conosciuto","Fonte","Fase","Profilo"].map(h=>(
                    <th key={h} style={{textAlign:"left",color:"#3b5478",fontWeight:700,fontSize:10,textTransform:"uppercase",padding:"11px 16px"}}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>{mProspects.map(p=>{
                  const badge=profiloBadge(p);
                  const bc=badge.compilati===0?"#2a4060":badge.positivi>=6?"#10b981":badge.positivi>=3?"#0ea5e9":"#f59e0b";
                  return (
                    <tr key={p.id} className="hrow" style={{borderBottom:"1px solid #0d1b3355"}}>
                      <td style={{padding:"11px 16px"}}><div style={{display:"flex",alignItems:"center",gap:9}}><Av n={p.nome} c={p.cognome} color={FASE_CLR[p.fase]} /><span style={{color:"#eff6ff",fontWeight:700,fontSize:13}}>{p.nome} {p.cognome}</span></div></td>
                      <td style={{padding:"11px 16px",color:"#5278a8",fontSize:12}}>{fmt(p.conosciutoAt)}</td>
                      <td style={{padding:"11px 16px",color:"#5278a8",fontSize:12}}>{FONTE_ICO[p.fonte]} {p.fonte}</td>
                      <td style={{padding:"11px 16px"}}><span style={{display:"inline-flex",alignItems:"center",borderRadius:6,padding:"3px 9px",fontSize:11,fontWeight:700,color:"#fff",background:FASE_CLR[p.fase]}}>{FASE_LABEL[p.fase]}</span></td>
                      <td style={{padding:"11px 16px"}}>{badge.compilati===0?<span style={{color:"#2a4060",fontSize:11}}>\u2014</span>:<span style={{fontSize:11,fontWeight:800,color:bc}}>🎯 {badge.positivi}/{PROFILO_TOTAL}</span>}</td>
                    </tr>
                  );
                })}</tbody>
              </table>
          }
        </div>
      </div>
    );
  }

  return (
    <div style={{padding:"2rem 2.2rem",maxWidth:1280,margin:"0 auto"}}>
      <div style={{marginBottom:"1.5rem"}}>
        <h1 style={{fontWeight:900,fontSize:26,color:"#eff6ff",letterSpacing:-0.8}}>Team</h1>
        <p style={{color:"#3b5478",fontSize:12,marginTop:4}}>{downline.length} membri nella tua downline</p>
      </div>

      {/* Referral link */}
      <div style={{background:"#080f1f",border:"1px solid #2563eb30",borderRadius:14,padding:"1.2rem 1.4rem",marginBottom:16}}>
        <div style={{fontSize:11,fontWeight:700,color:"#2563eb",textTransform:"uppercase",letterSpacing:1,marginBottom:8}}>🔗 Il tuo link referral</div>
        {referralLink
          ? <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
              <div style={{flex:1,background:"#0a1426",border:"1px solid #1e3a5f",borderRadius:9,padding:"9px 13px",fontSize:12,color:"#94b5d8",fontFamily:"monospace",minWidth:200,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{referralLink}</div>
              <button onClick={copyLink} style={{padding:"9px 18px",background:copied?"#10b98120":"linear-gradient(135deg,#2563eb,#0ea5e9)",color:copied?"#10b981":"#fff",border:copied?"1px solid #10b98140":"none",borderRadius:9,cursor:"pointer",fontWeight:800,fontSize:12,whiteSpace:"nowrap"}}>
                {copied?"✅ Copiato!":"Copia link"}
              </button>
            </div>
          : <div style={{fontSize:12,color:"#3b5478"}}>Caricamento link...</div>
        }
        <div style={{fontSize:11,color:"#2a4060",marginTop:8}}>Condividi questo link — chi si registra tramite il tuo link appare automaticamente nel tuo team.</div>
      </div>

      {/* KPI totali team */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:16}}>
        {[
          {label:"Membri team",value:downline.length,color:"#8b5cf6",icon:"◈"},
          {label:"Prospect totali",value:statsTot.total,color:"#2563eb",icon:"👥"},
          {label:"Iscritti team",value:statsTot.sub,color:"#10b981",icon:"✅"},
          {label:"BV team",value:statsTot.bv,color:"#f59e0b",icon:"🏆"},
        ].map((k,i)=>(
          <div key={i} className="kpi" style={{background:"#080f1f",border:"1px solid #11203a",borderRadius:14,padding:"16px 18px",position:"relative",overflow:"hidden"}}>
            <div style={{position:"absolute",top:0,left:0,right:0,height:3,background:"linear-gradient(90deg,"+k.color+","+k.color+"44)",borderRadius:"14px 14px 0 0"}} />
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
              <span style={{fontSize:10,color:"#3b5478",fontWeight:700,textTransform:"uppercase",letterSpacing:.8}}>{k.label}</span>
              <span style={{fontSize:14,padding:6,borderRadius:8,background:k.color+"18"}}>{k.icon}</span>
            </div>
            <div style={{fontSize:30,fontWeight:900,color:k.color,lineHeight:1}}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Confronto squadre */}
      {(sinistra.length>0||destra.length>0) && (
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
          {[
            {team:"sinistra",stats:statsS,color:"#2563eb",members:sinistra.length},
            {team:"destra",stats:statsD,color:"#10b981",members:destra.length},
          ].map(({team,stats,color,members})=>(
            <div key={team} style={{background:"#080f1f",border:"1px solid "+color+"28",borderRadius:14,padding:"1.2rem"}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
                <span style={{fontSize:13,fontWeight:900,color,textTransform:"capitalize"}}>Squadra {team}</span>
                <span style={{fontSize:11,color:"#3b5478"}}>{members} membri</span>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:8}}>
                {[
                  {l:"Prospect",v:stats.total},
                  {l:"Iscritti",v:stats.sub},
                  {l:"Conv%",v:stats.conv+"%"},
                  {l:"BV",v:stats.bv},
                ].map(({l,v})=>(
                  <div key={l} style={{background:"#0a1426",borderRadius:9,padding:"10px"}}>
                    <div style={{fontSize:10,color:"#3b5478",marginBottom:4}}>{l}</div>
                    <div style={{fontSize:20,fontWeight:900,color}}>{v}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Grafico confronto */}
      {(sinistra.length>0||destra.length>0) && (
        <div style={{background:"#080f1f",border:"1px solid #11203a",borderRadius:14,padding:"1.4rem",marginBottom:16}}>
          <div style={{fontSize:13,fontWeight:800,color:"#eff6ff",marginBottom:16}}>📊 Confronto squadre</div>
          <div style={{height:220}}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={compareData} margin={{top:5,right:10,left:-15,bottom:5}}>
                <CartesianGrid strokeDasharray="3 3" stroke="#11203a" vertical={false} />
                <XAxis dataKey="name" stroke="#3b5478" fontSize={12} />
                <YAxis stroke="#3b5478" fontSize={12} allowDecimals={false} />
                <Tooltip contentStyle={{background:"#0a1426",border:"1px solid #1e3a5f",borderRadius:8,color:"#dbeafe",fontSize:12}} />
                <Legend wrapperStyle={{fontSize:11}} />
                <Bar dataKey="sinistra" name="Sinistra" fill="#2563eb" radius={[4,4,0,0]} />
                <Bar dataKey="destra"   name="Destra"   fill="#10b981" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Lista membri */}
      <div style={{background:"#080f1f",border:"1px solid #11203a",borderRadius:14,overflow:"hidden"}}>
        <div style={{padding:"1rem 1.4rem",borderBottom:"1px solid #11203a",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:10}}>
          <div style={{fontSize:13,fontWeight:800,color:"#eff6ff"}}>Membri</div>
          <div style={{display:"flex",gap:6}}>
            {["all","sinistra","destra","nessuna"].map(f=>(
              <button key={f} onClick={()=>setTeamFilter(f)} className="tabbtn"
                style={{background:teamFilter===f?"#0d1b33":"transparent",color:teamFilter===f?"#7dd3fc":"#5278a8",border:teamFilter===f?"1px solid #2563eb40":"1px solid transparent",fontSize:11,padding:"5px 12px"}}>
                {f==="all"?"Tutti":f==="nessuna"?"Non assegnati":f.charAt(0).toUpperCase()+f.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {downline.length===0
          ? <div style={{padding:"3rem",textAlign:"center",color:"#1e3a5f"}}>
              <div style={{fontSize:36,marginBottom:12}}>◈</div>
              <p style={{fontSize:14,marginBottom:8}}>Nessun membro ancora</p>
              <p style={{fontSize:12,color:"#2a4060"}}>Condividi il tuo link referral per aggiungere membri al team</p>
            </div>
          : <table style={{width:"100%",borderCollapse:"collapse"}}>
              <thead><tr style={{borderBottom:"1px solid #11203a"}}>
                {["Membro","Squadra","Prospect","Iscritti","Conv%","BV","Azione",""].map(h=>(
                  <th key={h} style={{textAlign:"left",color:"#3b5478",fontWeight:700,fontSize:10,textTransform:"uppercase",padding:"11px 16px",whiteSpace:"nowrap"}}>{h}</th>
                ))}
              </tr></thead>
              <tbody>{filteredMembers.map(m=>{
                const mP=getMemberProspects(m.id);
                const ms=teamStats(mP);
                const teamColor=m.team==="sinistra"?"#2563eb":m.team==="destra"?"#10b981":"#6b7280";
                return (
                  <tr key={m.id} className="hrow" style={{borderBottom:"1px solid #0d1b3355"}}>
                    <td style={{padding:"12px 16px"}}>
                      <div style={{display:"flex",alignItems:"center",gap:10}}>
                        <Av n={m.nome||m.email} c={m.cognome} color={teamColor} />
                        <div>
                          <div style={{color:"#eff6ff",fontWeight:700,fontSize:13}}>{m.nome||m.email}</div>
                          <div style={{color:"#3b5478",fontSize:11}}>{m.email}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{padding:"12px 16px"}}>
                      <select value={m.team||""} onChange={e=>onAssignTeam(m.id,e.target.value||null)}
                        style={{width:"auto",minWidth:110,fontSize:11,padding:"5px 9px",color:teamColor,border:"1px solid "+teamColor+"40",background:"#0a1426"}}>
                        <option value="">Non assegnato</option>
                        <option value="sinistra">Sinistra</option>
                        <option value="destra">Destra</option>
                      </select>
                    </td>
                    <td style={{padding:"12px 16px",fontWeight:700,color:"#eff6ff",fontSize:13}}>{ms.total}</td>
                    <td style={{padding:"12px 16px",fontWeight:700,color:"#10b981",fontSize:13}}>{ms.sub}</td>
                    <td style={{padding:"12px 16px",fontWeight:800,fontSize:13,color:convColor(ms.conv)}}>{ms.conv}%</td>
                    <td style={{padding:"12px 16px",fontWeight:800,fontSize:13,color:"#f59e0b"}}>{ms.bv}</td>
                    <td style={{padding:"12px 16px"}}>
                      <button onClick={()=>setSelectedMember(m)} style={{padding:"6px 12px",background:"#0d1b33",color:"#60a5fa",border:"1px solid #1e3a5f",borderRadius:7,cursor:"pointer",fontWeight:700,fontSize:11}}>
                        Dettaglio →
                      </button>
                    </td>
                    <td style={{padding:"12px 16px",color:"#1e3a5f",fontSize:16}}>›</td>
                  </tr>
                );
              })}</tbody>
            </table>
        }
      </div>
    </div>
  );
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
function Dash({ cd, cdSub, cdAct, cdFU, cdNI, cdConv, totSub, totConv, totAll, funnelCounts, funnelMax, urgenti, dashCiclo, setDashCiclo, onOpen }) {
  const cc = v => v>=20?"#10b981":v>=10?"#0ea5e9":"#f59e0b";
  const bvCiclo = cdSub.reduce((acc,p)=>acc+bvOfPacchetto(p.pacchetto),0);
  const kpis = [
    {label:"In percorso",value:cdAct.length,icon:"📊",color:"#2563eb",sub:cd.length+" totali nel ciclo",detail:"FUP1 → Closing"},
    {label:"Conv. ciclo",value:cdConv+"%",icon:"🎯",color:cc(cdConv),sub:cdSub.length+" iscritti / "+cd.length,detail:cdConv>=20?"Ottimo 🔥":cdConv>=10?"Nella media":"Da migliorare"},
    {label:"Iscritti ciclo",value:cdSub.length,icon:"✅",color:"#10b981",sub:"su "+cd.length+" conosciuti",detail:"questo ciclo"},
    {label:"BV ciclo",value:bvCiclo,icon:"🏆",color:"#f59e0b",sub:"da "+cdSub.length+" iscritti",detail:"Business Volume"},
  ];
  return (
    <div style={{padding:"2rem 2.2rem",maxWidth:1280,margin:"0 auto"}}>
      <div style={{display:"flex",alignItems:"flex-end",justifyContent:"space-between",marginBottom:"1.5rem",gap:12,flexWrap:"wrap"}}>
        <div>
          <div style={{fontSize:11,fontWeight:700,color:"#2563eb",textTransform:"uppercase",letterSpacing:1.4,marginBottom:4}}>Ciclo {dashCiclo}{dashCiclo===CICLO_CORRENTE?" · in corso":""}</div>
          <h1 style={{fontWeight:900,fontSize:26,color:"#eff6ff",letterSpacing:-0.8,lineHeight:1}}>Dashboard</h1>
          <p style={{color:"#3b5478",fontSize:12,marginTop:4}}>{cicloLabel(dashCiclo)}</p>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:6,background:"#080f1f",border:"1px solid #11203a",borderRadius:11,padding:"5px 10px"}}>
          <button onClick={()=>setDashCiclo(c=>Math.max(CICLO_NUMS[CICLO_NUMS.length-1],c-1))} style={{background:"none",border:"none",color:"#5278a8",fontSize:18,cursor:"pointer",padding:"2px 8px",fontWeight:700}}>‹</button>
          <select value={dashCiclo} onChange={e=>setDashCiclo(Number(e.target.value))} style={{background:"none",border:"none",color:"#bfdbfe",fontWeight:800,fontSize:12,padding:"2px 4px",width:"auto",cursor:"pointer"}}>
            {CICLO_NUMS.map(c=><option key={c} value={c}>Ciclo {c}</option>)}
          </select>
          <button onClick={()=>setDashCiclo(c=>Math.min(CICLO_NUMS[0],c+1))} style={{background:"none",border:"none",color:"#5278a8",fontSize:18,cursor:"pointer",padding:"2px 8px",fontWeight:700}}>›</button>
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:16}}>
        {kpis.map((k,i)=>(
          <div key={i} className="kpi" style={{background:"#080f1f",border:"1px solid #11203a",borderRadius:14,padding:"18px 20px",position:"relative",overflow:"hidden"}}>
            <div style={{position:"absolute",top:0,left:0,right:0,height:3,background:"linear-gradient(90deg,"+k.color+","+k.color+"44)",borderRadius:"14px 14px 0 0"}} />
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
              <span style={{fontSize:10,color:"#3b5478",fontWeight:700,textTransform:"uppercase",letterSpacing:.8}}>{k.label}</span>
              <span style={{fontSize:15,padding:7,borderRadius:9,background:k.color+"18"}}>{k.icon}</span>
            </div>
            <div style={{fontSize:34,fontWeight:900,color:k.color,lineHeight:1,letterSpacing:-1,textShadow:"0 0 24px "+k.color+"35"}}>{k.value}</div>
            <div style={{fontSize:11,color:"#3b5478",marginTop:6}}>{k.sub}</div>
            <div style={{fontSize:11,color:k.color+"99",marginTop:3,fontWeight:600}}>{k.detail}</div>
          </div>
        ))}
      </div>
      <div style={{display:"grid",gridTemplateColumns:(urgenti.length>0||cdFU.length>0)?"1.5fr 1fr":"1fr",gap:14}}>
        <div style={{background:"#080f1f",border:"1px solid #11203a",borderRadius:14,padding:"1.4rem"}}>
          <div style={{fontSize:10,fontWeight:700,color:"#3b5478",textTransform:"uppercase",letterSpacing:1.2,marginBottom:4}}>Funnel — Ciclo {dashCiclo}</div>
          <div style={{fontSize:11,color:"#1e3a5f",marginBottom:16}}>{cd.length} prospect conosciuti in questo ciclo</div>
          {cd.length===0
            ?<div style={{textAlign:"center",padding:"2rem",color:"#1e3a5f",fontSize:13}}>Nessun prospect in questo ciclo</div>
            :<div style={{display:"flex",flexDirection:"column",gap:12}}>
              {funnelCounts.map(({f,n})=>{
                const pct=Math.round(n/(cd.length||1)*100);
                const w=Math.round((n/funnelMax)*100)+"%";
                return (
                  <div key={f} style={{display:"flex",alignItems:"center",gap:11}}>
                    <span style={{display:"inline-flex",alignItems:"center",justifyContent:"center",borderRadius:6,padding:"3px 9px",fontSize:10,fontWeight:700,color:"#fff",background:FASE_CLR[f],minWidth:68,boxShadow:"0 0 10px "+FASE_CLR[f]+"35"}}>{FASE_LABEL[f]}</span>
                    <div style={{flex:1,height:9,background:"#0d1b33",borderRadius:99,overflow:"hidden"}}>
                      <div className="bar" style={{"--w":w,width:w,height:"100%",background:"linear-gradient(90deg,"+FASE_CLR[f]+"88,"+FASE_CLR[f]+")",boxShadow:"0 0 8px "+FASE_CLR[f]+"50"}} />
                    </div>
                    <span style={{fontWeight:800,color:"#eff6ff",minWidth:16,textAlign:"right",fontSize:13}}>{n}</span>
                    <span style={{color:"#3b5478",fontSize:11,minWidth:30,textAlign:"right"}}>{pct}%</span>
                  </div>
                );
              })}
            </div>
          }
          <div style={{display:"flex",gap:10,marginTop:16,paddingTop:14,borderTop:"1px dashed #11203a"}}>
            {[{f:"FOLLOW_UP",n:cdFU.length},{f:"NON_INT",n:cdNI.length}].map(({f,n})=>(
              <div key={f} style={{flex:1,background:FASE_CLR[f]+"12",border:"1px solid "+FASE_CLR[f]+"28",borderRadius:10,padding:"10px 12px",display:"flex",alignItems:"center",gap:8}}>
                <div style={{width:8,height:8,borderRadius:99,background:FASE_CLR[f],flexShrink:0}} />
                <div><div style={{fontWeight:900,fontSize:18,color:FASE_CLR[f]}}>{n}</div><div style={{fontSize:10,color:"#3b5478",marginTop:1}}>{FASE_LABEL[f]}</div></div>
              </div>
            ))}
          </div>
        </div>
        {(urgenti.length>0||cdFU.length>0)&&(
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            {cdFU.length>0&&(
              <div style={{background:"#080f1f",border:"1px solid #f59e0b28",borderRadius:14,padding:"1.2rem",flex:1}}>
                <div style={{fontSize:10,fontWeight:700,color:"#fbbf24",textTransform:"uppercase",letterSpacing:1.2,marginBottom:12}}>🔥 Da ricontattare</div>
                <div style={{display:"flex",flexDirection:"column",gap:7,maxHeight:170,overflowY:"auto"}}>
                  {cdFU.map(p=>(
                    <div key={p.id} className="hrow" onClick={()=>onOpen(p)} style={{display:"flex",alignItems:"center",justifyContent:"space-between",background:"#f59e0b09",border:"1px solid #f59e0b1e",borderRadius:9,padding:"8px 11px",cursor:"pointer"}}>
                      <div style={{display:"flex",alignItems:"center",gap:9}}>
                        <Av n={p.nome} c={p.cognome} color={FASE_CLR.FOLLOW_UP} />
                        <span style={{fontWeight:700,color:"#eff6ff",fontSize:12}}>{p.nome} {p.cognome}</span>
                      </div>
                      <span style={{fontSize:10,color:"#fbbf24"}}>{fmt(p.followUp)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {urgenti.length>0&&(
              <div style={{background:"#080f1f",border:"1px solid #ef444422",borderRadius:14,padding:"1.2rem",flex:1}}>
                <div style={{fontSize:10,fontWeight:700,color:"#f87171",textTransform:"uppercase",letterSpacing:1.2,marginBottom:12}}>🔔 Follow-up urgenti</div>
                <div style={{display:"flex",flexDirection:"column",gap:7,maxHeight:200,overflowY:"auto"}}>
                  {urgenti.map(p=>(
                    <div key={p.id} className="hrow" onClick={()=>onOpen(p)} style={{display:"flex",alignItems:"center",justifyContent:"space-between",background:"#ef44440b",border:"1px solid #ef44441e",borderRadius:9,padding:"8px 11px",cursor:"pointer"}}>
                      <div style={{display:"flex",alignItems:"center",gap:9}}>
                        <Av n={p.nome} c={p.cognome} color={FASE_CLR[p.fase]} />
                        <div>
                          <div style={{fontWeight:700,color:"#eff6ff",fontSize:12}}>{p.nome} {p.cognome}</div>
                          <div style={{fontSize:10,color:isOver(p.followUp)?"#f87171":"#fbbf24",marginTop:1,fontWeight:600}}>{isOver(p.followUp)?"⚠️ Scaduto":"📅 Oggi"}</div>
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

// ─── STATISTICHE ──────────────────────────────────────────────────────────────
function Statistiche({ data }) {
  const [linePhase, setLinePhase] = useState("FUP1");
  const [barCiclo,  setBarCiclo]  = useState("ALL");
  const cicliPresenti=[...new Set(data.flatMap(p=>(p.storico||[]).map(s=>cicloOfDate(s.data)).filter(Boolean)))].sort((a,b)=>a-b);
  const cicli=cicliPresenti.length?cicliPresenti:[CICLO_CORRENTE];
  const lineData=cicli.map(c=>{const row={ciclo:"C"+c};FASI_FUNNEL.forEach(f=>{row[f]=data.filter(p=>reachedInCiclo(p,f,c)).length;});return row;});
  const barData=FASI_FUNNEL.map(f=>{const count=barCiclo==="ALL"?data.filter(p=>reachedEver(p,f)).length:data.filter(p=>reachedInCiclo(p,f,Number(barCiclo))).length;return{fase:FASE_LABEL[f],key:f,count,fill:FASE_CLR[f]};});
  const tableRows=[...cicli].sort((a,b)=>b-a).map(c=>{const r={c};FASI_FUNNEL.forEach(f=>{r[f]=data.filter(p=>reachedInCiclo(p,f,c)).length;});r.conv=r.INVITO>0?Math.round(r.SUB/r.INVITO*100):r.FUP1>0?Math.round(r.SUB/r.FUP1*100):0;return r;});
  const ts={background:"#0a1426",border:"1px solid #1e3a5f",borderRadius:8,color:"#dbeafe",fontSize:12};
  if (!data.length) return <div style={{padding:"2rem 2.2rem"}}><h1 style={{fontWeight:900,fontSize:26,color:"#eff6ff",marginBottom:8}}>Statistiche</h1><div style={{textAlign:"center",padding:"5rem",color:"#1e3a5f"}}><div style={{fontSize:44,marginBottom:12}}>◪</div><p>Aggiungi prospect per vedere le statistiche</p></div></div>;
  return (
    <div style={{padding:"2rem 2.2rem",maxWidth:1280,margin:"0 auto"}}>
      <h1 style={{fontWeight:900,fontSize:26,color:"#eff6ff",letterSpacing:-0.8}}>Statistiche</h1>
      <p style={{color:"#3b5478",fontSize:12,marginTop:4,marginBottom:24}}>Andamento e conversione del percorso, ciclo per ciclo</p>
      <div style={{background:"#080f1f",border:"1px solid #11203a",borderRadius:14,padding:"1.4rem",marginBottom:16}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:10}}>
          <div><div style={{fontSize:13,fontWeight:800,color:"#eff6ff"}}>📈 Andamento nei cicli</div><div style={{fontSize:11,color:"#3b5478",marginTop:2}}>Quanti ne fai per ciclo</div></div>
          <select value={linePhase} onChange={e=>setLinePhase(e.target.value)} style={{width:"auto",minWidth:160}}><option value="ALL">Tutte le fasi</option>{FASI_FUNNEL.map(f=><option key={f} value={f}>{FASE_LABEL[f]}</option>)}</select>
        </div>
        <div style={{height:300}}><ResponsiveContainer width="100%" height="100%"><LineChart data={lineData} margin={{top:5,right:10,left:-15,bottom:5}}><CartesianGrid strokeDasharray="3 3" stroke="#11203a"/><XAxis dataKey="ciclo" stroke="#3b5478" fontSize={12}/><YAxis stroke="#3b5478" fontSize={12} allowDecimals={false}/><Tooltip contentStyle={ts} cursor={{stroke:"#1e3a5f"}}/>{linePhase==="ALL"?FASI_FUNNEL.map(f=><Line key={f} type="monotone" dataKey={f} name={FASE_LABEL[f]} stroke={FASE_CLR[f]} strokeWidth={2} dot={{r:3}}/>):<Line type="monotone" dataKey={linePhase} name={FASE_LABEL[linePhase]} stroke={FASE_CLR[linePhase]} strokeWidth={3} dot={{r:4}} activeDot={{r:6}}/>}{linePhase==="ALL"&&<Legend wrapperStyle={{fontSize:11}}/>}</LineChart></ResponsiveContainer></div>
      </div>
      <div style={{background:"#080f1f",border:"1px solid #11203a",borderRadius:14,padding:"1.4rem",marginBottom:16}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:10}}>
          <div><div style={{fontSize:13,fontWeight:800,color:"#eff6ff"}}>📊 Conversione del percorso</div></div>
          <select value={barCiclo} onChange={e=>setBarCiclo(e.target.value)} style={{width:"auto",minWidth:160}}><option value="ALL">Tutti i cicli</option>{[...cicli].sort((a,b)=>b-a).map(c=><option key={c} value={c}>Ciclo {c}</option>)}</select>
        </div>
        <div style={{height:300}}><ResponsiveContainer width="100%" height="100%"><BarChart data={barData} margin={{top:5,right:10,left:-15,bottom:5}}><CartesianGrid strokeDasharray="3 3" stroke="#11203a" vertical={false}/><XAxis dataKey="fase" stroke="#3b5478" fontSize={12}/><YAxis stroke="#3b5478" fontSize={12} allowDecimals={false}/><Tooltip contentStyle={ts} cursor={{fill:"#0d1b3360"}}/><Bar dataKey="count" name="Raggiunti" radius={[6,6,0,0]}>{barData.map((e,i)=><Cell key={i} fill={e.fill}/>)}</Bar></BarChart></ResponsiveContainer></div>
        <div style={{display:"flex",gap:8,marginTop:14,flexWrap:"wrap"}}>{barData.slice(0,-1).map((b,i)=>{const next=barData[i+1];const rate=b.count>0?Math.round(next.count/b.count*100):0;return(<div key={i} style={{flex:"1 1 120px",background:"#0a1426",border:"1px solid #11203a",borderRadius:9,padding:"9px 11px"}}><div style={{fontSize:10,color:"#3b5478",fontWeight:600}}>{b.fase} → {next.fase}</div><div style={{fontSize:18,fontWeight:900,color:next.fill,marginTop:2}}>{rate}%</div></div>);})}</div>
      </div>
      <div style={{background:"#080f1f",border:"1px solid #11203a",borderRadius:14,overflow:"hidden"}}>
        <div style={{padding:"1.1rem 1.4rem",borderBottom:"1px solid #11203a"}}><div style={{fontSize:13,fontWeight:800,color:"#eff6ff"}}>📋 Cicli a confronto</div></div>
        <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",minWidth:600}}><thead><tr style={{borderBottom:"1px solid #11203a"}}><th style={{textAlign:"left",color:"#3b5478",fontWeight:700,fontSize:10,textTransform:"uppercase",padding:"11px 16px"}}>Ciclo</th>{FASI_FUNNEL.map(f=><th key={f} style={{textAlign:"center",color:FASE_CLR[f],fontWeight:700,fontSize:10,textTransform:"uppercase",padding:"11px 10px"}}>{FASE_LABEL[f]}</th>)}<th style={{textAlign:"center",color:"#3b5478",fontWeight:700,fontSize:10,textTransform:"uppercase",padding:"11px 16px"}}>Conv%</th></tr></thead><tbody>{tableRows.map(r=>(<tr key={r.c} className="hrow" style={{borderBottom:"1px solid #0d1b3355"}}><td style={{padding:"11px 16px"}}><span style={{background:r.c===CICLO_CORRENTE?"#2563eb22":"#11203a",color:r.c===CICLO_CORRENTE?"#60a5fa":"#5278a8",borderRadius:6,padding:"3px 9px",fontSize:11,fontWeight:700}}>C{r.c}</span></td>{FASI_FUNNEL.map(f=><td key={f} style={{textAlign:"center",padding:"11px 10px",fontWeight:700,fontSize:13,color:r[f]>0?"#eff6ff":"#2a4060"}}>{r[f]}</td>)}<td style={{textAlign:"center",padding:"11px 16px",fontWeight:800,fontSize:13,color:r.conv>=20?"#10b981":r.conv>=10?"#0ea5e9":"#f59e0b"}}>{r.conv}%</td></tr>))}</tbody></table></div>
      </div>
    </div>
  );
}

// ─── LISTA ────────────────────────────────────────────────────────────────────
function Lista({ prospects, total, search, setSearch, fFase, setFFase, fFonte, setFFonte, fCiclo, setFCiclo, onOpen, onAdd }) {
  return (
    <div style={{padding:"2rem 2.2rem",maxWidth:1280,margin:"0 auto"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"1.4rem"}}>
        <div><h1 style={{fontWeight:900,fontSize:26,color:"#eff6ff",letterSpacing:-0.8}}>Prospect</h1><p style={{color:"#3b5478",fontSize:12,marginTop:3}}>{prospects.length} di {total} visualizzati</p></div>
        <button onClick={onAdd} style={{padding:"9px 18px",fontSize:13,fontWeight:800,background:"linear-gradient(135deg,#2563eb,#0ea5e9)",color:"#fff",border:"none",borderRadius:10,cursor:"pointer"}}>+ Aggiungi</button>
      </div>
      <div style={{display:"flex",gap:10,marginBottom:14,flexWrap:"wrap"}}>
        <input placeholder="🔍 Cerca..." value={search} onChange={e=>setSearch(e.target.value)} style={{flex:2,minWidth:200}} />
        <select value={fFase} onChange={e=>setFFase(e.target.value)} style={{flex:1,minWidth:130}}>
          <option value="">Tutte le fasi</option>
          <optgroup label="Funnel">{FASI_FUNNEL.map(f=><option key={f} value={f}>{FASE_LABEL[f]}</option>)}</optgroup>
          <optgroup label="Speciali">{FASI_SPECIALI.map(f=><option key={f} value={f}>{FASE_LABEL[f]}</option>)}</optgroup>
        </select>
        <select value={fFonte} onChange={e=>setFFonte(e.target.value)} style={{flex:1,minWidth:120}}><option value="">Tutte le fonti</option>{FONTI.map(f=><option key={f}>{f}</option>)}</select>
        <select value={fCiclo} onChange={e=>setFCiclo(e.target.value)} style={{flex:1,minWidth:140}}><option value="">Tutti i cicli</option>{CICLO_NUMS.map(c=><option key={c} value={c}>Ciclo {c}</option>)}</select>
      </div>
      {prospects.length===0
        ?<div style={{textAlign:"center",padding:"4rem",color:"#1e3a5f"}}><div style={{fontSize:44,marginBottom:12}}>◆</div><p style={{fontSize:14,marginBottom:14}}>Nessun prospect trovato</p><button onClick={onAdd} style={{padding:"9px 20px",fontSize:13,fontWeight:800,background:"linear-gradient(135deg,#2563eb,#0ea5e9)",color:"#fff",border:"none",borderRadius:10,cursor:"pointer"}}>Aggiungi il primo</button></div>
        :<div style={{background:"#080f1f",border:"1px solid #11203a",borderRadius:14,overflow:"hidden"}}>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead><tr style={{borderBottom:"1px solid #11203a"}}>{["Prospect","Ciclo","Conosciuto","Fonte","Fase","Profilo","Pers.",""].map(h=>(<th key={h} style={{textAlign:"left",color:"#3b5478",fontWeight:700,fontSize:10,textTransform:"uppercase",letterSpacing:.8,padding:"12px 16px",whiteSpace:"nowrap"}}>{h}</th>))}</tr></thead>
            <tbody>{prospects.map(p=>{
              const c=cicloOfDate(p.conosciutoAt);
              const badge=profiloBadge(p);
              const bc=badge.compilati===0?"#2a4060":badge.positivi>=6?"#10b981":badge.positivi>=3?"#0ea5e9":"#f59e0b";
              const jung=p.profilazione?.jung?JUNG.find(j=>j.key===p.profilazione.jung):null;
              return (
                <tr key={p.id} className="hrow" onClick={()=>onOpen(p)} style={{cursor:"pointer",borderBottom:"1px solid #0d1b3355"}}>
                  <td style={{padding:"12px 16px"}}><div style={{display:"flex",alignItems:"center",gap:10}}><Av n={p.nome} c={p.cognome} color={FASE_CLR[p.fase]}/><span style={{color:"#eff6ff",fontWeight:700,fontSize:13}}>{p.nome} {p.cognome}</span></div></td>
                  <td style={{padding:"12px 16px"}}>{c?<span style={{background:c===CICLO_CORRENTE?"#2563eb22":"#11203a",color:c===CICLO_CORRENTE?"#60a5fa":"#3b5478",borderRadius:6,padding:"2px 8px",fontSize:11,fontWeight:700}}>C{c}</span>:<span style={{color:"#2a4060"}}>\u2014</span>}</td>
                  <td style={{padding:"12px 16px",color:"#5278a8",fontSize:12}}>{fmt(p.conosciutoAt)}</td>
                  <td style={{padding:"12px 16px",color:"#5278a8",fontSize:12}}>{FONTE_ICO[p.fonte]} {p.fonte}</td>
                  <td style={{padding:"12px 16px"}}><span style={{display:"inline-flex",alignItems:"center",borderRadius:6,padding:"3px 9px",fontSize:11,fontWeight:700,color:"#fff",background:FASE_CLR[p.fase],boxShadow:"0 0 8px "+FASE_CLR[p.fase]+"35"}}>{FASE_LABEL[p.fase]}</span></td>
                  <td style={{padding:"12px 16px"}}>{badge.compilati===0?<span style={{color:"#2a4060",fontSize:11}}>\u2014</span>:<span style={{display:"inline-flex",alignItems:"center",gap:4,borderRadius:6,padding:"3px 9px",fontSize:11,fontWeight:800,color:bc,background:bc+"18",border:"1px solid "+bc+"30"}}>🎯 {badge.positivi}/{PROFILO_TOTAL}</span>}</td>
                  <td style={{padding:"12px 16px"}}>{jung?<span title={jung.sub} style={{display:"inline-flex",alignItems:"center",gap:6,borderRadius:6,padding:"3px 9px",fontSize:11,fontWeight:800,color:jung.border,background:jung.border+"18",border:"1px solid "+jung.border+"35"}}><span style={{width:8,height:8,borderRadius:"50%",background:jung.border,flexShrink:0,boxShadow:"0 0 6px "+jung.border}}/>{jung.label}</span>:<span style={{color:"#2a4060",fontSize:11}}>\u2014</span>}</td>
                  <td style={{padding:"12px 16px",color:"#1e3a5f",fontSize:16}}>›</td>
                </tr>
              );
            })}</tbody>
          </table>
        </div>
      }
    </div>
  );
}

// ─── FORM MODAL ───────────────────────────────────────────────────────────────
function FormModal({ form, setForm, onSave, onClose, onDelete, isEdit }) {
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));
  const lbl={fontSize:11,fontWeight:700,color:"#3b5478",textTransform:"uppercase",letterSpacing:.8,marginBottom:5,display:"block"};
  const dataBase=form.conosciutoAt||today();
  const cicloCalc=cicloOfDate(dataBase)||CICLO_CORRENTE;
  const onCicloChange=cNum=>{const r=CICLI.find(x=>x[0]===cNum);if(r)set("conosciutoAt",r[1]);};
  return (
    <div style={{background:"#080f1f",border:"1px solid #1e3a5f",borderRadius:16,padding:"1.6rem",maxHeight:"90vh",overflowY:"auto",boxShadow:"0 20px 70px #000000aa"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
        <h2 style={{fontWeight:900,fontSize:17,color:"#eff6ff"}}>{isEdit?"✏️ Modifica":"+ Nuovo Prospect"}</h2>
        <button onClick={onClose} style={{background:"#0d1b33",color:"#7da8d8",border:"1px solid #1e3a5f",borderRadius:8,cursor:"pointer",padding:"4px 10px",fontSize:14}}>✕</button>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
        <div><label style={lbl}>Nome *</label><input value={form.nome||""} onChange={e=>set("nome",e.target.value)} placeholder="Nome" /></div>
        <div><label style={lbl}>Cognome</label><input value={form.cognome||""} onChange={e=>set("cognome",e.target.value)} placeholder="Cognome" /></div>
        <div style={{gridColumn:"1/-1"}}><label style={lbl}>Citta</label><input value={form.citta||""} onChange={e=>set("citta",e.target.value)} placeholder="es. Milano" /></div>
        <div><label style={lbl}>Fonte</label><select value={form.fonte||"Instagram"} onChange={e=>set("fonte",e.target.value)}>{FONTI.map(f=><option key={f} value={f}>{FONTE_ICO[f]} {f}</option>)}</select></div>
        <div><label style={lbl}>Fase</label><select value={form.fase||"INVITO"} onChange={e=>set("fase",e.target.value)}><optgroup label="Funnel">{FASI_FUNNEL.map(f=><option key={f} value={f}>{FASE_LABEL[f]}</option>)}</optgroup><optgroup label="Speciali">{FASI_SPECIALI.map(f=><option key={f} value={f}>{FASE_LABEL[f]}</option>)}</optgroup></select></div>
        <div style={{gridColumn:"1/-1"}}><label style={lbl}>Data conoscenza</label><input type="date" value={form.conosciutoAt||today()} onChange={e=>set("conosciutoAt",e.target.value)} /></div>
        <div style={{gridColumn:"1/-1"}}><label style={lbl}>Ciclo</label><select value={cicloCalc} onChange={e=>onCicloChange(Number(e.target.value))}>{CICLO_NUMS.map(c=><option key={c} value={c}>Ciclo {c} — {cicloLabel(c)}</option>)}</select></div>
        <div style={{gridColumn:"1/-1"}}><label style={lbl}>Prossimo Follow-up</label><input type="date" value={form.followUp||""} onChange={e=>set("followUp",e.target.value)} /></div>
        {form.fase==="SUB" && (
          <div style={{gridColumn:"1/-1"}}>
            <label style={lbl}>Pacchetto</label>
            <select value={form.pacchetto||""} onChange={e=>set("pacchetto",e.target.value)}>
              <option value="">Seleziona pacchetto...</option>
              {PACCHETTI.map(p=><option key={p.key} value={p.key}>{p.label} — {p.bv} BV</option>)}
            </select>
            {form.pacchetto && (
              <div style={{marginTop:8,background:"#10b98115",border:"1px solid #10b98130",borderRadius:9,padding:"8px 12px",fontSize:12,color:"#10b981",fontWeight:700}}>
                🏆 {bvOfPacchetto(form.pacchetto)} BV prodotti
              </div>
            )}
          </div>
        )}
      </div>
      <div style={{marginBottom:18}}><label style={lbl}>Note</label><textarea value={form.note||""} onChange={e=>set("note",e.target.value)} style={{height:76,resize:"vertical"}} placeholder="Dove l'ho conosciuto, contesto..." /></div>
      <div style={{display:"flex",gap:9,justifyContent:"flex-end",flexWrap:"wrap"}}>
        {onDelete&&<button onClick={onDelete} style={{padding:"9px 15px",background:"#ef444415",color:"#f87171",border:"1px solid #ef444438",borderRadius:9,cursor:"pointer",fontWeight:700,fontSize:13}}>Elimina</button>}
        <button onClick={onClose} style={{padding:"9px 15px",background:"#0d1b33",color:"#7da8d8",border:"1px solid #1e3a5f",borderRadius:9,cursor:"pointer",fontWeight:600,fontSize:13}}>Annulla</button>
        <button onClick={onSave} style={{padding:"9px 20px",background:"linear-gradient(135deg,#2563eb,#0ea5e9)",color:"#fff",border:"none",borderRadius:9,cursor:"pointer",fontWeight:800,fontSize:13}}>{isEdit?"Aggiorna":"Aggiungi"}</button>
      </div>
    </div>
  );
}

// ─── PROFILAZIONE ─────────────────────────────────────────────────────────────
function ProfilazioneTab({ p, onUpdateProfilo }) {
  const pr=p.profilazione||{pleasures:{},forza:{}};
  function toggle(section,key){const current=pr[section]?.[key]??null;const next=nextToggle(current);onUpdateProfilo({pleasures:{...pr.pleasures},forza:{...pr.forza},[section]:{...(pr[section]||{}),[key]:next}});}
  function selectJung(key){onUpdateProfilo({pleasures:{...pr.pleasures},forza:{...pr.forza},jung:pr.jung===key?null:key});}
  function ToggleGroup({title,fields,section,icon}){
    return(
      <div style={{marginBottom:18}}>
        <div style={{fontSize:10,fontWeight:800,color:"#3b5478",textTransform:"uppercase",letterSpacing:1.2,marginBottom:10,display:"flex",alignItems:"center",gap:6}}><span>{icon}</span>{title}</div>
        <div style={{display:"flex",flexDirection:"column",gap:7}}>
          {fields.map(f=>{
            const val=pr[section]?.[f.key]??null;const clr=TC[val]||TC.null;
            return(
              <div key={f.key} style={{display:"flex",alignItems:"center",justifyContent:"space-between",background:"#0a1426",borderRadius:9,padding:"9px 12px",border:"1px solid "+(val!=null?clr+"40":"#11203a")}}>
                <span style={{fontSize:12,color:val!=null?"#eff6ff":"#5278a8",fontWeight:val!=null?600:400}}>{f.label}</span>
                <div style={{display:"flex",gap:5}}>
                  {TV.filter(v=>v!==null).map(v=>{const active=val===v;const vc=TC[v];return(<button key={v} className="togbtn" onClick={()=>{const next=active?null:v;onUpdateProfilo({pleasures:{...pr.pleasures},forza:{...pr.forza},[section]:{...(pr[section]||{}),[key]:next}});}} style={{background:active?vc+"33":"#0d1b33",color:active?vc:"#3b5478",border:"1.5px solid "+(active?vc:"#1e3a5f"),boxShadow:active?"0 0 8px "+vc+"40":"none"}} title={v==="-"?"No":v==="."?"Forse":"Si"}>{TL[v]}</button>);})}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
  const badge=profiloBadge(p);const pct=Math.round(badge.positivi/PROFILO_TOTAL*100);const bc=pct>=60?"#10b981":pct>=30?"#0ea5e9":"#f59e0b";
  const sj=pr.jung||null;const jd=JUNG.find(j=>j.key===sj);
  return(
    <div>
      <div style={{background:"#0a1426",borderRadius:10,padding:"12px 14px",marginBottom:16,border:"1px solid #11203a"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}><span style={{fontSize:11,fontWeight:700,color:"#3b5478",textTransform:"uppercase",letterSpacing:.8}}>Score profilazione</span><span style={{fontWeight:900,fontSize:16,color:bc}}>🎯 {badge.positivi}/{PROFILO_TOTAL}</span></div>
        <div style={{height:6,background:"#0d1b33",borderRadius:99,overflow:"hidden"}}><div style={{height:"100%",width:pct+"%",background:"linear-gradient(90deg,"+bc+"88,"+bc+")",borderRadius:99,transition:"width .4s ease",boxShadow:"0 0 8px "+bc+"50"}}/></div>
        <div style={{display:"flex",justifyContent:"space-between",marginTop:5}}><span style={{fontSize:10,color:"#3b5478"}}>{badge.compilati}/{PROFILO_TOTAL} compilati</span><span style={{fontSize:10,color:bc,fontWeight:700}}>{pct}% positivi</span></div>
      </div>
      <ToggleGroup title="Pleasures — Cosa lo motiva" icon="✨" fields={PLEASURES} section="pleasures"/>
      <ToggleGroup title="Punti di Forza — Cosa ha gia" icon="💪" fields={FORZA} section="forza"/>
      <div style={{marginBottom:4}}>
        <div style={{fontSize:10,fontWeight:800,color:"#3b5478",textTransform:"uppercase",letterSpacing:1.2,marginBottom:10,display:"flex",alignItems:"center",gap:6}}><span>🎨</span>Personalita — Colori Jung</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9,marginBottom:10}}>
          {JUNG.map(j=>{const active=sj===j.key;return(<button key={j.key} onClick={()=>selectJung(j.key)} style={{background:active?j.bg:"#0a1426",border:"2px solid "+(active?j.border:"#1e3a5f"),borderRadius:12,padding:"14px 14px 12px",cursor:"pointer",textAlign:"left",transition:"all .2s",boxShadow:active?"0 0 18px "+j.glow:"none",position:"relative",overflow:"hidden"}}>{active&&<div style={{position:"absolute",top:8,right:10,width:18,height:18,borderRadius:"50%",background:"#ffffff33",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:900,color:"#fff"}}>✓</div>}<div style={{fontWeight:900,fontSize:14,color:active?"#fff":j.border,marginBottom:3}}>{j.label}</div><div style={{fontSize:10,fontWeight:700,color:active?"rgba(255,255,255,.85)":"#5278a8",marginBottom:5}}>{j.sub}</div><div style={{fontSize:10,color:active?"rgba(255,255,255,.65)":"#3b5478",lineHeight:1.45}}>{j.desc}</div></button>);})}
        </div>
        {jd&&<div style={{background:jd.border+"15",border:"1px solid "+jd.border+"35",borderRadius:10,padding:"10px 13px",display:"flex",alignItems:"center",gap:10}}><div style={{width:10,height:10,borderRadius:"50%",background:jd.border,flexShrink:0,boxShadow:"0 0 8px "+jd.border}}/><div><span style={{fontSize:11,fontWeight:800,color:jd.border}}>{jd.label}</span><span style={{fontSize:11,color:"#5278a8",marginLeft:6}}>· {jd.sub}</span></div></div>}
        {!sj&&<div style={{background:"#0a1426",borderRadius:9,padding:"9px 12px",border:"1px dashed #1e3a5f",textAlign:"center"}}><span style={{fontSize:11,color:"#2a4060"}}>Nessun colore selezionato</span></div>}
      </div>
      <div style={{background:"#0a1426",borderRadius:9,padding:"10px 12px",border:"1px solid #11203a",marginTop:12}}><div style={{fontSize:10,color:"#2a4060",fontStyle:"italic",lineHeight:1.5}}>Le persone non comprano il prodotto, ma la trasformazione</div></div>
    </div>
  );
}

// ─── DETAIL MODAL ─────────────────────────────────────────────────────────────
function DetailModal({ p, onEdit, onAdvance, onFollowUp, onNonInt, onRiattiva, onClose, onUpdateProfilo }) {
  const [activeTab,setActiveTab]=useState("dettagli");
  const clr=FASE_CLR[p.fase];const ci=FASI_FUNNEL.indexOf(p.fase);const isSpeciale=FASI_SPECIALI.includes(p.fase);
  const od=isOver(p.followUp);const dt=isToday(p.followUp);const ciclo=cicloOfDate(p.conosciutoAt);
  const lbl={fontSize:10,fontWeight:700,color:"#3b5478",textTransform:"uppercase",letterSpacing:.8,marginBottom:4};
  const box={background:"#0a1426",borderRadius:10,padding:"11px 13px",border:"1px solid #11203a"};
  const storico=[...(p.storico||[])].sort((a,b)=>FASI_FUNNEL.indexOf(a.fase)-FASI_FUNNEL.indexOf(b.fase));
  const badge=profiloBadge(p);
  return(
    <div style={{background:"#080f1f",border:"1px solid #1e3a5f",borderRadius:16,padding:"1.6rem",maxHeight:"90vh",overflowY:"auto",boxShadow:"0 20px 70px #000000aa"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16}}>
        <div style={{display:"flex",alignItems:"center",gap:13}}>
          <Av n={p.nome} c={p.cognome} color={clr} size={50}/>
          <div>
            <h2 style={{fontWeight:900,fontSize:19,color:"#eff6ff",letterSpacing:-0.5}}>{p.nome} {p.cognome}</h2>
            <div style={{color:"#5278a8",fontSize:12,marginTop:2}}>{p.citta||"\u2014"} · {FONTE_ICO[p.fonte]} {p.fonte}</div>
            <div style={{display:"flex",gap:6,marginTop:7,flexWrap:"wrap"}}>
              <span style={{display:"inline-flex",alignItems:"center",borderRadius:6,padding:"2px 9px",fontSize:11,fontWeight:700,color:"#fff",background:clr,boxShadow:"0 0 10px "+clr+"45"}}>{FASE_LABEL[p.fase]}</span>
              {ciclo&&<span style={{display:"inline-flex",alignItems:"center",borderRadius:6,padding:"2px 9px",fontSize:11,fontWeight:700,color:"#fff",background:ciclo===CICLO_CORRENTE?"#2563eb":"#1e3a5f"}}>Ciclo {ciclo}</span>}
              {badge.compilati>0&&<span style={{display:"inline-flex",alignItems:"center",borderRadius:6,padding:"2px 9px",fontSize:11,fontWeight:700,color:"#10b981",background:"#10b98118",border:"1px solid #10b98130"}}>🎯 {badge.positivi}/{PROFILO_TOTAL}</span>}
            </div>
          </div>
        </div>
        <button onClick={onClose} style={{background:"#0d1b33",color:"#7da8d8",border:"1px solid #1e3a5f",borderRadius:8,cursor:"pointer",padding:"4px 10px",fontSize:14}}>✕</button>
      </div>
      <div style={{display:"flex",gap:6,marginBottom:16,background:"#0a1426",padding:4,borderRadius:10,border:"1px solid #11203a"}}>
        {[{id:"dettagli",label:"📋 Dettagli"},{id:"profilazione",label:"🎯 Profilazione"}].map(t=>(
          <button key={t.id} className="tabbtn" onClick={()=>setActiveTab(t.id)} style={{flex:1,background:activeTab===t.id?"#0d1b33":"transparent",color:activeTab===t.id?"#7dd3fc":"#5278a8",boxShadow:activeTab===t.id?"inset 0 0 0 1px #2563eb40":"none"}}>{t.label}</button>
        ))}
      </div>
      {activeTab==="dettagli"&&(
        <>
          {!isSpeciale&&(
            <div style={{display:"flex",alignItems:"center",marginBottom:20,overflowX:"auto",paddingBottom:4}}>
              {FASI_FUNNEL.map((f,i)=>(
                <div key={f} style={{display:"flex",alignItems:"center",flex:i<FASI_FUNNEL.length-1?1:"none"}}>
                  <div style={{width:38,height:38,borderRadius:"50%",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",background:i<=ci?FASE_CLR[f]:"#0d1b33",border:"2px solid "+(i===ci?FASE_CLR[f]:i<ci?FASE_CLR[f]+"66":"#1e3a5f"),color:i<=ci?"#fff":"#3b5478",fontSize:7.5,fontWeight:900,boxShadow:i===ci?"0 0 18px "+FASE_CLR[f]+"66":"none",transition:"all .3s"}}>{FASE_LABEL[f]}</div>
                  {i<FASI_FUNNEL.length-1&&<div style={{flex:1,height:3,background:i<ci?FASE_CLR[FASI_FUNNEL[i+1]]+"66":"#0d1b33",margin:"0 3px",minWidth:4,borderRadius:99}}/>}
                </div>
              ))}
            </div>
          )}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9,marginBottom:9}}>
            {[{l:"Fase ora",v:FASE_LABEL[p.fase],color:clr},{l:"Ciclo conoscenza",v:ciclo?"Ciclo "+ciclo:"\u2014",color:ciclo===CICLO_CORRENTE?"#2563eb":undefined},{l:"Conosciuto il",v:fmt(p.conosciutoAt)},{l:"Follow-up",v:p.followUp?(od?"⚠️ Scaduto · ":dt?"📅 Oggi · ":"✅ ")+fmt(p.followUp):"Non impostato",color:od?"#f87171":dt?"#fbbf24":undefined}].map(({l,v,color:col})=>(<div key={l} style={box}><div style={lbl}>{l}</div><div style={{color:col||"#eff6ff",fontWeight:700,fontSize:13}}>{v}</div></div>))}
            {p.fase==="SUB"&&(
              <div style={{...box,gridColumn:"1/-1",background:"#10b98112",border:"1px solid #10b98130"}}>
                <div style={lbl}>Pacchetto</div>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                  <span style={{color:"#10b981",fontWeight:800,fontSize:13}}>{p.pacchetto?PACCHETTI.find(x=>x.key===p.pacchetto)?.label||"\u2014":"Non impostato"}</span>
                  {p.pacchetto&&<span style={{fontWeight:900,fontSize:16,color:"#10b981"}}>🏆 {bvOfPacchetto(p.pacchetto)} BV</span>}
                </div>
              </div>
            )}
          </div>
          {storico.length>0&&(<div style={{...box,marginBottom:9}}><div style={lbl}>🛤️ Storico percorso</div><div style={{display:"flex",flexDirection:"column",gap:6,marginTop:8}}>{storico.map((s,i)=>(<div key={i} style={{display:"flex",alignItems:"center",gap:9}}><span style={{width:8,height:8,borderRadius:99,background:FASE_CLR[s.fase],flexShrink:0,boxShadow:"0 0 6px "+FASE_CLR[s.fase]+"70"}}/><span style={{fontSize:12.5,fontWeight:700,color:"#eff6ff",minWidth:64}}>{FASE_LABEL[s.fase]}</span><span style={{fontSize:11,color:"#5278a8"}}>{fmt(s.data)}</span><span style={{fontSize:10,color:"#3b5478",marginLeft:"auto"}}>Ciclo {cicloOfDate(s.data)||"\u2014"}</span></div>))}</div></div>)}
          {p.note&&<div style={{...box,marginBottom:9}}><div style={lbl}>📝 Note</div><p style={{color:"#94b5d8",lineHeight:1.6,fontSize:13,marginTop:4}}>{p.note}</p></div>}
          <div style={{display:"flex",gap:9,marginTop:16,flexWrap:"wrap"}}>
            {!isSpeciale&&ci<FASI_FUNNEL.length-1&&<button onClick={onAdvance} style={{padding:"9px 16px",background:"linear-gradient(135deg,"+FASE_CLR[FASI_FUNNEL[ci+1]]+","+FASE_CLR[FASI_FUNNEL[ci+1]]+"bb)",color:"#fff",border:"none",borderRadius:9,cursor:"pointer",fontWeight:800,fontSize:12}}>Avanza → {FASE_LABEL[FASI_FUNNEL[ci+1]]}</button>}
            {isSpeciale&&<button onClick={onRiattiva} style={{padding:"9px 16px",background:"linear-gradient(135deg,#2563eb,#0ea5e9)",color:"#fff",border:"none",borderRadius:9,cursor:"pointer",fontWeight:800,fontSize:12}}>↩ Riattiva nel Funnel</button>}
            <button onClick={onEdit} style={{padding:"9px 16px",background:"#0d1b33",color:"#7da8d8",border:"1px solid #1e3a5f",borderRadius:9,cursor:"pointer",fontWeight:600,fontSize:12}}>✏️ Modifica</button>
          </div>
          {!isSpeciale&&(<div style={{borderTop:"1px solid #0d1b33",marginTop:13,paddingTop:13,display:"flex",gap:9,flexWrap:"wrap"}}><div style={{fontSize:10,color:"#2a4060",width:"100%",fontWeight:700,textTransform:"uppercase",letterSpacing:.8,marginBottom:2}}>Stato speciale</div>{p.fase!=="FOLLOW_UP"&&<button onClick={onFollowUp} style={{padding:"8px 13px",background:"#f59e0b16",color:"#fbbf24",border:"1px solid #f59e0b38",borderRadius:9,cursor:"pointer",fontWeight:700,fontSize:12}}>🔥 Follow Up caldo</button>}{p.fase!=="NON_INT"&&<button onClick={onNonInt} style={{padding:"8px 13px",background:"#ef444414",color:"#f87171",border:"1px solid #ef444436",borderRadius:9,cursor:"pointer",fontWeight:700,fontSize:12}}>❌ Non interessato</button>}</div>)}
        </>
      )}
      {activeTab==="profilazione"&&<ProfilazioneTab p={p} onUpdateProfilo={onUpdateProfilo}/>}
    </div>
  );
}
