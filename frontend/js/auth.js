import { authAPI, setAuthToken, clearAuthToken } from './api.js';

export class AuthManager {
    constructor() {
        this.currentUser = null;
    }
    
    setupEventListeners() {
        const loginTab = document.getElementById('login-tab');
        const registerTab = document.getElementById('register-tab');
        const loginForm = document.getElementById('login-form');
        const registerForm = document.getElementById('register-form');
        
        loginTab.addEventListener('click', () => this.switchToLogin());
        registerTab.addEventListener('click', () => this.switchToRegister());
        
        loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        registerForm.addEventListener('submit', (e) => this.handleRegister(e));
    }
    
    switchToLogin() {
        document.getElementById('login-tab').classList.add('active');
        document.getElementById('register-tab').classList.remove('active');
        document.getElementById('login-form').classList.add('active');
        document.getElementById('register-form').classList.remove('active');
        this.clearErrors();
    }
    
    switchToRegister() {
        document.getElementById('register-tab').classList.add('active');
        document.getElementById('login-tab').classList.remove('active');
        document.getElementById('register-form').classList.add('active');
        document.getElementById('login-form').classList.remove('active');
        this.clearErrors();
    }
    
    clearErrors() {
        document.getElementById('login-error').textContent = '';
        document.getElementById('register-error').textContent = '';
    }
    
    showError(formType, message) {
        const errorElement = document.getElementById(`${formType}-error`);
        errorElement.textContent = message;
    }
    
    async handleLogin(event) {
        event.preventDefault();
        this.clearErrors();
        
        const email = document.getElementById('login-email').value.trim();
        const password = document.getElementById('login-password').value;
        
        if (!email || !password) {
            this.showError('login', 'Пожалуйста, заполните все поля');
            return;
        }
        
        try {
            this.showLoading(true);
            const response = await authAPI.login(email, password);
            setAuthToken(response.access_token);
            
            await this.loadCurrentUser();
            
            window.dispatchEvent(new CustomEvent('auth:login'));
        } catch (error) {
            this.showError('login', error.message || 'Ошибка при входе');
        } finally {
            this.showLoading(false);
        }
    }
    
    async handleRegister(event) {
        event.preventDefault();
        this.clearErrors();
        
        const nickname = document.getElementById('register-nickname').value.trim();
        const email = document.getElementById('register-email').value.trim();
        const password = document.getElementById('register-password').value;
        
        if (!nickname || !email || !password) {
            this.showError('register', 'Пожалуйста, заполните все поля');
            return;
        }
        
        if (password.length < 6) {
            this.showError('register', 'Пароль должен быть не менее 6 символов');
            return;
        }
        
        try {
            this.showLoading(true);
            await authAPI.register({ nickname, email, password });
            
            const loginResponse = await authAPI.login(email, password);
            setAuthToken(loginResponse.access_token);
            
            await this.loadCurrentUser();
            
            window.dispatchEvent(new CustomEvent('auth:login'));
        } catch (error) {
            this.showError('register', error.message || 'Ошибка при регистрации');
        } finally {
            this.showLoading(false);
        }
    }
    
    async loadCurrentUser() {
        try {
            this.currentUser = await authAPI.getMe();
            return this.currentUser;
        } catch (error) {
            console.error('Failed to load user:', error);
            this.logout();
            throw error;
        }
    }
    
    logout() {
        clearAuthToken();
        this.currentUser = null;
        window.dispatchEvent(new CustomEvent('auth:logout'));
    }
    
    isAuthenticated() {
        return this.currentUser !== null;
    }
    
    getCurrentUser() {
        return this.currentUser;
    }
    
    showLoading(show) {
        const loadingElement = document.getElementById('loading');
        if (show) {
            loadingElement.classList.remove('hidden');
        } else {
            loadingElement.classList.add('hidden');
        }
    }
}
