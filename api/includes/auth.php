<?php
// api/includes/auth.php
// Este arquivo é responsável por gerenciar a autenticação e autorização via sessões PHP.

// session_start() deve ser a PRIMEIRA coisa executada em qualquer script que use sessões,
// antes de qualquer saída (inclusive espaços em branco).
session_start();

// Função para verificar se o usuário está logado e qual seu papel
function isAuthenticated($required_role = null) {
    if (!isset($_SESSION['user_id']) || !isset($_SESSION['user_role'])) {
        return false; // Usuário não está logado
    }

    if ($required_role && $_SESSION['user_role'] !== $required_role) {
        return false; // Usuário logado, mas não tem o papel necessário
    }

    return true; // Usuário logado e possui o papel correto (se um foi especificado)
}

// Função para verificar se o posto está autenticado para o ID específico
function isPostoAuthenticated($posto_id_param = null) {
    if (!isAuthenticated('posto')) {
        return false; // Não é um usuário de posto logado
    }
    // Se um ID de posto específico for fornecido, verifica se o ID do posto na sessão corresponde
    if ($posto_id_param && $_SESSION['posto_id'] !== $posto_id_param) {
        return false; // Posto logado, mas o ID não corresponde ao ID da requisição
    }
    return true; // Posto logado e ID correspondente (se verificado)
}

// Função para verificar se o master admin está autenticado
function isMasterAuthenticated() {
    return isAuthenticated('master'); // Verifica se o usuário logado tem o papel 'master'
}

// Função principal para proteger endpoints da API
function protectEndpoint($role = null) {
    // Garante que o usuário está autenticado para o papel requerido
    if (!isAuthenticated($role)) {
        header('HTTP/1.1 401 Unauthorized'); // Resposta HTTP 401: Não Autorizado
        sendJsonResponse('error', 'Acesso não autorizado. Por favor, faça login.');
    }

    // Lógica adicional para proteger endpoints de posto:
    // Garante que um posto_id está sendo passado na URL (para GET) ou no corpo (para POST/PUT)
    // E que ele corresponde ao posto_id do usuário logado na sessão.
    if ($role === 'posto') {
        $request_posto_id = '';
        if ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_GET['posto_id'])) {
            $request_posto_id = $_GET['posto_id'];
        } elseif (isset($_SERVER['CONTENT_TYPE']) && strpos($_SERVER['CONTENT_TYPE'], 'application/json') !== false) {
            $data = json_decode(file_get_contents('php://input'), true);
            $request_posto_id = $data['posto_id'] ?? '';
        }

        // Se o posto_id não foi passado explicitamente na requisição,
        // assume-se que a operação é para o posto do usuário logado.
        // Isso é comum para operações como "meus prêmios", "meu dashboard".
        if (empty($request_posto_id)) {
             $request_posto_id = $_SESSION['posto_id'];
        }

        // Se o posto_id da requisição não corresponde ao posto_id da sessão, proíbe o acesso.
        if ($_SESSION['posto_id'] !== $request_posto_id) {
            header('HTTP/1.1 403 Forbidden'); // Resposta HTTP 403: Proibido
            sendJsonResponse('error', 'Acesso proibido. Você não tem permissão para acessar dados deste posto.');
        }
    }
}