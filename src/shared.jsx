// ══════════════════════════════════════════════════════════════
// shared.jsx — costanti, helper puri e micro-componenti condivisi.
// Estratti da App.jsx per poter essere usati anche da Dash.jsx e Lista.jsx
// senza duplicarli. NON contiene chiamate di rete né state: solo roba pura.
// Se aggiungi una costante usata da più di un file, il posto è QUI.
// ══════════════════════════════════════════════════════════════

// Un membro è "attivo" se non ha stato_membro impostato (default storico) oppure se è esplicitamente "attivo".
// "rimborsato"/"mollato" → escluso dai calcoli aggregati (KPI, statistiche team, mappa) ma resta
// visibile per intero (prospect, ticket, dettaglio) a sponsor/upline.
export function isAttivo(m) { return !m || !m.stato_membro || m.stato_membro === "attivo"; }

export const PACCHETTI = [
  { key:"starter",   label:"Starter",   bv:100  },
  { key:"standard",  label:"Standard",  bv:250  },
  { key:"premium",   label:"Premium",   bv:550  },
  { key:"signature", label:"Signature", bv:1025 },
  { key:"altro",     label:"Altro",     bv:0    },
];
export function bvOfPacchetto(key, bvCustom) {
  if (key==="altro") return bvCustom||0;
  const p = PACCHETTI.find(x=>x.key===key);
  return p?p.bv:0;
}

// FISSATO sta tra INVITO e CONOSCITIVA: l'appuntamento si fissa dopo l'invito e
// prima di farlo. I prospect creati prima di questa fase non hanno FISSATO nello
// storico e non vanno riempiti a posteriori: la colonna si popola in avanti.
export const FASI_FUNNEL   = ["INVITO","FISSATO","CONOSCITIVA","FUP1","FUP2","PACK","CLOSING","SUB"];
export const FASI_DASH     = ["FISSATO","CONOSCITIVA","FUP1","FUP2","PACK","CLOSING","SUB"];
export const FASI_SPECIALI = ["DA_RISENTIRE","DA_RIFISSARE","NON_INT","NON_PIACE","RIMBORSO"];
export const FASI          = [...FASI_FUNNEL, ...FASI_SPECIALI];
export const FONTI         = ["Instagram","TikTok","Offline","Referenza","Lista Nomi","Modulo"];
export const FONTE_ICO     = { Instagram:"", TikTok:"", Offline:"", Referenza:"", "Lista Nomi":"", Modulo:"" };
export const INTERESSE     = ["Alto","Medio","Basso"];
export const INTERESSE_CLR = { Alto:"#10b981", Medio:"#f59e0b", Basso:"#ef4444" };
// Un prospect in fase RIMBORSO resta nell'anagrafica (mai cancellato) ma va escluso da qualunque
// calcolo aggregato — funnel, BV, conversione, dashboard — ovunque venga letto un array di prospect
// prima di passarlo a teamStats/funnel: filtrare sempre con isProspectAttivo.
export function isProspectAttivo(p) { return !p || p.fase !== "RIMBORSO"; }

