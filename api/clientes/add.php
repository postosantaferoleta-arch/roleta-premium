<?php
// api/clientes/add.php
require_once '../config/db.php';
require_once '../includes/auth.php';

protectEndpoint('posto');

validateRequestMethod('POST');

$data = json_decode(file_get_contents('php://input'), true);

$posto_id = $_SESSION['posto_id']; // Obtém o posto_id da sessão do usuário logado
$id = $data['id'] ?? uniqid('cliente_', true); // Use o ID do frontend (se for um UUID) ou gere um novo no backend
$nome = trim($data['nome'] ?? '');
$cpf = preg_replace('/\D/', '', $data['cpf'] ?? ''); // Remove formatação do CPF
$telefone = preg_replace('/\D/', '', $data['telefone'] ?? ''); // Remove formatação do telefone
$email = trim($data['email'] ?? '');
$giros_disponiveis = (int)($data['giros'] ?? 0);
$valor_abastecido = (float)($data['valorAbastecido'] ?? 0.00);

// Validação básica dos dados
if (empty($posto_id) || empty($nome) || empty($cpf) || $giros_disponiveis <= 0 || $valor_abastecido <= 0) {
    sendJsonResponse('error', 'Dados do cliente incompletos ou inválidos.');
}

try {
    // Verifica se o CPF já existe para este posto
    $stmt_check = $pdo->prepare("SELECT id FROM clientes WHERE posto_id = :posto_id AND cpf = :cpf LIMIT 1");
    $stmt_check->bindParam(':posto_id', $posto_id);
    $stmt_check->bindParam(':cpf', $cpf);
    $stmt_check->execute();
    if ($stmt_check->rowCount() > 0) {
        sendJsonResponse('error', 'CPF já cadastrado para este posto.');
    }

    $stmt = $pdo->prepare("INSERT INTO clientes (id, posto_id, nome, cpf, telefone, email, giros_disponiveis, valor_abastecido)
                           VALUES (:id, :posto_id, :nome, :cpf, :telefone, :email, :giros_disponiveis, :valor_abastecido)");
    $stmt->bindParam(':id', $id);
    $stmt->bindParam(':posto_id', $posto_id);
    $stmt->bindParam(':nome', $nome);
    $stmt->bindParam(':cpf', $cpf);
    $stmt->bindParam(':telefone', $telefone);
    $stmt->bindParam(':email', $email);
    $stmt->bindParam(':giros_disponiveis', $giros_disponiveis, PDO::PARAM_INT);
    $stmt->bindParam(':valor_abastecido', $valor_abastecido, PDO::PARAM_STR); // Salvar como string para precisão do decimal
    $stmt->execute();

    sendJsonResponse('success', 'Cliente cadastrado com sucesso!', ['cliente_id' => $id, 'giros' => $giros_disponiveis]);
} catch (PDOException $e) {
    error_log("Erro ao cadastrar cliente: " . $e->getMessage());
    sendJsonResponse('error', 'Erro interno do servidor ao cadastrar cliente.');
}
?>