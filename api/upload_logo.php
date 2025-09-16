<?php
// api/upload_logo.php
require_once 'config/db.php';
require_once 'includes/auth.php';

// Ativar exibição de erros para depuração (REMOVA EM PRODUÇÃO)
error_reporting(E_ALL);
ini_set('display_errors', 1);

protectEndpoint('posto');

validateRequestMethod('POST');

$posto_id = $_SESSION['posto_id'];

if (!isset($_FILES['logo']) || $_FILES['logo']['error'] !== UPLOAD_ERR_OK) {
    sendJsonResponse('error', 'Nenhum arquivo enviado ou erro no upload. Código de erro: ' . ($_FILES['logo']['error'] ?? 'N/A'));
}

$file = $_FILES['logo'];
$fileName = $file['name'];
$fileTmpName = $file['tmp_name'];
$fileSize = $file['size'];
$fileError = $file['error'];
$fileType = $file['type'];

$fileExt = strtolower(pathinfo($fileName, PATHINFO_EXTENSION));
$allowed = ['jpg', 'jpeg', 'png', 'gif', 'svg'];

if (!in_array($fileExt, $allowed)) {
    sendJsonResponse('error', 'Tipo de arquivo não permitido. Apenas JPG, JPEG, PNG, GIF e SVG são aceitos.');
}

if ($fileError !== 0) {
    sendJsonResponse('error', 'Erro durante o upload do arquivo: ' . $fileError);
}

if ($fileSize > 5 * 1024 * 1024) { // Limite de 5MB
    sendJsonResponse('error', 'Arquivo muito grande. O tamanho máximo permitido é 5MB.');
}

$fileNameNew = uniqid('logo_', true) . '.' . $fileExt;

// --- CORREÇÃO FINAL AQUI ---
// Para ir da pasta 'api' (onde este script está) para a raiz do projeto ('roleta-premium'),
// usamos 'dirname(__DIR__)'. Depois, entramos em 'uploads/logos/'.
$uploadDir = dirname(__DIR__) . DIRECTORY_SEPARATOR . 'uploads' . DIRECTORY_SEPARATOR . 'logos' . DIRECTORY_SEPARATOR;
// --- FIM DA CORREÇÃO FINAL ---

// --- Debugging lines (mantenha para verificar se o caminho agora está correto) ---
error_log("Upload Path Debug: Current Dir: " . __DIR__);
error_log("Upload Path Debug: Calculated Upload Dir: " . $uploadDir);
error_log("Upload Path Debug: File Tmp Name: " . $fileTmpName);
// --- End Debugging lines ---

if (!is_dir($uploadDir)) {
    // Tenta criar o diretório recursivamente
    if (!mkdir($uploadDir, 0755, true)) {
        sendJsonResponse('error', 'Falha ao criar diretório de destino: ' . $uploadDir);
    }
}

$fileDestination = $uploadDir . $fileNameNew;

// --- Debugging lines ---
error_log("Upload Path Debug: Final File Destination: " . $fileDestination);
// --- End Debugging lines ---

if (move_uploaded_file($fileTmpName, $fileDestination)) {
    // O caminho para o frontend DEVE SER RELATIVO à raiz da aplicação (roleta-premium/),
    // Ex: "uploads/logos/minha_logo.png"
    $logo_path_for_frontend = 'uploads/logos/' . $fileNameNew;

    try {
        $pdo->beginTransaction();

        // 1. Busca a configuração atual do posto
        $stmt_select_config = $pdo->prepare("SELECT config_data FROM configuracoes WHERE type = 'posto' AND entity_id = :posto_id LIMIT 1");
        $stmt_select_config->bindParam(':posto_id', $posto_id);
        $stmt_select_config->execute();
        $posto_config_row = $stmt_select_config->fetch();

        $current_config_data = [];
        if ($posto_config_row && $posto_config_row['config_data']) {
            $current_config_data = json_decode($posto_config_row['config_data'], true);
        } else {
            // Se não houver configuração existente, crie uma base com os valores padrão ou mínimos
            $current_config_data = [
                'sistema' => [
                    'nomeCliente' => 'Posto Padrão',
                    'logoPath' => 'placeholder.svg?height=80&width=80',
                    'valorMinimo' => 50,
                    'valorPorGiro' => 100,
                    'totalIds' => 200,
                    'duracaoGiro' => 4500,
                ],
                'cores' => [],
                'textos' => [],
                'idsPremiados' => [],
            ];
        }

        // 2. Atualiza o caminho da logo no objeto de configuração
        if (!isset($current_config_data['sistema'])) {
            $current_config_data['sistema'] = [];
        }
        $current_config_data['sistema']['logoPath'] = $logo_path_for_frontend;

        $updated_config_data_json = json_encode($current_config_data);

        // 3. Atualiza (ou insere) a configuração no banco de dados
        $stmt_update_config = $pdo->prepare("INSERT INTO configuracoes (type, entity_id, config_data) VALUES ('posto', :posto_id, :config_data) ON DUPLICATE KEY UPDATE config_data = VALUES(config_data), updated_at = CURRENT_TIMESTAMP");
        $stmt_update_config->bindParam(':posto_id', $posto_id);
        $stmt_update_config->bindParam(':config_data', $updated_config_data_json);
        $stmt_update_config->execute();

        $pdo->commit();

        sendJsonResponse('success', 'Logo enviada e salva com sucesso!', ['logo_path' => $logo_path_for_frontend]);

    } catch (PDOException $e) {
        $pdo->rollBack();
        error_log("Erro ao salvar caminho da logo no DB: " . $e->getMessage());
        unlink($fileDestination); // Apaga o arquivo se houve erro no DB
        sendJsonResponse('error', 'Erro interno do servidor ao salvar o caminho da logo no banco de dados.');
    }
} else {
    sendJsonResponse('error', 'Falha ao mover o arquivo para o diretório de destino. Verifique as permissões.');
}
?>