export const FASE_CLR = {
  INVITO:"#8b5cf6", FISSATO:"#a855f7", CONOSCITIVA:"#7c3aed", FUP1:"#2563eb", FUP2:"#3b82f6", PACK:"var(--a2)",
  CLOSING:"#22d3ee", SUB:"#10b981",
  // Da risentire e Da rifissare erano ambra e arancio: troppo vicini al giallo
  // dell'Invito nella griglia. Spostati su lilla e indaco, l'unico settore di
  // tinta ancora libero. NB: niente turchese o verde-azzurro qui — il verde e'
  // riservato al percorso e al Closing, e un turchese ci finisce dentro.
  // Restano cosi' distinti anche dal gruppo "chiuso male" (Non int. grigio,
  // Non mi piace rosa, Rimborso rosso), tutto su toni caldi e neutri.
  DA_RISENTIRE:"#c084fc", DA_RIFISSARE:"#6366f1", NON_INT:"#6b7280", NON_PIACE:"#ec4899", RIMBORSO:"#ef4444",
};
// Colore di sfondo della riga nella griglia prospect, per fase corrente.
// NON e' FASE_CLR: quelli restano i colori delle caselle e dei grafici, e formano
// una scala viola->blu->verde che qui non serve. Questa scala risponde a un'altra
// domanda — "a che punto e' questa persona" — con tre soli stati leggibili di
// colpo: giallo = da lavorare, verde = in corso, azzurro = chiuso.
// PACK usa un verde esplicito e non var(--a2) perche' il valore va concatenato
// con l'alpha in esadecimale, e una CSS variable non si puo' concatenare.
// Le fasi speciali riusano i colori di FASE_CLR (vedi coloreRiga sotto).
export const FASE_RIGA_CLR = {
  INVITO:"#eab308",
  // I due verdi sono un vincolo di progetto (percorso = verde, Closing = verde piu'
  // scuro), quindi si separano sulla LUMINOSITA', non sulla tinta: menta chiaro
  // contro verde bosco. A bassa opacita' la differenza si appiattisce comunque —
  // e' la barra piena a sinistra della riga a renderla leggibile, per questo e'
  // spessa 5px e non 3.
  FISSATO:"#86efac", CONOSCITIVA:"#86efac", FUP1:"#86efac", FUP2:"#86efac", PACK:"#86efac",
  CLOSING:"#15803d",
  SUB:"#38bdf8",
};
// Opacita' dello sfondo riga e del bordo. Unici due punti da toccare per alzare
// o abbassare l'intensita': "1c" e' circa 11%, "2b" circa 17%, "3d" circa 24%.
export const RIGA_ALPHA        = "2b"; // fondo
export const RIGA_ALPHA_BORDO  = "70"; // bordo, volutamente molto piu' acceso del fondo
// Colore pieno della riga (fasi funnel dalla scala qui sopra, speciali dai colori
// che hanno gia' ovunque nell'app). Ritorna null se il colore e' una CSS variable,
// perche' un valore var() non si puo' concatenare con l'alpha esadecimale.
export function coloreRigaBase(fase) {
  const base = FASE_RIGA_CLR[fase] || FASE_CLR[fase];
  return base && base.charAt(0) === "#" ? base : null;
}
export function coloreRiga(fase) {
  const base = coloreRigaBase(fase);
  return base ? base + RIGA_ALPHA : null;
}

export const FASE_LABEL = {
  INVITO:"Invito", FISSATO:"Fissato", CONOSCITIVA:"Conoscitiva", FUP1:"FUP 1", FUP2:"FUP 2", PACK:"Pack",
  CLOSING:"Closing", SUB:"Iscritto", DA_RISENTIRE:"Da risentire", DA_RIFISSARE:"Da rifissare", NON_INT:"Non Int.", NON_PIACE:"Non mi piace", RIMBORSO:"Rimborso",
};

export const PLEASURES = [
  { key:"tempo", label:"Tempo" },
  { key:"relazioni", label:"Relazioni / Esperienze" },
  { key:"crescita", label:"Crescita Personale" },
  { key:"internet_money", label:"Internet Money" },
  { key:"extra_mensile", label:"Extra Mensile" },
  { key:"investimenti", label:"Investimenti" },
];
export const FORZA = [
  { key:"soldi", label:"Soldi" },
  { key:"istruzione", label:"Istruzione" },
  { key:"sociale", label:"Sociale" },
];
export const PROFILO_TOTAL = PLEASURES.length + FORZA.length;

export const TV = [null, "-", ".", "+"];
export const TC = { null:"var(--border2)", "-":"#ef4444", ".":"#f59e0b", "+":"#10b981" };
export const TL = { "-":"\u2013", ".":"\u00b7", "+":"+" };
export function nextToggle(v) { const i = TV.indexOf(v); return TV[(i+1) % TV.length]; }

