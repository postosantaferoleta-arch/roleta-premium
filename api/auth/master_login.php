<?php
// api/auth/master_login.php
// Removido: session_start(); (agora em includes/auth.php)
header('Content-Type: application/json');

// --- LINHAS PARA DEPURACAO (REMOVA DEPOIS DE RESOLVER O ERRO FINAL E EM PRODUÇÃO) ---
error_reporting(E_ALL); // Reporta todos os erros
ini_set('display_errors', 1); // Exibe os erros na tela
// ----------------------------------------------------------------------------------

require_once '../config/db.php'; // Caminho para seu arquivo de conexão com o DB
require_once '../includes/auth.php'; // Inclui auth.php para iniciar a sessão

$response = ['status' => 'error', 'message' => ''];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Decodifica o JSON enviado pelo frontend
    $data = json_decode(file_get_contents('php://input'), true);

    $username = trim($data['username'] ?? ''); // Pega o nome de usuário
    $password = trim($data['password'] ?? ''); // Pega a senha

    // Validação de entrada
    if (empty($username) || empty($password)) {
        $response['message'] = 'Usuário e senha são obrigatórios.';
        echo json_encode($response);
        exit();
    }

    try {
        // Prepara a consulta para buscar o usuário na tabela 'usuarios_admin'
        // Ele deve ter a 'role' definida como 'master'.
        $stmt = $pdo->prepare("SELECT id, username, password_hash FROM usuarios_admin WHERE username = :username AND role = 'master' LIMIT 1");
        $stmt->bindParam(':username', $username);
        $stmt->execute();
        $master_user = $stmt->fetch(PDO::FETCH_ASSOC);

        // Verifica se o usuário master foi encontrado
        if ($master_user) {
            // Verifica a senha fornecida com o hash armazenado no banco de dados
            if (password_verify($password, $master_user['password_hash'])) {
                // Senha correta! Login bem-sucedido.

                // Define as variáveis de sessão para manter o usuário logado
                $_SESSION['master_logado'] = true;
                $_SESSION['user_id'] = $master_user['id']; // Altera para user_id para consistência
                $_SESSION['user_role'] = 'master'; // Define o papel da sessão
                $_SESSION['master_username'] = $master_user['username'];
                // Adicione outras variáveis de sessão se necessário (ex: permissões, configurações específicas do master)

                $response['status'] = 'success';
                $response['message'] = 'Login Master bem-sucedido!';
                // Por segurança, não envie o hash da senha de volta ao cliente
                unset($master_user['password_hash']);
                $response['data'] = $master_user; // Opcional: envia de volta alguns dados do master, exceto a senha
            } else {
                // Senha incorreta
                $response['message'] = 'Credenciais inválidas.'; // Mensagem genérica por segurança
            }
        } else {
            // Usuário master não encontrado com o username fornecido ou role incorreta
            $response['message'] = 'Credenciais inválidas.'; // Mensagem genérica por segurança
        }

    } catch (PDOException $e) {
        // Captura e trata erros do banco de dados (ex: problema de conexão)
        $response['message'] = 'Erro interno do servidor. Por favor, tente novamente mais tarde.';
        // É crucial registrar o erro completo para depuração, mas não o exiba para o usuário final
        error_log("Erro de Login Master (DB): " . $e->getMessage());
    }
} else {
    // Se a requisição não for POST (ex: alguém tentar acessar via GET diretamente)
    $response['message'] = 'Método de requisição não permitido.';
}

echo json_encode($response);
?>