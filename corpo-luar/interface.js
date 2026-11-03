// ============================================================
// INTERFACE: cabeçalho, legenda e painel de registro do dia
// ============================================================

const $ = (id) => document.getElementById(id);
const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

window.atualizarCabecalho = function () {
  const hoje = numeroLunacao(Date.now());
  const rel = lunAtual.n - hoje;
  $("tituloLunacao").textContent =
    rel === 0 ? "Lunação atual"
    : rel < 0 ? `${-rel} ${rel === -1 ? "lunação atrás" : "lunações atrás"}`
    : `Daqui a ${rel} ${rel === 1 ? "lunação" : "lunações"}`;
  $("subtituloLunacao").textContent = descreverLunacao(lunAtual);
};

function montarLegenda() {
  const box = $("legenda");
  box.innerHTML = "";
  topicos().forEach((t, i) => {
    const item = document.createElement("div");
    item.className = "legenda-item";
    const amostras = t.niveis.map((n) => `<i style="background:${n.cor}"></i>`).join("");
    item.innerHTML = `<span class="legenda-num">${i + 1}</span><span>${esc(t.nome)}${t.especial ? " · externo" : ""}</span><span class="amostras">${amostras}</span>`;
    box.appendChild(item);
  });
  if (!topicos().length) {
    box.innerHTML = `<p class="dica">Nenhum tópico ainda. Toque em “Tópicos e dados” para criar.</p>`;
    return;
  }
  const dica = document.createElement("p");
  dica.className = "dica";
  dica.textContent = "Anéis de dentro para fora; os números rosados são o dia do ciclo. Toque num dia para registrar; deslize para trocar de lunação.";
  box.appendChild(dica);
}

// ---------- painel do dia ----------
let chaveAberta = null;

window.abrirPainel = function (idxDia, idxTopico) {
  const d = lunAtual.dias[idxDia];
  if (!d) return;
  chaveAberta = d.chave;
  diaSelecionado = idxDia;
  $("painelTitulo").textContent = `${d.semana}, ${d.dia} ${MESES[d.mes - 1]}`;
  atualizarSubtitulo(idxDia);
  renderizarTopicos(idxTopico);
  $("painelNota").value = lerDia(chaveAberta).nota || "";
  $("painel").hidden = false;
  redraw();
  const t = topicos()[idxTopico];
  if (t) {
    const alvo = document.querySelector(`[data-topico="${t.id}"]`);
    if (alvo) alvo.scrollIntoView({ block: "nearest" });
  }
};

function atualizarSubtitulo(idxDia) {
  const d = lunAtual.dias[idxDia];
  const nc = diaDoCiclo(d.chave);
  $("painelSub").textContent = `Dia ${idxDia + 1} da lunação` +
    (nc !== null ? ` · dia ${nc} do ciclo` : "") + ` · ${nomeFase(d.fase)}`;
}

function fecharPainel() {
  if (chaveAberta) definirNota(chaveAberta, $("painelNota").value.trim());
  $("painel").hidden = true;
  chaveAberta = null;
  diaSelecionado = -1;
  redraw();
}

