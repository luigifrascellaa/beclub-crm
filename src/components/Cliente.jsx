import { useState } from "react";

const FASI_ONBOARDING = [
  {
    n: 1,
    titolo: "Fase 1",
    links: [
      { label: "Profili da seguire", url: "https://linktr.ee/profilidaseguire" },
      { label: "Applicazioni da scaricare", url: "https://linktr.ee/applicazionidascaricare" },
    ],
  },
  {
    n: 2,
    titolo: "Fase 2",
    links: [
      { label: "WES Stocks Base", url: "https://wowpowers.com/it/path/f373ccd8-44de-4c8e-bccc-c8cf094d45ae" },
      { label: "WES Stocks Intermedio", url: "https://wowpowers.com/it/catalog/paths/a9779909-3dbe-4880-ac2d-75b9f4c42068" },
    ],
  },
  {
    n: 3,
    titolo: "Fase 3",
    links: [
      { label: "LIVE Enrico", url: "https://wowpowers.com/it/stream-player/enrico/livestream/66107c76-302e-4d66-8c6a-4ce778b994bf?reference=TOP_EDUCATORS" },
      { label: "WES Stocks Avanzato", url: "https://wowpowers.com/it/path/73d9a573-2465-4e4a-bdd8-2607d5d08958" },
    ],
  },
  {
    n: 4,
    titolo: "Fase 4",
    links: [
      { label: "Psicologia, basi e PAC - Click", url: "https://www.myclick.space/c/be-servizi-ita/sections/1099195/lessons/4189638" },
      { label: "Onboarding SGM", url: "https://wowpowers.com/it/stream-player/marco_p/livestream/1f5e6f30-5cd8-4522-98a5-e254fff735dd" },
    ],
  },
];

export function ClienteView({ auth, onUpdateProfile }) {
  const step = auth?.profile?.onboarding_step || 1;
  const [openId, setOpenId] = useState(step <= FASI_ONBOARDING.length ? step : null);
  const tuttoCompletato = step > FASI_ONBOARDING.length;

  function toggleFase(n) {
    if (n > step) return; // bloccata, nessun effetto
    setOpenId(prev => prev === n ? null : n);
  }

  function completaFase(n) {
    const next = n + 1;
    onUpdateProfile({ onboarding_step: next });
    setOpenId(next <= FASI_ONBOARDING.length ? next : null);
  }

  return (
    <div style={{ padding: "2rem 2.2rem", maxWidth: 900, margin: "0 auto" }}>
      <h1 style={{ fontWeight: 900, fontSize: 24, color: "var(--text)", marginBottom: 6 }}>Onboarding</h1>
      <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 24 }}>
        {tuttoCompletato ? "Hai completato tutte le fasi dell'onboarding." : "Completa le fasi in ordine per proseguire."}
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {FASI_ONBOARDING.map(f => {
          const sbloccata = f.n <= step;
          const completata = f.n < step;
          const isOpen = openId === f.n;

          return (
            <div key={f.n} style={{
              background: "var(--bg2)",
              border: "1px solid " + (isOpen ? "var(--a1-25)" : "var(--border)"),
              borderRadius: 14, overflow: "hidden",
              opacity: sbloccata ? 1 : 0.55, transition: "opacity .2s",
            }}>
              <button onClick={() => toggleFase(f.n)} disabled={!sbloccata}
                style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "16px 18px", background: "none", border: "none", cursor: sbloccata ? "pointer" : "not-allowed", textAlign: "left", fontFamily: "inherit" }}>
                <div style={{
                  width: 34, height: 34, borderRadius: "50%",
                  background: completata ? "#10b98120" : sbloccata ? "var(--a1-13)" : "var(--bg3)",
                  border: "1px solid " + (completata ? "#10b98140" : sbloccata ? "var(--a1-25)" : "var(--border2)"),
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  fontWeight: 800, fontSize: 14,
                  color: completata ? "#10b981" : sbloccata ? "var(--a2)" : "var(--border2)",
                }}>
                  {completata ? "\u2713" : f.n}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 800, fontSize: 14, color: sbloccata ? "var(--text)" : "var(--border2)" }}>{f.titolo}</div>
                  {!sbloccata && <div style={{ fontSize: 11, color: "var(--border2)", marginTop: 2 }}>Completa la fase precedente per sbloccare</div>}
                </div>
                {sbloccata && (
                  <span style={{ color: "var(--muted)", fontSize: 18, transform: isOpen ? "rotate(90deg)" : "none", transition: "transform .2s" }}>{"\u203a"}</span>
                )}
              </button>

              {isOpen && (
                <div style={{ padding: "0 18px 18px 18px" }}>
                  {f.links.length === 0 ? (
                    <div style={{ fontSize: 12, color: "var(--border2)", padding: "6px 0 14px" }}>Contenuti in arrivo.</div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
                      {f.links.map(l => (
                        <a key={l.url} href={l.url} target="_blank" rel="noopener noreferrer"
                          style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", background: "var(--bg3)", border: "1px solid var(--border2)", borderRadius: 10, color: "var(--a2)", fontSize: 13, fontWeight: 700, textDecoration: "none" }}>
                          {l.label}
                          <span style={{ color: "var(--muted)", fontSize: 14 }}>{"\u2197"}</span>
                        </a>
                      ))}
                    </div>
                  )}
                  {!completata && (
                    <button onClick={() => completaFase(f.n)}
                      style={{ padding: "9px 18px", background: "linear-gradient(135deg,var(--a1),var(--a2))", color: "#fff", border: "none", borderRadius: 10, cursor: "pointer", fontWeight: 800, fontSize: 13 }}>
                      {f.n < FASI_ONBOARDING.length ? "Fatto, sblocca la fase successiva" : "Completa onboarding"}
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}