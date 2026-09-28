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
  get CLOSING() { return tono("#22d3ee"); }, SUB:"#10b981",
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
  get INVITO() { return tono("#eab308"); },
  // I due verdi sono un vincolo di progetto (percorso = verde, Closing = verde piu'
  // scuro), quindi si separano sulla LUMINOSITA', non sulla tinta: menta chiaro
  // contro verde bosco. A bassa opacita' la differenza si appiattisce comunque —
  // e' la barra piena a sinistra della riga a renderla leggibile, per questo e'
  // spessa 5px e non 3.
  get FISSATO() { return tono("#86efac"); }, get CONOSCITIVA() { return tono("#86efac"); },
  get FUP1() { return tono("#86efac"); }, get FUP2() { return tono("#86efac"); }, get PACK() { return tono("#86efac"); },
  CLOSING:"#15803d",
  get SUB() { return tono("#38bdf8"); },
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


// ══════════════════════════════════════════════════════════════
// CRONOLOGIA MODIFICHE (frecce indietro / avanti) — parte PURA.
// Lo state della pila vive in App.jsx (useCronologia), istanziato una volta sola e
// passato alle viste. Qui stanno solo: confronto tra valori, costruttori delle
// azioni (ricevono lettura e scrittura come parametri, non chiamano la rete da soli)
// e i due pulsanti, che sono pura presentazione.
//
// Ogni azione sa verificare PRIMA di agire che nessun altro abbia toccato la riga:
// senza questa guardia, annullare riscriverebbe alla cieca un valore vecchio sopra la
// modifica di un collega, e in un CRM senza registro delle modifiche nessuno se ne
// accorgerebbe mai.
// ══════════════════════════════════════════════════════════════

// Rende confrontabili due valori arrivati da strade diverse (memoria vs database):
// - jsonb riordina le chiavi degli oggetti: si confrontano in ordine alfabetico
// - un timestamptz torna in un formato diverso da quello scritto ("...Z" vs "+00:00"):
//   si confronta l'istante, non la stringa
// - null, undefined e chiave assente dentro un oggetto valgono uguale
// Nel dubbio il confronto sbaglia dalla parte sicura: un falso "modificato da altri"
// blocca un undo innocuo, mentre un falso "uguale" sovrascriverebbe lavoro altrui.
function normalizzaValore(v) {
  if (v === undefined || v === null) return null;
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}T/.test(v)) {
    const t = Date.parse(v);
    return isNaN(t) ? v : "@" + t;
  }
  if (Array.isArray(v)) return v.map(normalizzaValore);
  if (typeof v === "object") {
    const o = {};
    Object.keys(v).sort().forEach(k => {
      const n = normalizzaValore(v[k]);
      if (n !== null) o[k] = n;
    });
    return o;
  }
  return v;
}

export function valoriUguali(a, b) {
  return JSON.stringify(normalizzaValore(a)) === JSON.stringify(normalizzaValore(b));
}

export function scegliCampi(obj, chiavi) {
  const o = {};
  chiavi.forEach(k => { o[k] = obj == null ? null : (obj[k] === undefined ? null : obj[k]); });
  return o;
}

// Solo le chiavi il cui valore e' davvero cambiato. Serve a scrivere il minimo
// indispensabile: riscrivere un campo non toccato cancellerebbe la modifica che un
// collega ci ha fatto nel frattempo.
export function campiCambiati(prima, dopo) {
  const tutte = Object.keys({ ...(prima || {}), ...(dopo || {}) });
  return tutte.filter(k => !valoriUguali(prima ? prima[k] : null, dopo ? dopo[k] : null));
}

// Modifica di alcuni campi di una riga esistente.
// `prima` e `dopo` hanno le stesse chiavi, valori in formato database.
export function azioneModifica({ etichetta, leggi, scrivi, prima, dopo }) {
  const chiavi = Object.keys(dopo);
  const verifica = atteso => async () => {
    const riga = await leggi();
    if (!riga) return "la riga non esiste piu'";
    return valoriUguali(scegliCampi(riga, chiavi), atteso) ? null : "e' stata modificata da qualcun altro nel frattempo";
  };
  return {
    etichetta,
    verificaAnnulla: verifica(dopo), annulla: () => scrivi(prima),
    verificaRipeti: verifica(prima), ripeti: () => scrivi(dopo),
  };
}

