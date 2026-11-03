// ============================================================
// CORPO LUAR (p5.js) — evolução do código original escrito por Barbara Castro
// Dia 1 (lua nova) no topo, dias no sentido horário.
// De dentro para fora: centro · anéis dos tópicos · luas · datas.
// ============================================================

let lunAtual = montarLunacao(numeroLunacao(Date.now()));
let diaSelecionado = -1;          // índice do dia aberto no painel

const COR = {
  fundo: "#141218",
  vazio: "#221e28",
  linha: "#3b3442",
  texto: "#cfc6d8",
  textoFraco: "#7d7388",
  lua: "#f3eee6",
  sombra: "#2a2531",
  hoje: "#f3eee6",
  sel: "#c9b8ff",
  ciclo: "#c8344e",
};

// geometria recalculada a cada desenho
let G = {};

function calcularGeometria() {
  const R = Math.min(width, height) / 2 * 0.97;
  const centro = R * 0.2;
  const fimAneis = R * 0.635;           // fim dos anéis (o último é o da menstruação)
  const nT = Math.max(1, topicos().length);
  G = {
    cx: width / 2,
    cy: height / 2,
    R,
    centro,
    fimAneis,
    larguraAnel: (fimAneis - centro) / nT,
    raioCiclo: R * 0.672,                // faixa com o dia do ciclo menstrual
    raioLua: R * 0.775,
    raioNumero: R * 0.885,
    raioSemana: R * 0.955,
    passo: TWO_PI / lunAtual.dias.length,
  };
  // tamanho da lua limitado pelo espaço de cada fatia
  const arco = G.raioLua * G.passo;
  G.tamLua = Math.min(R * 0.095, arco * 0.78);
}

// ângulo inicial do dia i (topo = -90°)
function anguloDia(i) {
  return -HALF_PI + i * G.passo;
}

function setup() {
  const palco = document.getElementById("palco");
  const c = createCanvas(palco.clientWidth, palco.clientHeight);
  c.parent(palco);
  pixelDensity(Math.min(window.devicePixelRatio || 1, 2));
  textFont("sans-serif");
  noLoop(); // só redesenha quando algo muda (economiza bateria)
  instalarToque(c.elt);
  if (window.aoIniciarSketch) window.aoIniciarSketch();
}

function windowResized() {
  const palco = document.getElementById("palco");
  resizeCanvas(palco.clientWidth, palco.clientHeight);
  redraw();
}

