<?php
// api/system/backup.php
require_once '../config/db.php';
require_once '../includes/auth.php';

// Este endpoint pode ser usado por master ou posto (com suas devidas autorizações)

validateRequestMethod('GET'); // Ou POST

$backup_type = $_GET['type'] ?? 'full'; // 'full' (master) ou 'posto' (posto_id)

if ($backup_type === 'full') {
    protectEndpoint('master');
    // Coletar dados de todas as tabelas
    $backup_data = [
        'timestamp' => date('Y-m-d H:i:s'),
        'version' => '1.0',
        'usuarios_admin' => $pdo->query("SELECT id, username, role, posto_id, email, ativo, created_at FROM usuarios_admin")->fetchAll(PDO::FETCH_ASSOC),
        'postos' => $pdo->query("SELECT id, nome, cnpj, email, ativo, total_giros, premios_ganhos, receita_total, ultimo_acesso, created_at, updated_at FROM postos")->fetchAll(PDO::FETCH_ASSOC),
        'configuracoes' => $pdo->query("SELECT id, type, entity_id, config_data, created_at, updated_at FROM configuracoes")->fetchAll(PDO::FETCH_ASSOC),
        'premios' => $pdo->query("SELECT id, posto_id, text, color, is_prize, estoque, valor, created_at, updated_at FROM premios")->fetchAll(PDO::FETCH_ASSOC),
        'clientes' => $pdo->query("SELECT id, posto_id, nome, cpf, telefone, email, giros_disponiveis, valor_abastecido, created_at, updated_at FROM clientes")->fetchAll(PDO::FETCH_ASSOC),
        'sorteios' => $pdo->query("SELECT id, posto_id, cliente_id, id_sorteado, ganhou, premio_nome, premio_valor, giro_numero, total_giros_sessao, timestamp FROM sorteios")->fetchAll(PDO::FETCH_ASSOC),
    ];
    $filename_suffix = 'full';

} elseif ($backup_type === 'posto') {
    protectEndpoint('posto');
    $posto_id = $_SESSION['posto_id']; // Usa o ID do posto da sessão

    // É preciso preparar e executar cada statement separadamente
    $stmtPosto = $pdo->prepare("SELECT id, nome, cnpj, email, ativo, total_giros, premios_ganhos, receita_total, ultimo_acesso, created_at, updated_at FROM postos WHERE id = :posto_id");
    $stmtPosto->bindParam(':posto_id', $posto_id);
    $stmtPosto->execute();
    $postoData = $stmtPosto->fetch(PDO::FETCH_ASSOC);

    $stmtUsers = $pdo->prepare("SELECT id, username, role, posto_id, email, ativo, created_at FROM usuarios_admin WHERE posto_id = :posto_id");
    $stmtUsers->bindParam(':posto_id', $posto_id);
    $stmtUsers->execute();
    $usersData = $stmtUsers->fetchAll(PDO::FETCH_ASSOC);

    $stmtConfig = $pdo->prepare("SELECT id, type, entity_id, config_data, created_at, updated_at FROM configuracoes WHERE entity_id = :posto_id AND type = 'posto'");
    $stmtConfig->bindParam(':posto_id', $posto_id);
    $stmtConfig->execute();
    $configData = $stmtConfig->fetch(PDO::FETCH_ASSOC);

    $stmtPremios = $pdo->prepare("SELECT id, posto_id, text, color, is_prize, estoque, valor, created_at, updated_at FROM premios WHERE posto_id = :posto_id");
    $stmtPremios->bindParam(':posto_id', $posto_id);
    $stmtPremios->execute();
    $premiosData = $stmtPremios->fetchAll(PDO::FETCH_ASSOC);

    $stmtClientes = $pdo->prepare("SELECT id, posto_id, nome, cpf, telefone, email, giros_disponiveis, valor_abastecido, created_at, updated_at FROM clientes WHERE posto_id = :posto_id");
    $stmtClientes->bindParam(':posto_id', $posto_id);
    $stmtClientes->execute();
    $clientesData = $stmtClientes->fetchAll(PDO::FETCH_ASSOC);

    $stmtSorteios = $pdo->prepare("SELECT id, posto_id, cliente_id, id_sorteado, ganhou, premio_nome, premio_valor, giro_numero, total_giros_sessao, timestamp FROM sorteios WHERE posto_id = :posto_id");
    $stmtSorteios->bindParam(':posto_id', $posto_id);
    $stmtSorteios->execute();
    $sorteiosData = $stmtSorteios->fetchAll(PDO::FETCH_ASSOC);

    $backup_data = [
        'timestamp' => date('Y-m-d H:i:s'),
        'version' => '1.0',
        'posto' => $postoData,
        'usuarios_admin_posto' => $usersData,
        'configuracoes_posto' => $configData,
        'premios_posto' => $premiosData,
        'clientes_posto' => $clientesData,
        'sorteios_posto' => $sorteiosData,
    ];
    $filename_suffix = 'posto-' . $posto_id;

} else {
    sendJsonResponse('error', 'Tipo de backup inválido.');
}

// Configurações para download
$filename = "backup-roletapremium-" . $filename_suffix . "-" . date('Ymd_His') . ".json";

header('Content-Description: File Transfer');
header('Content-Type: application/json');
header('Content-Disposition: attachment; filename="' . $filename . '"');
header('Expires: 0');
header('Cache-Control: must-revalidate');
header('Pragma: public');
echo json_encode($backup_data, JSON_PRETTY_PRINT);
exit();
?>