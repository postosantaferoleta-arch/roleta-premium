// script.js

// Prêmios da roleta - SERÁ CARREGADO DINAMICAMENTE
let PREMIOS = [];

// Sistema de áudio
const SONS = {
  giro: null,
  vitoria: null,
  derrota: null,
};

// Estado da aplicação
let sistema = {
  idsDisponiveis: [],
  idsUsados: [],
  historico: [],
  idsPremiados: [],
  participantes: [],
  sessaoAtiva: null,
};

let girando = false;

document.addEventListener("DOMContentLoaded", async () => {
  if (!window.postoManager.isLogado()) {
    window.location.href = "posto-login.html";
    return;
  }

  console.log("🚀 Iniciando sistema...");

  const postoData = window.postoManager.getPostoAtual();
  if (!postoData || !postoData.posto_id) { 
    showToast("Erro: Dados do posto não disponíveis. Faça login novamente.", "error");
    window.location.href = "posto-login.html";
    return;
  }

  const configLoadedSuccessfully = await window.configManager.carregarConfig('posto', postoData.posto_id);

  if (!configLoadedSuccessfully) {
    showToast("Erro ao carregar configurações do posto. Usando padrão.", "error");
  }

  window.configManager.aplicarCores();
  window.configManager.aplicarTextos();
  window.configManager.aplicarLogo();

  const clienteNome = document.querySelector(".cliente-nome");
  const currentConfig = window.configManager.getConfig();
  if (clienteNome && currentConfig && currentConfig.sistema && currentConfig.sistema.nomeCliente) {
    clienteNome.textContent = currentConfig.sistema.nomeCliente;
  } else if (clienteNome && postoData.posto_nome) {
      clienteNome.textContent = postoData.posto_nome;
  }

  await carregarTodosDadosDoSistema();

  setTimeout(() => {
    inicializarAudio();
    renderizarRoleta();
    configurarEventListeners();
    atualizarInterface();
    configurarMascaras();
    criarEfeitosVisuais();

    console.log("✅ Sistema totalmente carregado!");
    console.log("📊 Prêmios ativos:", PREMIOS);
    showToast("Sistema carregado com sucesso! 🎉", "success");
  }, 100);
});

async function carregarTodosDadosDoSistema() {
  const postoData = window.postoManager.getPostoAtual();
  if (!postoData || !postoData.posto_id) return; 

  try {
    const clientesResponse = await fetch(`${BASE_API_URL}/clientes/get.php?posto_id=${postoData.posto_id}`);
    if (!clientesResponse.ok) throw new Error(`Erro HTTP ao carregar clientes: ${clientesResponse.status}`);
    const clientesResult = await clientesResponse.json();
    if (clientesResult.status === 'success') {
      sistema.participantes = clientesResult.data;
    } else {
      console.error("Erro ao carregar clientes:", clientesResult.message);
      sistema.participantes = [];
    }

    const historicoResponse = await fetch(`${BASE_API_URL}/sorteios/get.php?posto_id=${postoData.posto_id}`);
    if (!historicoResponse.ok) throw new Error(`Erro HTTP ao carregar histórico: ${historicoResponse.status}`);
    const historicoResult = await historicoResponse.json();
    if (historicoResult.status === 'success') {
      sistema.historico = historicoResult.data;
    } else {
      console.error("Erro ao carregar histórico:", historicoResult.message);
      sistema.historico = [];
    }

    const premiosResponse = await fetch(`${BASE_API_URL}/premios/get.php?posto_id=${postoData.posto_id}`);
    if (!premiosResponse.ok) throw new Error(`Erro HTTP ao carregar prêmios: ${premiosResponse.status}`);
    const premiosResult = await premiosResponse.json();
    if (premiosResult.status === 'success') {
      PREMIOS = premiosResult.data;
    } else {
      console.error("Erro ao carregar prêmios:", premiosResult.message);
      PREMIOS = [];
    }

    const config = window.configManager.getConfig();
    sistema.idsPremiados = config.idsPremiados || [];

    const totalIds = config.sistema.totalIds;
    const usedIdsFromHistory = new Set(sistema.historico.map(s => s.id_sorteado));
    sistema.idsUsados = Array.from(usedIdsFromHistory);
    sistema.idsDisponiveis = Array.from({ length: totalIds }, (_, i) => i + 1).filter(id => !usedIdsFromHistory.has(id));

    console.log("Dados do sistema carregados via API.");

  } catch (error) {
    console.error("Erro ao carregar dados do sistema via API:", error);
    showToast(`Erro ao carregar dados do sistema: ${error.message}`, "error");
    if (error.message.includes('401') || error.message.includes('403')) {
        window.location.href = 'posto-login.html';
    }
  }
}

