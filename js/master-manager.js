// js/master-manager.js

class MasterManager {
  constructor() {
    this.configuracoes = {
      senhaMaster: "master2024", // Senha padrão inicial (será gerenciada na config do banco de dados)
      backupAutomatico: "semanal",
      logRetention: 30, // dias
      maxPostos: 100,
    }
  }

  // Login master
  async login() {
    try {
      const usernameInput = document.getElementById('master-username');
      const passwordInput = document.getElementById('master-password');

      const username = usernameInput.value.trim();
      const password = passwordInput.value.trim();

      if (!username || !password) {
          console.error("Usuário e senha são obrigatórios.");
          return false;
      }

      // URL corrigida
      const response = await fetch(`${BASE_API_URL}/auth/master_login.php`, {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json'
          },
          body: JSON.stringify({
              username: username,
              password: password
          })
      });

      if (!response.ok) {
          let errorMessage = `Erro HTTP! Status: ${response.status}`;
          try {
              const errorData = await response.json();
              if (errorData && errorData.message) {
                  errorMessage = errorData.message;
              }
          } catch (jsonError) {
              const textResponse = await response.text();
              errorMessage = `Erro do servidor (não JSON): ${response.status} - ${textResponse.substring(0, 100)}...`;
          }
          console.error("❌ Erro no login master (HTTP Response Not OK):", errorMessage);
          throw new Error(errorMessage); // Lança o erro para ser capturado pelo chamador
      }

      const result = await response.json();

      if (result.status === 'success') {
          sessionStorage.setItem("masterLoggedIn", "true");
          sessionStorage.setItem("masterLoginTime", Date.now().toString());
          console.log("✅ Login master realizado");
          return true;
      } else {
          console.error("❌ Login master falhou:", result.message);
          throw new Error(result.message); // Lança a mensagem de erro do backend
      }
    } catch (error) {
      console.error("❌ Erro no login master (Catch):", error);
      return false; // Retorna false ou lança o erro dependendo de como você quer lidar no UI
    }
  }

  // Verificar se está logado como master
  isLogado() {
    const masterLogado = sessionStorage.getItem("masterLoggedIn")
    const loginTime = sessionStorage.getItem("masterLoginTime")

    if (!masterLogado || !loginTime) return false

    const now = Date.now()
    const elapsed = now - Number.parseInt(loginTime)
    const maxAge = 2 * 60 * 60 * 1000 // 2 horas

    return elapsed < maxAge
  }

  // Logout master
  async logout() {
    try {
      // URL corrigida
      await fetch(`${BASE_API_URL}/auth/logout.php`);
      sessionStorage.removeItem("masterLoggedIn");
      sessionStorage.removeItem("masterLoginTime");
      console.log("✅ Logout master realizado");
      window.location.href = 'master-login.html';
    } catch (error) {
      console.error("Erro ao fazer logout master:", error);
    }
  }

  // Carregar configurações master
  async carregarConfiguracoes() {
    try {
        const config = await window.configManager.carregarConfig('master', 'master');
        if (config) {
            this.configuracoes = config;
        }
        return this.configuracoes;
    } catch (error) {
        console.error("Erro ao carregar configurações master:", error);
        return this.configuracoes; // Retorna a configuração atual em caso de erro
    }
  }

  // Salvar configurações master
  async salvarConfiguracoes(novasConfigs) {
    try {
        const currentConfig = this.configuracoes;
        const updatedConfig = { ...currentConfig, ...novasConfigs };

        const saved = await window.configManager.salvarConfig('master', 'master', updatedConfig);
        if (saved) {
            this.configuracoes = updatedConfig;
            console.log("✅ Configurações master salvas");
            return true;
        } else {
            console.error("❌ Erro ao salvar configurações master.");
            throw new Error("Erro ao salvar configurações master."); // Lança erro para o chamador
        }
    } catch (error) {
        console.error("❌ Erro ao salvar configurações master:", error);
        throw error; // Re-lança o erro para ser tratado no UI
    }
  }

  // Obter todos os postos
  async getPostos() {
    try {
        const response = await fetch(`${BASE_API_URL}/postos/get.php`);
        if (!response.ok) {
            if (response.status === 401 || response.status === 403) { throw new Error('Acesso não autorizado.'); }
            throw new Error(`Erro HTTP! status: ${response.status}`);
        }
        const result = await response.json();
        if (result.status === 'success') {
            return result.data;
        } else {
            throw new Error(result.message); // Lança a mensagem de erro do backend
        }
    } catch (error) {
        console.error("❌ Erro ao buscar postos:", error);
        throw error; // Re-lança o erro para ser tratado no UI
    }
  }

  // Criar novo posto
  async criarPosto(dadosPosto) {
    try {
        const response = await fetch(`${BASE_API_URL}/postos/add.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dadosPosto)
        });
        if (!response.ok) {
            if (response.status === 401 || response.status === 403) { throw new Error('Acesso não autorizado.'); }
            throw new Error(`Erro HTTP! status: ${response.status}`);
        }
        const result = await response.json();
        if (result.status === 'success') {
            return result.data;
        } else {
            throw new Error(result.message);
        }
    } catch (error) {
        console.error("❌ Erro ao criar posto:", error);
        throw error;
    }
  }

  // Deletar posto
  async deletarPosto(postoId) {
    try {
        const response = await fetch(`${BASE_API_URL}/postos/delete.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: postoId })
        });
        if (!response.ok) {
            if (response.status === 401 || response.status === 403) { throw new Error('Acesso não autorizado.'); }
            throw new Error(`Erro HTTP! status: ${response.status}`);
        }
        const result = await response.json();
        if (result.status === 'success') {
            return true;
        } else {
            throw new Error(result.message);
        }
    } catch (error) {
        console.error("❌ Erro ao deletar posto:", error);
        throw error;
    }
  }

  // Toggle posto
  async togglePosto(postoId, status) {
    try {
        const response = await fetch(`${BASE_API_URL}/postos/toggle_status.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: postoId, ativo: status })
        });
        if (!response.ok) {
            if (response.status === 401 || response.status === 403) { throw new Error('Acesso não autorizado.'); }
            throw new Error(`Erro HTTP! status: ${response.status}`);
        }
        const result = await response.json();
        if (result.status === 'success') {
            return result.data.ativo;
        } else {
            throw new Error(result.message);
        }
    } catch (error) {
        console.error("❌ Erro ao alternar status do posto:", error);
        throw error;
    }
  }

  // Atualizar posto
  async atualizarPosto(postoId, dadosAtualizados) {
    try {
        const dataToSend = { id: postoId, ...dadosAtualizados };
        const response = await fetch(`${BASE_API_URL}/postos/update.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dataToSend)
        });
        if (!response.ok) {
            if (response.status === 401 || response.status === 403) { throw new Error('Acesso não autorizado.'); }
            throw new Error(`Erro HTTP! status: ${response.status}`);
        }
        const result = await response.json();
        if (result.status === 'success') {
            return true;
        } else {
            throw new Error(result.message);
        }
    } catch (error) {
        console.error("❌ Erro ao atualizar posto:", error);
        throw error;
    }
  }

  // Obter estatísticas consolidadas
  async getEstatisticasConsolidadas() {
    try {
        const response = await fetch(`${BASE_API_URL}/dashboard/master_stats.php`);
        if (!response.ok) {
            if (response.status === 401 || response.status === 403) { throw new Error('Acesso não autorizado.'); }
            throw new Error(`Erro HTTP! status: ${response.status}`);
        }
        const result = await response.json();
        if (result.status === 'success') {
            return result.data;
        } else {
            throw new Error(result.message);
        }
    } catch (error) {
        console.error("❌ Erro ao buscar estatísticas consolidadas:", error);
        throw error; // Re-lança o erro para ser tratado no UI
    }
  }

  // Fazer backup completo do sistema
  async fazerBackupCompleto() {
    try {
        // Esta função apenas inicia o download. O erro real de download não é capturável via JS.
        // O PHP deve retornar os headers corretos para o download.
        window.location.href = `${BASE_API_URL}/system/backup.php?type=full`;
        return true;
    } catch (error) {
        console.error("❌ Erro ao fazer backup completo:", error);
        throw error; // Re-lança o erro para ser tratado no UI
    }
  }

  // Obter todas as configurações de postos (não mais usado diretamente, a não ser para backup)
  obterTodasConfiguracoesPosto() {
    return {}; // Esta função deve ser removida se não for usada. Deixando como está por enquanto.
  }

  // Limpar logs do sistema (chamando endpoint que limpa sorteios)
  async limparLogs() {
    try {
        // Nota: O endpoint clear_history.php atualmente limpa apenas sorteios do posto logado.
        // Para limpar TUDO (master), ele precisaria de lógica adicional no PHP.
        // Estou assumindo que clear_history.php com 'master' role ou um novo endpoint 'master_clear_history.php' seria criado.
        // Por hora, esta chamada limpa o histórico de SORTEIOS, que é o que o HTML sugere.
        const response = await fetch(`${BASE_API_URL}/system/clear_history.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'clear_all_history', role: 'master' }) // Adicionado role master
        });
        if (!response.ok) {
            if (response.status === 401 || response.status === 403) { throw new Error('Acesso não autorizado.'); }
            throw new Error(`Erro HTTP! status: ${response.status}`);
        }
        const result = await response.json();
        if (result.status === 'success') {
            return true;
        } else {
            throw new Error(result.message);
        }
    } catch (error) {
        console.error("❌ Erro ao limpar logs:", error);
        throw error; // Re-lança o erro para ser tratado no UI
    }
  }

  // Reset completo do sistema (requer senha mestre)
  async resetSistema(senhaDigitada) {
    try {
        const response = await fetch(`${BASE_API_URL}/system/reset.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: senhaDigitada })
        });
        if (!response.ok) {
            if (response.status === 401 || response.status === 403) { throw new Error('Acesso não autorizado.'); }
            throw new Error(`Erro HTTP! status: ${response.status}`);
        }
        const result = await response.json();
        if (result.status === 'success') {
            return true;
        } else {
            throw new Error(result.message);
        }
    } catch (error) {
        console.error("❌ Erro ao resetar sistema:", error);
        throw error;
    }
  }

  // Gerar relatório consolidado
  async gerarRelatorio(periodo = "mensal") {
    try {
        // O endpoint master_stats.php atualmente não usa o parâmetro 'periodo'.
        // Se você precisa de relatórios por período, master_stats.php precisará ser modificado
        // para filtrar por data ou um novo endpoint específico para relatórios deve ser criado.
        const response = await fetch(`${BASE_API_URL}/dashboard/master_stats.php?periodo=${periodo}`);
        if (!response.ok) {
            if (response.status === 401 || response.status === 403) { throw new Error('Acesso não autorizado.'); }
            throw new Error(`Erro HTTP! status: ${response.status}`);
        }
        const result = await response.json();
        if (result.status === 'success') {
            return result.data;
        } else {
            throw new Error(result.message);
        }
    } catch (error) {
        console.error("❌ Erro ao gerar relatório:", error);
        throw error;
    }
  }

  // Exportar relatório
  exportarRelatorio(relatorio) {
    try {
        // Implementar lógica de exportação (ex: JSON, CSV) no frontend ou chamar um endpoint PHP.
        // Por exemplo, para JSON:
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(relatorio, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", `relatorio-${new Date().toISOString().slice(0, 10)}.json`);
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
        console.log("Relatório exportado (JSON).");
        return true;
    } catch (error) {
        console.error("❌ Erro ao exportar relatório:", error);
        return false;
    }
  }
}

// Instância global
window.masterManager = new MasterManager();