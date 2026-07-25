import { useState } from "react";

// ── COSTANTI LOCALI (duplicate volutamente, stesso pattern gia' usato in Team.jsx/Eventi.jsx) ──
const FASI_FUNNEL = ["INVITO","CONOSCITIVA","FUP1","FUP2","PACK","CLOSING","SUB"];
const FASE_LABEL  = { INVITO:"Invito", CONOSCITIVA:"Conoscitiva", FUP1:"FUP 1", FUP2:"FUP 2", PACK:"Pack", CLOSING:"Closing", SUB:"Iscritto" };

function giorniDa(dataStr) {
  if (!dataStr) return null;
  const oggi = new Date();
  const d = new Date(dataStr);
  if (isNaN(d.getTime())) return null;
  return Math.floor((oggi - d) / 86400000);
}
function ultimoMovimento(p) {
  const storico = p.storico || [];
  return storico.length ? storico[storico.length - 1].data : p.conosciutoAt;
}
function fmtGiorni(n) { return n === 1 ? "1 giorno" : n + " giorni"; }

// ══════════════════════════════════════════════════════════════
// MOTORE INSIGHT — tutto calcolato a regole sui dati gia' presenti nel CRM
// ══════════════════════════════════════════════════════════════
export function computeMentoreInsights(prospects, downline, cicloRangeCorrente, allProfiles, viewerId) {
  const attiviFunnel = prospects.filter(p => FASI_FUNNEL.includes(p.fase) && p.fase !== "SUB");

  // 1. Collo di bottiglia nel funnel
  let bottleneck = null;
  if (attiviFunnel.length >= 4) {
    const counts = {};
    attiviFunnel.forEach(p => { counts[p.fase] = (counts[p.fase] || 0) + 1; });
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    if (top) {
      const pct = Math.round((top[1] / attiviFunnel.length) * 100);
      if (pct >= 30) bottleneck = { fase: top[0], n: top[1], pct, totale: attiviFunnel.length };
    }
  }

  // 2. Prospect caldi abbandonati (interesse Alto, fermi da 7+ giorni)
  // SOLO i propri: e' un'azione personale, non ha senso mostrarla al team/upline
  const caldiAbbandonati = attiviFunnel
    .filter(p => p.interesse === "Alto" && p._userId === viewerId)
    .map(p => ({ ...p, giorniFermo: giorniDa(ultimoMovimento(p)) }))
    .filter(p => p.giorniFermo !== null && p.giorniFermo >= 7)
    .sort((a, b) => b.giorniFermo - a.giorniFermo);

  // 3. Membri fermi questo ciclo (zero prospect conosciuti nel ciclo corrente)
  let fermiCiclo = [];
  if (cicloRangeCorrente) {
    const [, start, end] = cicloRangeCorrente;
    fermiCiclo = downline.filter(m => {
      const suoi = prospects.filter(p => p._userId === m.id);
      if (suoi.length === 0) return false;
      const nelCiclo = suoi.filter(p => p.conosciutoAt && p.conosciutoAt >= start && p.conosciutoAt < end);
      return nelCiclo.length === 0;
    });
  }

  // 4. Membri senza contatti recenti (7+ giorni senza nessun movimento)
  const senzaContatti = downline.filter(m => {
    const suoi = prospects.filter(p => p._userId === m.id && FASI_FUNNEL.includes(p.fase) && p.fase !== "SUB");
    if (suoi.length === 0) return false;
    const movimenti = suoi.map(ultimoMovimento).filter(Boolean).sort().reverse();
    if (movimenti.length === 0) return false;
    const g = giorniDa(movimenti[0]);
    return g !== null && g >= 7;
  });

  // 5. Efficienza per membro (conversione %, solo chi ha almeno 3 prospect)
  const efficienza = downline
    .map(m => {
      const suoi = prospects.filter(p => p._userId === m.id);
      const sub = suoi.filter(p => p.fase === "SUB").length;
      return { membro: m, totale: suoi.length, sub, conv: suoi.length ? Math.round((sub / suoi.length) * 100) : 0 };
    })
    .filter(x => x.totale >= 3)
    .sort((a, b) => b.conv - a.conv);

  // 6. Concentrazione geografica del team (min 2 persone stessa citta')
  const perCitta = {};
  downline.forEach(m => {
    const citta = (m.citta || "").trim();
    if (!citta) return;
    (perCitta[citta] = perCitta[citta] || []).push(m);
  });
  const concentrazioneTeam = Object.entries(perCitta)
    .map(([citta, membri]) => ({ citta, membri, n: membri.length }))
    .filter(x => x.n >= 2)
    .sort((a, b) => b.n - a.n);

  // 7. Riepilogo settimanale (ultimi 7gg vs 7gg precedenti)
  const oggi = new Date();
  const fmt = d => d.toISOString().slice(0, 10);
  const settStart = fmt(new Date(oggi - 7 * 86400000));
  const prevStart = fmt(new Date(oggi - 14 * 86400000));
  const settOggi = fmt(oggi);
  const prospettiSett = prospects.filter(p => p.conosciutoAt >= settStart && p.conosciutoAt <= settOggi).length;
  const prospettiPrec = prospects.filter(p => p.conosciutoAt >= prevStart && p.conosciutoAt < settStart).length;
  const subSett = prospects.filter(p => (p.storico || []).some(s => s.fase === "SUB" && s.data >= settStart && s.data <= settOggi)).length;
  const subPrec = prospects.filter(p => (p.storico || []).some(s => s.fase === "SUB" && s.data >= prevStart && s.data < settStart)).length;

  // 8. Downline ferma (nessuna nuova registrazione sotto quel membro da 30+ giorni)
  const downlineFerma = [];
  if (allProfiles && allProfiles.length) {
    const figliDi = {};
    allProfiles.forEach(p => {
      if (p.positioned_under) (figliDi[p.positioned_under] = figliDi[p.positioned_under] || []).push(p);
    });
    function tuttaLaSottoDownline(id, visti) {
      const diretti = figliDi[id] || [];
      let tutti = [...diretti];
      diretti.forEach(c => {
        if (!visti.has(c.id)) { visti.add(c.id); tutti = tutti.concat(tuttaLaSottoDownline(c.id, visti)); }
      });
      return tutti;
    }
    downline.forEach(m => {
      const sotto = tuttaLaSottoDownline(m.id, new Set());
      if (sotto.length === 0) return; // non ha nessuno sotto, e' un altro tipo di problema (non stagnazione)
      const ultime = sotto.map(x => x.created_at).filter(Boolean).sort().reverse();
      if (ultime.length === 0) return;
      const g = giorniDa(ultime[0]);
      if (g !== null && g >= 30) downlineFerma.push({ membro: m, giorni: g, nSotto: sotto.length });
    });
    downlineFerma.sort((a, b) => b.giorni - a.giorni);
  }

  return { bottleneck, caldiAbbandonati, fermiCiclo, senzaContatti, efficienza, concentrazioneTeam,
    settimana: { prospettiSett, prospettiPrec, subSett, subPrec }, downlineFerma };
}

