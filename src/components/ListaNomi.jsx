import { useState, useEffect, useRef } from "react";
import { FrecceCronologia, azioneModifica, azioneCreazione, azioneCancellazione, campiCambiati, scegliCampi } from "../shared";
import { rinnovaSessione, eTokenScaduto } from "../sessione";

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
    const msg = e.message || e.msg || res.statusText;
    // Token scaduto: rinnova (tramite il coordinatore unico di sessione.js, condiviso con
    // App.jsx) e ripete UNA volta la stessa chiamata, in modo invisibile.
    if (eTokenScaduto(res.status, msg) && opts._token && !opts._riprova) {
      let nuovo = null;
      try { nuovo = await rinnovaSessione(); } catch (err) {}
      if (nuovo) return sbFetch(path, { ...opts, _token: nuovo, _riprova: true });
    }
    throw new Error(e.message || res.statusText);
  }
  return text ? JSON.parse(text) : null;
}

const sbListaNomi = (tok, uid) => sbFetch("/rest/v1/lista_nomi?select=*&user_id=eq."+uid+"&order=created_at.desc", { _token:tok });
const sbInsertNome = (tok, row) => sbFetch("/rest/v1/lista_nomi", { method:"POST", _token:tok, body:JSON.stringify(row) });
const sbUpdateNome = (tok, id, row) => sbFetch("/rest/v1/lista_nomi?id=eq."+id, { method:"PATCH", _token:tok, body:JSON.stringify(row) });
const sbDeleteNome = (tok, id) => sbFetch("/rest/v1/lista_nomi?id=eq."+id, { method:"DELETE", _token:tok });
// Lettura di una sola riga: la usa la cronologia per verificare che nessun altro l'abbia toccata
const sbGetNome = (tok, id) => sbFetch("/rest/v1/lista_nomi?select=*&id=eq."+id, { _token:tok }).then(r => (r && r[0]) || null);

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
const JUNG = [
  { key:"blu",    label:"BLU",    sub:"Metodo e professionalita",  bg:"linear-gradient(135deg,#3b4fd4,#6366f1)", border:"#6366f1" },
  { key:"rosso",  label:"ROSSO",  sub:"Risultati",                 bg:"linear-gradient(135deg,#c2410c,#ef4444)", border:"#ef4444" },
  { key:"giallo", label:"GIALLO", sub:"Umanita e leggerezza",      bg:"linear-gradient(135deg,#b45309,#f59e0b)", border:"#f59e0b" },
  { key:"verde",  label:"VERDE",  sub:"Disposizione ad aiutare",   bg:"linear-gradient(135deg,#047857,#10b981)", border:"#10b981" },
];
const TV = [null, "-", ".", "+"];
const TC = { null:"var(--border2)", "-":"#ef4444", ".":"#f59e0b", "+":"#10b981" };
const TL = { "-":"\u2013", ".":"\u00b7", "+":"+" };

const TEMPERATURE = ["Caldo", "Tiepido", "Freddo"];
const TEMP_CLR = { Caldo:"#ef4444", Tiepido:"#f59e0b", Freddo:"#3b82f6" };

const genId = () => crypto.randomUUID();
const today = () => new Date().toISOString().split("T")[0];

function Av({ n, c, size=34 }) {
  return (
    <div style={{width:size,height:size,borderRadius:"50%",flexShrink:0,background:"linear-gradient(135deg,var(--a1),var(--a2))",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:900,fontSize:size*0.32,boxShadow:"0 0 10px var(--a1-18)"}}>
      {(n||"?")[0]}{(c||"")[0]}
    </div>
  );
}

