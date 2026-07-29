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
      { label: "Fascicolo THE M.A.P (da scaricare e stampare)", url: "https://drive.google.com/file/d/1QwcBaFJHPjPC01OrH4XDckqIEamdAq0x/view?usp=sharing" },
      { label: "THE M.A.P percorso", url: "https://themap.click/map" },
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
  {
    n: 4,
    titolo: "PERCORSO PAC/AZIONI",
    sottocartelle: [
      {
        titolo: "Fase 1",
        links: [
          { label: "WES Stocks Base", url: "https://wowpowers.com/it/path/f373ccd8-44de-4c8e-bccc-c8cf094d45ae" },
          { label: "WES Stocks Intermedio", url: "https://wowpowers.com/it/catalog/paths/a9779909-3dbe-4880-ac2d-75b9f4c42068" },
        ],
      },
      {
        titolo: "Fase 2",
        links: [
          { label: "Live Enrico", url: "https://wowpowers.com/it/stream-player/enrico/livestream/66107c76-302e-4d66-8c6a-4ce778b994bf?reference=TOP_EDUCATORS" },
          { label: "WES Stocks Avanzato", url: "https://wowpowers.com/it/path/73d9a573-2465-4e4a-bdd8-2607d5d08958" },
        ],
      },
      {
        titolo: "Fase 3",
        links: [
          { label: "Psicologia, basi e PAC - Click", url: "https://www.myclick.space/c/be-servizi-ita/sections/1099195/lessons/4189638" },
        ],
      },
    ],
  },
  {
    n: 5,
    titolo: "PERCORSO SAGEMASTER/CRYPTO",
    sottocartelle: [
      {
        titolo: "Fase 1",
        links: [
          { label: "Accedi a SAGEMASTER", url: "https://sfx.sagemaster.io/sign-in?next=%2F" },
          { label: "WES Crypto Base", url: "https://wowpowers.com/it/path/6e4e6247-1130-4b51-93bb-798393719f39" },
        ],
      },
      {
        titolo: "Fase 2",
        links: [
          { label: "Call onboarding: AI tools, breve/medio e lungo termine", url: "https://www.myclick.space/c/be-servizi-ita/sections/1099195/lessons/4189640" },
          { label: "Imposta la tua prima grid (step by step)", url: "https://drive.google.com/file/d/1Hlw_F1WBg1n2ZreTgETH-bd8LhV1FtSZ/view" },
        ],
      },
      {
        titolo: "Fase 3",
        links: [
          { label: "Live Pomarico (Domenica H20:00)", url: "https://wowpowers.com/it/stream-player/marco_p/livestream/1f5e6f30-5cd8-4522-98a5-e254fff735dd" },
        ],
      },
    ],
  },
];

export function ClienteView({ auth, onUpdateProfile, allProfiles, positions }) {
  // Determina se l'utente ricade nella squadra sinistra di Dimitri, risalendo l'intera
  // catena positioned_under (spillover incluso), non solo il collegamento diretto.
  // Calcolato SEMPRE (anche per Dimitri stesso, dove non viene usato) per rispettare
  // le regole degli hook: mai un return prima di un useMemo/useState.
  const squadraDimitri = useMemo(() => {
    if (!auth?.userId) return null;
    return getSquadraRelativeTo(DIMITRI_ID, auth.userId, allProfiles || [], positions || [], {});
  }, [auth?.userId, allProfiles, positions]);

  // Dimitri vede entrambi i percorsi, già sbloccati, con un selettore - vedi sotto.
  if (auth?.userId === DIMITRI_ID) {
    return <OnboardingDimitriPreview auth={auth} onUpdateProfile={onUpdateProfile} />;
  }

  const usaOnboardingClassico = squadraDimitri === "sinistra";

  return usaOnboardingClassico
    ? <OnboardingClassico auth={auth} onUpdateProfile={onUpdateProfile} />
    : <OnboardingAlt auth={auth} onUpdateProfile={onUpdateProfile} />;
}