// Creazione di una riga: annullare = cancellarla, ripetere = reinserirla identica.
// `riga` e' quella restituita dal database all'inserimento (con created_at & co).
export function azioneCreazione({ etichetta, leggi, cancella, reinserisci, riga }) {
  return {
    etichetta,
    verificaAnnulla: async () => {
      const attuale = await leggi();
      if (!attuale) return null; // gia' sparita: annullare non ha niente da fare
      return valoriUguali(attuale, riga) ? null : "e' stata modificata da qualcun altro nel frattempo";
    },
    annulla: () => cancella(),
    verificaRipeti: async () => ((await leggi()) ? "esiste gia'" : null),
    ripeti: () => reinserisci(riga),
  };
}

// Cancellazione: `riga` e' l'istantanea grezza letta dal database PRIMA di cancellare,
// cosi' il ripristino rimette la riga identica (proprietario e data di creazione compresi).
export function azioneCancellazione({ etichetta, leggi, cancella, reinserisci, riga }) {
  return {
    etichetta,
    verificaAnnulla: async () => ((await leggi()) ? "e' gia' stata ripristinata" : null),
    annulla: () => reinserisci(riga),
    verificaRipeti: async () => {
      const attuale = await leggi();
      if (!attuale) return null;
      return valoriUguali(attuale, riga) ? null : "e' stata modificata da qualcun altro nel frattempo";
    },
    ripeti: () => cancella(),
  };
}

// Piu' scritture che per l'utente sono UN solo gesto (es. l'invito dalla Lista Nomi:
// segna il nome come invitato E crea il prospect). Si verificano TUTTE prima di
// scrivere qualunque cosa: o si annulla tutto, o niente. Annullarne meta' lascerebbe
// dati incoerenti (un nome "invitato" senza prospect).
export function azioneComposta(etichetta, azioni) {
  const inverse = [...azioni].reverse();
  const verificaTutte = async (lista, metodo) => {
    for (const a of lista) { const p = await a[metodo](); if (p) return p; }
    return null;
  };
  return {
    etichetta,
    verificaAnnulla: () => verificaTutte(inverse, "verificaAnnulla"),
    annulla: async () => { for (const a of inverse) await a.annulla(); },
    verificaRipeti: () => verificaTutte(azioni, "verificaRipeti"),
    ripeti: async () => { for (const a of azioni) await a.ripeti(); },
  };
}

// I due pulsanti. Il tooltip dice COSA verra' annullato: in un CRM condiviso una
// freccia che non dichiara cosa fa e' peggio di nessuna freccia.
export function FrecceCronologia({ cronologia }) {
  if (!cronologia) return null;
  const mac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent || "");
  const cmd = mac ? "\u2318" : "Ctrl+";
  const puoA = cronologia.puoAnnullare && !cronologia.occupato;
  const puoR = cronologia.puoRipetere && !cronologia.occupato;
  const stile = attivo => ({
    width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center",
    borderRadius: 10, border: "1px solid var(--border2)", background: "var(--bg3)",
    color: attivo ? "var(--text)" : "var(--border2)", cursor: attivo ? "pointer" : "default",
    opacity: attivo ? 1 : .55, padding: 0, fontFamily: "inherit",
  });
  const freccia = specchiata => (
    <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true" style={specchiata ? { transform: "scaleX(-1)" } : undefined}>
      <path d="M9 14L4 9l5-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
  return (
    <div style={{ display: "flex", gap: 6 }}>
      <button type="button" onClick={cronologia.annulla} disabled={!puoA} aria-label="Annulla l'ultima modifica"
        title={cronologia.puoAnnullare ? "Annulla: " + cronologia.etichettaAnnulla + "  (" + cmd + "Z)" : "Niente da annullare"}
        style={stile(puoA)}>{freccia(false)}</button>
      <button type="button" onClick={cronologia.ripeti} disabled={!puoR} aria-label="Ripeti la modifica annullata"
        title={cronologia.puoRipetere ? "Ripeti: " + cronologia.etichettaRipeti + "  (" + cmd + "\u21e7Z)" : "Niente da ripetere"}
        style={stile(puoR)}>{freccia(true)}</button>
    </div>
  );
}


// ══════════════════════════════════════════════════════════════
// TEMI E ASPETTO (chiaro / scuro)
// Spostati qui da App.jsx e Profilo.jsx, dove erano copiati identici: aggiungere la
// versione chiara avrebbe raddoppiato la duplicazione, e alla prima modifica le due
// copie sarebbero divergite. Due assi indipendenti, come su Mac e iPhone: il COLORE
// d'accento (Blu, Verde...) e l'ASPETTO (chiaro o scuro), combinabili liberamente.
//
// Eccezione dichiarata alla regola "niente state" di questo file: applyTema scrive sul
// documento (variabili CSS e attributo data-aspetto). E' lo stato GLOBALE della pagina,
// come le variabili CSS stesse: non e' state React e non chiama la rete.
// ══════════════════════════════════════════════════════════════

