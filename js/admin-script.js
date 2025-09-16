// admin-script.js
// Admin Script - Painel Administrativo do Posto
let currentTab = "dashboard"
let premioEditando = null
let estoqueEditando = null
let sidebarCollapsed = false
// Cores para os prêmios rápidos (podem ser personalizadas)
const coresPremiosRapido = ["#fbce07", "#ff0000", "#43e97b", "#4facfe", "#8b5cf6", "#ff8c00", "#06d6a0", "#f093fb"]

document.addEventListener("DOMContentLoaded", async () => {
  console.log("ADMIN-SCRIPT DEBUG: DOMContentLoaded disparado.");
  console.log("ADMIN-SCRIPT DEBUG: Verificando status de login com postoManager.isLogado()...");

  if (!window.postoManager.isLogado()) {
    console.log("ADMIN-SCRIPT DEBUG: postoManager.isLogado() retornou false. Redirecionando para posto-login.html");
    window.location.href = "posto-login.html"
    return
  }

  console.log("ADMIN-SCRIPT DEBUG: postoManager.isLogado() retornou true. Inicializando painel...");
  await inicializarAdmin()
})

async function inicializarAdmin() {
  const postoData = window.postoManager.getPostoAtual();

  const configLoadedSuccessfully = await window.configManager.carregarConfig('posto', postoData.posto_id);

  if (!configLoadedSuccessfully) {
      console.warn("ADMIN-SCRIPT: Falha ao carregar ou definir a configuração do posto. Usando configuração padrão.");
  }

  if (postoData) {
    document.querySelector(".posto-nome").textContent = postoData.posto_nome;
  }

  window.configManager.aplicarCores();
  window.configManager.aplicarTextos();
  window.configManager.aplicarLogo();

  carregarDashboard();
  configurarEventListeners();
  // NOVA CHAMADA: Garante que os IDs premiados sejam atualizados ao carregar o painel.
  await atualizarIdsPremiadosBaseadoNoEstoque();
}

function configurarEventListeners() {
  // Logout
  document.getElementById("btn-logout").addEventListener("click", () => {
    if (confirm("Tem certeza que deseja sair?")) {
      window.postoManager.logout();
    }
  });

  // Dashboard actions
  document.getElementById("btn-reset-sistema")?.addEventListener("click", resetarSistema);
  document.getElementById("btn-backup")?.addEventListener("click", fazerBackup);

  // Prêmios
  document.getElementById("btn-add-premio")?.addEventListener("click", () => {
    premioEditando = null;
    mostrarModalPremio();
  });

  // Configurações
  document.getElementById("btn-salvar-config")?.addEventListener("click", salvarConfiguracoes);
  document.getElementById("btn-reset-config")?.addEventListener("click", resetarConfiguracoes);

  // Histórico
  document.getElementById("btn-limpar-historico")?.addEventListener("click", limparHistorico);

  // Clientes
  document.getElementById("search-clientes")?.addEventListener("input", filtrarClientes);

  // Modal prêmio
  document.getElementById("modal-premio-close")?.addEventListener("click", fecharModalPremio);
  document.getElementById("btn-cancelar-premio")?.addEventListener("click", fecharModalPremio);
  document.getElementById("form-premio")?.addEventListener("submit", salvarPremio);

  // Modal estoque
  document.getElementById("modal-estoque-close")?.addEventListener("click", fecharModalEstoque);
  document.getElementById("btn-cancelar-estoque")?.addEventListener("click", fecharModalEstoque);
  document.getElementById("form-estoque")?.addEventListener("submit", salvarEstoque);

  // Sidebar toggle
  document.getElementById("sidebar-toggle")?.addEventListener("click", toggleSidebar);
  document.getElementById("mobile-menu-btn")?.addEventListener("click", toggleSidebarMobile);

  // Navigation buttons
  document.querySelectorAll(".nav-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const tab = btn.dataset.tab;
      switchTab(tab);
    });
  });

  // Prêmios rápido
  document.getElementById("btn-processar-premios")?.addEventListener("click", processarPremiosRapido);
  document.getElementById("btn-limpar-input")?.addEventListener("click", limparInputPremios);
  document.getElementById("premios-rapido-input")?.addEventListener("input", atualizarPreviewPremios);
  document.getElementById("rapido-alternar-tente-novamente")?.addEventListener("change", atualizarPreviewPremios);

  // Estoque
  document.getElementById("btn-atualizar-estoque")?.addEventListener("click", carregarEstoque);
  document.getElementById("btn-relatorio-estoque")?.addEventListener("click", gerarRelatorioEstoque);

  // Personalização
  document.getElementById("btn-salvar-personalizacao")?.addEventListener("click", salvarPersonalizacao);
  document.getElementById("btn-reset-personalizacao")?.addEventListener("click", resetPersonalizacao);
  document
    .getElementById("btn-upload-logo")
    ?.addEventListener("click", () => document.getElementById("logo-upload").click());
  document.getElementById("logo-upload")?.addEventListener("change", handleLogoUpload);

  // Color inputs sync
  syncColorInputs();

  // Filtro de resultados
  document.getElementById("filter-resultados")?.addEventListener("change", filtrarResultados);

  // Modal backdrop clicks
  document.getElementById("modal-premio")?.addEventListener("click", (e) => {
    if (e.target.classList.contains("modal-backdrop")) {
      fecharModalPremio();
    }
  });

  document.getElementById("modal-estoque")?.addEventListener("click", (e) => {
    if (e.target.classList.contains("modal-backdrop")) {
      fecharModalEstoque();
    }
  });

  document.getElementById("mobile-menu-btn")?.addEventListener("click", toggleSidebarMobile);
  document.getElementById("mobile-overlay")?.addEventListener("click", toggleSidebarMobile);
}

function updatePageTitle(tabName) {
  const title = tabName.charAt(0).toUpperCase() + tabName.slice(1);
  document.title = `${title} - Admin Roleta Premium`;
}

