import { useState, useEffect } from "react";
import { rinnovaSessione, eTokenScaduto } from "../sessione";
import { TEMI, applyTema } from "../shared";

const SB_URL = "https://kuxrpbsvnkxhsicbyupp.supabase.co";
const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt1eHJwYnN2bmt4aHNpY2J5dXBwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIwNzMwODIsImV4cCI6MjA5NzY0OTA4Mn0.s_lqOUC8939I2Wgf-Qkcq9WaiH1Nxze1uv4-PIV6s7I";

// TEMI e applyTema stanno in shared.jsx (prima erano copiati identici qui e in App.jsx)

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

const sbGetProfileByRef = (tok, code) => sbFetch("/rest/v1/profiles?referral_code=eq." + code + "&select=*", { _token: tok });

export function ProfiloView({ auth, onUpdateProfile, onCambiaAspetto, downlineCount }) {
  const p = auth.profile || {};
  const [nome,      setNome]      = useState(p.nome || "");
  const [cognome,   setCognome]   = useState(p.cognome || "");
  const [citta,     setCitta]     = useState(p.citta || "");
  const [telefono,  setTelefono]  = useState(p.telefono || "");
  const [instagram, setInstagram] = useState(p.instagram || "");
  const [sponsorId, setSponsorId] = useState("");
  const [sponsorName, setSponsorName] = useState(null);
  const [saving,    setSaving]    = useState(false);
  const [savingSponsor, setSavingSponsor] = useState(false);
  const [msg, setMsg] = useState(null);

  // Carica nome sponsor attuale
  useEffect(() => {
    if (!p.upline_id || !auth.token) return;
    sbFetch(`/rest/v1/profiles?select=nome,cognome&id=eq.${p.upline_id}`, { _token: auth.token })
      .then(rows => { if (rows?.[0]) setSponsorName((rows[0].nome||"")+" "+(rows[0].cognome||"")); })
      .catch(()=>{});
  }, [p.upline_id]);

  function showMsg(text, color = "#22d3ee") {
    setMsg({ text, color });
    setTimeout(() => setMsg(null), 3000);
  }

  const lbl = { fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: .8, marginBottom: 5, display: "block" };

  async function saveProfile() {
    setSaving(true);
    try {
      await onUpdateProfile({ nome: nome.trim(), cognome: cognome.trim(), citta: citta.trim(), telefono: telefono.trim() || null, instagram: instagram.trim() || null });
      showMsg("Profilo aggiornato");
    } catch(e) { showMsg("Errore: " + e.message, "#ef4444"); }
    setSaving(false);
  }

  async function saveSponsor() {
    if (!sponsorId.trim()) return;
    setSavingSponsor(true);
    try {
      const profiles = await sbGetProfileByRef(auth.token, sponsorId.trim().toLowerCase());
      if (!profiles || profiles.length === 0) { showMsg("Nessun account trovato", "#ef4444"); setSavingSponsor(false); return; }
      const sponsor = profiles[0];
      if (sponsor.id === auth.userId) { showMsg("Non puoi essere sponsor di te stesso", "#ef4444"); setSavingSponsor(false); return; }
      await onUpdateProfile({ upline_id: sponsor.id, positioned_under: sponsor.id });
      setSponsorId("");
      showMsg("Sponsor aggiornato");
    } catch(e) { showMsg("Errore: " + e.message, "#ef4444"); }
    setSavingSponsor(false);
  }

  return (
    <div style={{ padding: "2rem 2.2rem", maxWidth: 680, margin: "0 auto" }}>
      {msg && (
        <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 9999, background: msg.color, color: "#fff", padding: "12px 22px", borderRadius: 12, fontWeight: 700, fontSize: 13, boxShadow: "0 8px 30px #00000060" }}>
          {msg.text}
        </div>
      )}

      <h1 style={{ fontWeight: 900, fontSize: 26, color: "var(--text)", letterSpacing: -0.8, marginBottom: 4 }}>Il tuo profilo</h1>
      <p style={{ color: "var(--muted)", fontSize: 12, marginBottom: 24 }}>Le tue informazioni personali</p>

      <div style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 28, background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 14, padding: "1.4rem" }}>
        <div style={{ width: 64, height: 64, borderRadius: "50%", background: "linear-gradient(135deg,var(--a1),var(--a2))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, fontWeight: 900, color: "#fff", flexShrink: 0, boxShadow: "0 0 20px var(--a1-25)" }}>
          {(nome || auth.email || "?")[0].toUpperCase()}
        </div>
        <div>
          <div style={{ fontWeight: 900, fontSize: 18, color: "var(--text)" }}>{nome || "\u2014"} {cognome || ""}</div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 3 }}>{auth.email}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
            <span style={{ fontSize: 10, color: "var(--muted)" }}>Il tuo ID:</span>
            <span style={{ background: "var(--a1-12)", color: "var(--a2)", borderRadius: 6, padding: "2px 10px", fontSize: 12, fontWeight: 800, fontFamily: "monospace" }}>{p.referral_code || "..."}</span>
          </div>
        </div>
      </div>

      <div style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 14, padding: "1.4rem", marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: "var(--text)", marginBottom: 16 }}>Dati personali</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          <div><label style={lbl}>Nome</label><input value={nome} onChange={e => setNome(e.target.value)} placeholder="Luigi" /></div>
          <div><label style={lbl}>Cognome</label><input value={cognome} onChange={e => setCognome(e.target.value)} placeholder="Rossi" /></div>
          <div style={{ gridColumn: "1/-1" }}><label style={lbl}>Citta</label><input value={citta} onChange={e => setCitta(e.target.value)} placeholder="Milano" /></div>
          <div><label style={lbl}>Telefono</label><input value={telefono} onChange={e => setTelefono(e.target.value)} placeholder="+39 333 000 0000" /></div>
          <div><label style={lbl}>Instagram</label><input value={instagram} onChange={e => setInstagram(e.target.value)} placeholder="@username" /></div>
          <div style={{ gridColumn: "1/-1" }}>
            <label style={lbl}>Email</label>
            <input value={auth.email} disabled style={{ opacity: .5, cursor: "not-allowed" }} />
            <div style={{ fontSize: 10, color: "var(--border2)", marginTop: 4 }}>Email non modificabile</div>
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button onClick={saveProfile} disabled={saving}
            style={{ padding: "9px 22px", background: "linear-gradient(135deg,var(--a1),var(--a2))", color: "#fff", border: "none", borderRadius: 9, cursor: saving ? "not-allowed" : "pointer", fontWeight: 800, fontSize: 13, display: "flex", alignItems: "center", gap: 7, opacity: saving ? 0.7 : 1 }}>
            {saving && <span style={{ width: 14, height: 14, border: "2px solid #ffffff44", borderTopColor: "#fff", borderRadius: "50%", display: "inline-block", animation: "spin .7s linear infinite" }} />}
            Salva
          </button>
        </div>
      </div>

      <div style={{ background: "var(--bg2)", border: "1px solid var(--border2)", borderRadius: 14, padding: "1.4rem", marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: "var(--text)", marginBottom: 12 }}>Aspetto</div>
        {/* Due assi indipendenti come su Mac e iPhone: l'aspetto (chiaro o scuro) e il
            colore d'accento qui sotto, combinabili liberamente. Salvato sul profilo: ti
            segue su ogni dispositivo. Applicato subito, prima del salvataggio, cosi' il
            cambio si vede al clic e non dopo la risposta del database. */}
        <div style={{ display: "flex", background: "var(--bg3)", borderRadius: 10, padding: 4, border: "1px solid var(--border)", width: "fit-content", marginBottom: 20 }}>
          {[{ k: "scuro", l: "Scuro" }, { k: "chiaro", l: "Chiaro" }].map(({ k, l }) => {
            const attivo = (p.aspetto || "scuro") === k;
            return (
              <button key={k} type="button" aria-pressed={attivo}
                onClick={() => onCambiaAspetto(k)}
                style={{ padding: "8px 24px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700, fontFamily: "inherit", background: attivo ? "var(--bg4)" : "transparent", color: attivo ? "var(--a2)" : "var(--muted)", boxShadow: attivo ? "inset 0 0 0 1px var(--sidebar-border)" : "none" }}>
                {l}
              </button>
            );
          })}
        </div>
        <div style={{ fontSize: 13, fontWeight: 800, color: "var(--text)", marginBottom: 12 }}>Tema colori</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 10 }}>
          {Object.entries(TEMI).map(([key, t]) => {
            const active = (p.tema || "blu") === key;
            return (
              <button key={key} onClick={async () => {
                applyTema(key, p.aspetto || "scuro");
                await onUpdateProfile({ tema: key });
              }}
                style={{ padding: "12px 8px", borderRadius: 10, border: "2px solid " + (active ? t.vars["--a1"] : "var(--border2)"), cursor: "pointer", background: active ? t.vars["--a1-18"] : "var(--bg3)", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, transition: "all .2s" }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: t.preview, boxShadow: active ? "0 0 12px " + t.vars["--a1"] + "80" : "none" }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: active ? t.vars["--a1"] : "var(--muted)" }}>{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ background: "var(--bg2)", border: "1px solid var(--border2)", borderRadius: 14, padding: "1.4rem" }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: "var(--text)", marginBottom: 12 }}>Il tuo sponsor</div>
        {sponsorName && (
          <div style={{ display:"flex", alignItems:"center", gap:10, background:"var(--bg3)", border:"1px solid var(--border)", borderRadius:10, padding:"10px 14px", marginBottom:14 }}>
            <div style={{ width:32, height:32, borderRadius:"50%", background:"linear-gradient(135deg,var(--a1),var(--a2))", display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontWeight:900, fontSize:13, flexShrink:0 }}>
              {sponsorName.trim()[0]||"?"}
            </div>
            <div>
              <div style={{ fontSize:10, fontWeight:700, color:"var(--muted)", textTransform:"uppercase", letterSpacing:.8 }}>Sponsor attuale</div>
              <div style={{ fontSize:13, fontWeight:800, color:"var(--text)", marginTop:1 }}>{sponsorName.trim()}</div>
            </div>
          </div>
        )}
        {!sponsorName && p.upline_id && (
          <div style={{ fontSize:12, color:"var(--muted)", marginBottom:14 }}>Caricamento sponsor...</div>
        )}
        {!p.upline_id && (
          <div style={{ fontSize:12, color:"var(--muted)", marginBottom:14 }}>Nessuno sponsor collegato</div>
        )}
        {downlineCount > 0 ? (
          <>
            <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 12, lineHeight: 1.6 }}>
              Hai {downlineCount} {downlineCount === 1 ? "membro" : "membri"} nella tua downline. Per spostare il tuo sponsor senza creare problemi all albero contatta chi gestisce il sistema.
            </div>
            <div style={{ background: "#f59e0b12", border: "1px solid #f59e0b30", borderRadius: 9, padding: "10px 14px", fontSize: 12, color: "#f59e0b", fontWeight: 600 }}>
              Cambio sponsor non disponibile — hai gia una struttura attiva
            </div>
          </>
        ) : (
          <>
            <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 16, lineHeight: 1.6 }}>
              Inserisci qui l ID del tuo sponsor reale per correggere il collegamento e aggiornare la tua posizione nell albero.
            </div>
            <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
              <div style={{ flex: 1 }}>
                <label style={lbl}>ID sponsor</label>
                <input value={sponsorId} onChange={e => setSponsorId(e.target.value)} placeholder="es. mario_abc123" onKeyDown={e => e.key === "Enter" && saveSponsor()} />
              </div>
              <button onClick={saveSponsor} disabled={savingSponsor || !sponsorId.trim()}
                style={{ padding: "9px 18px", background: sponsorId.trim() ? "linear-gradient(135deg,var(--a1),var(--a2))" : "var(--bg4)", color: sponsorId.trim() ? "#fff" : "var(--muted)", border: "none", borderRadius: 9, cursor: sponsorId.trim() && !savingSponsor ? "pointer" : "not-allowed", fontWeight: 800, fontSize: 13, whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 7, opacity: savingSponsor ? 0.7 : 1 }}>
                {savingSponsor && <span style={{ width: 14, height: 14, border: "2px solid #ffffff44", borderTopColor: "#fff", borderRadius: "50%", display: "inline-block", animation: "spin .7s linear infinite" }} />}
                Aggiorna
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}