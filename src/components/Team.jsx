import { useState } from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";

const FASI_DASH = ["FUP1","FUP2","PACK","CLOSING","SUB"];
const FASE_CLR = {INVITO:"#8b5cf6",FUP1:"var(--a1)",FUP2:"#3b82f6",PACK:"var(--a2)",CLOSING:"#22d3ee",SUB:"#10b981",FOLLOW_UP:"#f59e0b",NON_INT:"#6b7280"};
const FASE_LABEL = {INVITO:"Invito",FUP1:"FUP 1",FUP2:"FUP 2",PACK:"Pack",CLOSING:"Closing",SUB:"Iscritto",FOLLOW_UP:"Follow Up",NON_INT:"Non Int."};
const PACCHETTI = [{key:"starter",label:"Starter",bv:100},{key:"standard",label:"Standard",bv:250},{key:"premium",label:"Premium",bv:550},{key:"signature",label:"Signature",bv:1025},{key:"altro",label:"Altro",bv:0}];
function bvOfPacchetto(key, bvCustom){
  if(key==="altro") return bvCustom||0;
  const p=PACCHETTI.find(x=>x.key===key);
  return p?p.bv:0;
}

const CICLI=[[73,"2026-01-03","2026-01-31"],[74,"2026-01-31","2026-02-28"],[75,"2026-02-28","2026-03-28"],[76,"2026-03-28","2026-04-25"],[77,"2026-04-25","2026-05-23"],[78,"2026-05-23","2026-06-20"],[79,"2026-06-20","2026-07-18"],[80,"2026-07-18","2026-08-15"],[81,"2026-08-15","2026-09-12"],[82,"2026-09-12","2026-10-10"],[83,"2026-10-10","2026-11-07"],[84,"2026-11-07","2026-12-05"],[85,"2026-12-05","2027-01-02"]];
const CICLO_CORRENTE=(()=>{const t=new Date().toISOString().split("T")[0];for(const[c,s,e]of CICLI)if(t>=s&&t<e)return c;return CICLI[CICLI.length-1][0];})();
const CICLO_NUMS=CICLI.map(r=>r[0]).sort((a,b)=>b-a);
function cicloOfDate(d){if(!d)return null;for(const[c,s,e]of CICLI)if(d>=s&&d<e)return c;return null;}
function cicloLabel(c){const r=CICLI.find(x=>x[0]===Number(c));if(!r)return"Ciclo "+c;const fd=s=>new Date(s+"T12:00:00").toLocaleDateString("it-IT",{day:"numeric",month:"short"});return fd(r[1])+" \u2013 "+fd(r[2]);}
function dataByCiclo(arr,c){const r=CICLI.find(x=>x[0]===Number(c));if(!r)return[];return arr.filter(p=>p.conosciutoAt&&p.conosciutoAt>=r[1]&&p.conosciutoAt<r[2]);}
const fmt=d=>d?new Date(d+"T12:00:00").toLocaleDateString("it-IT"):"\u2014";

function teamStats(prospects){
  const total=prospects.length;
  const sub=prospects.filter(p=>p.fase==="SUB").length;
  const act=prospects.filter(p=>["FUP1","FUP2","PACK","CLOSING"].includes(p.fase)).length;
  const conv=total>0?Math.round(sub/total*100):0;
  const bv=prospects.filter(p=>p.fase==="SUB").reduce((acc,p)=>acc+bvOfPacchetto(p.pacchetto,p.bvCustom),0);
  return{total,sub,act,conv,bv};
}

function profiloBadge(p){
  const PLEASURES=[{key:"tempo"},{key:"relazioni"},{key:"crescita"},{key:"internet_money"},{key:"extra_mensile"},{key:"investimenti"}];
  const FORZA=[{key:"soldi"},{key:"istruzione"},{key:"sociale"}];
  const pr=p.profilazione||{};
  let pos=0,comp=0;
  PLEASURES.forEach(f=>{const v=pr.pleasures?.[f.key];if(v!=null)comp++;if(v==="+")pos++;});
  FORZA.forEach(f=>{const v=pr.forza?.[f.key];if(v!=null)comp++;if(v==="+")pos++;});
  return{positivi:pos,compilati:comp};
}

function Av({n,c,color,size=34}){
  return(
    <div style={{width:size,height:size,borderRadius:"50%",flexShrink:0,background:"linear-gradient(135deg,"+color+","+color+"99)",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:900,fontSize:size*0.32,boxShadow:"0 0 10px "+color+"35"}}>
      {(n||"?")[0]}{(c||"")[0]}
    </div>
  );
}

