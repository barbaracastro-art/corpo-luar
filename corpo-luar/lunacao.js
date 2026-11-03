// ============================================================
// MOTOR DE LUNAÇÕES
// Substitui diasMes / nova / mesAtivo do código original.
// Calcula as luas novas verdadeiras (fórmula de Meeus), sem internet
// e para qualquer ano. Horários em UTC, dias no fuso do celular.
// ============================================================

const MES_SINODICO = 29.530588853;                       // dias
const LUA_NOVA_REF = Date.UTC(2000, 0, 6, 18, 14);       // 6/jan/2000 18:14 UTC
const DIA_MS = 86400000;

const DIAS_SEMANA = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

// ---------- Lua nova verdadeira (Jean Meeus, Astronomical Algorithms, cap. 49) ----------
// k = número da lunação (0 = lua nova de 6/jan/2000). Precisão: ~1 minuto.
const _cacheNova = {};
function luaNovaMs(k) {
  if (_cacheNova[k] !== undefined) return _cacheNova[k];
  const rad = Math.PI / 180;
  const T = k / 1236.85, T2 = T * T, T3 = T2 * T, T4 = T3 * T;
  let jde = 2451550.09766 + 29.530588861 * k + 0.00015437 * T2 - 0.00000015 * T3 + 0.00000000073 * T4;
  const E = 1 - 0.002516 * T - 0.0000074 * T2;
  const M  = (2.5534 + 29.1053567 * k - 0.0000014 * T2 - 0.00000011 * T3) * rad;
  const Mp = (201.5643 + 385.81693528 * k + 0.0107582 * T2 + 0.00001238 * T3 - 0.000000058 * T4) * rad;
  const F  = (160.7108 + 390.67050284 * k - 0.0016118 * T2 - 0.00000227 * T3 + 0.000000011 * T4) * rad;
  const O  = (124.7746 - 1.56375588 * k + 0.0020672 * T2 + 0.00000215 * T3) * rad;
  const s = Math.sin;
  jde += -0.40720 * s(Mp) + 0.17241 * E * s(M) + 0.01608 * s(2 * Mp) + 0.01039 * s(2 * F)
    + 0.00739 * E * s(Mp - M) - 0.00514 * E * s(Mp + M) + 0.00208 * E * E * s(2 * M)
    - 0.00111 * s(Mp - 2 * F) - 0.00057 * s(Mp + 2 * F) + 0.00056 * E * s(2 * Mp + M)
    - 0.00042 * s(3 * Mp) + 0.00042 * E * s(M + 2 * F) + 0.00038 * E * s(M - 2 * F)
    - 0.00024 * E * s(2 * Mp - M) - 0.00017 * s(O) - 0.00007 * s(Mp + 2 * M)
    + 0.00004 * s(2 * Mp - 2 * F) + 0.00004 * s(3 * M) + 0.00004 * s(Mp + M - 2 * F)
    + 0.00003 * s(2 * Mp + 2 * F) - 0.00003 * s(Mp + M + 2 * F) + 0.00003 * s(Mp - M + 2 * F)
    - 0.00002 * s(Mp - M - 2 * F) - 0.00002 * s(3 * Mp + M) + 0.00002 * s(4 * Mp);
  const deltaT = 69 / 86400; // TT -> UTC (aprox. anos 2020)
  const ms = (jde - deltaT - 2440587.5) * DIA_MS;
  _cacheNova[k] = ms;
  return ms;
}

// número da lunação que contém o instante
function numeroLunacao(ms) {
  let k = Math.floor(((ms - LUA_NOVA_REF) / DIA_MS) / MES_SINODICO);
  while (ms < luaNovaMs(k)) k--;
  while (ms >= luaNovaMs(k + 1)) k++;
  return k;
}

function inicioLunacao(n) {
  return luaNovaMs(n);
}

// fase de 0 a 1 (0 = nova, 0.5 = cheia), proporcional dentro da lunação real
function faseLunar(ms) {
  const k = numeroLunacao(ms);
  const a = luaNovaMs(k), b = luaNovaMs(k + 1);
  return (ms - a) / (b - a);
}

// meia-noite local do dia que contém o instante
function meiaNoite(ms) {
  const d = new Date(ms);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

// chave de data ISO local: "2026-11-03"
function chaveData(ms) {
  const d = new Date(ms);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${dia}`;
}

// Monta a lunação n: lista de dias civis entre uma lua nova e a próxima.
// O dia em que a lua nova acontece é o dia 1.
function montarLunacao(n) {
  const ini = inicioLunacao(n);
  const fim = inicioLunacao(n + 1);
  const dias = [];
  let t = meiaNoite(ini);
  const ultimo = meiaNoite(fim); // dia da próxima lua nova abre a lunação seguinte
  while (t < ultimo) {
    const d = new Date(t);
    const meioDia = t + DIA_MS / 2;
    dias.push({
      ms: t,
      chave: chaveData(t),
      dia: d.getDate(),
      mes: d.getMonth() + 1,
      semana: DIAS_SEMANA[d.getDay()],
      fase: faseLunar(meioDia),
    });
    // avança um dia civil (seguro com horário de verão)
    t = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).getTime();
  }
  return { n, inicio: ini, fim, dias };
}

function descreverLunacao(lun) {
  // mostra o primeiro e o último dia civil da lunação
  const a = new Date(lun.dias[0].ms);
  const b = new Date(lun.dias[lun.dias.length - 1].ms);
  const fmt = (d) => `${d.getDate()} ${MESES[d.getMonth()]}`;
  return `${fmt(a)} – ${fmt(b)} ${b.getFullYear()} · ${lun.dias.length} dias`;
}
