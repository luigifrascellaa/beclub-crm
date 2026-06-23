import { useState, useEffect } from "react";

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
  if (!res.ok) { const e = text ? JSON.parse(text) : {}; throw new Error(e.message || res.statusText); }
  return text ? JSON.parse(text) : null;
}

const sbListaNomi = (tok, uid) => sbFetch("/rest/v1/lista_nomi?select=*&user_id=eq."+uid+"&order=created_at.desc", { _token:tok });
const sbInsertNome = (tok, row) => sbFetch("/rest/v1/lista_nomi", { method:"POST", _token:tok, body:JSON.stringify(row) });
const sbUpdateNome = (tok, id, row) => sbFetch("/rest/v1/lista_nomi?id=eq."+id, { method:"PATCH", _token:tok, body:JSON.stringify(row) });
const sbDeleteNome = (tok, id) => sbFetch("/rest/v1/lista_nomi?id=eq."+id, { method:"DELETE", _token:tok });

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
const TC = { null:"#1e3a5f", "-":"#ef4444", ".":"#f59e0b", "+":"#10b981" };
const TL = { "-":"\u2013", ".":"\u00b7", "+":"+" };

const genId = () => crypto.randomUUID();
const today = () => new Date().toISOString().split("T")[0];

function Av({ n, c, size=34 }) {
  return (
    <div style={{width:size,height:size,borderRadius:"50%",flexShrink:0,background:"linear-gradient(135deg,#2563eb,#0ea5e9)",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:900,fontSize:size*0.32,boxShadow:"0 0 10px #2563eb35"}}>
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
    onChange({ ...pr, jung: pr.jung === key ? null : key });
  }

  function ToggleGroup({ title, fields, section }) {
    return (
      <div style={{marginBottom:16}}>
        <div style={{fontSize:10,fontWeight:800,color:"#3b5478",textTransform:"uppercase",letterSpacing:1.2,marginBottom:8}}>{title}</div>
        <div style={{display:"flex",flexDirection:"column",gap:6}}>
          {fields.map(f => {
            const val = pr[section]?.[f.key] ?? null;
            const clr = TC[val] || TC.null;
            return (
              <div key={f.key} style={{display:"flex",alignItems:"center",justifyContent:"space-between",background:"#0a1426",borderRadius:9,padding:"8px 11px",border:"1px solid "+(val!=null?clr+"40":"#11203a")}}>
                <span style={{fontSize:12,color:val!=null?"#eff6ff":"#5278a8"}}>{f.label}</span>
                <div style={{display:"flex",gap:5}}>
                  {TV.filter(v=>v!==null).map(v => {
                    const active = val === v;
                    const vc = TC[v];
                    return (
                      <button key={v} onClick={() => {
                        const next = active ? null : v;
                        onChange({ ...pr, [section]: { ...(pr[section]||{}), [f.key]: next } });
                      }}
                        style={{width:28,height:26,borderRadius:6,border:"1.5px solid "+(active?vc:"#1e3a5f"),cursor:"pointer",fontSize:13,fontWeight:900,fontFamily:"inherit",background:active?vc+"33":"#0d1b33",color:active?vc:"#3b5478",display:"flex",alignItems:"center",justifyContent:"center"}}>
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

  const sj = pr.jung || null;
  const jd = JUNG.find(j => j.key === sj);

  return (
    <div>
      <ToggleGroup title="Pleasures" fields={PLEASURES} section="pleasures" />
      <ToggleGroup title="Punti di Forza" fields={FORZA} section="forza" />
      <div style={{marginBottom:8}}>
        <div style={{fontSize:10,fontWeight:800,color:"#3b5478",textTransform:"uppercase",letterSpacing:1.2,marginBottom:8}}>Personalita Jung</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
          {JUNG.map(j => {
            const active = sj === j.key;
            return (
              <button key={j.key} onClick={() => selectJung(j.key)}
                style={{background:active?j.bg:"#0a1426",border:"2px solid "+(active?j.border:"#1e3a5f"),borderRadius:10,padding:"10px 12px",cursor:"pointer",textAlign:"left",transition:"all .2s"}}>
                <div style={{fontWeight:900,fontSize:13,color:active?"#fff":j.border}}>{j.label}</div>
                <div style={{fontSize:10,color:active?"rgba(255,255,255,.8)":"#5278a8",marginTop:2}}>{j.sub}</div>
              </button>
            );
          })}
        </div>
        {jd && <div style={{background:jd.border+"15",border:"1px solid "+jd.border+"35",borderRadius:9,padding:"8px 12px",fontSize:11,color:jd.border,fontWeight:700}}>{jd.label} {"\u00b7"} {jd.sub}</div>}
      </div>
    </div>
  );
}

function PersonaModal({ persona, onSave, onClose, onDelete, onInvita, isEdit }) {
  const [form, setForm] = useState(persona || { nome:"", cognome:"", citta:"", telefono:"", instagram:"", note:"", profilazione:{ pleasures:{}, forza:{} }, invitato:false });
  const [tab, setTab] = useState("dati");
  const lbl = { fontSize:11, fontWeight:700, color:"#3b5478", textTransform:"uppercase", letterSpacing:.8, marginBottom:5, display:"block" };

  return (
    <div style={{background:"#080f1f",border:"1px solid #1e3a5f",borderRadius:16,padding:"1.6rem",maxHeight:"90vh",overflowY:"auto",boxShadow:"0 20px 70px #000000aa"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <h2 style={{fontWeight:900,fontSize:17,color:"#eff6ff"}}>{isEdit?"Modifica":"+ Aggiungi"}</h2>
        <button onClick={onClose} style={{background:"#0d1b33",color:"#7da8d8",border:"1px solid #1e3a5f",borderRadius:8,cursor:"pointer",padding:"4px 10px",fontSize:14}}>X</button>
      </div>

      <div style={{display:"flex",background:"#0a1426",borderRadius:10,padding:4,marginBottom:16,border:"1px solid #11203a"}}>
        {[{id:"dati",label:"Dati"},{id:"profilazione",label:"Profilazione"}].map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)}
            style={{flex:1,padding:"7px",borderRadius:8,border:"none",cursor:"pointer",fontSize:12,fontWeight:700,fontFamily:"inherit",background:tab===t.id?"#0d1b33":"transparent",color:tab===t.id?"#7dd3fc":"#5278a8",boxShadow:tab===t.id?"inset 0 0 0 1px #2563eb40":"none"}}>
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
        </div>
      )}

      {tab==="profilazione" && (
        <ProfilazionePanel profilazione={form.profilazione} onChange={pr=>setForm(f=>({...f,profilazione:pr}))} />
      )}

      <div style={{display:"flex",gap:9,justifyContent:"flex-end",flexWrap:"wrap",marginTop:8}}>
        {onDelete && <button onClick={onDelete} style={{padding:"9px 14px",background:"#ef444415",color:"#f87171",border:"1px solid #ef444438",borderRadius:9,cursor:"pointer",fontWeight:700,fontSize:13}}>Elimina</button>}
        {isEdit && !form.invitato && <button onClick={()=>onInvita(form)} style={{padding:"9px 16px",background:"#10b98120",color:"#10b981",border:"1px solid #10b98140",borderRadius:9,cursor:"pointer",fontWeight:800,fontSize:13}}>Invito fatto</button>}
        {isEdit && form.invitato && <span style={{padding:"9px 14px",fontSize:12,color:"#10b981",fontWeight:700}}>Gia invitato</span>}
        <button onClick={onClose} style={{padding:"9px 14px",background:"#0d1b33",color:"#7da8d8",border:"1px solid #1e3a5f",borderRadius:9,cursor:"pointer",fontWeight:600,fontSize:13}}>Annulla</button>
        <button onClick={()=>onSave(form)} style={{padding:"9px 20px",background:"linear-gradient(135deg,#2563eb,#0ea5e9)",color:"#fff",border:"none",borderRadius:9,cursor:"pointer",fontWeight:800,fontSize:13}}>
          {isEdit?"Aggiorna":"Aggiungi"}
        </button>
      </div>
    </div>
  );
}

export function ListaNomiView({ auth, onInvitaProspect }) {
  const [lista, setLista] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [sel, setSel] = useState(null);
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState(null);

  function showToast(msg, color="#22d3ee") { setToast({msg,color}); setTimeout(()=>setToast(null),2800); }

  useEffect(() => {
    if (!auth) return;
    sbListaNomi(auth.token, auth.userId).then(rows => {
      setLista(rows||[]);
    }).catch(e=>showToast("Errore: "+e.message,"#ef4444")).finally(()=>setLoading(false));
  }, [auth]);

  async function savPersona(form) {
    if (!form.nome?.trim()) return;
    try {
      if (modal === "add") {
        const row = { id:genId(), user_id:auth.userId, nome:form.nome, cognome:form.cognome||null, citta:form.citta||null, telefono:form.telefono||null, instagram:form.instagram||null, note:form.note||null, profilazione:form.profilazione||{}, invitato:false };
        await sbInsertNome(auth.token, row);
        setLista(l=>[row,...l]);
        showToast("Aggiunto");
      } else {
        const row = { nome:form.nome, cognome:form.cognome||null, citta:form.citta||null, telefono:form.telefono||null, instagram:form.instagram||null, note:form.note||null, profilazione:form.profilazione||{} };
        await sbUpdateNome(auth.token, sel.id, row);
        setLista(l=>l.map(x=>x.id===sel.id?{...x,...row}:x));
        showToast("Aggiornato");
      }
    } catch(e) { showToast("Errore: "+e.message,"#ef4444"); }
    setModal(null); setSel(null);
  }

  async function deletPersona() {
    try {
      await sbDeleteNome(auth.token, sel.id);
      setLista(l=>l.filter(x=>x.id!==sel.id));
      showToast("Rimosso","#ef4444");
    } catch(e) { showToast("Errore: "+e.message,"#ef4444"); }
    setModal(null); setSel(null);
  }

  async function invitaPersona(form) {
    try {
      // Segna come invitato nella lista nomi
      await sbUpdateNome(auth.token, sel.id, { invitato:true });
      setLista(l=>l.map(x=>x.id===sel.id?{...x,invitato:true}:x));
      // Copia in prospect
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
      showToast((form.nome||"")+" spostato in Prospect");
      setModal(null); setSel(null);
    } catch(e) { showToast("Errore: "+e.message,"#ef4444"); }
  }

  const filtered = lista.filter(p => {
    const q = search.toLowerCase();
    return !q || (p.nome+" "+p.cognome+" "+(p.citta||"")).toLowerCase().includes(q);
  });

  const invitati = filtered.filter(p=>p.invitato);
  const daInvitare = filtered.filter(p=>!p.invitato);

  return (
    <div style={{padding:"2rem 2.2rem",maxWidth:1280,margin:"0 auto"}}>
      {toast && <div style={{position:"fixed",bottom:24,right:24,zIndex:9999,background:toast.color,color:"#fff",padding:"12px 22px",borderRadius:12,fontWeight:700,fontSize:13,boxShadow:"0 8px 30px #00000060"}}>{toast.msg}</div>}

      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"1.4rem"}}>
        <div>
          <h1 style={{fontWeight:900,fontSize:26,color:"#eff6ff",letterSpacing:-0.8}}>Lista Nomi</h1>
          <p style={{color:"#3b5478",fontSize:12,marginTop:3}}>La tua lista personale — privata, visibile solo a te</p>
        </div>
        <button onClick={()=>{setSel(null);setModal("add");}} style={{padding:"9px 18px",fontSize:13,fontWeight:800,background:"linear-gradient(135deg,#2563eb,#0ea5e9)",color:"#fff",border:"none",borderRadius:10,cursor:"pointer"}}>
          + Aggiungi
        </button>
      </div>

      <input placeholder="Cerca..." value={search} onChange={e=>setSearch(e.target.value)} style={{marginBottom:16,maxWidth:360}} />

      {loading
        ? <div style={{textAlign:"center",padding:"4rem",color:"#3b5478"}}>Caricamento...</div>
        : lista.length===0
          ? <div style={{textAlign:"center",padding:"4rem",color:"#1e3a5f"}}>
              <div style={{fontSize:13,marginBottom:12,color:"#3b5478"}}>La tua lista nomi e vuota</div>
              <button onClick={()=>{setSel(null);setModal("add");}} style={{padding:"9px 20px",fontSize:13,fontWeight:800,background:"linear-gradient(135deg,#2563eb,#0ea5e9)",color:"#fff",border:"none",borderRadius:10,cursor:"pointer"}}>
                Aggiungi il primo
              </button>
            </div>
          : <>
              {/* Da invitare */}
              {daInvitare.length>0&&(
                <div style={{background:"#080f1f",border:"1px solid #11203a",borderRadius:14,overflow:"hidden",marginBottom:16}}>
                  <div style={{padding:"1rem 1.4rem",borderBottom:"1px solid #11203a",fontSize:13,fontWeight:800,color:"#eff6ff"}}>
                    Da invitare <span style={{fontSize:11,color:"#3b5478",fontWeight:400,marginLeft:8}}>{daInvitare.length} persone</span>
                  </div>
                  <table style={{width:"100%",borderCollapse:"collapse"}}>
                    <thead><tr style={{borderBottom:"1px solid #11203a"}}>
                      {["Nome","Citta","Telefono","Instagram","Note","Profilo",""].map(h=>(
                        <th key={h} style={{textAlign:"left",color:"#3b5478",fontWeight:700,fontSize:10,textTransform:"uppercase",padding:"11px 16px"}}>{h}</th>
                      ))}
                    </tr></thead>
                    <tbody>{daInvitare.map(p=>{
                      const jung = p.profilazione?.jung ? JUNG.find(j=>j.key===p.profilazione.jung) : null;
                      return (
                        <tr key={p.id} onClick={()=>{setSel(p);setModal("edit");}} style={{borderBottom:"1px solid #0d1b3355",cursor:"pointer"}} className="hrow">
                          <td style={{padding:"11px 16px"}}><div style={{display:"flex",alignItems:"center",gap:9}}><Av n={p.nome} c={p.cognome}/><span style={{color:"#eff6ff",fontWeight:700,fontSize:13}}>{p.nome} {p.cognome}</span></div></td>
                          <td style={{padding:"11px 16px",color:"#5278a8",fontSize:12}}>{p.citta||"\u2014"}</td>
                          <td style={{padding:"11px 16px",fontSize:12}}>{p.telefono?<a href={"tel:"+p.telefono} onClick={e=>e.stopPropagation()} style={{color:"#60a5fa",textDecoration:"none"}}>{p.telefono}</a>:"\u2014"}</td>
                          <td style={{padding:"11px 16px",fontSize:12}}>{p.instagram?<a href={"https://instagram.com/"+p.instagram.replace("@","")} target="_blank" rel="noreferrer" onClick={e=>e.stopPropagation()} style={{color:"#c084fc",textDecoration:"none"}}>{p.instagram.startsWith("@")?p.instagram:"@"+p.instagram}</a>:"\u2014"}</td>
                          <td style={{padding:"11px 16px",color:"#5278a8",fontSize:12,maxWidth:200}}><div style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.note||"\u2014"}</div></td>
                          <td style={{padding:"11px 16px"}}>{jung?<span style={{fontSize:11,fontWeight:800,color:jung.border,background:jung.border+"18",borderRadius:6,padding:"2px 8px"}}>{jung.label}</span>:"\u2014"}</td>
                          <td style={{padding:"11px 16px",color:"#1e3a5f",fontSize:16}}>{"\u203a"}</td>
                        </tr>
                      );
                    })}</tbody>
                  </table>
                </div>
              )}

              {/* Gia invitati */}
              {invitati.length>0&&(
                <div style={{background:"#080f1f",border:"1px solid #10b98130",borderRadius:14,overflow:"hidden"}}>
                  <div style={{padding:"1rem 1.4rem",borderBottom:"1px solid #11203a",fontSize:13,fontWeight:800,color:"#10b981"}}>
                    Gia invitati <span style={{fontSize:11,color:"#3b5478",fontWeight:400,marginLeft:8}}>{invitati.length} persone</span>
                  </div>
                  <table style={{width:"100%",borderCollapse:"collapse"}}>
                    <thead><tr style={{borderBottom:"1px solid #11203a"}}>
                      {["Nome","Citta","Instagram","Note",""].map(h=>(
                        <th key={h} style={{textAlign:"left",color:"#3b5478",fontWeight:700,fontSize:10,textTransform:"uppercase",padding:"11px 16px"}}>{h}</th>
                      ))}
                    </tr></thead>
                    <tbody>{invitati.map(p=>(
                      <tr key={p.id} onClick={()=>{setSel(p);setModal("edit");}} style={{borderBottom:"1px solid #0d1b3355",cursor:"pointer",opacity:0.6}} className="hrow">
                        <td style={{padding:"11px 16px"}}><div style={{display:"flex",alignItems:"center",gap:9}}><Av n={p.nome} c={p.cognome}/><span style={{color:"#eff6ff",fontWeight:700,fontSize:13}}>{p.nome} {p.cognome}</span></div></td>
                        <td style={{padding:"11px 16px",color:"#5278a8",fontSize:12}}>{p.citta||"\u2014"}</td>
                        <td style={{padding:"11px 16px",fontSize:12}}>{p.instagram?<a href={"https://instagram.com/"+p.instagram.replace("@","")} target="_blank" rel="noreferrer" onClick={e=>e.stopPropagation()} style={{color:"#c084fc",textDecoration:"none"}}>{p.instagram.startsWith("@")?p.instagram:"@"+p.instagram}</a>:"\u2014"}</td>
                        <td style={{padding:"11px 16px",color:"#5278a8",fontSize:12}}>{p.note||"\u2014"}</td>
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