<?php
// api/premios/get.php
require_once '../config/db.php';
require_once '../includes/auth.php';

protectEndpoint('posto');

validateRequestMethod('GET');

$posto_id = $_SESSION['posto_id'];

try {
    // CORREÇÃO FINAL AQUI: Ordena por created_at e, em caso de empate, por id para garantir a ordem exata de inserção
    $stmt = $pdo->prepare("SELECT id, text, color, is_prize as isPrize, estoque, valor FROM premios WHERE posto_id = :posto_id ORDER BY created_at ASC, id ASC");
    $stmt->bindParam(':posto_id', $posto_id);
    $stmt->execute();
    $premios = $stmt->fetchAll(PDO::FETCH_ASSOC);

    sendJsonResponse('success', 'Prêmios listados com sucesso.', $premios);
} catch (PDOException $e) {
    error_log("Erro ao listar prêmios: " . $e->getMessage());
    sendJsonResponse('error', 'Erro interno do servidor ao listar prêmios.');
}
?>