function inicializarAudio() {
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    SONS.giro = () => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.frequency.setValueAtTime(200, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(100, audioContext.currentTime + 0.5);
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    };
    SONS.vitoria = () => {
      const frequencies = [523, 659, 784, 1047];
      frequencies.forEach((freq, index) => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        oscillator.frequency.setValueAtTime(freq, audioContext.currentTime + index * 0.1);
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime + index * 0.1);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + index * 0.1 + 0.3);
        oscillator.start(audioContext.currentTime + index * 0.1);
        oscillator.stop(audioContext.currentTime + index * 0.1 + 0.3);
      });
    };
    SONS.derrota = () => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.frequency.setValueAtTime(300, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(150, audioContext.currentTime + 0.8);
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.8);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.8);
    };
    console.log("✅ Sistema de áudio inicializado");
  } catch (error) {
    console.error("Erro ao inicializar áudio:", error);
  }
}

function criarEfeitosVisuais() {
  setTimeout(() => {
    const header = document.querySelector(".header");
    const roletaSection = document.querySelector(".roleta-section");
    if (header) header.classList.add("slide-in-down");
    if (roletaSection) roletaSection.classList.add("fade-in");
  }, 100);
}

function renderizarRoleta() {
  console.log("🎨 Renderizando roleta...");
  console.log("📊 Prêmios para renderizar:", PREMIOS);

  const svg = document.getElementById("roleta-svg");
  if (!svg) {
    console.error("❌ Elemento SVG da roleta não encontrado!");
    return;
  }

  if (!PREMIOS || PREMIOS.length === 0) {
    console.error("❌ Nenhum prêmio disponível para renderizar!");
    return;
  }

  const viewBox = 400;
  const centro = viewBox / 2;
  const raio = 180;

  svg.innerHTML = "";

  const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
  svg.appendChild(defs);

  console.log(`🎯 Renderizando ${PREMIOS.length} seções...`);

  PREMIOS.forEach((premio, index) => {
    try {
      const anguloInicial = (360 / PREMIOS.length) * index;
      const anguloFinal = (360 / PREMIOS.length) * (index + 1);

      // --- CORREÇÃO AQUI: Simplificação de polarToCartesian ---
      const startPoint = polarToCartesian(centro, centro, raio, anguloInicial);
      const endPoint = polarToCartesian(centro, centro, raio, anguloFinal);

      const largeArcFlag = anguloFinal - anguloInicial > 180 ? 1 : 0;

      const pathData = [
        `M ${centro} ${centro}`,
        `L ${startPoint.x} ${startPoint.y}`,
        `A ${raio} ${raio} 0 ${largeArcFlag} 1 ${endPoint.x} ${endPoint.y}`,
        `Z`,
      ].join(" ");

      const gradientId = `gradient-${index}`;
      const gradient = document.createElementNS("http://www.w3.org/2000/svg", "linearGradient");
      gradient.setAttribute("id", gradientId);
      gradient.setAttribute("x1", "0%");
      gradient.setAttribute("y1", "0%");
      gradient.setAttribute("x2", "100%");
      gradient.setAttribute("y2", "100%");

      const stop1 = document.createElementNS("http://www.w3.org/2000/svg", "stop");
      stop1.setAttribute("offset", "0%");
      stop1.setAttribute("stop-color", premio.color);
      stop1.setAttribute("stop-opacity", "1");

      const stop2 = document.createElementNS("http://www.w3.org/2000/svg", "stop");
      stop2.setAttribute("offset", "100%");
      stop2.setAttribute("stop-color", premio.color);
      stop2.setAttribute("stop-opacity", "0.8");

      gradient.appendChild(stop1);
      gradient.appendChild(stop2);
      defs.appendChild(gradient);

      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", pathData);
      path.setAttribute("fill", `url(#${gradientId})`);
      path.setAttribute("stroke", "#ffffff");
      path.setAttribute("stroke-width", "2");
      path.setAttribute("filter", "drop-shadow(0 2px 4px rgba(0,0,0,0.1))");
      path.setAttribute("class", "premio-section");

      if (premio.isPrize) {
        path.classList.add("premio-destaque");
      }

      svg.appendChild(path);

      // Posicionamento do texto
      const anguloTexto = anguloInicial + (360 / PREMIOS.length / 2); // Centro do arco
      const textPoint = polarToCartesian(centro, centro, raio * 0.7, anguloTexto); // Posiciona um pouco mais para dentro

      const texto = document.createElementNS("http://www.w3.org/2000/svg", "text");
      texto.setAttribute("x", textPoint.x);
      texto.setAttribute("y", textPoint.y);
      texto.setAttribute("text-anchor", "middle");
      texto.setAttribute("dominant-baseline", "middle");
      texto.setAttribute("fill", "white");
      texto.setAttribute("font-size", premio.text.length > 10 ? "8" : "10");
      texto.setAttribute("font-weight", "bold");
      texto.setAttribute("font-family", "Inter, sans-serif");
      texto.setAttribute("text-shadow", "0 1px 2px rgba(0,0,0,0.5)");
      
      // Ajuste para que o texto não fique de cabeça para baixo
      let textRotation = anguloTexto + 90; // Gira o texto para ser lido horizontalmente
      if (textRotation > 90 && textRotation < 270) { // Se o texto estiver na metade inferior, gire 180 para não ficar de cabeça para baixo
        textRotation += 180;
      }
      texto.setAttribute("transform", `rotate(${textRotation}, ${textPoint.x}, ${textPoint.y})`);
      texto.textContent = premio.text;
      svg.appendChild(texto);

      console.log(`✅ Seção ${index + 1} renderizada: ${premio.text}`);
    } catch (error) {
      console.error(`❌ Erro ao renderizar seção ${index}:`, error);
    }
  });
  console.log("🎨 Roleta renderizada com sucesso!");
}

