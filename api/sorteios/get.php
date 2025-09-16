<?php
// api/sorteios/get.php
require_once '../config/db.php';
require_once '../includes/auth.php';

protectEndpoint('posto');

validateRequestMethod('GET');

$posto_id = $_SESSION['posto_id']; // Obtém o posto_id da sessão

try {
    // Notei que você usava participante.cpf e participante.id no frontend.
    // O ideal é retornar os dados brutos e deixar o frontend formatar.
    // Mudei 'participante_nome' e 'participante_cpf' para 'cliente_nome' e 'cliente_cpf'
    // para melhor clareza na junção da tabela 'clientes'.
    $stmt = $pdo->prepare("SELECT s.id, c.nome as cliente_nome, c.cpf as cliente_cpf, s.id_sorteado, s.ganhou, s.premio_nome, s.premio_valor, s.giro_numero, s.total_giros_sessao, s.timestamp, c.id as cliente_id FROM sorteios s JOIN clientes c ON s.cliente_id = c.id WHERE s.posto_id = :posto_id ORDER BY s.timestamp DESC");
    $stmt->bindParam(':posto_id', $posto_id);
    $stmt->execute();
    $sorteios = $stmt->fetchAll(PDO::FETCH_ASSOC);

    sendJsonResponse('success', 'Histórico de sorteios listado com sucesso.', $sorteios);
} catch (PDOException $e) {
    error_log("Erro ao listar histórico de sorteios: " . $e->getMessage());
    sendJsonResponse('error', 'Erro interno do servidor ao listar histórico de sorteios.');
}
?>