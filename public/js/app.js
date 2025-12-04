/**
 * BriPlanner Frontend JavaScript
 *
 * This handles all the client-side interactivity for the planner.
 * It communicates with the Express server via REST API calls.
 */

// API Base URL
const API_URL = '/api';

// DOM Elements
const addTaskForm = document.getElementById('add-task-form');
const tasksContainer = document.getElementById('tasks-container');
const taskModal = document.getElementById('task-modal');
const taskDetail = document.getElementById('task-detail');
const closeModal = document.querySelector('.close-modal');

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    loadTasks();
    setupEventListeners();
});

// Setup Event Listeners
function setupEventListeners() {
    // Add task form submission
    addTaskForm.addEventListener('submit', handleAddTask);

    // Close modal
    closeModal.addEventListener('click', () => {
        taskModal.style.display = 'none';
    });

    // Close modal when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target === taskModal) {
            taskModal.style.display = 'none';
        }
    });
}

// Load all tasks from server
async function loadTasks() {
    try {
        const response = await fetch(`${API_URL}/tasks`);
        const tasks = await response.json();
        renderTasks(tasks);
    } catch (error) {
        console.error('Error loading tasks:', error);
        tasksContainer.innerHTML = '<p class="error">Failed to load tasks. Please refresh the page.</p>';
    }
}

// Handle add task form submission
async function handleAddTask(e) {
    e.preventDefault();

    const title = document.getElementById('task-title').value.trim();
    const description = document.getElementById('task-description').value.trim();

    if (!title) {
        alert('Please enter a task title');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/tasks`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ title, description })
        });

        if (response.ok) {
            // Clear form
            addTaskForm.reset();
            // Reload tasks
            loadTasks();
        } else {
            const error = await response.json();
            alert(error.error || 'Failed to add task');
        }
    } catch (error) {
        console.error('Error adding task:', error);
        alert('Failed to add task. Please try again.');
    }
}

// Render tasks to the page
function renderTasks(tasks) {
    if (!tasks || tasks.length === 0) {
        tasksContainer.innerHTML = '<p class="no-tasks">No tasks yet. Add your first task above!</p>';
        return;
    }

    tasksContainer.innerHTML = tasks.map(task => createTaskCard(task)).join('');
}

// Create task card HTML
function createTaskCard(task, isChild = false) {
    const completedClass = task.completed ? 'completed' : '';
    const cardClass = isChild ? 'child-task-card' : 'task-card';

    // Calculate checklist progress
    const checklistTotal = task.checklist.length;
    const checklistCompleted = task.checklist.filter(item => item.completed).length;
    const progressPercent = checklistTotal > 0 ? (checklistCompleted / checklistTotal) * 100 : 0;

    return `
        <div class="${cardClass} ${completedClass}" data-task-id="${task.id}">
            <div class="task-header">
                <div class="task-title-section">
                    <input type="checkbox" class="task-checkbox" 
                           ${task.completed ? 'checked' : ''} 
                           onchange="toggleTask('${task.id}', this.checked)">
                    <span class="task-title" onclick="openTaskDetail('${task.id}')">${escapeHtml(task.title)}</span>
                </div>
                <div class="task-actions">
                    <button class="btn btn-sm btn-secondary" onclick="openTaskDetail('${task.id}')">Details</button>
                    <button class="btn btn-sm btn-danger" onclick="deleteTask('${task.id}')">Delete</button>
                </div>
            </div>
            ${task.description ? `<p class="task-description">${escapeHtml(task.description)}</p>` : ''}
            
            ${renderChecklist(task)}
            ${renderChildTasks(task)}
        </div>
    `;
}

// Render checklist section
function renderChecklist(task) {
    const checklistTotal = task.checklist.length;
    const checklistCompleted = task.checklist.filter(item => item.completed).length;
    const progressPercent = checklistTotal > 0 ? (checklistCompleted / checklistTotal) * 100 : 0;

    const checklistItems = task.checklist.map(item => `
        <div class="checklist-item ${item.completed ? 'completed' : ''}">
            <input type="checkbox" ${item.completed ? 'checked' : ''} 
                   onchange="toggleChecklistItem('${task.id}', '${item.id}', this.checked)">
            <span class="checklist-item-text">${escapeHtml(item.text)}</span>
            <button class="btn btn-sm btn-danger" onclick="deleteChecklistItem('${task.id}', '${item.id}')">×</button>
        </div>
    `).join('');

    return `
        <div class="checklist-section">
            <div class="checklist-header">
                <h4>📋 Checklist ${checklistTotal > 0 ? `(${checklistCompleted}/${checklistTotal})` : ''}</h4>
            </div>
            ${checklistTotal > 0 ? `
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${progressPercent}%"></div>
                </div>
            ` : ''}
            ${checklistItems}
            <form class="add-checklist-form" onsubmit="addChecklistItem(event, '${task.id}')">
                <input type="text" placeholder="Add checklist item..." required>
                <button type="submit" class="btn btn-sm btn-primary">Add</button>
            </form>
        </div>
    `;
}

// Render child tasks
function renderChildTasks(task) {
    const childTasksHtml = task.children && task.children.length > 0
        ? task.children.map(child => createTaskCard(child, true)).join('')
        : '';

    return `
        <div class="child-tasks-section">
            <div class="child-tasks-header">
                <h4>📁 Subtasks ${task.children && task.children.length > 0 ? `(${task.children.length})` : ''}</h4>
            </div>
            ${childTasksHtml}
            <form class="add-child-form" onsubmit="addChildTask(event, '${task.id}')">
                <input type="text" placeholder="Add subtask..." required>
                <button type="submit" class="btn btn-sm btn-primary">Add</button>
            </form>
        </div>
    `;
}

// Toggle task completion
async function toggleTask(taskId, completed) {
    try {
        await fetch(`${API_URL}/tasks/${taskId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ completed })
        });
        loadTasks();
    } catch (error) {
        console.error('Error toggling task:', error);
    }
}

