<?php
// api/clientes/get.php
require_once '../config/db.php';
require_once '../includes/auth.php';

protectEndpoint('posto'); // Apenas usuários de posto logados podem acessar

validateRequestMethod('GET'); // Este endpoint deve ser acessado via GET

// Obtém o posto_id da sessão do usuário logado
$posto_id = $_SESSION['posto_id'];

try {
    // Prepara e executa a consulta para buscar todos os clientes associados a este posto
    // Adicione created_at para o frontend
    $stmt = $pdo->prepare("SELECT id, nome, cpf, telefone, email, giros_disponiveis, valor_abastecido, created_at FROM clientes WHERE posto_id = :posto_id ORDER BY nome ASC");
    $stmt->bindParam(':posto_id', $posto_id);
    $stmt->execute();
    $clientes = $stmt->fetchAll(PDO::FETCH_ASSOC);

    sendJsonResponse('success', 'Clientes listados com sucesso.', $clientes);

} catch (PDOException $e) {
    error_log("Erro ao listar clientes: " . $e->getMessage());
    sendJsonResponse('error', 'Erro interno do servidor ao listar clientes.');
}
?>