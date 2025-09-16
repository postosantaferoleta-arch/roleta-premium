<?php
// api/premios/update.php
require_once '../config/db.php';
require_once '../includes/auth.php';

protectEndpoint('posto');

validateRequestMethod('POST'); // Ou PUT, mas POST é mais comum para formulários

$data = json_decode(file_get_contents('php://input'), true);

$posto_id = $_SESSION['posto_id'];
$premio_id = (int)($data['id'] ?? 0); // ID do prêmio a ser atualizado
$text = trim($data['text'] ?? '');
$color = trim($data['color'] ?? '');
$is_prize = (bool)($data['isPrize'] ?? false);
$estoque = (int)($data['estoque'] ?? 0);
$valor = (float)($data['valor'] ?? 0.00);

if (empty($posto_id) || $premio_id <= 0 || empty($text) || empty($color)) {
    sendJsonResponse('error', 'Dados do prêmio incompletos ou ID inválido.');
}

try {
    $stmt = $pdo->prepare("UPDATE premios SET text = :text, color = :color, is_prize = :is_prize, estoque = :estoque, valor = :valor, updated_at = CURRENT_TIMESTAMP WHERE id = :premio_id AND posto_id = :posto_id");
    $stmt->bindParam(':text', $text);
    $stmt->bindParam(':color', $color);
    $stmt->bindParam(':is_prize', $is_prize, PDO::PARAM_BOOL);
    $stmt->bindParam(':estoque', $estoque, PDO::PARAM_INT);
    $stmt->bindParam(':valor', $valor, PDO::PARAM_STR);
    $stmt->bindParam(':premio_id', $premio_id, PDO::PARAM_INT);
    $stmt->bindParam(':posto_id', $posto_id);
    $stmt->execute();

    if ($stmt->rowCount() > 0) {
        sendJsonResponse('success', 'Prêmio atualizado com sucesso!');
    } else {
        sendJsonResponse('error', 'Prêmio não encontrado ou nenhuma alteração realizada.');
    }
} catch (PDOException $e) {
    error_log("Erro ao atualizar prêmio: " . $e->getMessage());
    sendJsonResponse('error', 'Erro interno do servidor ao atualizar prêmio.');
}
?>