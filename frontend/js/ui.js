export class UIManager {
    constructor(taskManager) {
        this.taskManager = taskManager;
    }
    
    renderMatrix(tasks) {
        const quadrants = ['Q1', 'Q2', 'Q3', 'Q4'];
        
        quadrants.forEach(quadrant => {
            const quadrantElement = document.getElementById(`quadrant-${quadrant}`);
            const tasksInQuadrant = tasks.filter(task => task.quadrant === quadrant);
            
            quadrantElement.innerHTML = '';
            
            if (tasksInQuadrant.length === 0) {
                quadrantElement.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 2rem;">Нет задач</p>';
            } else {
                tasksInQuadrant.forEach(task => {
                    const taskCard = this.createTaskCard(task);
                    quadrantElement.appendChild(taskCard);
                });
            }
            
            const countElement = quadrantElement.closest('.quadrant').querySelector('.task-count');
            countElement.textContent = tasksInQuadrant.length;
        });
    }
    
    createTaskCard(task) {
        const card = document.createElement('div');
        card.className = `task-card${task.completed ? ' completed' : ''}`;
        card.dataset.taskId = task.id;
        
        const title = document.createElement('div');
        title.className = 'task-title';
        title.textContent = task.title;
        
        const meta = document.createElement('div');
        meta.className = 'task-meta';
        
        if (task.deadline_at) {
            const deadline = document.createElement('span');
            deadline.className = 'task-deadline';
            
            const daysUntil = task.days_until_deadline;
            if (daysUntil !== null && daysUntil !== undefined) {
                if (daysUntil < 0) {
                    deadline.textContent = `Просрочено на ${Math.abs(daysUntil)} дн.`;
                    deadline.classList.add('urgent');
                } else if (daysUntil === 0) {
                    deadline.textContent = 'Сегодня';
                    deadline.classList.add('urgent');
                } else if (daysUntil === 1) {
                    deadline.textContent = 'Завтра';
                } else if (daysUntil <= 3) {
                    deadline.textContent = `Через ${daysUntil} дн.`;
                    deadline.classList.add('urgent');
                } else {
                    deadline.textContent = `Через ${daysUntil} дн.`;
                }
            } else {
                const date = new Date(task.deadline_at);
                deadline.textContent = date.toLocaleDateString('ru-RU');
            }
            
            meta.appendChild(deadline);
        }
        
        const status = document.createElement('span');
        status.className = 'task-status';
        status.textContent = task.completed ? '✓ Выполнено' : '⏱ В работе';
        meta.appendChild(status);
        
        const actions = document.createElement('div');
        actions.className = 'task-actions';
        
        if (!task.completed) {
            const completeBtn = document.createElement('button');
            completeBtn.className = 'btn btn-primary';
            completeBtn.textContent = '✓';
            completeBtn.title = 'Выполнить';
            completeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.handleCompleteTask(task.id);
            });
            actions.appendChild(completeBtn);
        }
        
        const editBtn = document.createElement('button');
        editBtn.className = 'btn btn-secondary';
        editBtn.textContent = '✎';
        editBtn.title = 'Редактировать';
        editBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.handleEditTask(task);
        });
        actions.appendChild(editBtn);
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn btn-secondary';
        deleteBtn.textContent = '🗑';
        deleteBtn.title = 'Удалить';
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.handleDeleteTask(task.id, task.title);
        });
        actions.appendChild(deleteBtn);
        
        card.appendChild(title);
        
        if (task.description) {
            const description = document.createElement('div');
            description.className = 'task-description';
            description.textContent = task.description;
            card.appendChild(description);
        }
        
        card.appendChild(meta);
        card.appendChild(actions);
        
        return card;
    }
    
    async handleCompleteTask(taskId) {
        try {
            await this.taskManager.completeTask(taskId);
            await this.taskManager.loadTasks();
        } catch (error) {
            this.showError('Ошибка при выполнении задачи: ' + error.message);
        }
    }
    
    handleEditTask(task) {
        this.taskManager.openTaskModal(task);
    }
    
    async handleDeleteTask(taskId, taskTitle) {
        if (confirm(`Вы уверены, что хотите удалить задачу "${taskTitle}"?`)) {
            try {
                await this.taskManager.deleteTask(taskId);
                await this.taskManager.loadTasks();
            } catch (error) {
                this.showError('Ошибка при удалении задачи: ' + error.message);
            }
        }
    }
    
    updateUserInfo(user) {
        const userInfoElement = document.getElementById('user-info');
        if (user) {
            userInfoElement.textContent = `${user.nickname} (${user.email})`;
        } else {
            userInfoElement.textContent = '';
        }
    }
    
    showView(viewName) {
        const views = document.querySelectorAll('.view');
        views.forEach(view => {
            view.classList.remove('active');
        });
        
        const targetView = document.getElementById(`${viewName}-view`);
        if (targetView) {
            targetView.classList.add('active');
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
