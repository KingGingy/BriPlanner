/**
 * BriPlanner - Task Planner Server
 *
 * This is the main Node.js server file that powers the BriPlanner application.
 *
 * HOW NODE.JS WORKS:
 * ==================
 * Unlike NetSuite SuiteScript where you deploy scripts to their platform,
 * Node.js runs JavaScript on your own server. Here's how it compares:
 *
 * SuiteScript:
 * - Upload files to NetSuite's File Cabinet
 * - Deploy via Script Deployment records
 * - Use NetSuite's built-in APIs (N/record, N/search, etc.)
 *
 * Node.js + Express:
 * - Run your own server locally or on a cloud provider
 * - Define routes (like RESTlet endpoints) using Express
 * - Use npm packages instead of NetSuite APIs
 * - Store data in files, databases, or external services
 *
 * This file sets up an Express server that:
 * 1. Serves static HTML/CSS/JS files from the 'public' folder
 * 2. Provides REST API endpoints for task management (like RESTlets)
 * 3. Stores data in-memory (can be extended to use a database)
 */

const express = require('express');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 3000;

// Cached email test account (created on first email request)
let cachedTestAccount = null;

// Middleware - similar to entry points in SuiteScript
app.use(express.json()); // Parse JSON request bodies
app.use(express.static(path.join(__dirname, 'public'))); // Serve static files

// In-memory data store (in a real app, use a database like MongoDB or PostgreSQL)
let tasks = [];

/**
 * REST API Routes - These work like RESTlets in SuiteScript
 * Each route handles a specific HTTP method and endpoint
 */

// GET all tasks - like a GET method in a RESTlet
app.get('/api/tasks', (req, res) => {
    res.json(tasks);
});

// GET single task by ID
app.get('/api/tasks/:id', (req, res) => {
    const task = findTaskById(req.params.id, tasks);
    if (!task) {
        return res.status(404).json({ error: 'Task not found' });
    }
    res.json(task);
});

