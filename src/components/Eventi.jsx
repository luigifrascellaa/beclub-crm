import { useState, useEffect, useMemo } from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from "recharts";
import { Av } from "../shared";

function fmtDate(d) {
  if (!d) return "\u2014";
  return new Date(d + "T12:00:00").toLocaleDateString("it-IT", { day: "numeric", month: "short", year: "numeric" });
}

// Quanti dei tre flag di completamento sono spuntati. "in_forse" NON entra qui:
// non e' un pezzo di pagamento, e' uno stato che sospende il giudizio sul ticket.
function flagCount(p) {
  return (p.acconto ? 1 : 0) + (p.hotel ? 1 : 0) + (p.saldo ? 1 : 0);
}

// Colore della riga. Stessa scala della griglia prospect (giallo -> menta -> verde
// bosco) perche' risponde alla stessa domanda: "a che punto e' questa persona".
// I due verdi si separano sulla LUMINOSITA', non sulla tinta — su fondo scuro
// scurire un colore lo fa sparire, per questo il verde intermedio e' un menta acceso.
// "in_forse" vince su tutto: un ticket in dubbio non deve sembrare avanzato.
function coloreTicket(p) {
  if (p.in_forse) return "#6b7280";
  const n = flagCount(p);
  if (n >= 3) return "#15803d";
  if (n === 2) return "#86efac";
  if (n === 1) return "#eab308";
  return null;
}

const FLAG_DEFS = [
  { key: "acconto", label: "Acconto", clr: "#10b981" },
  { key: "hotel", label: "Hotel", clr: "#10b981" },
  { key: "saldo", label: "Saldo", clr: "#10b981" },
  { key: "in_forse", label: "In forse", clr: "#6b7280" },
];

