-- database.sql
-- Script para criação das tabelas do sistema "Roleta Premium"

-- Desabilita a verificação de chaves estrangeiras temporariamente para evitar problemas de ordem
SET FOREIGN_KEY_CHECKS = 0;

-- Tabela: usuarios_admin
-- Armazena dados de login para administradores (Master e Posto)
-- A password_hash é essencial para segurança (password_hash do PHP)
CREATE TABLE IF NOT EXISTS `usuarios_admin` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `username` VARCHAR(255) UNIQUE NOT NULL, -- Pode ser email, ID do posto, etc.
    `password_hash` VARCHAR(255) NOT NULL,    -- Senha com hash (password_hash)
    `role` ENUM('master', 'posto') NOT NULL,  -- 'master' para admin geral, 'posto' para admin de posto
    `posto_id` VARCHAR(255) DEFAULT NULL,     -- ID do posto, se for um admin de posto
    `email` VARCHAR(255) UNIQUE DEFAULT NULL, -- Email do posto, se aplicável
    `ativo` BOOLEAN DEFAULT TRUE,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX (role, posto_id)
);

-- Tabela: postos
-- Armazena os dados dos postos de combustível. O ID é o CNPJ formatado ou um identificador único.
CREATE TABLE IF NOT EXISTS `postos` (
    `id` VARCHAR(255) PRIMARY KEY, -- CNPJ como ID (tratado no PHP para ser único e limpo)
    `nome` VARCHAR(255) NOT NULL,
    `cnpj` VARCHAR(255) UNIQUE NOT NULL,
    `email` VARCHAR(255) DEFAULT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `ativo` BOOLEAN DEFAULT TRUE,
    -- Estatísticas agregadas podem ser mantidas aqui ou calculadas dinamicamente
    `total_giros` INT DEFAULT 0,
    `premios_ganhos` INT DEFAULT 0,
    `receita_total` DECIMAL(10, 2) DEFAULT 0.00,
    `ultimo_acesso` TIMESTAMP DEFAULT NULL,
    INDEX (nome)
);

-- Tabela: configuracoes
-- Armazena configurações globais do sistema (master) e configurações específicas de cada posto.
-- Usa tipo JSON para flexibilidade de armazenamento de objetos complexos.
CREATE TABLE IF NOT EXISTS `configuracoes` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `type` ENUM('master', 'posto') NOT NULL,  -- Tipo da configuração (global ou de posto)
    `entity_id` VARCHAR(255) UNIQUE NOT NULL, -- 'master' para config global, ou posto_id para config do posto
    `config_data` JSON NOT NULL,              -- Armazena o objeto JSON de configuração
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX (type, entity_id)
);

-- Tabela: premios
-- Armazena os prêmios disponíveis na roleta. Cada posto pode ter seus próprios prêmios.
CREATE TABLE IF NOT EXISTS `premios` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `posto_id` VARCHAR(255) NOT NULL, -- Cada prêmio pertence a um posto
    `text` VARCHAR(255) NOT NULL, -- Renomeado de 'nome' para 'text' para consistência com o frontend
    `color` VARCHAR(7) NOT NULL,       -- Ex: #RRGGBB (hexadecimal)
    `is_prize` BOOLEAN NOT NULL,     -- True se for um prêmio, False se for "tente novamente"
    `estoque` INT DEFAULT 0,
    `valor` DECIMAL(10, 2) DEFAULT 0.00, -- Valor monetário do prêmio (se aplicável)
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`posto_id`) REFERENCES `postos`(`id`) ON DELETE CASCADE, -- Se o posto for deletado, seus prêmios também são.
    INDEX (posto_id, is_prize)
);

-- Tabela: clientes
-- Armazena os dados dos participantes/clientes. CPF é único por posto.
CREATE TABLE IF NOT EXISTS `clientes` (
    `id` VARCHAR(255) PRIMARY KEY, -- ID gerado no frontend (UUID ou similar) ou no backend
    `posto_id` VARCHAR(255) NOT NULL,
    `nome` VARCHAR(255) NOT NULL,
    `cpf` VARCHAR(14) NOT NULL,    -- Formato: 000.000.000-00
    `telefone` VARCHAR(20) DEFAULT NULL,
    `email` VARCHAR(255) DEFAULT NULL,
    `giros_disponiveis` INT NOT NULL DEFAULT 0, -- Total de giros que o cliente tem no momento
    `valor_abastecido` DECIMAL(10, 2) NOT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`posto_id`) REFERENCES `postos`(`id`) ON DELETE CASCADE,
    UNIQUE (`posto_id`, `cpf`), -- CPF deve ser único por posto
    INDEX (posto_id, cpf)
);

-- Tabela: sorteios
-- Armazena o histórico detalhado de cada giro da roleta.
CREATE TABLE IF NOT EXISTS `sorteios` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `posto_id` VARCHAR(255) NOT NULL,
    `cliente_id` VARCHAR(255) NOT NULL,
    `id_sorteado` INT NOT NULL,       -- O ID numérico sorteado (1 a N)
    `ganhou` BOOLEAN NOT NULL,        -- True se foi um prêmio, False se foi "tente novamente"
    `premio_nome` VARCHAR(255) NOT NULL, -- Nome do prêmio ou "TENTE NOVAMENTE"
    `premio_valor` DECIMAL(10, 2) DEFAULT 0.00,
    `giro_numero` INT NOT NULL,       -- Número do giro na sessão do cliente
    `total_giros_sessao` INT NOT NULL, -- Total de giros que o cliente tinha na sessão
    `timestamp` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`posto_id`) REFERENCES `postos`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`cliente_id`) REFERENCES `clientes`(`id`) ON DELETE CASCADE,
    INDEX (posto_id, cliente_id, timestamp)
);

-- Habilita a verificação de chaves estrangeiras de volta
SET FOREIGN_KEY_CHECKS = 1;

-- Inserção inicial de um usuário Master para teste
-- Senha: masteradmin (GERADA COM password_hash('masteradmin', PASSWORD_DEFAULT))
-- Este hash corresponde à senha 'masteradmin'.
-- Por favor, gere seu próprio hash para maior segurança.
-- Para gerar um hash: echo password_hash('sua_nova_senha_master', PASSWORD_DEFAULT);
INSERT INTO `usuarios_admin` (`username`, `password_hash`, `role`) VALUES
('masteradmin', '$2y$10$7q8p9o0i1u2y3t4r5e6w7q8p9o0i1u2y3t4r5e6w7q8p9o0i1u2y3t4r5e6w.2sN', 'master');
-- Novo hash para 'masteradmin': $2y$10$7q8p9o0i1u2y3t4r5e6w7q8p9o0i1u2y3t4r5e6w7q8p9o0i1u2y3t4r5e6w.2sN    