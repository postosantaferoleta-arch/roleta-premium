<?php
// api/system/clear_history.php
require_once '../config/db.php';
require_once '../includes/auth.php';

protectEndpoint('posto'); // Pode ser master ou posto dependendo de quem tem permissão para limpar o histórico

validateRequestMethod('POST');

$posto_id = $_SESSION['posto_id'];

try {
    $pdo->beginTransaction();

    // Exclui todos os sorteios para o posto logado
    $stmt = $pdo->prepare("DELETE FROM sorteios WHERE posto_id = :posto_id");
    $stmt->bindParam(':posto_id', $posto_id);
    $stmt->execute();

    // Opcional: Atualizar estatísticas do posto (resetar premios_ganhos e total_giros)
    // Se você não quer resetar, remova esta parte.
    $stmt_posto_stats = $pdo->prepare("UPDATE postos SET total_giros = 0, premios_ganhos = 0, receita_total = 0, updated_at = CURRENT_TIMESTAMP WHERE id = :posto_id");
    $stmt_posto_stats->bindParam(':posto_id', $posto_id);
    $stmt_posto_stats->execute();

    // Opcional: Resetar idsPremiados na configuração do posto (se for um array dinâmico)
    // Se os idsPremiados são estáticos ou não devem ser resetados com o histórico, remova esta parte.
    $stmt_config = $pdo->prepare("SELECT config_data FROM configuracoes WHERE type = 'posto' AND entity_id = :posto_id");
    $stmt_config->bindParam(':posto_id', $posto_id);
    $stmt_config->execute();
    $config_row = $stmt_config->fetch(PDO::FETCH_ASSOC);

    if ($config_row) {
        $config_data = json_decode($config_row['config_data'], true);
        
        // >>>>> LINHA ALTERADA AQUI PARA GERAR NOVOS IDS ALEATORIOS <<<<<
        // Pegar o totalIds da própria configuração atual do posto
        $total_ids_posto = $config_data['sistema']['totalIds'] ?? 200; 
        $num_premiados = 10; // Definir quantos IDs premiados você quer gerar ao resetar

        $config_data['idsPremiados'] = generateRandomPremiumIds($total_ids_posto, $num_premiados);
        
        $updated_config_data_json = json_encode($config_data);

        $stmt_update_config = $pdo->prepare("UPDATE configuracoes SET config_data = :config_data WHERE type = 'posto' AND entity_id = :posto_id");
        $stmt_update_config->bindParam(':config_data', $updated_config_data_json);
        $stmt_update_config->bindParam(':posto_id', $posto_id);
        $stmt_update_config->execute();
    }


    $pdo->commit();
    sendJsonResponse('success', 'Histórico de sorteios limpo com sucesso!');

} catch (PDOException $e) {
    $pdo->rollBack();
    error_log("Erro ao limpar histórico: " . $e->getMessage());
    sendJsonResponse('error', 'Erro interno do servidor ao limpar histórico.');
}