function draw() {
  background(COR.fundo);
  calcularGeometria();
  const dias = lunAtual.dias;
  const chaveHoje = chaveData(Date.now());

  push();
  translate(G.cx, G.cy);

  // ---------- anéis dos tópicos ----------
  // cor = intensidade (nível) · símbolos = observações
  strokeCap(SQUARE);
  noFill();
  const lista = topicos();
  const folga = Math.min(0.012, G.passo * 0.08); // pequeno respiro entre dias
  for (let i = 0; i < dias.length; i++) {
    const a1 = anguloDia(i) + folga;
    const a2 = anguloDia(i + 1) - folga;
    const am = (a1 + a2) / 2;
    for (let t = 0; t < lista.length; t++) {
      const top = lista[t];
      const v = lerTopicoDia(dias[i].chave, top.id);
      const nivel = v.n !== null && v.n !== undefined ? top.niveis[v.n] : null;
      const rMeio = G.centro + G.larguraAnel * (t + 0.5);
      stroke(nivel ? nivel.cor : COR.vazio);
      strokeWeight(Math.max(1, G.larguraAnel - 2));
      arc(0, 0, rMeio * 2, rMeio * 2, a1, a2);
      if (v.s && v.s.length) desenharSimbolos(v.s, rMeio, am, nivel);
    }
  }

  // ---------- dia do ciclo menstrual (entre o anel externo e as luas) ----------
  noFill();
  stroke(COR.linha);
  strokeWeight(0.75);
  circle(0, 0, G.fimAneis * 2 + 2);
  const tamCiclo = Math.max(7.5, Math.min(11, G.R * 0.043, G.raioCiclo * G.passo * 0.55));
  for (let i = 0; i < dias.length; i++) {
    const n = diaDoCiclo(dias[i].chave);
    if (n === null) continue;
    const am = anguloDia(i) + G.passo / 2;
    const x = Math.cos(am) * G.raioCiclo, y = Math.sin(am) * G.raioCiclo;
    const futuro = dias[i].chave > chaveHoje;
    if (n === 1) {
      noStroke();
      fill(COR.ciclo);
      circle(x, y, tamCiclo * 1.9);
    }
    rotuloTangencial(String(n), am, G.raioCiclo, tamCiclo,
      n === 1 ? "#ffffff" : futuro ? COR.textoFraco : "#f0b3bd", n === 1 ? BOLD : NORMAL);
  }

  // ---------- linhas divisórias ----------
  for (let i = 0; i < dias.length; i++) {
    const a = anguloDia(i);
    if (i === 0) { stroke(COR.lua); strokeWeight(1.5); }
    else { stroke(COR.linha); strokeWeight(0.75); }
    line(Math.cos(a) * G.centro, Math.sin(a) * G.centro,
         Math.cos(a) * G.R, Math.sin(a) * G.R);
  }

  // ---------- luas e datas ----------
  for (let i = 0; i < dias.length; i++) {
    const d = dias[i];
    const am = anguloDia(i) + G.passo / 2;
    const ehHoje = d.chave === chaveHoje;
    const ehSel = i === diaSelecionado;

    // destaque de hoje / selecionado: contorno da fatia
    if (ehHoje || ehSel) {
      noFill();
      stroke(ehSel ? COR.sel : COR.hoje);
      strokeWeight(ehSel ? 2 : 1.25);
      const a1 = anguloDia(i), a2 = anguloDia(i + 1);
      arc(0, 0, G.centro * 2, G.centro * 2, a1, a2);
      arc(0, 0, G.R * 2, G.R * 2, a1, a2);
      line(Math.cos(a1) * G.centro, Math.sin(a1) * G.centro, Math.cos(a1) * G.R, Math.sin(a1) * G.R);
      line(Math.cos(a2) * G.centro, Math.sin(a2) * G.centro, Math.cos(a2) * G.R, Math.sin(a2) * G.R);
    }

    // lua (sempre "em pé", para a fase ser lida corretamente)
    desenharLua(Math.cos(am) * G.raioLua, Math.sin(am) * G.raioLua, G.tamLua / 2, d.fase);

    // datas tangenciais; metade de baixo é girada para ficar legível
    rotuloTangencial(String(d.dia), am, G.raioNumero,
      Math.max(9, Math.min(13, G.R * 0.05)), ehHoje ? COR.hoje : COR.texto, ehHoje ? BOLD : NORMAL);
    rotuloTangencial(d.semana, am, G.raioSemana,
      Math.max(7.5, Math.min(10.5, G.R * 0.038)), COR.textoFraco, NORMAL);
  }

  // ---------- centro ----------
  noStroke();
  fill(COR.fundo);
  circle(0, 0, G.centro * 2 - 2);
  const idxHoje = dias.findIndex((d) => d.chave === chaveHoje);
  textAlign(CENTER, CENTER);
  if (idxHoje >= 0) {
    fill(COR.textoFraco);
    textSize(G.centro * 0.22);
    text("dia", 0, -G.centro * 0.28);
    fill(COR.hoje);
    textStyle(BOLD);
    textSize(G.centro * 0.55);
    text(idxHoje + 1, 0, G.centro * 0.06);
    textStyle(NORMAL);
    const nc = diaDoCiclo(chaveHoje);
    if (nc !== null) {
      fill("#f0b3bd");
      textSize(G.centro * 0.2);
      text(`ciclo ${nc}`, 0, G.centro * 0.5);
    }
  } else {
    desenharLua(0, 0, G.centro * 0.35, 0.5);
  }
  pop();
}

// escreve os símbolos dentro da célula; se não couberem, mostra o primeiro + "+"
function desenharSimbolos(simbolos, rMeio, ang, nivel) {
  const larguraArco = rMeio * G.passo * 0.9;
  const alturaAnel = G.larguraAnel * 0.9;
  let txt = simbolos.join("");
  let tam = Math.min(alturaAnel * 0.75, larguraArco / (simbolos.length * 0.75));
  if (tam < 6.5) { txt = simbolos[0] + "+"; tam = Math.min(alturaAnel * 0.7, larguraArco / 1.6); }
  push();
  translate(Math.cos(ang) * rMeio, Math.sin(ang) * rMeio);
  const a = ((ang % TWO_PI) + TWO_PI) % TWO_PI;
  rotate(ang + (a > 0.05 && a < PI - 0.05 ? -HALF_PI : HALF_PI));
  noStroke();
  fill(nivel ? corContraste(nivel.cor) : COR.texto);
  textAlign(CENTER, CENTER);
  textSize(Math.max(5, tam));
  text(txt, 0, 0);
  pop();
}

