<?php
// api/postos/add.php
require_once '../config/db.php';
require_once '../includes/auth.php';

protectEndpoint('master');

validateRequestMethod('POST');

$data = json_decode(file_get_contents('php://input'), true);

$nome = trim($data['nome'] ?? '');
$cnpj = preg_replace('/\D/', '', $data['cnpj'] ?? ''); // Limpa o CNPJ
$email = trim($data['email'] ?? '');
$senha_raw = trim($data['senha'] ?? '');

if (empty($nome) || empty($cnpj) || empty($senha_raw)) {
    sendJsonResponse('error', 'Nome, CNPJ e senha são obrigatórios.');
}

try {
    // 1. Verificar se CNPJ já existe
    $stmt_check_cnpj = $pdo->prepare("SELECT id FROM postos WHERE cnpj = :cnpj LIMIT 1");
    $stmt_check_cnpj->bindParam(':cnpj', $cnpj);
    $stmt_check_cnpj->execute();
    if ($stmt_check_cnpj->rowCount() > 0) {
        sendJsonResponse('error', 'CNPJ já cadastrado.');
    }

    $pdo->beginTransaction();

    // 2. Inserir posto na tabela 'postos'
    $posto_id = $cnpj; // Usar o CNPJ limpo como ID do posto
    $stmt_posto = $pdo->prepare("INSERT INTO postos (id, nome, cnpj, email) VALUES (:id, :nome, :cnpj, :email)");
    $stmt_posto->bindParam(':id', $posto_id);
    $stmt_posto->bindParam(':nome', $nome);
    $stmt_posto->bindParam(':cnpj', $cnpj);
    $stmt_posto->bindParam(':email', $email);
    $stmt_posto->execute();

    // 3. Criar usuário admin para o posto na tabela 'usuarios_admin'
    $password_hash = password_hash($senha_raw, PASSWORD_DEFAULT);
    $stmt_user = $pdo->prepare("INSERT INTO usuarios_admin (username, password_hash, role, posto_id, email) VALUES (:username, :password_hash, 'posto', :posto_id, :email)");
    $stmt_user->bindParam(':username', $posto_id); // O username de login será o ID do posto (CNPJ)
    $stmt_user->bindParam(':password_hash', $password_hash);
    $stmt_user->bindParam(':posto_id', $posto_id);
    $stmt_user->bindParam(':email', $email);
    $stmt_user->execute();

    // 4. Criar configuração padrão para o posto na tabela 'configuracoes'
    // Defina uma configuração padrão JSON aqui para novos postos
    $total_ids_padrao = 200; // Define o número total de IDs que este posto terá (padrão)
    $num_premiados_padrao = 10; // Define quantos IDs serão premiados (padrão)

    $default_config_data = [
        'sistema' => [
            'nomeCliente' => $nome,
            'logoPath' => 'placeholder.svg?height=80&width=80',
            'senhaAdmin' => 'admin123', // Será substituída no front ou gerenciada pelo backend
            'valorMinimo' => 50,
            'valorPorGiro' => 100,
            'totalIds' => $total_ids_padrao, // Usar a variável definida
            'duracaoGiro' => 4500,
        ],
        'cores' => [
            'primaria' => '#fbce07',
            'secundaria' => '#ff0000',
            'fundo' => '#0f0f23',
            'cards' => '#1a1a2e',
            'texto' => '#ffffff',
            'botoes' => '#4facfe',
            'sucesso' => '#43e97b',
            'erro' => '#ff6b6b',
            'aviso' => '#f093fb',
            'info' => '#4facfe',
        ],
        'textos' => [
            'tituloSistema' => 'Roleta da Sorte',
            'subtituloSistema' => 'Sistema Premium',
            'tituloAdmin' => 'Admin Panel',
            'versaoSistema' => 'v5.0 Premium',
        ],
        // >>>>> LINHA ALTERADA AQUI PARA GERAR IDS ALEATORIOS <<<<<
        'idsPremiados' => generateRandomPremiumIds($total_ids_padrao, $num_premiados_padrao),
    ];
    $default_config_json = json_encode($default_config_data);

    $stmt_config = $pdo->prepare("INSERT INTO configuracoes (type, entity_id, config_data) VALUES ('posto', :posto_id, :config_data)");
    $stmt_config->bindParam(':posto_id', $posto_id);
    $stmt_config->bindParam(':config_data', $default_config_json);
    $stmt_config->execute();

    // 5. Adicionar prêmios padrão (TENTE NOVAMENTE)
    $stmt_tente_novamente = $pdo->prepare("INSERT INTO premios (posto_id, text, color, is_prize, estoque, valor) VALUES (:posto_id, :text, :color, :is_prize, :estoque, :valor)");
    $tente_novamente_text = "TENTE NOVAMENTE";
    $tente_novamente_color = "#94a3b8";
    $false_bool = false;
    $zero_int = 0;
    $zero_float = 0.00;
    $stmt_tente_novamente->bindParam(':posto_id', $posto_id);
    $stmt_tente_novamente->bindParam(':text', $tente_novamente_text);
    $stmt_tente_novamente->bindParam(':color', $tente_novamente_color);
    $stmt_tente_novamente->bindParam(':is_prize', $false_bool, PDO::PARAM_BOOL);
    $stmt_tente_novamente->bindParam(':estoque', $zero_int, PDO::PARAM_INT);
    $stmt_tente_novamente->bindParam(':valor', $zero_float, PDO::PARAM_STR);
    $stmt_tente_novamente->execute();


    $pdo->commit(); // Confirma a transação

    sendJsonResponse('success', 'Posto cadastrado com sucesso!', ['posto_id' => $posto_id]);

} catch (PDOException $e) {
    $pdo->rollBack(); // Reverte a transação em caso de erro
    error_log("Erro ao cadastrar posto: " . $e->getMessage());
    sendJsonResponse('error', 'Erro interno do servidor ao cadastrar posto: ' . $e->getMessage());
}