async function switchTab(tabName) {
  // Atualizar botões de navegação
  document.querySelectorAll(".nav-btn").forEach((btn) => {
    btn.classList.remove("active");
  });
  document.querySelector(`[data-tab="${tabName}"]`)?.classList.add("active");

  // Atualizar conteúdo
  document.querySelectorAll(".tab-panel").forEach((panel) => {
    panel.classList.remove("active");
  });
  document.getElementById(`${tabName}-tab`)?.classList.add("active");

  updatePageTitle(tabName);

  currentTab = tabName;

  // Carregar conteúdo específico
  switch (tabName) {
    case "dashboard":
      carregarDashboard();
      carregarAtividadeRecente();
      break;
    case "premios":
      await carregarPremios();
      break;
    case "premios-rapido":
      atualizarPreviewPremios(); // Garante que o preview seja atualizado ao mudar para a aba
      break;
    case "estoque":
      await carregarEstoque();
      break;
    case "resultados":
      await carregarUltimosResultados();
      break;
    case "personalizacao":
      carregarPersonalizacao();
      break;
    case "configuracoes":
      carregarConfiguracoes();
      break;
    case "historico":
      await carregarHistorico();
      break;
    case "clientes":
      await carregarClientes();
      break;
  }
}

async function carregarDashboard() {
  try {
    const postoData = window.postoManager.getPostoAtual();
    // **CORREÇÃO:** Usar postoData.posto_id
    if (!postoData || !postoData.posto_id) {
        console.log("DEBUG: postoData ou postoData.posto_id ausente ao carregar dashboard.");
        return;
    }
    console.log(`DEBUG: Carregando dashboard para posto_id: ${postoData.posto_id}`);

    // **CORREÇÃO:** Caminho para 'postos_stats.php' (plural)
    const response = await fetch(`${BASE_API_URL}/dashboard/postos_stats.php?posto_id=${postoData.posto_id}`);
    
    if (!response.ok) {
        // Log detalhado para depuração do loop
        console.error(`DEBUG: Erro na resposta HTTP para dashboard: Status ${response.status}`);
        if (response.status === 401 || response.status === 403) {
            console.log("DEBUG: Redirecionando para posto-login.html devido a 401/403.");
            window.location.href = 'posto-login.html';
            return;
        }
        throw new Error(`Erro HTTP! status: ${response.status}`);
    }
    const result = await response.json();

    if (result.status === 'success') {
        const stats = result.data;
        document.getElementById("dash-ids-restantes").textContent = stats.ids_restantes;
        document.getElementById("dash-premios-ganhos").textContent = stats.premios_ganhos;
        document.getElementById("dash-premios-disponiveis").textContent = stats.premios_disponiveis;
        document.getElementById("dash-total-clientes").textContent = stats.total_clientes;
        console.log("DEBUG: Dashboard carregado com sucesso.");

        // --- NOVO CÓDIGO PARA IDS PREMIADOS ---
        const config = window.configManager.getConfig(); // Obtém a configuração atual
        const idsPremiadosContainer = document.getElementById("dashboard-ids-premiados");
        if (idsPremiadosContainer) {
            if (config && config.idsPremiados && config.idsPremiados.length > 0) {
                idsPremiadosContainer.innerHTML = config.idsPremiados
                    .map(id => `<span style="
                        background-color: var(--blue-primary); 
                        color: white; 
                        padding: 4px 8px; 
                        border-radius: 4px; 
                        font-size: 0.8em; 
                        font-weight: 600;
                    ">#${id}</span>`)
                    .join("");
            } else {
                idsPremiadosContainer.innerHTML = `<span style="color: var(--color-text-secondary);">Nenhum ID premiado definido.</span>`;
            }
        }
        // --- FIM DO NOVO CÓDIGO ---

    } else {
        console.error("DEBUG: Erro ao carregar dashboard:", result.message);
        showToast(`Erro ao carregar dashboard: ${result.message}`, "error");
    }
  } catch (error) {
    console.error("DEBUG: Exceção ao carregar dashboard:", error);
    showToast(`Erro ao carregar dashboard: ${error.message}`, "error");
  }
}

async function carregarPremios() {
  const container = document.getElementById("premios-list");
  if (!container) return;

  const postoData = window.postoManager.getPostoAtual();
  if (!postoData || !postoData.posto_id) return;

  try {
    const response = await fetch(`${BASE_API_URL}/premios/get.php?posto_id=${postoData.posto_id}`);

    if (!response.ok) {
        if (response.status === 401 || response.status === 403) { window.location.href = 'posto-login.html'; return; }
        throw new Error(`Erro HTTP! status: ${response.status}`);
    }
    const result = await response.json();

    if (result.status === 'success') {
      const premios = result.data;
      container.innerHTML = "";

      if (premios.length === 0) {
        container.innerHTML = `
        <div class="no-results">
          <div class="no-results-icon">🏆</div>
          <p>Nenhum prêmio cadastrado ainda</p>
        </div>
      `;
        return;
      }

      premios.forEach((premio) => {
        const premioCard = document.createElement("div");
        premioCard.className = "premio-card";
        premioCard.innerHTML = `
        <div class="premio-header">
          <div class="premio-color" style="background: ${premio.color}"></div>
          <h3>${premio.text}</h3>
          <div class="premio-badge ${premio.isPrize ? "premio" : "tente-novamente"}">
            ${premio.isPrize ? "PRÊMIO" : "TENTE NOVAMENTE"}
          </div>
        </div>
        <div class="premio-info">
          <div class="info-item">
            <span class="label">Estoque:</span>
            <span class="value">${premio.estoque || 0}</span>
          </div>
          <div class="info-item">
            <span class="label">Valor:</span>
            <span class="value">R$ ${parseFloat(premio.valor || 0).toFixed(2).replace('.', ',')}</span>
          </div>
        </div>
        <div class="premio-actions">
          <button class="btn btn-sm btn-secondary" onclick="editarPremio(${premio.id})">
            <span>✏️</span>
            <span>Editar</span>
          </button>
          <button class="btn btn-sm btn-danger" onclick="removerPremio(${premio.id})">
            <span>🗑️</span>
            <span>Remover</span>
          </button>
        </div>
      `;
        container.appendChild(premioCard);
    });
    } else {
        console.error("Erro ao carregar prêmios:", result.message);
        showToast(`Erro ao carregar prêmios: ${result.message}`, "error");
    }
  } catch (error) {
    console.error("Erro ao carregar prêmios:", error);
    showToast(`Erro ao carregar prêmios: ${error.message}`, "error");
  }
}