function corContraste(hex) {
  const c = color(hex);
  const lum = (0.299 * red(c) + 0.587 * green(c) + 0.114 * blue(c)) / 255;
  return lum > 0.55 ? "#141218" : "#f6f1ea";
}

function rotuloTangencial(txt, ang, raio, tam, cor, estilo) {
  push();
  translate(Math.cos(ang) * raio, Math.sin(ang) * raio);
  // embaixo (ângulo entre 0 e PI na tela) o texto fica de ponta-cabeça: corrige
  const a = ((ang % TWO_PI) + TWO_PI) % TWO_PI;
  const embaixo = a > 0.05 && a < PI - 0.05;
  rotate(ang + (embaixo ? -HALF_PI : HALF_PI));
  noStroke();
  fill(cor);
  textStyle(estilo);
  textAlign(CENTER, CENTER);
  textSize(tam);
  text(txt, 0, 0);
  pop();
}

// Fase desenhada com arcos e uma elipse no terminador (sem máscara de pixels).
// fase: 0 nova · 0.25 crescente · 0.5 cheia · 0.75 minguante
function desenharLua(x, y, r, fase) {
  push();
  translate(x, y);
  if (hemisferioSul()) scale(-1, 1); // sul: crescente iluminada à esquerda
  noStroke();
  fill(COR.sombra);
  circle(0, 0, r * 2);
  const larg = Math.abs(Math.cos(fase * TWO_PI)) * r * 2;
  fill(COR.lua);
  if (fase < 0.5) {
    arc(0, 0, r * 2, r * 2, -HALF_PI, HALF_PI, PIE);       // metade direita acesa
    fill(fase < 0.25 ? COR.sombra : COR.lua);
  } else {
    arc(0, 0, r * 2, r * 2, HALF_PI, PI + HALF_PI, PIE);   // metade esquerda acesa
    fill(fase < 0.75 ? COR.lua : COR.sombra);
  }
  ellipse(0, 0, larg, r * 2);
  noFill();
  stroke(255, 40);
  strokeWeight(0.75);
  circle(0, 0, r * 2);
  pop();
}

// ============================================================
// INTERAÇÃO: coordenadas polares → (dia, tópico)
// ============================================================
function acertar(px, py) {
  const dx = px - G.cx, dy = py - G.cy;
  const r = Math.sqrt(dx * dx + dy * dy);
  if (r < G.centro || r > G.R) return null;
  let a = Math.atan2(dy, dx) + HALF_PI;      // 0 = topo
  a = ((a % TWO_PI) + TWO_PI) % TWO_PI;
  const dia = Math.floor(a / G.passo);
  let topico = -1;
  if (r < G.fimAneis) topico = Math.floor((r - G.centro) / G.larguraAnel);
  return { dia, topico };
}

// toque: diferencia "tocar" de "deslizar" (troca de lunação)
function instalarToque(el) {
  let ini = null;
  el.style.touchAction = "none";
  el.addEventListener("pointerdown", (e) => {
    ini = { x: e.offsetX, y: e.offsetY, t: Date.now() };
  });
  el.addEventListener("pointerup", (e) => {
    if (!ini) return;
    const dx = e.offsetX - ini.x, dy = e.offsetY - ini.y;
    const dist = Math.hypot(dx, dy);
    if (dist > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      mudarLunacao(dx < 0 ? 1 : -1);
    } else if (dist < 12) {
      const h = acertar(ini.x, ini.y);
      if (h && window.abrirPainel) window.abrirPainel(h.dia, h.topico);
    }
    ini = null;
  });
  el.addEventListener("pointercancel", () => { ini = null; });
}

function mudarLunacao(delta) {
  lunAtual = montarLunacao(lunAtual.n + delta);
  diaSelecionado = -1;
  if (window.atualizarCabecalho) window.atualizarCabecalho();
  redraw();
}

function irParaHoje() {
  lunAtual = montarLunacao(numeroLunacao(Date.now()));
  diaSelecionado = -1;
  if (window.atualizarCabecalho) window.atualizarCabecalho();
  redraw();
}
