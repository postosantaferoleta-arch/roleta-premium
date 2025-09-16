<?php
// api/config/get.php
require_once '../config/db.php';
require_once '../includes/auth.php';

validateRequestMethod('GET');

$type = $_GET['type'] ?? '';
$entity_id = $_GET['entity_id'] ?? '';

if (empty($type) || empty($entity_id)) {
    sendJsonResponse('error', 'Parâmetros "type" e "entity_id" são obrigatórios.');
}

// Lógica de autorização interna
if ($type === 'posto') {
    // Para configurações de posto, exige login de posto e que o ID corresponda
    if (!isPostoAuthenticated($entity_id)) {
        header('HTTP/1.1 401 Unauthorized');
        sendJsonResponse('error', 'Acesso negado. Você não está autenticado para este posto.');
    }
} elseif ($type === 'master') {
    // Para configurações master, exige login master
    if (!isMasterAuthenticated()) {
        header('HTTP/1.1 401 Unauthorized');
        sendJsonResponse('error', 'Acesso negado. Apenas o Master Admin pode acessar a configuração global.');
    }
} else {
    sendJsonResponse('error', 'Tipo de configuração inválido.');
}

try {
    $stmt = $pdo->prepare("SELECT config_data FROM configuracoes WHERE type = :type AND entity_id = :entity_id LIMIT 1");
    $stmt->bindParam(':type', $type);
    $stmt->bindParam(':entity_id', $entity_id);
    $stmt->execute();
    $config = $stmt->fetch();

    if ($config) {
        sendJsonResponse('success', 'Configuração encontrada.', json_decode($config['config_data']));
    } else {
        // Se a configuração não existe, retorna uma mensagem de erro. O frontend deve lidar com isso.
        sendJsonResponse('error', 'Configuração não encontrada para o tipo e ID especificados.');
    }
} catch (PDOException $e) {
    error_log("Erro ao buscar configuração: " . $e->getMessage());
    sendJsonResponse('error', 'Erro interno do servidor ao buscar configuração.');
}
?>