// Solo per l'account di Dimitri: mostra entrambi i percorsi, già completamente sbloccati
// e in sola visualizzazione. previewMode=true in entrambi i componenti sotto fa sì che
// non venga MAI chiamato onUpdateProfile - quindi profiles.onboarding_step di Dimitri
// non viene mai letto né scritto da questa vista, zero rischio di incrociarsi con l'altro
// percorso o con qualsiasi altro account.
function OnboardingDimitriPreview({ auth, onUpdateProfile }) {
  const [tab, setTab] = useState(1);

  return (
    <div>
      <div style={{ padding: "2rem 2.2rem 0", maxWidth: 900, margin: "0 auto" }}>
        <div style={{ display: "inline-flex", gap: 4, background: "var(--bg3)", borderRadius: 9, padding: 3, border: "1px solid var(--border)" }}>
          {[{ id: 1, label: "Onboarding 1" }, { id: 2, label: "Onboarding 2" }].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{
                padding: "7px 16px", borderRadius: 7, border: "none", cursor: "pointer",
                fontSize: 11, fontWeight: 800, fontFamily: "inherit", transition: "all .2s",
                background: tab === t.id ? "var(--bg4)" : "transparent",
                color: tab === t.id ? "var(--a2)" : "var(--muted)",
                boxShadow: tab === t.id ? "inset 0 0 0 1px var(--sidebar-border)" : "none",
              }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === 1
        ? <OnboardingClassico auth={auth} onUpdateProfile={onUpdateProfile} previewMode />
        : <OnboardingAlt auth={auth} onUpdateProfile={onUpdateProfile} previewMode />}
    </div>
  );
}

function OnboardingClassico({ auth, onUpdateProfile, previewMode }) {
  const step = previewMode ? (FASI_ONBOARDING.length + 1) : (auth?.profile?.onboarding_step || 1);
  const [openId, setOpenId] = useState(step <= FASI_ONBOARDING.length ? step : null);
  const tuttoCompletato = step > FASI_ONBOARDING.length;

  // Traccia quali link sono stati aperti, per fase (keyed by "faseN-linkIndex").
  // Solo state locale, non persistito - si azzera al reload, stesso pattern
  // già usato nell'onboarding alternativo.
  const [linkClickati, setLinkClickati] = useState({});

  function segnaLinkClickato(n, i) {
    setLinkClickati(prev => ({ ...prev, [n + "-" + i]: true }));
  }

  function tuttiClickati(f) {
    if (previewMode) return true;
    if (f.links.length === 0) return true;
    return f.links.every((_, i) => linkClickati[f.n + "-" + i]);
  }

  function toggleFase(n) {
    if (n > step) return; // bloccata, nessun effetto
    setOpenId(prev => prev === n ? null : n);
  }

  function completaFase(f) {
    if (!tuttiClickati(f)) return; // sicurezza extra, il bottone e' comunque disabilitato
    const next = f.n + 1;
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
          const faseTuttiClickati = tuttiClickati(f);

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
                    <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 8 }}>
                      {f.links.map((l, i) => {
                        const clickato = previewMode || !!linkClickati[f.n + "-" + i];
                        return (
                          <a key={i} href={l.url} target="_blank" rel="noopener noreferrer"
                            onClick={() => segnaLinkClickato(f.n, i)}
                            style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", background: "var(--bg3)", border: "1px solid var(--border2)", borderRadius: 10, color: "var(--a2)", fontSize: 13, fontWeight: 700, textDecoration: "none" }}>
                            <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <span style={{
                                width: 16, height: 16, borderRadius: "50%", flexShrink: 0,
                                display: "flex", alignItems: "center", justifyContent: "center",
                                fontSize: 10, fontWeight: 800,
                                background: clickato ? "#10b98130" : "var(--bg2)",
                                border: "1px solid " + (clickato ? "#10b98150" : "var(--border2)"),
                                color: clickato ? "#10b981" : "var(--muted)",
                              }}>
                                {clickato ? "\u2713" : ""}
                              </span>
                              {l.label}
                            </span>
                            <span style={{ color: "var(--muted)", fontSize: 14 }}>{"\u2197"}</span>
                          </a>
                        );
                      })}
                    </div>
                  )}
                  {!completata && (
                    <div style={{ marginTop: 6 }}>
                      {!faseTuttiClickati && (
                        <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 8 }}>
                          Apri tutti i link ({f.links.filter((_, i) => linkClickati[f.n + "-" + i]).length}/{f.links.length}) per sbloccare
                        </div>
                      )}
                      <button onClick={() => completaFase(f)} disabled={!faseTuttiClickati}
                        style={{
                          padding: "9px 18px",
                          background: faseTuttiClickati ? "linear-gradient(135deg,var(--a1),var(--a2))" : "var(--bg3)",
                          color: faseTuttiClickati ? "#fff" : "var(--border2)",
                          border: "1px solid " + (faseTuttiClickati ? "transparent" : "var(--border2)"),
                          borderRadius: 10, cursor: faseTuttiClickati ? "pointer" : "not-allowed",
                          fontWeight: 800, fontSize: 13,
                        }}>
                        {f.n < FASI_ONBOARDING.length ? "Fatto, sblocca la fase successiva" : "Completa onboarding"}
                      </button>
                    </div>
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

