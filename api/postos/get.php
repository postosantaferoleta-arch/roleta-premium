<?php
// api/postos/get.php
require_once '../config/db.php';
require_once '../includes/auth.php';

protectEndpoint('master'); // Apenas o master pode listar todos os postos

validateRequestMethod('GET');

try {
    $stmt = $pdo->query("SELECT id, nome, cnpj, email, ativo, total_giros as totalGiros, premios_ganhos as premiosGanhos, receita_total as receita, ultimo_acesso as ultimoAcesso FROM postos ORDER BY nome ASC");
    $postos = $stmt->fetchAll(PDO::FETCH_ASSOC);

    sendJsonResponse('success', 'Postos listados com sucesso.', $postos);
} catch (PDOException $e) {
    error_log("Erro ao listar postos: " . $e->getMessage());
    sendJsonResponse('error', 'Erro interno do servidor ao listar postos.');
}
?>