// I temi scuri sono IDENTICI a prima: in modalita' scura non cambia nulla.
// `a2Chiaro`: il colore d'accento dei testi (menu attivo, link, contatori) nella versione
// chiara. Stessa tinta dell'--a2 scuro, scurita fino a contrasto 4.5:1 sul bianco perche'
// si usa per testo piccolo. Calcolato, non scelto a occhio.
export const TEMI = {
  blu:   { label:"Blu",   preview:"linear-gradient(135deg,#1e40af,#0ea5e9)", vars:{"--bg":"#060b18","--bg2":"#080f1f","--bg3":"#0a1426","--bg4":"#0d1b33","--border":"#11203a","--border2":"#1e3a5f","--a1":"#2563eb","--a2":"#0ea5e9","--a1-10":"#2563eb1a","--a1-12":"#2563eb1f","--a1-13":"#2563eb21","--a1-18":"#2563eb2e","--a1-25":"#2563eb40","--a1-31":"#2563eb4f","--text":"#eff6ff","--muted":"#5278a8","--muted2":"#2a4060","--sidebar-active":"#0d1b33","--riga":"#0d1b3355","--sidebar-border":"#2563eb40"}, a2Chiaro:"#0b7eb2" },
  verde: { label:"Verde", preview:"linear-gradient(135deg,#065f46,#10b981)", vars:{"--bg":"#030d08","--bg2":"#041208","--bg3":"#06180d","--bg4":"#082014","--border":"#0a2a14","--border2":"#134d28","--a1":"#059669","--a2":"#10b981","--a1-10":"#0596691a","--a1-12":"#0596691f","--a1-13":"#05966921","--a1-18":"#0596692e","--a1-25":"#05966940","--a1-31":"#0596694f","--text":"#ecfdf5","--muted":"#3d7a5a","--muted2":"#1a3d2a","--sidebar-active":"#082014","--riga":"#08201455","--sidebar-border":"#05966940"}, a2Chiaro:"#0c855d" },
  viola: { label:"Viola", preview:"linear-gradient(135deg,#4c1d95,#a78bfa)", vars:{"--bg":"#06030f","--bg2":"#0a0518","--bg3":"#0f0820","--bg4":"#140b2a","--border":"#1a1035","--border2":"#2e1a55","--a1":"#7c3aed","--a2":"#a78bfa","--a1-10":"#7c3aed1a","--a1-12":"#7c3aed1f","--a1-13":"#7c3aed21","--a1-18":"#7c3aed2e","--a1-25":"#7c3aed40","--a1-31":"#7c3aed4f","--text":"#f5f3ff","--muted":"#6b5a9a","--muted2":"#2d1a55","--sidebar-active":"#140b2a","--riga":"#140b2a55","--sidebar-border":"#7c3aed40"}, a2Chiaro:"#7e55f8" },
  rosa:  { label:"Rosa",  preview:"linear-gradient(135deg,#9d174d,#f472b6)", vars:{"--bg":"#0f0308","--bg2":"#180510","--bg3":"#200718","--bg4":"#2a0a20","--border":"#380d2a","--border2":"#5a1a42","--a1":"#db2777","--a2":"#f472b6","--a1-10":"#db27771a","--a1-12":"#db27771f","--a1-13":"#db277721","--a1-18":"#db27772e","--a1-25":"#db277740","--a1-31":"#db27774f","--text":"#fdf2f8","--muted":"#8a4a6b","--muted2":"#4a1530","--sidebar-active":"#2a0a20","--riga":"#2a0a2055","--sidebar-border":"#db277740"}, a2Chiaro:"#e2127e" },
  oro:   { label:"Oro",   preview:"linear-gradient(135deg,#78350f,#fbbf24)", vars:{"--bg":"#080600","--bg2":"#0f0c00","--bg3":"#181200","--bg4":"#201800","--border":"#2a2000","--border2":"#3d3000","--a1":"#d97706","--a2":"#fbbf24","--a1-10":"#d977061a","--a1-12":"#d977061f","--a1-13":"#d9770621","--a1-18":"#d977062e","--a1-25":"#d9770640","--a1-31":"#d977064f","--text":"#fffbeb","--muted":"#7a6530","--muted2":"#3d3000","--sidebar-active":"#201800","--riga":"#20180055","--sidebar-border":"#d9770640"}, a2Chiaro:"#986e03" },
};

