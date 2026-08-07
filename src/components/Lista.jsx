// ══════════════════════════════════════════════════════════════
// Lista.jsx — Lista prospect (filtri fase/fonte/ciclo/città/interesse/
// percorso/membro/squadra, tabella) + ChatCounterButton.
// Estratto da App.jsx. Costanti e helper puri stanno in ../shared.jsx.
// ══════════════════════════════════════════════════════════════
import { useState, useEffect } from "react";
import {
  Av, CICLO_CORRENTE, CICLO_NUMS, FASE_CLR, FASE_LABEL, FASI_FUNNEL, FASI_SPECIALI,
  FONTE_ICO, FONTI, INTERESSE, INTERESSE_CLR, JUNG, PROFILO_TOTAL,
  cicloOfDate, fmt, profiloBadge,
} from "../shared";

function chatColor(pct) {
  if (pct >= 100) return { bg:"#10b981", glow:"#10b98155", label:"Completato!" };
  if (pct >= 75)  return { bg:"#34d399", glow:"#34d39955", label:"Quasi fatto" };
  if (pct >= 50)  return { bg:"#facc15", glow:"#facc1555", label:"A metà strada" };
  if (pct >= 25)  return { bg:"#f97316", glow:"#f9731655", label:"Continua così" };
  return             { bg:"#ef4444", glow:"#ef444455", label:"Appena iniziato" };
}