// Delete task
async function deleteTask(taskId) {
    if (!confirm('Are you sure you want to delete this task?')) return;

    try {
        await fetch(`${API_URL}/tasks/${taskId}`, {
            method: 'DELETE'
        });
        loadTasks();
    } catch (error) {
        console.error('Error deleting task:', error);
    }
}

// Add checklist item
async function addChecklistItem(e, taskId) {
    e.preventDefault();
    const form = e.target;
    const input = form.querySelector('input');
    const text = input.value.trim();

    if (!text) return;

    try {
        await fetch(`${API_URL}/tasks/${taskId}/checklist`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text })
        });
        input.value = '';
        loadTasks();
    } catch (error) {
        console.error('Error adding checklist item:', error);
    }
}

// Toggle checklist item
async function toggleChecklistItem(taskId, itemId, completed) {
    try {
        await fetch(`${API_URL}/tasks/${taskId}/checklist/${itemId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ completed })
        });
        loadTasks();
    } catch (error) {
        console.error('Error toggling checklist item:', error);
    }
}

// Delete checklist item
async function deleteChecklistItem(taskId, itemId) {
    try {
        await fetch(`${API_URL}/tasks/${taskId}/checklist/${itemId}`, {
            method: 'DELETE'
        });
        loadTasks();
    } catch (error) {
        console.error('Error deleting checklist item:', error);
    }
}

// Add child task
async function addChildTask(e, parentId) {
    e.preventDefault();
    const form = e.target;
    const input = form.querySelector('input');
    const title = input.value.trim();

    if (!title) return;

    try {
        await fetch(`${API_URL}/tasks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, parentId })
        });
        input.value = '';
        loadTasks();
    } catch (error) {
        console.error('Error adding child task:', error);
    }
}

// Open task detail modal
async function openTaskDetail(taskId) {
    try {
        const response = await fetch(`${API_URL}/tasks/${taskId}`);
        const task = await response.json();

        taskDetail.innerHTML = `
            <h2>${escapeHtml(task.title)}</h2>
            <span class="status-badge ${task.completed ? 'completed' : 'pending'}">
                ${task.completed ? 'Completed' : 'Pending'}
            </span>
            
            <div class="detail-section">
                <h3>Description</h3>
                <p>${task.description ? escapeHtml(task.description) : '<em>No description</em>'}</p>
            </div>
            
            <div class="detail-section">
                <h3>Created</h3>
                <p>${new Date(task.createdAt).toLocaleString()}</p>
            </div>
            
            <div class="detail-section">
                <h3>Last Updated</h3>
                <p>${new Date(task.updatedAt).toLocaleString()}</p>
            </div>
            
            <div class="detail-section">
                <h3>📧 Send Email Reminder</h3>
                <form class="email-form" onsubmit="sendEmailReminder(event, '${task.id}')">
                    <input type="email" id="email-to" placeholder="Recipient email" required>
                    <input type="text" id="email-subject" placeholder="Subject (optional)">
                    <button type="submit" class="btn btn-primary">Send Reminder</button>
                </form>
                ${task.emailReminder ? `
                    <p style="margin-top: 10px; font-size: 0.9rem; color: var(--text-muted);">
                        Last email sent to: ${escapeHtml(task.emailReminder.to)} at ${new Date(task.emailReminder.sentAt).toLocaleString()}
                        ${task.emailReminder.previewUrl ? `<br><a href="${task.emailReminder.previewUrl}" target="_blank">View email preview</a>` : ''}
                    </p>
                ` : ''}
            </div>
        `;

        taskModal.style.display = 'block';
    } catch (error) {
        console.error('Error loading task details:', error);
    }
}

// Send email reminder
async function sendEmailReminder(e, taskId) {
    e.preventDefault();

    const to = document.getElementById('email-to').value;
    const subject = document.getElementById('email-subject').value;

    try {
        const response = await fetch(`${API_URL}/tasks/${taskId}/email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ to, subject })
        });

        const result = await response.json();

        if (response.ok) {
            alert(`Email sent successfully! ${result.previewUrl ? 'Check the preview URL in the modal.' : ''}`);
            openTaskDetail(taskId); // Refresh modal
        } else {
            alert(result.error || 'Failed to send email');
        }
    } catch (error) {
        console.error('Error sending email:', error);
        alert('Failed to send email. Please try again.');
    }
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