export function profiloBadge(p) {
  const pr = p.profilazione || {};
  let pos = 0, comp = 0;
  PLEASURES.forEach(f => { const v = pr.pleasures?.[f.key]; if (v!=null) comp++; if (v==="+") pos++; });
  FORZA.forEach(f => { const v = pr.forza?.[f.key]; if (v!=null) comp++; if (v==="+") pos++; });
  return { positivi:pos, compilati:comp };
}

export const JUNG = [
  { key:"blu",    label:"BLU",    sub:"Metodo e professionalita", desc:"Analitico, preciso, orientato al processo.",   bg:"linear-gradient(135deg,#3b4fd4,#6366f1)", border:"#6366f1", glow:"#6366f155" },
  { key:"rosso",  label:"ROSSO",  sub:"Risultati",                desc:"Diretto, competitivo, orientato all'azione.",  bg:"linear-gradient(135deg,#c2410c,#ef4444)", border:"#ef4444", glow:"#ef444455" },
  { key:"giallo", label:"GIALLO", sub:"Umanita e leggerezza",     desc:"Entusiasta, socievole, ottimista.",             bg:"linear-gradient(135deg,#b45309,#f59e0b)", border:"#f59e0b", glow:"#f59e0b55" },
  { key:"verde",  label:"VERDE",  sub:"Disposizione ad aiutare",  desc:"Empatico, paziente, affidabile.",              bg:"linear-gradient(135deg,#047857,#10b981)", border:"#10b981", glow:"#10b98155" },
];

export const CICLI = [
  [73,"2026-01-03","2026-01-31"],[74,"2026-01-31","2026-02-28"],[75,"2026-02-28","2026-03-28"],
  [76,"2026-03-28","2026-04-25"],[77,"2026-04-25","2026-05-23"],[78,"2026-05-23","2026-06-20"],
  [79,"2026-06-20","2026-07-18"],[80,"2026-07-18","2026-08-15"],[81,"2026-08-15","2026-09-12"],
  [82,"2026-09-12","2026-10-10"],[83,"2026-10-10","2026-11-07"],[84,"2026-11-07","2026-12-05"],
  [85,"2026-12-05","2027-01-02"],
];
export const CICLO_CORRENTE = (() => {
  const t = new Date().toISOString().split("T")[0];
  for (const [c,s,e] of CICLI) if (t>=s && t<e) return c;
  return CICLI[CICLI.length-1][0];
})();
export const CICLO_NUMS = CICLI.map(r=>r[0]).sort((a,b)=>b-a);

