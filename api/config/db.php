<?php
// api/config/db.php

// Define constantes para as credenciais do banco de dados
// !!! ATENÇÃO: SUBSTITUA ESTES VALORES COM OS DADOS DO SEU SERVIDOR DE HOSPEDAGEM !!!
// --- MODIFICAÇÃO PARA XAMPP ---
define('DB_HOST', 'localhost'); // Host do MySQL no XAMPP
define('DB_NAME', 'roletapremium_db'); // O nome que você deu ao seu banco de dados
define('DB_USER', 'root');     // Usuário padrão do MySQL no XAMPP
define('DB_PASS', '');         // Senha padrão do MySQL no XAMPP (deixe em branco)
// --- FIM DA MODIFICAÇÃO ---

// Esta linha envia a mensagem para o log de erros do PHP, não para o navegador.
// Pode ser útil para depuração no servidor, mas pode ser removida em produção.
error_log("DEBUG: Nome do DB lido por " . __FILE__ . " (OLD PROJECT) é: " . DB_NAME);

// A linha abaixo foi removida/comentada, pois ela causava o erro ao imprimir
// o debug e encerrar o script antes que o JSON pudesse ser gerado.
// die("DEBUG NO BROWSER: Arquivo em execucao: " . __FILE__ . " (OLD PROJECT) | DB_NAME lido: " . DB_NAME);

// Define o DSN (Data Source Name)
$dsn = 'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4';

// Define as opções do PDO para segurança e tratamento de erros
$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION, // Lança exceções em erros de SQL
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,     // Retorna arrays associativos por padrão
    PDO::ATTR_EMULATE_PREPARES   => false,                // Desabilita a emulação de prepared statements (melhor para segurança e performance)
];

// Tenta conectar ao banco de dados
try {
    $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
} catch (PDOException $e) {
    // Em caso de erro na conexão, loga o erro e encerra a aplicação
    // Em produção, NUNCA exiba detalhes do erro diretamente ao usuário.
    error_log("Erro de conexão com o banco de dados: " . $e->getMessage());
    die("Erro interno do servidor. Por favor, tente novamente mais tarde.");
}

// --- ALTERAÇÕES AQUI ---
// REMOVIDO: header('Content-Type: application/json');
// Esta linha foi removida daqui, pois já é tratada pela função sendJsonResponse().
// A duplicação pode causar "headers already sent" se algo for impresso antes.
// --- FIM DAS ALTERAÇÕES ---

/**
 * Gera um array de IDs premiados aleatórios e únicos.
 * Utiliza array_rand() para garantir a seleção aleatória e única.
 *
 * @param int $totalIds O número total de IDs possíveis no sistema (ex: 200).
 * @param int $numPremiumIds O número de IDs premiados a serem gerados (padrão: 10).
 * @return array Um array de inteiros com os IDs premiados aleatórios.
 */
function generateRandomPremiumIds(int $totalIds, int $numPremiumIds = 10): array {
    error_log("#### TESTE DE CODIGO ATUALIZADO ####");
    error_log("DEBUG: generateRandomPremiumIds - Parâmetros recebidos: totalIds={$totalIds}, numPremiumIds={$numPremiumIds}");

    if ($numPremiumIds > $totalIds) {
        $numPremiumIds = $totalIds; // Não pode ter mais IDs premiados do que o total de IDs.
        error_log("DEBUG: generateRandomPremiumIds - numPremiumIds ajustado para {$numPremiumIds} (era maior que totalIds).");
    }

    $allIds = range(1, $totalIds); // Cria um array [1, 2, ..., totalIds]
    error_log("DEBUG: generateRandomPremiumIds - allIds (antes da seleção): " . implode(", ", $allIds));

    // Se o número de IDs premiados for 0, retorna um array vazio.
    if ($numPremiumIds <= 0) {
        error_log("DEBUG: generateRandomPremiumIds - numPremiumIds é zero ou negativo. Retornando array vazio.");
        return [];
    }

    // array_rand retorna as chaves dos elementos aleatoriamente selecionados.
    // Se numPremiumIds for 1, retorna uma única chave (não um array).
    // Se numPremiumIds for > 1, retorna um array de chaves.
    $randomKeys = array_rand($allIds, $numPremiumIds);
    
    // Convertemos randomKeys para array para facilitar a iteração se for apenas 1 elemento
    $keysToProcess = is_array($randomKeys) ? $randomKeys : [$randomKeys];
    error_log("DEBUG: generateRandomPremiumIds - Chaves aleatórias selecionadas: " . implode(", ", $keysToProcess));


    $resultIds = [];
    foreach ($keysToProcess as $key) {
        $resultIds[] = $allIds[$key];
    }

    // Opcional: ordenar os IDs para exibição (não essencial para aleatoriedade, mas útil para leitura)
    // sort($resultIds); 
    // <<<<<<<<<<<< ATENÇÃO: VERIFIQUE SE A LINHA ACIMA ESTÁ COMENTADA (COM // NA FRENTE)

    error_log("DEBUG: generateRandomPremiumIds - IDs resultantes (antes de retornar): " . implode(", ", $resultIds));
    return $resultIds;
}


// Função auxiliar para retornar respostas JSON padronizadas
function sendJsonResponse($status, $message, $data = null) {
    // --- ALTERAÇÕES AQUI ---
    // Garante que o Content-Type seja JSON, caso não tenha sido definido antes
    if (!headers_sent()) {
        header('Content-Type: application/json');
    }
    // --- FIM DAS ALTERAÇÕES ---
    echo json_encode(['status' => $status, 'message' => $message, 'data' => $data]);
    exit(); // Encerra o script após enviar a resposta
}

// Função auxiliar para validar o método da requisição HTTP
function validateRequestMethod($method) {
    if ($_SERVER['REQUEST_METHOD'] !== $method) {
        header('HTTP/1.1 405 Method Not Allowed'); // Define o status HTTP 405
        sendJsonResponse('error', 'Método de requisição inválido. Esperado ' . $method);
    }
}