<?php
// api/auth/logout.php
require_once '../config/db.php';
require_once '../includes/auth.php'; // Inclui auth.php para iniciar e gerenciar a sessão

validateRequestMethod('GET'); // Logout pode ser um GET simples

session_unset(); // Remove todas as variáveis de sessão
session_destroy(); // Destrói a sessão no servidor

sendJsonResponse('success', 'Logout realizado com sucesso.');
?>