async function carregarEstoque() {
  const container = document.getElementById("estoque-list");
  if (!container) return;

  const postoData = window.postoManager.getPostoAtual();
  if (!postoData || !postoData.posto_id) return;

  try {
    const premiosResponse = await fetch(`${BASE_API_URL}/premios/get.php?posto_id=${postoData.posto_id}`);
    const premiosResult = await premiosResponse.json();
    if (!premiosResponse.ok || premiosResult.status !== 'success') {
        if (premiosResponse.status === 401 || premiosResponse.status === 403) { window.location.href = 'posto-login.html'; return; }
        throw new Error(`Erro ao buscar prêmios: ${premiosResult.message || premiosResponse.statusText}`);
    }
    const premios = premiosResult.data.filter((p) => p.isPrize);

    const historicoResponse = await fetch(`${BASE_API_URL}/sorteios/get.php?posto_id=${postoData.posto_id}`);
    const historicoResult = await historicoResponse.json();
    if (!historicoResponse.ok || historicoResult.status !== 'success') {
        if (historicoResponse.status === 401 || historicoResponse.status === 403) { window.location.href = 'posto-login.html'; return; }
        throw new Error(`Erro ao buscar histórico: ${historicoResult.message || historicoResponse.statusText}`);
    }
    const historico = historicoResult.data;

    container.innerHTML = "";

    if (premios.length === 0) {
      container.innerHTML = `
      <div class="no-results">
        <div class="no-results-icon">📦</div>
        <p>Nenhum prêmio para controlar estoque</p>
      </div>
    `;
      return;
    }

    premios.forEach((premio) => {
      const ganhosCount = historico.filter((h) => h.ganhou && h.premio === premio.text).length;
      const estoqueOriginal = premio.estoque || 0;
      const estoqueAtual = Math.max(0, estoqueOriginal - ganhosCount);
      const progresso = estoqueOriginal > 0 ? (estoqueAtual / estoqueOriginal) * 100 : 0;

      let progressClass = "high";
      if (progresso <= 10) {
        progressClass = "critical";
      } else if (progresso <= 40) {
        progressClass = "low";
      }

      const estoqueCard = document.createElement("div");
      estoqueCard.className = "estoque-card";
      estoqueCard.innerHTML = `
      <div class="estoque-header">
        <div class="estoque-color" style="background: ${premio.color}"></div>
        <h4 class="estoque-nome">${premio.text}</h4>
      </div>
      <div class="estoque-body">
        <div class="estoque-stat">
          <span class="label">Estoque Inicial</span>
          <span class="value">${estoqueOriginal}</span>
        </div>
        <div class="estoque-stat">
          <span class="label">Ganhos</span>
          <span class="value">${ganhosCount}</span>
        </div>
        <div class="estoque-stat principal">
          <span class="label">Disponível</span>
          <span class="value">${estoqueAtual}</span>
        </div>
      </div>
      <div class="estoque-progress">
        <div class="progress-bar-container">
          <div class="progress-bar ${progressClass}" style="width: ${progresso}%"></div>
        </div>
        <span class="progress-label">${Math.round(progresso)}%</span>
      </div>
      <div class="estoque-actions">
        <button class="btn btn-sm btn-secondary" onclick="ajustarEstoque(${premio.id})">
          <span>📝</span>
          <span>Ajustar</span>
        </button>
      </div>
    `;
        container.appendChild(estoqueCard);
    });
  } catch (error) {
    console.error("Erro ao carregar estoque:", error);
    showToast(`Erro ao carregar estoque: ${error.message}`, "error");
  }
}

function carregarConfiguracoes() {
  const config = window.configManager.getConfig();

  document.getElementById("config-valor-minimo").value = config.sistema?.valorMinimo || 50;
  document.getElementById("config-valor-giro").value = config.sistema?.valorPorGiro || 100;
  document.getElementById("config-total-ids").value = config.sistema?.totalIds || 200;
  document.getElementById("config-duracao-giro").value = config.sistema?.duracaoGiro || 4500;
}

async function carregarHistorico() {
  const container = document.getElementById("historico-container");
  if (!container) return;

  const postoData = window.postoManager.getPostoAtual();
  if (!postoData || !postoData.posto_id) return;

  try {
    const response = await fetch(`${BASE_API_URL}/sorteios/get.php?posto_id=${postoData.posto_id}`);

    if (!response.ok) {
        if (response.status === 401 || response.status === 403) { window.location.href = 'posto-login.html'; return; }
        throw new Error(`Erro HTTP! status: ${response.status}`);
    }
    const result = await response.json();

    if (result.status === 'success') {
      const historico = result.data;
      container.innerHTML = "";

      if (historico.length === 0) {
        container.innerHTML = `
        <div class="no-results">
          <div class="no-results-icon">📋</div>
          <p>Nenhum sorteio realizado ainda</p>
        </div>
      `;
        return;
      }

      historico.forEach((item) => {
        const historicoItem = document.createElement("div");
        historicoItem.className = `historico-item ${item.ganhou ? "ganhou" : "perdeu"}`;
        historicoItem.innerHTML = `
        <div class="historico-header">
          <div class="historico-icon">${item.ganhou ? "🏆" : "😔"}</div>
          <div class="historico-info">
            <h4>${item.cliente_nome}</h4>
            <p>${item.cliente_cpf}</p>
          </div>
          <div class="historico-resultado">
            <span class="id-sorteado">#${item.id_sorteado}</span>
            <span class="premio">${item.premio_nome}</span>
          </div>
        </div>
        <div class="historico-details">
          <span>Valor: R$ ${parseFloat(item.premio_valor || 0).toFixed(2).replace('.', ',')}</span>
          <span>Giro: ${item.giro_numero}/${item.total_giros_sessao}</span>
          <span>${new Date(item.timestamp).toLocaleString("pt-BR")}</span>
        </div>
      `;
        container.appendChild(historicoItem);
    });
    } else {
        console.error("Erro ao carregar histórico:", result.message);
        showToast(`Erro ao carregar histórico: ${result.message}`, "error");
    }
  } catch (error) {
    console.error("Erro ao carregar histórico:", error);
    showToast(`Erro ao carregar histórico: ${error.message}`, "error");
  }
}

