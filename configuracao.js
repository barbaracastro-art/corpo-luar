// ============================================================
// TELA DE CONFIGURAÇÃO: tópicos (até 10), intensidades, símbolos,
// hemisfério e backup. Edita um rascunho; só grava ao tocar "Salvar".
// ============================================================

let rascunho = null;
const abertos = new Set();   // tópicos expandidos

function abrirConfig() {
  rascunho = copiar(banco.config);
  abertos.clear();
  renderConfig();
  document.querySelectorAll('input[name="hemisferio"]').forEach((r) => {
    r.checked = r.value === (rascunho.hemisferio || "sul");
  });
  atualizarInfoArmazenamento();
  $("config").hidden = false;
  $("config").scrollTop = 0;
}

function fecharConfig() {
  $("config").hidden = true;
  fecharSeletor();
  rascunho = null;
}

function salvarConfigTela() {
  rascunho.topicos.forEach((t) => {
    t.nome = (t.nome || "").trim() || "Sem nome";
    t.niveis = t.niveis.map((n) => ({ rotulo: (n.rotulo || "").trim() || "nível", cor: n.cor }));
    t.simbolos = t.simbolos
      .filter((s) => (s.simbolo || "").trim())
      .map((s) => ({ simbolo: s.simbolo.trim(), rotulo: (s.rotulo || "").trim() || s.simbolo.trim() }));
  });
  salvarConfig(rascunho);
  fecharConfig();
  montarLegenda();
  redraw();
  mostrarAviso("Configuração salva.");
}

function atualizarInfoArmazenamento() {
  const dias = Object.keys(banco.registros).length;
  const kb = (JSON.stringify(banco).length / 1024).toFixed(1);
  $("infoArmazenamento").textContent = Armazem.disponivel
    ? `${dias} ${dias === 1 ? "dia registrado" : "dias registrados"} · ${kb} KB neste aparelho.`
    : "Atenção: este ambiente não permite salvar no aparelho.";
}

