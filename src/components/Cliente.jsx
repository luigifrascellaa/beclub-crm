import { useState, useMemo } from "react";

// ID dell'account Dimitri (permesso leader in Team.jsx, stesso ID usato qui come radice
// per decidere chi e' nella sua squadra sinistra). NON e' lo stesso ID di LUDOVICO_ID
// (root strutturale dell'intero albero) - i due sono tenuti separati di proposito, vedi CLAUDE.md.
const DIMITRI_ID = "720d0d85-b356-46e7-8b27-0e33eeea9ae5";

// Copiata identica da Eventi.jsx (getSquadraRelativeTo) per non reimplementare la logica
// di risalita della catena positioned_under - un'implementazione leggermente diversa qui
// rischierebbe lo stesso bug di sottostima gia' documentato in CLAUDE.md (punto 7).
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

// Onboarding alternativo (tutti tranne la squadra sinistra di Dimitri).
// Struttura diversa da FASI_ONBOARDING: 3 box principali, sblocco non sequenziale -
// completando solo "ON BOARDING START" si sbloccano insieme gli altri due, che a
// loro volta contengono sottocartelle puramente organizzative (nessun blocco interno).
const FASI_ONBOARDING_ALT = [
  {
    n: 1,
    titolo: "ON BOARDING START",
    links: [
      { label: "Profili da seguire", url: "https://linktr.ee/profilidaseguire" },
      { label: "Applicazioni da scaricare", url: "https://linktr.ee/applicazionidascaricare" },
    ],
  },
  {
    n: 2,
    titolo: "INTRODUZIONE NETWORK",
    sottocartelle: [
      {
        titolo: "Fase 1",
        links: [
          { label: "Fascicolo THE M.A.P. (da scaricare e stampare)", url: "https://drive.google.com/file/d/1QwcBaFJHPjPC01OrH4XDckqIEamdAq0x/view?usp=sharing" },
          { label: "THE M.A.P. Percorso", url: "https://themap.click/map" },
        ],
      },
      {
        titolo: "Fase 2",
        links: [
          { label: "Consultant school", url: "https://www.myclick.space/c/consultant-school-7a1812" },
          { label: "Business 21 sec", url: "https://drive.google.com/file/d/1FzlONRV21lQ7jK0GQm8OM5sgkjGZ-bCb/view" },
        ],
      },
    ],
  },
  {
    n: 3,
    titolo: "PERCORSO TRADING",
    sottocartelle: [
      {
        titolo: "Percorso base",
        links: [
          { label: "WES BASE FOREX", url: "https://wowpowers.com/it/path/5eb74a1d-159b-4a39-b057-82da5e5fdd1d" },
          { label: "Come impostare Tradingview (telefono)", url: "https://drive.google.com/file/d/1GI33e_oC280eMvh7vWjvZJCQ1UJtyWiw/view" },
          { label: "Come impostare Tradingview (computer)", url: "https://drive.google.com/file/d/15tVs4xMkw24dqJFFbgZx4gJniLVueJyN/view" },
          { label: "Come utilizzare syntra (sala didattica)", url: "https://drive.google.com/file/d/1gV38c-vyGSDKgZrEF1ogsiDpy_nPdLx6/view" },
          { label: "Strategia Bande di Bollinger", url: "https://drive.google.com/file/d/1bqx-R0C8tzPJHR9eosA3cwEujMODmIXU/view" },
          { label: "Riassunto strategia bande PDF", url: "https://drive.google.com/file/d/1wUmE9n3c50MKyK1PaEMSWB6gPdxWC4V1/view" },
        ],
      },
      {
        titolo: "Percorso avanzato",
        links: [
          { label: "Da base a pro (seleziona voce playlist)", url: "https://wowpowers.com/it/stream-player/giuliano/livestream/1aaafeee-132e-48c6-8219-b017dc185275?reference=TOP_EDUCATORS" },
          { label: "Live Giuliano (Lun-Mar-Mer H13:00)", url: "https://wowpowers.com/it/stream-player/giuliano/livestream/1aaafeee-132e-48c6-8219-b017dc185275?reference=TOP_EDUCATORS" },
        ],
      },
    ],
  },
];

export function ClienteView({ auth, onUpdateProfile, allProfiles, positions }) {
  // Determina se l'utente ricade nella squadra sinistra di Dimitri, risalendo l'intera
  // catena positioned_under (spillover incluso), non solo il collegamento diretto.
  const squadraDimitri = useMemo(() => {
    if (!auth?.userId) return null;
    return getSquadraRelativeTo(DIMITRI_ID, auth.userId, allProfiles || [], positions || [], {});
  }, [auth?.userId, allProfiles, positions]);

  const usaOnboardingClassico = squadraDimitri === "sinistra";

  return usaOnboardingClassico
    ? <OnboardingClassico auth={auth} onUpdateProfile={onUpdateProfile} />
    : <OnboardingAlt auth={auth} onUpdateProfile={onUpdateProfile} />;
}