// Função auxiliar para converter coordenadas polares em cartesianas
// --- CORREÇÃO AQUI: Removido o ajuste de -90 graus para alinhar com a interpretação de ângulos do SVG (0h = 3 horas, positivo = horário) ---
function polarToCartesian(centerX, centerY, radius, angleInDegrees) {
  const angleInRadians = (angleInDegrees) * Math.PI / 180.0;
  return {
    x: centerX + (radius * Math.cos(angleInRadians)),
    y: centerY + (radius * Math.sin(angleInRadians))
  };
}


function configurarEventListeners() {
  document.getElementById("btn-central")?.addEventListener("click", iniciarSorteio);
  document.getElementById("btn-trocar-cliente")?.addEventListener("click", trocarCliente);

  document.getElementById("btn-logout")?.addEventListener("click", () => {
    if (confirm("Tem certeza que deseja sair do sistema?")) {
      window.postoManager.logout();
    }
  });

  document.getElementById("modal-selecao-close")?.addEventListener("click", fecharModal);
  document.getElementById("btn-novo-cliente")?.addEventListener("click", () => {
    fecharModal();
    setTimeout(() => mostrarModal("modal-cadastro"), 300);
  });
  document.getElementById("btn-cliente-existente")?.addEventListener("click", () => {
    fecharModal();
    setTimeout(() => mostrarListaClientes(), 300);
  });

  document.getElementById("modal-lista-close")?.addEventListener("click", fecharModal);
  document.getElementById("search-cliente")?.addEventListener("input", filtrarClientes);

  document.getElementById("modal-close")?.addEventListener("click", fecharModal);
  document.getElementById("btn-cancelar")?.addEventListener("click", fecharModal);
  document.getElementById("form-cadastro")?.addEventListener("submit", processarCadastro);

  document.getElementById("resultado-close")?.addEventListener("click", fecharModal);
  document.getElementById("btn-fechar-resultado")?.addEventListener("click", fecharModal);
  document.getElementById("btn-novo-sorteio")?.addEventListener("click", novoSorteio);

  document.querySelectorAll(".modal").forEach((modal) => {
    modal.addEventListener("click", (e) => {
      if (e.target.classList.contains("modal-backdrop") || e.target === modal) {
        fecharModal();
      }
    });
  });
}