function getTopConsiglio(ins) {
  if (!ins) return null;
  if (ins.caldiAbbandonati.length > 0) {
    const top = ins.caldiAbbandonati[0];
    return { colore: "#ef4444", titolo: "Prospect caldo a rischio",
      testo: (top.nome || "") + " " + (top.cognome || "") + " è fermo da " + fmtGiorni(top.giorniFermo) + " nonostante interesse Alto. Ricontattalo oggi." };
  }
  if (ins.fermiCiclo.length > 0) {
    return { colore: "#f59e0b", titolo: "Persone da riaccendere",
      testo: ins.fermiCiclo.length + (ins.fermiCiclo.length === 1 ? " persona del team non ha" : " persone del team non hanno") + " aggiunto nessun prospect in questo ciclo." };
  }
  if (ins.downlineFerma.length > 0) {
    const top = ins.downlineFerma[0];
    return { colore: "#f59e0b", titolo: "Downline ferma",
      testo: "La downline di " + (top.membro.nome || "") + " " + (top.membro.cognome || "") + " non registra nuove persone da " + fmtGiorni(top.giorni) + " — potrebbe aver perso slancio nel duplicare." };
  }
  if (ins.bottleneck) {
    return { colore: "#3b82f6", titolo: "Collo di bottiglia nel funnel",
      testo: "Il " + ins.bottleneck.pct + "% dei prospect attivi è fermo in " + FASE_LABEL[ins.bottleneck.fase] + " — potrebbe mancare formazione su questo passaggio." };
  }
  if (ins.senzaContatti.length > 0) {
    return { colore: "#f59e0b", titolo: "Nessun contatto recente",
      testo: ins.senzaContatti.length + (ins.senzaContatti.length === 1 ? " persona non contatta" : " persone non contattano") + " nessun prospect da almeno 7 giorni." };
  }
  const s = ins.settimana;
  if (s && (s.prospettiSett > 0 || s.prospettiPrec > 0)) {
    const delta = s.prospettiSett - s.prospettiPrec;
    return { colore: "#10b981", titolo: "Settimana in corso",
      testo: s.prospettiSett + " prospect aggiunti negli ultimi 7 giorni (" + (delta >= 0 ? "+" : "") + delta + " rispetto alla settimana precedente)." };
  }
  return { colore: "#6b7280", titolo: "Tutto tranquillo",
    testo: "Nessun segnale urgente al momento — continua così." };
}

