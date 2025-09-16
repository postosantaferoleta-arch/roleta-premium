<?php
// api/postos/update.php
require_once '../config/db.php';
require_once '../includes/auth.php';

protectEndpoint('master');

validateRequestMethod('POST'); // Ou PUT

$data = json_decode(file_get_contents('php://input'), true);

$posto_id = trim($data['id'] ?? '');
$nome = trim($data['nome'] ?? '');
$cnpj = preg_replace('/\D/', '', $data['cnpj'] ?? '');
$email = trim($data['email'] ?? '');
$senha_raw = trim($data['senha'] ?? ''); // Senha pode ser opcional

if (empty($posto_id) || empty($nome) || empty($cnpj)) {
    sendJsonResponse('error', 'ID, Nome e CNPJ do posto são obrigatórios.');
}

try {
    $pdo->beginTransaction();

    // Atualizar dados do posto
    $stmt_posto = $pdo->prepare("UPDATE postos SET nome = :nome, cnpj = :cnpj, email = :email, updated_at = CURRENT_TIMESTAMP WHERE id = :id");
    $stmt_posto->bindParam(':nome', $nome);
    $stmt_posto->bindParam(':cnpj', $cnpj);
    $stmt_posto->bindParam(':email', $email);
    $stmt_posto->bindParam(':id', $posto_id);
    $stmt_posto->execute();

    // Atualizar dados de login do usuário admin (se senha fornecida ou email/username mudou)
    if (!empty($senha_raw)) {
        $password_hash = password_hash($senha_raw, PASSWORD_DEFAULT);
        $stmt_user = $pdo->prepare("UPDATE usuarios_admin SET username = :username, password_hash = :password_hash, email = :email, updated_at = CURRENT_TIMESTAMP WHERE posto_id = :posto_id AND role = 'posto'");
        $stmt_user->bindParam(':username', $posto_id); // O username de login será o ID do posto (CNPJ)
        $stmt_user->bindParam(':password_hash', $password_hash);
        $stmt_user->bindParam(':email', $email);
        $stmt_user->bindParam(':posto_id', $posto_id);
        $stmt_user->execute();
    } else {
         // Se a senha não foi fornecida, apenas atualiza username/email caso tenham mudado
         $stmt_user = $pdo->prepare("UPDATE usuarios_admin SET username = :username, email = :email, updated_at = CURRENT_TIMESTAMP WHERE posto_id = :posto_id AND role = 'posto'");
         $stmt_user->bindParam(':username', $posto_id);
         $stmt_user->bindParam(':email', $email);
         $stmt_user->bindParam(':posto_id', $posto_id);
         $stmt_user->execute();
    }

    $pdo->commit();
    sendJsonResponse('success', 'Posto atualizado com sucesso!');

} catch (PDOException $e) {
    $pdo->rollBack();
    error_log("Erro ao atualizar posto: " . $e->getMessage());
    sendJsonResponse('error', 'Erro interno do servidor ao atualizar posto: ' . $e->getMessage());
}
?>