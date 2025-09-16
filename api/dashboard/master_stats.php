<?php
// api/dashboard/master_stats.php
require_once '../config/db.php';
require_once '../includes/auth.php';

protectEndpoint('master');

validateRequestMethod('GET');

try {
    // Total de Postos
    $total_postos = $pdo->query("SELECT COUNT(id) FROM postos")->fetchColumn();

    // Postos Ativos
    $postos_ativos = $pdo->query("SELECT COUNT(id) FROM postos WHERE ativo = TRUE")->fetchColumn();

    // Total de Giros (Global)
    $total_giros = $pdo->query("SELECT SUM(total_giros) FROM postos")->fetchColumn();
    $total_giros = $total_giros === null ? 0 : (int)$total_giros;

    // Receita Total (Global)
    $receita_total = $pdo->query("SELECT SUM(receita_total) FROM postos")->fetchColumn();
    $receita_total = $receita_total === null ? 0.00 : (float)$receita_total;

    $response_data = [
        'totalPostos' => $total_postos,
        'postosAtivos' => $postos_ativos,
        'totalGiros' => $total_giros,
        'receitaTotal' => $receita_total,
    ];

    sendJsonResponse('success', 'Estatísticas master carregadas com sucesso.', $response_data);

} catch (PDOException $e) {
    error_log("Erro ao carregar estatísticas master: " . $e->getMessage());
    sendJsonResponse('error', 'Erro interno do servidor ao carregar estatísticas master.');
}
?>