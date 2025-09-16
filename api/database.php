-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Tempo de geração: 16/09/2025 às 16:32
-- Versão do servidor: 10.4.32-MariaDB
-- Versão do PHP: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Banco de dados: `roletapremium_db`
--

-- --------------------------------------------------------

--
-- Estrutura para tabela `clientes`
--

CREATE TABLE `clientes` (
  `id` varchar(255) NOT NULL,
  `posto_id` varchar(255) NOT NULL,
  `nome` varchar(255) NOT NULL,
  `cpf` varchar(14) NOT NULL,
  `telefone` varchar(20) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `giros_disponiveis` int(11) NOT NULL DEFAULT 0,
  `valor_abastecido` decimal(10,2) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estrutura para tabela `configuracoes`
--

CREATE TABLE `configuracoes` (
  `id` int(11) NOT NULL,
  `type` enum('master','posto') NOT NULL,
  `entity_id` varchar(255) NOT NULL,
  `config_data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`config_data`)),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Despejando dados para a tabela `configuracoes`
--

INSERT INTO `configuracoes` (`id`, `type`, `entity_id`, `config_data`, `created_at`, `updated_at`) VALUES
(201, 'posto', '01010101000111', '{\"sistema\":{\"nomeCliente\":\"Posto Santa F\\u00e9\",\"logoPath\":\"placeholder.svg?height=80&width=80\",\"senhaAdmin\":\"admin123\",\"valorMinimo\":50,\"valorPorGiro\":100,\"totalIds\":200,\"duracaoGiro\":4500},\"cores\":{\"primaria\":\"#fbce07\",\"secundaria\":\"#ff0000\",\"fundo\":\"#0f0f23\",\"cards\":\"#1a1a2e\",\"texto\":\"#ffffff\",\"botoes\":\"#4facfe\",\"sucesso\":\"#43e97b\",\"erro\":\"#ff6b6b\",\"aviso\":\"#f093fb\",\"info\":\"#4facfe\"},\"textos\":{\"tituloSistema\":\"Roleta da Sorte\",\"subtituloSistema\":\"Sistema Premium\",\"tituloAdmin\":\"Admin Panel\",\"versaoSistema\":\"v5.0 Premium\"},\"idsPremiados\":[13,29,42,63,76,77,92,118,153,171]}', '2025-09-16 11:46:10', '2025-09-16 11:47:30');

-- --------------------------------------------------------

--
-- Estrutura para tabela `postos`
--

CREATE TABLE `postos` (
  `id` varchar(255) NOT NULL,
  `nome` varchar(255) NOT NULL,
  `cnpj` varchar(255) NOT NULL,
  `email` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `ativo` tinyint(1) DEFAULT 1,
  `total_giros` int(11) DEFAULT 0,
  `premios_ganhos` int(11) DEFAULT 0,
  `receita_total` decimal(10,2) DEFAULT 0.00,
  `ultimo_acesso` timestamp NULL DEFAULT NULL,
  `senha` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Despejando dados para a tabela `postos`
--

INSERT INTO `postos` (`id`, `nome`, `cnpj`, `email`, `created_at`, `updated_at`, `ativo`, `total_giros`, `premios_ganhos`, `receita_total`, `ultimo_acesso`, `senha`) VALUES
('01010101000111', 'Posto Santa Fé', '01010101000111', 'santafe@gmail.com', '2025-09-16 11:46:10', '2025-09-16 11:46:10', 1, 0, 0, 0.00, NULL, '');

-- --------------------------------------------------------

--
-- Estrutura para tabela `premios`
--

CREATE TABLE `premios` (
  `id` int(11) NOT NULL,
  `posto_id` varchar(255) NOT NULL,
  `text` varchar(255) NOT NULL,
  `color` varchar(7) NOT NULL,
  `is_prize` tinyint(1) NOT NULL,
  `estoque` int(11) DEFAULT 0,
  `valor` decimal(10,2) DEFAULT 0.00,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Despejando dados para a tabela `premios`
--

INSERT INTO `premios` (`id`, `posto_id`, `text`, `color`, `is_prize`, `estoque`, `valor`, `created_at`, `updated_at`) VALUES
(102, '01010101000111', 'TENTE NOVAMENTE', '#94a3b8', 0, 0, 0.00, '2025-09-16 11:46:10', '2025-09-16 11:46:10'),
(103, '01010101000111', 'SMART WATCH', '#fbce07', 1, 10, 10000.00, '2025-09-16 11:47:18', '2025-09-16 11:47:18');

-- --------------------------------------------------------

--
-- Estrutura para tabela `sorteios`
--

CREATE TABLE `sorteios` (
  `id` int(11) NOT NULL,
  `posto_id` varchar(255) NOT NULL,
  `cliente_id` varchar(255) NOT NULL,
  `id_sorteado` int(11) NOT NULL,
  `ganhou` tinyint(1) NOT NULL,
  `premio_nome` varchar(255) NOT NULL,
  `premio_valor` decimal(10,2) DEFAULT 0.00,
  `giro_numero` int(11) NOT NULL,
  `total_giros_sessao` int(11) NOT NULL,
  `timestamp` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estrutura para tabela `usuarios_admin`
--

CREATE TABLE `usuarios_admin` (
  `id` int(11) NOT NULL,
  `username` varchar(255) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `role` enum('master','posto') NOT NULL,
  `posto_id` varchar(255) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `ativo` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Despejando dados para a tabela `usuarios_admin`
--

INSERT INTO `usuarios_admin` (`id`, `username`, `password_hash`, `role`, `posto_id`, `email`, `ativo`, `created_at`, `updated_at`) VALUES
(1, 'masteradmin', '$2y$10$LQW4.H3D3VNUYqwdM8QllelaPxLhrr7ykf.nj42CtqYy/pokAisli', 'master', NULL, 'admin@example.com', 1, '2025-09-16 11:29:12', '2025-09-16 11:29:12'),
(58, '01010101000111', '$2y$10$oUJH9HTAoLv9H1KUU6JG6er9IrmNwJ.bQHsoXgyv84HR87llpHysi', 'posto', '01010101000111', 'santafe@gmail.com', 1, '2025-09-16 11:46:10', '2025-09-16 11:46:10');

--
-- Índices para tabelas despejadas
--

--
-- Índices de tabela `clientes`
--
ALTER TABLE `clientes`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `posto_id` (`posto_id`,`cpf`),
  ADD KEY `posto_id_2` (`posto_id`,`cpf`);

--
-- Índices de tabela `configuracoes`
--
ALTER TABLE `configuracoes`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `entity_id` (`entity_id`),
  ADD KEY `type` (`type`,`entity_id`);

--
-- Índices de tabela `postos`
--
ALTER TABLE `postos`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `cnpj` (`cnpj`),
  ADD KEY `nome` (`nome`);

--
-- Índices de tabela `premios`
--
ALTER TABLE `premios`
  ADD PRIMARY KEY (`id`),
  ADD KEY `posto_id` (`posto_id`,`is_prize`);

--
-- Índices de tabela `sorteios`
--
ALTER TABLE `sorteios`
  ADD PRIMARY KEY (`id`),
  ADD KEY `cliente_id` (`cliente_id`),
  ADD KEY `posto_id` (`posto_id`,`cliente_id`,`timestamp`);

--
-- Índices de tabela `usuarios_admin`
--
ALTER TABLE `usuarios_admin`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `username` (`username`),
  ADD UNIQUE KEY `email` (`email`),
  ADD KEY `role` (`role`,`posto_id`);

--
-- AUTO_INCREMENT para tabelas despejadas
--

--
-- AUTO_INCREMENT de tabela `configuracoes`
--
ALTER TABLE `configuracoes`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=206;

--
-- AUTO_INCREMENT de tabela `premios`
--
ALTER TABLE `premios`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=104;

--
-- AUTO_INCREMENT de tabela `sorteios`
--
ALTER TABLE `sorteios`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT de tabela `usuarios_admin`
--
ALTER TABLE `usuarios_admin`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=59;

--
-- Restrições para tabelas despejadas
--

--
-- Restrições para tabelas `clientes`
--
ALTER TABLE `clientes`
  ADD CONSTRAINT `clientes_ibfk_1` FOREIGN KEY (`posto_id`) REFERENCES `postos` (`id`) ON DELETE CASCADE;

--
-- Restrições para tabelas `premios`
--
ALTER TABLE `premios`
  ADD CONSTRAINT `premios_ibfk_1` FOREIGN KEY (`posto_id`) REFERENCES `postos` (`id`) ON DELETE CASCADE;

--
-- Restrições para tabelas `sorteios`
--
ALTER TABLE `sorteios`
  ADD CONSTRAINT `sorteios_ibfk_1` FOREIGN KEY (`posto_id`) REFERENCES `postos` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `sorteios_ibfk_2` FOREIGN KEY (`cliente_id`) REFERENCES `clientes` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
