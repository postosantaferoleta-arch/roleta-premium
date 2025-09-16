<?php
// api/sorteios/register.php
error_reporting(E_ALL); // Habilita a exibição de todos os erros, warnings e notices.
ini_set('display_errors', 1); // Garante que os erros e 'echo's apareçam na resposta.

require_once '../config/db.php';
require_once '../includes/auth.php'; // Contém session_start() e a função protectEndpoint()

// A função protectEndpoint() vai verificar se o usuário está logado e tem a role 'posto'.
// Se não estiver autenticado/autorizado, ela envia uma resposta JSON de erro e encerra o script.
protectEndpoint('posto');

// A função validateRequestMethod() vai verificar se a requisição é POST.
// Se não for, ela envia uma resposta JSON de erro e encerra o script.
validateRequestMethod('POST');

// O código a seguir só será executado se o usuário estiver autenticado e a requisição for POST.

// Inicializa a variável $response (embora sendJsonResponse cuide da saída final)
$response = ['status' => 'error', 'message' => ''];

// As linhas de DEBUG devem vir *APÓS* a decodificação do JSON, para que $data esteja preenchido.
// O conteúdo bruto da requisição POST é lido do 'php://input'.
$raw_input = file_get_contents('php://input');
$data = json_decode($raw_input, true); // Decodifica o JSON para um array associativo

// --- LINHAS DE DEBUG PARA O LOG DE ERROS DO APACHE/PHP ---
error_log("DEBUG REGISTER: Conteúdo de _SESSION['posto_id']: " . ($_SESSION['posto_id'] ?? 'NULL'));
error_log("DEBUG REGISTER: Raw input (se algo chegou): " . $raw_input); // Útil para ver se o input está vazio
error_log("DEBUG REGISTER: Dados recebidos no payload (data): " . print_r($data, true)); // Mostra o array decodificado
error_log("DEBUG REGISTER: Cliente ID: " . ($data['participante']['id'] ?? 'NULL'));
error_log("DEBUG REGISTER: ID Sorteado: " . ($data['id_sorteado'] ?? 'NULL'));
error_log("DEBUG REGISTER: Prêmio Nome: " . ($data['premio_nome'] ?? 'NULL'));
error_log("DEBUG REGISTER: Giro Número: " . ($data['giro_numero'] ?? 'NULL'));
error_log("DEBUG REGISTER: Total Giros Sessão: " . ($data['total_giros_sessao'] ?? 'NULL'));
// --- FIM DAS LINHAS DE DEBUG ---

// Coleta e sanitiza os dados do array $data
$posto_id = $_SESSION['posto_id']; // Obtém o posto_id da sessão (já verificado por protectEndpoint)
$cliente_id = $data['participante']['id'] ?? ''; // ID do cliente vindo do frontend
$id_sorteado = (int)($data['id_sorteado'] ?? 0); // ID numérico sorteado na roleta
$ganhou = (bool)($data['ganhou'] ?? false); // Booleano: true se ganhou, false se não
$premio_nome = trim($data['premio_nome'] ?? ''); // Nome do prêmio (ou "TENTE NOVAMENTE")
$premio_valor = (float)($data['premio_valor'] ?? 0.00); // Valor monetário do prêmio
$giro_numero = (int)($data['giro_numero'] ?? 0); // Número do giro atual na sessão do cliente
$total_giros_sessao = (int)($data['total_giros_sessao'] ?? 0); // Total de giros que o cliente tinha na sessão
$valor_por_giro_atual = (float)($data['valor_por_giro_atual'] ?? 0.00); // Valor do abastecimento / giros originais

// Validação dos dados essenciais antes de prosseguir
if (empty($posto_id) || empty($cliente_id) || $id_sorteado <= 0 || empty($premio_nome) || $giro_numero <= 0 || $total_giros_sessao <= 0) {
    sendJsonResponse('error', 'Dados do sorteio incompletos ou inválidos.');
    exit(); // Garante que o script pare aqui se a validação falhar
}