async function carregarClientes() {
  const container = document.getElementById("clientes-container");
  if (!container) return;

  const postoData = window.postoManager.getPostoAtual();
  if (!postoData || !postoData.posto_id) return;

  try {
    const response = await fetch(`${BASE_API_URL}/clientes/get.php?posto_id=${postoData.posto_id}`);

    if (!response.ok) {
        if (response.status === 401 || response.status === 403) { window.location.href = 'posto-login.html'; return; }
        throw new Error(`Erro HTTP! status: ${response.status}`);
    }
    const result = await response.json();

    if (result.status === 'success') {
      const clientes = result.data;
      container.innerHTML = "";

      if (clientes.length === 0) {
        container.innerHTML = `
        <div class="no-results">
          <div class="no-results-icon">👥</div>
          <p>Nenhum cliente cadastrado ainda</p>
        </div>
      `;
        return;
      }

      clientes.forEach((cliente) => {
        const clienteItem = document.createElement("div");
        clienteItem.className = "cliente-item-admin";
        clienteItem.innerHTML = `
        <div class="cliente-avatar">👤</div>
        <div class="cliente-info">
          <h4>${cliente.nome}</h4>
          <p>CPF: ${cliente.cpf}</p>
          <p>Telefone: ${cliente.telefone}</p>
          ${cliente.email ? `<p>E-mail: ${cliente.email}</p>` : ""}
        </div>
        <div class="cliente-meta">
          <span class="data-cadastro">Cadastrado em: ${new Date(cliente.created_at).toLocaleDateString("pt-BR")}</span>
        </div>
      `;
        container.appendChild(clienteItem);
    });
    } else {
        console.error("Erro ao carregar clientes:", result.message);
        showToast(`Erro ao carregar clientes: ${result.message}`, "error");
    }
  } catch (error) {
    console.error("Erro ao carregar clientes:", error);
    showToast(`Erro ao carregar clientes: ${error.message}`, "error");
  }
}