// ===== card persona — usata SOLO dalla colonna "In ballo".
// I ticket venduti sono passati alla griglia (RigaTicket): qui non servono piu'
// ne' la barra di completamento ne' i flag, che su un "in ballo" non esistono. =====
function PersonaCard({ p, ownerName, showOwner, onClick, onMarkSold, squadraLabel }) {
  return (
    <div onClick={onClick} className="hrow" style={{ display: "flex", flexDirection: "column", gap: 7, padding: "9px 12px", borderRadius: 10, cursor: onClick ? "pointer" : "default", border: "1px solid var(--border)", background: "var(--bg3)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Av n={p.nome} c={p.cognome} color={p.stato === "venduto" ? "#10b981" : "#f59e0b"} size={32} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.nome} {p.cognome || ""}</div>
          <div style={{ fontSize: 11, color: "var(--muted)", display: "flex", gap: 6, flexWrap: "wrap" }}>
            {p.citta && <span>{p.citta}</span>}
            {p.telefono && <span>{"\u00b7"} {p.telefono}</span>}
          </div>
          {p.sponsor && (
            <div style={{ fontSize: 10, color: "#a855f7", marginTop: 1 }}>Sponsor: {p.sponsor}</div>
          )}
        </div>
        {onMarkSold && (
          <button onClick={e => { e.stopPropagation(); onMarkSold(); }}
            style={{ padding: "5px 11px", fontSize: 11, fontWeight: 800, background: "#10b98118", color: "#10b981", border: "1px solid #10b98140", borderRadius: 8, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}>
            Venduto
          </button>
        )}
        {squadraLabel && (
          <div style={{ fontSize: 10, fontWeight: 800, color: squadraLabel === "sinistra" ? "var(--a2)" : "#10b981", background: squadraLabel === "sinistra" ? "var(--a1-13)" : "#10b98118", border: "1px solid " + (squadraLabel === "sinistra" ? "var(--a1-25)" : "#10b98130"), borderRadius: 7, padding: "3px 8px", whiteSpace: "nowrap", textTransform: "uppercase", letterSpacing: .4 }}>
            {squadraLabel === "sinistra" ? "Sx" : "Dx"}
          </div>
        )}
        {showOwner && ownerName && (
          <div style={{ fontSize: 10, fontWeight: 700, color: "var(--a2)", background: "var(--a1-13)", borderRadius: 7, padding: "3px 8px", whiteSpace: "nowrap" }}>
            {ownerName}
          </div>
        )}
      </div>
    </div>
  );
}

// ===== griglia ticket venduti (stesso pattern della griglia prospect in Lista.jsx) =====
// Niente <input type="checkbox">: il controllo nativo di macOS e' un rettangolo
// bianco pieno, cioe' la cosa piu' luminosa in una UI scura — il vuoto griderebbe
// piu' del pieno. Il non-fatto e' un contorno appena percepibile, il fatto e'
// l'unica cosa colorata.
function CellaFlag({ p, flag, attivo, editabile, onToggle, cellStyle }) {
  return (
    <td style={{ ...cellStyle, padding: 0, textAlign: "center" }}>
      <button
        type="button"
        onClick={() => editabile && onToggle(p, flag.key)}
        disabled={!editabile}
        aria-pressed={attivo}
        aria-label={flag.label + " " + (p.nome || "")}
        title={editabile ? flag.label : "Ticket di un altro membro: apri il dettaglio"}
        style={{
          width: 18, height: 18, padding: 0, margin: "10px auto", display: "block",
          borderRadius: 5, cursor: editabile ? "pointer" : "default",
          background: attivo ? flag.clr : "transparent",
          border: "1px solid " + (attivo ? flag.clr : "var(--border2)"),
          opacity: editabile ? 1 : .4,
          transition: "background .12s ease, border-color .12s ease",
          position: "relative",
        }}
      >
        {attivo && (
          <svg viewBox="0 0 16 16" width="11" height="11" style={{ position: "absolute", top: 2, left: 2 }} aria-hidden="true">
            <path d="M3 8.5l3.2 3.2L13 5" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>
    </td>
  );
}

// Riga della griglia. Componente separato perche' la nota ha uno stato locale
// (si scrive liberamente e si salva sull'uscita dal campo): tenerlo nel padre
// farebbe ripartire un render dell'intera lista a ogni carattere digitato.
function RigaTicket({ p, ownerName, squadraLabel, editabile, onOpen, onToggleFlag, onSaveNote }) {
  const [nota, setNota] = useState(p.note || "");
  const [notaAttiva, setNotaAttiva] = useState(false);
  useEffect(() => { setNota(p.note || ""); }, [p.id, p.note]);
  const base = coloreTicket(p);

  // Il colore sta concentrato a sinistra, non spalmato sulla riga: una striscia
  // larga tinta di colore saturo diventa un banner di avviso, non un dato. La
  // sfumatura sta SOLO nella cella del nome — applicata a ogni <td> ripartirebbe
  // da capo in ognuna, a bande.
  const cellStyle = { borderTop: "1px solid #0d1b3355", borderBottom: "1px solid #0d1b3355" };

  return (
    <tr>
      <td style={{
        ...cellStyle, padding: "6px 14px 6px 11px", position: "sticky", left: 0, zIndex: 1,
        // 5px e non 3: e' l'unico punto in cui il colore sta al 100%, ed e' li' che
        // due verdi vicini si distinguono davvero.
        borderLeft: "5px solid " + (base || "var(--border2)"),
        backgroundColor: "var(--bg2)",
        backgroundImage: base ? "linear-gradient(90deg," + base + "2e, transparent)" : "none",
      }}>
        <div onClick={() => onOpen(p)} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", minWidth: 180 }}>
          <Av n={p.nome} c={p.cognome} color={base || "var(--border2)"} size={32} soft />
          <div style={{ overflow: "hidden", lineHeight: 1.25 }}>
            <div style={{ color: "var(--text)", fontWeight: 600, fontSize: 13, whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden" }}>{p.nome} {p.cognome || ""}</div>
            {p.citta && <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 1 }}>{p.citta}</div>}
          </div>
        </div>
      </td>
      <td style={{ ...cellStyle, padding: "6px 10px" }}>
        <span style={{ fontSize: 11, color: "var(--muted)", whiteSpace: "nowrap" }}>{ownerName || "\u2014"}</span>
      </td>
      <td style={{ ...cellStyle, padding: "6px 10px", textAlign: "center" }}>
        {squadraLabel
          ? <span style={{ fontSize: 10, fontWeight: 800, color: squadraLabel === "sinistra" ? "var(--a2)" : "#10b981", background: squadraLabel === "sinistra" ? "var(--a1-13)" : "#10b98118", border: "1px solid " + (squadraLabel === "sinistra" ? "var(--a1-25)" : "#10b98130"), borderRadius: 7, padding: "3px 8px", whiteSpace: "nowrap", textTransform: "uppercase", letterSpacing: .4 }}>
              {squadraLabel === "sinistra" ? "Sx" : "Dx"}
            </span>
          : <span style={{ fontSize: 11, color: "var(--border2)" }}>{"\u2014"}</span>
        }
      </td>
      {FLAG_DEFS.map(f => (
        <CellaFlag key={f.key} p={p} flag={f} attivo={!!p[f.key]} editabile={editabile} onToggle={onToggleFlag} cellStyle={cellStyle} />
      ))}
      <td style={{ ...cellStyle, padding: "4px 8px 4px 16px", minWidth: 220 }}>
        <input
          value={nota} disabled={!editabile}
          onChange={e => setNota(e.target.value)}
          onFocus={() => setNotaAttiva(true)}
          onBlur={() => { setNotaAttiva(false); onSaveNote(p, nota); }}
          onKeyDown={e => { if (e.key === "Enter") e.currentTarget.blur(); }}
          placeholder={editabile && notaAttiva ? "Scrivi una nota" : ""}
          style={{
            width: "100%", background: notaAttiva ? "var(--bg3)" : "transparent",
            border: "1px solid " + (notaAttiva ? "var(--border2)" : "transparent"),
            borderRadius: 7, padding: "5px 9px", color: nota ? "var(--text)" : "var(--muted)",
            fontSize: 12, fontFamily: "inherit", transition: "background .12s ease, border-color .12s ease",
          }}
        />
      </td>
      <td style={{ ...cellStyle, padding: "6px 14px 6px 0", color: "var(--border2)", fontSize: 15, cursor: "pointer" }} onClick={() => onOpen(p)}>{"\u203a"}</td>
    </tr>
  );
}

// ===== modale aggiungi/modifica persona =====
function PersonaModal({ persona, defaultStato, onSave, onClose, onDelete, auth, downline }) {
  const [form, setForm] = useState(persona || { nome: "", cognome: "", telefono: "", instagram: "", citta: "", note: "", stato: defaultStato || "in_ballo", categoria: "team" });
  const lbl = { fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: .8, marginBottom: 5, display: "block" };

  return (
    <div style={{ background: "var(--bg2)", border: "1px solid var(--border2)", borderRadius: 16, padding: "1.6rem", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 70px #000000aa" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h2 style={{ fontWeight: 900, fontSize: 17, color: "var(--text)" }}>{persona ? "Modifica" : "+ Aggiungi"}</h2>
        <button onClick={onClose} style={{ background: "var(--bg3)", color: "var(--a2)", border: "1px solid var(--border2)", borderRadius: 8, cursor: "pointer", padding: "4px 10px", fontSize: 14 }}>X</button>
      </div>

      {!persona && auth?.profile?.is_leader && downline?.length > 0 && (
        <div style={{ marginBottom: 14, background: "var(--a1-13)", border: "1px solid var(--a1-25)", borderRadius: 11, padding: "11px 13px" }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: "var(--a2)", textTransform: "uppercase", letterSpacing: .8, marginBottom: 6, display: "block" }}>Assegna a</label>
          <select value={form._assignTo || auth.userId} onChange={e => setForm(f => ({ ...f, _assignTo: e.target.value }))}>
            <option value={auth.userId}>Te stesso</option>
            {downline.map(m => <option key={m.id} value={m.id}>{m.nome || ""} {m.cognome || ""}</option>)}
          </select>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
        <div style={{ gridColumn: "1/-1" }}>
          <label style={lbl}>Categoria</label>
          <select value={form.categoria || "team"} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}>
            <option value="team">Team</option>
            <option value="prospect">Prospect</option>
          </select>
        </div>
        {(form.categoria || "team") === "team" && (
          <div style={{ gridColumn: "1/-1" }}>
            <label style={lbl}>Squadra</label>
            <select value={form.squadra_manuale || ""} onChange={e => setForm(f => ({ ...f, squadra_manuale: e.target.value }))}>
              <option value="">Non specificata</option>
              <option value="sinistra">Sinistra</option>
              <option value="destra">Destra</option>
            </select>
            <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 5, lineHeight: 1.4 }}>
              Serve solo per i membri del team gia' presenti in struttura: indica in quale delle tue due gambe far rientrare la persona nelle numeriche Sinistra/Destra. Se il record e' di un altro membro, la squadra viene calcolata dall'albero e questo campo viene ignorato.
            </div>
          </div>
        )}
        <div><label style={lbl}>Nome</label><input value={form.nome || ""} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Mario" /></div>
        <div><label style={lbl}>Cognome</label><input value={form.cognome || ""} onChange={e => setForm(f => ({ ...f, cognome: e.target.value }))} placeholder="Rossi" /></div>
        <div style={{ gridColumn: "1/-1" }}><label style={lbl}>Citta</label><input value={form.citta || ""} onChange={e => setForm(f => ({ ...f, citta: e.target.value }))} placeholder="Milano" /></div>
        <div><label style={lbl}>Telefono</label><input value={form.telefono || ""} onChange={e => setForm(f => ({ ...f, telefono: e.target.value }))} placeholder="+39 333 000 0000" /></div>
        <div><label style={lbl}>Instagram</label><input value={form.instagram || ""} onChange={e => setForm(f => ({ ...f, instagram: e.target.value }))} placeholder="@username" /></div>
        {form.stato === "venduto" && (
          <>
            <div style={{ gridColumn: "1/-1" }}><label style={lbl}>Sponsor del ticket</label><input value={form.sponsor || ""} onChange={e => setForm(f => ({ ...f, sponsor: e.target.value }))} placeholder="Chi ha sponsorizzato" /></div>
            <div style={{ gridColumn: "1/-1" }}>
              <label style={lbl}>Stato ticket</label>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {FLAG_DEFS.map(({ key, label, clr }) => (
                  <label key={key} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 11px", borderRadius: 9, border: "1px solid " + (form[key] ? clr + "50" : "var(--border2)"), background: form[key] ? clr + "15" : "var(--bg3)", cursor: "pointer", fontSize: 12, color: form[key] ? clr : "var(--muted)", fontWeight: 700 }}>
                    <input type="checkbox" checked={!!form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.checked }))} style={{ width: "auto", margin: 0 }} />
                    {label}
                  </label>
                ))}
              </div>
              <div style={{ marginTop: 8, fontSize: 11, color: "var(--muted)", lineHeight: 1.4 }}>
                {form.in_forse
                  ? "Segnato in forse: il ticket resta in elenco ma non viene contato nei totali."
                  : flagCount(form) + " di 3 completati" + (flagCount(form) >= 3 ? " \u00b7 ticket intero" : "")}
              </div>
            </div>
          </>
        )}
        <div style={{ gridColumn: "1/-1" }}><label style={lbl}>Note</label><textarea value={form.note || ""} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} style={{ height: 70, resize: "vertical" }} placeholder="Note..." /></div>
      </div>

      <div style={{ display: "flex", gap: 9, justifyContent: "flex-end", flexWrap: "wrap" }}>
        {onDelete && <button onClick={onDelete} style={{ padding: "9px 14px", background: "#ef444415", color: "#f87171", border: "1px solid #ef444438", borderRadius: 9, cursor: "pointer", fontWeight: 700, fontSize: 13 }}>Elimina</button>}
        <button onClick={onClose} style={{ padding: "9px 14px", background: "var(--bg3)", color: "var(--a2)", border: "1px solid var(--border2)", borderRadius: 9, cursor: "pointer", fontWeight: 600, fontSize: 13 }}>Annulla</button>
        {form.stato === "in_ballo" && (
          <button onClick={() => onSave({ ...form, stato: "venduto" })} style={{ padding: "9px 16px", background: "#10b98120", color: "#10b981", border: "1px solid #10b98140", borderRadius: 9, cursor: "pointer", fontWeight: 800, fontSize: 13 }}>
            Segna come venduto
          </button>
        )}
        <button onClick={() => onSave(form)} style={{ padding: "9px 20px", background: "linear-gradient(135deg,var(--a1),var(--a2))", color: "#fff", border: "none", borderRadius: 9, cursor: "pointer", fontWeight: 800, fontSize: 13 }}>
          {persona ? "Aggiorna" : "Aggiungi"}
        </button>
      </div>
    </div>
  );
}

// ===== leaderboard =====
function Leaderboard({ ranking }) {
  const top3 = ranking.slice(0, 3);
  const rest = ranking.slice(3, 5);
  const medalColor = ["#fbbf24", "#cbd5e1", "#d97706"];
  const medalLabel = ["\ud83e\udd47", "\ud83e\udd48", "\ud83e\udd49"];
  const order = [1, 0, 2]; // 2deg-1deg-3deg per il podio visivo

  if (ranking.length === 0) {
    return <div style={{ textAlign: "center", padding: "2.5rem", color: "var(--border2)" }}>Nessun ticket venduto ancora dal team</div>;
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 14, marginBottom: top3.length > 0 ? 22 : 0, flexWrap: "wrap" }}>
        {order.filter(i => top3[i]).map(i => {
          const p = top3[i];
          const height = i === 0 ? 132 : i === 1 ? 108 : 92;
          return (
            <div key={p.userId} style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 110 }}>
              <div style={{ fontSize: i === 0 ? 30 : 24, marginBottom: 6 }}>{medalLabel[i]}</div>
              <Av n={p.nome} c={p.cognome} color={medalColor[i]} size={i === 0 ? 56 : 46} />
              <div style={{ fontWeight: 800, fontSize: i === 0 ? 13 : 12, color: "var(--text)", marginTop: 8, textAlign: "center" }}>{p.nome} {p.cognome || ""}</div>
              <div style={{
                marginTop: 10, width: "100%", height,
                background: "linear-gradient(180deg," + medalColor[i] + "30," + medalColor[i] + "10)",
                border: "1px solid " + medalColor[i] + "50", borderRadius: "10px 10px 0 0",
                display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: 10,
              }}>
                <span style={{ fontWeight: 900, fontSize: 20, color: medalColor[i] }}>{i + 1}{"\u00b0"}</span>
              </div>
            </div>
          );
        })}
      </div>

      {rest.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 7, maxWidth: 420, margin: "0 auto" }}>
          {rest.map((p, idx) => (
            <div key={p.userId} style={{ display: "flex", alignItems: "center", gap: 11, padding: "8px 13px", borderRadius: 10, background: "var(--bg3)", border: "1px solid var(--border)" }}>
              <span style={{ fontWeight: 800, fontSize: 13, color: "var(--muted)", width: 18 }}>{idx + 4}</span>
              <Av n={p.nome} c={p.cognome} color="var(--a1)" size={28} />
              <span style={{ fontWeight: 700, fontSize: 13, color: "var(--text)" }}>{p.nome} {p.cognome || ""}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Calcola sinistra/destra di memberId rispetto a un rootId qualsiasi (non solo l'utente loggato)
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
export function EventiView({ auth, allProfiles, downline, positions, showToast,
  sbListEventi,
  sbListEventoPersone, sbInsertEventoPersona, sbUpdateEventoPersona, sbDeleteEventoPersona,
  LUDOVICO_ID, onTicketCountChange }) {

  const [eventi, setEventi] = useState([]);
  const [eventoAttivo, setEventoAttivo] = useState(null);
  const [persone, setPersone] = useState([]); // persone dell'evento attivo (tutte quelle leggibili)
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // { mode: 'in_ballo'|'venduto', persona }
  const [filtroVenduti, setFiltroVenduti] = useState("tutti"); // 'tutti' | 'team' | 'prospect'
  const [filtroMembro, setFiltroMembro] = useState(""); // "" = tutti i membri
  const [filtroSquadra, setFiltroSquadra] = useState(""); // "" | 'sinistra' | 'destra'
  // filtri della colonna "In ballo": tenuti separati da quelli dei venduti perche'
  // rispondono a domande diverse (chi devo ancora chiudere, vs chi ha gia' comprato)
  const [ibOrigine, setIbOrigine] = useState("tutti"); // 'tutti' | 'personali' | 'team'
  const [ibSquadra, setIbSquadra] = useState("");      // "" | 'sinistra' | 'destra'

  useEffect(() => {
    if (!auth) return;
    sbListEventi(auth.token).then(rows => {
      const list = rows || [];
      setEventi(list);
      if (list.length > 0 && !eventoAttivo) setEventoAttivo(list[0].id);
    }).catch(e => showToast("Errore: " + e.message, "#ef4444")).finally(() => setLoading(false));
  }, [auth]);

  useEffect(() => {
    if (!auth || !eventoAttivo) { setPersone([]); return; }
    sbListEventoPersone(auth.token, eventoAttivo).then(rows => setPersone(rows || []))
      .catch(e => showToast("Errore: " + e.message, "#ef4444"));
  }, [auth, eventoAttivo]);

  // id di tutta la downline (me + tutti sotto)
  const myTeamIds = useMemo(() => new Set([auth.userId, ...downline.map(d => d.id)]), [auth.userId, downline]);

  const inBallo = useMemo(() =>
    persone.filter(p => p.stato === "in_ballo" && myTeamIds.has(p.user_id)),
    [persone, myTeamIds]
  );
  const venduti = useMemo(() =>
    persone.filter(p => p.stato === "venduto" && myTeamIds.has(p.user_id)
      && (filtroVenduti === "tutti" || p.categoria === filtroVenduti)
      && (!filtroMembro || p.user_id === filtroMembro)),
    [persone, myTeamIds, filtroVenduti, filtroMembro]
  );

  // squadra (sinistra/destra) di ogni RECORD rispetto a chi guarda la pagina.
  // Indicizzata per p.id e non per user_id: la squadra manuale e' per singolo
  // record, quindi due persone registrate dallo stesso proprietario possono
  // cadere in gambe diverse. Calcolata su tutte le persone dell'evento (non solo
  // i venduti) perche' serve anche alla colonna "In ballo".
  // Regola: l'albero ha sempre la precedenza; il valore manuale entra solo quando
  // l'albero non sa rispondere E il record e' del proprio utente (i record di un
  // membro della downline cadono gia' nella gamba di quel membro, e il valore
  // manuale di un altro utente e' relativo a LUI, non a me: usarlo sfaserebbe i conti).
  const squadraOf = useMemo(() => {
    const cache = {};
    const map = {};
    persone.forEach(p => {
      const daAlbero = getSquadraRelativeTo(auth.userId, p.user_id, allProfiles, positions, cache);
      map[p.id] = daAlbero || (p.user_id === auth.userId ? (p.squadra_manuale || null) : null);
    });
    return map;
  }, [allProfiles, positions, auth.userId, persone]);

  // lista finale della colonna "In ballo", con i due filtri applicati
  const inBalloVisibili = useMemo(() =>
    inBallo.filter(p => {
      if (ibOrigine === "personali" && p.user_id !== auth.userId) return false;
      if (ibOrigine === "team" && p.user_id === auth.userId) return false;
      if (ibSquadra && squadraOf[p.id] !== ibSquadra) return false;
      return true;
    }),
    [inBallo, ibOrigine, ibSquadra, squadraOf, auth.userId]
  );

  // I ticket "in forse" restano SEMPRE in elenco ma non entrano in nessun conteggio:
  // e' la stessa regola del resto del CRM (escluso dai CALCOLI, mai dalle LISTE).
  const vendutiReali = useMemo(() => venduti.filter(p => !p.in_forse), [venduti]);
  const inForseCount = venduti.length - vendutiReali.length;

  const vendutiSinistra = useMemo(() => vendutiReali.filter(p => squadraOf[p.id] === "sinistra"), [vendutiReali, squadraOf]);
  const vendutiDestra    = useMemo(() => vendutiReali.filter(p => squadraOf[p.id] === "destra"), [vendutiReali, squadraOf]);

  // righe della griglia: filtrate per squadra e ordinate per completamento crescente,
  // cosi' chi va rincorso sta in cima. Il filtro squadra agisce SOLO sulla lista, non
  // su `venduti`, quindi il totale e i contatori Sinistra/Destra restano il
  // denominatore di riferimento mentre si guarda un sottoinsieme.
  const vendutiVisibili = useMemo(() =>
    venduti
      .filter(p => !filtroSquadra || squadraOf[p.id] === filtroSquadra)
      .sort((a, b) => flagCount(a) - flagCount(b)),
    [venduti, squadraOf, filtroSquadra]
  );

  // un leader (o Dimitri) puo' modificare l'anagrafica di chiunque nella propria downline
  const canEdit = p => p.user_id === auth.userId || (auth?.profile?.is_leader && myTeamIds.has(p.user_id));

  function ownerNameOf(userId) {
    if (userId === auth.userId) return "Tu";
    const m = downline.find(d => d.id === userId);
    return m ? (m.nome || "") + " " + (m.cognome || "") : "";
  }

  // tutti i ticket venduti di ogni evento (storico completo) - alimenta sia leaderboard che grafico
  const [tuttiVenduti, setTuttiVenduti] = useState([]);
  useEffect(() => {
    if (!auth || !LUDOVICO_ID) return;
    // carica tutte le persone vendute di tutti gli eventi (serve query separata, senza filtro evento)
    sbListEventoPersone(auth.token, null).then(rows => {
      setTuttiVenduti((rows || []).filter(r => r.stato === "venduto"));
    }).catch(() => {});
  }, [auth, LUDOVICO_ID]);

  // notifica App.jsx col conteggio aggiornato (tu + downline), cosi la Dashboard resta in tempo reale
  useEffect(() => {
    if (!onTicketCountChange) return;
    const myCount = tuttiVenduti.filter(p => myTeamIds.has(p.user_id)).length;
    onTicketCountChange(myCount);
  }, [tuttiVenduti, myTeamIds, onTicketCountChange]);

  const teamDiLudovicoIds = useMemo(() => {
    if (!LUDOVICO_ID) return new Set();
    const all = allProfiles || [];
    const result = new Set([LUDOVICO_ID]);
    function collect(pid) {
      all.filter(p => p.positioned_under === pid).forEach(c => { result.add(c.id); collect(c.id); });
    }
    collect(LUDOVICO_ID);
    return result;
  }, [allProfiles, LUDOVICO_ID]);

  const ranking = useMemo(() => {
    const counts = {};
    tuttiVenduti.forEach(p => {
      if (!teamDiLudovicoIds.has(p.user_id)) return;
      counts[p.user_id] = (counts[p.user_id] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([userId]) => {
        const prof = (allProfiles || []).find(p => p.id === userId);
        return { userId, nome: prof?.nome || "", cognome: prof?.cognome || "" };
      });
  }, [tuttiVenduti, teamDiLudovicoIds, allProfiles]);

  // grafico evento per evento: deriva da tuttiVenduti (gia caricato), conteggio personal+downline
  const vendutiPerEvento = useMemo(() => {
    const map = {};
    tuttiVenduti.forEach(p => {
      if (!myTeamIds.has(p.user_id)) return;
      map[p.evento_id] = (map[p.evento_id] || 0) + 1;
    });
    return map;
  }, [tuttiVenduti, myTeamIds]);

  const chartData = useMemo(() =>
    [...eventi].sort((a, b) => a.data.localeCompare(b.data)).map(ev => ({
      nome: ev.nome.length > 14 ? ev.nome.slice(0, 14) + "\u2026" : ev.nome,
      venduti: vendutiPerEvento[ev.id] || 0,
    })),
    [eventi, vendutiPerEvento]
  );

  async function salvaPersona(form) {
    // la squadra manuale ha senso solo per la categoria "team": se il record torna
    // "prospect" il campo va azzerato, altrimenti resta un valore fantasma che
    // continuerebbe a spostare la persona in una gamba
    const categoria = form.categoria || "team";
    const squadraManuale = categoria === "team" ? (form.squadra_manuale || null) : null;
    // venduto_at = quando e' stato dato il SALDO, cioe' quando il ticket e' stato
    // preso intero. Va preservata se c'e' gia', altrimenti ogni salvataggio la
    // riscriverebbe a "adesso" e la data reale della vendita andrebbe persa.
    const vendutoAt = form.saldo ? (form.venduto_at || new Date().toISOString()) : null;
    try {
      if (form.id) {
        await sbUpdateEventoPersona(auth.token, form.id, {
          nome: form.nome, cognome: form.cognome || null, telefono: form.telefono || null,
          instagram: form.instagram || null, citta: form.citta || null, note: form.note || null,
          categoria, sponsor: form.sponsor || null, squadra_manuale: squadraManuale,
          acconto: !!form.acconto, hotel: !!form.hotel, saldo: !!form.saldo, in_forse: !!form.in_forse,
          stato: form.stato, venduto_at: vendutoAt,
        });
        const aggiornata = { ...form, categoria, squadra_manuale: squadraManuale, venduto_at: vendutoAt };
        setPersone(ps => ps.map(p => p.id === form.id ? { ...p, ...aggiornata } : p));
        setTuttiVenduti(tv => {
          const senzaQuesta = tv.filter(p => p.id !== form.id);
          return form.stato === "venduto" ? [...senzaQuesta, { ...aggiornata }] : senzaQuesta;
        });
        showToast(form.stato === "venduto" ? "Segnato come venduto" : "Aggiornato");
      } else {
        const assignTo = form._assignTo || auth.userId;
        const row = await sbInsertEventoPersona(auth.token, {
          evento_id: eventoAttivo, user_id: assignTo,
          nome: form.nome, cognome: form.cognome || null, telefono: form.telefono || null,
          instagram: form.instagram || null, citta: form.citta || null, note: form.note || null,
          categoria, sponsor: form.sponsor || null, squadra_manuale: squadraManuale,
          acconto: !!form.acconto, hotel: !!form.hotel, saldo: !!form.saldo, in_forse: !!form.in_forse,
          stato: form.stato || "in_ballo", venduto_at: vendutoAt,
        });
        const created = Array.isArray(row) ? row[0] : row;
        setPersone(ps => [...ps, created]);
        if (created.stato === "venduto") setTuttiVenduti(tv => [...tv, created]);
        showToast(assignTo === auth.userId ? "Aggiunto" : "Assegnato a " + ((downline.find(m => m.id === assignTo)?.nome) || "membro"));
      }
    } catch (e) { showToast("Errore: " + e.message, "#ef4444"); }
    setModal(null);
  }

  // Spunta di un singolo flag dalla griglia. PATCH mirato di quel solo campo e non
  // riscrittura dell'intero record: in una griglia si clicca molto, e far passare
  // ogni spunta da salvaPersona riscriverebbe ogni volta tutta l'anagrafica (e
  // sparerebbe un toast per click).
  // `persone` e `tuttiVenduti` contengono entrambi la riga e vanno aggiornati
  // insieme, altrimenti la griglia si aggiorna e leaderboard/grafico restano indietro.
  async function toggleFlag(p, key) {
    const val = !p[key];
    const patch = { [key]: val };
    if (key === "saldo") patch.venduto_at = val ? (p.venduto_at || new Date().toISOString()) : null;
    try {
      await sbUpdateEventoPersona(auth.token, p.id, patch);
      setPersone(ps => ps.map(x => x.id === p.id ? { ...x, ...patch } : x));
      setTuttiVenduti(tv => tv.map(x => x.id === p.id ? { ...x, ...patch } : x));
    } catch (e) { showToast("Errore: " + e.message, "#ef4444"); }
  }

  // Nota in linea: salvata all'uscita dal campo, con guardia che evita la scrittura
  // se il testo non e' cambiato.
  async function salvaNota(p, nota) {
    const nuova = nota || null;
    if ((p.note || null) === nuova) return;
    try {
      await sbUpdateEventoPersona(auth.token, p.id, { note: nuova });
      setPersone(ps => ps.map(x => x.id === p.id ? { ...x, note: nuova } : x));
      setTuttiVenduti(tv => tv.map(x => x.id === p.id ? { ...x, note: nuova } : x));
    } catch (e) { showToast("Errore: " + e.message, "#ef4444"); }
  }

  async function eliminaPersona(id) {
    try {
      await sbDeleteEventoPersona(auth.token, id);
      setPersone(ps => ps.filter(p => p.id !== id));
      setTuttiVenduti(tv => tv.filter(p => p.id !== id));
      showToast("Rimosso", "#ef4444");
    } catch (e) { showToast("Errore: " + e.message, "#ef4444"); }
    setModal(null);
  }

  const evCorrente = eventi.find(e => e.id === eventoAttivo);

  return (
    <div style={{ padding: "2rem 2.2rem", maxWidth: 1280, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.4rem", gap: 12, flexWrap: "wrap" }}>
        <h1 style={{ fontWeight: 900, fontSize: 26, color: "var(--text)", letterSpacing: -0.8 }}>Eventi</h1>
        {eventoAttivo && (
          <button onClick={() => setModal({ persona: null, stato: "in_ballo" })}
            style={{ padding: "11px 22px", fontSize: 14, fontWeight: 800, background: "linear-gradient(135deg,var(--a1),var(--a2))", color: "#fff", border: "none", borderRadius: 12, cursor: "pointer", boxShadow: "0 4px 14px var(--a1-25)" }}>
            + Aggiungi persona
          </button>
        )}
      </div>

      {eventi.length === 0 && !loading ? (
        <div style={{ textAlign: "center", padding: "3rem", color: "var(--border2)" }}>
          Nessun evento disponibile al momento.
        </div>
      ) : (
        <>
          {/* Evento attivo in evidenza */}
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--a2)", textTransform: "uppercase", letterSpacing: 1.4, marginBottom: 4 }}>Evento in corso</div>
            <h2 style={{ fontWeight: 900, fontSize: 30, color: "var(--text)", letterSpacing: -0.5, lineHeight: 1.1 }}>{evCorrente?.nome}</h2>
          </div>

          {/* Altri eventi (compare solo se ce n'e' piu' di uno) */}
          {eventi.length > 1 && (
            <div style={{ display: "flex", gap: 8, marginBottom: 18, flexWrap: "wrap" }}>
              {eventi.map(ev => (
                <button key={ev.id} onClick={() => setEventoAttivo(ev.id)}
                  style={{ padding: "7px 14px", borderRadius: 9, border: "1px solid " + (eventoAttivo === ev.id ? "var(--a1)" : "var(--border2)"), background: eventoAttivo === ev.id ? "var(--a1-13)" : "var(--bg3)", color: eventoAttivo === ev.id ? "var(--a2)" : "var(--muted)", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
                  {ev.nome}
                </button>
              ))}
            </div>
          )}

          {evCorrente && (
            <>
            {/* ===== 1. Ticket venduti — griglia ===== */}
            <div style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 16, padding: "1.2rem", marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 10, gap: 10, flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#10b981", textTransform: "uppercase", letterSpacing: .6 }}>Ticket venduti</div>
                  <div style={{ fontSize: 30, fontWeight: 900, color: "#10b981", lineHeight: 1.1 }}>{vendutiReali.length}</div>
                  {inForseCount > 0 && (
                    <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
                      + {inForseCount} in forse, non {inForseCount === 1 ? "conteggiato" : "conteggiati"}
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
                  <select value={filtroMembro} onChange={e => setFiltroMembro(e.target.value)} style={{ width: "auto", minWidth: 130, fontSize: 12 }}>
                    <option value="">Tutti i membri</option>
                    <option value={auth.userId}>Solo i miei</option>
                    {downline.map(m => <option key={m.id} value={m.id}>{m.nome || ""} {m.cognome || ""}</option>)}
                  </select>
                  <select value={filtroVenduti} onChange={e => setFiltroVenduti(e.target.value)} style={{ width: "auto", minWidth: 130, fontSize: 12 }}>
                    <option value="tutti">Tutti</option>
                    <option value="team">Solo team</option>
                    <option value="prospect">Solo prospect</option>
                  </select>
                  <select value={filtroSquadra} onChange={e => setFiltroSquadra(e.target.value)} style={{ width: "auto", minWidth: 130, fontSize: 12 }}>
                    <option value="">Tutte le squadre</option>
                    <option value="sinistra">Solo sinistra</option>
                    <option value="destra">Solo destra</option>
                  </select>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                <div style={{ flex: 1, background: "var(--a1-13)", border: "1px solid var(--a1-25)", borderRadius: 9, padding: "6px 10px", textAlign: "center" }}>
                  <div style={{ fontSize: 9, fontWeight: 700, color: "var(--a2)", textTransform: "uppercase", letterSpacing: .5 }}>Sinistra</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: "var(--a2)" }}>{vendutiSinistra.length}</div>
                </div>
                <div style={{ flex: 1, background: "#10b98115", border: "1px solid #10b98130", borderRadius: 9, padding: "6px 10px", textAlign: "center" }}>
                  <div style={{ fontSize: 9, fontWeight: 700, color: "#10b981", textTransform: "uppercase", letterSpacing: .5 }}>Destra</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: "#10b981" }}>{vendutiDestra.length}</div>
                </div>
              </div>
              {vendutiVisibili.length === 0
                ? <div style={{ textAlign: "center", padding: "1.5rem", color: "var(--border2)", fontSize: 12 }}>
                    {venduti.length === 0 ? "Nessun ticket venduto ancora" : "Nessuno con questi filtri"}
                  </div>
                : (
                  <div className="tbl-wrap" style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 820 }}>
                      <thead>
                        <tr>
                          <th style={{ textAlign: "left", color: "var(--muted)", fontWeight: 600, fontSize: 11, padding: "4px 14px 10px", whiteSpace: "nowrap", position: "sticky", left: 0, background: "var(--bg2)", zIndex: 2 }}>Persona</th>
                          <th style={{ textAlign: "left", color: "var(--muted)", fontWeight: 600, fontSize: 11, padding: "11px 10px", whiteSpace: "nowrap" }}>Di</th>
                          <th style={{ textAlign: "center", color: "var(--muted)", fontWeight: 600, fontSize: 11, padding: "11px 10px", whiteSpace: "nowrap" }}>Squadra</th>
                          {FLAG_DEFS.map(f => {
                            // una sola cosa colorata per colonna: il contatore. L'etichetta resta
                            // grigia, altrimenti testa e numero si fanno concorrenza.
                            const n = vendutiVisibili.filter(p => p[f.key]).length;
                            return (
                              <th key={f.key} style={{ padding: "4px 4px 10px", minWidth: 68, verticalAlign: "bottom" }}>
                                <div style={{ fontSize: 10, fontWeight: 600, color: "var(--muted)", whiteSpace: "nowrap", textAlign: "center" }}>{f.label}</div>
                                <div style={{ marginTop: 2, textAlign: "center", fontSize: 14, fontWeight: 800, fontVariantNumeric: "tabular-nums", color: n > 0 ? f.clr : "var(--border2)" }}>{n}</div>
                              </th>
                            );
                          })}
                          <th style={{ textAlign: "left", color: "var(--muted)", fontWeight: 600, fontSize: 11, padding: "11px 8px 11px 16px", minWidth: 220 }}>Note</th>
                          <th style={{ padding: "11px 14px 11px 0" }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {vendutiVisibili.map(p => (
                          <RigaTicket key={p.id} p={p}
                            ownerName={ownerNameOf(p.user_id)} squadraLabel={squadraOf[p.id]}
                            editabile={canEdit(p)}
                            onOpen={() => canEdit(p) && setModal({ persona: p })}
                            onToggleFlag={toggleFlag} onSaveNote={salvaNota} />
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              }
            </div>

            {/* ===== 2. In ballo ===== */}
            <div style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 16, padding: "1.2rem", marginBottom: 18 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: "#f59e0b" }}>
                  In ballo {"\u00b7"} {inBalloVisibili.length}
                  {inBalloVisibili.length !== inBallo.length && (
                    <span style={{ color: "var(--muted)", fontWeight: 700 }}> {"/"} {inBallo.length}</span>
                  )}
                </div>
                <button onClick={() => setModal({ persona: null, stato: "in_ballo" })}
                  style={{ padding: "5px 12px", fontSize: 11, fontWeight: 800, background: "#f59e0b18", color: "#f59e0b", border: "1px solid #f59e0b40", borderRadius: 8, cursor: "pointer" }}>
                  + Aggiungi
                </button>
              </div>
              <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
                <select value={ibOrigine} onChange={e => setIbOrigine(e.target.value)} style={{ flex: "0 1 160px", minWidth: 120, fontSize: 12 }}>
                  <option value="tutti">Tutti</option>
                  <option value="personali">Personali</option>
                  <option value="team">Team</option>
                </select>
                <select value={ibSquadra} onChange={e => setIbSquadra(e.target.value)} style={{ flex: "0 1 160px", minWidth: 120, fontSize: 12 }}>
                  <option value="">Tutte le squadre</option>
                  <option value="sinistra">Sinistra</option>
                  <option value="destra">Destra</option>
                </select>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 7, maxHeight: 420, overflowY: "auto" }}>
                {inBalloVisibili.length === 0
                  ? <div style={{ textAlign: "center", padding: "1.5rem", color: "var(--border2)", fontSize: 12 }}>
                      {inBallo.length === 0 ? "Nessuno al momento" : "Nessuno con questi filtri"}
                    </div>
                  : inBalloVisibili.map(p => <PersonaCard key={p.id} p={p} ownerName={ownerNameOf(p.user_id)} showOwner={p.user_id !== auth.userId} squadraLabel={squadraOf[p.id]} onClick={() => canEdit(p) && setModal({ persona: p })} onMarkSold={canEdit(p) ? () => salvaPersona({ ...p, stato: "venduto" }) : null} />)
                }
              </div>
            </div>
            </>
          )}
        </>
      )}

      {/* ===== 3. Leaderboard (non modificata) ===== */}
      <div style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 16, padding: "1.6rem", marginBottom: 18 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: "var(--text)", marginBottom: 18, display: "flex", alignItems: "center", gap: 8 }}>
          <span>{"\ud83c\udfc6"}</span> Leaderboard
        </div>
        <Leaderboard ranking={ranking} />
      </div>

      {/* ===== 4. Andamento (non modificato) ===== */}
      <div style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 16, padding: "1.4rem", marginBottom: 18 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: "var(--text)", marginBottom: 14 }}>Andamento</div>
        <div style={{ height: 220 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 5, right: 10, left: -15, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="nome" stroke="var(--muted)" fontSize={11} />
              <YAxis stroke="var(--muted)" fontSize={12} allowDecimals={false} />
              <Tooltip contentStyle={{ background: "var(--bg2)", border: "1px solid var(--border2)", borderRadius: 10, fontSize: 12 }} labelStyle={{ color: "var(--text)" }} />
              <Bar dataKey="venduti" name="Venduti" radius={[6, 6, 0, 0]} fill="var(--a1)">
                {chartData.map((_, i) => <Cell key={i} fill="var(--a1)" />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {modal && (
        <div onClick={() => setModal(null)} style={{ position: "fixed", inset: 0, background: "#00000090", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }}>
          <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 480 }}>
            <PersonaModal
              persona={modal.persona}
              defaultStato={modal.stato}
              onSave={salvaPersona}
              onClose={() => setModal(null)}
              onDelete={modal.persona ? () => eliminaPersona(modal.persona.id) : null}
              auth={auth}
              downline={downline}
            />
          </div>
        </div>
      )}
    </div>
  );
}