try {
    // Inicia uma transação para garantir a atomicidade das operações no banco de dados
    $pdo->beginTransaction();

    // 1. Registrar o sorteio na tabela 'sorteios'
    $stmt_sorteio = $pdo->prepare("INSERT INTO sorteios (posto_id, cliente_id, id_sorteado, ganhou, premio_nome, premio_valor, giro_numero, total_giros_sessao)
                                   VALUES (:posto_id, :cliente_id, :id_sorteado, :ganhou, :premio_nome, :premio_valor, :giro_numero, :total_giros_sessao)");
    $stmt_sorteio->bindParam(':posto_id', $posto_id);
    $stmt_sorteio->bindParam(':cliente_id', $cliente_id);
    $stmt_sorteio->bindParam(':id_sorteado', $id_sorteado, PDO::PARAM_INT);
    $stmt_sorteio->bindParam(':ganhou', $ganhou, PDO::PARAM_BOOL);
    $stmt_sorteio->bindParam(':premio_nome', $premio_nome);
    $stmt_sorteio->bindParam(':premio_valor', $premio_valor, PDO::PARAM_STR); // Salva como string para precisão decimal
    $stmt_sorteio->bindParam(':giro_numero', $giro_numero, PDO::PARAM_INT);
    $stmt_sorteio->bindParam(':total_giros_sessao', $total_giros_sessao, PDO::PARAM_INT);
    $stmt_sorteio->execute();

    // 2. Decrementar giros disponíveis do cliente na tabela 'clientes'
    // Garante que o giro só seja decrementado se ainda houver giros disponíveis (> 0) para o cliente e posto corretos.
    $stmt_cliente_giros = $pdo->prepare("UPDATE clientes SET giros_disponiveis = giros_disponiveis - 1, updated_at = CURRENT_TIMESTAMP WHERE id = :cliente_id AND posto_id = :posto_id AND giros_disponiveis > 0");
    $stmt_cliente_giros->bindParam(':cliente_id', $cliente_id);
    $stmt_cliente_giros->bindParam(':posto_id', $posto_id);
    $stmt_cliente_giros->execute();

    // Se nenhuma linha foi afetada, significa que o cliente não tinha giros ou não foi encontrado (problema de sincronização/estado)
    if ($stmt_cliente_giros->rowCount() === 0) {
        $pdo->rollBack(); // Reverte todas as operações da transação
        sendJsonResponse('error', 'Erro: cliente sem giros disponíveis ou não encontrado para a atualização.');
        exit();
    }

    // 3. Opcional: Decrementar estoque do prêmio se o cliente ganhou e for um prêmio real
    if ($ganhou) {
        // Apenas decrementa o estoque se o prêmio é marcado como is_prize e ainda tem estoque disponível.
        $stmt_premio_estoque = $pdo->prepare("UPDATE premios SET estoque = estoque - 1, updated_at = CURRENT_TIMESTAMP WHERE posto_id = :posto_id AND text = :premio_nome AND is_prize = TRUE AND estoque > 0");
        $stmt_premio_estoque->bindParam(':posto_id', $posto_id);
        $stmt_premio_estoque->bindParam(':premio_nome', $premio_nome);
        $stmt_premio_estoque->execute();

        // Se nenhuma linha foi afetada, significa que o prêmio não foi encontrado, não era um prêmio, ou estava sem estoque.
        if ($stmt_premio_estoque->rowCount() === 0) {
            $pdo->rollBack(); // Reverte todas as operações da transação
            sendJsonResponse('error', 'Erro: Prêmios indisponíveis ou esgotados para o prêmio selecionado. Não foi possível registrar o ganho.');
            exit();
        }
    }

    // 4. Atualizar estatísticas do posto na tabela 'postos'
    // Incrementa total_giros e, se ganhou, premios_ganhos. Se houver valor, incrementa receita_total.
    $update_stats_query = "UPDATE postos SET total_giros = total_giros + 1, ultimo_acesso = CURRENT_TIMESTAMP";
    if ($ganhou) {
        $update_stats_query .= ", premios_ganhos = premios_ganhos + 1";
    }
    if ($valor_por_giro_atual > 0) {
        $update_stats_query .= ", receita_total = receita_total + :valor_giro_atual";
    }
    $update_stats_query .= " WHERE id = :posto_id";

    $stmt_posto_stats = $pdo->prepare($update_stats_query);
    $stmt_posto_stats->bindParam(':posto_id', $posto_id);
    if ($valor_por_giro_atual > 0) {
        $stmt_posto_stats->bindParam(':valor_giro_atual', $valor_por_giro_atual, PDO::PARAM_STR);
    }
    $stmt_posto_stats->execute();

    // Confirma a transação se todas as operações foram bem-sucedidas
    $pdo->commit();

    sendJsonResponse('success', 'Sorteio registrado e dados atualizados com sucesso!');

} catch (PDOException $e) {
    // Em caso de qualquer erro no banco de dados, reverte a transação
    $pdo->rollBack();
    // Registra o erro completo no log do servidor para depuração
    error_log("Erro ao registrar sorteio (DB): " . $e->getMessage());
    // Envia uma mensagem genérica de erro para o frontend (não expõe detalhes internos)
    sendJsonResponse('error', 'Erro interno do servidor ao registrar sorteio.');
}