async function mostrarModalPremio(premioId = null) {
  const modal = document.getElementById("modal-premio");
  const title = document.getElementById("modal-premio-title");
  const form = document.getElementById("form-premio");
  form.reset();

  const addTenteNovamenteCheckbox = document.getElementById("premio-add-tente-novamente");
  if (addTenteNovamenteCheckbox) {
      addTenteNovamenteCheckbox.checked = false;
      addTenteNovamenteCheckbox.disabled = premioId !== null;
  }

  if (premioId) {
    const postoData = window.postoManager.getPostoAtual();
    try {
        const response = await fetch(`${BASE_API_URL}/premios/get.php?posto_id=${postoData.posto_id}`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const result = await response.json();
        if (result.status !== 'success') throw new Error(result.message);

        const premio = result.data.find(p => p.id === premioId);
        if (!premio) {
            showToast("Prêmio não encontrado.", "error");
            return;
        }

        title.textContent = "Editar Prêmio";
        document.getElementById("premio-nome").value = premio.text;
        document.getElementById("premio-cor").value = premio.color;
        document.getElementById("premio-estoque").value = premio.estoque || 0;
        document.getElementById("premio-valor").value = premio.valor || 0;
        document.getElementById("premio-is-prize").checked = premio.isPrize;
        premioEditando = premio.id;
    } catch (error) {
        console.error("Erro ao carregar dados do prêmio para edição:", error);
        showToast(`Erro ao carregar prêmio: ${error.message}`, "error");
        return;
    }
  } else {
    title.textContent = "Adicionar Prêmio";
    document.getElementById("premio-is-prize").checked = true;
    premioEditando = null;
  }

  modal.classList.add("show");
}

async function fecharModalPremio() {
  document.getElementById("modal-premio").classList.remove("show");
  premioEditando = null;
  await carregarPremios();
  if (currentTab === "estoque") await carregarEstoque();
}

async function mostrarModalEstoque(premioId) {
  const postoData = window.postoManager.getPostoAtual();
  try {
    const response = await fetch(`${BASE_API_URL}/premios/get.php?posto_id=${postoData.posto_id}`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const result = await response.json();
    if (result.status !== 'success') throw new Error(result.message);

    const premio = result.data.find(p => p.id === premioId);
    if (!premio) {
      showToast("Prêmio não encontrado para ajuste de estoque.", "error");
      return;
    }

    estoqueEditando = premio.id;
    document.getElementById("estoque-premio-nome").value = premio.text;
    document.getElementById("estoque-atual").value = premio.estoque || 0;
    document.getElementById("estoque-novo").value = premio.estoque || 0;
    document.getElementById("modal-estoque").classList.add("show");
  } catch (error) {
    console.error("Erro ao carregar dados do prêmio para ajuste de estoque:", error);
    showToast(`Erro ao carregar estoque do prêmio: ${error.message}`, "error");
  }
}

async function fecharModalEstoque() {
  document.getElementById("modal-estoque").classList.remove("show");
  estoqueEditando = null;
  if (currentTab === "estoque") await carregarEstoque();
}

function editarPremio(premioId) {
  premioEditando = premioId;
  mostrarModalPremio(premioId);
}

function ajustarEstoque(premioId) {
  mostrarModalEstoque(premioId);
}

async function removerPremio(premioId) {
  if (confirm("Tem certeza que deseja remover este prêmio?")) {
    try {
      const postoData = window.postoManager.getPostoAtual();
      const response = await fetch(`${BASE_API_URL}/premios/delete.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: premioId, posto_id: postoData.posto_id })
      });
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) { window.location.href = 'posto-login.html'; return; }
        throw new Error(`Erro HTTP! status: ${response.status}`);
      }
      const result = await response.json();

      if (result.status === 'success') {
        showToast("Prêmio removido com sucesso!", "success");
        await carregarPremios();
        if (currentTab === "estoque") await carregarEstoque();
        // NOVA CHAMADA: Atualiza IDs premiados após remover um prêmio
        await atualizarIdsPremiadosBaseadoNoEstoque();
      } else {
        showToast(`Erro ao remover prêmio: ${result.message}`, "error");
      }
    } catch (error) {
      console.error("Erro ao remover prêmio:", error);
      showToast(`Erro ao remover prêmio: ${error.message}`, "error");
    }
  }
}

async function salvarPremio(e) {
  e.preventDefault();
  const nome = document.getElementById("premio-nome").value.trim();
  if (!nome) {
    showToast("Nome do prêmio é obrigatório", "error");
    return;
  }

  const postoData = window.postoManager.getPostoAtual();
  const premioData = {
    id: premioEditando,
    posto_id: postoData.posto_id,
    text: nome,
    color: document.getElementById("premio-cor").value,
    estoque: Number.parseInt(document.getElementById("premio-estoque").value) || 0,
    valor: Number.parseFloat(document.getElementById("premio-valor").value) || 0,
    isPrize: document.getElementById("premio-is-prize").checked,
  };

  const url = premioEditando ? `${BASE_API_URL}/premios/update.php` : `${BASE_API_URL}/premios/add.php`;
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(premioData)
    });
    if (!response.ok) {
        if (response.status === 401 || response.status === 403) { window.location.href = 'posto-login.html'; return; }
        throw new Error(`Erro HTTP! status: ${response.status}`);
    }
    const result = await response.json();

    if (result.status === 'success') {
      showToast("Prêmio salvo com sucesso!", "success");
      fecharModalPremio();
      // NOVA CHAMADA: Atualiza IDs premiados após salvar/adicionar um prêmio
      await atualizarIdsPremiadosBaseadoNoEstoque();
    } else {
      showToast(`Erro ao salvar prêmio: ${result.message}`, "error");
    }
  } catch (error) {
    console.error("Erro ao salvar prêmio:", error);
    showToast(`Erro ao salvar prêmio: ${error.message}`, "error");
  }

  const addTenteNovamenteCheckbox = document.getElementById("premio-add-tente-novamente");
  if (addTenteNovamenteCheckbox && addTenteNovamenteCheckbox.checked && premioData.isPrize && !premioEditando) {
      // Logic for "TENTE NOVAMENTE" would be handled in the backend or a separate call
  }
}

async function salvarEstoque(e) {
  e.preventDefault();
  if (estoqueEditando === null) return;

  const novoEstoque = Number.parseInt(document.getElementById("estoque-novo").value) || 0;
  const postoData = window.postoManager.getPostoAtual();

  try {
    const responseGet = await fetch(`${BASE_API_URL}/premios/get.php?posto_id=${postoData.posto_id}`);
    if (!responseGet.ok) throw new Error(`HTTP error! status: ${responseGet.status}`);
    const resultGet = await responseGet.json();
    if (resultGet.status !== 'success') throw new Error(resultGet.message);

    const premio = resultGet.data.find(p => p.id === estoqueEditando);
    if (!premio) {
      showToast("Prêmio não encontrado para ajuste de estoque.", "error");
      return;
    }

    const premioUpdateData = {
      id: premio.id,
      posto_id: postoData.posto_id,
      text: premio.text,
      color: premio.color,
      isPrize: premio.isPrize,
      estoque: novoEstoque,
      valor: premio.valor
    };

    const responseUpdate = await fetch(`${BASE_API_URL}/premios/update.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(premioUpdateData)
    });
    if (!responseUpdate.ok) {
        if (responseUpdate.status === 401 || response.status === 403) { window.location.href = 'posto-login.html'; return; }
        throw new Error(`Erro HTTP! status: ${responseUpdate.status}`);
    }
    const resultUpdate = await responseUpdate.json();

    if (resultUpdate.status === 'success') {
      showToast("Estoque atualizado com sucesso!", "success");
      fecharModalEstoque();
      // NOVA CHAMADA: Atualiza IDs premiados após ajustar o estoque
      await atualizarIdsPremiadosBaseadoNoEstoque();
    } else {
      showToast(`Erro ao atualizar estoque: ${resultUpdate.message}`, "error");
    }
  } catch (error) {
    console.error("Erro ao salvar estoque:", error);
    showToast(`Erro ao salvar estoque: ${error.message}`, "error");
  }
}

async function salvarConfiguracoes() {
  try {
    const config = window.configManager.getConfig();
    if (!config.sistema) {
        config.sistema = {};
    }
    config.sistema.valorMinimo = Number.parseFloat(document.getElementById("config-valor-minimo").value) || 50;
    config.sistema.valorPorGiro = Number.parseFloat(document.getElementById("config-valor-giro").value) || 100;
    config.sistema.totalIds = Number.parseInt(document.getElementById("config-total-ids").value) || 200;
    config.sistema.duracaoGiro = Number.parseInt(document.getElementById("config-duracao-giro").value) || 4500;

    const postoData = window.postoManager.getPostoAtual();
    const saved = await window.configManager.salvarConfig('posto', postoData.posto_id, config);
    if (saved) {
      showToast("Configurações salvas com sucesso!", "success");
    } else {
      showToast(`Erro ao salvar configurações.`, "error");
    }
  } catch (error) {
    showToast(`Erro ao salvar configurações: ${error.message}`, "error");
  }
}

async function resetarConfiguracoes() {
  if (confirm("Tem certeza que deseja restaurar as configurações padrão?")) {
    const postoData = window.postoManager.getPostoAtual();
    try {
        const defaultConfig = window.configManager.getConfigPadrao();
        if (postoData && postoData.posto_nome) {
            defaultConfig.sistema.nomeCliente = postoData.posto_nome;
        }

        const saved = await window.configManager.salvarConfig('posto', postoData.posto_id, defaultConfig);
        if (saved) {
            window.configManager.aplicarCores();
            window.configManager.aplicarTextos();
            window.configManager.aplicarLogo();
            carregarConfiguracoes();
            showToast("Configurações restauradas para o padrão", "success");
        } else {
            showToast(`Erro ao restaurar configurações.`, "error");
        }
    } catch (error) {
        console.error("Erro ao resetar configurações:", error);
        showToast(`Erro ao resetar configurações: ${error.message}`, "error");
    }
  }
}

async function resetarSistema() {
  if (confirm("ATENÇÃO: Isso irá resetar todos os dados do sistema (IDs, histórico, clientes). Tem certeza?")) {
    const postoData = window.postoManager.getPostoAtual();
    try {
      const response = await fetch(`${BASE_API_URL}/system/clear_history.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ posto_id: postoData.posto_id })
      });
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) { window.location.href = 'posto-login.html'; return; }
        throw new Error(`Erro HTTP! status: ${response.status}`);
      }
      const result = await response.json();

      if (result.status === 'success') {
        showToast("Sistema resetado com sucesso! Recarregando...", "success");
        // NOVA CHAMADA: Após resetar o sistema (limpar histórico), recalculamos os IDs premiados
        await atualizarIdsPremiadosBaseadoNoEstoque(); // Isso também garantirá que idsPremiados seja [] se não houver estoque
        setTimeout(() => window.location.reload(), 1500);
      } else {
        showToast(`Erro ao resetar sistema: ${result.message}`, "error");
      }
    } catch (error) {
      console.error("Erro ao resetar sistema:", error);
      showToast(`Erro ao resetar sistema: ${error.message}`, "error");
    }
  }
}

async function fazerBackup() {
  const postoData = window.postoManager.getPostoAtual();
  try {
    window.location.href = `${BASE_API_URL}/system/backup.php?type=posto&posto_id=${postoData.posto_id}`;
    showToast("Backup realizado com sucesso! Verifique seus downloads.", "success");
  } catch (error) {
    console.error("Erro ao fazer backup:", error);
    showToast(`Erro ao fazer backup: ${error.message}`, "error");
  }
}

async function limparHistorico() {
  if (confirm("Tem certeza que deseja limpar todo o histórico de sorteios?")) {
    const postoData = window.postoManager.getPostoAtual();
    try {
      const response = await fetch(`${BASE_API_URL}/system/clear_history.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ posto_id: postoData.posto_id })
      });
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) { window.location.href = 'posto-login.html'; return; }
        throw new Error(`Erro HTTP! status: ${response.status}`);
      }
      const result = await response.json();

      if (result.status === 'success') {
        showToast("Histórico limpo com sucesso!", "success");
        await carregarHistorico();
        carregarDashboard();
        // NOVA CHAMADA: Atualiza IDs premiados após limpar o histórico
        await atualizarIdsPremiadosBaseadoNoEstoque();
      } else {
        showToast(`Erro ao limpar histórico: ${result.message}`, "error");
      }
    } catch (error) {
      console.error("Erro ao limpar histórico:", error);
      showToast(`Erro ao limpar histórico: ${error.message}`, "error");
    }
  }
}

