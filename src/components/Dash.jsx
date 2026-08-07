// ══════════════════════════════════════════════════════════════
// Dash.jsx — Dashboard (KPI ciclo, squadre sinistra/destra, funnel,
// da ricontattare) + CicloCountdown. Estratto da App.jsx.
// Costanti e helper puri stanno in ../shared.jsx: NON ridefinirli qui.
// ══════════════════════════════════════════════════════════════
import { useState, useEffect } from "react";
import { ConsigliCard } from "./Mentore";
import {
  Av, CICLI, CICLO_CORRENTE, CICLO_NUMS, FASE_CLR, FASE_LABEL,
  bvOfPacchetto, cicloLabel, fmt, isOver,
} from "../shared";

export function CicloCountdown({ ciclo }) {
  const cicloData = CICLI.find(x=>x[0]===Number(ciclo));
  const [tick, setTick] = useState(0);
  useEffect(()=>{ const t=setInterval(()=>setTick(n=>n+1),1000); return ()=>clearInterval(t); },[]);

  if (!cicloData) return null;

  const start = new Date(cicloData[1]+"T06:59:00");
  const end   = new Date(cicloData[2]+"T06:59:00");
  const now   = new Date();
  const totalMs = end - start;
  const leftMs  = Math.max(0, end - now);
  const pct     = Math.min(100, Math.max(0, ((now - start) / totalMs) * 100));
  const giornoTot = Math.ceil(totalMs / 86400000);
  const giornoOra = Math.min(giornoTot, Math.ceil((now - start) / 86400000));

  const dd = String(Math.floor(leftMs/86400000)).padStart(2,"0");
  const hh = String(Math.floor((leftMs%86400000)/3600000)).padStart(2,"0");
  const mm = String(Math.floor((leftMs%3600000)/60000)).padStart(2,"0");
  const ss = String(Math.floor((leftMs%60000)/1000)).padStart(2,"0");

  const ended = leftMs === 0;
  const endLabel = end.toLocaleDateString("it-IT",{weekday:"long",day:"numeric",month:"long"})+" alle ore 06:59";

  return (
    <div style={{background:"var(--bg2)",border:"1px solid var(--border)",borderRadius:14,padding:"16px 22px",marginBottom:16,display:"flex",alignItems:"center",justifyContent:"space-between",gap:16,flexWrap:"wrap"}}>
      <div style={{flex:1,minWidth:180}}>
        <div style={{fontSize:10,fontWeight:700,color:"var(--muted)",textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>Chiusura ciclo</div>
        <div style={{fontSize:13,fontWeight:700,color:"var(--text)",marginBottom:10}}>{ended?"Ciclo terminato":endLabel}</div>
        <div style={{height:6,background:"var(--bg4)",borderRadius:99,overflow:"hidden"}}>
          <div style={{height:"100%",width:pct+"%",background:"linear-gradient(90deg,var(--a1),var(--a2))",borderRadius:99,transition:"width .5s ease"}} />
        </div>
        <div style={{fontSize:11,color:"var(--muted)",marginTop:5}}>Giorno {giornoOra} di {giornoTot}</div>
      </div>
      {!ended && (
        <div style={{display:"flex",gap:10,flexShrink:0}}>
          {[{v:dd,l:"GIORNI"},{v:hh,l:"ORE"},{v:mm,l:"MIN"},{v:ss,l:"SEC"}].map(({v,l})=>(
            <div key={l} style={{textAlign:"center"}}>
              <div style={{fontSize:28,fontWeight:900,color:"var(--text)",letterSpacing:-1,lineHeight:1,fontVariantNumeric:"tabular-nums"}}>{v}</div>
              <div style={{fontSize:9,fontWeight:700,color:"var(--muted)",letterSpacing:1.2,marginTop:3}}>{l}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function Dash({ cd, cdSub, cdAct, cdFU, cdNI, cdConv, cdChiusi, cdForzaChiusura, totSub, totConv, totAll, funnelCounts, funnelMax, urgenti, dashCiclo, setDashCiclo, onOpen, dashMode, setDashMode, hasTeam, ticketVenduti, mentoreInsights, squadre }) {
  const cc = v => v>=20?"#10b981":v>=10?"var(--a2)":"#f59e0b";
  const bvCiclo = cdSub.reduce((acc,p)=>acc+bvOfPacchetto(p.pacchetto,p.bvCustom),0);
  const kpis = [
    {label:"In percorso",value:cdAct.length,icon:"",color:"var(--a1)",sub:cd.length+" totali nel ciclo",detail:"FUP1 → Closing"},
    {label:"Conv. ciclo",value:cdConv+"%",icon:"",color:cc(cdConv),sub:cdSub.length+" iscritti / "+cd.length,detail:cdConv>=20?"Ottimo ":cdConv>=10?"Nella media":"Da migliorare"},
    {label:"Forza chiusura",value:cdForzaChiusura+"%",icon:"",color:cc(cdForzaChiusura),sub:cdSub.length+" iscritti / "+cdChiusi.length+" a Closing",detail:cdChiusi.length===0?"Nessuno a Closing":cdForzaChiusura>=50?"Ottimo ":cdForzaChiusura>=30?"Nella media":"Da migliorare"},
    {label:"Iscritti ciclo",value:cdSub.length,icon:"",color:"#10b981",sub:"su "+cd.length+" conosciuti",detail:"questo ciclo"},
    {label:"BV ciclo",value:bvCiclo,icon:"",color:"#f59e0b",sub:"da "+cdSub.length+" iscritti",detail:"Business Volume"},
    {label:"Ticket evento",value:ticketVenduti||0,icon:"",color:"#a855f7",sub:"tu + downline",detail:"Venduti"},
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
      <CicloCountdown ciclo={dashCiclo} />
      <ConsigliCard insights={mentoreInsights} />
      <div className="kpi-grid" style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:12,marginBottom:16}}>
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
      {dashMode==="team" && squadre && (squadre.sinistra.membri>0||squadre.destra.membri>0) && (
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
          {[{team:"sinistra",stats:squadre.sinistra,color:"var(--a1)"},{team:"destra",stats:squadre.destra,color:"#10b981"}].map(({team,stats,color})=>(
            <div key={team} style={{background:"var(--bg2)",border:"1px solid "+color+"28",borderRadius:14,padding:"1.2rem"}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
                <span style={{fontSize:13,fontWeight:900,color,textTransform:"capitalize"}}>Squadra {team}</span>
                <span style={{fontSize:11,color:"var(--muted)"}}>{stats.membri} membri</span>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:8}}>
                {[{l:"In percorso",v:stats.act},{l:"Iscritti",v:stats.sub},{l:"Conv%",v:stats.conv+"%"},{l:"BV",v:stats.bv}].map(({l,v})=>(
                  <div key={l} style={{background:"var(--bg3)",borderRadius:9,padding:"10px"}}>
                    <div style={{fontSize:10,color:"var(--muted)",marginBottom:4}}>{l}</div>
                    <div style={{fontSize:20,fontWeight:900,color}}>{v}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
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
            {[{f:"DA_RISENTIRE",n:cd.filter(p=>p.fase==="DA_RISENTIRE").length},{f:"DA_RIFISSARE",n:cd.filter(p=>p.fase==="DA_RIFISSARE").length},{f:"NON_INT",n:cdNI.length},{f:"NON_PIACE",n:cd.filter(p=>p.fase==="NON_PIACE").length}].map(({f,n})=>(
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
                        <Av n={p.nome} c={p.cognome} color={FASE_CLR[p.fase]||FASE_CLR.DA_RISENTIRE} />
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