function ChatCounterButton() {
  const [stage, setStage] = useState("idle"); // idle | ask | counting | done
  const [total, setTotal] = useState("");
  const [remaining, setRemaining] = useState(0);
  const [startTime, setStartTime] = useState(null);
  const [elapsed, setElapsed] = useState(0);

  useEffect(()=>{
    if (stage!=="counting") return;
    const t = setInterval(()=>setElapsed(Date.now()-startTime),1000);
    return ()=>clearInterval(t);
  },[stage,startTime]);

  function fmtTime(ms) {
    const s = Math.floor(ms/1000);
    const m = Math.floor(s/60);
    const ss = s%60;
    return String(m).padStart(2,"0")+":"+String(ss).padStart(2,"0");
  }

  function confirmStart() {
    const n = parseInt(total,10);
    if (!n || n<1) return;
    setRemaining(n);
    setStartTime(Date.now());
    setElapsed(0);
    setStage("counting");
  }

  function tap() {
    setRemaining(r=>{
      const next = Math.max(0, r-1);
      if (next===0) { setStage("done"); }
      return next;
    });
  }

  function reset() {
    setStage("idle"); setTotal(""); setRemaining(0); setStartTime(null); setElapsed(0);
  }

  const totalN = parseInt(total,10) || remaining || 1;
  const done = (totalN - remaining);
  const pct = totalN>0 ? Math.round((done/totalN)*100) : 0;
  const c = chatColor(stage==="done"?100:pct);

  return (
    <>
      <button onClick={()=>setStage("ask")} style={{padding:"9px 16px",fontSize:12,fontWeight:800,background:"var(--bg3)",color:"var(--a2)",border:"1px solid var(--border2)",borderRadius:10,cursor:"pointer",display:"flex",alignItems:"center",gap:6}}>
        💬 Chat aperte
      </button>

      {stage==="ask" && (
        <div onClick={()=>setStage("idle")} style={{position:"fixed",inset:0,background:"#00000090",backdropFilter:"blur(8px)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:2000}}>
          <div onClick={e=>e.stopPropagation()} style={{background:"var(--bg2)",border:"1px solid var(--border2)",borderRadius:18,padding:"2rem",maxWidth:320,width:"90%",textAlign:"center"}}>
            <div style={{fontSize:15,fontWeight:800,color:"var(--text)",marginBottom:16}}>Quante chat vuoi aprire oggi?</div>
            <input type="number" min="1" autoFocus value={total} onChange={e=>setTotal(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&confirmStart()}
              placeholder="es. 20" style={{textAlign:"center",fontSize:20,fontWeight:800,marginBottom:16}} />
            <div style={{display:"flex",gap:9,justifyContent:"center"}}>
              <button onClick={()=>setStage("idle")} style={{padding:"9px 16px",background:"var(--bg3)",color:"var(--muted)",border:"1px solid var(--border2)",borderRadius:9,cursor:"pointer",fontWeight:700,fontSize:13}}>Annulla</button>
              <button onClick={confirmStart} style={{padding:"9px 22px",background:"linear-gradient(135deg,var(--a1),var(--a2))",color:"#fff",border:"none",borderRadius:9,cursor:"pointer",fontWeight:800,fontSize:13}}>Inizia</button>
            </div>
          </div>
        </div>
      )}

      {stage==="counting" && (
        <div style={{position:"fixed",inset:0,background:"#00000095",backdropFilter:"blur(10px)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",zIndex:2000,gap:22}}>
          <button onClick={()=>{setStage("idle")}} style={{position:"absolute",top:20,right:24,background:"var(--bg3)",border:"1px solid var(--border2)",borderRadius:9,color:"var(--muted)",padding:"7px 14px",cursor:"pointer",fontWeight:700,fontSize:12}}>Chiudi</button>

          <div style={{fontSize:13,fontWeight:700,color:"var(--muted)",letterSpacing:1}}>{c.label}</div>
          <div style={{fontSize:34,fontWeight:900,color:"var(--text)",fontVariantNumeric:"tabular-nums",letterSpacing:-1}}>{fmtTime(elapsed)}</div>

          <button onClick={tap} style={{
              width:220,height:220,borderRadius:"50%",border:"none",cursor:"pointer",
              background:"radial-gradient(circle at 35% 30%,"+c.bg+"ee,"+c.bg+")",
              boxShadow:"0 0 60px "+c.glow+", inset 0 -8px 20px rgba(0,0,0,.25)",
              display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
              transition:"background .4s ease, box-shadow .4s ease",
            }}>
            <div style={{fontSize:64,fontWeight:900,color:"#fff",lineHeight:1,textShadow:"0 2px 8px rgba(0,0,0,.3)"}}>{remaining}</div>
            <div style={{fontSize:12,fontWeight:700,color:"#ffffffcc",marginTop:6,letterSpacing:1}}>rimaste · tocca</div>
          </button>

          <div style={{fontSize:12,color:"var(--muted)"}}>{done} su {totalN} completate · {pct}%</div>
        </div>
      )}

      {stage==="done" && (
        <div style={{position:"fixed",inset:0,background:"#00000095",backdropFilter:"blur(10px)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:2000}}>
          <div style={{background:"var(--bg2)",border:"1px solid #10b98150",borderRadius:20,padding:"2.4rem 2rem",maxWidth:340,width:"90%",textAlign:"center",boxShadow:"0 0 60px #10b98130"}}>
            <div style={{fontSize:44,marginBottom:10}}>🎉</div>
            <div style={{fontSize:19,fontWeight:900,color:"#10b981",marginBottom:8}}>Complimenti!</div>
            <div style={{fontSize:13,color:"var(--text)",marginBottom:4}}>Hai completato le tue {totalN} chat di oggi</div>
            <div style={{fontSize:12,color:"var(--muted)",marginBottom:20}}>in {fmtTime(elapsed)}</div>
            <button onClick={reset} style={{padding:"10px 24px",background:"linear-gradient(135deg,#10b981,#059669)",color:"#fff",border:"none",borderRadius:10,cursor:"pointer",fontWeight:800,fontSize:13}}>Chiudi</button>
          </div>
        </div>
      )}
    </>
  );
}
// ─────────────────────────────────────────────────────────────────

export function Lista({ prospects, total, search, setSearch, fFase, setFFase, fFonte, setFFonte, fCiclo, setFCiclo, fCitta, setFCitta, fInteresse, setFInteresse, fPercorso, setFPercorso, fMembro, setFMembro, fSquadra, setFSquadra, sortBy, setSortBy, downline, auth, onOpen, onAdd, listaMode, setListaMode, hasTeam }) {
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
          <ChatCounterButton />
          <button onClick={onAdd} style={{padding:"9px 18px",fontSize:13,fontWeight:800,background:"linear-gradient(135deg,var(--a1),var(--a2))",color:"#fff",border:"none",borderRadius:10,cursor:"pointer"}}>+ Aggiungi</button>
        </div>
      </div>
      <div style={{display:"flex",gap:10,marginBottom:14,flexWrap:"wrap"}}>
        <select value={sortBy} onChange={e=>setSortBy(e.target.value)} style={{flex:1,minWidth:130}}>
          <option value="fase">Ordine per fase</option>
          <option value="data">Data (recente prima)</option>
          <option value="alfa">Alfabetico</option>
          <option value="followup">Follow-up urgente</option>
        </select>
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
        <select value={fPercorso} onChange={e=>setFPercorso(e.target.value)} style={{flex:1,minWidth:140}}>
          <option value="">In e non in percorso</option>
          <option value="in_percorso">In percorso</option>
          <option value="non_in_percorso">Non in percorso</option>
        </select>
        {listaMode==="team" && (
          <select value={fSquadra} onChange={e=>setFSquadra(e.target.value)} style={{flex:1,minWidth:140}}>
            <option value="">Tutte le squadre</option>
            <option value="sinistra">Squadra sinistra</option>
            <option value="destra">Squadra destra</option>
          </select>
        )}
        {listaMode==="team" && (
          <select value={fMembro} onChange={e=>setFMembro(e.target.value)} style={{flex:1,minWidth:150}}>
            <option value="">Tutti i membri</option>
            <option value={auth?.userId}>Solo i miei</option>
            {(downline||[]).map(m=>(
              <option key={m.id} value={m.id}>{m.nome||""} {m.cognome||""}</option>
            ))}
          </select>
        )}
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