function filtrarClientes(e) {
  const termo = e.target.value.toLowerCase();
  document.querySelectorAll(".cliente-item-admin").forEach((item) => {
    item.style.display = item.textContent.toLowerCase().includes(termo) ? "flex" : "none";
  });
}

function toggleSidebar() {
  sidebarCollapsed = !sidebarCollapsed;
  document.getElementById("admin-sidebar").classList.toggle("collapsed", sidebarCollapsed);
}

function toggleSidebarMobile() {
  const sidebar = document.getElementById("admin-sidebar");
  const main = document.getElementById("admin-main");
  const overlay = document.getElementById("mobile-overlay");
  sidebar.classList.toggle("show", sidebarCollapsed); // Use sidebarCollapsed for state
  main.classList.toggle("full-width", !sidebarCollapsed); // Adjust main content width
  overlay.classList.toggle("show");
}

// ATUALIZADO: Inclui lógica para intercalar TENTE NOVAMENTE no preview
function atualizarPreviewPremios() {
  const input = document.getElementById("premios-rapido-input").value;
  const preview = document.getElementById("premios-preview");
  const lines = input.split(/\r?\n/).filter((line) => line.trim()); // Use /\r?\n/ for cross-platform newlines
  const alternarTenteNovamente = document.getElementById("rapido-alternar-tente-novamente")?.checked;

  if (lines.length === 0) {
    preview.innerHTML = `<div class="preview-empty"><span>Digite os prêmios para ver o preview</span></div>`;
    return;
  }

  let prizesForPreview = [];
  const tenteNovamenteTemplate = window.configManager.getTenteNovamenteTemplate();
  let realPrizeCounter = 0; // Para ciclar as cores dos prêmios reais

  lines.forEach((line) => {
    const match = line.match(/^(\d+)\s+(.+)$/);
    if (match) {
      const [, quantidade, nome] = match;
      prizesForPreview.push({
        text: nome.trim(),
        color: coresPremiosRapido[realPrizeCounter % coresPremiosRapido.length],
        isPrize: true,
        estoque: parseInt(quantidade),
        valor: 0,
      });
      realPrizeCounter++;

      if (alternarTenteNovamente) {
        prizesForPreview.push({
          text: tenteNovamenteTemplate.text,
          color: tenteNovamenteTemplate.color,
          isPrize: false,
          estoque: tenteNovamenteTemplate.estoque,
          valor: tenteNovamenteTemplate.valor,
        });
      }
    }
  });

  if (prizesForPreview.length === 0) {
    preview.innerHTML = `<div class="no-results"><span>Nenhum prêmio válido encontrado no formato. Verifique o formato: QUANTIDADE NOME_DO_PRÊMIO.</span></div>`;
    return;
  }

  preview.innerHTML = prizesForPreview
    .map((item) => {
      const badgeClass = item.isPrize ? "premio" : "tente-novamente";
      const badgeText = item.isPrize ? "PRÊMIO" : "TENTE NOVAMENTE";
      const quantityDisplay = item.isPrize ? `Qtd: ${item.estoque}` : '';

      return `
        <div class="preview-item">
          <div class="preview-info">
            <div class="preview-color" style="background: ${item.color}"></div>
            <span class="preview-name">${item.text.toUpperCase()}</span>
          </div>
          <span class="preview-quantity">${quantityDisplay}</span>
          <div class="premio-badge ${badgeClass}">${badgeText}</div>
        </div>`;
    })
    .join("");
}

