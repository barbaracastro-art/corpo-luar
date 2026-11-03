// ============================================================
// MODELO DE DADOS + ARMAZENAMENTO LOCAL
//
// Cada tópico tem:
//   - niveis:   gradação de INTENSIDADE (cor da célula, escolha única)
//   - simbolos: OBSERVAÇÕES específicas (vários por dia)
//
// Registro de um dia (chave = data real "2026-11-03"):
//   { nota: "texto", t: { <idTopico>: { n: <índice do nível>|null, s: ["ϟ","◎"] } } }
// ============================================================

const MAX_TOPICOS = 10;
const CHAVE_STORAGE = "corpo-luar-v1";

const CONFIG_PADRAO = {
  hemisferio: "sul",
  topicos: [
    {
      id: "menstruacao", nome: "Menstruação", especial: true,
      niveis: [
        { rotulo: "escape",  cor: "#f2b8c0" },
        { rotulo: "leve",    cor: "#e57a8a" },
        { rotulo: "médio",   cor: "#c8344e" },
        { rotulo: "intenso", cor: "#8c1230" },
      ],
      simbolos: [
        { simbolo: "ϟ", rotulo: "cólica" },
        { simbolo: "◎", rotulo: "dor nos seios" },
        { simbolo: "✱", rotulo: "dor de cabeça" },
        { simbolo: "∿", rotulo: "muco" },
      ],
    },
    {
      id: "digestao", nome: "Digestão",
      niveis: [
        { rotulo: "leve",        cor: "#a8d5a0" },
        { rotulo: "ok",          cor: "#e8d47a" },
        { rotulo: "estufada",    cor: "#e8a35c" },
        { rotulo: "desconforto", cor: "#a8683c" },
      ],
      simbolos: [
        { simbolo: "○", rotulo: "gases" },
        { simbolo: "▲", rotulo: "azia" },
        { simbolo: "■", rotulo: "intestino preso" },
        { simbolo: "≈", rotulo: "intestino solto" },
      ],
    },
    {
      id: "humor", nome: "Humor",
      niveis: [
        { rotulo: "energia baixa", cor: "#5d5a8c" },
        { rotulo: "média",         cor: "#8f86d6" },
        { rotulo: "alta",          cor: "#c9b8ff" },
      ],
      simbolos: [
        { simbolo: "☼", rotulo: "alegre" },
        { simbolo: "~", rotulo: "calma" },
        { simbolo: "✳", rotulo: "ansiosa" },
        { simbolo: "✕", rotulo: "irritada" },
        { simbolo: "♡", rotulo: "sensível" },
        { simbolo: "☾", rotulo: "introspectiva" },
      ],
    },
    {
      id: "exercicio", nome: "Exercício",
      niveis: [
        { rotulo: "leve",     cor: "#9fd8cf" },
        { rotulo: "moderado", cor: "#4fb3a5" },
        { rotulo: "intenso",  cor: "#1f7a6f" },
      ],
      simbolos: [
        { simbolo: "↗", rotulo: "caminhada" },
        { simbolo: "△", rotulo: "yoga" },
        { simbolo: "♪", rotulo: "dança" },
        { simbolo: "◆", rotulo: "força" },
      ],
    },
  ],
};

// Sugestões de símbolos para a tela de configuração
const SUGESTOES_SIMBOLOS = [
  "ϟ","◎","✱","∿","○","●","◐","◑","▲","▼","■","□","◆","◇","≈","~","✳","✕","✓","+",
  "♡","☼","☾","★","☆","♪","△","▽","↗","↘","∞","⊕","⊗","※","❀","✿","☁","☂","♨","◌",
];

// Paleta de cores sugeridas para intensidades
const PALETA = [
  "#f2b8c0","#e57a8a","#c8344e","#8c1230","#f4d35e","#e8a35c","#e2603f","#a8683c",
  "#a8d5a0","#4fb3a5","#1f7a6f","#8fc7e8","#4a8fd1","#c9b8ff","#8f86d6","#5d5a8c",
];

// ---------- armazenamento (com fallback em memória) ----------
const Armazem = (() => {
  let memoria = null;
  let disponivel = true;
  try {
    const k = "__teste__";
    window.localStorage.setItem(k, "1");
    window.localStorage.removeItem(k);
  } catch (e) {
    disponivel = false;
  }
  return {
    disponivel,
    ler() {
      if (!disponivel) return memoria;
      try { return window.localStorage.getItem(CHAVE_STORAGE); } catch (e) { return memoria; }
    },
    gravar(txt) {
      memoria = txt;
      if (!disponivel) return true;
      try { window.localStorage.setItem(CHAVE_STORAGE, txt); return true; } catch (e) { return false; }
    },
  };
})();

// pede ao navegador para não apagar os dados (PWA instalado)
if (navigator.storage && navigator.storage.persist) {
  navigator.storage.persist().catch(() => {});
}

const copiar = (o) => JSON.parse(JSON.stringify(o));

let banco = carregarBanco();
garantirMenstruacao(banco);

function carregarBanco() {
  const txt = Armazem.ler();
  if (txt) {
    try {
      const obj = JSON.parse(txt);
      if (obj && obj.registros) return migrar(obj);
    } catch (e) {}
  }
  return { versao: 2, config: copiar(CONFIG_PADRAO), registros: {} };
}