// ══════════════════════════════════════════════════════════════
// CARD CONSIGLI — per la Dashboard
// ══════════════════════════════════════════════════════════════
export function ConsigliCard({ insights }) {
  const consiglio = getTopConsiglio(insights);
  if (!consiglio) return null;
  return (
    <div style={{ background: "var(--bg2)", border: "1px solid " + consiglio.colore + "35", borderRadius: 14, padding: "14px 18px", marginBottom: 16, display: "flex", alignItems: "flex-start", gap: 12 }}>
      <div style={{ width: 8, height: 8, borderRadius: "50%", background: consiglio.colore, marginTop: 5, flexShrink: 0 }} />
      <div>
        <div style={{ fontSize: 10, fontWeight: 800, color: consiglio.colore, textTransform: "uppercase", letterSpacing: .8, marginBottom: 3 }}>Mentore · {consiglio.titolo}</div>
        <div style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.5 }}>{consiglio.testo}</div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// RENDER RISPOSTE — per ogni domanda preimpostata del chat widget
// ══════════════════════════════════════════════════════════════
function RispostaBottleneck({ ins }) {
  if (!ins.bottleneck) return <Vuoto testo="Nessun collo di bottiglia rilevante al momento — i prospect sono distribuiti in modo equilibrato tra le fasi." />;
  const b = ins.bottleneck;
  return (
    <div>
      <p style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.6, marginBottom: 10 }}>
        Il <b style={{ color: "#3b82f6" }}>{b.pct}%</b> dei prospect attivi ({b.n} su {b.totale}) è fermo in <b>{FASE_LABEL[b.fase]}</b>.
      </p>
      <p style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.5 }}>
        Se una fase concentra così tanti prospect rispetto alle altre, spesso significa che manca uno script o una formazione specifica su quel passaggio del percorso — vale la pena rivederlo insieme al team.
      </p>
    </div>
  );
}
function RispostaCaldi({ ins }) {
  if (ins.caldiAbbandonati.length === 0) return <Vuoto testo="Nessun tuo prospect caldo abbandonato al momento — ottimo lavoro di follow-up." />;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
      {ins.caldiAbbandonati.slice(0, 8).map(p => (
        <div key={p.id} style={{ background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 9, padding: "8px 11px" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text)" }}>{p.nome} {p.cognome || ""}</div>
          <div style={{ fontSize: 11, color: "#ef4444" }}>Fermo da {fmtGiorni(p.giorniFermo)} · {FASE_LABEL[p.fase]}</div>
        </div>
      ))}
      {ins.caldiAbbandonati.length > 8 && <div style={{ fontSize: 11, color: "var(--muted)" }}>+ altri {ins.caldiAbbandonati.length - 8}</div>}
    </div>
  );
}
function RispostaFermiCiclo({ ins }) {
  if (ins.fermiCiclo.length === 0) return <Vuoto testo="Tutti i membri del team hanno aggiunto almeno un prospect in questo ciclo." />;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {ins.fermiCiclo.map(m => (
        <div key={m.id} style={{ fontSize: 12, color: "var(--text)", background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 8, padding: "7px 11px" }}>
          {m.nome || ""} {m.cognome || ""}
        </div>
      ))}
    </div>
  );
}
function RispostaSenzaContatti({ ins }) {
  if (ins.senzaContatti.length === 0) return <Vuoto testo="Tutti stanno contattando i propri prospect regolarmente." />;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {ins.senzaContatti.map(m => (
        <div key={m.id} style={{ fontSize: 12, color: "var(--text)", background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 8, padding: "7px 11px" }}>
          {m.nome || ""} {m.cognome || ""}
        </div>
      ))}
    </div>
  );
}
function RispostaDownlineFerma({ ins }) {
  if (ins.downlineFerma.length === 0) return <Vuoto testo="Tutte le downline stanno registrando nuove persone regolarmente — nessun ramo sembra essersi fermato." />;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
      {ins.downlineFerma.slice(0, 8).map(x => (
        <div key={x.membro.id} style={{ background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 9, padding: "8px 11px" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text)" }}>{x.membro.nome || ""} {x.membro.cognome || ""}</div>
          <div style={{ fontSize: 11, color: "#f59e0b" }}>Nessuna registrazione da {fmtGiorni(x.giorni)} · {x.nSotto} persone nella downline</div>
        </div>
      ))}
    </div>
  );
}
function RispostaEfficienza({ ins }) {
  if (ins.efficienza.length === 0) return <Vuoto testo="Serve almeno qualche prospect a testa per calcolare l'efficienza del team." />;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {ins.efficienza.slice(0, 6).map((x, i) => (
        <div key={x.membro.id} style={{ display: "flex", alignItems: "center", gap: 9, background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 8, padding: "7px 11px" }}>
          <span style={{ fontSize: 11, fontWeight: 800, color: "var(--border2)", width: 14 }}>{i + 1}</span>
          <span style={{ flex: 1, fontSize: 12, color: "var(--text)" }}>{x.membro.nome || ""} {x.membro.cognome || ""}</span>
          <span style={{ fontSize: 12, fontWeight: 800, color: x.conv >= 20 ? "#10b981" : x.conv >= 10 ? "#f59e0b" : "var(--muted)" }}>{x.conv}%</span>
        </div>
      ))}
    </div>
  );
}
function RispostaConcentrazione({ ins }) {
  if (ins.concentrazioneTeam.length === 0) return <Vuoto testo="Il team è distribuito su poche persone per città — non emergono ancora zone con concentrazione utile per un evento dal vivo." />;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
      {ins.concentrazioneTeam.slice(0, 6).map(c => (
        <div key={c.citta} style={{ background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 9, padding: "8px 11px" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text)" }}>{c.citta} <span style={{ color: "var(--a2)", fontWeight: 800 }}>· {c.n} persone</span></div>
          <div style={{ fontSize: 11, color: "var(--muted)" }}>{c.membri.map(m => m.nome).filter(Boolean).join(", ")}</div>
        </div>
      ))}
    </div>
  );
}
function RispostaSettimana({ ins }) {
  const s = ins.settimana;
  const delta = s.prospettiSett - s.prospettiPrec;
  const deltaSub = s.subSett - s.subPrec;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", gap: 8 }}>
        <div style={{ flex: 1, background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 9, padding: "9px 11px", textAlign: "center" }}>
          <div style={{ fontSize: 9, color: "var(--muted)", textTransform: "uppercase" }}>Prospect</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: "var(--text)" }}>{s.prospettiSett}</div>
          <div style={{ fontSize: 10, color: delta >= 0 ? "#10b981" : "#ef4444" }}>{delta >= 0 ? "+" : ""}{delta} vs sett. prec.</div>
        </div>
        <div style={{ flex: 1, background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 9, padding: "9px 11px", textAlign: "center" }}>
          <div style={{ fontSize: 9, color: "var(--muted)", textTransform: "uppercase" }}>Iscritti</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: "#10b981" }}>{s.subSett}</div>
          <div style={{ fontSize: 10, color: deltaSub >= 0 ? "#10b981" : "#ef4444" }}>{deltaSub >= 0 ? "+" : ""}{deltaSub} vs sett. prec.</div>
        </div>
      </div>
    </div>
  );
}
function Vuoto({ testo }) {
  return <div style={{ fontSize: 12, color: "var(--muted)", textAlign: "center", padding: "1.2rem 0.5rem" }}>{testo}</div>;
}