// ---------- lista de tópicos ----------
function renderConfig() {
  const box = $("listaTopicos");
  box.innerHTML = "";
  const lista = rascunho.topicos;

  lista.forEach((t, i) => {
    const det = document.createElement("details");
    det.className = "cfg-topico";
    det.open = abertos.has(t.id);
    det.addEventListener("toggle", () => { det.open ? abertos.add(t.id) : abertos.delete(t.id); });

    const amostras = t.niveis.map((n) => `<i style="background:${n.cor}"></i>`).join("");
    const simbs = t.simbolos.map((s) => esc(s.simbolo)).join(" ");
    det.innerHTML = `
      <summary>
        <span class="legenda-num">${t.especial ? "◯" : i + 1}</span>
        <span class="cfg-nome">${esc(t.nome || "Sem nome")}</span>
        <span class="amostras">${amostras}</span>
        <span class="cfg-simbs">${simbs}</span>
      </summary>
      <div class="cfg-conteudo">
        <label class="campo"><span>Nome</span><input class="in-nome" type="text" maxlength="30" value="${esc(t.nome)}"></label>

        <p class="sub-rotulo">Intensidade (cor da célula)</p>
        <div class="cfg-niveis"></div>
        <button type="button" class="bt-texto add-nivel">+ Adicionar nível</button>

        <p class="sub-rotulo">Observações (símbolos)</p>
        <div class="cfg-simbolos"></div>
        <button type="button" class="bt-texto add-simbolo">+ Adicionar símbolo</button>

        ${t.especial ? `<p class="explica fraca">Anel fixo externo, junto às luas. Marque o primeiro dia da menstruação no registro do dia para contar o ciclo.</p>` : `
        <div class="cfg-acoes">
          <button type="button" class="bt-sec bt-peq subir" ${i === 0 ? "disabled" : ""} aria-label="Mover para dentro">↑ Dentro</button>
          <button type="button" class="bt-sec bt-peq descer" ${i >= lista.length - 1 || (lista[i + 1] && lista[i + 1].especial) ? "disabled" : ""} aria-label="Mover para fora">↓ Fora</button>
          <button type="button" class="bt-perigo bt-peq excluir">Excluir</button>
        </div>`}
      </div>`;

    det.querySelector(".in-nome").addEventListener("input", (e) => {
      t.nome = e.target.value;
      det.querySelector(".cfg-nome").textContent = t.nome || "Sem nome";
    });

    // níveis
    const nBox = det.querySelector(".cfg-niveis");
    t.niveis.forEach((n, ni) => {
      const linha = document.createElement("div");
      linha.className = "cfg-linha";
      linha.innerHTML = `
        <button type="button" class="amostra-cor" style="background:${n.cor}" aria-label="Escolher cor"></button>
        <input type="text" maxlength="20" value="${esc(n.rotulo)}" aria-label="Nome do nível">
        <button type="button" class="bt-x" aria-label="Remover nível">×</button>`;
      linha.querySelector(".amostra-cor").addEventListener("click", () =>
        escolherCor(n.cor, (cor) => { n.cor = cor; renderConfig(); }));
      linha.querySelector("input").addEventListener("input", (e) => { n.rotulo = e.target.value; });
      linha.querySelector(".bt-x").addEventListener("click", () => { t.niveis.splice(ni, 1); renderConfig(); });
      nBox.appendChild(linha);
    });
    det.querySelector(".add-nivel").addEventListener("click", () => {
      if (t.niveis.length >= 8) return mostrarAviso("Até 8 níveis por tópico.");
      t.niveis.push({ rotulo: "", cor: PALETA[(t.niveis.length * 3 + i * 5) % PALETA.length] });
      renderConfig();
      focarUltimo(t.id, ".cfg-niveis");
    });

    // símbolos
    const sBox = det.querySelector(".cfg-simbolos");
    t.simbolos.forEach((s, si) => {
      const linha = document.createElement("div");
      linha.className = "cfg-linha";
      linha.innerHTML = `
        <button type="button" class="amostra-simb" aria-label="Escolher símbolo">${esc(s.simbolo || "?")}</button>
        <input type="text" maxlength="24" value="${esc(s.rotulo)}" placeholder="ex.: cólica" aria-label="Significado do símbolo">
        <button type="button" class="bt-x" aria-label="Remover símbolo">×</button>`;
      linha.querySelector(".amostra-simb").addEventListener("click", () =>
        escolherSimbolo(s.simbolo, t, (g) => { s.simbolo = g; renderConfig(); }));
      linha.querySelector("input").addEventListener("input", (e) => { s.rotulo = e.target.value; });
      linha.querySelector(".bt-x").addEventListener("click", () => { t.simbolos.splice(si, 1); renderConfig(); });
      sBox.appendChild(linha);
    });
    det.querySelector(".add-simbolo").addEventListener("click", () => {
      if (t.simbolos.length >= 12) return mostrarAviso("Até 12 símbolos por tópico.");
      const usados = t.simbolos.map((s) => s.simbolo);
      const livre = SUGESTOES_SIMBOLOS.find((g) => !usados.includes(g)) || "•";
      t.simbolos.push({ simbolo: livre, rotulo: "" });
      renderConfig();
      focarUltimo(t.id, ".cfg-simbolos");
    });

    // ordem e exclusão
    const bx = det.querySelector(".excluir");
    if (bx) {
    det.querySelector(".subir").addEventListener("click", () => { mover(i, -1); });
    det.querySelector(".descer").addEventListener("click", () => { mover(i, 1); });
    bx.addEventListener("click", () => {
      if (bx.dataset.armado) {
        lista.splice(i, 1);
        abertos.delete(t.id);
        renderConfig();
      } else {
        bx.dataset.armado = "1";
        bx.textContent = "Toque de novo para excluir";
        setTimeout(() => { if (bx.isConnected) { delete bx.dataset.armado; bx.textContent = "Excluir"; } }, 3000);
      }
    });
    }

    det.dataset.id = t.id;
    box.appendChild(det);
  });

  $("btNovoTopico").disabled = lista.length >= MAX_TOPICOS;
  $("btNovoTopico").textContent = lista.length >= MAX_TOPICOS
    ? `Limite de ${MAX_TOPICOS} tópicos`
    : `+ Novo tópico (${lista.length}/${MAX_TOPICOS})`;
}

function mover(i, delta) {
  const l = rascunho.topicos;
  const j = i + delta;
  if (j < 0 || j >= l.length || l[j].especial) return;
  [l[i], l[j]] = [l[j], l[i]];
  renderConfig();
}

