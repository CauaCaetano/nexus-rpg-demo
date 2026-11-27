// Módulo de exemplo do Nexus: "Contador de rodadas no chat".
// Mostra como usar os ganchos (hooks), registrar uma aba, uma configuração e ler o estado.
// Roda só no navegador; tudo o que ele faz no servidor passa pelas mesmas permissões do usuário.
const N = window.Nexus
const ID = 'contador-rodadas'
const t = (chave, vars) => N.i18n.t(`${ID}.${chave}`, vars)

// configurações: "do mundo" (o mestre escolhe para a mesa toda) e "do cliente" (cada um no seu navegador)
N.registrarConfiguracao({ modulo: ID, chave: 'anunciar', nome: t('config.anunciar'), dica: t('config.anunciarDica'), escopo: 'mundo', tipo: 'boolean', padrao: true })
N.registrarConfiguracao({ modulo: ID, chave: 'avisoLocal', nome: t('config.avisoLocal'), escopo: 'cliente', tipo: 'boolean', padrao: false })

const historico = [] // { rodada, segundos, hora }
let painel = null

function desenhar() {
  if (!painel) return
  const h = (tag, attrs, ...filhos) => {
    const el = document.createElement(tag)
    // atributos com hífen (data-*, aria-*) vão por setAttribute; o resto como propriedade
    for (const [k, v] of Object.entries(attrs)) k.includes('-') ? el.setAttribute(k, v) : (el[k] = v)
    el.append(...filhos)
    return el
  }
  const combate = N.estado().combate
  painel.replaceChildren(
    h('div', { className: 'cr-topo' }, h('b', {}, combate?.active ? t('rodadaAtual', { n: combate.round }) : t('semCombate'))),
    historico.length
      ? h('ol', { className: 'cr-lista', 'data-testid': 'contador-historico' }, ...historico.map((x) => h('li', {}, h('b', {}, t('rodada', { n: x.rodada })), ` · ${N.relogio.formatarDuracao(x.segundos)} · ${x.hora}`)))
      : h('p', { className: 'muted' }, t('vazio'))
  )
}

N.hooks.on('combateRodada', ({ rodada }) => {
  const est = N.estado()
  const porRodada = est.relogio?.segundosPorRodada ?? 6
  const segundos = (rodada - 1) * porRodada
  historico.unshift({ rodada, segundos, hora: N.relogio.formatarHora(est.relogio?.segundos ?? 0) })
  historico.length = Math.min(historico.length, 50)
  desenhar()
  window.__contadorRodadas = (window.__contadorRodadas || 0) + 1
  if (N.configuracao(ID, 'avisoLocal')) N.notificar(t('rodada', { n: rodada }))
  // só o mestre escreve no chat, para a mensagem não sair repetida em cada navegador
  if (N.usuario.mestre && N.configuracao(ID, 'anunciar') && rodada > 1) {
    N.chat(t('mensagem', { n: rodada, tempo: N.relogio.formatarDuracao(segundos) }))
  }
})
N.hooks.on('combateComecou', () => {
  historico.length = 0
  desenhar()
})
N.hooks.on('combateTerminou', desenhar)

N.registrarAba({
  id: 'contador-rodadas',
  icone: 'timer',
  rotulo: t('aba'),
  montar(el) {
    painel = el
    el.classList.add('cr-painel')
    desenhar()
    return () => {
      painel = null
    }
  }
})

N.hooks.once('pronto', () => console.info(`[${ID}] pronto`))