function OnboardingClassico({ auth, onUpdateProfile }) {
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

function OnboardingAlt({ auth, onUpdateProfile }) {
  // onboarding_step qui ha solo 2 stati significativi: 1 = solo "ON BOARDING START"
  // sbloccato, 2 = tutto sbloccato. Stesso campo DB usato da OnboardingClassico, ma
  // senza conflitto perche' ogni utente vede sempre e solo uno dei due percorsi.
  const step = auth?.profile?.onboarding_step || 1;
  const sbloccatoTutto = step >= 2;
  const [openId, setOpenId] = useState(sbloccatoTutto ? null : 1);
  const [openSub, setOpenSub] = useState({});

  function toggleFase(n) {
    const sbloccata = n === 1 || sbloccatoTutto;
    if (!sbloccata) return;
    setOpenId(prev => prev === n ? null : n);
  }

  function toggleSub(n, idx) {
    const key = n + "-" + idx;
    setOpenSub(prev => ({ ...prev, [key]: !prev[key] }));
  }

  function completaStart() {
    onUpdateProfile({ onboarding_step: 2 });
    setOpenId(2);
  }

  return (
    <div style={{ padding: "2rem 2.2rem", maxWidth: 900, margin: "0 auto" }}>
      <h1 style={{ fontWeight: 900, fontSize: 24, color: "var(--text)", marginBottom: 6 }}>Onboarding</h1>
      <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 24 }}>
        {sbloccatoTutto ? "Percorso completo sbloccato." : "Completa \"ON BOARDING START\" per sbloccare il resto."}
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {FASI_ONBOARDING_ALT.map(f => {
          const sbloccata = f.n === 1 || sbloccatoTutto;
          const completata = f.n === 1 && sbloccatoTutto;
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
                  {!sbloccata && <div style={{ fontSize: 11, color: "var(--border2)", marginTop: 2 }}>Completa "ON BOARDING START" per sbloccare</div>}
                </div>
                {sbloccata && (
                  <span style={{ color: "var(--muted)", fontSize: 18, transform: isOpen ? "rotate(90deg)" : "none", transition: "transform .2s" }}>{"\u203a"}</span>
                )}
              </button>

              {isOpen && (
                <div style={{ padding: "0 18px 18px 18px" }}>
                  {f.links && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: f.n === 1 ? 14 : 0 }}>
                      {f.links.map((l, i) => (
                        <a key={i} href={l.url} target="_blank" rel="noopener noreferrer"
                          style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", background: "var(--bg3)", border: "1px solid var(--border2)", borderRadius: 10, color: "var(--a2)", fontSize: 13, fontWeight: 700, textDecoration: "none" }}>
                          {l.label}
                          <span style={{ color: "var(--muted)", fontSize: 14 }}>{"\u2197"}</span>
                        </a>
                      ))}
                    </div>
                  )}

                  {f.sottocartelle && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {f.sottocartelle.map((sc, idx) => {
                        const subKey = f.n + "-" + idx;
                        const subOpen = !!openSub[subKey];
                        return (
                          <div key={subKey} style={{
                            background: "var(--bg3)",
                            border: "1px solid var(--border2)",
                            borderRadius: 10, overflow: "hidden",
                          }}>
                            <button onClick={() => toggleSub(f.n, idx)}
                              style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 14px", background: "none", border: "none", cursor: "pointer", textAlign: "left", fontFamily: "inherit" }}>
                              <span style={{ fontWeight: 700, fontSize: 13, color: "var(--text)" }}>{sc.titolo}</span>
                              <span style={{ color: "var(--muted)", fontSize: 14, transform: subOpen ? "rotate(90deg)" : "none", transition: "transform .2s" }}>{"\u203a"}</span>
                            </button>
                            {subOpen && (
                              <div style={{ padding: "0 14px 12px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
                                {sc.links.map((l, i) => (
                                  <a key={i} href={l.url} target="_blank" rel="noopener noreferrer"
                                    style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", background: "var(--bg2)", border: "1px solid var(--border2)", borderRadius: 10, color: "var(--a2)", fontSize: 13, fontWeight: 700, textDecoration: "none" }}>
                                    {l.label}
                                    <span style={{ color: "var(--muted)", fontSize: 14 }}>{"\u2197"}</span>
                                  </a>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {f.n === 1 && !completata && (
                    <button onClick={completaStart}
                      style={{ padding: "9px 18px", background: "linear-gradient(135deg,var(--a1),var(--a2))", color: "#fff", border: "none", borderRadius: 10, cursor: "pointer", fontWeight: 800, fontSize: 13 }}>
                      Fatto, sblocca il resto
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