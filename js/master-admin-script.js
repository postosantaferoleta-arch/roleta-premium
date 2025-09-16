// master-admin-script.js
let currentTab = "dashboard"
let postoEditando = null

document.addEventListener("DOMContentLoaded", () => {
  // Verificar autenticação master
  if (!window.masterManager.isLogado()) {
    window.location.href = "master-login.html"
    return
  }

  // Inicializar painel master
  setupSidebar() // Função de utilidade do shared-utils.js
  inicializarMasterAdmin()
  carregarDashboardMaster()
  configurarEventListenersMaster()
  // Garante que a aba 'dashboard' seja a inicial, e carrega seu conteúdo
  switchTabMaster(currentTab);
})

function inicializarMasterAdmin() {
  console.log("🚀 Inicializando Master Admin...")
}

function configurarEventListenersMaster() {
  // Tabs
  document.querySelectorAll(".nav-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const tab = btn.dataset.tab
      switchTabMaster(tab)
    })
  })

  // Logout
  document.getElementById("btn-logout").addEventListener("click", () => {
    if (confirm("Tem certeza que deseja sair?")) {
      window.masterManager.logout()
    }
  })

  // Dashboard actions
  document.getElementById("btn-backup-completo")?.addEventListener("click", () => {
    window.masterManager.fazerBackupCompleto()
    showToast("Backup completo solicitado! Verifique seus downloads.", "success")
  })

  document.getElementById("btn-limpar-logs")?.addEventListener("click", async () => {
    if (confirm("Tem certeza que deseja limpar todos os logs de sorteios do sistema? Esta ação é irreversível e afeta TODOS os postos.")) {
      try {
        await window.masterManager.limparLogs()
        showToast("Histórico de sorteios limpo com sucesso!", "success")
      } catch (error) {
        showToast(`Erro ao limpar histórico: ${error.message}`, "error")
      }
    }
  })

  // Event Listener para o botão de Resetar Sistema, com prompt de senha
  document.getElementById("btn-reset-sistema")?.addEventListener("click", async () => {
    const senhaConfirmacao = prompt("Para resetar o sistema, digite a senha master:")
    if (senhaConfirmacao) {
      try {
        await window.masterManager.resetSistema(senhaConfirmacao) // Passa a senha para o manager
        showToast("Sistema resetado completamente! Recarregando...", "success")
        setTimeout(() => window.location.reload(), 2000)
      } catch (error) {
        showToast(`Erro ao resetar sistema: ${error.message}`, "error")
      }
    } else {
      showToast("Reset cancelado.", "info")
    }
  })

  // Postos
  document.getElementById("btn-add-posto")?.addEventListener("click", () => {
    postoEditando = null
    mostrarModalPosto()
  })

  // Relatórios
  document.getElementById("btn-gerar-relatorio")?.addEventListener("click", gerarRelatorio)

  // Sistema
  document.getElementById("btn-salvar-config-master")?.addEventListener("click", salvarConfigMaster)

  // Modal posto
  document.getElementById("modal-posto-close")?.addEventListener("click", fecharModalPosto)
  document.getElementById("btn-cancelar-posto")?.addEventListener("click", fecharModalPosto)
  document.getElementById("form-posto")?.addEventListener("submit", salvarPosto)
}

function switchTabMaster(tabName) {
  // Atualizar botões
  document.querySelectorAll(".nav-btn").forEach((btn) => {
    btn.classList.remove("active")
  })
  document.querySelector(`.nav-btn[data-tab="${tabName}"]`).classList.add("active")

  // Atualizar conteúdo
  document.querySelectorAll(".tab-panel").forEach((panel) => {
    panel.classList.remove("active")
  })
  document.getElementById(`${tabName}-tab`).classList.add("active")

  currentTab = tabName
  document.title = `${tabName.charAt(0).toUpperCase() + tabName.slice(1)} - Master Admin`


  // Carregar conteúdo específico
  switch (tabName) {
    case "dashboard":
      carregarDashboardMaster()
      break
    case "postos":
      carregarPostos()
      break
    case "relatorios":
      carregarRelatorios()
      break
    case "sistema":
      carregarConfigMaster()
      break
  }
}

