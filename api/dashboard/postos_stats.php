<?php
// api/dashboard/posto_stats.php
require_once '../config/db.php';
require_once '../includes/auth.php'; // Garante que session_start() seja chamado

protectEndpoint('posto');

validateRequestMethod('GET');

$posto_id = $_SESSION['posto_id'];

try {
    // Buscar informações do posto
    $stmt_posto = $pdo->prepare("SELECT total_giros, premios_ganhos, receita_total FROM postos WHERE id = :posto_id LIMIT 1");
    $stmt_posto->bindParam(':posto_id', $posto_id);
    $stmt_posto->execute();
    $posto_stats = $stmt_posto->fetch(PDO::FETCH_ASSOC);

    if (!$posto_stats) {
        sendJsonResponse('error', 'Posto não encontrado.');
    }

    // Buscar total de clientes para este posto
    $stmt_clientes = $pdo->prepare("SELECT COUNT(id) as total_clientes FROM clientes WHERE posto_id = :posto_id");
    $stmt_clientes->bindParam(':posto_id', $posto_id);
    $stmt_clientes->execute();
    $total_clientes = $stmt_clientes->fetchColumn();

    // Buscar total de prêmios (apenas is_prize = TRUE) configurados para este posto
    $stmt_premios = $pdo->prepare("SELECT COUNT(id) as premios_disponiveis FROM premios WHERE posto_id = :posto_id AND is_prize = TRUE");
    $stmt_premios->bindParam(':posto_id', $posto_id);
    $stmt_premios->execute();
    $premios_disponiveis = $stmt_premios->fetchColumn();

    // Buscar total de IDs (da configuração do posto) e IDs usados (do histórico de sorteios)
    $stmt_config = $pdo->prepare("SELECT config_data FROM configuracoes WHERE type = 'posto' AND entity_id = :posto_id LIMIT 1");
    $stmt_config->bindParam(':posto_id', $posto_id);
    $stmt_config->execute();
    $config_data = $stmt_config->fetch(PDO::FETCH_ASSOC);
    $total_ids = 0;
    if ($config_data) {
        $config_obj = json_decode($config_data['config_data'], true);
        $total_ids = $config_obj['sistema']['totalIds'] ?? 0;
    }

    $stmt_used_ids = $pdo->prepare("SELECT COUNT(DISTINCT id_sorteado) FROM sorteios WHERE posto_id = :posto_id");
    $stmt_used_ids->bindParam(':posto_id', $posto_id);
    $stmt_used_ids->execute();
    $used_ids_count = $stmt_used_ids->fetchColumn();
    $ids_restantes = $total_ids - $used_ids_count;

    $response_data = [
        'ids_restantes' => max(0, $ids_restantes), // Garante que não seja negativo
        'premios_ganhos' => $posto_stats['premios_ganhos'],
        'premios_disponiveis' => $premios_disponiveis,
        'total_clientes' => $total_clientes,
    ];

    sendJsonResponse('success', 'Estatísticas do posto carregadas com sucesso.', $response_data);

} catch (PDOException $e) {
    error_log("Erro ao carregar estatísticas do posto: " . $e->getMessage());
    sendJsonResponse('error', 'Erro interno do servidor ao carregar estatísticas do posto.');
}