function configurarMascaras() {
  const cpfInput = document.getElementById("cpf");
  if (cpfInput) {
    cpfInput.addEventListener("input", (e) => {
      let value = e.target.value.replace(/\\\D/g, "");
      value = value.replace(/(\\\d{3})(\\\d)/, "$1.$2");
      value = value.replace(/(\\\d{3})(\\\d)/, "$1.$2");
      value = value.replace(/(\\\d{3})(\\\d{1,2})$/, "$1-$2");
      e.target.value = value;
    });
  }

  const telefoneInput = document.getElementById("telefone");
  if (telefoneInput) {
    telefoneInput.addEventListener("input", (e) => {
      let value = e.target.value.replace(/\\\D/g, "");
      value = value.replace(/(\\\d{2})(\\\d)/, "($1) $2");
      value = value.replace(/(\\\d{4,5})(\\\d{4})$/, "$1-$2");
      e.target.value = value;
    });
  }

  const valorInput = document.getElementById("valor");
  if (valorInput) {
    valorInput.addEventListener("input", (e) => {
      let value = e.target.value.replace(/\\\D/g, "");
      value = (Number.parseInt(value) || 0).toString();

      while (value.length < 3) {
        value = "0" + value;
      }

      const reais = value.slice(0, -2);
      const centavos = value.slice(-2);
      e.target.value = `R$ ${Number.parseInt(reais) || 0},${centavos}`;
    });
  }
}

function iniciarSorteio() {
  if (girando) return;

  if (sistema.sessaoAtiva) {
    girarRoleta();
  } else {
    mostrarModal("modal-selecao-cliente");
  }
}

function mostrarListaClientes() {
  const container = document.getElementById("lista-clientes");
  if (!container) return;

  container.innerHTML = "";

  if (!sistema.participantes || sistema.participantes.length === 0) {
    container.innerHTML = `
      <div class="no-results">
        <div class="no-results-icon">👥</div>
        <p>Nenhum cliente cadastrado ainda</p>
      </div>
    `;
  } else {
    sistema.participantes.forEach((cliente) => {
      const div = document.createElement("div");
      div.className = "cliente-item";
      div.onclick = () => selecionarCliente(cliente);

      div.innerHTML = `
        <div class="cliente-avatar-small">👤</div>
        <div class="cliente-info-small">
          <h4>${cliente.nome}</h4>
          <p>CPF: ${cliente.cpf}</p>
        </div>
      `;
      container.appendChild(div);
    });
  }
  mostrarModal("modal-lista-clientes");
}

function filtrarClientes(e) {
  const termo = e.target.value.toLowerCase();
  document.querySelectorAll(".cliente-item").forEach((item) => {
    item.style.display = item.textContent.toLowerCase().includes(termo) ? "flex" : "none";
  });
}