export function cicloOfDate(d) { if (!d) return null; for (const [c,s,e] of CICLI) if (d>=s && d<e) return c; return null; }
export function cicloLabel(c) {
  const r = CICLI.find(x=>x[0]===Number(c));
  if (!r) return "Ciclo "+c;
  const fd = s => new Date(s+"T12:00:00").toLocaleDateString("it-IT",{day:"numeric",month:"short"});
  return fd(r[1])+" \u2013 "+fd(r[2]);
}
export function dataByCiclo(arr,c) {
  const r = CICLI.find(x=>x[0]===Number(c));
  if (!r) return [];
  return arr.filter(p=>p.conosciutoAt && p.conosciutoAt>=r[1] && p.conosciutoAt<r[2]);
}
export function buildStorico(prospect, fase, dateForFase) {
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
// Riempie i buchi nello storico: se una fase è presente, tutte quelle prima nel funnel
// sono implicitamente state fatte (si procede sempre in ordine). Alle fasi mancanti si assegna
// la data della fase successiva già presente — NON conosciutoAt — così restano attribuite al
// ciclo giusto: se conosciutoAt è in un ciclo vecchio, datare lì una FUP1 mancante la
// conterebbe nel ciclo sbagliato e sballerebbe i numeri.
// Ritorna un array nuovo se ha cambiato qualcosa, altrimenti null (per evitare scritture inutili).
export function fillGapsStorico(p) {
  const storico = [...(p.storico||[])];
  if (!storico.length) return null;
  let maxIdx = -1;
  storico.forEach(s=>{ const i=FASI_FUNNEL.indexOf(s.fase); if (i>maxIdx) maxIdx=i; });
  if (maxIdx < 0) return null;
  const mancanti = [];
  for (let i=0;i<=maxIdx;i++) {
    const f = FASI_FUNNEL[i];
    if (!storico.some(s=>s.fase===f)) mancanti.push({fase:f, idx:i});
  }
  if (!mancanti.length) return null;
  mancanti.forEach(({fase, idx})=>{
    // data della prima fase successiva presente
    let data = null;
    for (let j=idx+1;j<=maxIdx;j++) {
      const succ = storico.find(s=>s.fase===FASI_FUNNEL[j]);
      if (succ) { data = succ.data; break; }
    }
    storico.push({fase, data: data || p.conosciutoAt});
  });
  return storico.sort((a,b)=>FASI_FUNNEL.indexOf(a.fase)-FASI_FUNNEL.indexOf(b.fase));
}

export function reachedInCiclo(p,fase,c) {
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

export function reachedEver(p,fase) {
  const storico = p.storico||[];
  if (storico.some(s=>s.fase===fase)) return true;
  // Se CONOSCITIVA non c'è ma FUP1 sì, considera raggiunta
  if (fase==="CONOSCITIVA") return storico.some(s=>s.fase==="FUP1");
  return false;
}
export function highestReached(p) {
  let best=null,bi=-1;
  (p.storico||[]).forEach(s=>{const i=FASI_FUNNEL.indexOf(s.fase);if(i>bi){bi=i;best=s.fase;}});
  return best||"INVITO";
}

export const genId = () => Date.now().toString(36)+Math.random().toString(36).slice(2);
export const today = () => new Date().toISOString().split("T")[0];
export const isOver  = d => d && d < today();
export const isToday = d => d === today();
export const fmt = d => d ? new Date(d+"T12:00:00").toLocaleDateString("it-IT") : "\u2014";
export function eta(dataNascita) {
  if (!dataNascita) return null;
  const nascita = new Date(dataNascita+"T12:00:00");
  const oggi = new Date();
  let anni = oggi.getFullYear() - nascita.getFullYear();
  const meseNonAncoraArrivato = oggi.getMonth() < nascita.getMonth();
  const stessoMeseGiornoPrima = oggi.getMonth() === nascita.getMonth() && oggi.getDate() < nascita.getDate();
  if (meseNonAncoraArrivato || stessoMeseGiornoPrima) anni--;
  return anni;
}

export function teamStats(prospects) {
  const total = prospects.length;
  const sub   = prospects.filter(p=>p.fase==="SUB").length;
  const act   = prospects.filter(p=>["CONOSCITIVA","FUP1","FUP2","PACK","CLOSING"].includes(p.fase)).length;
  const conv  = total>0 ? Math.round(sub/total*100) : 0;
  const bv    = prospects.filter(p=>p.fase==="SUB").reduce((acc,p)=>acc+bvOfPacchetto(p.pacchetto,p.bvCustom),0);
  return { total, sub, act, conv, bv };
}


// soft=true: disco scuro appena tinto con contorno e iniziali del colore, invece
// del cerchio pieno con testo bianco. Serve dove il colore arriva dalla palette
// delle righe (giallo, menta): un disco pieno di quei toni con iniziali bianche
// e' illeggibile e visivamente aggressivo. Variante e non sostituzione, perche'
// gli avatar di Dashboard, Team ed Eventi devono restare pieni.
export function Av({ n, c, color, size=34, soft=false }) {
  const style = soft
    ? {background:color+"1f", border:"1px solid "+color+"55", color:color, boxShadow:"none"}
    : {background:"linear-gradient(135deg,"+color+","+color+"99)", border:"none", color:"#fff", boxShadow:"0 0 10px "+color+"35"};
  return (
    <div style={{width:size,height:size,borderRadius:"50%",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:size*0.32,boxSizing:"border-box",...style}}>
      {(n||"?")[0]}{(c||"")[0]}
    </div>
  );
}