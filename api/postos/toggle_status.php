<?php
// api/postos/toggle_status.php
require_once '../config/db.php';
require_once '../includes/auth.php';

protectEndpoint('master');

validateRequestMethod('POST');

$data = json_decode(file_get_contents('php://input'), true);

$posto_id = trim($data['id'] ?? '');
$status = (bool)($data['ativo'] ?? null); // true para ativar, false para desativar

if (empty($posto_id) || $status === null) {
    sendJsonResponse('error', 'ID do posto e status são obrigatórios.');
}

try {
    $pdo->beginTransaction();

    // Atualizar status do posto na tabela 'postos'
    $stmt_posto = $pdo->prepare("UPDATE postos SET ativo = :ativo, updated_at = CURRENT_TIMESTAMP WHERE id = :id");
    $stmt_posto->bindParam(':ativo', $status, PDO::PARAM_BOOL);
    $stmt_posto->bindParam(':id', $posto_id);
    $stmt_posto->execute();

    // Atualizar status do usuário admin na tabela 'usuarios_admin'
    $stmt_user = $pdo->prepare("UPDATE usuarios_admin SET ativo = :ativo, updated_at = CURRENT_TIMESTAMP WHERE posto_id = :posto_id AND role = 'posto'");
    $stmt_user->bindParam(':ativo', $status, PDO::PARAM_BOOL);
    $stmt_user->bindParam(':posto_id', $posto_id);
    $stmt_user->execute();

    if ($stmt_posto->rowCount() > 0) {
        $pdo->commit();
        sendJsonResponse('success', 'Status do posto atualizado com sucesso!', ['ativo' => $status]);
    } else {
        $pdo->rollBack();
        sendJsonResponse('error', 'Posto não encontrado.');
    }
} catch (PDOException $e) {
    $pdo->rollBack();
    error_log("Erro ao alternar status do posto: " . $e->getMessage());
    sendJsonResponse('error', 'Erro interno do servidor ao alternar status do posto: ' . $e->getMessage());
}
?>