function renderizarTopicos(foco) {
  const box = $("painelTopicos");
  box.innerHTML = "";
  if (!topicos().length) {
    box.innerHTML = `<p class="explica">Crie seus tópicos em “Tópicos e dados”.</p>`;
    return;
  }
  const ordemPainel = topicos().map((t, i) => [t, i]).sort((a, b) => (b[0].especial ? 1 : 0) - (a[0].especial ? 1 : 0));
  ordemPainel.forEach(([t, i]) => {
    const v = lerTopicoDia(chaveAberta, t.id);
    const grupo = document.createElement("fieldset");
    grupo.className = "topico" + (i === foco ? " foco" : "");
    grupo.dataset.topico = t.id;
    grupo.innerHTML = `<legend>${esc(t.nome)}</legend>`;

    if (t.especial) {
      const inicio = ehInicioCiclo(chaveAberta);
      const caixa = document.createElement("label");
      caixa.className = "caixa-ciclo" + (inicio ? " ativa" : "");
      caixa.innerHTML = `<input type="checkbox" ${inicio ? "checked" : ""}>
        <span><b>Primeiro dia da menstruação</b><small>Começa a contagem do ciclo (dia 1)</small></span>`;
      caixa.querySelector("input").addEventListener("change", () => {
        alternarInicioCiclo(chaveAberta);
        renderizarTopicos(i);
        atualizarSubtitulo(diaSelecionado);
        redraw();
      });
      grupo.appendChild(caixa);
    }

    if (t.niveis.length) {
      const rot = document.createElement("p");
      rot.className = "sub-rotulo";
      rot.textContent = "Intensidade";
      grupo.appendChild(rot);
      const linha = document.createElement("div");
      linha.className = "opcoes";
      t.niveis.forEach((n, idx) => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "opcao" + (v.n === idx ? " ativa" : "");
        b.style.setProperty("--cor", n.cor);
        b.setAttribute("aria-pressed", v.n === idx);
        b.innerHTML = `<span class="chip"></span><small>${esc(n.rotulo)}</small>`;
        b.addEventListener("click", () => {
          definirNivel(chaveAberta, t.id, idx);
          renderizarTopicos(i);
          redraw();
        });
        linha.appendChild(b);
      });
      grupo.appendChild(linha);
    }

    if (t.simbolos.length) {
      const rot = document.createElement("p");
      rot.className = "sub-rotulo";
      rot.textContent = "Observações";
      grupo.appendChild(rot);
      const linha = document.createElement("div");
      linha.className = "simbolos";
      t.simbolos.forEach((sb) => {
        const ativo = (v.s || []).includes(sb.simbolo);
        const b = document.createElement("button");
        b.type = "button";
        b.className = "simb" + (ativo ? " ativa" : "");
        b.setAttribute("aria-pressed", ativo);
        b.innerHTML = `<span class="glifo">${esc(sb.simbolo)}</span>${esc(sb.rotulo)}`;
        b.addEventListener("click", () => {
          alternarSimbolo(chaveAberta, t.id, sb.simbolo);
          renderizarTopicos(i);
          redraw();
        });
        linha.appendChild(b);
      });
      grupo.appendChild(linha);
    }
    box.appendChild(grupo);
  });
}

function nomeFase(f) {
  if (f < 0.03 || f > 0.97) return "lua nova";
  if (f < 0.22) return "crescente";
  if (f < 0.28) return "quarto crescente";
  if (f < 0.47) return "crescente gibosa";
  if (f < 0.53) return "lua cheia";
  if (f < 0.72) return "minguante gibosa";
  if (f < 0.78) return "quarto minguante";
  return "minguante";
}

function mostrarAviso(msg, fixo) {
  const el = $("aviso");
  el.textContent = msg;
  el.hidden = false;
  el.classList.toggle("fixo", !!fixo);
  clearTimeout(mostrarAviso._t);
  if (!fixo) mostrarAviso._t = setTimeout(() => { el.hidden = true; }, 3000);
}

// ---------- ligações ----------
window.aoIniciarSketch = function () { atualizarCabecalho(); };

$("btAnterior").addEventListener("click", () => mudarLunacao(-1));
$("btProxima").addEventListener("click", () => mudarLunacao(1));
$("btHoje").addEventListener("click", () => irParaHoje());
document.querySelectorAll("#painel [data-fechar]").forEach((el) => el.addEventListener("click", fecharPainel));
$("painelNota").addEventListener("change", () => {
  if (chaveAberta) definirNota(chaveAberta, $("painelNota").value.trim());
});
$("btLimparDia").addEventListener("click", () => {
  if (!chaveAberta) return;
  limparDia(chaveAberta);
  $("painelNota").value = "";
  renderizarTopicos(-1);
  redraw();
});
document.addEventListener("keydown", (e) => {
  const livre = $("painel").hidden && $("config").hidden;
  if (e.key === "Escape" && !$("painel").hidden) fecharPainel();
  if (livre && e.key === "ArrowLeft") mudarLunacao(-1);
  if (livre && e.key === "ArrowRight") mudarLunacao(1);
});

montarLegenda();
if (!Armazem.disponivel) {
  mostrarAviso("Este ambiente bloqueia o armazenamento local: os registros somem ao recarregar.", true);
}
