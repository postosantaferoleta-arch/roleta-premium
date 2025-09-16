<?php   
error_reporting(E_ALL); // Reporta todos os erros, avisos e notices
ini_set('display_errors', 1); // Exibe os erros na tela
// ... o restante do seu código ...
// api/premios/update_premiados_ids.php
// Este script calcula a quantidade de IDs premiados com base na soma do estoque de prêmios reais.

// api/premios/update_premiados_ids.php

// api/premios/update_premiados_ids.php

// Inclui arquivos de configuração e autenticação necessários.
require_once '../config/db.php';    // Corrigido: apenas um '../' para subir para 'api/'
require_once '../includes/auth.php'; // Corrigido: apenas um '../' para subir para 'api/'

// ... o restante do seu código ...

// ... o restante do seu código ...

// ATENÇÃO: Para depuração, você pode ativar a exibição de erros aqui temporariamente.
// REMOVA ESTAS DUAS LINHAS EM PRODUÇÃO!
// error_reporting(E_ALL);
// ini_set('display_errors', 1);

// Garante que apenas usuários de posto autenticados possam acessar este endpoint.
protectEndpoint('posto');

// Garante que a requisição seja do tipo POST.
validateRequestMethod('POST');

// Obtém o ID do posto da sessão do usuário autenticado.
$posto_id = $_SESSION['posto_id'];

try {
    // 1. Soma o estoque de todos os prêmios que são 'reais' (is_prize = TRUE) para este posto.
    $stmt_sum_stock = $pdo->prepare("SELECT SUM(estoque) AS total_real_stock FROM premios WHERE posto_id = :posto_id AND is_prize = TRUE");
    $stmt_sum_stock->bindParam(':posto_id', $posto_id);
    $stmt_sum_stock->execute();
    $total_real_stock = (int)$stmt_sum_stock->fetchColumn(); // Converte para inteiro.

    // 2. Define o número de IDs que serão premiados.
    // O número será a soma total do estoque real, limitado por um valor máximo para evitar muitos IDs premiados.
    $max_premiable_ids_pool = 50; // Definimos um limite de 50 IDs que podem ser premiados. Ajuste conforme sua necessidade.
    $num_premiados = min($total_real_stock, $max_premiable_ids_pool);

    // 3. Busca a configuração atual do posto no banco de dados para pegar o total de IDs do sistema.
    $stmt_config = $pdo->prepare("SELECT config_data FROM configuracoes WHERE type = 'posto' AND entity_id = :posto_id LIMIT 1");
    $stmt_config->bindParam(':posto_id', $posto_id);
    $stmt_config->execute();
    $config_row = $stmt_config->fetch(PDO::FETCH_ASSOC);

    // Inicializa os dados da configuração, se não existirem, ou decodifica os existentes.
    $current_config_data = [];
    if ($config_row) {
        $current_config_data = json_decode($config_row['config_data'], true);
    }

    // Pega o total de IDs do sistema da configuração atual, com um fallback para o padrão.
    $total_ids_sistema = $current_config_data['sistema']['totalIds'] ?? 200;

    // >>>>> LINHA CORRIGIDA AQUI: USANDO generateRandomPremiumIds <<<<<
    if ($num_premiados == 0) { // Se não houver prêmios em estoque, a lista de IDs premiados é vazia
        $new_ids_premiados = [];
    } else {
        // Gera a nova lista de IDs premiados aleatórios utilizando a função já existente.
        $new_ids_premiados = generateRandomPremiumIds($total_ids_sistema, $num_premiados);
    }
    
    // 4. Atualiza a propriedade 'idsPremiados' na configuração.
    $current_config_data['idsPremiados'] = $new_ids_premiados;

    // 5. Codifica os dados da configuração de volta para JSON.
    $updated_config_data_json = json_encode($current_config_data);

    // 6. Salva a configuração atualizada no banco de dados.
    // Usa ON DUPLICATE KEY UPDATE para inserir se não existir, ou atualizar se já existir.
    $stmt_update_config = $pdo->prepare("INSERT INTO configuracoes (type, entity_id, config_data) VALUES ('posto', :posto_id, :config_data) ON DUPLICATE KEY UPDATE config_data = VALUES(config_data), updated_at = CURRENT_TIMESTAMP");
    $stmt_update_config->bindParam(':posto_id', $posto_id);
    $stmt_update_config->bindParam(':config_data', $updated_config_data_json);
    $stmt_update_config->execute();

    // Envia uma resposta de sucesso com os IDs atualizados.
    sendJsonResponse('success', 'IDs premiados atualizados com sucesso.', ['num_premiados' => count($new_ids_premiados), 'ids_gerados' => $new_ids_premiados]);

} catch (PDOException $e) {
    // Captura e registra erros de banco de dados.
    error_log("Erro ao atualizar IDs premiados (DB): " . $e->getMessage());
    sendJsonResponse('error', 'Erro interno do servidor ao atualizar IDs premiados: ' . $e->getMessage());
} catch (Exception $e) {
    // Captura e registra outros erros inesperados.
    error_log("Erro ao atualizar IDs premiados: " . $e->getMessage());
    sendJsonResponse('error', 'Erro inesperado ao atualizar IDs premiados: ' . $e->getMessage());
}
// É seguro omitir a tag de fechamento PHP para evitar espaços em branco indesejados.