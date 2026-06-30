import { useState, useEffect, useMemo } from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from "recharts";

function Av({ n, c, color = "var(--a1)", size = 34 }) {
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", flexShrink: 0, background: "linear-gradient(135deg," + color + "," + color + "99)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 900, fontSize: size * 0.32, boxShadow: "0 0 10px " + color + "35" }}>
      {(n || "?")[0]}{(c || "")[0]}
    </div>
  );
}

function fmtDate(d) {
  if (!d) return "\u2014";
  return new Date(d + "T12:00:00").toLocaleDateString("it-IT", { day: "numeric", month: "short", year: "numeric" });
}

// ===== card persona (in ballo o venduto) =====
function PersonaCard({ p, ownerName, showOwner, onClick }) {
  return (
    <div onClick={onClick} className="hrow" style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 10, cursor: onClick ? "pointer" : "default", border: "1px solid var(--border)", background: "var(--bg3)" }}>
      <Av n={p.nome} c={p.cognome} color={p.stato === "venduto" ? "#10b981" : "#f59e0b"} size={32} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 13, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.nome} {p.cognome || ""}</div>
        <div style={{ fontSize: 11, color: "var(--muted)", display: "flex", gap: 6, flexWrap: "wrap" }}>
          {p.citta && <span>{p.citta}</span>}
          {p.telefono && <span>{"\u00b7"} {p.telefono}</span>}
        </div>
      </div>
      {showOwner && ownerName && (
        <div style={{ fontSize: 10, fontWeight: 700, color: "var(--a2)", background: "var(--a1-13)", borderRadius: 7, padding: "3px 8px", whiteSpace: "nowrap" }}>
          {ownerName}
        </div>
      )}
    </div>
  );
}