const DOMANDE = [
  { id: "caldi", gruppo: "Funnel e percorso", label: "Quali miei prospect caldi rischio di perdere?", Render: RispostaCaldi },
  { id: "bottleneck", gruppo: "Funnel e percorso", label: "Dove si blocca il team nel percorso?", Render: RispostaBottleneck },
  { id: "fermi", gruppo: "Team", label: "Chi non ha lavorato in questo ciclo?", Render: RispostaFermiCiclo },
  { id: "senzacontatti", gruppo: "Team", label: "Chi non contatta nessuno da giorni?", Render: RispostaSenzaContatti },
  { id: "downlineferma", gruppo: "Team", label: "Chi ha smesso di far crescere la downline?", Render: RispostaDownlineFerma },
  { id: "efficienza", gruppo: "Team", label: "Chi converte meglio nel team?", Render: RispostaEfficienza },
  { id: "concentrazione", gruppo: "Tour ed eventi", label: "Dove si concentra il mio team?", Render: RispostaConcentrazione },
  { id: "settimana", gruppo: "Andamento", label: "Come sto andando questa settimana?", Render: RispostaSettimana },
];

// ══════════════════════════════════════════════════════════════
// WIDGET FLOTTANTE — bottone in basso a destra + pannello domande
// ══════════════════════════════════════════════════════════════
export function MentoreChatWidget({ insights }) {
  const [open, setOpen] = useState(false);
  const [activeId, setActiveId] = useState(null);

  if (!insights) return null;
  const active = DOMANDE.find(d => d.id === activeId);
  const gruppi = [...new Set(DOMANDE.map(d => d.gruppo))];

  return (
    <div style={{ position: "fixed", bottom: 22, right: 22, zIndex: 1500 }}>
      {open && (
        <div style={{ position: "absolute", bottom: 62, right: 0, width: 320, maxHeight: 480, background: "var(--bg2)", border: "1px solid var(--border2)", borderRadius: 16, boxShadow: "0 12px 40px #000000a0", display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ padding: "13px 16px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: "var(--text)" }}>
              {active ? active.label : "Mentore"}
            </div>
            {active
              ? <button onClick={() => setActiveId(null)} style={{ background: "var(--bg3)", border: "1px solid var(--border2)", color: "var(--a2)", borderRadius: 7, padding: "3px 9px", fontSize: 11, cursor: "pointer", fontWeight: 700 }}>{"\u2190"} Indietro</button>
              : <button onClick={() => setOpen(false)} style={{ background: "var(--bg3)", border: "1px solid var(--border2)", color: "var(--muted)", borderRadius: 7, width: 24, height: 24, cursor: "pointer", fontSize: 13 }}>X</button>
            }
          </div>
          <div style={{ padding: 14, overflowY: "auto", flex: 1 }}>
            {active
              ? <active.Render ins={insights} />
              : gruppi.map(g => (
                  <div key={g} style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 10, fontWeight: 800, color: "var(--muted)", textTransform: "uppercase", letterSpacing: .6, marginBottom: 7 }}>{g}</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {DOMANDE.filter(d => d.gruppo === g).map(d => (
                        <button key={d.id} onClick={() => setActiveId(d.id)}
                          style={{ textAlign: "left", padding: "9px 12px", background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 9, color: "var(--text)", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                          {d.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))
            }
          </div>
        </div>
      )}
      <button onClick={() => setOpen(o => !o)}
        style={{ width: 56, height: 56, borderRadius: "50%", border: "none", cursor: "pointer", background: "linear-gradient(135deg,var(--a1),var(--a2))", color: "#fff", fontWeight: 900, fontSize: 12, boxShadow: "0 6px 20px var(--a1-31)", display: "flex", alignItems: "center", justifyContent: "center", letterSpacing: -.3 }}>
        {open ? "X" : "M"}
      </button>
    </div>
  );
}