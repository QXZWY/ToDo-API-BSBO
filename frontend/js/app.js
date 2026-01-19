import { AuthManager } from './auth.js';
import { TaskManager } from './tasks.js';
import { UIManager } from './ui.js';
import { getAuthToken } from './api.js';

class App {
    constructor() {
        this.authManager = new AuthManager();
        this.taskManager = new TaskManager();
        this.uiManager = new UIManager(this.taskManager);
        
        this.init();
    }
    
    async init() {
        this.setupEventListeners();
        await this.checkAuthState();
    }
    
    setupEventListeners() {
        this.authManager.setupEventListeners();
        this.taskManager.setupEventListeners();
        
        window.addEventListener('auth:login', () => this.handleLogin());
        window.addEventListener('auth:logout', () => this.handleLogout());
        
        window.addEventListener('tasks:loaded', (e) => {
            this.uiManager.renderMatrix(e.detail);
        });
        
        window.addEventListener('tasks:created', async () => {
            await this.taskManager.loadTasks();
        });
        
        window.addEventListener('tasks:updated', async () => {
            await this.taskManager.loadTasks();
        });
        
        window.addEventListener('tasks:completed', async () => {
            await this.taskManager.loadTasks();
        });
        
        window.addEventListener('tasks:deleted', async () => {
            await this.taskManager.loadTasks();
        });
        
        const logoutBtn = document.getElementById('logout-btn');
        logoutBtn.addEventListener('click', () => this.authManager.logout());
    }
    
    async checkAuthState() {
        const token = getAuthToken();
        
        if (token) {
            try {
                await this.authManager.loadCurrentUser();
                this.handleLogin();
            } catch (error) {
                this.handleLogout();
            }
        } else {
            this.handleLogout();
        }
    }
    
    async handleLogin() {
        const user = this.authManager.getCurrentUser();
        this.uiManager.updateUserInfo(user);
        this.uiManager.showView('app');
        await this.taskManager.loadTasks();
    }
    
    handleLogout() {
        this.uiManager.showView('auth');
        this.uiManager.updateUserInfo(null);
        this.taskManager.tasks = [];
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new App();
});
