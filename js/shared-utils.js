// js/shared-utils.js

// --- IMPORTANTE: AJUSTE ESTA URL SE NECESSÁRIO ---
// Esta URL DEVE CORRESPONDER EXATAMENTE ao caminho onde sua pasta 'api' está acessível no servidor web.
// Ex: se sua URL no navegador é 'http://localhost/roleta-premium/admin.html', e a API está em 'roleta-premium/api/',
// então a BASE_API_URL seria 'http://localhost/roleta-premium/api'.
// Se a sua URL fosse 'http://localhost/meu-app/index.html' e a API estivesse em 'htdocs/meu-app/api',
// então seria 'http://localhost/meu-app/api'.
const BASE_API_URL = 'http://localhost/roleta-premium/api';
// --- FIM DA CONFIGURAÇÃO DA URL ---

// Função genérica para configurar a sidebar (movida para shared-utils.js)
function setupSidebar() {
  const sidebar = document.getElementById('admin-sidebar');
  const sidebarToggle = document.getElementById('sidebar-toggle');
  const mobileMenuBtn = document.getElementById('mobile-menu-btn');
  const mobileOverlay = document.getElementById('mobile-overlay');

  const toggleDesktop = () => {
    sidebar.classList.toggle('collapsed');
  };

  const toggleMobile = () => {
    sidebar.classList.toggle('show');
    mobileOverlay.classList.toggle('show');
  };

  if (sidebarToggle) {
    sidebarToggle.addEventListener('click', toggleDesktop);
  }
  if (mobileMenuBtn) {
    mobileMenuBtn.addEventListener('click', toggleMobile);
  }
  if (mobileOverlay) {
    mobileOverlay.addEventListener('click', toggleMobile);
  }
}

// Função genérica para exibir toasts (notificações)
function showToast(message, type = 'info') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
  toast.innerHTML = `
  <div class="toast-icon">${icons[type] || icons.info}</div>
  <div class="toast-content">
    <div class="toast-title">${type.toUpperCase()}</div>
    <div class="toast-message">${message}</div>
  </div>`;
  container.appendChild(toast);
  setTimeout(() => toast.classList.add('show'), 100);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 500);
  }, 4000);
}