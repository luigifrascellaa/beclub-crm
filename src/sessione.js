// ══════════════════════════════════════════════════════════════
// sessione.js — coordinatore del rinnovo del token di accesso.
//
// Il progetto ha TRE copie di sbFetch (App.jsx, ListaNomi.jsx, Profilo.jsx). Quando una
// chiamata scopre che il token e' scaduto deve poterlo rinnovare e riprovare, e le tre
// copie devono farlo passando da un punto unico: questo modulo. App.jsx registra COME si
// rinnova (e' l'unica che conosce la sessione); gli sbFetch chiedono solo "rinnovala".
//
// Sta in un file suo perche' shared.jsx, per sua regola, non contiene state.
// ══════════════════════════════════════════════════════════════

let gestore = null;
let inCorso = null;

export function registraRinnovo(fn) { gestore = fn; }

// Un solo rinnovo alla volta per scheda. Se tre chiamate scoprono insieme il token
// scaduto, aspettano tutte lo STESSO rinnovo: tre rinnovi paralleli userebbero lo stesso
// refresh token, che Supabase accetta una volta sola, e gli altri due fallirebbero.
// Risolve col token nuovo, oppure con null se la sessione non e' rinnovabile (salvata
// prima di settembre 2026, senza refresh token). Rigetta se il rinnovo fallisce.
export function rinnovaSessione() {
  if (!gestore) return Promise.resolve(null);
  if (!inCorso) inCorso = Promise.resolve().then(gestore).finally(() => { inCorso = null; });
  return inCorso;
}

// Token scaduto o non valido: e' cosi' che PostgREST risponde a un JWT scaduto.
export function eTokenScaduto(status, msg) {
  const m = (msg || "").toLowerCase();
  return status === 401 || m.includes("jwt expired") || m.includes("invalid jwt");
}

// Errore di RETE (fetch non ha proprio raggiunto il server), da distinguere da un rinnovo
// rifiutato. Al risveglio del Mac il wifi puo' non essere ancora collegato: li' si deve
// solo riprovare, non buttare fuori nessuno.
export function eErroreRete(errore) {
  return errore instanceof TypeError;
}