// ===== modale aggiungi/modifica persona =====
function PersonaModal({ persona, defaultStato, onSave, onClose, onDelete }) {
  const [form, setForm] = useState(persona || { nome: "", cognome: "", telefono: "", instagram: "", citta: "", note: "", stato: defaultStato || "in_ballo" });
  const lbl = { fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: .8, marginBottom: 5, display: "block" };

  return (
    <div style={{ background: "var(--bg2)", border: "1px solid var(--border2)", borderRadius: 16, padding: "1.6rem", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 70px #000000aa" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h2 style={{ fontWeight: 900, fontSize: 17, color: "var(--text)" }}>{persona ? "Modifica" : "+ Aggiungi"}</h2>
        <button onClick={onClose} style={{ background: "var(--bg3)", color: "var(--a2)", border: "1px solid var(--border2)", borderRadius: 8, cursor: "pointer", padding: "4px 10px", fontSize: 14 }}>X</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
        <div><label style={lbl}>Nome</label><input value={form.nome || ""} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Mario" /></div>
        <div><label style={lbl}>Cognome</label><input value={form.cognome || ""} onChange={e => setForm(f => ({ ...f, cognome: e.target.value }))} placeholder="Rossi" /></div>
        <div style={{ gridColumn: "1/-1" }}><label style={lbl}>Citta</label><input value={form.citta || ""} onChange={e => setForm(f => ({ ...f, citta: e.target.value }))} placeholder="Milano" /></div>
        <div><label style={lbl}>Telefono</label><input value={form.telefono || ""} onChange={e => setForm(f => ({ ...f, telefono: e.target.value }))} placeholder="+39 333 000 0000" /></div>
        <div><label style={lbl}>Instagram</label><input value={form.instagram || ""} onChange={e => setForm(f => ({ ...f, instagram: e.target.value }))} placeholder="@username" /></div>
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

export function EventiView({ auth, allProfiles, downline, showToast,
  sbListEventi,
  sbListEventoPersone, sbInsertEventoPersona, sbUpdateEventoPersona, sbDeleteEventoPersona,
  LUDOVICO_ID }) {

  const [eventi, setEventi] = useState([]);
  const [eventoAttivo, setEventoAttivo] = useState(null);
  const [persone, setPersone] = useState([]); // persone dell'evento attivo (tutte quelle leggibili)
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // { mode: 'in_ballo'|'venduto', persona }

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
    persone.filter(p => p.stato === "in_ballo" && p.user_id === auth.userId),
    [persone, auth.userId]
  );
  const venduti = useMemo(() =>
    persone.filter(p => p.stato === "venduto" && myTeamIds.has(p.user_id)),
    [persone, myTeamIds]
  );

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
    try {
      if (form.id) {
        await sbUpdateEventoPersona(auth.token, form.id, {
          nome: form.nome, cognome: form.cognome || null, telefono: form.telefono || null,
          instagram: form.instagram || null, citta: form.citta || null, note: form.note || null,
          stato: form.stato, venduto_at: form.stato === "venduto" ? new Date().toISOString() : null,
        });
        setPersone(ps => ps.map(p => p.id === form.id ? { ...p, ...form } : p));
        showToast(form.stato === "venduto" ? "Segnato come venduto" : "Aggiornato");
      } else {
        const row = await sbInsertEventoPersona(auth.token, {
          evento_id: eventoAttivo, user_id: auth.userId,
          nome: form.nome, cognome: form.cognome || null, telefono: form.telefono || null,
          instagram: form.instagram || null, citta: form.citta || null, note: form.note || null,
          stato: form.stato || "in_ballo",
        });
        const created = Array.isArray(row) ? row[0] : row;
        setPersone(ps => [...ps, created]);
        showToast("Aggiunto");
      }
    } catch (e) { showToast("Errore: " + e.message, "#ef4444"); }
    setModal(null);
  }

  async function eliminaPersona(id) {
    try {
      await sbDeleteEventoPersona(auth.token, id);
      setPersone(ps => ps.filter(p => p.id !== id));
      showToast("Rimosso", "#ef4444");
    } catch (e) { showToast("Errore: " + e.message, "#ef4444"); }
    setModal(null);
  }

  const evCorrente = eventi.find(e => e.id === eventoAttivo);

  return (
    <div style={{ padding: "2rem 2.2rem", maxWidth: 1280, margin: "0 auto" }}>
      <div style={{ marginBottom: "1.4rem" }}>
        <h1 style={{ fontWeight: 900, fontSize: 26, color: "var(--text)", letterSpacing: -0.8 }}>Eventi</h1>
        <p style={{ color: "var(--muted)", fontSize: 12, marginTop: 4 }}>Ticket, leaderboard e andamento del team</p>
      </div>

      {/* Leaderboard */}
      <div style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 16, padding: "1.6rem", marginBottom: 18 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: "var(--text)", marginBottom: 18, display: "flex", alignItems: "center", gap: 8 }}>
          <span>{"\ud83c\udfc6"}</span> Leaderboard generale del team
        </div>
        <Leaderboard ranking={ranking} />
      </div>

      {eventi.length === 0 && !loading ? (
        <div style={{ textAlign: "center", padding: "3rem", color: "var(--border2)" }}>
          Nessun evento disponibile al momento.
        </div>
      ) : (
        <>
          {/* Selettore evento */}
          <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
            {eventi.map(ev => (
              <button key={ev.id} onClick={() => setEventoAttivo(ev.id)}
                style={{ padding: "8px 16px", borderRadius: 10, border: "1px solid " + (eventoAttivo === ev.id ? "var(--a1)" : "var(--border2)"), background: eventoAttivo === ev.id ? "var(--a1-13)" : "var(--bg3)", color: eventoAttivo === ev.id ? "var(--a2)" : "var(--muted)", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
                {ev.nome} <span style={{ opacity: .6, fontSize: 10, marginLeft: 4 }}>{fmtDate(ev.data)}</span>
              </button>
            ))}
          </div>

          {/* Grafico andamento */}
          <div style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 16, padding: "1.4rem", marginBottom: 18 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: "var(--text)", marginBottom: 14 }}>Andamento ticket venduti (tu + downline)</div>
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

          {/* In ballo + venduti */}
          {evCorrente && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 16, padding: "1.2rem" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: "#f59e0b" }}>In ballo {"\u00b7"} {inBallo.length}</div>
                  <button onClick={() => setModal({ persona: null, stato: "in_ballo" })}
                    style={{ padding: "5px 12px", fontSize: 11, fontWeight: 800, background: "#f59e0b18", color: "#f59e0b", border: "1px solid #f59e0b40", borderRadius: 8, cursor: "pointer" }}>
                    + Aggiungi
                  </button>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 7, maxHeight: 420, overflowY: "auto" }}>
                  {inBallo.length === 0
                    ? <div style={{ textAlign: "center", padding: "1.5rem", color: "var(--border2)", fontSize: 12 }}>Nessuno al momento</div>
                    : inBallo.map(p => <PersonaCard key={p.id} p={p} showOwner={false} onClick={() => setModal({ persona: p })} />)
                  }
                </div>
              </div>

              <div style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 16, padding: "1.2rem" }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: "#10b981", marginBottom: 12 }}>Ticket venduti {"\u00b7"} {venduti.length}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 7, maxHeight: 420, overflowY: "auto" }}>
                  {venduti.length === 0
                    ? <div style={{ textAlign: "center", padding: "1.5rem", color: "var(--border2)", fontSize: 12 }}>Nessun ticket venduto ancora</div>
                    : venduti.map(p => <PersonaCard key={p.id} p={p} ownerName={ownerNameOf(p.user_id)} showOwner onClick={() => p.user_id === auth.userId && setModal({ persona: p })} />)
                  }
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {modal && (
        <div onClick={() => setModal(null)} style={{ position: "fixed", inset: 0, background: "#00000090", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }}>
          <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 480 }}>
            <PersonaModal
              persona={modal.persona}
              defaultStato={modal.stato}
              onSave={salvaPersona}
              onClose={() => setModal(null)}
              onDelete={modal.persona ? () => eliminaPersona(modal.persona.id) : null}
            />
          </div>
        </div>
      )}
    </div>
  );
}