async function carregarDashboardMaster() {
  try {
    const stats = await window.masterManager.getEstatisticasConsolidadas();

    document.getElementById("total-postos").textContent = stats.totalPostos;
    document.getElementById("postos-ativos").textContent = stats.postosAtivos;
    document.getElementById("total-giros").textContent = stats.totalGiros;
    document.getElementById("receita-total").textContent = `R$ ${stats.receitaTotal.toFixed(2).replace(".", ",")}`;

  } catch (error) {
    console.error("Erro ao carregar dashboard master:", error);
    showToast(`Erro ao carregar dashboard: ${error.message}`, "error");
  }
}
async function carregarPostos() {
  try {
    const postosResponse = await window.masterManager.getPostos();
    const postosData = postosResponse || []; // Garante que postosData seja um array

    const container = document.getElementById("postos-list");
    if (!container) {
      console.error("Erro: Elemento com ID 'postos-list' não encontrado no HTML.");
      showToast("Erro ao carregar postos: container HTML não encontrado.", "error");
      return;
    }
    container.innerHTML = ""; // Limpa o container antes de adicionar novos cards

    if (postosData.length === 0) {
      container.innerHTML = '<p class="info-message">Nenhum posto encontrado.</p>';
      return;
    }

    postosData.forEach((posto) => {
      const postoCard = document.createElement("div");
      postoCard.className = `posto-card ${posto.ativo ? "ativo" : "inativo"}`;
      postoCard.innerHTML = `
        <div class="posto-header">
            <div class="posto-icon">⛽</div>
            <div class="posto-info">
                <h3>${posto.nome}</h3>
                <p>CNPJ: ${posto.cnpj}</p>
                <p>ID: ${posto.id}</p>
            </div>
            <div class="posto-status">
                <span class="status-badge ${posto.ativo ? "ativo" : "inativo"}">
                    ${posto.ativo ? "ATIVO" : "INATIVO"}
                </span>
            </div>
        </div>
        <div class="posto-stats">
            <div class="stat-item">
                <span class="label">Giros:</span>
                <span class="value">${posto.totalGiros || 0}</span>
            </div>
            <div class="stat-item">
                <span class="label">Prêmios:</span>
                <span class="value">${posto.premiosGanhos || 0}</span>
            </div>
            <div class="stat-item">
                <span class="label">Receita:</span>
                <span class="value">R$ ${parseFloat(posto.receita || 0).toFixed(2).replace('.', ',')}</span>
            </div>
        </div>
        <div class="posto-actions">
            <button class="btn btn-sm btn-secondary" onclick="editarPosto('${posto.id}')">
                <span>✏️</span>
                <span>Editar</span>
            </button>
            <button class="btn btn-sm ${posto.ativo ? "btn-warning" : "btn-success"}" onclick="togglePosto('${posto.id}', ${!posto.ativo})">
                <span>${posto.ativo ? "⏸️" : "▶️"}</span>
                <span>${posto.ativo ? "Desativar" : "Ativar"}</span>
            </button>
            <button class="btn btn-sm btn-danger" onclick="removerPosto('${posto.id}')">
                <span>🗑️</span>
                <span>Remover</span>
            </button>
        </div>
      `;
      container.appendChild(postoCard);
    });

  } catch (error) {
    console.error("Erro ao carregar postos:", error);
    showToast(`Erro ao carregar postos: ${error.message}`, "error");
  }
}

function carregarRelatorios() {
  const container = document.getElementById("relatorio-content")
  if (container) {
    container.innerHTML = `
            <div class="no-results">
                <div class="no-results-icon">📊</div>
                <p>Selecione um período e clique em "Gerar Relatório"</p>
            </div>
        `
  }
}

async function carregarConfigMaster() {
  try {
    const config = await window.masterManager.carregarConfiguracoes();

    document.getElementById("config-backup-auto").value = config.backupAutomatico || "semanal"
    document.getElementById("config-log-retention").value = config.logRetention || 30
    document.getElementById("config-max-postos").value = config.maxPostos || 100

    // Preencher o campo da senha mestre (apenas para exibição, não o hash)
    // Para segurança, este campo não deve ser preenchido com o hash real ou senha em texto claro.
    // É mais seguro deixar em branco e exigir re-entrada para alterações.
    // O campo 'config-master-password' não existe no HTML fornecido para MASTER-ADMIN.
    // Removendo a parte de preencher a senha para evitar confusão.
    // const masterPasswordInput = document.getElementById("config-master-password");
    // if (masterPasswordInput) {
    //   masterPasswordInput.value = config.senhaMaster || "";
    // }
  } catch (error) {
    console.error("Erro ao carregar configurações master:", error);
    showToast(`Erro ao carregar configurações: ${error.message}`, "error");
  }
}