function ProfilazionePanel({ profilazione, onChange }) {
  const pr = profilazione || { pleasures:{}, forza:{} };

  function toggle(section, key) {
    const current = pr[section]?.[key] ?? null;
    const i = TV.indexOf(current);
    const next = TV[(i+1) % TV.length];
    onChange({ ...pr, [section]: { ...(pr[section]||{}), [key]: next } });
  }

  function selectJung(key) {
    const current = Array.isArray(pr.jung) ? pr.jung : (pr.jung ? [pr.jung] : []);
    const next = current.includes(key) ? current.filter(k=>k!==key) : [...current, key];
    onChange({ ...pr, jung: next.length===0 ? null : next });
  }

  function ToggleGroup({ title, fields, section }) {
    return (
      <div style={{marginBottom:16}}>
        <div style={{fontSize:10,fontWeight:800,color:"var(--muted)",textTransform:"uppercase",letterSpacing:1.2,marginBottom:8}}>{title}</div>
        <div style={{display:"flex",flexDirection:"column",gap:6}}>
          {fields.map(f => {
            const val = pr[section]?.[f.key] ?? null;
            const clr = TC[val] || TC.null;
            return (
              <div key={f.key} style={{display:"flex",alignItems:"center",justifyContent:"space-between",background:"var(--bg3)",borderRadius:9,padding:"8px 11px",border:"1px solid "+(val!=null?clr+"40":"var(--border)")}}>
                <span style={{fontSize:12,color:val!=null?"var(--text)":"var(--muted)"}}>{f.label}</span>
                <div style={{display:"flex",gap:5}}>
                  {TV.filter(v=>v!==null).map(v => {
                    const active = val === v;
                    const vc = TC[v];
                    return (
                      <button key={v} onClick={() => {
                        const next = active ? null : v;
                        onChange({ ...pr, [section]: { ...(pr[section]||{}), [f.key]: next } });
                      }}
                        style={{width:28,height:26,borderRadius:6,border:"1.5px solid "+(active?vc:"var(--border2)"),cursor:"pointer",fontSize:13,fontWeight:900,fontFamily:"inherit",background:active?vc+"33":"var(--bg4)",color:active?vc:"var(--muted)",display:"flex",alignItems:"center",justifyContent:"center"}}>
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

  const sj = Array.isArray(pr.jung) ? pr.jung : (pr.jung ? [pr.jung] : []);
  const selectedJungs = JUNG.filter(j => sj.includes(j.key));

  return (
    <div>
      <ToggleGroup title="Pleasures" fields={PLEASURES} section="pleasures" />
      <ToggleGroup title="Punti di Forza" fields={FORZA} section="forza" />
      <div style={{marginBottom:8}}>
        <div style={{fontSize:10,fontWeight:800,color:"var(--muted)",textTransform:"uppercase",letterSpacing:1.2,marginBottom:8}}>Personalita Jung</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
          {JUNG.map(j => {
            const active = sj.includes(j.key);
            return (
              <button key={j.key} onClick={() => selectJung(j.key)}
                style={{background:active?j.bg:"var(--bg3)",border:"2px solid "+(active?j.border:"var(--border2)"),borderRadius:10,padding:"10px 12px",cursor:"pointer",textAlign:"left",transition:"all .2s"}}>
                <div style={{fontWeight:900,fontSize:13,color:active?"#fff":j.border}}>{j.label}</div>
                <div style={{fontSize:10,color:active?"rgba(255,255,255,.8)":"var(--muted)",marginTop:2}}>{j.sub}</div>
              </button>
            );
          })}
        </div>
        {selectedJungs.length>0&&<div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{selectedJungs.map(j=><div key={j.key} style={{background:j.border+"15",border:"1px solid "+j.border+"35",borderRadius:9,padding:"6px 11px",fontSize:11,color:j.border,fontWeight:700}}>{j.label} {"\u00b7"} {j.sub}</div>)}</div>}
      </div>
    </div>
  );
}

function PersonaModal({ persona, onSave, onClose, onDelete, onInvita, isEdit }) {
  const [form, setForm] = useState(persona || { nome:"", cognome:"", citta:"", telefono:"", instagram:"", note:"", profilazione:{ pleasures:{}, forza:{} }, invitato:false });
  const [tab, setTab] = useState("dati");
  const lbl = { fontSize:11, fontWeight:700, color:"var(--muted)", textTransform:"uppercase", letterSpacing:.8, marginBottom:5, display:"block" };

  return (
    <div style={{background:"var(--bg2)",border:"1px solid var(--border2)",borderRadius:16,padding:"1.6rem",maxHeight:"90vh",overflowY:"auto",boxShadow:"0 20px 70px #000000aa"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <h2 style={{fontWeight:900,fontSize:17,color:"var(--text)"}}>{isEdit?"Modifica":"+ Aggiungi"}</h2>
        <button onClick={onClose} style={{background:"var(--bg4)",color:"#7da8d8",border:"1px solid var(--border2)",borderRadius:8,cursor:"pointer",padding:"4px 10px",fontSize:14}}>X</button>
      </div>

      <div style={{display:"flex",background:"var(--bg3)",borderRadius:10,padding:4,marginBottom:16,border:"1px solid var(--border)"}}>
        {[{id:"dati",label:"Dati"},{id:"profilazione",label:"Profilazione"}].map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)}
            style={{flex:1,padding:"7px",borderRadius:8,border:"none",cursor:"pointer",fontSize:12,fontWeight:700,fontFamily:"inherit",background:tab===t.id?"var(--bg4)":"transparent",color:tab===t.id?"var(--a2)":"var(--muted)",boxShadow:tab===t.id?"inset 0 0 0 1px var(--sidebar-border)":"none"}}>
            {t.label}
          </button>
        ))}
      </div>

      {tab==="dati" && (
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
          <div><label style={lbl}>Nome</label><input value={form.nome||""} onChange={e=>setForm(f=>({...f,nome:e.target.value}))} placeholder="Mario" /></div>
          <div><label style={lbl}>Cognome</label><input value={form.cognome||""} onChange={e=>setForm(f=>({...f,cognome:e.target.value}))} placeholder="Rossi" /></div>
          <div style={{gridColumn:"1/-1"}}><label style={lbl}>Citta</label><input value={form.citta||""} onChange={e=>setForm(f=>({...f,citta:e.target.value}))} placeholder="Milano" /></div>
          <div><label style={lbl}>Telefono</label><input value={form.telefono||""} onChange={e=>setForm(f=>({...f,telefono:e.target.value}))} placeholder="+39 333 000 0000" /></div>
          <div><label style={lbl}>Instagram</label><input value={form.instagram||""} onChange={e=>setForm(f=>({...f,instagram:e.target.value}))} placeholder="@username" /></div>
          <div style={{gridColumn:"1/-1"}}><label style={lbl}>Note</label><textarea value={form.note||""} onChange={e=>setForm(f=>({...f,note:e.target.value}))} style={{height:70,resize:"vertical"}} placeholder="Note personali..." /></div>
          <div style={{gridColumn:"1/-1"}}>
            <label style={lbl}>Temperatura contatto</label>
            <div style={{display:"flex",gap:8}}>
              {TEMPERATURE.map(t=>{
                const active=form.temperatura===t;
                const color=TEMP_CLR[t];
                return(
                  <button key={t} onClick={()=>setForm(f=>({...f,temperatura:active?null:t}))}
                    style={{flex:1,padding:"9px",background:active?color+"25":"var(--bg3)",border:"2px solid "+(active?color:"var(--border2)"),borderRadius:9,cursor:"pointer",color:active?color:"var(--muted)",fontWeight:700,fontSize:13,fontFamily:"inherit",transition:"all .2s"}}>
                    {t}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {tab==="profilazione" && (
        <ProfilazionePanel profilazione={form.profilazione} onChange={pr=>setForm(f=>({...f,profilazione:pr}))} />
      )}

      <div style={{display:"flex",gap:9,justifyContent:"flex-end",flexWrap:"wrap",marginTop:8}}>
        {onDelete && <button onClick={onDelete} style={{padding:"9px 14px",background:"#ef444415",color:"#f87171",border:"1px solid #ef444438",borderRadius:9,cursor:"pointer",fontWeight:700,fontSize:13}}>Elimina</button>}
        {isEdit && !form.invitato && <button onClick={()=>onInvita(form)} style={{padding:"9px 16px",background:"#10b98120",color:"#10b981",border:"1px solid #10b98140",borderRadius:9,cursor:"pointer",fontWeight:800,fontSize:13}}>Invito fatto</button>}
        {isEdit && form.invitato && <span style={{padding:"9px 14px",fontSize:12,color:"#10b981",fontWeight:700}}>Gia invitato</span>}
        <button onClick={onClose} style={{padding:"9px 14px",background:"var(--bg4)",color:"#7da8d8",border:"1px solid var(--border2)",borderRadius:9,cursor:"pointer",fontWeight:600,fontSize:13}}>Annulla</button>
        <button onClick={()=>onSave(form)} style={{padding:"9px 20px",background:"linear-gradient(135deg,var(--a1),var(--a2))",color:"#fff",border:"none",borderRadius:9,cursor:"pointer",fontWeight:800,fontSize:13}}>
          {isEdit?"Aggiorna":"Aggiungi"}
        </button>
      </div>
    </div>
  );
}

export function ListaNomiView({ auth, onInvitaProspect, cronologia }) {
  const [lista, setLista] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [sel, setSel] = useState(null);
  const [search, setSearch] = useState("");
  const [filterTemp, setFilterTemp] = useState("");
  const [filterInvitato, setFilterInvitato] = useState("tutti");
  const [toast, setToast] = useState(null);

  function showToast(msg, color="#22d3ee") { setToast({msg,color}); setTimeout(()=>setToast(null),2800); }

  useEffect(() => {
    if (!auth) return;
    sbListaNomi(auth.token, auth.userId).then(rows => {
      setLista(rows||[]);
    }).catch(e=>showToast("Errore: "+e.message,"#ef4444")).finally(()=>setLoading(false));
  }, [auth?.userId, auth?.profile]); // non [auth]: il rinnovo orario del token crea un nuovo oggetto auth e ricaricherebbe tutto

  // ─── Scritture con cronologia ───────────────────────────────────────────────
  const selRef = useRef(sel); selRef.current = sel;
  const rigaDa = r => (Array.isArray(r) ? r[0] : r) || null;
  const leggiNome = id => () => sbGetNome(cronologia.token(), id);
  function nomeDi(x) { return (((x && x.nome) || "") + " " + ((x && x.cognome) || "")).trim() || "nome"; }
  function sincronizzaNome(riga) {
    if (!riga) return;
    setLista(l => l.some(x => x.id === riga.id) ? l.map(x => x.id === riga.id ? riga : x) : [riga, ...l]);
  }
  function rimuoviNomeLocale(id) {
    if (selRef.current && selRef.current.id === id) { setModal(null); setSel(null); }
    setLista(l => l.filter(x => x.id !== id));
  }
  // Scrive SOLO i campi davvero cambiati e registra l'azione nella cronologia.
  async function scriviNome(prima, patch, etichetta) {
    const chiavi = campiCambiati(scegliCampi(prima, Object.keys(patch)), patch);
    if (!chiavi.length) return null;
    const vPrima = scegliCampi(prima, chiavi), vDopo = scegliCampi(patch, chiavi);
    const id = prima.id;
    const riga = rigaDa(await sbUpdateNome(auth.token, id, vDopo)) || { ...prima, ...vDopo };
    sincronizzaNome(riga);
    if (cronologia) cronologia.registra(azioneModifica({
      etichetta, leggi: leggiNome(id),
      scrivi: async v => sincronizzaNome(rigaDa(await sbUpdateNome(cronologia.token(), id, v))),
      prima: vPrima, dopo: vDopo,
    }));
    return riga;
  }

  async function savPersona(form) {
    if (!form.nome?.trim()) return;
    try {
      if (modal === "add") {
        const row = { id:genId(), user_id:auth.userId, nome:form.nome, cognome:form.cognome||null, citta:form.citta||null, telefono:form.telefono||null, instagram:form.instagram||null, note:form.note||null, profilazione:form.profilazione||{}, invitato:false, temperatura:form.temperatura||null };
        const creata = rigaDa(await sbInsertNome(auth.token, row)) || row;
        sincronizzaNome(creata);
        if (cronologia) {
          const cid = creata.id;
          cronologia.registra(azioneCreazione({
            etichetta: "Aggiunto alla Lista Nomi: " + nomeDi(creata),
            leggi: leggiNome(cid),
            cancella: async () => { await sbDeleteNome(cronologia.token(), cid); rimuoviNomeLocale(cid); },
            reinserisci: async r => sincronizzaNome(rigaDa(await sbInsertNome(cronologia.token(), r)) || r),
            riga: creata,
          }));
        }
        showToast("Aggiunto");
      } else {
        const row = { nome:form.nome, cognome:form.cognome||null, citta:form.citta||null, telefono:form.telefono||null, instagram:form.instagram||null, note:form.note||null, profilazione:form.profilazione||{}, temperatura:form.temperatura||null };
        const prima = lista.find(x => x.id === sel.id) || sel;
        await scriviNome(prima, row, "Scheda di " + nomeDi(form));
        showToast("Aggiornato");
      }
    } catch(e) { showToast("Errore: "+e.message,"#ef4444"); }
    setModal(null); setSel(null);
  }

  async function deletPersona() {
    try {
      const id = sel.id;
      let riga = null;
      try { riga = await sbGetNome(auth.token, id); } catch(e) {}
      await sbDeleteNome(auth.token, id);
      rimuoviNomeLocale(id);
      if (cronologia && riga) cronologia.registra(azioneCancellazione({
        etichetta: "Eliminato dalla Lista Nomi: " + nomeDi(riga),
        leggi: leggiNome(id),
        cancella: async () => { await sbDeleteNome(cronologia.token(), id); rimuoviNomeLocale(id); },
        reinserisci: async r => sincronizzaNome(rigaDa(await sbInsertNome(cronologia.token(), r)) || r),
        riga,
      }));
      showToast("Rimosso","#ef4444");
    } catch(e) { showToast("Errore: "+e.message,"#ef4444"); }
    setModal(null); setSel(null);
  }

  async function invitaPersona(form) {
    // Due scritture (nome segnato invitato + prospect creato in App.jsx) che per te sono
    // UN solo gesto: raggruppate, si annullano insieme o per niente. Separate, un solo
    // "indietro" toglierebbe il prospect lasciando il nome marcato come invitato.
    const esegui = async () => {
      const prima = lista.find(x => x.id === sel.id) || sel;
      await scriviNome(prima, { invitato:true }, "Invitato: " + nomeDi(form));
      await onInvitaProspect({
        nome: form.nome,
        cognome: form.cognome||"",
        citta: form.citta||"",
        telefono: form.telefono||"",
        instagram: form.instagram||"",
        note: form.note||"",
        profilazione: form.profilazione||{},
        fonte: "Offline",
        fase: "INVITO",
        conosciutoAt: today(),
      });
    };
    try {
      if (cronologia) await cronologia.gruppo("Invito di " + nomeDi(form), esegui);
      else await esegui();
      showToast((form.nome||"")+" spostato in Prospect");
      setModal(null); setSel(null);
    } catch(e) { showToast("Errore: "+e.message,"#ef4444"); }
  }

  const filtered = lista.filter(p => {
    const q = search.toLowerCase();
    const matchSearch = !q || (p.nome+" "+p.cognome+" "+(p.citta||"")).toLowerCase().includes(q);
    const matchTemp = !filterTemp || p.temperatura === filterTemp;
    const matchInvitato = filterInvitato==="tutti" || (filterInvitato==="invitati"?p.invitato:!p.invitato);
    return matchSearch && matchTemp && matchInvitato;
  });

  const invitati = filtered.filter(p=>p.invitato);
  const daInvitare = filtered.filter(p=>!p.invitato);

  return (
    <div style={{padding:"2rem 2.2rem",maxWidth:1280,margin:"0 auto"}}>
      {toast && <div style={{position:"fixed",bottom:24,right:24,zIndex:9999,background:toast.color,color:"#fff",padding:"12px 22px",borderRadius:12,fontWeight:700,fontSize:13,boxShadow:"0 8px 30px #00000060"}}>{toast.msg}</div>}

      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"1.4rem"}}>
        <div>
          <h1 style={{fontWeight:900,fontSize:26,color:"var(--text)",letterSpacing:-0.8}}>Lista Nomi</h1>
          <p style={{color:"var(--muted)",fontSize:12,marginTop:3}}>La tua lista personale — privata, visibile solo a te</p>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <FrecceCronologia cronologia={cronologia} />
          <a href="https://qrco.de/bgsu0X" target="_blank" rel="noreferrer"
            style={{padding:"9px 18px",fontSize:13,fontWeight:800,background:"var(--bg4)",color:"var(--text)",border:"1px solid var(--border2)",borderRadius:10,cursor:"pointer",textDecoration:"none",display:"flex",alignItems:"center",gap:6}}>
            Memory Jogger
          </a>
          <button onClick={()=>{setSel(null);setModal("add");}} style={{padding:"9px 18px",fontSize:13,fontWeight:800,background:"linear-gradient(135deg,var(--a1),var(--a2))",color:"#fff",border:"none",borderRadius:10,cursor:"pointer"}}>
            + Aggiungi
          </button>
        </div>
      </div>

      <div style={{display:"flex",gap:10,marginBottom:16,flexWrap:"wrap"}}>
        <input placeholder="Cerca..." value={search} onChange={e=>setSearch(e.target.value)} style={{flex:2,minWidth:200}} />
        <select value={filterTemp} onChange={e=>setFilterTemp(e.target.value)} style={{flex:1,minWidth:130}}>
          <option value="">Tutte le temperature</option>
          {TEMPERATURE.map(t=><option key={t} value={t}>{t}</option>)}
        </select>
        <select value={filterInvitato} onChange={e=>setFilterInvitato(e.target.value)} style={{flex:1,minWidth:130}}>
          <option value="tutti">Tutti</option>
          <option value="da_invitare">Da invitare</option>
          <option value="invitati">Gia invitati</option>
        </select>
      </div>

      {loading
        ? <div style={{textAlign:"center",padding:"4rem",color:"var(--muted)"}}>Caricamento...</div>
        : lista.length===0
          ? <div style={{textAlign:"center",padding:"4rem",color:"var(--border2)"}}>
              <div style={{fontSize:13,marginBottom:12,color:"var(--muted)"}}>La tua lista nomi e vuota</div>
              <button onClick={()=>{setSel(null);setModal("add");}} style={{padding:"9px 20px",fontSize:13,fontWeight:800,background:"linear-gradient(135deg,var(--a1),var(--a2))",color:"#fff",border:"none",borderRadius:10,cursor:"pointer"}}>
                Aggiungi il primo
              </button>
            </div>
          : <>
              {/* Da invitare */}
              {daInvitare.length>0&&(
                <div style={{background:"var(--bg2)",border:"1px solid var(--border)",borderRadius:14,overflow:"hidden",marginBottom:16}}>
                  <div style={{padding:"1rem 1.4rem",borderBottom:"1px solid #11203a",fontSize:13,fontWeight:800,color:"var(--text)"}}>
                    Da invitare <span style={{fontSize:11,color:"var(--muted)",fontWeight:400,marginLeft:8}}>{daInvitare.length} persone</span>
                  </div>
                  <table style={{width:"100%",borderCollapse:"collapse"}}>
                    <thead><tr style={{borderBottom:"1px solid #11203a"}}>
                      {["Nome","Citta","Telefono","Instagram","Temp.","Note","Profilo",""].map(h=>(
                        <th key={h} style={{textAlign:"left",color:"var(--muted)",fontWeight:700,fontSize:10,textTransform:"uppercase",padding:"11px 16px"}}>{h}</th>
                      ))}
                    </tr></thead>
                    <tbody>{daInvitare.map(p=>{
                      const jung = (() => { const j=p.profilazione?.jung; if(!j)return[]; if(Array.isArray(j))return JUNG.filter(x=>j.includes(x.key)); return JUNG.filter(x=>x.key===j); })();
                      return (
                        <tr key={p.id} onClick={()=>{setSel(p);setModal("edit");}} style={{borderBottom:"1px solid #0d1b3355",cursor:"pointer"}} className="hrow">
                          <td style={{padding:"11px 16px"}}><div style={{display:"flex",alignItems:"center",gap:9}}><Av n={p.nome} c={p.cognome}/><span style={{color:"var(--text)",fontWeight:700,fontSize:13}}>{p.nome} {p.cognome}</span></div></td>
                          <td style={{padding:"11px 16px",color:"var(--muted)",fontSize:12}}>{p.citta||"\u2014"}</td>
                          <td style={{padding:"11px 16px",fontSize:12}}>{p.telefono?<a href={"tel:"+p.telefono} onClick={e=>e.stopPropagation()} style={{color:"var(--a2)",textDecoration:"none"}}>{p.telefono}</a>:"\u2014"}</td>
                          <td style={{padding:"11px 16px",fontSize:12}}>{p.instagram?<a href={"https://instagram.com/"+p.instagram.replace("@","")} target="_blank" rel="noreferrer" onClick={e=>e.stopPropagation()} style={{color:"#c084fc",textDecoration:"none"}}>{p.instagram.startsWith("@")?p.instagram:"@"+p.instagram}</a>:"\u2014"}</td>
                          <td style={{padding:"11px 16px"}}>{p.temperatura?<span style={{fontSize:11,fontWeight:800,padding:"2px 8px",borderRadius:6,color:TEMP_CLR[p.temperatura],background:TEMP_CLR[p.temperatura]+"20"}}>{p.temperatura}</span>:"\u2014"}</td>
                          <td style={{padding:"11px 16px",color:"var(--muted)",fontSize:12,maxWidth:200}}><div style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.note||"\u2014"}</div></td>
                          <td style={{padding:"11px 16px"}}>{jung.length>0?jung.map(j=><span key={j.key} style={{fontSize:10,fontWeight:800,color:j.border,background:j.border+"18",borderRadius:6,padding:"2px 7px",marginRight:3}}>{j.label}</span>):"\u2014"}</td>
                          <td style={{padding:"11px 16px",color:"var(--border2)",fontSize:16}}>{"\u203a"}</td>
                        </tr>
                      );
                    })}</tbody>
                  </table>
                </div>
              )}

              {/* Gia invitati */}
              {invitati.length>0&&(
                <div style={{background:"var(--bg2)",border:"1px solid #10b98130",borderRadius:14,overflow:"hidden"}}>
                  <div style={{padding:"1rem 1.4rem",borderBottom:"1px solid #11203a",fontSize:13,fontWeight:800,color:"#10b981"}}>
                    Gia invitati <span style={{fontSize:11,color:"var(--muted)",fontWeight:400,marginLeft:8}}>{invitati.length} persone</span>
                  </div>
                  <table style={{width:"100%",borderCollapse:"collapse"}}>
                    <thead><tr style={{borderBottom:"1px solid #11203a"}}>
                      {["Nome","Citta","Instagram","Note",""].map(h=>(
                        <th key={h} style={{textAlign:"left",color:"var(--muted)",fontWeight:700,fontSize:10,textTransform:"uppercase",padding:"11px 16px"}}>{h}</th>
                      ))}
                    </tr></thead>
                    <tbody>{invitati.map(p=>(
                      <tr key={p.id} onClick={()=>{setSel(p);setModal("edit");}} style={{borderBottom:"1px solid #0d1b3355",cursor:"pointer",opacity:0.6}} className="hrow">
                        <td style={{padding:"11px 16px"}}><div style={{display:"flex",alignItems:"center",gap:9}}><Av n={p.nome} c={p.cognome}/><span style={{color:"var(--text)",fontWeight:700,fontSize:13}}>{p.nome} {p.cognome}</span></div></td>
                        <td style={{padding:"11px 16px",color:"var(--muted)",fontSize:12}}>{p.citta||"\u2014"}</td>
                        <td style={{padding:"11px 16px",fontSize:12}}>{p.instagram?<a href={"https://instagram.com/"+p.instagram.replace("@","")} target="_blank" rel="noreferrer" onClick={e=>e.stopPropagation()} style={{color:"#c084fc",textDecoration:"none"}}>{p.instagram.startsWith("@")?p.instagram:"@"+p.instagram}</a>:"\u2014"}</td>
                        <td style={{padding:"11px 16px",color:"var(--muted)",fontSize:12}}>{p.note||"\u2014"}</td>
                        <td style={{padding:"11px 16px"}}><span style={{fontSize:10,fontWeight:800,color:"#10b981",background:"#10b98118",borderRadius:6,padding:"2px 8px"}}>Invitato</span></td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              )}
            </>
      }

      {modal && (
        <div onClick={()=>{setModal(null);setSel(null);}} style={{position:"fixed",inset:0,background:"#00000090",backdropFilter:"blur(8px)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:16}}>
          <div onClick={e=>e.stopPropagation()} style={{width:"100%",maxWidth:520}}>
            <PersonaModal
              persona={sel}
              isEdit={modal==="edit"}
              onSave={savPersona}
              onClose={()=>{setModal(null);setSel(null);}}
              onDelete={modal==="edit"?deletPersona:null}
              onInvita={invitaPersona}
            />
          </div>
        </div>
      )}
    </div>
  );
}