// Base neutra per l'aspetto chiaro, comune a tutti i colori d'accento (come Apple, che
// non tinge lo sfondo col colore scelto). Grigi dal chiaro allo scuro per profondita'.
const BASE_CHIARA = {
  "--bg":"#f5f5f7", "--bg2":"#ffffff", "--bg3":"#f2f3f6", "--bg4":"#e9ebf0",
  "--border":"#e2e5ea", "--border2":"#c9ced6",
  "--text":"#1d1d1f", "--muted":"#6e6e73", "--muted2":"#aeaeb2",
  "--riga":"#0f172a12",
};

function varsDelTema(temaKey, aspetto) {
  const t = TEMI[temaKey] || TEMI.blu;
  if (aspetto !== "chiaro") return t.vars;
  const d = t.vars;
  return {
    ...BASE_CHIARA,
    // --a1 resta quello scuro: e' il riempimento dei bottoni, con testo bianco sopra,
    // e quel contrasto non dipende dallo sfondo della pagina
    "--a1": d["--a1"], "--a2": t.a2Chiaro,
    "--a1-10": d["--a1-10"], "--a1-12": d["--a1-12"], "--a1-13": d["--a1-13"],
    "--a1-18": d["--a1-18"], "--a1-25": d["--a1-25"], "--a1-31": d["--a1-31"],
    "--sidebar-active": d["--a1"] + "14", "--sidebar-border": d["--sidebar-border"],
  };
}

// Segna l'aspetto sul documento. Separata da applyTema perche' App.jsx la chiama DURANTE
// il render: i componenti figli, renderizzati subito dopo, leggono gia' l'aspetto giusto
// in tono(). Se la si impostasse solo in un effetto (dopo il render), i colori delle fasi
// resterebbero del tono sbagliato fino al render successivo.
export function segnaAspetto(aspetto) {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.aspetto = aspetto === "chiaro" ? "chiaro" : "scuro";
}

export function applyTema(temaKey, aspetto) {
  if (typeof document === "undefined") return;
  const vars = varsDelTema(temaKey, aspetto);
  const root = document.documentElement;
  Object.entries(vars).forEach(([k, v]) => root.style.setProperty(k, v));
  // color-scheme: senza, menu a tendina, calendario e barre di scorrimento NATIVE del
  // browser non seguono il tema
  root.style.colorScheme = aspetto === "chiaro" ? "light" : "dark";
  segnaAspetto(aspetto);
  document.body.style.background = vars["--bg"];
}

// Toni dei colori funzionali in aspetto CHIARO. Solo quelli che su fondo bianco
// sparivano (contrasto sotto 3:1) E che si usano come testo o linea sottile sulla
// pagina: stessa tinta e saturazione, luminosita' abbassata del minimo indispensabile
// per arrivare a 3:1. I riempimenti con testo bianco sopra (toast, bottoni, nodi della
// mappa) non stanno qui: il loro contrasto non dipende dallo sfondo della pagina.
const TONI_CHIARI = {
  "#86efac":"#16aa4c",
  "#eab308":"#b98d06",
  "#38bdf8":"#089ee1",
  "#22d3ee":"#0ea1b8",
  "#fbbf24":"#c08b04",
  "#d8b4fe":"#b775fd",
  "#a5b4fc":"#768dfa",
  "#4ade80":"#1fa851",
  "#cbd5e1":"#7d96b4"
};

// Il tono giusto per l'aspetto attivo. Legge l'attributo sul documento: nessuno state,
// nessun import circolare, e il valore e' sempre quello appena applicato.
export function tono(hex) {
  if (typeof document === "undefined") return hex;
  if (document.documentElement.dataset.aspetto !== "chiaro") return hex;
  return TONI_CHIARI[(hex || "").toLowerCase()] || hex;
}


// ══════════════════════════════════════════════════════════════
// EVENTI — chi conta nei totali.
// Un ticket "in forse" o che "non viene" resta SEMPRE visibile in elenco ma non entra in
// nessun conteggio: numero dei venduti, Sinistra/Destra, contatori, leaderboard, grafico
// Andamento e KPI "Ticket evento" della Dashboard. E' la regola "escluso dai CALCOLI,
// mai dalle LISTE" applicata ai ticket.
// Sta QUI, in un punto solo, perche' il KPI della Dashboard la usa da due file diversi
// (App.jsx ed Eventi.jsx): quando ognuno aveva la propria copia del filtro, i due numeri
// sono finiti fuori allineamento. Funziona sia sulle righe in memoria sia su quelle grezze
// del database: hanno gli stessi nomi di colonna.
// ══════════════════════════════════════════════════════════════
export const contaNeiTotali = p => !!p && !p.in_forse && !p.non_viene;