function mostrarModalPosto(posto = null) {
  const modal = document.getElementById("modal-posto")
  const title = document.getElementById("modal-posto-title")
  const form = document.getElementById("form-posto"); // Captura o formulário
  form.reset(); // Reseta o formulário antes de preencher ou mostrar

  if (posto) {
    title.textContent = "Editar Posto"
    document.getElementById("posto-nome").value = posto.nome
    document.getElementById("posto-cnpj").value = posto.cnpj
    document.getElementById("posto-email").value = posto.email || ""
    // NUNCA pré-preencha um campo de senha.
    document.getElementById("posto-senha").value = ""; // Sempre vazio para edição
  } else {
    title.textContent = "Adicionar Posto"
  }

  modal.classList.add("show")
  document.body.style.overflow = "hidden"
}

function fecharModalPosto() {
  const modal = document.getElementById("modal-posto")
  modal.classList.remove("show")
  document.body.style.overflow = ""
  postoEditando = null
}

async function editarPosto(postoId) {
  try {
    // É mais seguro buscar os dados do posto pelo ID diretamente da API
    // para garantir que se está editando a versão mais recente e evitar problemas de cache local.
    const allPostos = await window.masterManager.getPostos();
    const posto = allPostos.find((p) => p.id === postoId);

    if (posto) {
      postoEditando = posto.id; // Armazenar apenas o ID para a atualização
      mostrarModalPosto(posto);
    } else {
      showToast("Posto não encontrado para edição.", "error");
    }
  } catch (error) {
    console.error("Erro ao carregar dados do posto para edição:", error);
    showToast(`Erro ao carregar dados do posto: ${error.message}`, "error");
  }
}

async function togglePosto(postoId, newStatus) {
  try {
    await window.masterManager.togglePosto(postoId, newStatus)
    carregarPostos()
    carregarDashboardMaster(); // Atualiza o dashboard após ativar/desativar
    showToast(`Posto ${newStatus ? "ativado" : "desativado"} com sucesso!`, "success")
  } catch (error) {
    console.error("Erro ao alternar status do posto:", error);
    showToast(`Erro ao alternar status do posto: ${error.message}`, "error");
  }
}

async function removerPosto(postoId) {
  if (confirm("Tem certeza que deseja remover este posto? Todos os dados associados (usuários, configs, prêmios, clientes, sorteios) serão PERDIDOS!")) {
    try {
      await window.masterManager.deletarPosto(postoId)
      carregarPostos()
      carregarDashboardMaster()
      showToast("Posto removido com sucesso!", "success")
    } catch (error) {
      console.error("Erro ao remover posto:", error);
      showToast(`Erro ao remover posto: ${error.message}`, "error");
    }
  }
}

async function salvarPosto(e) {
  e.preventDefault()

  const formData = new FormData(e.target)
  const dadosPosto = {
    nome: formData.get("posto-nome") ? formData.get("posto-nome").trim() : '',
    cnpj: formData.get("posto-cnpj") ? formData.get("posto-cnpj").trim() : '',
    email: formData.get("posto-email") ? formData.get("posto-email").trim() : '',
    senha: formData.get("posto-senha") ? formData.get("posto-senha").trim() : '',
  }

  if (!dadosPosto.nome || !dadosPosto.cnpj) {
    showToast("Nome e CNPJ são obrigatórios.", "error")
    return
  }

  // Senha é obrigatória apenas para novos postos ou se for explicitamente alterada
  if (!postoEditando && !dadosPosto.senha) {
      showToast("A senha é obrigatória para cadastrar um novo posto.", "error");
      return;
  }

  try {
    if (postoEditando) {
      // Editar posto existente
      // A API de update.php já lida com a senha opcionalmente.
      await window.masterManager.atualizarPosto(postoEditando, dadosPosto);
    } else {
      // Criar novo posto
      await window.masterManager.criarPosto(dadosPosto)
    }

    fecharModalPosto() // Primeiro, fecha o modal

    // Mudar para a aba 'Postos' e garantir a atualização
    switchTabMaster('postos');

    showToast("Posto salvo com sucesso!", "success")
  } catch (error) {
    console.error("Erro ao salvar posto:", error)
    showToast("Erro ao salvar posto: " + error.message, "error")
  }
}