// POST create new task - like a POST method in a RESTlet
app.post('/api/tasks', (req, res) => {
    const { title, description, parentId } = req.body;

    if (!title) {
        return res.status(400).json({ error: 'Title is required' });
    }

    const newTask = {
        id: uuidv4(),
        title,
        description: description || '',
        completed: false,
        checklist: [],
        children: [],
        emailReminder: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    // If parentId is provided, add as child task
    if (parentId) {
        const parentTask = findTaskById(parentId, tasks);
        if (!parentTask) {
            return res.status(404).json({ error: 'Parent task not found' });
        }
        parentTask.children.push(newTask);
        parentTask.updatedAt = new Date().toISOString();
    } else {
        tasks.push(newTask);
    }

    res.status(201).json(newTask);
});

// PUT update task
app.put('/api/tasks/:id', (req, res) => {
    const task = findTaskById(req.params.id, tasks);
    if (!task) {
        return res.status(404).json({ error: 'Task not found' });
    }

    const { title, description, completed, checklist, emailReminder } = req.body;

    if (title !== undefined) task.title = title;
    if (description !== undefined) task.description = description;
    if (completed !== undefined) task.completed = completed;
    if (checklist !== undefined) task.checklist = checklist;
    if (emailReminder !== undefined) task.emailReminder = emailReminder;
    task.updatedAt = new Date().toISOString();

    res.json(task);
});

// DELETE task
app.delete('/api/tasks/:id', (req, res) => {
    const taskId = req.params.id;
    const removed = removeTaskById(taskId, tasks);

    if (!removed) {
        return res.status(404).json({ error: 'Task not found' });
    }

    res.json({ message: 'Task deleted successfully' });
});

// POST add checklist item to task
app.post('/api/tasks/:id/checklist', (req, res) => {
    const task = findTaskById(req.params.id, tasks);
    if (!task) {
        return res.status(404).json({ error: 'Task not found' });
    }

    const { text } = req.body;
    if (!text) {
        return res.status(400).json({ error: 'Checklist item text is required' });
    }

    const checklistItem = {
        id: uuidv4(),
        text,
        completed: false
    };

    task.checklist.push(checklistItem);
    task.updatedAt = new Date().toISOString();

    res.status(201).json(checklistItem);
});

// PUT update checklist item
app.put('/api/tasks/:taskId/checklist/:itemId', (req, res) => {
    const task = findTaskById(req.params.taskId, tasks);
    if (!task) {
        return res.status(404).json({ error: 'Task not found' });
    }

    const item = task.checklist.find(i => i.id === req.params.itemId);
    if (!item) {
        return res.status(404).json({ error: 'Checklist item not found' });
    }

    const { text, completed } = req.body;
    if (text !== undefined) item.text = text;
    if (completed !== undefined) item.completed = completed;
    task.updatedAt = new Date().toISOString();

    res.json(item);
});

// DELETE checklist item
app.delete('/api/tasks/:taskId/checklist/:itemId', (req, res) => {
    const task = findTaskById(req.params.taskId, tasks);
    if (!task) {
        return res.status(404).json({ error: 'Task not found' });
    }

    const itemIndex = task.checklist.findIndex(i => i.id === req.params.itemId);
    if (itemIndex === -1) {
        return res.status(404).json({ error: 'Checklist item not found' });
    }

    task.checklist.splice(itemIndex, 1);
    task.updatedAt = new Date().toISOString();

    res.json({ message: 'Checklist item deleted successfully' });
});

// POST send email reminder (placeholder - requires SMTP configuration)
app.post('/api/tasks/:id/email', async (req, res) => {
    const task = findTaskById(req.params.id, tasks);
    if (!task) {
        return res.status(404).json({ error: 'Task not found' });
    }

    const { to, subject } = req.body;
    if (!to) {
        return res.status(400).json({ error: 'Email recipient is required' });
    }

    // Note: To actually send emails, configure SMTP settings
    // This is a demonstration of how email would work
    try {
        // For development, use ethereal.email test account (cached for efficiency)
        // In production, configure with real SMTP credentials via environment variables
        if (!cachedTestAccount) {
            cachedTestAccount = await nodemailer.createTestAccount();
        }

        const transporter = nodemailer.createTransport({
            host: 'smtp.ethereal.email',
            port: 587,
            secure: false,
            auth: {
                user: cachedTestAccount.user,
                pass: cachedTestAccount.pass
            }
        });

        const mailOptions = {
            from: '"BriPlanner" <planner@example.com>',
            to: to,
            subject: subject || `Reminder: ${task.title}`,
            text: `Task: ${task.title}\n\nDescription: ${task.description || 'No description'}\n\nStatus: ${task.completed ? 'Completed' : 'Pending'}`,
            html: `<h2>Task Reminder</h2>
                   <p><strong>Task:</strong> ${task.title}</p>
                   <p><strong>Description:</strong> ${task.description || 'No description'}</p>
                   <p><strong>Status:</strong> ${task.completed ? 'Completed' : 'Pending'}</p>`
        };

        const info = await transporter.sendMail(mailOptions);

        // Store email info on task
        task.emailReminder = {
            sentAt: new Date().toISOString(),
            to: to,
            previewUrl: nodemailer.getTestMessageUrl(info)
        };
        task.updatedAt = new Date().toISOString();

        res.json({
            message: 'Email sent successfully',
            previewUrl: nodemailer.getTestMessageUrl(info)
        });
    } catch (error) {
        console.error('Email error:', error);
        res.status(500).json({ error: 'Failed to send email', details: error.message });
    }
});

// Helper function to find task by ID (searches nested children too)
function findTaskById(id, taskList) {
    for (const task of taskList) {
        if (task.id === id) {
            return task;
        }
        if (task.children && task.children.length > 0) {
            const found = findTaskById(id, task.children);
            if (found) return found;
        }
    }
    return null;
}

// Helper function to remove task by ID
function removeTaskById(id, taskList) {
    for (let i = 0; i < taskList.length; i++) {
        if (taskList[i].id === id) {
            taskList.splice(i, 1);
            return true;
        }
        if (taskList[i].children && taskList[i].children.length > 0) {
            if (removeTaskById(id, taskList[i].children)) {
                return true;
            }
        }
    }
    return false;
}

// Export for testing
module.exports = { app, tasks, findTaskById, removeTaskById };

// Start server only if this is the main module
if (require.main === module) {
    app.listen(PORT, () => {
        const portStr = String(PORT);
        const urlPadding = ' '.repeat(Math.max(0, 4 - portStr.length));
        console.log(`
╔═══════════════════════════════════════════════════════════╗
║                  BriPlanner Server                        ║
╠═══════════════════════════════════════════════════════════╣
║  Server running at http://localhost:${PORT}${urlPadding}                  ║
║                                                           ║
║  Open your browser to start using the planner!            ║
║                                                           ║
║  API Endpoints:                                           ║
║  - GET    /api/tasks          - List all tasks            ║
║  - POST   /api/tasks          - Create a task             ║
║  - GET    /api/tasks/:id      - Get a task                ║
║  - PUT    /api/tasks/:id      - Update a task             ║
║  - DELETE /api/tasks/:id      - Delete a task             ║
║  - POST   /api/tasks/:id/checklist    - Add checklist     ║
║  - POST   /api/tasks/:id/email        - Send reminder     ║
╚═══════════════════════════════════════════════════════════╝
        `);
    });
}
