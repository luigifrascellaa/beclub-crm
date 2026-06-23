import { useState } from "react";

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

const sbGetProfileByRef = (tok, code) => sbFetch("/rest/v1/profiles?referral_code=eq." + code + "&select=*", { _token: tok });

export function ProfiloView({ auth, onUpdateProfile }) {
  const p = auth.profile || {};
  const [nome,      setNome]      = useState(p.nome || "");
  const [cognome,   setCognome]   = useState(p.cognome || "");
  const [citta,     setCitta]     = useState(p.citta || "");
  const [telefono,  setTelefono]  = useState(p.telefono || "");
  const [instagram, setInstagram] = useState(p.instagram || "");
  const [sponsorId, setSponsorId] = useState("");
  const [saving,    setSaving]    = useState(false);
  const [savingSponsor, setSavingSponsor] = useState(false);
  const [msg, setMsg] = useState(null);

  function showMsg(text, color = "#22d3ee") {
    setMsg({ text, color });
    setTimeout(() => setMsg(null), 3000);
  }

  const lbl = { fontSize: 11, fontWeight: 700, color: "#3b5478", textTransform: "uppercase", letterSpacing: .8, marginBottom: 5, display: "block" };

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

      <h1 style={{ fontWeight: 900, fontSize: 26, color: "#eff6ff", letterSpacing: -0.8, marginBottom: 4 }}>Il tuo profilo</h1>
      <p style={{ color: "#3b5478", fontSize: 12, marginBottom: 24 }}>Le tue informazioni personali</p>

      <div style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 28, background: "#080f1f", border: "1px solid #11203a", borderRadius: 14, padding: "1.4rem" }}>
        <div style={{ width: 64, height: 64, borderRadius: "50%", background: "linear-gradient(135deg,#2563eb,#0ea5e9)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, fontWeight: 900, color: "#fff", flexShrink: 0, boxShadow: "0 0 20px #2563eb40" }}>
          {(nome || auth.email || "?")[0].toUpperCase()}
        </div>
        <div>
          <div style={{ fontWeight: 900, fontSize: 18, color: "#eff6ff" }}>{nome || "\u2014"} {cognome || ""}</div>
          <div style={{ fontSize: 12, color: "#5278a8", marginTop: 3 }}>{auth.email}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
            <span style={{ fontSize: 10, color: "#3b5478" }}>Il tuo ID:</span>
            <span style={{ background: "#2563eb20", color: "#60a5fa", borderRadius: 6, padding: "2px 10px", fontSize: 12, fontWeight: 800, fontFamily: "monospace" }}>{p.referral_code || "..."}</span>
          </div>
        </div>
      </div>

      <div style={{ background: "#080f1f", border: "1px solid #11203a", borderRadius: 14, padding: "1.4rem", marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: "#eff6ff", marginBottom: 16 }}>Dati personali</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          <div><label style={lbl}>Nome</label><input value={nome} onChange={e => setNome(e.target.value)} placeholder="Luigi" /></div>
          <div><label style={lbl}>Cognome</label><input value={cognome} onChange={e => setCognome(e.target.value)} placeholder="Rossi" /></div>
          <div style={{ gridColumn: "1/-1" }}><label style={lbl}>Citta</label><input value={citta} onChange={e => setCitta(e.target.value)} placeholder="Milano" /></div>
          <div><label style={lbl}>Telefono</label><input value={telefono} onChange={e => setTelefono(e.target.value)} placeholder="+39 333 000 0000" /></div>
          <div><label style={lbl}>Instagram</label><input value={instagram} onChange={e => setInstagram(e.target.value)} placeholder="@username" /></div>
          <div style={{ gridColumn: "1/-1" }}>
            <label style={lbl}>Email</label>
            <input value={auth.email} disabled style={{ opacity: .5, cursor: "not-allowed" }} />
            <div style={{ fontSize: 10, color: "#2a4060", marginTop: 4 }}>Email non modificabile</div>
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button onClick={saveProfile} disabled={saving}
            style={{ padding: "9px 22px", background: "linear-gradient(135deg,#2563eb,#0ea5e9)", color: "#fff", border: "none", borderRadius: 9, cursor: saving ? "not-allowed" : "pointer", fontWeight: 800, fontSize: 13, display: "flex", alignItems: "center", gap: 7, opacity: saving ? 0.7 : 1 }}>
            {saving && <span style={{ width: 14, height: 14, border: "2px solid #ffffff44", borderTopColor: "#fff", borderRadius: "50%", display: "inline-block", animation: "spin .7s linear infinite" }} />}
            Salva
          </button>
        </div>
      </div>

      <div style={{ background: "#080f1f", border: "1px solid #1e3a5f", borderRadius: 14, padding: "1.4rem" }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: "#eff6ff", marginBottom: 4 }}>Il tuo sponsor</div>
        <div style={{ fontSize: 11, color: "#3b5478", marginBottom: 16, lineHeight: 1.6 }}>
          Inserisci qui l ID del tuo sponsor reale per correggere il collegamento e aggiornare la tua posizione nell albero.
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
          <div style={{ flex: 1 }}>
            <label style={lbl}>ID sponsor</label>
            <input value={sponsorId} onChange={e => setSponsorId(e.target.value)} placeholder="es. mario_abc123" onKeyDown={e => e.key === "Enter" && saveSponsor()} />
          </div>
          <button onClick={saveSponsor} disabled={savingSponsor || !sponsorId.trim()}
            style={{ padding: "9px 18px", background: sponsorId.trim() ? "linear-gradient(135deg,#2563eb,#0ea5e9)" : "#0d1b33", color: sponsorId.trim() ? "#fff" : "#3b5478", border: "none", borderRadius: 9, cursor: sponsorId.trim() && !savingSponsor ? "pointer" : "not-allowed", fontWeight: 800, fontSize: 13, whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 7, opacity: savingSponsor ? 0.7 : 1 }}>
            {savingSponsor && <span style={{ width: 14, height: 14, border: "2px solid #ffffff44", borderTopColor: "#fff", borderRadius: "50%", display: "inline-block", animation: "spin .7s linear infinite" }} />}
            Aggiorna
          </button>
        </div>
      </div>
    </div>
  );
}