function selecionarCliente(cliente) {
  const config = window.configManager.getConfig();
  const valorMinimo = config.sistema.valorMinimo;
  const valorPorGiro = config.sistema.valorPorGiro;

  const historicoCliente = sistema.historico.filter(
    (h) => h.participante_id === cliente.id,
  );

  sistema.sessaoAtiva = {
    participante: cliente,
    girosDisponiveis: cliente.giros_disponiveis,
    girosUsados: 0,
    historicoAtual: historicoCliente,
  };
  fecharModal();
  atualizarInterface();
  showToast(`Cliente ${cliente.nome} selecionado. Giros disponíveis: ${cliente.giros_disponiveis}`, "info");

  const todosIds = Array.from({ length: config.sistema.totalIds }, (_, i) => i + 1);
  const usedIdsFromHistory = new Set(sistema.historico.map(s => s.id_sorteado));
  sistema.idsUsados = Array.from(usedIdsFromHistory);
  sistema.idsDisponiveis = todosIds.filter(id => !usedIdsFromHistory.has(id));
}

async function processarCadastro(e) {
  e.preventDefault();

  const form = e.target;
  const nome = form.nome.value.trim();
  const cpf = form.cpf.value.trim();
  const telefone = form.telefone.value.trim();
  const email = form.email.value.trim();
  const valorAbastecido = Number.parseFloat(form.valor.value.replace("R$", "").replace(",", ".").trim()) || 0;

  if (!nome || !cpf || !telefone || valorAbastecido <= 0) {
    showToast("Preencha todos os campos obrigatórios e um valor de abastecimento válido.", "error");
    return;
  }

  const config = window.configManager.getConfig();
  const valorPorGiro = config.sistema.valorPorGiro;

  const giros = Math.floor(valorAbastecido / valorPorGiro);

  if (giros < 1) {
    showToast(`Valor insuficiente para um giro. Mínimo para 1 giro é R$ ${valorPorGiro.toFixed(2).replace('.', ',')}.`, "warning");
    return;
  }

  const novoClienteData = {
    nome: nome,
    cpf: cpf,
    telefone: telefone,
    email: email,
    giros: giros,
    valorAbastecido: valorAbastecido,
  };

  try {
    const response = await fetch(`${BASE_API_URL}/clientes/add.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(novoClienteData)
    });

    if (!response.ok) {
        if (response.status === 401 || response.status === 403) { window.location.href = 'posto-login.html'; return; }
        throw new Error(`Erro HTTP! status: ${response.status}`);
    }

    const result = await response.json();

    if (result.status === 'success') {
      showToast(`Cliente ${nome} cadastrado com ${giros} giros!`, "success");
      await carregarTodosDadosDoSistema();
      const clienteCadastrado = sistema.participantes.find(p => p.id === result.data.cliente_id);
      if (clienteCadastrado) {
          selecionarCliente(clienteCadastrado);
      } else {
          showToast("Cliente cadastrado, mas não foi possível selecioná-lo automaticamente.", "warning");
      }
    } else {
      showToast(`Erro ao cadastrar cliente: ${result.message}`, "error");
    }
  } catch (error) {
    console.error("Erro no cadastro de cliente:", error);
    showToast(`Erro de conexão ao cadastrar cliente: ${error.message}`, "error");
  }
}

async function girarRoleta() {
  if (girando) return;
  if (!sistema.sessaoAtiva) {
    showToast("Nenhum cliente selecionado. Selecione ou cadastre um cliente.", "warning");
    return;
  }
  if (sistema.sessaoAtiva.girosDisponiveis <= 0) {
    showToast("Giros esgotados para este cliente.", "warning");
    return;
  }
  if (sistema.idsDisponiveis.length === 0) {
    showToast("Não há mais IDs disponíveis para sorteio. O sistema precisa ser resetado.", "error");
    return;
  }

  girando = true;
  SONS.giro();
  const roleta = document.getElementById("roleta-svg");
  const btnCentral = document.getElementById("btn-central");
  const config = window.configManager.getConfig();

  btnCentral.disabled = true;
  btnCentral.querySelector("#btn-central-logo").style.display = "none";
  btnCentral.querySelector("#btn-central-text").style.display = "block";
  btnCentral.querySelector("#btn-central-text").textContent = "GIRANDO...";

  document.querySelector(".roleta-wrapper").classList.add("glow-effect");


  const randomIndex = Math.floor(Math.random() * sistema.idsDisponiveis.length);
  const idSorteado = sistema.idsDisponiveis[randomIndex];

  let ganhou = sistema.idsPremiados.includes(idSorteado);

  let premioTexto = "TENTE NOVAMENTE";
  let premioCor = "#94a3b8";
  let premioValor = 0;

  if (ganhou) {
    const premiosDisponiveisParaGanho = PREMIOS.filter(p => p.isPrize && p.estoque > 0);

    if (premiosDisponiveisParaGanho.length > 0) {
      const premioGanhado = premiosDisponiveisParaGanho[Math.floor(Math.random() * premiosDisponiveisParaGanho.length)];
      premioTexto = premioGanhado.text;
      premioCor = premioGanhado.color;
      premioValor = premioGanhado.valor;
    } else {
      ganhou = false; // Não ganhou de fato se não há estoque
      showToast("Não há prêmios disponíveis no estoque para sortear.", "warning");
    }
  }

  const totalSections = PREMIOS.length;
  const anguloPorSecao = 360 / totalSections;
  let winningIndex; // Índice do segmento vencedor no array PREMIOS

  // Determinar o índice do segmento vencedor para o cálculo do ângulo
  if (ganhou) {
    winningIndex = PREMIOS.findIndex(p => p.text === premioTexto);
  } else {
    // Se perdeu, tenta cair em um 'TENTE NOVAMENTE'
    winningIndex = PREMIOS.findIndex(p => p.text === "TENTE NOVAMENTE");
    if (winningIndex === -1) { 
      // Se não houver 'TENTE NOVAMENTE' específico, tenta cair em qualquer não-prêmio ou prêmio sem estoque
      const nonPrizeOrOutOfStockIndices = PREMIOS.map((p, i) => (!p.isPrize || p.estoque <= 0) ? i : -1).filter(i => i !== -1);
      if (nonPrizeOrOutOfStockIndices.length > 0) {
        winningIndex = nonPrizeOrOutOfStockIndices[Math.floor(Math.random() * nonPrizeOrOutOfStockIndices.length)];
      } else {
        // Último recurso: um índice aleatório (não deve acontecer com roleta bem configurada)
        winningIndex = Math.floor(Math.random() * totalSections); 
      }
    }
  }

  // --- NOVO CÁLCULO DO ÂNGULO FINAL ---
  // Calcula o ângulo do centro do segmento vencedor (partindo de 0 graus no 3h do SVG)
  const centerAngleOfWinningSegment = (winningIndex * anguloPorSecao) + (anguloPorSecao / 2);

  // Calcula a rotação necessária para trazer o centro do segmento vencedor para o topo (12h, que é 270 graus no sistema do SVG)
  // Adiciona 360 antes do módulo para garantir um resultado positivo
  const targetRotationWithinOneSpin = (270 - centerAngleOfWinningSegment + 360) % 360;

  // Adiciona múltiplas voltas completas para o efeito visual (ex: 5 voltas)
  const anguloFinal = (5 * 360) + targetRotationWithinOneSpin;
  // --- FIM DO NOVO CÁLCULO ---

  roleta.style.transition = `transform ${config.sistema.duracaoGiro / 1000}s cubic-bezier(0.25, 0.1, 0.25, 1)`;
  roleta.style.transform = `rotate(${anguloFinal}deg)`;

  const valorAbastecidoPorGiro = sistema.sessaoAtiva.participante.valor_abastecido / sistema.sessaoAtiva.participante.giros_disponiveis; // Corrigido aqui
  const sorteioData = {
    participante: {
      id: sistema.sessaoAtiva.participante.id,
      nome: sistema.sessaoAtiva.participante.nome,
      cpf: sistema.sessaoAtiva.participante.cpf,
    },
    id_sorteado: idSorteado,
    ganhou: ganhou,
    premio_nome: premioTexto,
    premio_valor: premioValor,
    giro_numero: sistema.sessaoAtiva.girosUsados + 1,
    total_giros_sessao: sistema.sessaoAtiva.participante.giros_disponiveis + sistema.sessaoAtiva.girosUsados, // Corrigido aqui: giros iniciais + giros já usados
    valor_por_giro_atual: valorAbastecidoPorGiro,
  };

  setTimeout(async () => {
    girando = false;
    roleta.style.transition = "none";
    roleta.style.transform = `rotate(${anguloFinal % 360}deg)`;

    document.querySelector(".roleta-wrapper").classList.remove("glow-effect");

    try {
        const response = await fetch(`${BASE_API_URL}/sorteios/register.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(sorteioData)
        });

        if (!response.ok) {
            if (response.status === 401 || response.status === 403) { window.location.href = 'posto-login.html'; return; }
            throw new Error(`Erro HTTP! status: ${response.status}`);
        }

        const result = await response.json();

        if (result.status === 'success') {
            showToast("Sorteio registrado com sucesso!", "success");
            sistema.historico.push(sorteioData);
            sistema.sessaoAtiva.girosUsados++;
            sistema.sessaoAtiva.girosDisponiveis--;

            const updatedCliente = sistema.participantes.find(p => p.id === sistema.sessaoAtiva.participante.id);
            if(updatedCliente) {
                updatedCliente.giros_disponiveis = sistema.sessaoAtiva.girosDisponiveis;
            }

            await carregarTodosDadosDoSistema();
            renderizarRoleta(); // Renderiza a roleta novamente com os prêmios atualizados (estoque diminuído)
        } else {
            showToast(`Erro ao registrar sorteio: ${result.message}`, "error");
        }
    } catch (error) {
        console.error("Erro ao registrar sorteio via API:", error);
        showToast(`Erro de conexão ao registrar sorteio: ${error.message}`, "error");
    } finally {
        btnCentral.disabled = false;
        btnCentral.querySelector("#btn-central-logo").style.display = "block";
        btnCentral.querySelector("#btn-central-text").style.display = "none";
        atualizarInterface();
        if (sorteioData.ganhou) {
          SONS.vitoria();
          showConfetti();
        } else {
          SONS.derrota();
        }
        mostrarResultado(sorteioData);
    }
  }, config.sistema.duracaoGiro + 100);
}