// ATUALIZADO: Inclui lógica para intercalar TENTE NOVAMENTE no processamento e salvamento
async function processarPremiosRapido() {
  const input = document.getElementById("premios-rapido-input").value;
  const lines = input.split(/\r?\n/).filter((line) => line.trim()); // Use /\r?\n/ for cross-platform newlines
  if (lines.length === 0) {
    showToast("Digite os prêmios primeiro", "error");
    return;
  }

  const postoData = window.postoManager.getPostoAtual();
  let premiosToAdd = [];
  const alternarTenteNovamente = document.getElementById("rapido-alternar-tente-novamente")?.checked;
  const tenteNovamenteTemplate = window.configManager.getTenteNovamenteTemplate();
  let realPrizeCounter = 0; // Para ciclar as cores dos prêmios reais

  for (const line of lines) {
    const match = line.match(/^(\d+)\s+(.+)$/);
    if (match) {
      const [, quantidade, nome] = match;
      premiosToAdd.push({
        posto_id: postoData.posto_id,
        text: nome.trim().toUpperCase(),
        color: coresPremiosRapido[realPrizeCounter % coresPremiosRapido.length],
        estoque: Number.parseInt(quantidade),
        valor: 0,
        isPrize: true,
      });
      realPrizeCounter++;

      if (alternarTenteNovamente) {
        premiosToAdd.push({
          posto_id: postoData.posto_id,
          text: tenteNovamenteTemplate.text,
          color: tenteNovamenteTemplate.color,
          estoque: tenteNovamenteTemplate.estoque,
          valor: tenteNovamenteTemplate.valor,
          isPrize: false,
        });
      }
    }
  }

  if (premiosToAdd.length === 0) {
    showToast("Nenhum prêmio válido encontrado no formato correto. Verifique o formato: QUANTIDADE NOME_DO_PRÊMIO.", "error");
    return;
  }

  try {
    let successCount = 0;
    for (const premio of premiosToAdd) {
      const response = await fetch(`${BASE_API_URL}/premios/add.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(premio)
      });
      if (response.ok) {
        const result = await response.json();
        if (result.status === 'success') {
          successCount++;
        } else {
          console.error("Erro ao adicionar prêmio individual:", result.message);
          showToast(`Falha ao adicionar prêmio: ${premio.text} - ${result.message}`, "error");
        }
      } else {
        console.error(`Erro HTTP ao adicionar prêmio ${premio.text}: ${response.status}`);
        showToast(`Erro de conexão ao adicionar prêmio: ${premio.text}`, "error");
      }
    }

    if (successCount > 0) {
      showToast(`${successCount} prêmio(s) adicionado(s) com sucesso!`, "success");
      document.getElementById("premios-rapido-input").value = "";
      atualizarPreviewPremios();
      if (currentTab === "premios") await carregarPremios();
      if (currentTab === "estoque") await carregarEstoque();
      // NOVA CHAMADA: Atualiza IDs premiados após processar prêmios rápidos
      await atualizarIdsPremiadosBaseadoNoEstoque();
    } else {
      showToast("Nenhum prêmio foi adicionado com sucesso. Verifique o formato ou a conexão.", "error");
    }
  } catch (error) {
    console.error("Erro ao processar prêmios rápido:", error);
    showToast(`Erro ao processar prêmios rápido: ${error.message}`, "error");
  }
}

// ATUALIZADO: Reseta também o checkbox de intercalação
function limparInputPremios() {
  document.getElementById("premios-rapido-input").value = "";
  const alternarTenteNovamenteCheckbox = document.getElementById("rapido-alternar-tente-novamente");
  if (alternarTenteNovamenteCheckbox) {
      alternarTenteNovamenteCheckbox.checked = false;
  }
  atualizarPreviewPremios();
}

function gerarRelatorioEstoque() {
  showToast("Função de relatório de estoque em desenvolvimento.", "info");
}

function syncColorInputs() {
  const colorPairs = [
    ["cor-primaria", "cor-primaria-hex"],
    ["cor-secundaria", "cor-secundaria-hex"],
    ["cor-fundo", "cor-fundo-hex"],
    ["cor-cards", "cor-cards-hex"],
  ];
  colorPairs.forEach(([colorId, hexId]) => {
    const colorInput = document.getElementById(colorId);
    const hexInput = document.getElementById(hexId);
    if (colorInput && hexId) {
      colorInput.addEventListener("input", () => (hexInput.value = colorInput.value));
      hexInput.addEventListener("input", () => {
        if (/^#[0-9A-F]{6}$/i.test(hexInput.value)) colorInput.value = hexInput.value;
      });
    }
  });
}

async function salvarPersonalizacao() {
  try {
    const config = window.configManager.getConfig();
    if (!config.cores) config.cores = {};
    if (!config.textos) config.textos = {};
    if (!config.sistema) config.sistema = {};

    config.cores.primaria = document.getElementById("cor-primaria").value;
    config.cores.secundaria = document.getElementById("cor-secundaria").value;
    config.cores.fundo = document.getElementById("cor-fundo").value;
    config.cores.cards = document.getElementById("cor-cards").value;
    config.textos.tituloSistema = document.getElementById("titulo-principal").value;
    config.textos.subtituloSistema = document.getElementById("subtitulo-sistema").value;
    config.sistema.nomeCliente = document.getElementById("nome-posto").value;

    const postoData = window.postoManager.getPostoAtual();
    const saved = await window.configManager.salvarConfig('posto', postoData.posto_id, config);
    if (saved) {
      window.configManager.aplicarCores();
      window.configManager.aplicarTextos();
      showToast("Personalização salva com sucesso!", "success");
    } else {
      showToast(`Erro ao salvar personalização.`, "error");
    }
  } catch (error) {
    showToast(`Erro ao salvar personalização: ${error.message}`, "error");
  }
}

async function resetPersonalizacao() {
  if (confirm("Tem certeza que deseja restaurar a personalização padrão?")) {
    const postoData = window.postoManager.getPostoAtual();
    try {
        const defaultConfig = window.configManager.getConfigPadrao();
        if (postoData && postoData.posto_nome) {
            defaultConfig.sistema.nomeCliente = postoData.posto_nome;
        }

        const saved = await window.configManager.salvarConfig('posto', postoData.posto_id, defaultConfig);
        if (saved) {
            window.configManager.aplicarCores();
            window.configManager.aplicarTextos();
            window.configManager.aplicarLogo();
            carregarPersonalizacao();
            showToast("Personalização restaurada!", "success");
        } else {
            showToast(`Erro ao restaurar personalização.`, "error");
        }
    } catch (error) {
        console.error("Erro ao resetar personalização:", error);
        showToast(`Erro ao resetar personalização: ${error.message}`, "error");
    }
  }
}

async function handleLogoUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  const postoData = window.postoManager.getPostoAtual();
  if (!postoData || !postoData.posto_id) {
    showToast("Erro: ID do posto não encontrado para upload.", "error");
    return;
  }

  const reader = new FileReader();
  reader.onload = async (event) => {
    document.getElementById("logo-preview").src = event.target.result;

    const formData = new FormData();
    formData.append('logo', file);

    try {
      const response = await fetch(`${BASE_API_URL}/upload_logo.php`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) { window.location.href = 'posto-login.html'; return; }
        throw new Error(`Erro HTTP! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.status === 'success') {
        await window.configManager.carregarConfig('posto', postoData.posto_id);
        window.configManager.aplicarLogo();
        showToast("Logo atualizado com sucesso!", "success");
      } else {
        showToast(`Erro ao enviar logo: ${result.message}`, "error");
      }
    } catch (error) {
      console.error("Erro no upload da logo:", error);
      showToast(`Erro de conexão no upload da logo: ${error.message}`, "error");
    }
  };
  reader.readAsDataURL(file);
}

