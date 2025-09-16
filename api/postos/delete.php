<?php
// api/postos/delete.php
require_once '../config/db.php';
require_once '../includes/auth.php';

protectEndpoint('master');

validateRequestMethod('POST'); // Ou DELETE

$data = json_decode(file_get_contents('php://input'), true);

$posto_id = trim($data['id'] ?? '');

if (empty($posto_id)) {
    sendJsonResponse('error', 'ID do posto é obrigatório.');
}

try {
    $pdo->beginTransaction();

    // Deletar o usuário admin associado
    $stmt_user = $pdo->prepare("DELETE FROM usuarios_admin WHERE posto_id = :posto_id AND role = 'posto'");
    $stmt_user->bindParam(':posto_id', $posto_id);
    $stmt_user->execute();

    // Deletar a configuração do posto
    $stmt_config = $pdo->prepare("DELETE FROM configuracoes WHERE entity_id = :posto_id AND type = 'posto'");
    $stmt_config->bindParam(':posto_id', $posto_id);
    $stmt_config->execute();

    // O ON DELETE CASCADE no SQL já cuidará dos prêmios, clientes e sorteios associados ao posto.
    // Deletar o posto principal
    $stmt_posto = $pdo->prepare("DELETE FROM postos WHERE id = :posto_id");
    $stmt_posto->bindParam(':posto_id', $posto_id);
    $stmt_posto->execute();

    if ($stmt_posto->rowCount() > 0) {
        $pdo->commit();
        sendJsonResponse('success', 'Posto e todos os dados associados removidos com sucesso!');
    } else {
        $pdo->rollBack();
        sendJsonResponse('error', 'Posto não encontrado.');
    }
} catch (PDOException $e) {
    $pdo->rollBack();
    error_log("Erro ao deletar posto: " . $e->getMessage());
    sendJsonResponse('error', 'Erro interno do servidor ao deletar posto: ' . $e->getMessage());
}
?>