function mostrarResultado(resultado) {
  const modalResultado = document.getElementById("modal-resultado");
  const resultadoIcon = document.getElementById("resultado-icon");
  const resultadoTitle = document.getElementById("resultado-title");
  const resultadoNome = document.getElementById("resultado-nome");
  const resultadoCpf = document.getElementById("resultado-cpf");
  const resultadoIdNum = document.getElementById("resultado-id-num");
  const resultadoPremioNome = document.getElementById("resultado-premio-nome");
  const resultadoMensagem = document.getElementById("resultado-mensagem");

  modalResultado.classList.remove("resultado-ganhou", "resultado-perdeu");
  resultadoMensagem.classList.remove("ganhou", "perdeu");

  resultadoNome.textContent = resultado.participante.nome;
  resultadoCpf.textContent = `CPF: ${resultado.participante.cpf}`;
  resultadoIdNum.textContent = `#${resultado.id_sorteado}`;
  resultadoPremioNome.textContent = resultado.premio_nome.toUpperCase();

  if (resultado.ganhou) {
    resultadoIcon.textContent = "🎉";
    resultadoTitle.textContent = "PARABÉNS!";
    resultadoMensagem.textContent = `Você ganhou um(a) ${resultado.premio_nome}! O ID #${resultado.id_sorteado} é um ID premiado.`;
    modalResultado.classList.add("resultado-ganhou");
    resultadoMensagem.classList.add("ganhou");
  } else {
    resultadoIcon.textContent = "😔";
    resultadoTitle.textContent = "QUE PENA!";
    resultadoMensagem.textContent = `O ID #${resultado.id_sorteado} não foi premiado desta vez. Tente novamente!`;
    modalResultado.classList.add("resultado-perdeu");
    resultadoMensagem.classList.add("perdeu");
  }
  mostrarModal("modal-resultado");
}