function TreeNode({memberId,memberNome,memberCognome,memberEmail,allMembers,dlProspects,positions,onSelect,depth,selectedForPlacement,onPlaceHere}){
  const children=allMembers.filter(m=>m.positioned_under===memberId);
  function getPos(mId,upId){const p=positions.find(p=>p.member_id===mId&&p.upline_id===upId);return p?.team||null;}
  const sin=children.filter(m=>getPos(m.id,memberId)==="sinistra");
  const de=children.filter(m=>getPos(m.id,memberId)==="destra");
  const mP=dlProspects.filter(p=>p._userId===memberId);
  const ms=teamStats(mP);
  const isRoot=depth===0;
  const canPlace=!!selectedForPlacement;

  // Slot vuoto cliccabile
  function EmptySlot({team}){
    if(!canPlace)return(
      <div style={{width:120,height:44,border:"2px dashed #1e3a5f",borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center"}}>
        <span style={{fontSize:10,color:"var(--border2)"}}>vuoto</span>
      </div>
    );
    const color=team==="sinistra"?"var(--a1)":"#10b981";
    return(
      <div onClick={()=>onPlaceHere&&onPlaceHere(memberId,team)}
        style={{width:120,height:44,border:"2px dashed "+color,borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",background:color+"12",transition:"all .2s"}}>
        <span style={{fontSize:11,color,fontWeight:700}}>+ Posiziona qui</span>
      </div>
    );
  }

  return(
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",minWidth:160}}>
      <div onClick={()=>!isRoot&&onSelect&&onSelect(allMembers.find(m=>m.id===memberId))}
        style={{background:isRoot?"linear-gradient(135deg,var(--a1),var(--a2))":"var(--bg4)",border:"2px solid "+(isRoot?"var(--a1)":"var(--border2)"),borderRadius:12,padding:"10px 16px",textAlign:"center",cursor:isRoot?"default":"pointer",minWidth:130,boxShadow:isRoot?"0 0 20px var(--a1-25)":"none",marginBottom:4}}>
        <div style={{fontWeight:800,fontSize:12,color:isRoot?"#fff":"var(--text)"}}>{memberNome||memberEmail} {memberCognome||""}</div>
        {!isRoot&&<div style={{fontSize:10,color:"var(--muted)",marginTop:2}}>{ms.sub} iscr {"\u00b7"} {ms.bv} BV</div>}
      </div>
      <div style={{width:2,height:16,background:"var(--border2)"}}/>
      <div style={{display:"flex",gap:0,alignItems:"flex-start"}}>
        {/* SINISTRA */}
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",minWidth:160}}>
          <div style={{fontSize:9,fontWeight:800,color:"var(--a1)",textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>{"\u2190"} Sinistra</div>
          {sin.length===0
            ?<EmptySlot team="sinistra"/>
            :sin.map(child=><TreeNode key={child.id} memberId={child.id} memberNome={child.nome} memberCognome={child.cognome} memberEmail={child.email} allMembers={allMembers} dlProspects={dlProspects} positions={positions} onSelect={onSelect} depth={depth+1} selectedForPlacement={selectedForPlacement} onPlaceHere={onPlaceHere}/>)
          }
        </div>
        <div style={{width:2,minHeight:60,background:"var(--border2)",margin:"0 8px"}}/>
        {/* DESTRA */}
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",minWidth:160}}>
          <div style={{fontSize:9,fontWeight:800,color:"#10b981",textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>Destra {"\u2192"}</div>
          {de.length===0
            ?<EmptySlot team="destra"/>
            :de.map(child=><TreeNode key={child.id} memberId={child.id} memberNome={child.nome} memberCognome={child.cognome} memberEmail={child.email} allMembers={allMembers} dlProspects={dlProspects} positions={positions} onSelect={onSelect} depth={depth+1} selectedForPlacement={selectedForPlacement} onPlaceHere={onPlaceHere}/>)
          }
        </div>
      </div>
    </div>
  );
}

export function TeamView({auth,downline,dlProspects,onAssignTeam,onAddManual,positions,onOpenProspect,onPositionInTree}){
  const[selectedMember,setSelectedMember]=useState(null);
  const[teamFilter,setTeamFilter]=useState("all");
  const[copied,setCopied]=useState(false);
  const[teamCiclo,setTeamCiclo]=useState(CICLO_CORRENTE);
  const[showAddModal,setShowAddModal]=useState(false);
  const[addCode,setAddCode]=useState("");
  const[addLoading,setAddLoading]=useState(false);
  const[addPositionedUnder,setAddPositionedUnder]=useState("");
  const[addTeam,setAddTeam]=useState("");
  const[activeTeamTab,setActiveTeamTab]=useState("dashboard");
  const[selectedForPlacement,setSelectedForPlacement]=useState(null); // membro selezionato da piazzare

  const referralLink=auth?.profile?.referral_code?window.location.origin+"?ref="+auth.profile.referral_code:null;

  function copyLink(){if(!referralLink)return;navigator.clipboard.writeText(referralLink).then(()=>{setCopied(true);setTimeout(()=>setCopied(false),2000);});}

  async function handleAddManual(){
    if(!addCode.trim())return;
    setAddLoading(true);
    const ok=await onAddManual(addCode,addPositionedUnder||auth.userId,addTeam||null);
    setAddLoading(false);
    if(ok){setShowAddModal(false);setAddCode("");setAddPositionedUnder("");setAddTeam("");}
  }

  function getTeamForMe(member){
    const pos=positions.find(p=>p.member_id===member.id&&p.upline_id===auth.userId);
    if(pos)return pos.team;
    const parent=downline.find(m=>m.id===member.positioned_under);
    if(parent)return getTeamForMe(parent);
    return null;
  }

  function getTeam(memberId,uplineId){
    const pos=positions.find(p=>p.member_id===memberId&&p.upline_id===uplineId);
    return pos?.team||null;
  }

  const dlByCiclo=teamCiclo==="ALL"?dlProspects:dlProspects.filter(p=>cicloOfDate(p.conosciutoAt)===Number(teamCiclo));
  const sinistra=downline.filter(m=>getTeamForMe(m)==="sinistra");
  const destra=downline.filter(m=>getTeamForMe(m)==="destra");
  const noTeam=downline.filter(m=>!getTeamForMe(m));
  // Membri in attesa di posizionamento (hanno squadra ma positioned_under è null)
  const inAttesa=downline.filter(m=>!m.positioned_under&&getTeamForMe(m));
  // Membri posizionati nell'albero
  const posizionati=downline.filter(m=>m.positioned_under);
  const filteredMembers=teamFilter==="all"?downline:teamFilter==="sinistra"?sinistra:teamFilter==="destra"?destra:noTeam;
  function getMemberProspects(memberId){return dlByCiclo.filter(p=>p._userId===memberId);}
  function squadraStats(members){return teamStats(members.flatMap(m=>getMemberProspects(m.id)));}
  const statsS=squadraStats(sinistra);
  const statsD=squadraStats(destra);
  const statsTot=teamStats(dlByCiclo);
  const convColor=v=>v>=20?"#10b981":v>=10?"var(--a2)":"#f59e0b";
  const compareData=[{name:"In percorso",sinistra:statsS.act,destra:statsD.act},{name:"Iscritti",sinistra:statsS.sub,destra:statsD.sub},{name:"BV",sinistra:statsS.bv,destra:statsD.bv}];
  const ts={background:"var(--bg3)",border:"1px solid var(--border2)",borderRadius:8,color:"var(--text)",fontSize:12};

  if(selectedMember){
    const mP=getMemberProspects(selectedMember.id);
    const ms=teamStats(mP);
    const teamColor=getTeamForMe(selectedMember)==="sinistra"?"var(--a1)":getTeamForMe(selectedMember)==="destra"?"#10b981":"#6b7280";
    return(
      <div style={{padding:"2rem 2.2rem",maxWidth:1280,margin:"0 auto"}}>
        <button onClick={()=>setSelectedMember(null)} style={{display:"flex",alignItems:"center",gap:8,background:"none",border:"none",color:"var(--a2)",cursor:"pointer",fontSize:13,fontWeight:700,marginBottom:20}}>
          {"\u2190"} Torna al Team
        </button>
        <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:24}}>
          <Av n={selectedMember.nome||selectedMember.email} c={selectedMember.cognome} color={teamColor} size={50}/>
          <div>
            <h2 style={{fontWeight:900,fontSize:22,color:"var(--text)"}}>{selectedMember.nome||selectedMember.email} {selectedMember.cognome||""}</h2>
            {selectedMember.citta&&<div style={{fontSize:12,color:"var(--muted)",marginTop:3}}>{selectedMember.citta}</div>}
            <div style={{display:"flex",gap:12,marginTop:8,flexWrap:"wrap"}}>
              <a href={"mailto:"+selectedMember.email} style={{color:"var(--a2)",fontSize:12,textDecoration:"none",display:"flex",alignItems:"center",gap:4}}> {selectedMember.email}</a>
              {selectedMember.telefono&&<a href={"tel:"+selectedMember.telefono} style={{color:"var(--a2)",fontSize:12,textDecoration:"none",display:"flex",alignItems:"center",gap:4}}> {selectedMember.telefono}</a>}
              {selectedMember.instagram&&<a href={"https://instagram.com/"+selectedMember.instagram.replace("@","")} target="_blank" rel="noreferrer" style={{color:"#c084fc",fontSize:12,textDecoration:"none",display:"flex",alignItems:"center",gap:4}}> {selectedMember.instagram.startsWith("@")?selectedMember.instagram:"@"+selectedMember.instagram}</a>}
            </div>
          </div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:20}}>
          {[{label:"Prospect",value:ms.total,color:"var(--a1)",icon:""},{label:"Iscritti",value:ms.sub,color:"#10b981",icon:""},{label:"In percorso",value:ms.act,color:"var(--a2)",icon:""},{label:"BV prodotti",value:ms.bv,color:"#f59e0b",icon:""}].map((k,i)=>(
            <div key={i} style={{background:"var(--bg2)",border:"1px solid var(--border)",borderRadius:14,padding:"16px 18px",position:"relative",overflow:"hidden"}}>
              <div style={{position:"absolute",top:0,left:0,right:0,height:3,background:"linear-gradient(90deg,"+k.color+","+k.color+"44)",borderRadius:"14px 14px 0 0"}}/>
              <div style={{fontSize:10,color:"var(--muted)",fontWeight:700,textTransform:"uppercase",letterSpacing:.8,marginBottom:8}}>{k.label}</div>
              <div style={{fontSize:28,fontWeight:900,color:k.color}}>{k.value}</div>
            </div>
          ))}
        </div>
        <div style={{background:"var(--bg2)",border:"1px solid var(--border)",borderRadius:14,overflow:"hidden"}}>
          <div style={{padding:"1rem 1.4rem",borderBottom:"1px solid #11203a",fontSize:13,fontWeight:800,color:"var(--text)"}}>Prospect di {selectedMember.nome||selectedMember.email}</div>
          {mP.length===0
            ?<div style={{padding:"3rem",textAlign:"center",color:"var(--border2)"}}>Nessun prospect ancora</div>
            :<table style={{width:"100%",borderCollapse:"collapse"}}>
              <thead><tr style={{borderBottom:"1px solid #11203a"}}>{["Nome","Conosciuto","Fonte","Fase","Checklist"].map(h=>(<th key={h} style={{textAlign:"left",color:"var(--muted)",fontWeight:700,fontSize:10,textTransform:"uppercase",padding:"11px 16px"}}>{h}</th>))}</tr></thead>
              <tbody>{mP.map(p=>(
                <tr key={p.id} onClick={()=>onOpenProspect&&onOpenProspect({...p,_ownerName:(selectedMember.nome||selectedMember.email)+" "+(selectedMember.cognome||"")})} style={{borderBottom:"1px solid #0d1b3355",cursor:onOpenProspect?"pointer":"default"}} className="hrow">
                  <td style={{padding:"11px 16px"}}><div style={{display:"flex",alignItems:"center",gap:9}}><Av n={p.nome} c={p.cognome} color={FASE_CLR[p.fase]}/><span style={{color:"var(--text)",fontWeight:700,fontSize:13}}>{p.nome} {p.cognome}</span></div></td>
                  <td style={{padding:"11px 16px",color:"var(--muted)",fontSize:12}}>{fmt(p.conosciutoAt)}</td>
                  <td style={{padding:"11px 16px",color:"var(--muted)",fontSize:12}}>{p.fonte}</td>
                  <td style={{padding:"11px 16px"}}><span style={{display:"inline-flex",alignItems:"center",borderRadius:6,padding:"3px 9px",fontSize:11,fontWeight:700,color:"#fff",background:FASE_CLR[p.fase]}}>{FASE_LABEL[p.fase]}</span></td>
                  <td style={{padding:"11px 16px"}}>
                    <div style={{display:"flex",gap:5}}>
                      {["kyc","pandadoc","click"].map(k=>{
                        const done=p.checklist?.[k];
                        const label=k==="pandadoc"?"PD":k.toUpperCase();
                        return <span key={k} style={{fontSize:10,fontWeight:800,padding:"2px 7px",borderRadius:5,background:done?"#10b98120":"#1e3a5f20",color:done?"#10b981":"var(--muted)",border:"1px solid "+(done?"#10b98140":"var(--border2)")}}>{label}</span>;
                      })}
                    </div>
                  </td>
                  <td style={{padding:"11px 16px",color:"var(--border2)",fontSize:16}}>{"\u203a"}</td>
                </tr>
              ))}</tbody>
            </table>
          }
        </div>
      </div>
    );
  }

  return(
    <div style={{padding:"2rem 2.2rem",maxWidth:1280,margin:"0 auto"}}>
      <div style={{display:"flex",alignItems:"flex-end",justifyContent:"space-between",marginBottom:"1.5rem",gap:12,flexWrap:"wrap"}}>
        <div>
          <div style={{fontSize:11,fontWeight:700,color:"var(--a1)",textTransform:"uppercase",letterSpacing:1.4,marginBottom:4}}>
            {teamCiclo==="ALL"?"Tutti i cicli":"Ciclo "+teamCiclo+(teamCiclo===CICLO_CORRENTE?" \u00b7 in corso":"")}
          </div>
          <h1 style={{fontWeight:900,fontSize:26,color:"var(--text)",letterSpacing:-0.8,lineHeight:1}}>Team</h1>
          <p style={{color:"var(--muted)",fontSize:12,marginTop:4}}>{downline.length} membri nella tua downline</p>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:6,background:"var(--bg2)",border:"1px solid var(--border)",borderRadius:11,padding:"5px 10px"}}>
          <button onClick={()=>setTeamCiclo(c=>c==="ALL"?CICLO_NUMS[CICLO_NUMS.length-1]:Math.max(CICLO_NUMS[CICLO_NUMS.length-1],Number(c)-1))} style={{background:"none",border:"none",color:"var(--muted)",fontSize:18,cursor:"pointer",padding:"2px 8px",fontWeight:700}}>{"\u2039"}</button>
          <select value={teamCiclo} onChange={e=>setTeamCiclo(e.target.value==="ALL"?"ALL":Number(e.target.value))} style={{background:"none",border:"none",color:"var(--text)",fontWeight:800,fontSize:12,padding:"2px 4px",width:"auto",cursor:"pointer"}}>
            <option value="ALL">Tutti i cicli</option>
            {CICLO_NUMS.map(c=><option key={c} value={c}>Ciclo {c}</option>)}
          </select>
          <button onClick={()=>setTeamCiclo(c=>c==="ALL"?CICLO_NUMS[0]:Math.min(CICLO_NUMS[0],Number(c)+1))} style={{background:"none",border:"none",color:"var(--muted)",fontSize:18,cursor:"pointer",padding:"2px 8px",fontWeight:700}}>{"\u203a"}</button>
        </div>
      </div>

      <div style={{background:"var(--bg2)",border:"1px solid #2563eb30",borderRadius:14,padding:"1.2rem 1.4rem",marginBottom:16}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8,flexWrap:"wrap",gap:8}}>
          <div style={{fontSize:11,fontWeight:700,color:"var(--a1)",textTransform:"uppercase",letterSpacing:1}}>Il tuo link referral</div>
          {auth?.profile?.referral_code&&<div style={{display:"flex",alignItems:"center",gap:6}}><span style={{fontSize:10,color:"var(--muted)"}}>Il tuo ID:</span><span style={{background:"var(--a1-12)",color:"var(--a2)",borderRadius:6,padding:"2px 10px",fontSize:12,fontWeight:800,fontFamily:"monospace"}}>{auth.profile.referral_code}</span></div>}
        </div>
        {referralLink
          ?<div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
            <div style={{flex:1,background:"var(--bg3)",border:"1px solid var(--border2)",borderRadius:9,padding:"9px 13px",fontSize:12,color:"var(--text)",fontFamily:"monospace",minWidth:200,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{referralLink}</div>
            <button onClick={copyLink} style={{padding:"9px 18px",background:copied?"#10b98120":"linear-gradient(135deg,var(--a1),var(--a2))",color:copied?"#10b981":"#fff",border:copied?"1px solid #10b98140":"none",borderRadius:9,cursor:"pointer",fontWeight:800,fontSize:12,whiteSpace:"nowrap"}}>{copied?"Copiato!":"Copia link"}</button>
          </div>
          :<div style={{fontSize:12,color:"var(--muted)"}}>Caricamento...</div>
        }
        <div style={{fontSize:11,color:"var(--border2)",marginTop:8}}>Chi si registra tramite il tuo link appare automaticamente nel tuo team.</div>
      </div>

      {showAddModal&&(
        <div onClick={()=>setShowAddModal(false)} style={{position:"fixed",inset:0,background:"#00000090",backdropFilter:"blur(8px)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:16}}>
          <div onClick={e=>e.stopPropagation()} style={{width:"100%",maxWidth:420,background:"var(--bg2)",border:"1px solid var(--border2)",borderRadius:16,padding:"1.6rem",boxShadow:"0 20px 70px #000000aa"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
              <h2 style={{fontWeight:900,fontSize:17,color:"var(--text)"}}>+ Aggiungi membro</h2>
              <button onClick={()=>{setShowAddModal(false);setAddCode("");}} style={{background:"var(--bg4)",color:"#7da8d8",border:"1px solid var(--border2)",borderRadius:8,cursor:"pointer",padding:"4px 10px",fontSize:14}}>X</button>
            </div>
            <p style={{fontSize:12,color:"var(--muted)",marginBottom:16,lineHeight:1.6}}>Inserisci l ID della persona, scegli sotto chi posizionarla e in che squadra.</p>
            <div style={{display:"flex",flexDirection:"column",gap:12,marginBottom:16}}>
              <div><label style={{fontSize:11,fontWeight:700,color:"var(--muted)",textTransform:"uppercase",letterSpacing:.8,marginBottom:5,display:"block"}}>ID membro</label><input value={addCode} onChange={e=>setAddCode(e.target.value)} placeholder="es. mario_abc123"/></div>
              <div><label style={{fontSize:11,fontWeight:700,color:"var(--muted)",textTransform:"uppercase",letterSpacing:.8,marginBottom:5,display:"block"}}>Posiziona sotto</label>
                <select value={addPositionedUnder} onChange={e=>setAddPositionedUnder(e.target.value)}>
                  <option value="">Te stesso</option>
                  {downline.map(m=><option key={m.id} value={m.id}>{m.nome||m.email} {m.cognome||""}</option>)}
                </select>
              </div>
              <div><label style={{fontSize:11,fontWeight:700,color:"var(--muted)",textTransform:"uppercase",letterSpacing:.8,marginBottom:5,display:"block"}}>Squadra</label>
                <select value={addTeam} onChange={e=>setAddTeam(e.target.value)}>
                  <option value="">Non assegnata</option>
                  <option value="sinistra">Sinistra</option>
                  <option value="destra">Destra</option>
                </select>
              </div>
            </div>
            <div style={{display:"flex",gap:9,justifyContent:"flex-end"}}>
              <button onClick={()=>{setShowAddModal(false);setAddCode("");}} style={{padding:"9px 15px",background:"var(--bg4)",color:"#7da8d8",border:"1px solid var(--border2)",borderRadius:9,cursor:"pointer",fontWeight:600,fontSize:13}}>Annulla</button>
              <button onClick={handleAddManual} disabled={addLoading} style={{padding:"9px 20px",background:"linear-gradient(135deg,var(--a1),var(--a2))",color:"#fff",border:"none",borderRadius:9,cursor:addLoading?"not-allowed":"pointer",fontWeight:800,fontSize:13,display:"flex",alignItems:"center",gap:7,opacity:addLoading?0.7:1}}>
                {addLoading&&<span className="spinner"/>}Aggiungi
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{display:"flex",background:"var(--bg3)",borderRadius:10,padding:4,marginBottom:16,border:"1px solid var(--border)"}}>
        {[{id:"dashboard",label:"Dashboard"},{id:"albero",label:"Albero"},{id:"membri",label:"Membri"}].map(t=>(
          <button key={t.id} onClick={()=>setActiveTeamTab(t.id)}
            style={{flex:1,padding:"8px 16px",borderRadius:8,border:"none",cursor:"pointer",fontSize:12,fontWeight:700,fontFamily:"inherit",transition:"all .2s",background:activeTeamTab===t.id?"var(--bg4)":"transparent",color:activeTeamTab===t.id?"var(--a2)":"var(--muted)",boxShadow:activeTeamTab===t.id?"inset 0 0 0 1px var(--sidebar-border)":"none"}}>
            {t.label}
          </button>
        ))}
      </div>

      {activeTeamTab==="albero"&&(
        <div style={{marginBottom:16}}>
          {/* Zona in attesa */}
          {inAttesa.length>0&&(
            <div style={{background:"var(--bg2)",border:"1px solid #f59e0b30",borderRadius:14,padding:"1.2rem",marginBottom:12}}>
              <div style={{fontSize:12,fontWeight:800,color:"#f59e0b",marginBottom:10}}>
                In attesa di posizionamento — seleziona una persona poi clicca lo slot nell albero
              </div>
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                {inAttesa.map(m=>{
                  const team=getTeamForMe(m);
                  const color=team==="sinistra"?"var(--a1)":"#10b981";
                  const isSelected=selectedForPlacement?.id===m.id;
                  return(
                    <button key={m.id} onClick={()=>setSelectedForPlacement(isSelected?null:m)}
                      style={{padding:"8px 14px",background:isSelected?color+"30":"var(--bg3)",border:"2px solid "+(isSelected?color:"var(--border2)"),borderRadius:9,cursor:"pointer",color:isSelected?color:"var(--text)",fontWeight:700,fontSize:12,transition:"all .2s"}}>
                      {m.nome||m.email} {m.cognome||""} <span style={{fontSize:10,color:color,marginLeft:4}}>{team}</span>
                    </button>
                  );
                })}
              </div>
              {selectedForPlacement&&<div style={{fontSize:11,color:"#f59e0b",marginTop:8}}>Ora clicca su uno slot vuoto nell albero per posizionare {selectedForPlacement.nome||selectedForPlacement.email}</div>}
            </div>
          )}

          {/* Albero */}
          <div style={{background:"var(--bg2)",border:"1px solid var(--border)",borderRadius:14,padding:"1.4rem",overflowX:"auto"}}>
            <div style={{fontSize:13,fontWeight:800,color:"var(--text)",marginBottom:20}}>Albero genealogico</div>
            {posizionati.length===0&&inAttesa.length===0
              ?<div style={{textAlign:"center",padding:"3rem",color:"var(--border2)"}}>Nessun membro ancora</div>
              :<TreeNode
                memberId={auth.userId}
                memberNome={auth.profile?.nome||""}
                memberCognome={auth.profile?.cognome||""}
                memberEmail={auth.email}
                allMembers={posizionati}
                dlProspects={dlProspects}
                positions={positions}
                onSelect={setSelectedMember}
                depth={0}
                selectedForPlacement={selectedForPlacement}
                onPlaceHere={async(nodeId,team)=>{
                  if(!selectedForPlacement)return;
                  await onPositionInTree(selectedForPlacement.id,nodeId,team);
                  setSelectedForPlacement(null);
                }}
              />
            }
          </div>
        </div>
      )}

      {activeTeamTab!=="albero"&&(
        <>
          {activeTeamTab==="dashboard"&&(
            <>
              <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:12,marginBottom:16}}>
                {[{label:"Membri",value:downline.length,color:"#8b5cf6",icon:""},{label:"In percorso",value:statsTot.act,color:"var(--a1)",icon:""},{label:"Iscritti",value:statsTot.sub,color:"#10b981",icon:""},{label:"Conv. team",value:statsTot.conv+"%",color:convColor(statsTot.conv),icon:""},{label:"BV team",value:statsTot.bv,color:"#f59e0b",icon:""}].map((k,i)=>(
                  <div key={i} style={{background:"var(--bg2)",border:"1px solid var(--border)",borderRadius:14,padding:"16px 18px",position:"relative",overflow:"hidden"}}>
                    <div style={{position:"absolute",top:0,left:0,right:0,height:3,background:"linear-gradient(90deg,"+k.color+","+k.color+"44)",borderRadius:"14px 14px 0 0"}}/>
                    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
                      <span style={{fontSize:10,color:"var(--muted)",fontWeight:700,textTransform:"uppercase",letterSpacing:.8}}>{k.label}</span>
                      <span style={{fontSize:14,padding:6,borderRadius:8,background:k.color+"18"}}>{k.icon}</span>
                    </div>
                    <div style={{fontSize:30,fontWeight:900,color:k.color,lineHeight:1}}>{k.value}</div>
                  </div>
                ))}
              </div>

              {(sinistra.length>0||destra.length>0)&&(
                <>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
                    {[{team:"sinistra",stats:statsS,color:"var(--a1)",members:sinistra.length},{team:"destra",stats:statsD,color:"#10b981",members:destra.length}].map(({team,stats,color,members})=>(
                      <div key={team} style={{background:"var(--bg2)",border:"1px solid "+color+"28",borderRadius:14,padding:"1.2rem"}}>
                        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
                          <span style={{fontSize:13,fontWeight:900,color,textTransform:"capitalize"}}>Squadra {team}</span>
                          <span style={{fontSize:11,color:"var(--muted)"}}>{members} membri</span>
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
                  <div style={{background:"var(--bg2)",border:"1px solid var(--border)",borderRadius:14,padding:"1.4rem",marginBottom:16}}>
                    <div style={{fontSize:13,fontWeight:800,color:"var(--text)",marginBottom:16}}>Confronto squadre</div>
                    <div style={{height:220}}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={compareData} margin={{top:5,right:10,left:-15,bottom:5}}>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false}/>
                          <XAxis dataKey="name" stroke="var(--muted)" fontSize={12}/>
                          <YAxis stroke="var(--muted)" fontSize={12} allowDecimals={false}/>
                          <Tooltip contentStyle={ts} itemStyle={{color:"var(--text)"}} labelStyle={{color:"var(--text)",fontWeight:700}}/>
                          <Legend wrapperStyle={{fontSize:11}}/>
                          <Bar dataKey="sinistra" name="Sinistra" fill="var(--a1)" radius={[4,4,0,0]}/>
                          <Bar dataKey="destra" name="Destra" fill="#10b981" radius={[4,4,0,0]}/>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </>
              )}
            </>
          )}

          <div style={{background:"var(--bg2)",border:"1px solid var(--border)",borderRadius:14,overflow:"hidden"}}>
            <div style={{padding:"1rem 1.4rem",borderBottom:"1px solid #11203a",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:10}}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <div style={{fontSize:13,fontWeight:800,color:"var(--text)"}}>Membri</div>
                <button onClick={()=>setShowAddModal(true)} style={{width:26,height:26,borderRadius:"50%",background:"linear-gradient(135deg,var(--a1),var(--a2))",color:"#fff",border:"none",cursor:"pointer",fontWeight:900,fontSize:15,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 0 10px #2563eb50"}}>+</button>
              </div>
              <div style={{display:"flex",gap:6}}>
                {["all","sinistra","destra","nessuna"].map(f=>(
                  <button key={f} onClick={()=>setTeamFilter(f)}
                    style={{padding:"5px 12px",borderRadius:8,border:teamFilter===f?"1px solid #2563eb40":"1px solid transparent",cursor:"pointer",fontSize:11,fontWeight:700,fontFamily:"inherit",transition:"all .2s",background:teamFilter===f?"var(--bg4)":"transparent",color:teamFilter===f?"var(--a2)":"var(--muted)"}}>
                    {f==="all"?"Tutti":f==="nessuna"?"Non assegnati":f.charAt(0).toUpperCase()+f.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            {downline.length===0
              ?<div style={{padding:"3rem",textAlign:"center",color:"var(--border2)"}}><div style={{fontSize:36,marginBottom:12}}>{"\u25c8"}</div><p style={{fontSize:14,marginBottom:8}}>Nessun membro ancora</p><p style={{fontSize:12,color:"var(--border2)"}}>Condividi il tuo link referral</p></div>
              :<table style={{width:"100%",borderCollapse:"collapse"}}>
                <thead><tr style={{borderBottom:"1px solid #11203a"}}>{["Membro","Squadra","Prospect","Iscritti","Conv%","BV","Azione",""].map(h=>(<th key={h} style={{textAlign:"left",color:"var(--muted)",fontWeight:700,fontSize:10,textTransform:"uppercase",padding:"11px 16px",whiteSpace:"nowrap"}}>{h}</th>))}</tr></thead>
                <tbody>{filteredMembers.map(m=>{
                  const mP=getMemberProspects(m.id);
                  const ms=teamStats(mP);
                  const myTeam=getTeamForMe(m);
                  const teamColor=myTeam==="sinistra"?"var(--a1)":myTeam==="destra"?"#10b981":"#6b7280";
                  const isMyDirect=m.positioned_under===auth.userId;
                  return(
                    <tr key={m.id} style={{borderBottom:"1px solid #0d1b3355"}}>
                      <td style={{padding:"12px 16px"}}><div style={{display:"flex",alignItems:"center",gap:10}}><Av n={m.nome||m.email} c={m.cognome} color={teamColor}/><div>
                        <div style={{color:"var(--text)",fontWeight:700,fontSize:13}}>{m.nome||m.email} {m.cognome||""}</div>
                        {m.citta&&<div style={{color:"var(--muted)",fontSize:11}}>{m.citta}</div>}
                      </div></div></td>
                      <td style={{padding:"12px 16px"}}>
                        {isMyDirect
                          ?<select value={getTeam(m.id,auth.userId)||""} onChange={e=>onAssignTeam(m.id,e.target.value||null)} style={{width:"auto",minWidth:110,fontSize:11,padding:"5px 9px",color:teamColor,border:"1px solid "+teamColor+"40",background:"var(--bg3)"}}>
                            <option value="">Non assegnato</option>
                            <option value="sinistra">Sinistra</option>
                            <option value="destra">Destra</option>
                          </select>
                          :<span style={{fontSize:11,color:teamColor,fontWeight:700}}>{myTeam||"\u2014"}</span>
                        }
                      </td>
                      <td style={{padding:"12px 16px",fontWeight:700,color:"var(--text)",fontSize:13}}>{ms.total}</td>
                      <td style={{padding:"12px 16px",fontWeight:700,color:"#10b981",fontSize:13}}>{ms.sub}</td>
                      <td style={{padding:"12px 16px",fontWeight:800,fontSize:13,color:convColor(ms.conv)}}>{ms.conv}%</td>
                      <td style={{padding:"12px 16px",fontWeight:800,fontSize:13,color:"#f59e0b"}}>{ms.bv}</td>
                      <td style={{padding:"12px 16px"}}><button onClick={()=>setSelectedMember(m)} style={{padding:"6px 12px",background:"var(--bg4)",color:"var(--a2)",border:"1px solid var(--border2)",borderRadius:7,cursor:"pointer",fontWeight:700,fontSize:11}}>Dettaglio</button></td>
                      <td style={{padding:"12px 16px",color:"var(--border2)",fontSize:16}}>{"\u203a"}</td>
                    </tr>
                  );
                })}</tbody>
              </table>
            }
          </div>
        </>
      )}
    </div>
  );
}