import { tasksAPI } from './api.js';

export class TaskManager {
    constructor() {
        this.tasks = [];
        this.currentTask = null;
    }
    
    setupEventListeners() {
        const addTaskBtn = document.getElementById('add-task-btn');
        const refreshBtn = document.getElementById('refresh-btn');
        const taskForm = document.getElementById('task-form');
        const modalClose = document.querySelector('.modal-close');
        const modalCancel = document.querySelector('.modal-cancel');
        
        addTaskBtn.addEventListener('click', () => this.openTaskModal());
        refreshBtn.addEventListener('click', () => this.loadTasks());
        taskForm.addEventListener('submit', (e) => this.handleTaskSubmit(e));
        modalClose.addEventListener('click', () => this.closeTaskModal());
        modalCancel.addEventListener('click', () => this.closeTaskModal());
        
        document.getElementById('task-modal').addEventListener('click', (e) => {
            if (e.target.id === 'task-modal') {
                this.closeTaskModal();
            }
        });
    }
    
    async loadTasks() {
        try {
            this.showLoading(true);
            this.tasks = await tasksAPI.getAll();
            window.dispatchEvent(new CustomEvent('tasks:loaded', { detail: this.tasks }));
            return this.tasks;
        } catch (error) {
            console.error('Failed to load tasks:', error);
            this.showError(error.message || 'Ошибка при загрузке задач');
            window.dispatchEvent(new CustomEvent('tasks:loaded', { detail: [] }));
            return [];
        } finally {
            this.showLoading(false);
        }
    }
    
    async createTask(taskData) {
        try {
            this.showLoading(true);
            const newTask = await tasksAPI.create(taskData);
            this.tasks.push(newTask);
            window.dispatchEvent(new CustomEvent('tasks:created', { detail: newTask }));
            return newTask;
        } catch (error) {
            console.error('Failed to create task:', error);
            throw error;
        } finally {
            this.showLoading(false);
        }
    }
    
    async updateTask(taskId, taskData) {
        try {
            this.showLoading(true);
            const updatedTask = await tasksAPI.update(taskId, taskData);
            const index = this.tasks.findIndex(t => t.id === taskId);
            if (index !== -1) {
                this.tasks[index] = updatedTask;
            }
            window.dispatchEvent(new CustomEvent('tasks:updated', { detail: updatedTask }));
            return updatedTask;
        } catch (error) {
            console.error('Failed to update task:', error);
            throw error;
        } finally {
            this.showLoading(false);
        }
    }
    
    async completeTask(taskId) {
        try {
            this.showLoading(true);
            const completedTask = await tasksAPI.complete(taskId);
            const index = this.tasks.findIndex(t => t.id === taskId);
            if (index !== -1) {
                this.tasks[index] = completedTask;
            }
            window.dispatchEvent(new CustomEvent('tasks:completed', { detail: completedTask }));
            return completedTask;
        } catch (error) {
            console.error('Failed to complete task:', error);
            throw error;
        } finally {
            this.showLoading(false);
        }
    }
    
    async deleteTask(taskId) {
        try {
            this.showLoading(true);
            await tasksAPI.delete(taskId);
            this.tasks = this.tasks.filter(t => t.id !== taskId);
            window.dispatchEvent(new CustomEvent('tasks:deleted', { detail: { id: taskId } }));
        } catch (error) {
            console.error('Failed to delete task:', error);
            throw error;
        } finally {
            this.showLoading(false);
        }
    }
    
    openTaskModal(task = null) {
        const modal = document.getElementById('task-modal');
        const modalTitle = document.getElementById('modal-title');
        const form = document.getElementById('task-form');
        
        this.currentTask = task;
        
        if (task) {
            modalTitle.textContent = 'Редактировать задачу';
            document.getElementById('task-id').value = task.id;
            document.getElementById('task-title').value = task.title;
            document.getElementById('task-description').value = task.description || '';
            document.getElementById('task-important').checked = task.is_important;
            
            if (task.deadline_at) {
                const deadline = new Date(task.deadline_at);
                const localDateTime = new Date(deadline.getTime() - deadline.getTimezoneOffset() * 60000)
                    .toISOString()
                    .slice(0, 16);
                document.getElementById('task-deadline').value = localDateTime;
            } else {
                document.getElementById('task-deadline').value = '';
            }
        } else {
            modalTitle.textContent = 'Новая задача';
            form.reset();
            document.getElementById('task-id').value = '';
        }
        
        document.getElementById('task-form-error').textContent = '';
        modal.classList.remove('hidden');
    }
    
    closeTaskModal() {
        const modal = document.getElementById('task-modal');
        modal.classList.add('hidden');
        this.currentTask = null;
    }
    
    async handleTaskSubmit(event) {
        event.preventDefault();
        
        const taskId = document.getElementById('task-id').value;
        const title = document.getElementById('task-title').value.trim();
        const description = document.getElementById('task-description').value.trim();
        const deadlineValue = document.getElementById('task-deadline').value;
        const isImportant = document.getElementById('task-important').checked;
        
        const taskData = {
            title,
            description: description || null,
            is_important: isImportant,
            deadline_at: deadlineValue ? new Date(deadlineValue).toISOString() : null,
        };
        
        try {
            if (taskId) {
                await this.updateTask(parseInt(taskId), taskData);
            } else {
                await this.createTask(taskData);
            }
            this.closeTaskModal();
            await this.loadTasks();
        } catch (error) {
            document.getElementById('task-form-error').textContent = error.message || 'Ошибка при сохранении задачи';
        }
    }
    
    getTasksByQuadrant(quadrant) {
        return this.tasks.filter(task => task.quadrant === quadrant);
    }
    
    getAllTasks() {
        return this.tasks;
    }
    
    showLoading(show) {
        const loadingElement = document.getElementById('loading');
        if (show) {
            loadingElement.classList.remove('hidden');
        } else {
            loadingElement.classList.add('hidden');
        }
    }
    
    showError(message) {
        const existingToast = document.querySelector('.error-toast');
        if (existingToast) {
            existingToast.remove();
        }
        
        const toast = document.createElement('div');
        toast.className = 'error-toast';
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            toast.style.transition = 'all 0.3s ease-out';
            setTimeout(() => toast.remove(), 300);
        }, 5000);
    }
}
