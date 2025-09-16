<?php
// api/premios/delete.php
require_once '../config/db.php';
require_once '../includes/auth.php';

protectEndpoint('posto');

validateRequestMethod('POST'); // Ou DELETE

$data = json_decode(file_get_contents('php://input'), true);

$posto_id = $_SESSION['posto_id'];
$premio_id = (int)($data['id'] ?? 0); // ID do prêmio a ser removido

if (empty($posto_id) || $premio_id <= 0) {
    sendJsonResponse('error', 'ID do prêmio inválido.');
}

try {
    $stmt = $pdo->prepare("DELETE FROM premios WHERE id = :premio_id AND posto_id = :posto_id");
    $stmt->bindParam(':premio_id', $premio_id, PDO::PARAM_INT);
    $stmt->bindParam(':posto_id', $posto_id);
    $stmt->execute();

    if ($stmt->rowCount() > 0) {
        sendJsonResponse('success', 'Prêmio removido com sucesso!');
    } else {
        sendJsonResponse('error', 'Prêmio não encontrado ou não pertence a este posto.');
    }
} catch (PDOException $e) {
    error_log("Erro ao remover prêmio: " . $e->getMessage());
    sendJsonResponse('error', 'Erro interno do servidor ao remover prêmio.');
}
?>  