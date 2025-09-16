<?php
// api/system/reset.php
// Este endpoint é para o MASTER ADMIN resetar o sistema inteiro.
require_once '../config/db.php';
require_once '../includes/auth.php';

protectEndpoint('master'); // APENAS master admin pode resetar o sistema inteiro

validateRequestMethod('POST');

$data = json_decode(file_get_contents('php://input'), true);
$confirmation_password = $data['password'] ?? '';

// Obter a senha master atual do DB (para validação)
$stmt_master_config = $pdo->prepare("SELECT config_data FROM configuracoes WHERE type = 'master' AND entity_id = 'master'");
$stmt_master_config->execute();
$master_config_data = $stmt_master_config->fetch(PDO::FETCH_ASSOC);
$master_password_from_db = '';
if ($master_config_data) {
    $master_config_obj = json_decode($master_config_data['config_data'], true);
    $master_password_from_db = $master_config_obj['senhaMaster'] ?? ''; // Ou do usuarios_admin
}

// Para uma validação mais robusta, você pode buscar o password_hash do usuário 'masteradmin'
// na tabela `usuarios_admin` e usar `password_verify`.
$stmt_master_user = $pdo->prepare("SELECT password_hash FROM usuarios_admin WHERE username = 'masteradmin' AND role = 'master'");
$stmt_master_user->execute();
$master_user_hash = $stmt_master_user->fetchColumn();

if (!$master_user_hash || !password_verify($confirmation_password, $master_user_hash)) {
    sendJsonResponse('error', 'Senha de confirmação inválida.');
}

try {
    $pdo->beginTransaction();

    // Desabilitar chaves estrangeiras para permitir o truncamento (se houver ciclos ou dependências complexas)
    $pdo->exec("SET FOREIGN_KEY_CHECKS = 0;");

    // Truncar todas as tabelas (limpa todos os dados, reiniciando o estado)
    $pdo->exec("TRUNCATE TABLE sorteios;");
    $pdo->exec("TRUNCATE TABLE clientes;");
    $pdo->exec("TRUNCATE TABLE premios;");
    $pdo->exec("TRUNCATE TABLE configuracoes;");
    $pdo->exec("TRUNCATE TABLE postos;");
    // Cuidado: TRUNCATE TABLE usuarios_admin; vai remover o master admin também!
    // Se você quer manter o master admin, faça um DELETE específico:
    $pdo->exec("DELETE FROM usuarios_admin WHERE role != 'master';"); // Remove todos os admins de posto

    // Reabilitar chaves estrangeiras
    $pdo->exec("SET FOREIGN_KEY_CHECKS = 1;");

    // Recriar a configuração master padrão (se ela foi truncada ou para garantir estado inicial)
    $default_master_config = [
        'senhaMaster' => password_hash('master2024', PASSWORD_DEFAULT), // Nova senha master padrão (usada na config_data)
        'backupAutomatico' => 'semanal',
        'logRetention' => 30,
        'maxPostos' => 100,
    ];
    $default_master_config_json = json_encode($default_master_config);
    $stmt_insert_master_config = $pdo->prepare("INSERT INTO configuracoes (type, entity_id, config_data) VALUES ('master', 'master', :config_data)");
    $stmt_insert_master_config->bindParam(':config_data', $default_master_config_json);
    $stmt_insert_master_config->execute();

    // Garante que o usuário master admin ainda exista e tenha a nova senha padrão
    $stmt_master_admin_exists = $pdo->prepare("SELECT id FROM usuarios_admin WHERE username = 'masteradmin' AND role = 'master'");
    $stmt_master_admin_exists->execute();
    if ($stmt_master_admin_exists->rowCount() == 0) {
        $stmt_insert_master_admin = $pdo->prepare("INSERT INTO usuarios_admin (username, password_hash, role) VALUES ('masteradmin', :password_hash, 'master')");
        $stmt_insert_master_admin->bindParam(':password_hash', password_hash('masteradmin', PASSWORD_DEFAULT)); // Usar a senha 'masteradmin' para este
        $stmt_insert_master_admin->execute();
    } else {
        // Atualiza a senha do masteradmin existente para a padrão (de 'masteradmin')
        $stmt_update_master_admin = $pdo->prepare("UPDATE usuarios_admin SET password_hash = :password_hash WHERE username = 'masteradmin' AND role = 'master'");
        $stmt_update_master_admin->bindParam(':password_hash', password_hash('masteradmin', PASSWORD_DEFAULT));
        $stmt_update_master_admin->execute();
    }


    $pdo->commit();
    sendJsonResponse('success', 'Sistema resetado completamente para o estado inicial!');

} catch (PDOException $e) {
    $pdo->rollBack();
    error_log("Erro ao resetar sistema: " . $e->getMessage());
    sendJsonResponse('error', 'Erro interno do servidor ao resetar sistema: ' . $e->getMessage());
}
?>