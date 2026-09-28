import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell, PieChart, Pie } from "recharts";
import { TeamView } from "./components/Team";
import { ProfiloView } from "./components/Profilo";
import { ListaNomiView } from "./components/ListaNomi";
import { EventiView } from "./components/Eventi";
import { computeMentoreInsights, ConsigliCard, MentoreChatWidget } from "./components/Mentore";
import { ClienteView } from "./components/Cliente";
import { Dash } from "./components/Dash";
import { Lista } from "./components/Lista";
import { registraRinnovo, rinnovaSessione, eTokenScaduto, eErroreRete } from "./sessione";
import {
  isAttivo, PACCHETTI, bvOfPacchetto,
  FASI_FUNNEL, FASI_DASH, FASI_SPECIALI, FASI, FONTI, FONTE_ICO, INTERESSE, INTERESSE_CLR,
  isProspectAttivo, FASE_CLR, FASE_LABEL, PLEASURES, FORZA, PROFILO_TOTAL,
  TV, TC, TL, nextToggle, profiloBadge, JUNG,
  CICLI, CICLO_CORRENTE, CICLO_NUMS, cicloOfDate, cicloLabel, dataByCiclo,
  buildStorico, fillGapsStorico, reachedInCiclo, reachedEver, highestReached,
  genId, today, isOver, isToday, fmt, eta, teamStats, Av,
  applyTema, segnaAspetto, tono, contaNeiTotali,
  azioneModifica, azioneCreazione, azioneCancellazione, azioneComposta,
  campiCambiati, scegliCampi,
} from "./shared";

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
    const msg = e.msg || e.error_description || e.message || e.error || res.statusText || "Errore sconosciuto";
    if (eTokenScaduto(res.status, msg)) {
      // Prima di arrendersi: rinnova il token e ripete UNA volta la stessa chiamata, in
      // modo invisibile. E' questo che chiude davvero il problema della sessione scaduta:
      // non dipende dal prevedere QUANDO scade (Mac in sospensione, scheda congelata,
      // orologio sfasato), ma dal reagire quando succede. `_riprova` impedisce i cicli.
      if (opts._token && !opts._riprova) {
        let nuovo = null, rete = false;
        try { nuovo = await rinnovaSessione(); } catch (err) { rete = eErroreRete(err); }
        if (nuovo) return sbFetch(path, { ...opts, _token: nuovo, _riprova: true });
        // senza connessione non si butta fuori nessuno: si riprova quando torna la rete
        if (rete) throw new Error("Connessione assente, riprova tra qualche secondo");
      }
      // Rinnovo rifiutato o sessione non rinnovabile: la sessione e' morta davvero
      localStorage.removeItem("becrm_session");
      window.location.reload();
    }
    throw new Error(msg);
  }
  return text ? JSON.parse(text) : null;
}

const sbSignUp  = (email, pw)      => sbFetch("/auth/v1/signup", { method:"POST", body:JSON.stringify({ email, password:pw }) });
const sbSignIn  = (email, pw)      => sbFetch("/auth/v1/token?grant_type=password", { method:"POST", body:JSON.stringify({ email, password:pw }) });

// ─── Rinnovo del token di accesso ──────────────────────────────────────────
// Il token Supabase scade (di default dopo un'ora). Fino a settembre 2026 il login
// scartava il refresh_token della risposta: alla scadenza il primo click finiva nel
// 401 di sbFetch, che cancella la sessione e ricarica la pagina — l'utente veniva
// buttato fuori perdendo quello che stava scrivendo. Ora il refresh_token viene
// conservato e il token rinnovato PRIMA che scada.
// Un token di rinnovo non valido restituisce 400 (non 401), quindi un rinnovo
// fallito NON innesca il ricaricamento forzato di sbFetch: lo gestisce il chiamante.
const sbRefresh = (refreshToken) => sbFetch("/auth/v1/token?grant_type=refresh_token", { method:"POST", body:JSON.stringify({ refresh_token:refreshToken }) });

// Si rinnova quando mancano meno di 5 minuti alla scadenza. Margine largo apposta:
// il client Realtime chiede il token ogni 25 secondi e la sua documentazione avverte
// che deve restare valido oltre la chiamata successiva, altrimenti il server chiude
// il canale SENZA risottoscrivere.
const RINNOVO_ANTICIPO_S = 300;

// Unico punto che costruisce una sessione a partire da una risposta di login o di
// rinnovo: registrazione, accesso, ripristino e rinnovo non possono divergere.
// `sessionKey` identifica il LOGIN, non il token: resta uguale attraverso i rinnovi.
// Serve a tutto cio' che prima usava il token come "questa sessione" (il popup
// reminder), che altrimenti si ripresenterebbe a ogni rinnovo, cioe' ogni ora.
function sessioneDaRisposta(res, base) {
  const ora = Math.floor(Date.now() / 1000);
  return {
    ...base,
    token: res.access_token,
    refreshToken: res.refresh_token,
    expiresAt: res.expires_at || (ora + (res.expires_in || 3600)),
    sessionKey: (base && base.sessionKey) || res.access_token,
  };
}

// Vero anche per sessioni senza scadenza nota: vanno rinnovate subito.
function staPerScadere(sessione) {
  if (!sessione || !sessione.expiresAt) return true;
  return sessione.expiresAt - Math.floor(Date.now() / 1000) < RINNOVO_ANTICIPO_S;
}
const sbSignOut = (tok)            => sbFetch("/auth/v1/logout", { method:"POST", _token:tok });
const sbResetPassword = (email)    => sbFetch("/auth/v1/recover?redirect_to="+encodeURIComponent(window.location.origin), { method:"POST", body:JSON.stringify({ email }) });
const sbUpdatePasswordWithToken = (tok, newPassword) => sbFetch("/auth/v1/user", { method:"PUT", _token:tok, body:JSON.stringify({ password:newPassword }) });
const sbList    = (tok, uid)       => sbFetch("/rest/v1/prospects?select=*&order=created_at.asc&user_id=eq."+uid, { _token:tok });
const sbInsert  = (tok, row)       => sbFetch("/rest/v1/prospects", { method:"POST", _token:tok, body:JSON.stringify(row) });
const sbUpdate  = (tok, id, row)   => sbFetch("/rest/v1/prospects?id=eq."+id, { method:"PATCH", _token:tok, body:JSON.stringify(row) });
const sbDelete  = (tok, id)        => sbFetch("/rest/v1/prospects?id=eq."+id, { method:"DELETE", _token:tok });
const sbDeleteMany = (tok, ids)    => sbFetch("/rest/v1/prospects?id=in.("+ids.join(",")+")", { method:"DELETE", _token:tok });
const sbUpdateMany = (tok, ids, fields) => sbFetch("/rest/v1/prospects?id=in.("+ids.join(",")+")", { method:"PATCH", _token:tok, body: JSON.stringify(fields) });

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

// Eventi helpers
const LUDOVICO_ID = "6a24d654-bfb2-40c7-86b1-80fe6142e86b";
const sbListEventi       = (tok)            => sbFetch("/rest/v1/eventi?select=*&order=data.desc", { _token:tok });
const sbInsertEvento     = (tok, row)       => sbFetch("/rest/v1/eventi", { method:"POST", _token:tok, body:JSON.stringify(row) });
const sbDeleteEvento     = (tok, id)        => sbFetch("/rest/v1/eventi?id=eq."+id, { method:"DELETE", _token:tok });
const sbListEventoPersone = (tok, eventoId) => sbFetch("/rest/v1/evento_persone?select=*"+(eventoId?("&evento_id=eq."+eventoId):""), { _token:tok });
const sbInsertEventoPersona = (tok, row)    => sbFetch("/rest/v1/evento_persone", { method:"POST", _token:tok, body:JSON.stringify(row) });
const sbUpdateEventoPersona = (tok, id, row) => sbFetch("/rest/v1/evento_persone?id=eq."+id, { method:"PATCH", _token:tok, body:JSON.stringify(row) });
const sbDeleteEventoPersona = (tok, id)     => sbFetch("/rest/v1/evento_persone?id=eq."+id, { method:"DELETE", _token:tok });
// Lettura di una sola riga: la usa la cronologia per verificare che nessun altro l'abbia toccata
const sbGetEventoPersona    = (tok, id)     => sbFetch("/rest/v1/evento_persone?select=*&id=eq."+id, { _token:tok }).then(r => (r && r[0]) || null);
const sbGetProspect         = (tok, id)     => sbFetch("/rest/v1/prospects?select=*&id=eq."+id, { _token:tok }).then(r => (r && r[0]) || null);



function toApp(r) {
  return {
    id:r.id, nome:r.nome||"", cognome:r.cognome||"", citta:r.citta||"",
    fonte:r.fonte||"Instagram", fase:r.fase||"INVITO",
    conosciutoAt:r.conosciuto_at||"", followUp:r.follow_up||"",
    note:r.note||"", storico:r.storico||[], profilazione:r.profilazione||{},
    pacchetto:r.pacchetto||"", bvCustom:r.bv_custom||0,
    telefono:r.telefono||"", instagram:r.instagram||"",
    checklist:r.checklist||{kyc:false,pandadoc:false,click:false},
    interesse:r.interesse||"", dataNascita:r.data_nascita||"",
    convertedProfileId:r.converted_profile_id||null,
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
    interesse:p.interesse||null, data_nascita:p.dataNascita||null,
    converted_profile_id:p.convertedProfileId||null,
  };
}