function OnboardingAlt({ auth, onUpdateProfile, previewMode }) {
  // onboarding_step qui ha solo 2 stati significativi: 1 = solo "ON BOARDING START"
  // sbloccato, 2 = tutto sbloccato (INTRODUZIONE NETWORK + PERCORSO TRADING). Stesso
  // campo DB usato da OnboardingClassico, senza conflitto perche' ogni utente vede
  // sempre e solo uno dei due percorsi.
  //
  // Il progresso PIU' IN PROFONDITA' (quale sottocartella e' sbloccata dentro
  // INTRODUZIONE NETWORK / PERCORSO TRADING, e quali link sono stati aperti) e' salvato
  // in profiles.onboarding_progress (jsonb), letto qui come valore iniziale dello state
  // e riscritto (in silenzio, senza toast) ad ogni click - sopravvive a reload/logout.
  //
  // previewMode (solo per Dimitri): bypassa tutti i controlli di sblocco/click,
  // mostra tutto gia' completato, e non chiama mai onUpdateProfile.
  const step = auth?.profile?.onboarding_step || 1;
  const sbloccatoTutto = previewMode || step >= 2;
  const [openId, setOpenId] = useState(sbloccatoTutto ? null : 1);

  const progressoSalvato = auth?.profile?.onboarding_progress || {};

  // Click sui link di "ON BOARDING START" (keyed by indice link)
  const [linkClickati, setLinkClickati] = useState(progressoSalvato.linkClickati || {});
  const linksFase1 = FASI_ONBOARDING_ALT[0].links;
  const tuttiClickatiFase1 = previewMode || linksFase1.every((_, i) => linkClickati[i]);

  // Per INTRODUZIONE NETWORK e PERCORSO TRADING (f.n con sottocartelle):
  // - subStep[n] = indice della sottocartella piu' avanzata sbloccata (0-based, default 0)
  // - openSub["n-idx"] = se quella sottocartella e' espansa (solo UI, non persistito)
  // - subLinkClickati["n-idx-linkIdx"] = se quel link e' stato aperto
  const [subStep, setSubStep] = useState(progressoSalvato.subStep || {});
  const [openSub, setOpenSub] = useState({});
  const [subLinkClickati, setSubLinkClickati] = useState(progressoSalvato.subLinkClickati || {});

  // Scrive il progresso su Supabase (silenzioso, nessun toast). Mai in previewMode.
  function salvaProgresso(patch) {
    if (previewMode) return;
    onUpdateProfile({
      onboarding_progress: {
        linkClickati: patch.linkClickati || linkClickati,
        subStep: patch.subStep || subStep,
        subLinkClickati: patch.subLinkClickati || subLinkClickati,
      },
    }, true);
  }

  function toggleFase(n) {
    const sbloccata = n === 1 || sbloccatoTutto;
    if (!sbloccata) return;
    setOpenId(prev => prev === n ? null : n);
  }

  function segnaLinkClickato(i) {
    const next = { ...linkClickati, [i]: true };
    setLinkClickati(next);
    salvaProgresso({ linkClickati: next });
  }

  function completaStart() {
    if (!tuttiClickatiFase1) return; // sicurezza extra, il bottone e' comunque disabilitato
    onUpdateProfile({ onboarding_step: 2 });
    setOpenId(2);
  }

  function subSbloccata(n, idx) {
    if (previewMode) return true;
    return idx <= (subStep[n] || 0);
  }

  function toggleSub(n, idx) {
    if (!subSbloccata(n, idx)) return;
    const key = n + "-" + idx;
    setOpenSub(prev => ({ ...prev, [key]: !prev[key] }));
  }

  function segnaSubLinkClickato(n, idx, li) {
    const next = { ...subLinkClickati, [n + "-" + idx + "-" + li]: true };
    setSubLinkClickati(next);
    salvaProgresso({ subLinkClickati: next });
  }

  function subTuttiClickati(n, idx, links) {
    if (previewMode) return true;
    return links.every((_, li) => subLinkClickati[n + "-" + idx + "-" + li]);
  }

  function completaSub(n, idx, totaleSottocartelle) {
    const nextSubStep = { ...subStep, [n]: Math.max(subStep[n] || 0, idx + 1) };
    setSubStep(nextSubStep);
    salvaProgresso({ subStep: nextSubStep });
    if (idx + 1 < totaleSottocartelle) {
      setOpenSub(prev => ({ ...prev, [n + "-" + idx]: false, [n + "-" + (idx + 1)]: true }));
    }
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
          const completata = previewMode ? true : (f.n === 1
            ? sbloccatoTutto
            : (f.sottocartelle ? (subStep[f.n] || 0) >= f.sottocartelle.length - 1 : false));
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
                    <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 8 }}>
                      {f.links.map((l, i) => {
                        const clickato = previewMode || !!linkClickati[i];
                        return (
                          <a key={i} href={l.url} target="_blank" rel="noopener noreferrer"
                            onClick={() => segnaLinkClickato(i)}
                            style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", background: "var(--bg3)", border: "1px solid var(--border2)", borderRadius: 10, color: "var(--a2)", fontSize: 13, fontWeight: 700, textDecoration: "none" }}>
                            <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <span style={{
                                width: 16, height: 16, borderRadius: "50%", flexShrink: 0,
                                display: "flex", alignItems: "center", justifyContent: "center",
                                fontSize: 10, fontWeight: 800,
                                background: clickato ? "#10b98130" : "var(--bg2)",
                                border: "1px solid " + (clickato ? "#10b98150" : "var(--border2)"),
                                color: clickato ? "#10b981" : "var(--muted)",
                              }}>
                                {clickato ? "\u2713" : ""}
                              </span>
                              {l.label}
                            </span>
                            <span style={{ color: "var(--muted)", fontSize: 14 }}>{"\u2197"}</span>
                          </a>
                        );
                      })}
                    </div>
                  )}

                  {f.sottocartelle && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {f.sottocartelle.map((sc, idx) => {
                        const subOpen = !!openSub[f.n + "-" + idx];
                        const scSbloccata = subSbloccata(f.n, idx);
                        const scCompletata = previewMode || idx < (subStep[f.n] || 0);
                        const scTuttiClickati = subTuttiClickati(f.n, idx, sc.links);
                        const isUltima = idx === f.sottocartelle.length - 1;

                        return (
                          <div key={f.n + "-" + idx} style={{
                            background: "var(--bg3)",
                            border: "1px solid var(--border2)",
                            borderRadius: 10, overflow: "hidden",
                            opacity: scSbloccata ? 1 : 0.55, transition: "opacity .2s",
                          }}>
                            <button onClick={() => toggleSub(f.n, idx)} disabled={!scSbloccata}
                              style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "11px 14px", background: "none", border: "none", cursor: scSbloccata ? "pointer" : "not-allowed", textAlign: "left", fontFamily: "inherit" }}>
                              <span style={{
                                width: 20, height: 20, borderRadius: "50%", flexShrink: 0,
                                display: "flex", alignItems: "center", justifyContent: "center",
                                fontSize: 10, fontWeight: 800,
                                background: scCompletata ? "#10b98120" : "var(--bg2)",
                                border: "1px solid " + (scCompletata ? "#10b98140" : "var(--border2)"),
                                color: scCompletata ? "#10b981" : "var(--muted)",
                              }}>
                                {scCompletata ? "\u2713" : idx + 1}
                              </span>
                              <span style={{ flex: 1, fontWeight: 700, fontSize: 13, color: scSbloccata ? "var(--text)" : "var(--border2)" }}>
                                {sc.titolo}
                                {!scSbloccata && <span style={{ display: "block", fontSize: 10.5, color: "var(--border2)", fontWeight: 500, marginTop: 1 }}>Completa la sottocartella precedente per sbloccare</span>}
                              </span>
                              {scSbloccata && (
                                <span style={{ color: "var(--muted)", fontSize: 14, transform: subOpen ? "rotate(90deg)" : "none", transition: "transform .2s" }}>{"\u203a"}</span>
                              )}
                            </button>
                            {subOpen && scSbloccata && (
                              <div style={{ padding: "0 14px 12px 14px" }}>
                                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: isUltima ? 0 : 8 }}>
                                  {sc.links.map((l, li) => {
                                    const clickato = previewMode || !!subLinkClickati[f.n + "-" + idx + "-" + li];
                                    return (
                                      <a key={li} href={l.url} target="_blank" rel="noopener noreferrer"
                                        onClick={() => segnaSubLinkClickato(f.n, idx, li)}
                                        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", background: "var(--bg2)", border: "1px solid var(--border2)", borderRadius: 10, color: "var(--a2)", fontSize: 13, fontWeight: 700, textDecoration: "none" }}>
                                        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                          <span style={{
                                            width: 16, height: 16, borderRadius: "50%", flexShrink: 0,
                                            display: "flex", alignItems: "center", justifyContent: "center",
                                            fontSize: 10, fontWeight: 800,
                                            background: clickato ? "#10b98130" : "var(--bg3)",
                                            border: "1px solid " + (clickato ? "#10b98150" : "var(--border2)"),
                                            color: clickato ? "#10b981" : "var(--muted)",
                                          }}>
                                            {clickato ? "\u2713" : ""}
                                          </span>
                                          {l.label}
                                        </span>
                                        <span style={{ color: "var(--muted)", fontSize: 14 }}>{"\u2197"}</span>
                                      </a>
                                    );
                                  })}
                                </div>

                                {!isUltima && !scCompletata && !previewMode && (
                                  <div style={{ marginTop: 6 }}>
                                    {!scTuttiClickati && (
                                      <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 8 }}>
                                        Apri tutti i link ({sc.links.filter((_, li) => subLinkClickati[f.n + "-" + idx + "-" + li]).length}/{sc.links.length}) per sbloccare la prossima
                                      </div>
                                    )}
                                    <button onClick={() => scTuttiClickati && completaSub(f.n, idx, f.sottocartelle.length)} disabled={!scTuttiClickati}
                                      style={{
                                        padding: "8px 16px",
                                        background: scTuttiClickati ? "linear-gradient(135deg,var(--a1),var(--a2))" : "var(--bg2)",
                                        color: scTuttiClickati ? "#fff" : "var(--border2)",
                                        border: "1px solid " + (scTuttiClickati ? "transparent" : "var(--border2)"),
                                        borderRadius: 10, cursor: scTuttiClickati ? "pointer" : "not-allowed",
                                        fontWeight: 800, fontSize: 12.5,
                                      }}>
                                      Fatto, sblocca la prossima
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {f.n === 1 && !completata && (
                    <div style={{ marginTop: 6 }}>
                      {!tuttiClickatiFase1 && (
                        <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 8 }}>
                          Apri tutti i link ({linksFase1.filter((_, i) => linkClickati[i]).length}/{linksFase1.length}) per sbloccare il resto
                        </div>
                      )}
                      <button onClick={completaStart} disabled={!tuttiClickatiFase1}
                        style={{
                          padding: "9px 18px",
                          background: tuttiClickatiFase1 ? "linear-gradient(135deg,var(--a1),var(--a2))" : "var(--bg3)",
                          color: tuttiClickatiFase1 ? "#fff" : "var(--border2)",
                          border: "1px solid " + (tuttiClickatiFase1 ? "transparent" : "var(--border2)"),
                          borderRadius: 10, cursor: tuttiClickatiFase1 ? "pointer" : "not-allowed",
                          fontWeight: 800, fontSize: 13,
                        }}>
                        Fatto, sblocca il resto
                      </button>
                    </div>
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