// Converte dados da versão 1 do protótipo (valor único por tópico)
function migrar(obj) {
  if (obj.versao === 2 && obj.config) return garantirMenstruacao(obj);
  const novo = { versao: 2, config: copiar(CONFIG_PADRAO), registros: {} };
  for (const [data, reg] of Object.entries(obj.registros || {})) {
    const r = { t: {} };
    if (reg.nota) r.nota = reg.nota;
    if (typeof reg.menstruacao === "number" && reg.menstruacao > 0) r.t.menstruacao = { n: reg.menstruacao - 1, s: [] };
    if (typeof reg.digestao === "number") r.t.digestao = { n: reg.digestao - 1, s: [] };
    if (typeof reg.humor === "string") r.t.humor = { n: null, s: [reg.humor] };
    novo.registros[data] = r;
  }
  return garantirMenstruacao(novo);
}

// O tópico de menstruação é especial: sempre existe e fica no anel externo,
// junto às luas. Nome, níveis e símbolos continuam editáveis.
function garantirMenstruacao(obj) {
  const l = obj.config.topicos;
  let m = l.find((t) => t.especial) || l.find((t) => t.id === "menstruacao");
  if (!m) {
    m = copiar(CONFIG_PADRAO.topicos.find((t) => t.especial));
    if (l.length >= MAX_TOPICOS) l.pop();
    l.push(m);
  }
  m.especial = true;
  ordenarTopicos(l);
  return obj;
}

// especial sempre por último na lista = anel mais externo
function ordenarTopicos(l) {
  const i = l.findIndex((t) => t.especial);
  if (i >= 0 && i !== l.length - 1) l.push(l.splice(i, 1)[0]);
  return l;
}

function topicoMenstruacao() { return topicos().find((t) => t.especial); }

// ---------- contagem do ciclo menstrual ----------
// Um dia marcado com "primeiro dia" vira o dia 1; os seguintes contam até a próxima marcação.
let _inicios = null;
function iniciosCiclo() {
  if (!_inicios) {
    _inicios = Object.keys(banco.registros).filter((k) => banco.registros[k].ciclo).sort();
  }
  return _inicios;
}

function diasEntre(chaveA, chaveB) {
  const [a1, a2, a3] = chaveA.split("-").map(Number);
  const [b1, b2, b3] = chaveB.split("-").map(Number);
  return Math.round((Date.UTC(b1, b2 - 1, b3) - Date.UTC(a1, a2 - 1, a3)) / DIA_MS);
}

// devolve o número do dia do ciclo, ou null se não houver início antes
function diaDoCiclo(chave) {
  const l = iniciosCiclo();
  let ini = null;
  for (let i = l.length - 1; i >= 0; i--) if (l[i] <= chave) { ini = l[i]; break; }
  return ini ? diasEntre(ini, chave) + 1 : null;
}

function ehInicioCiclo(chave) {
  const r = banco.registros[chave];
  return !!(r && r.ciclo);
}

function alternarInicioCiclo(chave) {
  const r = banco.registros[chave] || { t: {} };
  if (r.ciclo) delete r.ciclo; else r.ciclo = true;
  guardarDia(chave, r);
}

function salvarBanco() {
  _inicios = null; // recalcula a contagem do ciclo
  return Armazem.gravar(JSON.stringify(banco));
}

function topicos() { return banco.config.topicos; }
function hemisferioSul() { return banco.config.hemisferio !== "norte"; }

function lerDia(chave) {
  return banco.registros[chave] || { t: {} };
}

function lerTopicoDia(chave, idTopico) {
  const r = banco.registros[chave];
  return (r && r.t && r.t[idTopico]) || { n: null, s: [] };
}

function gravarTopicoDia(chave, idTopico, valor) {
  const r = banco.registros[chave] || { t: {} };
  if (!r.t) r.t = {};
  if (valor.n === null && (!valor.s || !valor.s.length)) delete r.t[idTopico];
  else r.t[idTopico] = valor;
  guardarDia(chave, r);
}

function definirNivel(chave, idTopico, indice) {
  const v = copiar(lerTopicoDia(chave, idTopico));
  v.n = v.n === indice ? null : indice;      // tocar de novo desmarca
  gravarTopicoDia(chave, idTopico, v);
}

function alternarSimbolo(chave, idTopico, simbolo) {
  const v = copiar(lerTopicoDia(chave, idTopico));
  v.s = v.s || [];
  const i = v.s.indexOf(simbolo);
  if (i >= 0) v.s.splice(i, 1); else v.s.push(simbolo);
  gravarTopicoDia(chave, idTopico, v);
}

function definirNota(chave, texto) {
  const r = banco.registros[chave] || { t: {} };
  if (texto) r.nota = texto; else delete r.nota;
  guardarDia(chave, r);
}

function guardarDia(chave, r) {
  const vazio = (!r.t || !Object.keys(r.t).length) && !r.nota && !r.ciclo;
  if (vazio) delete banco.registros[chave];
  else banco.registros[chave] = r;
  salvarBanco();
}

function limparDia(chave) {
  delete banco.registros[chave];
  salvarBanco();
}

function salvarConfig(novaConfig) {
  banco.config = copiar(novaConfig);
  garantirMenstruacao(banco);
  salvarBanco();
}

function novoIdTopico(nome) {
  const base = (nome || "topico").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "topico";
  return `${base}-${Math.random().toString(36).slice(2, 7)}`;
}

// ---------- backup ----------
function exportarJSON() {
  const blob = new Blob([JSON.stringify(banco, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `corpo-luar-${chaveData(Date.now())}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// O arquivo importado substitui a configuração e mescla os dias
function importarJSON(texto) {
  const obj = migrar(JSON.parse(texto));
  if (!obj || typeof obj.registros !== "object") throw new Error("Arquivo sem registros");
  if (obj.config && Array.isArray(obj.config.topicos)) banco.config = obj.config;
  garantirMenstruacao(banco);
  for (const [k, v] of Object.entries(obj.registros)) banco.registros[k] = v;
  salvarBanco();
}