// TEMI e applyTema stanno in shared.jsx (prima erano copiati identici qui e in Profilo.jsx)

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800;900&display=swap');
:root{
  --bg:#060b18; --bg2:#080f1f; --bg3:#0a1426; --bg4:#0d1b33;
  --border:#11203a; --border2:#1e3a5f;
  --a1:#2563eb; --a2:#0ea5e9;
  --text:#dbeafe; --muted:#5278a8; --glow:#2563eb; --riga:#0d1b3355;
}
*{box-sizing:border-box;margin:0;padding:0}
html,body,#root{height:100%;font-family:'Poppins',sans-serif}
body{background:var(--bg);color:var(--text);overflow:hidden}
::-webkit-scrollbar{width:5px;height:5px}
::-webkit-scrollbar-thumb{background:var(--border2);border-radius:99px}
input,select,textarea{background:var(--bg3);border:1px solid var(--border2);border-radius:10px;padding:9px 13px;color:var(--text);font-size:13px;font-family:'Poppins',sans-serif;outline:none;width:100%;transition:border .2s}
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
.tabbtn{padding:8px 16px;border-radius:8px;border:none;cursor:pointer;font-size:12px;font-weight:700;font-family:'Poppins',sans-serif;transition:all .2s}
.togbtn{width:34px;height:28px;border-radius:7px;border:none;cursor:pointer;font-size:13px;font-weight:900;font-family:'Poppins',sans-serif;transition:all .18s;display:flex;align-items:center;justify-content:center}
.spinner{width:18px;height:18px;border:2px solid var(--border2);border-top-color:var(--a1);border-radius:50%;animation:spin .7s linear infinite;display:inline-block}
@media(max-width:768px){
  body{overflow:auto}
  .app-root{height:100dvh!important}
  nav.mobnav{display:flex!important}
  main.mc{height:calc(100dvh - 60px)!important;padding-bottom:84px!important}
  .kpi-grid{grid-template-columns:repeat(2,1fr)!important;gap:8px!important}
  .page-wrap{padding:1rem!important}
  .tbl-wrap{overflow-x:auto!important;-webkit-overflow-scrolling:touch}
  .modal-overlay{align-items:flex-end!important;padding:0!important}
  .modal-box{border-radius:20px 20px 0 0!important;max-height:92vh!important}
  .filt-row{flex-wrap:wrap!important}
  .filt-row>*{min-width:calc(50% - 4px)!important;flex:1 1 calc(50% - 4px)!important}
  h1.ptitle{font-size:20px!important}
  .toast-pos{bottom:68px!important;right:12px!important;left:12px!important;text-align:center}
  .mentore-widget{bottom:78px!important;right:14px!important}
  .mentore-panel{width:calc(100vw - 28px)!important;max-width:340px!important}
  .hamburger-btn{display:flex!important}
  /* Sidebar diventa un drawer scorrevole invece di sparire del tutto */
  aside.sb{position:fixed!important;top:0;left:0;height:100dvh!important;z-index:1800;transform:translateX(-100%);transition:transform .25s ease;box-shadow:0 0 40px #000000aa}
  aside.sb.drawer-open{transform:translateX(0)!important}
  .drawer-scrim{display:block!important}
}
nav.mobnav{display:none}
.hamburger-btn{display:none}
.drawer-scrim{display:none}
`;


function traduciErroreAuth(msg) {
  if (!msg) return "Errore sconosciuto";
  const m = msg.toLowerCase();
  if (m.includes("invalid login credentials")) return "Email o password non corretti.";
  if (m.includes("email not confirmed")) return "Devi confermare la tua email prima di accedere — controlla la posta.";
  if (m.includes("user already registered")) return "Esiste già un account con questa email.";
  if (m.includes("too many requests") || m.includes("rate limit")) return "Troppi tentativi. Aspetta qualche minuto e riprova.";
  if (m.includes("password") && m.includes("6 char")) return "La password deve avere almeno 6 caratteri.";
  if (m.includes("failed to fetch") || m.includes("networkerror") || m.includes("load failed")) return "Problema di connessione — controlla la rete e riprova.";
  return msg;
}

function AuthScreen({ onAuth }) {
  const [mode, setMode]     = useState("login");
  const [email, setEmail]   = useState("");
  const [pass, setPass]     = useState("");
  const [err, setErr]       = useState("");
  const [msg, setMsg]       = useState("");
  const [loading, setLoading] = useState(false);
  const [nome, setNome]       = useState("");
  const [cognome, setCognome] = useState("");
  const [citta, setCitta]     = useState("");
  const [remember, setRemember] = useState(true);
  const [recoveryToken, setRecoveryToken] = useState(null);
  const [sponsorCode, setSponsorCode] = useState("");
  const [hasPendingRef, setHasPendingRef] = useState(false);
  const [newPass, setNewPass]   = useState("");
  const [newPass2, setNewPass2] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (ref) {
      // Salva ref con timestamp — scade dopo 30 minuti
      localStorage.setItem("pending_ref", ref);
      localStorage.setItem("pending_ref_expires", Date.now() + 10 * 60 * 1000);
      setMode("signup");
    }

    // Verifica se esiste un referral valido (da link o da una visita precedente non scaduta)
    const existingRef = localStorage.getItem("pending_ref");
    const existingExpires = localStorage.getItem("pending_ref_expires");
    if (existingRef && existingExpires && Date.now() < Number(existingExpires)) {
      setHasPendingRef(true);
    }

    // Rileva il link di recupero password (Supabase lo passa nell'URL hash)
    const hash = window.location.hash;
    if (hash && hash.includes("type=recovery")) {
      const hashParams = new URLSearchParams(hash.replace("#", ""));
      const token = hashParams.get("access_token");
      if (token) {
        setRecoveryToken(token);
        setMode("newpassword");
        window.history.replaceState(null, "", window.location.pathname);
        return; // non ripristinare la sessione vecchia, siamo qui per resettare la password
      }
    }

    // Auto-restore session
    const saved = localStorage.getItem("becrm_session");
    if (saved) {
      try {
        const session = JSON.parse(saved);
        if (session.token && session.userId) {
          // Avvia con i dati in cache (niente attesa), poi aggiorna il profilo con la versione
          // fresca dal database: un leader potrebbe aver sbloccato/promosso l'account da un
          // altro dispositivo. La sessione va ESTESA con lo spread, mai ricostruita a mano:
          // riscriverla con quattro campi fissi butterebbe via refreshToken ed expiresAt.
          const avvia = (s) => {
            onAuth(s);
            sbGetProfile(s.token, s.userId).then(rows => {
              if (rows && rows[0]) {
                const aggiornata = { ...s, profile: rows[0] };
                onAuth(aggiornata);
                localStorage.setItem("becrm_session", JSON.stringify(aggiornata));
              }
            }).catch(()=>{});
          };
          if (session.refreshToken && staPerScadere(session)) {
            // Token scaduto o quasi: si rinnova PRIMA di usarlo. Usarlo scaduto farebbe
            // finire la prima chiamata nel 401 di sbFetch, cioe' fuori dal CRM.
            sbRefresh(session.refreshToken)
              .then(res => {
                const s = sessioneDaRisposta(res, { userId:session.userId, email:session.email, profile:session.profile||null, sessionKey:session.sessionKey });
                localStorage.setItem("becrm_session", JSON.stringify(s));
                avvia(s);
              })
              .catch(() => { localStorage.removeItem("becrm_session"); }); // rinnovo rifiutato: si rifa' il login
          } else {
            // Sessione ancora valida, oppure salvata prima di settembre 2026 senza
            // refreshToken: si usa com'e'. Quella vecchia regge finche' il token vale, poi il
            // 401 porta al login e il nuovo accesso salva una sessione rinnovabile. Nessuno
            // viene buttato fuori al momento del deploy.
            avvia({ ...session, profile: session.profile || null });
          }
        }
      } catch(e) { localStorage.removeItem("becrm_session"); }
    }
  }, []);

  async function inviaResetPassword() {
    if (!email.trim()) { setErr("Inserisci la tua email"); return; }
    setLoading(true); setErr(""); setMsg("");
    try {
      await sbResetPassword(email.trim());
      setMsg("Ti abbiamo inviato un'email con il link per reimpostare la password.");
    } catch(e) { setErr(traduciErroreAuth(e.message)); }
    setLoading(false);
  }

  async function salvaNuovaPassword() {
    if (!newPass || newPass.length < 6) { setErr("La password deve avere almeno 6 caratteri"); return; }
    if (newPass !== newPass2) { setErr("Le due password non coincidono"); return; }
    setLoading(true); setErr("");
    try {
      await sbUpdatePasswordWithToken(recoveryToken, newPass);
      setMsg("Password aggiornata! Ora puoi accedere.");
      setMode("login"); setPass(""); setNewPass(""); setNewPass2(""); setRecoveryToken(null);
    } catch(e) { setErr(e.message||"Errore durante l'aggiornamento della password"); }
    setLoading(false);
  }

  async function submit() {
    if (!email.trim() || !pass.trim()) { setErr("Compila email e password"); return; }
    if (mode === "signup" && (!nome.trim() || !cognome.trim())) { setErr("Compila nome e cognome"); return; }
    if (mode === "signup" && !citta.trim()) { setErr("Inserisci la tua città"); return; }
    if (mode === "signup" && !hasPendingRef && !sponsorCode.trim()) { setErr("Inserisci il codice sponsor — non puoi registrarti senza."); return; }
    setLoading(true); setErr(""); setMsg("");
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
          } else if (sponsorCode.trim()) {
            const profiles = await sbGetProfileByRef(tok, sponsorCode.trim().toLowerCase());
            if (profiles && profiles.length > 0) {
              uplineId = profiles[0].id;
            } else {
              setErr("Codice sponsor non valido. Controlla il codice e riprova.");
              setLoading(false);
              return;
            }
          }
          localStorage.removeItem("pending_ref");
          localStorage.removeItem("pending_ref_expires");
          await sbCreateProfile(tok, { id:userId, email, nome:nome.trim(), cognome:cognome.trim(), citta:citta.trim(), upline_id:uplineId, positioned_under:uplineId, marketer_unlocked:false });
          const profile = await sbGetProfile(tok, userId);
          const authData = sessioneDaRisposta(res, { userId, email, profile:profile?.[0]||null });
          if (remember) localStorage.setItem("becrm_session", JSON.stringify(authData));
          onAuth(authData);
        } else {
          setErr("Registrazione ok! Ora accedi.");
          setMode("login");
        }
      } else {
        let res;
        try {
          res = await sbSignIn(email, pass);
        } catch (firstErr) {
          // Riprova una volta dopo una breve pausa: capita che il primo tentativo
          // fallisca per un "risveglio a freddo" del database dopo un periodo di inattivita'
          await new Promise(r => setTimeout(r, 1200));
          res = await sbSignIn(email, pass);
        }
        if (res && res.access_token) {
          const tok    = res.access_token;
          const userId = res.user.id;
          let profile  = await sbGetProfile(tok, userId);
          if (!profile || profile.length === 0) {
            await sbCreateProfile(tok, { id:userId, email });
            profile = await sbGetProfile(tok, userId);
          }
          const prof = profile?.[0]||null;
          if (prof && !isAttivo(prof)) {
            setErr("Accesso sospeso dal tuo upline. Contattalo per riattivarlo.");
            setLoading(false);
            return;
          }
          const authData = sessioneDaRisposta(res, { userId, email, profile:prof });
          if (remember) localStorage.setItem("becrm_session", JSON.stringify(authData));
          onAuth(authData);
        } else {
          setErr("Credenziali non valide");
        }
      }
    } catch(e) { setErr(traduciErroreAuth(e.message)); }
    setLoading(false);
  }

  return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",background:"var(--bg)",padding:16}}>
      <div className="pop" style={{width:"100%",maxWidth:400,background:"var(--bg2)",border:"1px solid var(--border2)",borderRadius:20,padding:"2.2rem",boxShadow:"0 20px 70px #000000aa"}}>
        <div style={{textAlign:"center",marginBottom:28}}>
          <div style={{fontWeight:900,fontSize:20,color:"var(--text)",letterSpacing:-0.5}}>Kairos CRM</div>
        </div>

        {(mode==="login"||mode==="signup") && (
          <div style={{display:"flex",background:"var(--bg3)",borderRadius:10,padding:4,marginBottom:24,border:"1px solid var(--border)"}}>
            {["login","signup"].map(m=>(
              <button key={m} onClick={()=>{setMode(m);setErr("");setMsg("");}} className="tabbtn"
                style={{flex:1,background:mode===m?"var(--bg4)":"transparent",color:mode===m?"var(--a2)":"var(--muted)",boxShadow:mode===m?"inset 0 0 0 1px var(--sidebar-border)":"none"}}>
                {m==="login"?"Accedi":"Registrati"}
              </button>
            ))}
          </div>
        )}

        {mode==="reset" && (
          <div style={{marginBottom:20}}>
            <div style={{fontWeight:800,fontSize:15,color:"var(--text)",marginBottom:6}}>Password dimenticata</div>
            <p style={{fontSize:12,color:"var(--muted)",lineHeight:1.5}}>Inserisci la tua email: ti mandiamo un link per reimpostare la password.</p>
          </div>
        )}

        {mode==="newpassword" && (
          <div style={{marginBottom:20}}>
            <div style={{fontWeight:800,fontSize:15,color:"var(--text)",marginBottom:6}}>Imposta una nuova password</div>
            <p style={{fontSize:12,color:"var(--muted)",lineHeight:1.5}}>Scegli la tua nuova password per accedere al CRM.</p>
          </div>
        )}

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

          {mode==="signup" && (
            <div>
              <label style={{fontSize:11,fontWeight:700,color:"var(--muted)",textTransform:"uppercase",letterSpacing:.8,marginBottom:5,display:"block"}}>Città *</label>
              <input value={citta} onChange={e=>setCitta(e.target.value)} placeholder="es. Milano" />
            </div>
          )}

          {mode==="signup" && !hasPendingRef && (
            <div>
              <label style={{fontSize:11,fontWeight:700,color:"var(--muted)",textTransform:"uppercase",letterSpacing:.8,marginBottom:5,display:"block"}}>Codice Sponsor *</label>
              <input value={sponsorCode} onChange={e=>setSponsorCode(e.target.value)} placeholder="es. mario.rossi_a1b2c" />
              <div style={{fontSize:11,color:"var(--muted)",marginTop:5,lineHeight:1.4}}>Chiedi il codice a chi ti ha invitato nel team — lo trova nella sua sezione Profilo.</div>
            </div>
          )}

          {mode==="signup" && hasPendingRef && (
            <div style={{background:"#10b98115",border:"1px solid #10b98130",borderRadius:9,padding:"9px 13px",fontSize:12,color:"#10b981"}}>
              Sponsor riconosciuto automaticamente dal link di invito.
            </div>
          )}

          {(mode==="login"||mode==="signup"||mode==="reset") && (
            <div>
              <label style={{fontSize:11,fontWeight:700,color:"var(--muted)",textTransform:"uppercase",letterSpacing:.8,marginBottom:5,display:"block"}}>Email</label>
              <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="tua@email.com"
                onKeyDown={e=>e.key==="Enter"&&(mode==="reset"?inviaResetPassword():submit())} />
            </div>
          )}

          {(mode==="login"||mode==="signup") && (
            <div>
              <label style={{fontSize:11,fontWeight:700,color:"var(--muted)",textTransform:"uppercase",letterSpacing:.8,marginBottom:5,display:"block"}}>Password</label>
              <input type="password" value={pass} onChange={e=>setPass(e.target.value)} placeholder="••••••••" onKeyDown={e=>e.key==="Enter"&&submit()} />
            </div>
          )}

          {mode==="newpassword" && (
            <>
              <div>
                <label style={{fontSize:11,fontWeight:700,color:"var(--muted)",textTransform:"uppercase",letterSpacing:.8,marginBottom:5,display:"block"}}>Nuova password</label>
                <input type="password" value={newPass} onChange={e=>setNewPass(e.target.value)} placeholder="Almeno 6 caratteri" onKeyDown={e=>e.key==="Enter"&&salvaNuovaPassword()} />
              </div>
              <div>
                <label style={{fontSize:11,fontWeight:700,color:"var(--muted)",textTransform:"uppercase",letterSpacing:.8,marginBottom:5,display:"block"}}>Conferma password</label>
                <input type="password" value={newPass2} onChange={e=>setNewPass2(e.target.value)} placeholder="Ripeti la password" onKeyDown={e=>e.key==="Enter"&&salvaNuovaPassword()} />
              </div>
            </>
          )}
        </div>

        {err && <div style={{background:"#ef444415",border:"1px solid #ef444435",borderRadius:9,padding:"9px 13px",fontSize:12,color:"#f87171",marginBottom:14,lineHeight:1.5}}>{err}</div>}
        {msg && <div style={{background:"#10b98115",border:"1px solid #10b98135",borderRadius:9,padding:"9px 13px",fontSize:12,color:"#10b981",marginBottom:14,lineHeight:1.5}}>{msg}</div>}

        {mode==="login" && (
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:16,cursor:"pointer"}} onClick={()=>setRemember(r=>!r)}>
            <div style={{width:18,height:18,borderRadius:5,border:"1.5px solid "+(remember?"var(--a1)":"var(--border2)"),background:remember?"var(--a1)":"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"all .2s"}}>
              {remember && <span style={{color:"#fff",fontSize:11,fontWeight:900}}></span>}
            </div>
            <span style={{fontSize:12,color:"var(--muted)",userSelect:"none"}}>Ricordami su questo dispositivo</span>
          </div>
        )}

        {mode==="reset" ? (
          <button onClick={inviaResetPassword} disabled={loading}
            style={{width:"100%",padding:"11px",background:"linear-gradient(135deg,var(--a1),var(--a2))",color:"#fff",border:"none",borderRadius:10,cursor:loading?"not-allowed":"pointer",fontWeight:800,fontSize:14,display:"flex",alignItems:"center",justifyContent:"center",gap:8,opacity:loading?0.7:1}}>
            {loading && <span className="spinner" />}
            Invia link di reset
          </button>
        ) : mode==="newpassword" ? (
          <button onClick={salvaNuovaPassword} disabled={loading}
            style={{width:"100%",padding:"11px",background:"linear-gradient(135deg,var(--a1),var(--a2))",color:"#fff",border:"none",borderRadius:10,cursor:loading?"not-allowed":"pointer",fontWeight:800,fontSize:14,display:"flex",alignItems:"center",justifyContent:"center",gap:8,opacity:loading?0.7:1}}>
            {loading && <span className="spinner" />}
            Salva nuova password
          </button>
        ) : (
          <button onClick={submit} disabled={loading}
            style={{width:"100%",padding:"11px",background:"linear-gradient(135deg,var(--a1),var(--a2))",color:"#fff",border:"none",borderRadius:10,cursor:loading?"not-allowed":"pointer",fontWeight:800,fontSize:14,display:"flex",alignItems:"center",justifyContent:"center",gap:8,opacity:loading?0.7:1}}>
            {loading && <span className="spinner" />}
            {mode==="login"?"Accedi":"Crea account"}
          </button>
        )}

        {mode==="login" && (
          <div style={{textAlign:"center",marginTop:16,fontSize:11,color:"var(--muted)",display:"flex",flexDirection:"column",gap:8}}>
            <div>
              Non hai un account?{" "}
              <span onClick={()=>{setMode("signup");setErr("");setMsg("");}} style={{color:"var(--a2)",cursor:"pointer",fontWeight:700}}>Registrati</span>
            </div>
            <div>
              <span onClick={()=>{setMode("reset");setErr("");setMsg("");}} style={{color:"var(--muted)",cursor:"pointer",textDecoration:"underline"}}>Hai dimenticato la password?</span>
            </div>
          </div>
        )}
        {mode==="reset" && (
          <div style={{textAlign:"center",marginTop:16,fontSize:11,color:"var(--muted)"}}>
            <span onClick={()=>{setMode("login");setErr("");setMsg("");}} style={{color:"var(--a2)",cursor:"pointer",fontWeight:700}}>{"\u2190"} Torna al login</span>
          </div>
        )}
      </div>
    </div>
  );
}

//  APP 
function CittaRequiredScreen({ onSave, onLogout }) {
  const [citta, setCitta]     = useState("");
  const [err, setErr]         = useState("");
  const [loading, setLoading] = useState(false);

  async function salva() {
    if (!citta.trim()) { setErr("Inserisci la tua città"); return; }
    setLoading(true); setErr("");
    try {
      await onSave({ citta: citta.trim() });
    } catch(e) { setErr("Errore durante il salvataggio: "+(e.message||"riprova")); }
    setLoading(false);
  }

  return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",background:"var(--bg)",padding:16}}>
      <div className="pop" style={{width:"100%",maxWidth:400,background:"var(--bg2)",border:"1px solid var(--border2)",borderRadius:20,padding:"2.2rem",boxShadow:"0 20px 70px #000000aa"}}>
        <div style={{textAlign:"center",marginBottom:22}}>
          <div style={{fontWeight:900,fontSize:20,color:"var(--text)",letterSpacing:-0.5}}>Kairos CRM</div>
        </div>
        <div style={{marginBottom:20}}>
          <div style={{fontWeight:800,fontSize:15,color:"var(--text)",marginBottom:6}}>Manca la tua città</div>
          <p style={{fontSize:12,color:"var(--muted)",lineHeight:1.5}}>Per apparire sulla mappa del team ci serve la città da cui operi. Inseriscila per continuare — te lo chiediamo una sola volta.</p>
        </div>
        <div style={{marginBottom:16}}>
          <label style={{fontSize:11,fontWeight:700,color:"var(--muted)",textTransform:"uppercase",letterSpacing:.8,marginBottom:5,display:"block"}}>Città *</label>
          <input value={citta} onChange={e=>setCitta(e.target.value)} placeholder="es. Milano" autoFocus
            onKeyDown={e=>e.key==="Enter"&&salva()} />
        </div>
        {err && <div style={{background:"#ef444415",border:"1px solid #ef444435",borderRadius:9,padding:"9px 13px",fontSize:12,color:"#f87171",marginBottom:14,lineHeight:1.5}}>{err}</div>}
        <button onClick={salva} disabled={loading}
          style={{width:"100%",padding:"11px",background:"linear-gradient(135deg,var(--a1),var(--a2))",color:"#fff",border:"none",borderRadius:10,cursor:loading?"not-allowed":"pointer",fontWeight:800,fontSize:14,display:"flex",alignItems:"center",justifyContent:"center",gap:8,opacity:loading?0.7:1}}>
          {loading && <span className="spinner" />}
          Continua
        </button>
        {onLogout && (
          <div style={{textAlign:"center",marginTop:16,fontSize:11,color:"var(--muted)"}}>
            <span onClick={onLogout} style={{color:"var(--muted)",cursor:"pointer",textDecoration:"underline"}}>Esci</span>
          </div>
        )}
      </div>
    </div>
  );
}

function AccessoSospesoScreen({ stato, onLogout }) {
  return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",background:"var(--bg)",padding:16}}>
      <div className="pop" style={{width:"100%",maxWidth:400,background:"var(--bg2)",border:"1px solid var(--border2)",borderRadius:20,padding:"2.2rem",boxShadow:"0 20px 70px #000000aa",textAlign:"center"}}>
        <div style={{fontWeight:900,fontSize:20,color:"var(--text)",letterSpacing:-0.5,marginBottom:22}}>Kairos CRM</div>
        <div style={{fontWeight:800,fontSize:15,color:"var(--text)",marginBottom:8}}>Accesso sospeso</div>
        <p style={{fontSize:12,color:"var(--muted)",lineHeight:1.6,marginBottom:20}}>
          Il tuo account è stato segnato come {stato==="rimborsato"?"rimborsato":"mollato"} dal tuo upline e l accesso al CRM è sospeso. Contattalo per farlo riattivare.
        </p>
        {onLogout && (
          <button onClick={onLogout}
            style={{width:"100%",padding:"11px",background:"var(--bg4)",color:"var(--muted)",border:"1px solid var(--border2)",borderRadius:10,cursor:"pointer",fontWeight:700,fontSize:13}}>
            Esci
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Cronologia modifiche (frecce indietro/avanti) ─────────────────────────────
// UNA sola pila per tutto il CRM, non una per sezione: se ce ne fosse una per vista,
// dopo tre spunte nei prospect e due nei ticket non sapresti piu' quale freccia stai
// premendo, e annulleresti qualcosa che non e' l'ultima cosa che hai fatto — che e'
// l'unica aspettativa che le persone hanno davvero da un Cmd+Z.
//
// REGOLA: la pila si riempie SOLO dal punto in cui l'utente agisce (chiamando
// `registra`), mai osservando i cambiamenti di stato. Quando arriveranno gli
// aggiornamenti dal vivo, lo stato verra' modificato anche da altri: se la pila lo
// osservasse, dentro ci finirebbe il lavoro dei colleghi, e "indietro" annullerebbe la
// modifica di un altro facendo finta di annullare la tua.
function useCronologia({ token, userId, avvisa, limite = 50 }) {
  const [pile, setPile] = useState({ indietro: [], avanti: [] });
  const [occupato, setOccupato] = useState(false);
  const pileRef = useRef(pile); pileRef.current = pile;
  const occupatoRef = useRef(false);
  const tokenRef = useRef(token);   tokenRef.current = token;
  const avvisaRef = useRef(avvisa); avvisaRef.current = avvisa;
  const gruppoRef = useRef(null);

  // Cambio utente (logout, altro account nella stessa scheda): la pila si svuota.
  // Le azioni tengono riferimenti ai dati del vecchio utente e non devono sopravvivere.
  useEffect(() => { setPile({ indietro: [], avanti: [] }); gruppoRef.current = null; }, [userId]);

  const registra = useCallback(azione => {
    if (gruppoRef.current) { gruppoRef.current.azioni.push(azione); return; }
    setPile(p => ({ indietro: [...p.indietro, azione].slice(-limite), avanti: [] }));
  }, [limite]);

  // Raggruppa in UNA voce tutte le scritture fatte dentro `fn` (es. invito dalla Lista
  // Nomi = nome segnato invitato + prospect creato). Limite noto: un'azione registrata
  // da un altro click nello stesso istante finirebbe nel gruppo; con gesti umani non
  // capita in pratica.
  const gruppo = useCallback(async (etichetta, fn) => {
    const precedente = gruppoRef.current;
    const g = { azioni: [] };
    gruppoRef.current = g;
    try { return await fn(); }
    finally {
      gruppoRef.current = precedente;
      if (g.azioni.length === 1) registra({ ...g.azioni[0], etichetta });
      else if (g.azioni.length > 1) registra(azioneComposta(etichetta, g.azioni));
    }
  }, [registra]);

  const esegui = useCallback(async direzione => {
    if (occupatoRef.current) return; // un click alla volta: niente undo sovrapposti
    const sorgente = direzione === "annulla" ? pileRef.current.indietro : pileRef.current.avanti;
    if (!sorgente.length) return;
    const azione = sorgente[sorgente.length - 1];
    occupatoRef.current = true; setOccupato(true);
    // rimozione per IDENTITA', non "l'ultima": mentre l'undo e' in corso l'utente puo'
    // aver fatto un'altra azione, e togliere l'ultima toglierebbe quella
    const senza = lista => lista.filter(a => a !== azione);
    try {
      const problema = direzione === "annulla" ? await azione.verificaAnnulla() : await azione.verificaRipeti();
      if (problema) {
        // Non piu' reversibile in sicurezza: la si toglie, cosi' non blocca le azioni
        // precedenti, e lo si dice chiaramente invece di fallire in silenzio.
        setPile(q => direzione === "annulla" ? { ...q, indietro: senza(q.indietro) } : { ...q, avanti: senza(q.avanti) });
        avvisaRef.current("Impossibile " + (direzione === "annulla" ? "annullare" : "ripetere") + " \u00ab" + azione.etichetta + "\u00bb: " + problema, "#ef4444");
        return;
      }
      if (direzione === "annulla") await azione.annulla(); else await azione.ripeti();
      setPile(q => direzione === "annulla"
        ? { indietro: senza(q.indietro), avanti: [...q.avanti, azione] }
        : { indietro: [...q.indietro, azione], avanti: senza(q.avanti) });
      avvisaRef.current((direzione === "annulla" ? "Annullato: " : "Ripetuto: ") + azione.etichetta);
    } catch (e) {
      avvisaRef.current("Errore: " + e.message, "#ef4444");
    } finally {
      occupatoRef.current = false; setOccupato(false);
    }
  }, []);

  // Cmd+Z / Cmd+Shift+Z (Ctrl+Z / Ctrl+Y su Windows). Dentro un campo di testo il
  // tasto resta al browser: li' Cmd+Z deve annullare il testo che stai scrivendo,
  // non l'ultima modifica del CRM.
  useEffect(() => {
    function tasto(e) {
      if (!(e.metaKey || e.ctrlKey) || e.altKey) return;
      const k = (e.key || "").toLowerCase();
      const annullare = k === "z" && !e.shiftKey;
      const ripetere = (k === "z" && e.shiftKey) || (k === "y" && e.ctrlKey && !e.metaKey);
      if (!annullare && !ripetere) return;
      const t = e.target;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      e.preventDefault();
      esegui(annullare ? "annulla" : "ripeti");
    }
    window.addEventListener("keydown", tasto);
    return () => window.removeEventListener("keydown", tasto);
  }, [esegui]);

  return useMemo(() => ({
    registra, gruppo,
    annulla: () => esegui("annulla"),
    ripeti: () => esegui("ripeti"),
    // il token si legge AL MOMENTO dell'undo, non quando l'azione e' stata registrata:
    // annullando dopo un'ora il token di allora sarebbe scaduto (401 = fuori dal CRM)
    token: () => tokenRef.current,
    occupato,
    puoAnnullare: pile.indietro.length > 0,
    puoRipetere: pile.avanti.length > 0,
    etichettaAnnulla: pile.indietro.length ? pile.indietro[pile.indietro.length - 1].etichetta : "",
    etichettaRipeti: pile.avanti.length ? pile.avanti[pile.avanti.length - 1].etichetta : "",
  }), [registra, gruppo, esegui, occupato, pile]);
}

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
  // Default: il ciclo in corso, non "tutti". Per vedere tutto si sceglie "Tutti i cicli"
  // dal filtro (valore ""). Stringa e non numero perche' il <select> in Lista.jsx lavora
  // con stringhe (e.target.value) e il confronto usa Number(fCiclo).
  const [fCiclo, setFCiclo]       = useState(String(CICLO_CORRENTE));
  const [fCitta, setFCitta]       = useState("");
  const [fInteresse, setFInteresse] = useState("");
  const [fPercorso, setFPercorso] = useState(""); // "" | "in_percorso" | "non_in_percorso"
  const [fMembro, setFMembro]     = useState(""); // "" | userId
  const [fSquadra, setFSquadra]   = useState(""); // "" | "sinistra" | "destra"
  const [sortBy, setSortBy]       = useState("fase"); // "fase"|"data"|"alfa"|"followup"
  const [ready, setReady]         = useState(false);
  const [saving, setSaving]       = useState(false);
  const [downline, setDownline]   = useState([]);
  const [allProfiles, setAllProfiles] = useState([]);
  const [showEventoReminder, setShowEventoReminder] = useState(false);
  const [ticketVendutiCount, setTicketVendutiCount] = useState(0);
  const [dlProspects, setDlProspects] = useState([]);
  const [positions, setPositions] = useState([]);
  const [dashMode, setDashMode]   = useState("personale");
  const [appMode, setAppMode] = useState("marketer"); // "marketer" | "cliente"
  const [listaMode, setListaMode] = useState("personale");
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false); // solo mobile: sidebar come drawer scorrevole

  // Pila unica delle modifiche. DEVE stare prima del `return` anticipato del login:
  // un hook chiamato solo in certi render viola le regole di React e manda in crash.
  // showToast e' una function declaration piu' sotto: e' gia' disponibile qui (hoisting).
  const cronologia = useCronologia({ token: auth?.token, userId: auth?.userId, avvisa: showToast });
  // Letti dalle azioni della cronologia al momento dell'undo (le loro closure sono
  // ferme al render in cui sono state registrate).
  const selRef = useRef(sel);   selRef.current = sel;
  const formRef = useRef(form); formRef.current = form;
  const aspettoInCorso = useRef(false); // un salvataggio dell'aspetto alla volta

  useEffect(()=>{
    const el=document.createElement("style");
    el.textContent=CSS;
    document.head.appendChild(el);
    // Tema e aspetto dell'ultima sessione salvata, applicati subito: altrimenti chi usa
    // l'aspetto chiaro vedrebbe un lampo scuro a ogni ricaricamento, in attesa del profilo.
    let salvata = null;
    try { salvata = JSON.parse(localStorage.getItem("becrm_session") || "null"); } catch(e) {}
    applyTema(salvata?.profile?.tema || "blu", salvata?.profile?.aspetto || "scuro");
    return ()=>document.head.removeChild(el);
  },[]);

  // Aspetto chiaro/scuro, salvato sul profilo: ti segue su ogni dispositivo.
  const aspetto = auth?.profile?.aspetto === "chiaro" ? "chiaro" : "scuro";
  // Segnato DURANTE il render, non in un effetto: i componenti figli, renderizzati subito
  // dopo, leggono gia' l'aspetto giusto quando chiedono il tono dei colori delle fasi.
  segnaAspetto(aspetto);
  useEffect(()=>{
    // sempre applicato, anche senza profilo: al logout la schermata di accesso torna al
    // tema predefinito invece di restare nell'ultimo aspetto usato
    applyTema(auth?.profile?.tema || "blu", aspetto);
  },[auth?.profile?.tema, aspetto]);

  // ─── Rinnovo del token ─────────────────────────────────────────────────────
  // COME si rinnova, registrato nel coordinatore di sessione.js: lo usano sia il rinnovo
  // proattivo qui sotto sia i tre sbFetch quando incontrano un token scaduto, e passando
  // tutti da li' non si fanno mai due rinnovi in parallelo con lo stesso refresh token.
  // Il rinnovo conserva lo stesso riferimento a `profile` (spread), cosi' gli effetti di
  // caricamento — che dipendono da userId e profile, non dal token — non ripartono.
  const authRef = useRef(auth); authRef.current = auth;
  useEffect(()=>{
    registraRinnovo(async () => {
      const a = authRef.current;
      if (!a || !a.refreshToken) return null; // sessione vecchia: non rinnovabile, si rifa' il login
      // Un'altra scheda aperta potrebbe aver gia' rinnovato: si adotta la sua sessione
      // invece di consumare di nuovo lo stesso refresh token (Supabase lo ruota a ogni uso).
      let salvata = null;
      try { salvata = JSON.parse(localStorage.getItem("becrm_session") || "null"); } catch(e) {}
      if (salvata && salvata.userId === a.userId && salvata.refreshToken
          && salvata.expiresAt > (a.expiresAt || 0) && !staPerScadere(salvata)) {
        authRef.current = { ...a, token:salvata.token, refreshToken:salvata.refreshToken, expiresAt:salvata.expiresAt };
        setAuth(x => x ? { ...x, token:salvata.token, refreshToken:salvata.refreshToken, expiresAt:salvata.expiresAt } : x);
        return salvata.token;
      }
      const s = sessioneDaRisposta(await sbRefresh(a.refreshToken), a);
      // subito, non al prossimo render: una seconda chiamata nello stesso istante deve gia'
      // vedere il refresh token nuovo, quello vecchio non vale piu'
      authRef.current = s;
      // si riscrive solo se l'utente aveva scelto "ricordami"
      if (localStorage.getItem("becrm_session")) localStorage.setItem("becrm_session", JSON.stringify(s));
      setAuth(x => x ? { ...x, token:s.token, refreshToken:s.refreshToken, expiresAt:s.expiresAt } : x);
      return s.token;
    });
    return () => registraRinnovo(null);
  },[]);

  // Rinnovo PROATTIVO, perche' di norma non si arrivi nemmeno al token scaduto.
  useEffect(()=>{
    if (!auth?.refreshToken || !auth?.expiresAt) return;
    let annullato = false;
    function esciSessioneMorta() {
      localStorage.removeItem("becrm_session");
      setAuth(null); setData([]); setReady(true);
    }
    function rinnova() {
      if (!staPerScadere(authRef.current)) return; // gia' rinnovato da un'altra strada
      rinnovaSessione()
        .then(tok => { if (!tok && !annullato) esciSessioneMorta(); })
        .catch(err => {
          if (annullato) return;
          // Errore di rete (wifi non ancora collegato al risveglio): nessun logout, riprova
          // il controllo successivo. Rinnovo RIFIUTATO dal server: la sessione e' morta.
          // Niente sbSignOut: col token scaduto finirebbe nel 401.
          if (!eErroreRete(err)) esciSessioneMorta();
        });
    }
    // 1) timer a 5 minuti dalla scadenza
    const timer = setTimeout(rinnova, Math.max(0, (auth.expiresAt - RINNOVO_ANTICIPO_S) * 1000 - Date.now()));
    // 2) controllo sull'ORA VERA ogni 30 secondi. Il timer da solo NON basta: su macOS,
    //    mentre il Mac dorme, il timer del browser si ferma e riparte in ritardo di tutta la
    //    durata del sonno. E se Brave era in primo piano quando si e' chiuso il coperchio,
    //    alla riapertura la scheda non "torna" visibile — non se n'era mai andata — quindi
    //    visibilitychange e focus non partono. Date.now() invece e' l'ora di parete.
    const orologio = setInterval(rinnova, 30000);
    // 3) ritorno sulla scheda o sulla finestra
    function controlla() { if (document.visibilityState === "visible") rinnova(); }
    document.addEventListener("visibilitychange", controlla);
    window.addEventListener("focus", controlla);
    return () => {
      annullato = true;
      clearTimeout(timer); clearInterval(orologio);
      document.removeEventListener("visibilitychange", controlla);
      window.removeEventListener("focus", controlla);
    };
  },[auth?.userId, auth?.refreshToken, auth?.expiresAt]);

  // Identita' del LOGIN, stabile attraverso i rinnovi del token. Le sessioni salvate
  // prima di settembre 2026 non hanno sessionKey: per loro si ricade sul token, che non
  // cambia perche' senza refreshToken non vengono mai rinnovate.
  const chiaveSessione = auth ? (auth.sessionKey || auth.token) : null;
  useEffect(()=>{
    if (!chiaveSessione) return;
    // Mostra il reminder solo se questo login non l'ha gia' fatto vedere. Sopravvive ai
    // reload finche' la sessione resta la stessa. NON va legato ad auth.token: il token
    // ora si rinnova ogni ora e il popup ricomparirebbe a ogni rinnovo.
    const lastShownFor = localStorage.getItem("evento_reminder_token");
    if (lastShownFor !== chiaveSessione) {
      setShowEventoReminder(true);
      localStorage.setItem("evento_reminder_token", chiaveSessione);
    }
  },[chiaveSessione]);

  // Dipendenze: utente e profilo, MAI l'oggetto `auth` intero. Il rinnovo del token crea
  // un nuovo oggetto `auth` ogni ora: con [auth] questo effetto ripartirebbe, metterebbe
  // setReady(false) e ricaricherebbe tutto — il CRM sparirebbe dietro il caricamento a
  // meta' lavoro, portandosi via anagrafiche aperte e note in scrittura. Il profilo resta
  // nelle dipendenze per non cambiare il comportamento esistente dopo updateProfile, che
  // lo sostituisce (mentre il rinnovo ne conserva lo stesso riferimento con lo spread).
  useEffect(()=>{
    if (!auth) { setData([]); setReady(true); return; }
    setReady(false);
    sbList(auth.token, auth.userId).then(rows=>{
      // La migrazione dei buchi gira UNA VOLTA SOLA per utente (flag profiles.storico_migrato).
      // Se girasse a ogni login, una fase cancellata a mano verrebbe ripristinata al ricaricamento
      // e diventerebbe impossibile toglierla.
      const daMigrare = auth.profile && auth.profile.storico_migrato !== true;
      const daSalvare=[];
      const arr=(rows||[]).map(r=>{
        const p=toApp(r);
        if (!p.storico.length) p.storico=buildStorico(p,p.fase,p.conosciutoAt);
        else if (daMigrare) {
          // Prospect creati prima del backfill automatico possono avere buchi (es. FUP2 senza
          // FUP1) che falsano i conteggi per fase/ciclo: corretti qui e riscritti sul DB.
          const fixed=fillGapsStorico(p);
          if (fixed) { p.storico=fixed; daSalvare.push(p); }
        }
        return p;
      });
      setData(arr);
      if (daMigrare) {
        // Salvataggio in background: se fallisce si riprova al prossimo login (flag non impostato).
        Promise.all(daSalvare.map(p=>sbUpdate(auth.token,p.id,toDB(p,auth.userId))))
          .then(()=>sbUpdateProfile(auth.token, auth.userId, { storico_migrato:true }))
          .then(()=>setAuth(a=>a?{...a, profile:{...a.profile, storico_migrato:true}}:a))
          .catch(()=>{});
      }
    }).catch(e=>showToast("Errore: "+e.message,"#ef4444")).finally(()=>setReady(true));

    // Load downline ricorsiva + posizioni
    Promise.all([
      sbGetAllProfiles(auth.token),
      sbGetPositions(auth.token).catch(()=>[]),
    ]).then(async ([allProfilesRows, allPositions]) => {
      const all = allProfilesRows || [];
      const pos = allPositions || [];
      setAllProfiles(all);
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
        // Stessa correzione dei buchi sui prospect della downline, ma SOLO in memoria e SOLO per
        // i membri che non hanno ancora migrato: scrivere in massa su record di altri utenti
        // sarebbe una scrittura cross-user rischiosa, e per chi ha già migrato un buco residuo
        // è una cancellazione voluta, che va rispettata anche nella vista del leader.
        const nonMigrati = new Set(mine.filter(m=>m.storico_migrato!==true).map(m=>m.id));
        setDlProspects((dp||[]).map(r=>{
          const p={...toApp(r), _userId:r.user_id};
          if (nonMigrati.has(r.user_id)) {
            const fixed=fillGapsStorico(p);
            if (fixed) p.storico=fixed;
          }
          return p;
        }));
      }
    }).catch(()=>{});
  },[auth?.userId, auth?.profile]);

  useEffect(()=>{
    if (!auth) { setTicketVendutiCount(0); return; }
    const myTeamIds = new Set([auth.userId, ...downline.map(d=>d.id)]);
    sbListEventoPersone(auth.token, null).then(rows=>{
      // gli "in forse" e i "non viene" non contano da nessuna parte: stessa regola, e
      // stessa FUNZIONE (contaNeiTotali, in shared.jsx), usata in Eventi.jsx, che
      // sovrascrive questo valore via onTicketCountChange quando la vista e' aperta. Se i
      // due filtri divergessero, il KPI cambierebbe a seconda che tu sia passato o no
      // dalla pagina Eventi: per questo non e' piu' scritta a mano in due posti.
      const count = (rows||[]).filter(r => r.stato==="venduto" && contaNeiTotali(r) && myTeamIds.has(r.user_id)).length;
      setTicketVendutiCount(count);
    }).catch(()=>{});
  },[auth?.userId, auth?.profile, downline]); // non [auth]: vedi il caricamento principale

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

  // ─── Scritture sui prospect, con cronologia ────────────────────────────────
  function nomeProspect(p) { return (((p && p.nome) || "") + " " + ((p && p.cognome) || "")).trim() || "prospect"; }

  // Fonde campi in formato database nella copia in memoria, ovunque stia il prospect
  // (personali, downline, dettaglio aperto). I campi "_" restano quelli che c'erano.
  function applicaProspectLocale(id, campiDB) {
    const fondi = x => ({ ...x, ...toApp({ ...toDB(x, null), ...campiDB }) });
    setData(d => d.map(x => x.id === id ? fondi(x) : x));
    setDlProspects(d => d.map(x => x.id === id ? fondi(x) : x));
    setSel(s => s && s.id === id ? fondi(s) : s);
  }

  function rimuoviProspectLocale(id) {
    // Se e' aperto nel dettaglio o in modifica si chiude il modale: DetailModal viene
    // montato con p={sel} senza controlli, e con sel nullo l'app andrebbe in crash.
    if ((selRef.current && selRef.current.id === id) || (formRef.current && formRef.current.id === id)) closeModal();
    setData(d => d.filter(x => x.id !== id));
    setDlProspects(d => d.filter(x => x.id !== id));
  }

  function aggiungiProspectLocale(riga) {
    const app = toApp(riga);
    if (riga.user_id === auth.userId) {
      setData(d => d.some(x => x.id === app.id) ? d : [...d, app]);
    } else {
      const m = downline.find(x => x.id === riga.user_id);
      setDlProspects(d => d.some(x => x.id === app.id) ? d : [...d, { ...app, _userId: riga.user_id, _ownerName: (m?.nome||"") + " " + (m?.cognome||"") }]);
    }
  }

  // Unico punto di scrittura delle MODIFICHE ai prospect. Scrive solo i campi davvero
  // cambiati: prima ogni modifica riscriveva l'intera riga con toDB, e con piu' persone
  // sugli stessi prospect cancellava in silenzio i campi appena cambiati da un collega.
  async function scriviProspect(prima, dopo, etichetta) {
    const uid = prima._userId || auth.userId;
    const dbPrima = toDB(prima, uid), dbDopo = toDB(dopo, uid);
    const chiavi = campiCambiati(dbPrima, dbDopo).filter(k => k !== "id" && k !== "user_id");
    if (!chiavi.length) return false;
    const vPrima = scegliCampi(dbPrima, chiavi), vDopo = scegliCampi(dbDopo, chiavi);
    const id = prima.id;
    await sbUpdate(auth.token, id, vDopo);
    applicaProspectLocale(id, vDopo);
    cronologia.registra(azioneModifica({
      etichetta,
      leggi: () => sbGetProspect(cronologia.token(), id),
      scrivi: async v => { await sbUpdate(cronologia.token(), id, v); applicaProspectLocale(id, v); },
      prima: vPrima, dopo: vDopo,
    }));
    return true;
  }

  async function creaProspect(np, ownerId, etichetta) {
    const r = await sbInsert(auth.token, toDB(np, ownerId));
    const creata = (Array.isArray(r) ? r[0] : r) || toDB(np, ownerId);
    aggiungiProspectLocale(creata);
    const id = creata.id;
    cronologia.registra(azioneCreazione({
      etichetta,
      leggi: () => sbGetProspect(cronologia.token(), id),
      cancella: async () => { await sbDelete(cronologia.token(), id); rimuoviProspectLocale(id); },
      reinserisci: async riga => { await sbInsert(cronologia.token(), riga); aggiungiProspectLocale(riga); },
      riga: creata,
    }));
  }

  async function eliminaProspect(p, etichetta) {
    // Istantanea della riga GREZZA prima di cancellare: toApp non conserva ne' user_id ne'
    // created_at, quindi ripristinare dalla copia in memoria cambierebbe proprietario e
    // posizione in lista. Se non si riesce a leggerla la cancellazione avviene comunque,
    // semplicemente non sara' annullabile.
    let riga = null;
    try { riga = await sbGetProspect(auth.token, p.id); } catch(e) {}
    await sbDelete(auth.token, p.id);
    rimuoviProspectLocale(p.id);
    if (!riga) return;
    const id = p.id;
    cronologia.registra(azioneCancellazione({
      etichetta,
      leggi: () => sbGetProspect(cronologia.token(), id),
      cancella: async () => { await sbDelete(cronologia.token(), id); rimuoviProspectLocale(id); },
      reinserisci: async r => { await sbInsert(cronologia.token(), r); aggiungiProspectLocale(r); },
      riga,
    }));
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
        const assignTo = form._assignTo || auth.userId;
        const np={...record,id:genId()};
        await creaProspect(np, assignTo, "Nuovo prospect: " + nomeProspect(np));
        showToast(assignTo===auth.userId?"Prospect aggiunto ":"Prospect assegnato a "+((downline.find(m=>m.id===assignTo)?.nome)||"membro"));
      } else {
        const prima = data.find(p=>p.id===record.id) || dlProspects.find(p=>p.id===record.id) || { ...record, _userId: ownerId };
        await scriviProspect(prima, record, "Anagrafica di " + nomeProspect(record));
        showToast("Aggiornato ");
      }
    } catch(e) { showToast("Errore: "+e.message,"#ef4444"); }
    setSaving(false); closeModal();
  }

  async function deleteProp(id) {
    try {
      const p = data.find(x=>x.id===id) || dlProspects.find(x=>x.id===id) || { id };
      await eliminaProspect(p, "Eliminato: " + nomeProspect(p));
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
      await creaProspect(np, auth.userId, "Prospect da Lista Nomi: " + nomeProspect(np));
      showToast((np.nome||"")+" aggiunto ai prospect");
    } catch(e) { showToast("Errore: "+e.message,"#ef4444"); }
  }

  // ── Griglia prospect (vista foglio) ──────────────────────────────
  // Spunta/toglie UNA fase senza toccare le altre: a differenza di buildStorico
  // qui NON si riempiono i buchi, perche' la griglia deve poter rappresentare
  // "ha fatto FUP1 ma non la conoscitiva". Il riempimento automatico al login e'
  // gia' disattivato dal flag profiles.storico_migrato.
  // La fase corrente resta un valore derivato (la piu' avanzata spuntata) perche'
  // colori, contatori della sidebar e ordinamenti la usano ovunque. Se il prospect
  // e' in una fase speciale (Da risentire, Non int., Rimborso) la fase NON viene
  // sovrascritta: quello stato e' una decisione presa, non un punto del percorso.
  // Un leader puo' modificare anche i prospect della propria downline: in modalita'
  // Team la griglia mostra solo quelli, quindi il perimetro e' gia' quello giusto.
  // NB: e' un cancello di comodita' lato UI, non una barriera di sicurezza — le
  // policy RLS su prospects sono scritte per ruolo, non per struttura.
  function puoModificareGriglia(p) {
    return !p._userId || p._userId === auth.userId || !!auth?.profile?.is_leader;
  }

  async function toggleFaseGrid(p, fase, spuntata) {
    if (!puoModificareGriglia(p)) return;
    const senza = (p.storico||[]).filter(s=>s.fase!==fase);
    const storico = spuntata
      ? [...senza, {fase, data: today()}].sort((a,b)=>FASI_FUNNEL.indexOf(a.fase)-FASI_FUNNEL.indexOf(b.fase))
      : senza;
    const nuovaFase = FASI_SPECIALI.includes(p.fase) ? p.fase : highestReached({storico});
    const upd = {...p, fase:nuovaFase, storico};
    // il proprietario resta p._userId: lo garantisce scriviProspect (passare auth.userId
    // trasferirebbe il prospect al leader che lo modifica, togliendolo al titolare)
    try {
      await scriviProspect(p, upd, FASE_LABEL[fase] + (spuntata ? " spuntato" : " tolto") + " \u00b7 " + nomeProspect(p));
    } catch(e) { showToast("Errore: "+e.message,"#ef4444"); }
  }

  async function salvaNoteGrid(p, note) {
    if (!puoModificareGriglia(p)) return;
    if ((p.note||"") === (note||"")) return; // niente scrittura se non e' cambiato nulla
    const upd = {...p, note};
    try {
      await scriviProspect(p, upd, "Nota di " + nomeProspect(p));
    } catch(e) { showToast("Errore: "+e.message,"#ef4444"); }
  }

  async function advanceFase(p) {
    const i=FASI_FUNNEL.indexOf(p.fase);
    if (i<0||i>=FASI_FUNNEL.length-1) return;
    const next=FASI_FUNNEL[i+1];
    const storico=buildStorico(p,next,today());
    const upd={...p,fase:next,storico};
    try {
      await scriviProspect(p, upd, "Avanzato a " + FASE_LABEL[next] + " \u00b7 " + nomeProspect(p));
      setSel(upd); showToast("→ "+FASE_LABEL[next]);
    } catch(e) { showToast("Errore: "+e.message,"#ef4444"); }
  }

  async function moveFase(p,fase) {
    const newFase=fase==="RIATTIVA"?highestReached(p):fase;
    const upd={...p,fase:newFase};
    try {
      await scriviProspect(p, upd, (FASE_LABEL[newFase] || newFase) + " \u00b7 " + nomeProspect(p));
      setSel(upd);
      showToast(fase==="DA_RISENTIRE"?" Da risentire":fase==="DA_RIFISSARE"?" Da rifissare":fase==="NON_INT"?" Non interessato":fase==="NON_PIACE"?" Non mi piace":"↩ Riattivato",
        fase==="DA_RISENTIRE"?"#c084fc":fase==="DA_RIFISSARE"?"#6366f1":fase==="NON_INT"?"#6b7280":fase==="NON_PIACE"?"#ec4899":"var(--a1)");
    } catch(e) { showToast("Errore: "+e.message,"#ef4444"); }
  }

  async function updateProfilo(id,profilazione) {
    const p=data.find(x=>x.id===id)||dlProspects.find(x=>x.id===id); if (!p) return;
    const upd={...p,profilazione};
    try {
      await scriviProspect(p, upd, "Profilazione di " + nomeProspect(p));
      setSel(upd);
    } catch(e) { showToast("Errore salvataggio","#ef4444"); }
  }

  async function updateChecklist(id, checklist) {
    const p=data.find(x=>x.id===id)||dlProspects.find(x=>x.id===id); if (!p) return;
    const upd={...p,checklist};
    try {
      await scriviProspect(p, upd, "Checklist di " + nomeProspect(p));
      setSel(upd);
    } catch(e) { showToast("Errore salvataggio","#ef4444"); }
  }

  // Collega (o scollega, con profileId=null) un prospect SUB al profilo membro in cui si è
  // registrato — così il Rimborso può trovare e cancellare anche il BV dell'iscrizione originale,
  // ovunque si trovi (nella lista tua o di un altro downline), non solo i CV che il membro produce.
  async function linkProfilo(prospectId, profileId) {
    const p=data.find(x=>x.id===prospectId)||dlProspects.find(x=>x.id===prospectId); if (!p) return;
    const upd={...p,convertedProfileId:profileId};
    try {
      await scriviProspect(p, upd, (profileId ? "Collegamento di " : "Scollegamento di ") + nomeProspect(p));
      setSel(upd);
      showToast(profileId?"Collegato al membro":"Scollegato");
    } catch(e) { showToast("Errore salvataggio","#ef4444"); }
  }

  async function deleteStorico(id, faseToRemove) {
    const p=data.find(x=>x.id===id)||dlProspects.find(x=>x.id===id); if (!p) return;
    const newStorico = p.storico.filter(s=>s.fase!==faseToRemove);
    // Calcola la nuova fase (l'ultima rimasta nello storico)
    const FASI_ORDER = ["INVITO","FISSATO","CONOSCITIVA","FUP1","FUP2","PACK","CLOSING","SUB","DA_RISENTIRE","DA_RIFISSARE","NON_INT","NON_PIACE"];
    const lastFase = newStorico.reduce((best, s) => {
      const bi = FASI_ORDER.indexOf(best);
      const si = FASI_ORDER.indexOf(s.fase);
      return si > bi ? s.fase : best;
    }, newStorico[0]?.fase || "INVITO");
    const upd = {...p, storico:newStorico, fase:lastFase};
    try {
      await scriviProspect(p, upd, "Rimossa " + (FASE_LABEL[faseToRemove] || faseToRemove) + " \u00b7 " + nomeProspect(p));
      setSel(upd);
      showToast("Fase rimossa");
    } catch(e) { showToast("Errore","#ef4444"); }
  }

  async function updateStoricoData(id, fase, newData, newFase, newStorico) {
    const p=data.find(x=>x.id===id)||dlProspects.find(x=>x.id===id); if (!p) return;
    const updStorico = newStorico || p.storico.map(s=>s.fase===fase?{...s,data:newData}:s);
    const updFase = newFase || p.fase;
    const upd = {...p, storico:updStorico, fase:updFase};
    try {
      await scriviProspect(p, upd, "Data storico di " + nomeProspect(p));
      setSel(upd);
      showToast("Aggiornato");
    } catch(e) { showToast("Errore","#ef4444"); }
  }

  async function toggleLeader(memberId, isLeader) {
    try {
      await sbUpdateProfile(auth.token, memberId, { is_leader: isLeader });
      setDownline(d => d.map(m => m.id===memberId ? {...m, is_leader:isLeader} : m));
      showToast(isLeader ? "Promosso a Leader" : "Rimosso da Leader");
    } catch(e) { showToast("Errore: "+e.message,"#ef4444"); }
  }

  async function toggleMarketerUnlocked(memberId, unlocked) {
    try {
      await sbUpdateProfile(auth.token, memberId, { marketer_unlocked: unlocked });
      setDownline(d => d.map(m => m.id===memberId ? {...m, marketer_unlocked:unlocked} : m));
      showToast(unlocked ? "Marketer sbloccato" : "Marketer bloccato");
    } catch(e) { showToast("Errore: "+e.message,"#ef4444"); }
  }

  // Cambia solo lo stato (attivo/mollato/riattiva) — nessuna cancellazione dati.
  // Usato per "Mollato" e per il tasto "Riattiva" su un membro rimborsato o mollato.
  async function setStatoMembro(memberId, stato) {
    if (memberId === auth.userId) { showToast("Non puoi farlo sul tuo account","#ef4444"); return; }
    try {
      await sbUpdateProfile(auth.token, memberId, { stato_membro: stato });
      setDownline(d => d.map(m => m.id===memberId ? {...m, stato_membro:stato} : m));
      showToast(stato==="attivo" ? "Membro riattivato" : "Membro segnato come mollato");
    } catch(e) { showToast("Errore: "+e.message,"#ef4444"); }
  }

  // Rimborso: cancella davvero (DELETE) tutti i CV che quel membro ha prodotto nel ciclo indicato,
  // poi lo marca come rimborsato. Irreversibile sui dati — la conferma va chiesta PRIMA di chiamare
  // questa funzione (vedi dialog in Team.jsx), qui si esegue e basta.
  async function rimborsaMembro(memberId, ciclo) {
    try {
      // CV prodotti dal membro nel ciclo selezionato — non cancellati, spostati in fase "Rimborso":
      // restano nell'anagrafica/lista prospect (come Non Int./Da rifissare), ma sono esclusi da
      // ogni calcolo aggregato (vedi isProspectAttivo, usato ovunque prima di teamStats/funnel).
      const cvMembro = dlProspects.filter(p => p._userId===memberId && Number(cicloOfDate(p.conosciutoAt))===Number(ciclo) && p.fase!=="RIMBORSO");
      // Il prospect (SUB) collegato manualmente a questo membro — è la sua iscrizione originale,
      // può stare nella tua lista personale o in quella di un altro downline: va spostato sempre,
      // a prescindere dal ciclo selezionato, perché è identificato esplicitamente.
      const iscrizioneCollegata = [...data, ...dlProspects].filter(p => p.convertedProfileId===memberId && p.fase!=="RIMBORSO");
      const daSpostare = [...cvMembro, ...iscrizioneCollegata];
      if (daSpostare.length > 0) {
        const ids = [...new Set(daSpostare.map(p=>p.id))];
        await sbUpdateMany(auth.token, ids, { fase: "RIMBORSO" });
        const idsSet = new Set(ids);
        setData(d => d.map(p => idsSet.has(p.id) ? {...p, fase:"RIMBORSO"} : p));
        setDlProspects(d => d.map(p => idsSet.has(p.id) ? {...p, fase:"RIMBORSO"} : p));
      }
      await sbUpdateProfile(auth.token, memberId, { stato_membro: "rimborsato" });
      setDownline(d => d.map(m => m.id===memberId ? {...m, stato_membro:"rimborsato"} : m));
      showToast(daSpostare.length>0 ? "Rimborsato — "+daSpostare.length+" CV spostati in Rimborso" : "Rimborsato");
    } catch(e) { showToast("Errore: "+e.message,"#ef4444"); }
  }


  // Cambio di aspetto (chiaro/scuro). UNICO punto da cui passano sia l'interruttore nella
  // sidebar sia i due pulsanti in Profilo. E' OTTIMISTICO: lo stato cambia subito e il
  // salvataggio segue. Aspettare il database prima di cambiare farebbe sentire lo
  // switch lento; e cambiare solo i colori senza aggiornare il profilo (come faceva
  // Profilo) lascia la pagina a meta' se il salvataggio fallisce: variabili chiare ma
  // toni delle fasi scuri, fino al ricaricamento. Qui, se il salvataggio fallisce, si
  // torna indietro davvero, con un messaggio.
  // `valore` opzionale: Profilo passa "chiaro" o "scuro", la sidebar niente (alterna).
  async function cambiaAspetto(valore) {
    if (!auth || aspettoInCorso.current) return;
    const prima = auth.profile?.aspetto === "chiaro" ? "chiaro" : "scuro";
    const nuovo = valore === "chiaro" || valore === "scuro" ? valore : (prima === "chiaro" ? "scuro" : "chiaro");
    if (nuovo === prima) return;
    const imposta = val => setAuth(a => {
      if (!a) return a;
      const updated = { ...a, profile: { ...(a.profile || {}), aspetto: val } };
      if (localStorage.getItem("becrm_session")) localStorage.setItem("becrm_session", JSON.stringify(updated));
      return updated;
    });
    aspettoInCorso.current = true;
    imposta(nuovo);
    try {
      await sbUpdateProfile(auth.token, auth.userId, { aspetto: nuovo });
    } catch(e) {
      imposta(prima);
      showToast(/aspetto/i.test(e.message)
        ? "Aspetto non salvato: manca la colonna 'aspetto' su Supabase (serve la SQL)"
        : "Aspetto non salvato: " + e.message, "#ef4444");
    } finally {
      aspettoInCorso.current = false;
    }
  }

  async function updateProfile(fields, silent) {
    try {
      await sbUpdateProfile(auth.token, auth.userId, fields);
      const newProfile = { ...auth.profile, ...fields };
      setAuth(a => {
        const updated = { ...a, profile: newProfile };
        const saved = localStorage.getItem("becrm_session");
        if (saved) localStorage.setItem("becrm_session", JSON.stringify(updated));
        return updated;
      });
      if (!silent) showToast("Profilo aggiornato ");
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

  // Membri attivi (esclude rimborsato/mollato) — usato SOLO per i numeri aggregati
  // (KPI dashboard, statistiche team, mappa). Le liste/dettagli restano sempre sull'intera downline:
  // sponsor/upline devono continuare a vedere tutto quello che un membro rimborsato/mollato aveva.
  const downlineAttiva = downline.filter(isAttivo);
  const dlProspectsAttivi = dlProspects.filter(p => downlineAttiva.some(m => m.id === p._userId));

  // Dati da usare nella dashboard in base alla modalità
  const dashData = (dashMode === "team" ? [...data, ...dlProspectsAttivi] : data).filter(isProspectAttivo);

  const cd    = dataByCiclo(dashData, dashCiclo);
  const cdSub = cd.filter(p=>p.fase==="SUB");
  const cdAct = cd.filter(p=>["CONOSCITIVA","FUP1","FUP2","PACK","CLOSING"].includes(p.fase));
  const cdFU  = dashData.filter(p=>p.fase==="DA_RISENTIRE"||p.fase==="DA_RIFISSARE");
  const cdNI  = cd.filter(p=>p.fase==="NON_INT"||p.fase==="NON_PIACE");
  const cdConv= cd.length?Math.round(cdSub.length/cd.length*100):0;
  // Forza di chiusura: su chi è DAVVERO arrivato a Closing (reachedEver copre anche chi
  // è poi avanzato a Iscritto, non solo chi è fermo lì ora), quanti hanno chiuso.
  // Diversa da cdConv: cdConv misura se il funnel intero rende, questa misura la sola
  // abilità di chiusura, indipendente da quanti entrano a monte.
  const cdChiusi = cd.filter(p=>reachedEver(p,"CLOSING"));
  const cdForzaChiusura = cdChiusi.length?Math.round(cdSub.length/cdChiusi.length*100):0;
  const totSub  = dashData.filter(p=>p.fase==="SUB").length;
  const totConv = dashData.length?Math.round(totSub/dashData.length*100):0;

  // Squadra (sinistra/destra) rispetto a ME — stessa identica logica di getTeamForMe in Team.jsx,
  // cammina sulla catena positioned_under finché non trova la posizione assegnata sotto il mio id.
  function getTeamForMe(member) {
    const pos = positions.find(p => p.member_id===member.id && p.upline_id===auth.userId);
    if (pos) return pos.team;
    const parent = downline.find(m => m.id===member.positioned_under);
    if (parent) return getTeamForMe(parent);
    return null;
  }
  const sinistraAttiva = downlineAttiva.filter(m => getTeamForMe(m)==="sinistra");
  const destraAttiva   = downlineAttiva.filter(m => getTeamForMe(m)==="destra");
  function statsSquadra(membri) {
    const ids = new Set(membri.map(m=>m.id));
    const arr = cd.filter(p => p._userId && ids.has(p._userId)); // solo prospect del team, già nel ciclo/attivi/non-rimborso
    const sub = arr.filter(p=>p.fase==="SUB");
    const act = arr.filter(p=>["CONOSCITIVA","FUP1","FUP2","PACK","CLOSING"].includes(p.fase));
    return {
      membri: membri.length, total: arr.length, act: act.length, sub: sub.length,
      conv: arr.length?Math.round(sub.length/arr.length*100):0,
      bv: sub.reduce((acc,p)=>acc+bvOfPacchetto(p.pacchetto,p.bvCustom),0),
    };
  }
  const squadre = dashMode==="team" ? { sinistra: statsSquadra(sinistraAttiva), destra: statsSquadra(destraAttiva) } : null;
  const urgenti = data.filter(p=>(isOver(p.followUp)||isToday(p.followUp))&&p.fase!=="NON_INT"&&p.fase!=="NON_PIACE"&&p.fase!=="DA_RIFISSARE"&&p.fase!=="RIMBORSO");
  const funnelCounts=FASI_DASH.map(f=>({f,n:cd.filter(p=>p.fase===f).length}));
  const funnelMax=Math.max(cd.length,1);

  // Prospect del team con owner name
  const teamProspects = dlProspects.map(p => {
    const owner = downline.find(m => m.id === p._userId);
    return { ...p, _ownerName: owner ? (owner.nome||owner.email)+" "+(owner.cognome||"") : "" };
  });

  // Insight del Mentore: personal + team combinati, ricalcolati ad ogni cambio dati
  const cicloRangeCorrente = CICLI.find(c => c[0] === CICLO_CORRENTE);
  const tuttiProspectMentore = [...data.map(p => ({ ...p, _userId: auth?.userId })), ...teamProspects].filter(isProspectAttivo);
  const mentoreInsights = auth ? computeMentoreInsights(tuttiProspectMentore, downlineAttiva, cicloRangeCorrente, allProfiles, auth.userId) : null;

  function squadraOf(p) {
    if (!p._userId) return null; // prospect personale, non ha una squadra
    const m = downline.find(x => x.id === p._userId);
    return m ? getTeamForMe(m) : null;
  }
  const listaSource = listaMode === "team" ? teamProspects : data;
  const listaData=listaSource.filter(p=>{
    const q=search.toLowerCase();
    return (!q||(p.nome+" "+p.cognome+" "+(p.citta||"")).toLowerCase().includes(q))
      &&(!fFase||p.fase===fFase)&&(!fFonte||p.fonte===fFonte)
      &&(!fCiclo||cicloOfDate(p.conosciutoAt)===Number(fCiclo))
      &&(!fCitta||( p.citta||"").toLowerCase().includes(fCitta.toLowerCase()))
      &&(!fInteresse||p.interesse===fInteresse)
      &&(!fPercorso||(fPercorso==="in_percorso"?FASI_FUNNEL.includes(p.fase):FASI_SPECIALI.includes(p.fase)))
      &&(!fMembro||p._userId===fMembro||(!p._userId&&fMembro===auth.userId))
      &&(!fSquadra||squadraOf(p)===fSquadra);
  });

  const FASI_ORDER_ALL = [...FASI_FUNNEL, ...FASI_SPECIALI];
  const listaDataSorted = [...listaData].sort((a,b)=>{
    if (sortBy==="fase") {
      // Ordine funnel invertito: ISCRITTO (più avanti) in cima, INVITO in fondo.
      // Le fasi speciali (indice >= FASI_FUNNEL.length in FASI_ORDER_ALL) restano
      // sempre dopo il funnel, sia in ordine normale che invertito: per questo si
      // usa un indice "fuori scala" fisso invece di invertire anche la loro posizione.
      const rawA = FASI_ORDER_ALL.indexOf(a.fase);
      const rawB = FASI_ORDER_ALL.indexOf(b.fase);
      const ai = rawA < FASI_FUNNEL.length ? (FASI_FUNNEL.length - 1 - rawA) : FASI_FUNNEL.length + rawA;
      const bi = rawB < FASI_FUNNEL.length ? (FASI_FUNNEL.length - 1 - rawB) : FASI_FUNNEL.length + rawB;
      if (ai !== bi) return ai - bi;
      return (b.conosciutoAt||"").localeCompare(a.conosciutoAt||"");
    }
    if (sortBy==="data") return (b.conosciutoAt||"").localeCompare(a.conosciutoAt||"");
    if (sortBy==="alfa") {
      const an = (a.cognome||a.nome||"").toLowerCase();
      const bn = (b.cognome||b.nome||"").toLowerCase();
      return an.localeCompare(bn, "it");
    }
    if (sortBy==="followup") {
      const af = a.followUp||"9999";
      const bf = b.followUp||"9999";
      return af.localeCompare(bf);
    }
    return 0;
  });

  if (!auth) return <AuthScreen onAuth={setAuth} />;
  if (auth.profile && !isAttivo(auth.profile)) return <AccessoSospesoScreen stato={auth.profile.stato_membro} onLogout={handleLogout} />;
  if (auth.profile && !auth.profile.citta) return <CittaRequiredScreen onSave={updateProfile} onLogout={handleLogout} />;
  if (!ready) return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",background:"var(--bg)",flexDirection:"column",gap:12}}>
      <span className="spinner" style={{width:28,height:28,borderWidth:3}} />
      <span style={{fontSize:13,color:"var(--muted)"}}>Caricamento...</span>
    </div>
  );


  return (
    <div className="app-root" style={{display:"flex",flexDirection:"row",height:"100vh",width:"100vw",overflow:"hidden",background:"var(--bg)"}}>
      {toast && <div className="toast-pos" style={{position:"fixed",bottom:24,right:24,zIndex:9999,background:toast.color,color:"#fff",padding:"12px 22px",borderRadius:12,fontWeight:700,fontSize:13,boxShadow:"0 8px 30px #00000060",animation:"fadeIn .25s ease"}}>{toast.msg}</div>}
      {saving && <div style={{position:"fixed",top:14,right:14,zIndex:9998,background:"var(--bg4)",border:"1px solid var(--border2)",borderRadius:9,padding:"7px 14px",fontSize:12,color:"var(--a2)",display:"flex",alignItems:"center",gap:7}}><span className="spinner" />Salvataggio...</div>}

      {showEventoReminder && (
        <div style={{position:"fixed",inset:0,zIndex:10000,display:"flex",alignItems:"center",justifyContent:"center",background:"#00000080",backdropFilter:"blur(6px)",animation:"fadeIn .2s ease"}}
          onClick={()=>setShowEventoReminder(false)}>
          <div onClick={e=>e.stopPropagation()} style={{position:"relative",background:"linear-gradient(160deg,var(--bg2),var(--bg3))",border:"1px solid var(--a1-25)",borderRadius:20,padding:"2.2rem 2rem",maxWidth:380,width:"90%",textAlign:"center",boxShadow:"0 20px 60px #000000a0"}}>
            <button onClick={()=>setShowEventoReminder(false)}
              style={{position:"absolute",top:14,right:14,background:"var(--bg4)",border:"1px solid var(--border2)",borderRadius:8,color:"var(--muted)",width:28,height:28,cursor:"pointer",fontSize:14,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center"}}>
              X
            </button>
            <div style={{fontSize:36,marginBottom:10}}>{"\ud83d\udd25"}</div>
            <div style={{fontSize:14,color:"var(--text)",fontWeight:600,lineHeight:1.5}}>
              Hai parlato di<br/>
              <span style={{display:"inline-block",fontSize:24,fontWeight:900,color:"var(--a2)",letterSpacing:-0.5,margin:"6px 0"}}>THE MASTERY</span><br/>
              oggi?
            </div>
          </div>
        </div>
      )}

      <MentoreChatWidget insights={mentoreInsights} />

      <button className="hamburger-btn" onClick={()=>setMobileDrawerOpen(true)} aria-label="Apri menu"
        style={{position:"fixed",top:14,left:14,zIndex:900,width:38,height:38,borderRadius:10,background:"var(--bg2)",border:"1px solid var(--border)",color:"var(--text)",fontSize:16,cursor:"pointer",alignItems:"center",justifyContent:"center"}}>
        &#9776;
      </button>

      <div className="drawer-scrim" onClick={()=>setMobileDrawerOpen(false)} style={{position:"fixed",inset:0,zIndex:1700,background:"#00000090",opacity:mobileDrawerOpen?1:0,pointerEvents:mobileDrawerOpen?"auto":"none",transition:"opacity .2s ease"}} />

      <Sidebar view={view} setView={v=>{setView(v);setMobileDrawerOpen(false);}} data={data} urgenti={urgenti} onAdd={()=>{openAdd();setMobileDrawerOpen(false);}} onExport={onExport} auth={auth} onLogout={handleLogout} downlineCount={downlineAttiva.length} appMode={appMode} setAppMode={m=>{setAppMode(m);setMobileDrawerOpen(false);}} showToast={showToast} aspetto={aspetto} onCambiaAspetto={cambiaAspetto} drawerOpen={mobileDrawerOpen} onCloseDrawer={()=>setMobileDrawerOpen(false)} />

      <main className="mc" style={{flex:1,overflowY:"auto",height:"100vh",paddingBottom:0}}>
        {(appMode==="cliente" || !(auth?.profile?.marketer_unlocked || auth?.profile?.is_leader)) ? (
          <ClienteView auth={auth} onUpdateProfile={updateProfile} allProfiles={allProfiles} positions={positions} />
        ) : (
          <>
            {view==="dash"  && <Dash cd={cd} cdSub={cdSub} cdAct={cdAct} cdFU={cdFU} cdNI={cdNI} cdConv={cdConv} cdChiusi={cdChiusi} cdForzaChiusura={cdForzaChiusura} totSub={totSub} totConv={totConv} totAll={dashData.length} funnelCounts={funnelCounts} funnelMax={funnelMax} urgenti={urgenti} dashCiclo={dashCiclo} setDashCiclo={setDashCiclo} onOpen={openDetail} dashMode={dashMode} setDashMode={setDashMode} hasTeam={dlProspects.length>0} ticketVenduti={ticketVendutiCount} mentoreInsights={mentoreInsights} squadre={squadre} />}
            {view==="lista" && <Lista prospects={listaDataSorted} total={listaMode==="team"?teamProspects.length:data.length} search={search} setSearch={setSearch} fFase={fFase} setFFase={setFFase} fFonte={fFonte} setFFonte={setFFonte} fCiclo={fCiclo} setFCiclo={setFCiclo} fCitta={fCitta} setFCitta={setFCitta} fInteresse={fInteresse} setFInteresse={setFInteresse} fPercorso={fPercorso} setFPercorso={setFPercorso} fMembro={fMembro} setFMembro={setFMembro} fSquadra={fSquadra} setFSquadra={setFSquadra} sortBy={sortBy} setSortBy={setSortBy} downline={downline} auth={auth} onOpen={openDetail} onAdd={openAdd} onToggleFase={toggleFaseGrid} onSaveNote={salvaNoteGrid} cronologia={cronologia} listaMode={listaMode} setListaMode={m=>{setListaMode(m);if(m==="personale"){setFMembro("");setFSquadra("");}}} hasTeam={dlProspects.length>0} />}
            {view==="stats"   && <Statistiche data={data} dlProspects={dlProspectsAttivi} auth={auth} allProfiles={allProfiles} positions={positions} />}
            {view==="team"    && <TeamView auth={auth} downline={downline} dlProspects={dlProspects} onAssignTeam={assignTeam} onAddManual={addDownlineManually} positions={positions} onOpenProspect={openDetail} onPositionInTree={positionInTree} onToggleLeader={toggleLeader} onToggleMarketer={toggleMarketerUnlocked} onSetStatoMembro={setStatoMembro} onRimborsaMembro={rimborsaMembro} />}
            {view==="nomi"    && <ListaNomiView auth={auth} onInvitaProspect={invitaProspect} cronologia={cronologia} />}
            {view==="eventi"  && <EventiView auth={auth} allProfiles={allProfiles} downline={downline} positions={positions} showToast={showToast}
              sbListEventi={sbListEventi}
              sbListEventoPersone={sbListEventoPersone} sbInsertEventoPersona={sbInsertEventoPersona}
              sbUpdateEventoPersona={sbUpdateEventoPersona} sbDeleteEventoPersona={sbDeleteEventoPersona}
              sbGetEventoPersona={sbGetEventoPersona} cronologia={cronologia}
              LUDOVICO_ID={LUDOVICO_ID} onTicketCountChange={setTicketVendutiCount} />}
            {view==="profilo" && <ProfiloView auth={auth} onUpdateProfile={updateProfile} onCambiaAspetto={cambiaAspetto} downlineCount={downlineAttiva.length} showToast={showToast} />}
          </>
        )}
      </main>

      {/* Mobile bottom nav - shown via CSS on mobile only */}
      <nav className="mobnav" style={{position:"fixed",bottom:0,left:0,right:0,height:60,background:"var(--bg2)",borderTop:"1px solid var(--border)",alignItems:"center",justifyContent:"space-around",zIndex:500,padding:"0 4px"}}>
        {[
          {id:"dash",label:"Home"},
          {id:"lista",label:"Prospect",badge:data.length},
          {id:"team",label:"Team",badge:downlineAttiva.length||0},
          {id:"nomi",label:"Lista"},
          {id:"eventi",label:"Eventi"},
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
              ? <DetailModal p={sel} onEdit={()=>{setForm({...sel});setModal("edit");}} onAdvance={()=>advanceFase(sel)} onFollowUp={()=>moveFase(sel,"DA_RISENTIRE")} onNonInt={()=>moveFase(sel,"NON_INT")} onNonPiace={()=>moveFase(sel,"NON_PIACE")} onDaRifissare={()=>moveFase(sel,"DA_RIFISSARE")} onRiattiva={()=>moveFase(sel,"RIATTIVA")} onClose={closeModal} onUpdateProfilo={pr=>updateProfilo(sel.id,pr)} onUpdateChecklist={cl=>updateChecklist(sel.id,cl)} downline={downline} onLinkProfilo={linkProfilo} />
              : <FormModal form={form} setForm={setForm} onSave={saveForm} onClose={closeModal} onDelete={modal==="edit"?()=>deleteProp(form.id):null} isEdit={modal==="edit"} auth={auth} downline={downline} />
            }
          </div>
        </div>
      )}
    </div>
  );
}

//  SIDEBAR 
function Sidebar({ view, setView, data, urgenti, onAdd, onExport, auth, onLogout, downlineCount, appMode, setAppMode, showToast, aspetto, onCambiaAspetto, drawerOpen, onCloseDrawer }) {
  const marketerAllowed = !!(auth?.profile?.marketer_unlocked || auth?.profile?.is_leader);
  const navs = [
    { id:"dash",    icon:"", label:"Dashboard" },
    { id:"lista",   icon:"", label:"Prospect", badge:data.length },
    { id:"stats",   icon:"", label:"Statistiche" },
    { id:"team",    icon:"", label:"Team", badge:downlineCount||0 },
    { id:"nomi",    icon:"", label:"Lista Nomi" },
    { id:"eventi",  icon:"", label:"Eventi" },
    { id:"profilo", icon:"", label:"Profilo" },
  ];
  return (
    <aside className={"sb"+(drawerOpen?" drawer-open":"")} style={{width:222,minWidth:222,background:"var(--bg2)",borderRight:"1px solid var(--border)",padding:"1.5rem .9rem",display:"flex",flexDirection:"column",gap:4,height:"100vh",overflowY:"auto"}}>
      <div style={{marginBottom:14,paddingLeft:4,display:"flex",alignItems:"center",justifyContent:"space-between",gap:8}}>
        <div style={{display:"flex",alignItems:"center",gap:9,minWidth:0}}>
          <div style={{width:30,height:30,borderRadius:"50%",flexShrink:0,background:"var(--bg3)",border:"1px solid var(--border)",display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden",padding:2}}>
            <img src="/kairos-logo.png" alt="Kairos" style={{width:"100%",height:"100%",objectFit:"contain",display:"block"}} />
          </div>
          <div style={{fontWeight:900,fontSize:15,color:"var(--text)",lineHeight:1.2,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>Kairos CRM</div>
        </div>
        <button className="hamburger-btn" onClick={onCloseDrawer} aria-label="Chiudi menu"
          style={{width:26,height:26,borderRadius:7,background:"var(--bg3)",border:"1px solid var(--border)",color:"var(--muted)",fontSize:13,cursor:"pointer",alignItems:"center",justifyContent:"center"}}>
          &#10005;
        </button>
      </div>

      <div style={{display:"flex",background:"var(--bg3)",borderRadius:9,padding:3,marginBottom:20,border:"1px solid var(--border)"}}>
        {[{id:"marketer",label:"Marketer"},{id:"cliente",label:"Onboarding"}].map(m=>{
          const locked = m.id==="marketer" && !marketerAllowed;
          return (
            <button key={m.id} onClick={()=>{ if (locked) { showToast && showToast("In attesa di sblocco dal tuo leader","#f59e0b"); return; } setAppMode(m.id); }}
              title={locked?"In attesa di sblocco dal tuo leader":undefined}
              style={{flex:1,padding:"6px 8px",borderRadius:7,border:"none",cursor:"pointer",fontSize:11,fontWeight:800,fontFamily:"inherit",transition:"all .2s",background:appMode===m.id&&!locked?"var(--bg4)":"transparent",color:locked?"var(--border2)":appMode===m.id?"var(--a2)":"var(--muted)",boxShadow:appMode===m.id&&!locked?"inset 0 0 0 1px var(--sidebar-border)":"none",opacity:locked?0.6:1}}>
              {locked?"\ud83d\udd12 ":""}{m.label}
            </button>
          );
        })}
      </div>

      {appMode==="marketer" && marketerAllowed && navs.map(item=>(
        <button key={item.id} onClick={()=>setView(item.id)}
          style={{display:"flex",alignItems:"center",gap:9,width:"100%",padding:"10px 12px",background:view===item.id?"var(--bg4)":"transparent",boxShadow:view===item.id?"inset 0 0 0 1px var(--sidebar-border)":"none",color:view===item.id?"var(--a2)":"var(--muted)",borderRadius:10,cursor:"pointer",fontSize:13,fontWeight:600,textAlign:"left",border:"none",transition:"all .2s"}}>
          <span>{item.icon}</span>{item.label}
          {item.badge>0 && <span style={{marginLeft:"auto",background:"var(--a1-12)",color:"var(--a2)",borderRadius:99,padding:"1px 8px",fontSize:11,fontWeight:700}}>{item.badge}</span>}
        </button>
      ))}

      {appMode==="marketer" && marketerAllowed && (
      <button onClick={onAdd} style={{marginTop:14,padding:"10px",fontSize:13,fontWeight:800,background:"linear-gradient(135deg,var(--a1),var(--a2))",color:"#fff",border:"none",borderRadius:10,cursor:"pointer"}}>
        + Nuovo Prospect
      </button>
      )}

      {appMode==="marketer" && marketerAllowed && urgenti.length>0 && (
        <button onClick={()=>setView("dash")} className="pulse" style={{marginTop:8,background:"#ef444412",border:"1px solid #ef444435",borderRadius:10,padding:"10px 12px",display:"flex",alignItems:"center",gap:8,color:"#f87171",fontSize:12,fontWeight:700,width:"100%",cursor:"pointer",fontFamily:"inherit",textAlign:"left"}}>
           {urgenti.length} urgent{urgenti.length===1?"e":"i"}
        </button>
      )}

      {appMode==="marketer" && marketerAllowed && (
      <div style={{borderTop:"1px solid var(--border)",paddingTop:14,marginTop:16,display:"flex",flexDirection:"column",gap:7}}>
        <div style={{fontSize:10,fontWeight:800,color:"var(--border2)",textTransform:"uppercase",letterSpacing:1.2,marginBottom:2}}>Backup</div>
        <button onClick={onExport} style={{padding:"8px 10px",background:"var(--bg4)",color:"var(--a2)",border:"1px solid var(--border2)",borderRadius:9,cursor:"pointer",fontWeight:700,fontSize:12,textAlign:"left"}}> Esporta JSON</button>
      </div>
      )}

      <div style={{marginTop:14,paddingTop:14,borderTop:"1px solid var(--border)"}}>
        {/* Interruttore chiaro/scuro. Acceso = aspetto chiaro. E' un <button role="switch">,
            non un checkbox: cosi' e' raggiungibile da tastiera e letto correttamente dagli
            screen reader, e non porta con se' lo stile nativo del browser. I colori sono
            variabili, quindi lo switch si vede bene in entrambi gli aspetti. */}
        <button type="button" role="switch" aria-checked={aspetto==="chiaro"} onClick={()=>onCambiaAspetto()}
          title={aspetto==="chiaro"?"Passa all'aspetto scuro":"Passa all'aspetto chiaro"}
          style={{width:"100%",display:"flex",alignItems:"center",gap:9,padding:"7px 8px",marginBottom:10,background:"var(--bg3)",border:"1px solid var(--border)",borderRadius:9,cursor:"pointer",fontFamily:"inherit"}}>
          <span style={{display:"flex",color:"var(--muted)"}}>
            {aspetto==="chiaro"
              ? <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><circle cx="12" cy="12" r="4.2" fill="none" stroke="currentColor" strokeWidth="2"/><path d="M12 2.5v2.6M12 18.9v2.6M2.5 12h2.6M18.9 12h2.6M5.3 5.3l1.9 1.9M16.8 16.8l1.9 1.9M18.7 5.3l-1.9 1.9M7.2 16.8l-1.9 1.9" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
              : <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5a8.5 8.5 0 1 0 10.7 10.7z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/></svg>}
          </span>
          <span style={{flex:1,textAlign:"left",fontSize:12,fontWeight:600,color:"var(--muted)"}}>Aspetto chiaro</span>
          <span aria-hidden="true" style={{position:"relative",width:32,height:19,borderRadius:99,flexShrink:0,background:aspetto==="chiaro"?"var(--a1)":"var(--border2)",transition:"background .18s ease"}}>
            <span style={{position:"absolute",top:2,left:aspetto==="chiaro"?15:2,width:15,height:15,borderRadius:"50%",background:"#fff",boxShadow:"0 1px 3px #00000040",transition:"left .18s ease"}}/>
          </span>
        </button>
        <div style={{fontSize:10,color:"var(--muted)",marginBottom:6,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{auth?.email}</div>
        <button onClick={onLogout} style={{width:"100%",padding:"8px 10px",background:"#ef444415",color:"#f87171",border:"1px solid #ef444430",borderRadius:9,cursor:"pointer",fontWeight:700,fontSize:12}}>Esci</button>
      </div>
    </aside>
  );
}

//  DASHBOARD 
// Calcola sinistra/destra di memberId rispetto a un rootId qualsiasi.
// Copiata identica da Eventi.jsx / Cliente.jsx: la logica dell'albero e' gia'
// duplicata in quei due file, non la centralizzo qui per non toccare 3 file.
function getSquadraRelativeTo(rootId, memberId, allProfiles, positions, cache) {
  if (memberId === rootId) return null;
  if (cache[memberId] !== undefined) return cache[memberId];
  const pos = (positions || []).find(p => p.member_id === memberId && p.upline_id === rootId);
  if (pos) { cache[memberId] = pos.team; return pos.team; }
  const member = (allProfiles || []).find(p => p.id === memberId);
  const parent = member ? (allProfiles || []).find(p => p.id === member.positioned_under) : null;
  const result = parent && parent.id !== memberId ? getSquadraRelativeTo(rootId, parent.id, allProfiles, positions, cache) : null;
  cache[memberId] = result;
  return result;
}

function Statistiche({ data, dlProspects, auth, allProfiles, positions }) {
  const hasTeam = (dlProspects||[]).length > 0;
  const [statsMode, setStatsMode] = useState(data.length > 0 ? "personale" : (hasTeam ? "team" : "personale"));
  const [linePhase, setLinePhase] = useState("CONOSCITIVA");
  const [barCiclo,  setBarCiclo]  = useState("ALL");
  const [squadra,   setSquadra]   = useState("");

  // Il filtro squadra vive solo in modalita' Team: in Personale i prospect sono
  // tutti tuoi e tu non stai in nessuna delle tue due gambe (getSquadraRelativeTo
  // ritorna null sul root), quindi filtrerebbe sempre a zero.
  const squadraAttiva = statsMode === "team" ? squadra : "";
  const squadraCache = {};

  const activeData = (statsMode === "team" ? [...data, ...(dlProspects||[])] : data)
    .filter(isProspectAttivo)
    .filter(p => {
      if (!squadraAttiva) return true;
      if (!p._userId) return false;
      return getSquadraRelativeTo(auth?.userId, p._userId, allProfiles, positions, squadraCache) === squadraAttiva;
    });

  const cicliPresenti=[...new Set(activeData.flatMap(p=>(p.storico||[]).map(s=>cicloOfDate(s.data)).filter(Boolean)))].sort((a,b)=>a-b);
  const cicli=cicliPresenti.length?cicliPresenti:[CICLO_CORRENTE];
  const lineData=cicli.map(c=>{const row={ciclo:"C"+c};FASI_FUNNEL.forEach(f=>{row[f]=activeData.filter(p=>reachedInCiclo(p,f,c)).length;});return row;});
  const barData=FASI_FUNNEL.map(f=>{const count=barCiclo==="ALL"?activeData.filter(p=>reachedEver(p,f)).length:activeData.filter(p=>reachedInCiclo(p,f,Number(barCiclo))).length;return{fase:FASE_LABEL[f],key:f,count,fill:FASE_CLR[f]};});
  const tableRows=[...cicli].sort((a,b)=>b-a).map(c=>{const r={c};FASI_FUNNEL.forEach(f=>{r[f]=activeData.filter(p=>reachedInCiclo(p,f,c)).length;});r.conv=r.INVITO>0?Math.round(r.SUB/r.INVITO*100):r.FUP1>0?Math.round(r.SUB/r.FUP1*100):0;return r;});
  const ts={background:"var(--bg3)",border:"1px solid var(--border2)",borderRadius:8,color:"var(--text)",fontSize:12};
  const tProps={contentStyle:ts,itemStyle:{color:"var(--text)"},labelStyle:{color:"var(--text)",fontWeight:700}};
  if (!activeData.length) return <div style={{padding:"2rem 2.2rem"}}><h1 style={{fontWeight:900,fontSize:26,color:"var(--text)",marginBottom:8}}>Statistiche</h1><div style={{textAlign:"center",padding:"5rem",color:"var(--border2)"}}><div style={{fontSize:44,marginBottom:12}}></div><p>{squadraAttiva ? ("Nessun prospect nella squadra " + squadraAttiva) : hasTeam ? "Nessun dato in questa modalita — prova a switchare su Team" : "Aggiungi prospect per vedere le statistiche"}</p>{squadraAttiva && <button onClick={()=>setSquadra("")} style={{marginTop:14,padding:"8px 16px",background:"var(--bg3)",color:"var(--a2)",border:"1px solid var(--border2)",borderRadius:9,cursor:"pointer",fontWeight:700,fontSize:12,fontFamily:"inherit"}}>Mostra tutte le squadre</button>}</div></div>;
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
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            {statsMode==="team" && (
              <select value={squadra} onChange={e=>setSquadra(e.target.value)} style={{width:"auto",minWidth:150}}><option value="">Tutte le squadre</option><option value="sinistra">Sinistra</option><option value="destra">Destra</option></select>
            )}
            <select value={linePhase} onChange={e=>setLinePhase(e.target.value)} style={{width:"auto",minWidth:160}}><option value="ALL">Tutte le fasi</option>{FASI_FUNNEL.map(f=><option key={f} value={f}>{FASE_LABEL[f]}</option>)}</select>
          </div>
        </div>
        <div style={{height:300}}><ResponsiveContainer width="100%" height="100%"><LineChart data={lineData} margin={{top:5,right:10,left:-15,bottom:5}}><CartesianGrid strokeDasharray="3 3" stroke="var(--border)"/><XAxis dataKey="ciclo" stroke="var(--muted)" fontSize={12}/><YAxis stroke="var(--muted)" fontSize={12} allowDecimals={false}/><Tooltip {...tProps} cursor={{stroke:"var(--border2)"}}/>{linePhase==="ALL"?FASI_FUNNEL.map(f=><Line key={f} type="monotone" dataKey={f} name={FASE_LABEL[f]} stroke={FASE_CLR[f]} strokeWidth={2} dot={{r:3}}/>):<Line type="monotone" dataKey={linePhase} name={FASE_LABEL[linePhase]} stroke={FASE_CLR[linePhase]} strokeWidth={3} dot={{r:4}} activeDot={{r:6}}/>}{linePhase==="ALL"&&<Legend wrapperStyle={{fontSize:11}}/>}</LineChart></ResponsiveContainer></div>
      </div>
      <div style={{background:"var(--bg2)",border:"1px solid var(--border)",borderRadius:14,padding:"1.4rem",marginBottom:16}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:10}}>
          <div><div style={{fontSize:13,fontWeight:800,color:"var(--text)"}}> Conversione del percorso</div></div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            {statsMode==="team" && (
              <select value={squadra} onChange={e=>setSquadra(e.target.value)} style={{width:"auto",minWidth:150}}><option value="">Tutte le squadre</option><option value="sinistra">Sinistra</option><option value="destra">Destra</option></select>
            )}
            <select value={barCiclo} onChange={e=>setBarCiclo(e.target.value)} style={{width:"auto",minWidth:160}}><option value="ALL">Tutti i cicli</option>{[...cicli].sort((a,b)=>b-a).map(c=><option key={c} value={c}>Ciclo {c}</option>)}</select>
          </div>
        </div>
        <div style={{height:300}}><ResponsiveContainer width="100%" height="100%"><BarChart data={barData} margin={{top:5,right:10,left:-15,bottom:5}}><CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false}/><XAxis dataKey="fase" stroke="var(--muted)" fontSize={12}/><YAxis stroke="var(--muted)" fontSize={12} allowDecimals={false}/><Tooltip {...tProps} cursor={{fill:"var(--riga)"}}/><Bar dataKey="count" name="Raggiunti" radius={[6,6,0,0]}>{barData.map((e,i)=><Cell key={i} fill={e.fill}/>)}</Bar></BarChart></ResponsiveContainer></div>
        <div style={{display:"flex",gap:8,marginTop:14,flexWrap:"wrap"}}>{barData.slice(0,-1).map((b,i)=>{const next=barData[i+1];const rate=b.count>0?Math.round(next.count/b.count*100):0;return(<div key={i} style={{flex:"1 1 120px",background:"var(--bg3)",border:"1px solid var(--border)",borderRadius:9,padding:"9px 11px"}}><div style={{fontSize:10,color:"var(--muted)",fontWeight:600}}>{b.fase} → {next.fase}</div><div style={{fontSize:18,fontWeight:900,color:next.fill,marginTop:2}}>{rate}%</div></div>);})}</div>
      </div>
      <div style={{background:"var(--bg2)",border:"1px solid var(--border)",borderRadius:14,overflow:"hidden"}}>
        <div style={{padding:"1.1rem 1.4rem",borderBottom:"1px solid var(--border)"}}><div style={{fontSize:13,fontWeight:800,color:"var(--text)"}}> Cicli a confronto</div></div>
        <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",minWidth:600}}><thead><tr style={{borderBottom:"1px solid var(--border)"}}><th style={{textAlign:"left",color:"var(--muted)",fontWeight:700,fontSize:10,textTransform:"uppercase",padding:"11px 16px"}}>Ciclo</th>{FASI_FUNNEL.map(f=><th key={f} style={{textAlign:"center",color:FASE_CLR[f],fontWeight:700,fontSize:10,textTransform:"uppercase",padding:"11px 10px"}}>{FASE_LABEL[f]}</th>)}<th style={{textAlign:"center",color:"var(--muted)",fontWeight:700,fontSize:10,textTransform:"uppercase",padding:"11px 16px"}}>Conv%</th></tr></thead><tbody>{tableRows.map(r=>(<tr key={r.c} className="hrow" style={{borderBottom:"1px solid var(--riga)"}}><td style={{padding:"11px 16px"}}><span style={{background:r.c===CICLO_CORRENTE?"var(--a1-13)":"var(--border)",color:r.c===CICLO_CORRENTE?"var(--a2)":"var(--muted)",borderRadius:6,padding:"3px 9px",fontSize:11,fontWeight:700}}>C{r.c}</span></td>{FASI_FUNNEL.map(f=><td key={f} style={{textAlign:"center",padding:"11px 10px",fontWeight:700,fontSize:13,color:r[f]>0?"var(--text)":"var(--border2)"}}>{r[f]}</td>)}<td style={{textAlign:"center",padding:"11px 16px",fontWeight:800,fontSize:13,color:r.conv>=20?"#10b981":r.conv>=10?"var(--a2)":"#f59e0b"}}>{r.conv}%</td></tr>))}</tbody></table></div>
      </div>
    </div>
  );
}

//  LISTA 
// ── CHAT COUNTER ─────────────────────────────────────────────────
function FormModal({ form, setForm, onSave, onClose, onDelete, isEdit, auth, downline }) {
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
      {!isEdit && auth?.profile?.is_leader && downline?.length>0 && (
        <div style={{marginBottom:14,background:"var(--a1-13)",border:"1px solid var(--a1-25)",borderRadius:11,padding:"11px 13px"}}>
          <label style={{fontSize:11,fontWeight:700,color:"var(--a2)",textTransform:"uppercase",letterSpacing:.8,marginBottom:6,display:"block"}}> Assegna a</label>
          <select value={form._assignTo||auth.userId} onChange={e=>set("_assignTo",e.target.value)}>
            <option value={auth.userId}>Te stesso</option>
            {downline.map(m=><option key={m.id} value={m.id}>{m.nome||""} {m.cognome||""}</option>)}
          </select>
        </div>
      )}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
        <div><label style={lbl}>Nome *</label><input value={form.nome||""} onChange={e=>set("nome",e.target.value)} placeholder="Nome" /></div>
        <div><label style={lbl}>Cognome</label><input value={form.cognome||""} onChange={e=>set("cognome",e.target.value)} placeholder="Cognome" /></div>
        <div style={{gridColumn:"1/-1"}}><label style={lbl}>Citta</label><input value={form.citta||""} onChange={e=>set("citta",e.target.value)} placeholder="es. Milano" /></div>
        <div><label style={lbl}>Telefono</label><input value={form.telefono||""} onChange={e=>set("telefono",e.target.value)} placeholder="+39 333 000 0000" /></div>
        <div><label style={lbl}>Instagram</label><input value={form.instagram||""} onChange={e=>set("instagram",e.target.value)} placeholder="@username" /></div>
        <div>
          <label style={lbl}>Data di nascita</label>
          <input type="date" value={form.dataNascita||""} onChange={e=>set("dataNascita",e.target.value)} />
          {form.dataNascita && <div style={{marginTop:5,fontSize:11,color:"var(--a2)",fontWeight:700}}>{eta(form.dataNascita)} anni</div>}
        </div>
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
function DetailModal({ p, onEdit, onAdvance, onFollowUp, onNonInt, onNonPiace, onDaRifissare, onRiattiva, onClose, onUpdateProfilo, onUpdateChecklist, downline, onLinkProfilo }) {
  const [activeTab,setActiveTab]=useState("dettagli");
  const clr=FASE_CLR[p.fase];const ci=FASI_FUNNEL.indexOf(p.fase);const isSpeciale=FASI_SPECIALI.includes(p.fase);
  const od=isOver(p.followUp);const dt=isToday(p.followUp);const ciclo=cicloOfDate(p.conosciutoAt);
  const lbl={fontSize:10,fontWeight:700,color:"var(--muted)",textTransform:"uppercase",letterSpacing:.8,marginBottom:4};
  const box={background:"var(--bg3)",borderRadius:10,padding:"11px 13px",border:"1px solid var(--border)"};
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
          {p.fase==="SUB" && (
            <div style={{...box,marginBottom:9,border:"1px solid "+(p.convertedProfileId?"#8b5cf640":"var(--border)")}}>
              <div style={lbl}>Collegato a membro registrato</div>
              {p.convertedProfileId
                ? (() => {
                    const linked = downline.find(m=>m.id===p.convertedProfileId);
                    return (
                      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,flexWrap:"wrap"}}>
                        <span style={{color:"#c084fc",fontWeight:700,fontSize:13}}>{linked?(linked.nome||linked.email)+" "+(linked.cognome||""):"Membro non trovato"}</span>
                        <button onClick={()=>onLinkProfilo(p.id,null)} style={{padding:"4px 10px",background:"var(--bg4)",color:"var(--muted)",border:"1px solid var(--border2)",borderRadius:7,cursor:"pointer",fontWeight:600,fontSize:11}}>Scollega</button>
                      </div>
                    );
                  })()
                : (
                  <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
                    <select onChange={e=>{if(e.target.value)onLinkProfilo(p.id,e.target.value);}} defaultValue="" style={{flex:1,minWidth:180,fontSize:12,padding:"6px 9px"}}>
                      <option value="">Nessuno — seleziona chi si è registrato</option>
                      {downline.map(m=>(<option key={m.id} value={m.id}>{(m.nome||m.email)+" "+(m.cognome||"")}</option>))}
                    </select>
                  </div>
                )}
              <div style={{fontSize:10,color:"var(--muted)",marginTop:5,lineHeight:1.4}}>Se questa persona si è poi registrata al CRM come membro del team, collegala qui: se in futuro viene rimborsata, questo BV verrà tolto insieme ai suoi CV.</div>
            </div>
          )}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9,marginBottom:9}}>
            {[{l:"Ciclo conoscenza",v:ciclo?"Ciclo "+ciclo:"\u2014",color:ciclo===CICLO_CORRENTE?"var(--a1)":undefined},{l:"Conosciuto il",v:fmt(p.conosciutoAt)},{l:"Follow-up",v:p.followUp?(od?"Scaduto \u00b7 ":dt?"Oggi \u00b7 ":"")+fmt(p.followUp):"Non impostato",color:od?"#f87171":dt?tono("#fbbf24"):undefined},...(p.dataNascita?[{l:"Età",v:eta(p.dataNascita)+" anni"}]:[])].map(({l,v,color:col})=>(<div key={l} style={box}><div style={lbl}>{l}</div><div style={{color:col||"var(--text)",fontWeight:700,fontSize:13}}>{v}</div></div>))}
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
          {!isSpeciale&&(<div style={{borderTop:"1px solid var(--bg4)",marginTop:13,paddingTop:13,display:"flex",gap:9,flexWrap:"wrap"}}><div style={{fontSize:10,color:"var(--border2)",width:"100%",fontWeight:700,textTransform:"uppercase",letterSpacing:.8,marginBottom:2}}>Stato speciale</div>{p.fase!=="DA_RISENTIRE"&&<button onClick={onFollowUp} style={{padding:"8px 13px",background:"#c084fc16",color:tono("#d8b4fe"),border:"1px solid #c084fc38",borderRadius:9,cursor:"pointer",fontWeight:700,fontSize:12}}> Da risentire</button>}{p.fase!=="DA_RIFISSARE"&&<button onClick={onDaRifissare} style={{padding:"8px 13px",background:"#6366f116",color:tono("#a5b4fc"),border:"1px solid #6366f138",borderRadius:9,cursor:"pointer",fontWeight:700,fontSize:12}}> Da rifissare</button>}{p.fase!=="NON_INT"&&<button onClick={onNonInt} style={{padding:"8px 13px",background:"#ef444414",color:"#f87171",border:"1px solid #ef444436",borderRadius:9,cursor:"pointer",fontWeight:700,fontSize:12}}> Non interessato</button>}{p.fase!=="NON_PIACE"&&<button onClick={onNonPiace} style={{padding:"8px 13px",background:"#ec489918",color:"#f472b6",border:"1px solid #ec489938",borderRadius:9,cursor:"pointer",fontWeight:700,fontSize:12}}> Non mi piace</button>}</div>)}
        </>
      )}
      {activeTab==="profilazione"&&<ProfilazioneTab p={p} onUpdateProfilo={onUpdateProfilo}/>}
    </div>
  );
}