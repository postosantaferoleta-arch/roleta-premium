// posto-manager.js
// Gerenciador de Postos
class PostoManager {
  constructor() {
    this.postoAtual = null
    this.operadores = []
  }

  // Login do posto
  async login(postoId, password) {
    try {
        let username = postoId.trim();
        const senha = password.trim();

        // Remover a pontuação do CNPJ antes de enviar (se for CNPJ)
        username = username.replace(/[./-]/g, '');

        if (!username || !senha) {
            console.error("Usuário e senha são obrigatórios no login do posto.");
            return false;
        }

        // URL corrigida
        const response = await fetch(`${BASE_API_URL}/auth/login.php`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: username,
                password: senha
            })
        });

        const result = await response.json();

        if (result.status === 'success') {
            sessionStorage.setItem("postoLoggedIn", "true");
            sessionStorage.setItem("postoLoginTime", Date.now().toString());
            this.postoAtual = result.data;
            if (this.postoAtual && this.postoAtual.posto_id) {
                sessionStorage.setItem("postoData", JSON.stringify(this.postoAtual));
                console.log(`✅ Login posto realizado. CNPJ/ID logado: ${this.postoAtual.posto_cnpj}`);
            } else {
                console.error("Login bem-sucedido, mas posto_id não encontrado nos dados retornados!");
                this.logout(); // Força logout para evitar inconsistências
                return false;
            }
            return true;
        } else {
            console.error("Login posto falhou:", result.message);
            return false;
        }
    } catch (error) {
        console.error("Exceção no login posto:", error);
        return false;
    }
  }

  // Carregar postos cadastrados (agora feito pelo master-manager)
  carregarPostos() {
    console.warn("carregarPostos() em posto-manager.js não deve ser usada diretamente para o posto logado.");
    return [];
  }

  // Salvar postos (agora feito pelo master-manager)
  salvarPostos(postos) {
    console.warn("salvarPostos() em posto-manager.js não deve ser usada diretamente.");
    return false;
  }

  // Criar novo posto (agora feito pelo master-manager)
  criarPosto(dadosPosto) {
    console.warn("criarPosto() em posto-manager.js não deve ser usada diretamente.");
    return null;
  }

  // Criar configuração padrão para novo posto (agora feito pelo backend)
  criarConfiguracaoPadrao(dadosPosto) {
    console.warn("criarConfiguracaoPadrao() é responsabilidade do backend agora.");
    return {};
  }

  // Atualizar estatísticas do posto (agora feito via registro de sorteio)
  atualizarEstatisticas(postoId, novasStats) {
    console.warn("atualizarEstatisticas() em posto-manager.js não deve ser chamada para persistência.");
    if (this.postoAtual && this.postoAtual.id === postoId) {
        this.postoAtual.estatisticas = { ...this.postoAtual.estatisticas, ...novasStats };
        sessionStorage.setItem("postoData", JSON.stringify(this.postoAtual));
    }
    return true;
  }

  // Obter posto atual
  getPostoAtual() {
    if (!this.postoAtual) {
      const postoData = sessionStorage.getItem("postoData")
      if (postoData) {
        this.postoAtual = JSON.parse(postoData)
      }
    }
    return this.postoAtual
  }

  // Verificar se está logado
  isLogado() {
    const postoLogado = sessionStorage.getItem("postoLoggedIn");
    const loginTime = sessionStorage.getItem("postoLoginTime");
    const postoData = sessionStorage.getItem("postoData");

    if (!postoLogado || !loginTime || !postoData) {
      return false;
    }

    const now = Date.now();
    const elapsed = now - Number.parseInt(loginTime);
    const maxAge = 2 * 60 * 60 * 1000; // 2 horas

    return elapsed < maxAge;
  }

  // Logout
  async logout() {
    try {
      console.log("Iniciando logout do posto.");
      // URL corrigida
      const response = await fetch(`${BASE_API_URL}/auth/logout.php`);
      if (!response.ok) {
        console.error(`Erro HTTP no logout: ${response.status}`);
      } else {
        // console.log("Resposta do servidor ao logout:", await response.json()); // Remover em produção
      }
      this.postoAtual = null;
      sessionStorage.removeItem("postoLoggedIn");
      sessionStorage.removeItem("postoLoginTime");
      sessionStorage.removeItem("postoData");
      console.log("✅ Logout do posto realizado");
      window.location.href = "posto-login.html"; // Redireciona
    } catch (error) {
      console.error("Exceção ao fazer logout do posto:", error);
    }
  }

  // Deletar posto (agora feito pelo master-manager)
  deletarPosto(postoId) {
    console.warn("deletarPosto() em posto-manager.js não deve ser usada diretamente.");
    return false;
  }

  // Listar todos os postos (agora feito pelo master-manager)
  listarPostos() {
    console.warn("listarPostos() em posto-manager.js não deve ser usada diretamente.");
    return [];
  }

  // Obter estatísticas consolidadas (agora feito pelo master-manager ou api/dashboard/posto_stats.php)
  getEstatisticasConsolidadas() {
    console.warn("getEstatisticasConsolidadas() em posto-manager.js não deve ser usada diretamente.");
    return { totalPostos: 0, postosAtivos: 0, totalGiros: 0, totalPremios: 0, receitaTotal: 0 };
  }

  // Toggle status do posto (agora feito pelo master-manager)
  togglePosto(postoId) {
    console.warn("togglePosto() em posto-manager.js não deve ser usada diretamente.");
    return false;
  }

  // Atualizar posto (agora feito pelo master-manager)
  atualizarPosto(postoId, dadosAtualizados) {
    console.warn("atualizarPosto() em posto-manager.js não deve ser usada diretamente.");
    return null;
  }
}

// Instância global
window.postoManager = new PostoManager()