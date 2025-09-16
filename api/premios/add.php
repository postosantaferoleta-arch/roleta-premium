<?php
// api/premios/add.php
require_once '../config/db.php';
require_once '../includes/auth.php';

protectEndpoint('posto');

validateRequestMethod('POST');

$data = json_decode(file_get_contents('php://input'), true);

$posto_id = $_SESSION['posto_id'];
$text = trim($data['text'] ?? '');
$color = trim($data['color'] ?? '');
$is_prize = (bool)($data['isPrize'] ?? false);
$estoque = (int)($data['estoque'] ?? 0);
$valor = (float)($data['valor'] ?? 0.00);

if (empty($posto_id) || empty($text) || empty($color)) {
    sendJsonResponse('error', 'Nome e cor do prêmio são obrigatórios.');
}

try {
    $stmt = $pdo->prepare("INSERT INTO premios (posto_id, text, color, is_prize, estoque, valor)
                           VALUES (:posto_id, :text, :color, :is_prize, :estoque, :valor)");
    $stmt->bindParam(':posto_id', $posto_id);
    $stmt->bindParam(':text', $text);
    $stmt->bindParam(':color', $color);
    $stmt->bindParam(':is_prize', $is_prize, PDO::PARAM_BOOL);
    $stmt->bindParam(':estoque', $estoque, PDO::PARAM_INT);
    $stmt->bindParam(':valor', $valor, PDO::PARAM_STR);
    $stmt->execute();

    sendJsonResponse('success', 'Prêmio adicionado com sucesso!', ['id' => $pdo->lastInsertId()]);
} catch (PDOException $e) {
    error_log("Erro ao adicionar prêmio: " . $e->getMessage());
    sendJsonResponse('error', 'Erro interno do servidor ao adicionar prêmio.');
}
?>