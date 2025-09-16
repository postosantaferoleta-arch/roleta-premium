// Gerenciador de Configurações
class ConfigManager {
  constructor() {
    this.config = null
  }

  // Carregar configuração
  async carregarConfig(type, entityId) {
    try {
        const response = await fetch(`${BASE_API_URL}/config/get.php?type=${type}&entity_id=${entityId}`);
        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                window.location.href = 'posto-login.html'; // Ou master-login.html dependendo do contexto
                return null;
            }
            throw new Error(`Erro HTTP! status: ${response.status}`);
        }
        const result = await response.json();
        if (result.status === 'success') {
            this.config = result.data;
            console.log(`✅ Configuração de ${type} (${entityId}) carregada.`);
            return this.config;
        } else {
            console.warn(`Configuração ${type} para ${entityId} não encontrada. Usando padrão.`);
            const defaultConfig = this.getConfigPadrao();
            if (await this.salvarConfigRemoto(type, entityId, defaultConfig)) {
                 this.config = defaultConfig;
                 return this.config;
            } else {
                console.error("Erro ao criar e salvar configuração padrão.");
                return null;
            }
        }
    } catch (error) {
        console.error("❌ Erro ao carregar configuração:", error);
        return null;
    }
  }

  // Salvar configuração remotamente
  async salvarConfigRemoto(type, entityId, configData) {
    try {
        const response = await fetch(`${BASE_API_URL}/config/save.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: type, entity_id: entityId, config_data: configData })
        });
        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                window.location.href = 'posto-login.html';
                return false;
            }
            throw new Error(`Erro HTTP! status: ${response.status}`);
        }
        const result = await response.json();
        if (result.status === 'success') {
            this.config = configData;
            console.log("✅ Configuração salva com sucesso no servidor!");
            return true;
        } else {
            console.error(`❌ Erro ao salvar configuração no servidor: ${result.message}`);
            return false;
        }
    } catch (error) {
        console.error("❌ Erro na requisição de salvar configuração:", error);
        return false;
    }
  }

  // Salvar a configuração do posto atualmente logado
  salvarConfig(type, entityId, configData = this.config) {
    return this.salvarConfigRemoto(type, entityId, configData);
  }

  // Obter configuração (agora síncrono, lê do cache `this.config`)
  getConfig() {
    if (!this.config) {
      console.warn("Configuração não carregada. Chame carregarConfig() primeiro.");
      return null;
    }
    return this.config;
  }

  // Atualizar configuração
  async atualizarConfig(novaConfig) { // Adicionado async
    this.config = { ...this.config, ...novaConfig };
    const postoData = window.postoManager.getPostoAtual();
    const saved = await this.salvarConfig('posto', postoData.posto_id, this.config); // Salva no backend
    if (saved) {
      this.aplicarCores();
      this.aplicarTextos();
      this.aplicarLogo();
    }
  }

  // Aplicar cores no CSS
  aplicarCores() {
    const root = document.documentElement
    const cores = this.config.cores

    if (cores) {
      root.style.setProperty("--yellow-primary", cores.primaria)
      root.style.setProperty("--red-primary", cores.secundaria)
      root.style.setProperty("--bg-dark", cores.fundo)
      root.style.setProperty("--bg-card", cores.cards)
      root.style.setProperty("--text-primary", cores.texto)
      root.style.setProperty("--blue-primary", cores.botoes)
      root.style.setProperty("--green-primary", cores.sucesso)
      root.style.setProperty(
        "--primary-gradient",
        `linear-gradient(135deg, ${cores.primaria} 0%, ${cores.secundaria} 100%)`,
      )
    }
  }

  // Aplicar textos
  aplicarTextos() {
    const textos = this.config.textos

    if (textos) {
      const tituloSistema = document.getElementById("titulo-sistema")
      if (tituloSistema) {
        tituloSistema.textContent = textos.tituloSistema
      }

      const tituloAdmin = document.getElementById("titulo-admin")
      if (tituloAdmin) {
        tituloAdmin.textContent = textos.tituloAdmin
      }
    }
  }

  // Aplicar logo
  aplicarLogo() {
    const sistema = this.config.sistema

    if (sistema && sistema.logoPath) {
      const logoElements = document.querySelectorAll("#btn-central-logo, .logo-img")
      logoElements.forEach((logo) => {
        if (logo) {
          // Ajuste o caminho para ser sempre absoluto a partir da raiz do domínio
          // para evitar 404s em diferentes subpastas do projeto.
          // Ex: /roleta-premium/api/uploads/logos/minhalogo.png
          // ou /roleta-premium/placeholder.svg
          // CORREÇÃO: Usar window.location.origin para garantir caminho absoluto.
          // A parte '/roleta-premium/' deve ser ajustada para o diretório raiz do seu projeto no servidor.
          logo.src = `${window.location.origin}/roleta-premium/${sistema.logoPath}`;
        }
      })
    }
  }

  // Reset para configuração padrão
  async resetConfig() { // Adicionado async
    const postoData = window.postoManager.getPostoAtual();
    this.config = this.getConfigPadrao(); // Usa a versão local padrão
    const saved = await this.salvarConfig('posto', postoData.posto_id, this.config); // Salva no backend
    if (saved) {
      this.aplicarCores();
      this.aplicarTextos();
      this.aplicarLogo();
      console.log("✅ Configuração resetada para padrão");
    }
  }

  // Obter um modelo padrão para o prêmio "TENTE NOVAMENTE"
  getTenteNovamenteTemplate() {
    return { text: "TENTE NOVAMENTE", color: "#94a3b8", isPrize: false, estoque: 0, valor: 0 };
  }

  // Obter configuração padrão
  getConfigPadrao() {
    return {
      sistema: {
        nomeCliente: "Sistema Premium",
        // CORREÇÃO: Caminho para placeholder.svg consistente com o HTML e js/admin-script.js
        logoPath: "api/uploads/logos/placeholder.svg", // Caminho relativo ao projeto, mas absoluto para o servidor
        senhaAdmin: "admin123",
        valorMinimo: 50,
        valorPorGiro: 100,
        totalIds: 200,
        duracaoGiro: 4500,
      },
      cores: {
        primaria: "#fbce07",
        secundaria: "#ff0000",
        fundo: "#0f0f23",
        cards: "#1a1a2e",
        texto: "#ffffff",
        botoes: "#4facfe",
        sucesso: "#43e97b",
        erro: "#ff6b6b",
        aviso: "#f093fb",
        info: "#4facfe",
      },
      textos: {
        tituloSistema: "Roleta da Sorte",
        subtituloSistema: "Sistema Premium",
        tituloAdmin: "Admin Panel",
        versaoSistema: "v5.0 Premium",
      },
      // ALTERAÇÃO AQUI: idsPremiados agora inicia vazio na configuração padrão
      idsPremiados: [],
    }
  }
}

// Instância global
window.configManager = new ConfigManager()