async function gerarRelatorio() {
  const periodo = document.getElementById("periodo-relatorio").value
  const container = document.getElementById("relatorio-content")

  try {
    const relatorio = await window.masterManager.gerarRelatorio(periodo)

    if (!relatorio) {
      showToast("Erro ao gerar relatório.", "error")
      return
    }

    container.innerHTML = `
            <div class="card">
                <div class="page-header">
                    <h3>Relatório - ${periodo.charAt(0).toUpperCase() + periodo.slice(1)}</h3>
                    <button class="btn btn-secondary" onclick="exportarRelatorio()">
                        <span>📥</span>
                        <span>Exportar</span>
                    </button>
                </div>
                <div class="dashboard-grid">
                    <div class="stat-card"><div class="stat-content"><h3>Total de Postos</h3><div class="stat-number">${relatorio.totalPostos}</div></div></div>
                    <div class="card stat-card"><div class="stat-content"><h3>Postos Ativos</h3><div class="stat-number">${relatorio.postosAtivos}</div></div></div>
                    <div class="card stat-card"><div class="stat-content"><h3>Total de Giros</h3><div class="stat-number">${relatorio.totalGiros}</div></div></div>
                    <div class="card stat-card"><div class="stat-content"><h3>Receita Total</h3><div class="stat-number">R$ ${relatorio.receitaTotal.toFixed(2).replace(".", ",")}</div></div></div>
                </div>
            </div>
            <div class="card" style="margin-top: 1.5rem;">
                <h3>Detalhes por Posto</h3>
                <div class="clientes-container">
                    ${relatorio.postos && relatorio.postos.length > 0 ? relatorio.postos
                      .map(
                        (posto) => `
                        <div class="cliente-item-admin">
                            <div class="cliente-avatar" style="background-color: ${posto.ativo ? 'var(--green-primary)' : 'var(--color-text-secondary)'}; color: var(--bg-dark);">⛽</div>
                            <div class="cliente-info">
                                <h4>${posto.nome}</h4>
                                <p>Giros: ${posto.totalGiros || 0} | Prêmios: ${posto.premiosGanhos || 0} | Receita: R$ ${(posto.receita || 0).toFixed(2).replace(".",",")}</p>
                            </div>
                        </div>
                    `,
                      )
                      .join("") : '<p>Nenhum dado de posto para este período.</p>'}
                </div>
            </div>
        `

    // Armazenar relatório para exportação
    window.relatorioAtual = relatorio
  } catch (error) {
    console.error("Erro ao gerar relatório:", error)
    showToast(`Erro ao gerar relatório: ${error.message}`, "error")
  }
}

function exportarRelatorio() {
  if (window.relatorioAtual) {
    window.masterManager.exportarRelatorio(window.relatorioAtual)
    showToast("Relatório exportado com sucesso!", "success")
  }
}

async function salvarConfigMaster() {
  try {
    const novasConfigs = {
      backupAutomatico: document.getElementById("config-backup-auto").value,
      logRetention: Number.parseInt(document.getElementById("config-log-retention").value) || 30,
      maxPostos: Number.parseInt(document.getElementById("config-max-postos").value) || 100,
      // A senha master NÃO deve ser salva ou alterada diretamente via este input
      // Apenas a validação no reset.php deve consumir a senha
      // senhaMaster: document.getElementById("config-master-password") ? document.getElementById("config-master-password").value : undefined
    }

    await window.masterManager.salvarConfiguracoes(novasConfigs)
    showToast("Configurações master salvas com sucesso!", "success")
  } catch (error) {
    console.error("Erro ao salvar configurações master:", error)
    showToast(`Erro ao salvar configurações: ${error.message}`, "error")
  }
}