function novoSorteio() {
  fecharModal();
  if (sistema.sessaoAtiva && sistema.sessaoAtiva.girosDisponiveis > 0) {
    setTimeout(girarRoleta, 500);
  } else {
    // NOVA LÓGICA: Giros esgotados. Direciona para a seleção de cliente.
    showToast("Giros esgotados para o cliente atual. Por favor, selecione outro cliente ou cadastre um novo.", "info");
    setTimeout(() => mostrarModal("modal-selecao-cliente"), 1000); // Abre o modal após 1 segundo
  }
}

function atualizarInterface() {
  const config = window.configManager.getConfig();

  document.getElementById("ids-restantes").textContent = sistema.idsDisponiveis.length;
  document.getElementById("premios-ganhos").textContent = sistema.historico.filter((h) => h.ganhou).length;
  document.getElementById("premios-disponiveis").textContent = PREMIOS.filter(p => p.isPrize).length;

  const clienteStatusDiv = document.getElementById("cliente-status");
  const btnCentral = document.getElementById("btn-central");
  const btnCentralLogo = btnCentral.querySelector("#btn-central-logo");
  const btnCentralText = btnCentral.querySelector("#btn-central-text");

  if (sistema.sessaoAtiva) {
    clienteStatusDiv.style.display = "flex";
    document.getElementById("cliente-nome-atual").textContent = sistema.sessaoAtiva.participante.nome;
    document.getElementById(
      "cliente-detalhes",
    ).textContent = `CPF: ${sistema.sessaoAtiva.participante.cpf} • Giros: ${sistema.sessaoAtiva.girosUsados}/${sistema.sessaoAtiva.participante.giros_disponiveis + sistema.sessaoAtiva.girosUsados}`;

    btnCentralLogo.style.display = "block";
    btnCentralText.style.display = "none";
    btnCentralText.textContent = "GIRAR";
  } else {
    clienteStatusDiv.style.display = "none";
    btnCentralLogo.style.display = "block";
    btnCentralText.style.display = "none";
    btnCentralText.textContent = "GIRAR";
  }
}

function trocarCliente() {
  sistema.sessaoAtiva = null;
  atualizarInterface();
  mostrarModal("modal-selecao-cliente");
}

function mostrarModal(id) {
  document.getElementById(id).classList.add("show");
  document.body.style.overflow = "hidden";
}

function fecharModal() {
  document.querySelectorAll(".modal").forEach((modal) => {
    modal.classList.remove("show");
  });
  document.body.style.overflow = "";
}

function showConfetti() {
  const confettiContainer = document.getElementById("confetti-container");
  for (let i = 0; i < 100; i++) {
    const confetti = document.createElement("div");
    confetti.className = "confetti-particle";
    confetti.style.backgroundColor = `hsl(${Math.random() * 360}, 100%, 50%)`;
    confetti.style.left = `${Math.random() * 100}vw`;
    confetti.style.animationDuration = `${Math.random() * 2 + 2}s`;
    confetti.style.animationDelay = `${Math.random() * 0.5}s`;
    confettiContainer.appendChild(confetti);
    confetti.addEventListener("animationend", () => confetti.remove());
  }
}