async function carregarUltimosResultados() {
  const container = document.getElementById("ultimos-resultados");
  if (!container) return;

  const postoData = window.postoManager.getPostoAtual();
  if (!postoData || !postoData.posto_id) return;

  try {
    const response = await fetch(`${BASE_API_URL}/sorteios/get.php?posto_id=${postoData.posto_id}`);

    if (!response.ok) {
        if (response.status === 401 || response.status === 403) { window.location.href = 'posto-login.html'; return; }
        throw new Error(`Erro HTTP! status: ${response.status}`);
    }
    const result = await response.json();

    if (result.status === 'success') {
      const resultados = result.data;
      container.innerHTML = "";
      if (resultados.length === 0) {
        container.innerHTML = `
        <div class="no-results">
          <div class="no-results-icon">🎯</div>
          <p>Nenhum resultado ainda</p>
        </div>
      `;
        return;
      }

      resultados.slice(0, 20).forEach((resultado) => {
        const item = document.createElement("div");
        item.className = `resultado-item ${resultado.ganhou ? "ganhou" : "perdeu"}`;
        item.innerHTML = `
        <div class="resultado-avatar ${resultado.ganhou ? "ganhou" : "perdeu"}">${resultado.ganhou ? "🏆" : "😔"}</div>
        <div class="resultado-info">
          <h4>${resultado.cliente_nome}</h4>
          <p>${resultado.cliente_cpf} • ${new Date(resultado.timestamp).toLocaleString("pt-BR")}</p>
        </div>
        <div class="resultado-premio">
          <div class="resultado-id">#${resultado.id_sorteado}</div>
          <div class="resultado-premio-nome">${resultado.premio_nome}</div>
        </div>`;
        container.appendChild(item);
      });
    } else {
        console.error("Erro ao carregar últimos resultados:", result.message);
        showToast(`Erro ao carregar últimos resultados: ${result.message}`, "error");
    }
  } catch (error) {
    console.error("Erro ao carregar últimos resultados:", error);
    showToast(`Erro ao carregar últimos resultados: ${error.message}`, "error");
  }
}

function filtrarResultados() {
  const filtro = document.getElementById("filter-resultados").value;
  document.querySelectorAll(".cliente-item-admin").forEach((item) => {
    const isGanhou = item.classList.contains("ganhou");
    if (filtro === "todos" || (filtro === "ganhou" && isGanhou) || (filtro === "perdeu" && !isGanhou)) {
      item.style.display = "flex";
    } else {
      item.style.display = "none";
    }
  });
}

function carregarPersonalizacao() {
  const config = window.configManager.getConfig();
  document.getElementById("cor-primaria").value = config.cores.primaria;
  document.getElementById("cor-secundaria").value = config.cores.secundaria;
  document.getElementById("cor-fundo").value = config.cores.fundo;
  document.getElementById("cor-cards").value = config.cores.cards;
  document.getElementById("cor-primaria-hex").value = config.cores.primaria;
  document.getElementById("cor-secundaria-hex").value = config.cores.secundaria;
  document.getElementById("cor-fundo-hex").value = config.cores.fundo;
  document.getElementById("cor-cards-hex").value = config.cores.cards;
  document.getElementById("titulo-principal").value = config.textos.tituloSistema;
  document.getElementById("subtitulo-sistema").value = config.textos.subtituloSistema;
  document.getElementById("nome-posto").value = config.sistema.nomeCliente;
  // Ajuste do caminho da logo para garantir que carregue corretamente com `window.location.origin`
  document.getElementById("logo-preview").src = window.location.origin + "/roleta-premium/" + (config.sistema.logoPath || "placeholder.svg?height=80&width=80");
}

async function carregarAtividadeRecente() {
  const container = document.getElementById("atividade-recente");
  if (!container) return;
  const postoData = window.postoManager.getPostoAtual();
  if (!postoData || !postoData.posto_id) return;

  try {
    const response = await fetch(`${BASE_API_URL}/sorteios/get.php?posto_id=${postoData.posto_id}`);

    if (!response.ok) {
        if (response.status === 401 || response.status === 403) { window.location.href = 'posto-login.html'; return; }
        throw new Error(`Erro HTTP! status: ${response.status}`);
    }
    const result = await response.json();

    if (result.status === 'success') {
        const atividades = result.data.slice(0, 5);
        container.innerHTML = "";
        if (atividades.length === 0) {
            container.innerHTML = `<div class="recent-item"><div class="recent-icon" style="background: var(--info-color)">ℹ️</div><div class="recent-info"><div>Sistema iniciado</div><div class="recent-time">Pronto para sorteios</div></div></div>`;
            return;
        }
        atividades.forEach((atividade) => {
            const item = document.createElement("div");
            item.className = "recent-item";
            item.innerHTML = `
            <div class="recent-icon" style="background: ${atividade.ganhou ? "var(--green-primary)" : "var(--color-danger)"}">${atividade.ganhou ? "🏆" : "😔"}</div>
            <div class="recent-info">
                <div>${atividade.cliente_nome} ${atividade.ganhou ? "ganhou" : "perdeu"}</div>
                <div class="recent-time">${new Date(atividade.timestamp).toLocaleString("pt-BR")}</div>
            </div>`;
            container.appendChild(item);
    });
    } else {
        console.error("Erro ao carregar atividade recente:", result.message);
        showToast(`Erro ao carregar atividade recente: ${result.message}`, "error");
    }
  } catch (error) {
    console.error("Erro ao carregar atividade recente:", error);
    showToast(`Erro ao carregar atividade recente: ${error.message}`, "error");
  }
}

// NOVO CÓDIGO: Função para atualizar IDs premiados com base no estoque
async function atualizarIdsPremiadosBaseadoNoEstoque() {
    const postoData = window.postoManager.getPostoAtual();
    if (!postoData || !postoData.posto_id) {
        console.error("Não foi possível atualizar IDs premiados: posto_id ausente.");
        return;
    }

    try {
        const response = await fetch(`${BASE_API_URL}/premios/update_premiados_ids.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ posto_id: postoData.posto_id }) // Embora o PHP pegue da sessão, enviar explicitamente é seguro.
        });

        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                window.location.href = 'posto-login.html';
                return;
            }
            throw new Error(`Erro HTTP! status: ${response.status}`);
        }

        const result = await response.json();

        if (result.status === 'success') {
            console.log("IDs premiados atualizados com sucesso para:", result.data.ids_gerados);
            showToast(`IDs premiados atualizados: ${result.data.num_premiados} prêmios!`, "info");
            // Recarregar a configuração para que o 'sistema.idsPremiados' no script.js seja atualizado com os novos valores.
            await window.configManager.carregarConfig('posto', postoData.posto_id);
            // Atualizar o dashboard para mostrar o novo número de prêmios disponíveis.
            carregarDashboard();
        } else {
            console.error("Erro ao atualizar IDs premiados:", result.message);
            showToast(`Erro ao atualizar IDs premiados: ${result.message}`, "error");
        }
    } catch (error) {
        console.error("Erro de conexão ao atualizar IDs premiados:", error);
        showToast(`Erro de conexão ao atualizar IDs premiados: ${error.message}`, "error");
    }
}