function focarUltimo(id, sel) {
  const det = document.querySelector(`.cfg-topico[data-id="${id}"]`);
  if (!det) return;
  const ins = det.querySelectorAll(`${sel} input`);
  if (ins.length) ins[ins.length - 1].focus();
}

function novoTopico() {
  if (rascunho.topicos.length >= MAX_TOPICOS) return;
  const t = {
    id: novoIdTopico("topico"),
    nome: "",
    niveis: [
      { rotulo: "pouco", cor: "#8fc7e8" },
      { rotulo: "médio", cor: "#4a8fd1" },
      { rotulo: "muito", cor: "#5d5a8c" },
    ],
    simbolos: [],
  };
  rascunho.topicos.push(t);
  ordenarTopicos(rascunho.topicos);
  abertos.add(t.id);
  renderConfig();
  const det = document.querySelector(`.cfg-topico[data-id="${t.id}"]`);
  if (det) { det.scrollIntoView({ block: "center" }); det.querySelector(".in-nome").focus(); }
}

// ---------- seletor de cor / símbolo ----------
function abrirSeletor(titulo) {
  $("seletorTitulo").textContent = titulo;
  $("seletorGrade").innerHTML = "";
  $("seletorExtra").innerHTML = "";
  $("seletor").hidden = false;
}
function fecharSeletor() { $("seletor").hidden = true; }

function escolherCor(atual, aoEscolher) {
  abrirSeletor("Cor da intensidade");
  PALETA.forEach((c) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "sel-cor" + (c === atual ? " ativa" : "");
    b.style.background = c;
    b.setAttribute("aria-label", c);
    b.addEventListener("click", () => { fecharSeletor(); aoEscolher(c); });
    $("seletorGrade").appendChild(b);
  });
  $("seletorExtra").innerHTML = `<label class="campo linha"><span>Outra cor</span><input type="color" value="${atual}"></label>`;
  $("seletorExtra").querySelector("input").addEventListener("change", (e) => { fecharSeletor(); aoEscolher(e.target.value); });
}

function escolherSimbolo(atual, topico, aoEscolher) {
  abrirSeletor("Símbolo da observação");
  const usados = topico.simbolos.map((s) => s.simbolo);
  SUGESTOES_SIMBOLOS.forEach((g) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "sel-simb" + (g === atual ? " ativa" : "") + (usados.includes(g) && g !== atual ? " usado" : "");
    b.textContent = g;
    b.addEventListener("click", () => { fecharSeletor(); aoEscolher(g); });
    $("seletorGrade").appendChild(b);
  });
  $("seletorExtra").innerHTML = `
    <label class="campo linha"><span>Ou digite (letra, emoji…)</span>
      <input type="text" maxlength="2" value="" placeholder="${esc(atual || "")}">
      <button type="button" class="bt-pri bt-peq">Usar</button></label>`;
  const inp = $("seletorExtra").querySelector("input");
  $("seletorExtra").querySelector("button").addEventListener("click", () => {
    const g = inp.value.trim();
    if (g) { fecharSeletor(); aoEscolher(g); }
  });
}

// ---------- ligações ----------
$("btConfig").addEventListener("click", abrirConfig);
$("btConfigCancelar").addEventListener("click", fecharConfig);
$("btConfigSalvar").addEventListener("click", salvarConfigTela);
$("btNovoTopico").addEventListener("click", novoTopico);
document.querySelector(".seletor-fundo").addEventListener("click", fecharSeletor);
document.querySelectorAll('input[name="hemisferio"]').forEach((r) =>
  r.addEventListener("change", () => { if (rascunho) rascunho.hemisferio = r.value; }));

$("btExportar").addEventListener("click", () => exportarJSON());
$("inImportar").addEventListener("change", async (e) => {
  const arq = e.target.files[0];
  if (!arq) return;
  try {
    importarJSON(await arq.text());
    rascunho = copiar(banco.config);
    renderConfig();
    atualizarInfoArmazenamento();
    montarLegenda();
    redraw();
    mostrarAviso("Dados importados.");
  } catch (err) {
    mostrarAviso("Não consegui ler esse arquivo.");
  }
  e.target.value = "";
});
