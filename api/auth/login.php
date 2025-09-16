<?php
// api/auth/login.php - PARA LOGIN DE POSTOS

// Removido: session_start(); (agora em includes/auth.php)
header('Content-Type: application/json');

// --- MANTENHA ESTAS LINHAS PARA DEPURACAO ---
error_reporting(E_ALL);
ini_set('display_errors', 1); // Garante que os erros e 'echo's apareçam na resposta
// ------------------------------------------

require_once '../config/db.php';
require_once '../includes/auth.php'; // Inclui auth.php para iniciar a sessão

$response = ['status' => 'error', 'message' => ''];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);

    $username_input = trim($data['username'] ?? '');
    $senha_input = trim($data['password'] ?? '');

    // DEBUG: O que o PHP recebeu?
    error_log("POSTO LOGIN DEBUG: Username recebido: '" . $username_input . "'");
    error_log("POSTO LOGIN DEBUG: Senha recebida: '" . $senha_input . "'");

    if (empty($username_input) || empty($senha_input)) {
        $response['message'] = 'Usuário e senha são obrigatórios.';
        echo json_encode($response);
        exit();
    }

    try {
        $stmt = $pdo->prepare("SELECT
                                    u.id AS user_admin_id,
                                    u.username,
                                    u.password_hash,
                                    u.email,
                                    u.role,
                                    p.id AS posto_id,
                                    p.nome AS posto_nome,
                                    p.cnpj AS posto_cnpj
                               FROM
                                    usuarios_admin u
                               JOIN
                                    postos p ON u.posto_id = p.id
                               WHERE
                                    u.username = :username AND u.role = 'posto'
                               LIMIT 1");
        $stmt->bindParam(':username', $username_input);
        $stmt->execute();
        $posto_user = $stmt->fetch(PDO::FETCH_ASSOC);

        // DEBUG: O usuário foi encontrado?
        if ($posto_user) {
            error_log("POSTO LOGIN DEBUG: Usuário encontrado no BD. Username: '" . $posto_user['username'] . "', Role: '" . $posto_user['role'] . "'");
            error_log("POSTO LOGIN DEBUG: Hash no BD: '" . $posto_user['password_hash'] . "'");

            // DEBUG: Comparando a senha de entrada com o hash do BD
            $password_match = password_verify($senha_input, $posto_user['password_hash']);
            error_log("POSTO LOGIN DEBUG: Resultado de password_verify(): " . ($password_match ? 'TRUE' : 'FALSE'));

            if ($password_match) {
                $_SESSION['logado'] = true;
                $_SESSION['user_id'] = $posto_user['user_admin_id'];
                $_SESSION['user_role'] = $posto_user['role'];
                $_SESSION['posto_id'] = $posto_user['posto_id'];
                $_SESSION['posto_nome'] = $posto_user['posto_nome'];
                $_SESSION['posto_cnpj'] = $posto_user['posto_cnpj'];

                $response['status'] = 'success';
                $response['message'] = 'Login do posto bem-sucedido!';
                // É importante NUNCA retornar o hash da senha para o frontend por segurança.
                unset($posto_user['password_hash']);
                $response['data'] = $posto_user; // Retorna os dados do posto para o frontend
            } else {
                $response['message'] = 'Credenciais inválidas.';
            }
        } else {
            error_log("POSTO LOGIN DEBUG: Usuário '" . $username_input . "' COM ROLE 'posto' NÃO ENCONTRADO no BD.");
            $response['message'] = 'Credenciais inválidas.';
        }

    } catch (PDOException $e) {
        $response['message'] = 'Erro interno do servidor: ' . $e->getMessage();
        error_log("Erro de Login do Posto (DB): " . $e->getMessage());
    }
} else {
    $response['message'] = 'Método de requisição não permitido.';
}

echo json_encode($response);
?>