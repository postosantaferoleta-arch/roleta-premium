<?php
// api/config/save.php
require_once '../config/db.php';
require_once '../includes/auth.php';

validateRequestMethod('POST');

$data = json_decode(file_get_contents('php://input'), true);

$type = $data['type'] ?? '';
$entity_id = $data['entity_id'] ?? '';
$config_data_json = json_encode($data['config_data'] ?? []); // Converte o array PHP em JSON para salvar
if (empty($type) || empty($entity_id) || empty($config_data_json)) {
    sendJsonResponse('error', 'Dados de configuração incompletos.');
}

// Lógica de autorização: Quem pode salvar qual tipo de configuração
if ($type === 'posto') {
    protectEndpoint('posto'); // Apenas usuários de posto logados podem salvar (e para o seu posto)
    // A validação do posto_id vs $_SESSION['posto_id'] já está em protectEndpoint()
} elseif ($type === 'master') {
    protectEndpoint('master'); // Apenas Master Admin pode salvar a configuração global
} else {
    sendJsonResponse('error', 'Tipo de configuração inválido.');
}

try {
    // Tenta atualizar a configuração existente
    $stmt = $pdo->prepare("UPDATE configuracoes SET config_data = :config_data, updated_at = CURRENT_TIMESTAMP WHERE type = :type AND entity_id = :entity_id");
    $stmt->bindParam(':config_data', $config_data_json);
    $stmt->bindParam(':type', $type);
    $stmt->bindParam(':entity_id', $entity_id);
    $stmt->execute();

    if ($stmt->rowCount() === 0) {
        // Se nenhuma linha foi afetada, significa que a configuração não existe, então insere
        $stmt = $pdo->prepare("INSERT INTO configuracoes (type, entity_id, config_data) VALUES (:type, :entity_id, :config_data)");
        $stmt->bindParam(':type', $type);
        $stmt->bindParam(':entity_id', $entity_id);
        $stmt->bindParam(':config_data', $config_data_json);
        $stmt->execute();
    }

    sendJsonResponse('success', 'Configuração salva com sucesso.');
} catch (PDOException $e) {
    error_log("Erro ao salvar configuração: " . $e->getMessage());
    sendJsonResponse('error', 'Erro interno do servidor ao salvar configuração.');
}
?>