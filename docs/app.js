const $ = (s, r = document) => r.querySelector(s);
history.scrollRestoration = "manual";
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (t) => String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const semAcento = (t) => String(t ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const dataBR = (iso) => (iso ? iso.split("-").reverse().join("/") : "");
const reduzir = matchMedia("(prefers-reduced-motion: reduce)").matches;
const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;

const RESULTADOS = {
  procedente: { rotulo: "Procedente", plural: "Procedentes" },
  parcial: { rotulo: "Procedente em parte", plural: "Procedentes em parte" },
  negado: { rotulo: "Negado seguimento", plural: "Negados" },
  pendente: { rotulo: "Sem julgamento", plural: "Sem julgamento" },
};
const SITUACOES = {
  concluso: "Concluso ao relator",
  recurso: "Recurso em andamento",
  aguardando: "Aguardando trânsito",
  transitado: "Transitado em julgado",
};
const FACETA_SITUACAO = { transitado: "Transitados", aberto: "Sem trânsito" };
const ORDINAL = ["", "Primeiro", "Segundo", "Terceiro", "Quarto", "Quinto", "Sexto"];
const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const FORMAS = {
  procedente: '<circle cx="6" cy="6" r="5"/>',
  parcial: '<circle cx="6" cy="6" r="4.25" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M6 1a5 5 0 0 0 0 10z"/>',
  negado: '<path d="M6 .4 11.6 6 6 11.6.4 6z"/>',
  pendente: '<circle cx="6" cy="6" r="4.25" fill="none" stroke="currentColor" stroke-width="1.5"/>',
};
const marca = (r) => `<svg class="mk mk--${r}" viewBox="0 0 12 12" aria-hidden="true">${FORMAS[r]}</svg>`;
const rotuloResultado = (r) => `<span class="res res--${r}">${marca(r)}${RESULTADOS[r].rotulo}</span>`;

let D;
const filtro = { texto: "", bloco: null, resultado: null, situacao: null, relator: null };
const estado = { grupo: "bloco", visao: "cronologia", ordem: { campo: "rcl", dir: 1 }, fechados: new Set(), sequencia: [], atual: null };
const aberto = (p) => p.situacao !== "transitado";

/* Dias úteis */
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const paraData = (s) => { const [a, m, d] = s.split("-").map(Number); return new Date(a, m - 1, d); };
const hoje = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
function diaUtil(d) {
  const s = iso(d);
  if (d.getDay() === 0 || d.getDay() === 6 || D.calendario.nao_uteis.includes(s)) return false;
  return !D.calendario.suspensoes.some(([a, b]) => s >= a && s <= b);
}
function uteisEntre(inicio, fim) {
  let n = 0;
  for (let d = new Date(inicio); d <= fim; d.setDate(d.getDate() + 1)) if (diaUtil(d)) n++;
  return n;
}
function estadoPrazo(p) {
  const h = hoje(), ini = paraData(p.prazo.inicio), fim = paraData(p.prazo.fim);
  const restam = h > fim ? 0 : uteisEntre(h < ini ? ini : h, fim);
  return { restam, vencido: h > fim, usados: p.prazo.dias - restam };
}
const quemRecorre = (p) => ({ negado: "Prazo de recurso da V.tal", parcial: "Prazo de recurso de ambas as partes" }[p.resultado] ?? "Prazo de recurso da parte contrária");
const medidor = (p, e) => `<span class="medidor" role="img" aria-label="${e.usados} de ${p.prazo.dias} dias úteis usados">${Array.from({ length: p.prazo.dias }, (_, i) => `<i class="${i < e.usados ? "usado" : ""}"></i>`).join("")}</span>`;

function contar(el, alvo) {
  if (reduzir) { el.textContent = alvo; return; }
  const t0 = performance.now();
  const passo = (t) => {
    const k = Math.min((t - t0) / 1100, 1);
    el.textContent = Math.round(alvo * (1 - (1 - k) ** 4));
    if (k < 1) requestAnimationFrame(passo);
  };
  requestAnimationFrame(passo);
}

/* Panorama */
function panorama() {
  const P = D.processos, n = (f) => P.filter(f).length;
  const julgados = n((p) => p.resultado !== "pendente");
  const favoraveis = n((p) => p.resultado === "procedente" || p.resultado === "parcial");
  contar($("#n-favor"), favoraveis);
  $("#frase").textContent = `de ${julgados} reclamações julgadas foram favoráveis à V.tal`;
  $("#tese").textContent = D.tese;

  const correndo = D.prazos.filter(({ e }) => !e.vencido);
  const proximo = correndo[0];
  const quando = new Date(D.coleta.quando);
  const defasado = !D.coleta.ok || (Date.now() - quando) / 36e5 > 60;
  const coleta = `${quando.toLocaleDateString("pt-BR")}, ${quando.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
  $("#hoje").innerHTML = `
    <p class="hoje__data">${new Date().toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" })}</p>
    <dl>
      <div><dt>Prazos correndo</dt><dd>${correndo.length}</dd></div>
      <div><dt>Próximo vencimento</dt><dd>${proximo ? `<button type="button" data-rcl="${proximo.p.rcl}">${dataBR(proximo.p.prazo.fim)}</button>` : "Nenhum"}</dd></div>
      <div><dt>${defasado ? "Última coleta completa" : "Dados do STF em"}</dt><dd class="${defasado ? "alerta" : ""}">${coleta}</dd></div>
    </dl>`;

  const peso = { procedente: 0, parcial: 1, negado: 2, pendente: 3 };
  const ordenados = [...P].sort((a, b) => peso[a.resultado] - peso[b.resultado] || aberto(a) - aberto(b) || a.rcl - b.rcl);
  $("#tira").innerHTML = ordenados.map((p, i) => `<button class="t t--${p.resultado} ${aberto(p) ? "t--aberto" : ""}" type="button" style="--i:${i}" data-rcl="${p.rcl}" data-dica="Rcl ${p.rcl} · ${esc(RESULTADOS[p.resultado].rotulo)} · ${esc(SITUACOES[p.situacao])}" aria-label="Rcl ${p.rcl}: ${esc(RESULTADOS[p.resultado].rotulo)}, ${esc(SITUACOES[p.situacao])}"></button>`).join("");

  const itens = Object.keys(RESULTADOS).filter((k) => P.some((p) => p.resultado === k)).map((k) => ({ chave: "resultado", valor: k, n: n((p) => p.resultado === k), rotulo: RESULTADOS[k].plural, marca: marca(k) }));
  itens.push({ chave: "situacao", valor: "aberto", n: n(aberto), rotulo: "Ainda sem trânsito", marca: '<svg class="mk mk--vazado" viewBox="0 0 12 12" aria-hidden="true"><rect x=".75" y=".75" width="10.5" height="10.5"/></svg>' });
  $("#placar").innerHTML = itens.map((i) => `<button type="button" data-filtro="${i.chave}" data-valor="${i.valor}"><strong>${i.n}</strong><span>${i.marca}${esc(i.rotulo)}</span></button>`).join("");
}

/* Pontos de atenção */
function atencao() {
  $("#metodo").textContent = D.metodo_prazo;
  const correndo = D.prazos.filter(({ e }) => !e.vencido).length;
  $("#prazos-nota").textContent = D.prazos.length ? `${plural(correndo, "correndo", "correndo")} de ${plural(D.prazos.length, "decisão", "decisões")} sem trânsito` : "";
  $("#prazos").innerHTML = D.prazos.length ? D.prazos.map(({ p, e }) => `
    <li><button type="button" data-rcl="${p.rcl}" class="${!e.vencido && e.restam <= 3 ? "perto" : ""}">
      <span class="prazo__n">${e.vencido ? "0" : e.restam}<small>${e.restam === 1 ? "dia útil" : "dias úteis"}</small></span>
      <span class="prazo__txt"><strong>Rcl ${p.rcl}</strong> ${rotuloResultado(p.resultado)}<em>${e.vencido ? "Prazo estimado encerrado. Aguarda a certidão de trânsito." : esc(quemRecorre(p))}</em></span>
      <span class="prazo__fim">${medidor(p, e)}<span>Publicada em ${dataBR(p.prazo.publicacao)}</span><span>Fim em ${dataBR(p.prazo.fim)}</span></span>
    </button></li>`).join("") : '<li class="vazio">Nenhum prazo em andamento.</li>';

  const alertas = D.processos.filter((p) => p.resultado === "negado" || p.resultado === "pendente")
    .sort((a, b) => (a.resultado === "negado" ? 0 : 1) - (b.resultado === "negado" ? 0 : 1));
  $("#alertas").innerHTML = alertas.map((p) => `
    <li class="alerta--${p.resultado}"><button type="button" data-rcl="${p.rcl}">
      <span><strong>Rcl ${p.rcl}</strong> ${rotuloResultado(p.resultado)}</span>
      <span>${esc(p.relator)} · ${esc(SITUACOES[p.situacao])}</span>
    </button></li>`).join("") || '<li class="vazio">Nenhum processo nesta condição.</li>';

  const itens = D.processos.flatMap((p) => p.andamentos.filter((a) => a.relevante).slice(0, 1).map((a) => ({ p, a })))
    .sort((x, y) => y.a.data.localeCompare(x.a.data)).slice(0, 6);
  $("#feed").innerHTML = itens.map(({ p, a }) => `<li><button type="button" data-rcl="${p.rcl}"><time datetime="${a.data}">${dataBR(a.data)}</time><strong>Rcl ${p.rcl}</strong><span>${esc(a.nome)}</span></button></li>`).join("");
}

/* Filtros */
function passa(p, ignorar) {
  if (filtro.texto && !p.busca.includes(filtro.texto)) return false;
  for (const k of ["bloco", "resultado", "relator"]) if (k !== ignorar && filtro[k] != null && p[k] !== filtro[k]) return false;
  if (ignorar !== "situacao" && filtro.situacao && (filtro.situacao === "aberto") !== aberto(p)) return false;
  return true;
}
function facetas() {
  const grupo = (chave, rotulo, opcoes) => `<div class="faceta" role="group" aria-label="${rotulo}"><span>${rotulo}</span>${opcoes.map(([v, r, teste]) => {
    const n = D.processos.filter((p) => passa(p, chave) && teste(p)).length;
    return `<button type="button" data-filtro="${chave}" data-valor="${v}" aria-pressed="${String(filtro[chave]) === String(v)}" ${n ? "" : "disabled"}>${esc(r)}<sup>${n}</sup></button>`;
  }).join("")}</div>`;
  const blocos = [...new Set(D.processos.map((p) => p.bloco))].sort();
  $("#facetas").innerHTML =
    grupo("resultado", "Resultado", Object.keys(RESULTADOS).filter((k) => D.processos.some((p) => p.resultado === k)).map((k) => [k, { parcial: "Em parte", pendente: "Sem julgamento" }[k] ?? RESULTADOS[k].plural, (p) => p.resultado === k])) +
    grupo("situacao", "Situação", Object.entries(FACETA_SITUACAO).map(([k, r]) => [k, r, (p) => (k === "aberto") === aberto(p)])) +
    grupo("bloco", "Bloco", blocos.map((b) => [b, ORDINAL[b], (p) => p.bloco === b]));
}
function segmentos() {
  const seg = (id, tipo, atual, opcoes) => {
    $(id).innerHTML = opcoes.map(([v, r]) => `<button type="button" data-${tipo}="${v}" aria-pressed="${v === atual}">${r}</button>`).join("");
  };
  seg("#grupos", "grupo", estado.grupo, [["bloco", "Bloco"], ["relator", "Relator"], ["resultado", "Resultado"], ["situacao", "Situação"]]);
  seg("#visoes", "visao", estado.visao, [["cronologia", "Cronologia"], ["tabela", "Tabela"]]);
  $("#grupos").hidden = estado.visao === "tabela";
}

/* Cronologia */
function escala() {
  const datas = D.processos.flatMap((p) => [p.protocolo, p.prazo?.fim]).filter(Boolean).sort();
  const ini = paraData(datas[0]); ini.setDate(1);
  const fim = new Date(Math.max(paraData(datas.at(-1)), hoje())); fim.setDate(fim.getDate() + 12);
  const x = (d) => ((d - ini) / (fim - ini)) * 100;
  const meses = [];
  for (let d = new Date(ini); d <= fim; d.setMonth(d.getMonth() + 1)) meses.push(new Date(d));
  return { ini, fim, x, pos: (s) => x(paraData(s)), trimestres: meses.filter((m) => m.getMonth() % 3 === 0) };
}
function faixa(p) {
  const { pos } = D.escala;
  const etapa = (r) => p.etapas.find((e) => e.rotulo === r)?.data;
  const decisao = etapa("Decisão"), publicacao = etapa("Publicação");
  const fim = p.transito ? pos(p.transito) : D.escala.x(hoje());
  const ini = p.protocolo ? pos(p.protocolo) : fim;
  let html = `<i class="f-linha ${p.transito ? "" : "f-linha--aberta"}" style="left:${ini}%;width:${Math.max(fim - ini, .2)}%"></i>`;
  if (p.prazo && aberto(p)) {
    const a = pos(p.prazo.inicio);
    html += `<i class="f-prazo" style="left:${a}%;width:${pos(p.prazo.fim) - a}%" data-dica="Prazo estimado até ${dataBR(p.prazo.fim)}"></i>`;
  }
  if (publicacao) html += `<i class="f-pub" style="left:${pos(publicacao)}%" data-dica="Publicação em ${dataBR(publicacao)}"></i>`;
  if (p.transito) html += `<i class="f-fim" style="left:${fim}%" data-dica="Trânsito em julgado em ${dataBR(p.transito)}"></i>`;
  if (decisao) html += `<b class="f-dec" style="left:${pos(decisao)}%" data-dica="${esc(RESULTADOS[p.resultado].rotulo)} em ${dataBR(decisao)}">${marca(p.resultado)}</b>`;
  return html;
}
function agrupar(lista) {
  const chave = { bloco: (p) => p.bloco, relator: (p) => p.relator, resultado: (p) => p.resultado, situacao: (p) => p.situacao }[estado.grupo];
  const mapa = new Map();
  lista.forEach((p) => { const k = chave(p); (mapa.get(k) ?? mapa.set(k, []).get(k)).push(p); });
  const nome = { bloco: (k) => `${ORDINAL[k]} bloco`, relator: (k) => k, resultado: (k) => RESULTADOS[k].plural, situacao: (k) => SITUACOES[k] }[estado.grupo];
  const peso = { resultado: Object.keys(RESULTADOS), situacao: Object.keys(SITUACOES) }[estado.grupo];
  const ordenar = { bloco: (a, b) => a[0] - b[0], relator: (a, b) => b[1].length - a[1].length || String(a[0]).localeCompare(b[0]) }[estado.grupo]
    ?? ((a, b) => peso.indexOf(a[0]) - peso.indexOf(b[0]));
  return [...mapa].sort(ordenar).map(([k, ps]) => ({ id: `${estado.grupo}-${k}`, nome: nome(k), ps }));
}
function linha(p) {
  const ultimo = p.andamentos[0]?.data;
  return `<li class="linha linha--${p.resultado}" style="view-transition-name:r${p.rcl}"><button type="button" data-rcl="${p.rcl}" aria-label="Rcl ${p.rcl}, ${esc(p.parte_contraria)}, ${esc(RESULTADOS[p.resultado].rotulo)}, ${esc(SITUACOES[p.situacao])}">
    <span class="c-rcl">${p.rcl}</span>
    <span class="c-parte">${esc(p.parte_contraria)}</span>
    <span class="c-faixa">${faixa(p)}</span>
    <span class="c-res">${rotuloResultado(p.resultado)}</span>
    <span class="c-ult">${dataBR(ultimo)}</span>
  </button></li>`;
}
function cronologia(lista) {
  const { trimestres, x } = D.escala;
  const agora = x(hoje());
  const rotulos = trimestres.map((m) => `<span style="left:${x(m)}%">${m.getMonth() === 0 ? `<b>${m.getFullYear()}</b>` : MESES[m.getMonth()]}</span>`).join("");
  const grupos = agrupar(lista);
  estado.sequencia = grupos.flatMap((g) => g.ps.map((p) => p.rcl));
  $("#vista").innerHTML = `
    <div class="crono" id="crono">
      <div class="eixo" aria-hidden="true">
        <span>Rcl</span><span>Parte contrária</span>
        <span class="eixo__t">${rotulos}<em class="eixo__hoje" style="left:${agora}%">Hoje</em><em class="eixo__cursor" id="cursor-data" hidden></em></span>
        <span>Resultado</span><span>Último</span>
      </div>
      <div class="grade" aria-hidden="true"><div>${trimestres.map((m) => `<i style="left:${x(m)}%"></i>`).join("")}<i class="grade__hoje" style="left:${agora}%"></i><i class="grade__cursor" id="cursor" hidden></i></div></div>
      ${grupos.map((g) => {
        const fechado = estado.fechados.has(g.id);
        const abertos = g.ps.filter(aberto).length;
        return `<section class="grupo">
          <h3><button type="button" data-dobrar="${esc(g.id)}" aria-expanded="${!fechado}"><svg viewBox="0 0 10 10" aria-hidden="true"><path d="m3 2 4 3-4 3"/></svg>${esc(g.nome)}<small>${plural(g.ps.length, "reclamação", "reclamações")}${abertos ? ` · ${abertos} sem trânsito` : ""}</small></button></h3>
          ${fechado ? "" : `<ol>${g.ps.map(linha).join("")}</ol>`}
        </section>`;
      }).join("")}
    </div>
    <ul class="chave" aria-label="Legenda da cronologia">
      ${Object.keys(RESULTADOS).filter((k) => D.processos.some((p) => p.resultado === k)).map((k) => `<li>${marca(k)}${RESULTADOS[k].rotulo}</li>`).join("")}
      <li><i class="k-pub"></i>Publicação</li><li><i class="k-fim"></i>Trânsito em julgado</li><li><i class="k-prazo"></i>Prazo estimado</li>
    </ul>`;
}

/* Tabela */
const COLUNAS = [["rcl", "Reclamação"], ["parte_contraria", "Parte contrária"], ["relator", "Relator"], ["bloco", "Bloco"], ["resultado", "Resultado"], ["situacao", "Situação"], ["ultimo", "Último andamento"]];
function tabela(lista) {
  const { campo, dir } = estado.ordem;
  const val = (p) => (campo === "ultimo" ? p.andamentos[0]?.data ?? "" : p[campo]);
  const f = [...lista].sort((a, b) => { const x = val(a), y = val(b); return (x > y ? 1 : x < y ? -1 : 0) * dir; });
  estado.sequencia = f.map((p) => p.rcl);
  const sentido = (c) => (campo === c ? (dir > 0 ? "ascending" : "descending") : "none");
  $("#vista").innerHTML = `<div class="rolagem"><table class="tabela"><caption class="sr">Processos filtrados</caption><thead><tr>${COLUNAS.map(([c, r]) => `<th scope="col" aria-sort="${sentido(c)}"><button type="button" data-ordem="${c}">${esc(r)}</button></th>`).join("")}</tr></thead><tbody>${f.map((p) => `
    <tr class="linha--${p.resultado}">
      <td><button type="button" data-rcl="${p.rcl}">${p.rcl}</button></td>
      <td>${esc(p.parte_contraria)}</td><td>${esc(p.relator)}</td><td>${ORDINAL[p.bloco]}</td>
      <td>${rotuloResultado(p.resultado)}</td><td>${esc(SITUACOES[p.situacao])}</td><td class="num">${dataBR(p.andamentos[0]?.data)}</td>
    </tr>`).join("")}</tbody></table></div>`;
}

/* Atualização da lista */
function desenhar() {
  const lista = D.processos.filter((p) => passa(p));
  facetas(); segmentos();
  $("#contagem").textContent = `${lista.length} de ${D.processos.length}`;
  $("#limpar").hidden = !(filtro.texto || ["bloco", "resultado", "situacao", "relator"].some((k) => filtro[k] != null));
  $("#relator").value = filtro.relator ?? "";
  $$("#tira .t").forEach((t) => t.classList.toggle("apagado", !passa(D.porRcl.get(+t.dataset.rcl))));
  $$("#placar button").forEach((b) => b.setAttribute("aria-pressed", String(filtro[b.dataset.filtro] === b.dataset.valor)));
  if (!lista.length) { estado.sequencia = []; $("#vista").innerHTML = '<p class="vazio">Nenhum processo com esses filtros.</p>'; }
  else if (estado.visao === "tabela") tabela(lista);
  else cronologia(lista);
  guardarUrl();
}
function atualizar(animar = true) {
  if (animar && document.startViewTransition && !reduzir) {
    const t = document.startViewTransition(desenhar);
    t.ready.catch(() => {});
    t.finished.catch(() => {});
  } else desenhar();
}
function guardarUrl() {
  const q = new URLSearchParams();
  for (const k of ["bloco", "resultado", "situacao", "relator"]) if (filtro[k] != null) q.set(k, filtro[k]);
  if (estado.grupo !== "bloco") q.set("grupo", estado.grupo);
  if (estado.visao !== "cronologia") q.set("visao", estado.visao);
  const s = q.toString();
  history.replaceState(null, "", location.pathname + (s ? `?${s}` : "") + location.hash);
}
function lerUrl() {
  const q = new URLSearchParams(location.search);
  for (const k of ["resultado", "situacao", "relator"]) if (q.get(k)) filtro[k] = q.get(k);
  if (q.get("bloco")) filtro.bloco = +q.get("bloco");
  if (["relator", "resultado", "situacao"].includes(q.get("grupo"))) estado.grupo = q.get("grupo");
  if (q.get("visao") === "tabela") estado.visao = "tabela";
}
function limparFiltros() {
  Object.assign(filtro, { texto: "", bloco: null, resultado: null, situacao: null, relator: null });
  $("#busca").value = "";
}

/* Ficha do processo */
const diasEntre = (a, b) => Math.round((paraData(b) - paraData(a)) / 864e5);
function trajetoria(p) {
  let anterior = null;
  return `<ol class="trajeto">${p.etapas.map((e) => {
    const intervalo = e.data && anterior ? plural(diasEntre(anterior, e.data), "dia", "dias") : "";
    if (e.data) anterior = e.data;
    return `<li class="${e.data ? "feito" : ""}"><small>${intervalo || "&nbsp;"}</small><i></i><strong>${esc(e.rotulo)}</strong><time ${e.data ? `datetime="${e.data}"` : ""}>${dataBR(e.data) || "Pendente"}</time></li>`;
  }).join("")}</ol>`;
}
const evento = (a) => `<li><time datetime="${a.data}">${dataBR(a.data)}</time><div><strong>${esc(a.nome)}</strong>${a.orgao ? `<p>${esc(a.orgao)}</p>` : ""}${a.complemento ? `<p>${esc(a.complemento)}</p>` : ""}${a.documentos?.length ? `<p class="docs">${a.documentos.map((d) => `<a href="${esc(d.url)}" target="_blank" rel="noopener">${esc(d.nome)}</a>`).join("")}</p>` : ""}</div></li>`;
function abrir(rcl, empurrar = true) {
  const p = D.porRcl.get(rcl); if (!p) return;
  const f = $("#ficha");
  estado.atual = rcl;
  const seq = estado.sequencia.includes(rcl) ? estado.sequencia : D.processos.map((x) => x.rcl);
  const i = seq.indexOf(rcl);
  const prazo = p.prazo && aberto(p) ? estadoPrazo(p) : null;
  const fatos = [
    ["Parte contrária", p.parte_contraria], ["Relator", p.relator], ["Bloco", `${ORDINAL[p.bloco]} bloco`],
    ["Processo de origem", p.origem], ["Autoridade reclamada", p.orgao_origem], ["Número único no STF", p.numero_unico],
  ].filter(([, v]) => v);
  const principais = p.andamentos.filter((a) => a.relevante);
  f.innerHTML = `
    <div class="f__topo">
      <div class="f__nav">
        <button type="button" data-ir="${seq[i - 1] ?? ""}" ${i > 0 ? "" : "disabled"} aria-label="Processo anterior">←</button>
        <span>${i + 1} de ${seq.length}</span>
        <button type="button" data-ir="${seq[i + 1] ?? ""}" ${i < seq.length - 1 ? "" : "disabled"} aria-label="Próximo processo">→</button>
      </div>
      <button class="f__fechar" type="button" data-fechar aria-label="Fechar">Fechar <kbd>Esc</kbd></button>
      <i class="f__leitura" aria-hidden="true"></i>
    </div>
    <div class="f__corpo">
      <h2 id="f-titulo">Rcl ${p.rcl}</h2>
      <p class="f__estado">${rotuloResultado(p.resultado)}<span>${esc(SITUACOES[p.situacao])}</span></p>
      ${p.resumo ? `<p class="f__resumo">${esc(p.resumo)}</p>` : ""}
      ${prazo ? `<div class="f__prazo"><strong>${prazo.vencido ? "Prazo estimado encerrado" : plural(prazo.restam, "dia útil restante", "dias úteis restantes")}</strong><span>${esc(quemRecorre(p))}. Fim estimado em ${dataBR(p.prazo.fim)}.</span>${medidor(p, prazo)}</div>` : ""}
      ${trajetoria(p)}
      <dl class="fatos">${fatos.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl>
      ${p.decisoes.length ? `<section><h3>Decisões</h3><ol class="eventos">${p.decisoes.map(evento).join("")}</ol></section>` : ""}
      <section>
        <div class="f__cab"><h3>Andamentos</h3>
          <div class="seg" role="group" aria-label="Andamentos exibidos"><button type="button" data-and="principais" aria-pressed="true">Principais ${principais.length}</button><button type="button" data-and="todos" aria-pressed="false">Todos ${p.andamentos.length}</button></div>
        </div>
        <ol class="eventos" id="f-and">${principais.map(evento).join("")}</ol>
      </section>
      <div class="f__acoes"><a href="${esc(p.url)}" target="_blank" rel="noopener">Abrir no portal do STF</a><button type="button" id="f-link">Copiar link deste processo</button></div>
    </div>`;
  if (!f.open) f.showModal();
  f.scrollTop = 0;
  if (empurrar) history.pushState(null, "", `${location.pathname}${location.search}#rcl-${rcl}`);
}
function fechar() {
  const f = $("#ficha");
  if (f.open) f.close();
  estado.atual = null;
  if (location.hash) history.pushState(null, "", location.pathname + location.search);
}
function pelaUrl() {
  const m = location.hash.match(/^#rcl-(\d+)$/);
  if (m) abrir(+m[1], false); else if ($("#ficha").open) $("#ficha").close();
}

/* Busca rápida */
const ATALHOS = [
  ["Ver processos sem trânsito", { situacao: "aberto" }],
  ["Ver seguimentos negados", { resultado: "negado" }],
  ["Ver processos sem julgamento", { resultado: "pendente" }],
];
function paletaLista() {
  const q = semAcento($("#paleta-busca").value.trim());
  const itens = q
    ? D.processos.filter((p) => p.busca.includes(q)).slice(0, 8).map((p) => `<li role="option" data-rcl="${p.rcl}">${marca(p.resultado)}<strong>Rcl ${p.rcl}</strong><span>${esc(p.parte_contraria)}</span></li>`)
    : ATALHOS.map(([r], i) => `<li role="option" data-atalho="${i}">${esc(r)}</li>`);
  $("#paleta-lista").innerHTML = itens.join("") || '<li class="vazio">Nenhum processo encontrado.</li>';
  $("#paleta-lista [role=option]")?.setAttribute("aria-selected", "true");
}
function abrirPaleta() {
  $("#paleta-busca").value = ""; paletaLista();
  if (!$("#paleta").open) $("#paleta").showModal();
}
function escolher(item) {
  if (!item) return;
  $("#paleta").close();
  if (item.dataset.rcl) { abrir(+item.dataset.rcl); return; }
  limparFiltros();
  Object.assign(filtro, ATALHOS[+item.dataset.atalho][1]);
  atualizar(false);
  $("#processos").scrollIntoView();
}

/* Eventos */
function ligar() {
  document.addEventListener("click", (e) => {
    const t = e.target;
    if (t.closest("#paleta-lista")) { escolher(t.closest("[role=option]")); return; }
    const filtrar = t.closest("[data-filtro]");
    if (filtrar) {
      const { filtro: k, valor } = filtrar.dataset;
      const v = k === "bloco" ? +valor : valor;
      filtro[k] = filtro[k] === v ? null : v;
      atualizar();
      if (filtrar.closest("#placar")) $("#processos").scrollIntoView();
      return;
    }
    const grupo = t.closest("[data-grupo]");
    if (grupo) { estado.grupo = grupo.dataset.grupo; atualizar(); return; }
    const visao = t.closest("[data-visao]");
    if (visao) { estado.visao = visao.dataset.visao; atualizar(false); return; }
    const dobrar = t.closest("[data-dobrar]");
    if (dobrar) {
      const id = dobrar.dataset.dobrar;
      estado.fechados.has(id) ? estado.fechados.delete(id) : estado.fechados.add(id);
      atualizar(); return;
    }
    const ord = t.closest("[data-ordem]");
    if (ord) {
      const c = ord.dataset.ordem;
      estado.ordem = { campo: c, dir: estado.ordem.campo === c ? -estado.ordem.dir : 1 };
      atualizar(false); return;
    }
    if (t.closest("[data-fechar]")) { fechar(); return; }
    const ir = t.closest("[data-ir]");
    if (ir?.dataset.ir) { abrir(+ir.dataset.ir); return; }
    const and = t.closest("[data-and]");
    if (and) {
      const p = D.porRcl.get(estado.atual);
      $$("[data-and]").forEach((b) => b.setAttribute("aria-pressed", String(b === and)));
      $("#f-and").innerHTML = (and.dataset.and === "todos" ? p.andamentos : p.andamentos.filter((a) => a.relevante)).map(evento).join("");
      return;
    }
    if (t.closest("#f-link")) {
      const b = t.closest("#f-link");
      navigator.clipboard.writeText(location.href).then(() => { b.textContent = "Link copiado"; }, () => { b.textContent = location.href; });
      return;
    }
    const alvo = t.closest("[data-rcl]");
    if (alvo) abrir(+alvo.dataset.rcl);
  });
  $("#ficha").addEventListener("click", (e) => { if (e.target === e.currentTarget) fechar(); });
  $("#ficha").addEventListener("cancel", (e) => { e.preventDefault(); fechar(); });
  $("#paleta").addEventListener("click", (e) => { if (e.target === e.currentTarget) $("#paleta").close(); });
  $("#abrir-paleta").addEventListener("click", abrirPaleta);
  $("#paleta-busca").addEventListener("input", paletaLista);
  $("#paleta-busca").addEventListener("keydown", (e) => {
    const itens = $$("#paleta-lista [role=option]");
    const i = itens.findIndex((x) => x.getAttribute("aria-selected") === "true");
    if (e.key === "Enter") { e.preventDefault(); escolher(itens[i]); return; }
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    itens[i]?.removeAttribute("aria-selected");
    const prox = itens[(i + (e.key === "ArrowDown" ? 1 : -1) + itens.length) % itens.length];
    prox?.setAttribute("aria-selected", "true");
    prox?.scrollIntoView({ block: "nearest" });
  });
  $("#busca").addEventListener("input", (e) => { filtro.texto = semAcento(e.target.value.trim()); atualizar(false); });
  $("#relator").addEventListener("change", (e) => { filtro.relator = e.target.value || null; atualizar(); });
  $("#limpar").addEventListener("click", () => { limparFiltros(); atualizar(); });
  addEventListener("popstate", pelaUrl);
  addEventListener("keydown", (e) => {
    const digitando = /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName);
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); abrirPaleta(); return; }
    if ($("#ficha").open && !digitando && (e.key === "ArrowLeft" || e.key === "ArrowRight")) {
      $(`#ficha [data-ir]:${e.key === "ArrowLeft" ? "first-of-type" : "last-of-type"}`)?.click(); return;
    }
    if (e.key === "/" && !digitando && !$("#ficha").open) { e.preventDefault(); abrirPaleta(); }
  });

  /* Cursor de data sobre a cronologia */
  $("#vista").addEventListener("pointermove", (e) => {
    const eixo = $(".eixo__t"), cursor = $("#cursor"), rotulo = $("#cursor-data");
    if (!eixo || !cursor) return;
    const r = eixo.getBoundingClientRect(), k = (e.clientX - r.left) / r.width;
    const dentro = k >= 0 && k <= 1 && e.pointerType === "mouse";
    cursor.hidden = rotulo.hidden = !dentro;
    if (!dentro) return;
    const { ini, fim } = D.escala;
    const d = new Date(+ini + k * (fim - ini));
    cursor.style.left = rotulo.style.left = k * 100 + "%";
    rotulo.textContent = `${d.getDate()} ${MESES[d.getMonth()]} ${d.getFullYear()}`;
  });
  $("#vista").addEventListener("pointerleave", () => {
    if ($("#cursor")) $("#cursor").hidden = $("#cursor-data").hidden = true;
  });

  const dica = $("#dica");
  const mostrar = (e) => {
    const t = e.target.closest?.("[data-dica]");
    if (!t) { dica.hidden = true; return; }
    dica.textContent = t.dataset.dica; dica.hidden = false;
    const r = t.getBoundingClientRect();
    dica.style.left = Math.max(8, Math.min(r.left + r.width / 2 - dica.offsetWidth / 2, innerWidth - dica.offsetWidth - 8)) + "px";
    dica.style.top = (r.top > 50 ? r.top - dica.offsetHeight - 8 : r.bottom + 8) + "px";
  };
  document.addEventListener("pointerover", mostrar);
  document.addEventListener("focusin", mostrar);
  addEventListener("scroll", () => { dica.hidden = true; }, { passive: true });

  const medir = () => {
    const b = $("#barra");
    document.documentElement.style.setProperty("--barra", (getComputedStyle(b).position === "sticky" ? b.offsetHeight : 0) + "px");
  };
  new ResizeObserver(medir).observe($("#barra"));
}

async function iniciar() {
  try {
    D = await (await fetch("dados.json", { cache: "no-cache" })).json();
  } catch {
    $("main").innerHTML = '<p class="wrap vazio">Não foi possível carregar os dados. Tente recarregar a página.</p>';
    return;
  }
  D.porRcl = new Map(D.processos.map((p) => [p.rcl, p]));
  D.processos.forEach((p) => { p.busca = semAcento(`rcl ${p.rcl} ${p.parte_contraria} ${p.relator} ${p.origem} ${p.numero_unico}`); });
  D.prazos = D.processos.filter((p) => p.prazo && aberto(p)).map((p) => ({ p, e: estadoPrazo(p) }))
    .sort((a, b) => a.e.vencido - b.e.vencido || a.p.prazo.fim.localeCompare(b.p.prazo.fim));
  D.escala = escala();
  const relatores = [...new Set(D.processos.map((p) => p.relator))].sort();
  $("#relator").innerHTML = `<option value="">Todos os relatores</option>${relatores.map((r) => `<option value="${esc(r)}">${esc(r)}</option>`).join("")}`;
  lerUrl();
  panorama(); atencao(); ligar();
  desenhar();
  $("#fonte").textContent = `Fonte: portal do Supremo Tribunal Federal. ${D.processos.length} processos acompanhados.`;
  pelaUrl();
}
iniciar();
