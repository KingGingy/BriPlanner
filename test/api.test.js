/**
 * BriPlanner API Tests
 *
 * Using Node.js built-in test runner (available in Node.js 18+)
 */

const { test, describe, beforeEach, after } = require('node:test');
const assert = require('node:assert');
const http = require('node:http');

// Import the app
const { app, tasks, findTaskById, removeTaskById } = require('../server');

let server;
let baseUrl;

// Helper to make HTTP requests
function request(method, path, body = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: new URL(baseUrl).port,
            path,
            method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    resolve({
                        status: res.statusCode,
                        data: data ? JSON.parse(data) : null
                    });
                } catch (error) {
                    resolve({
                        status: res.statusCode,
                        data: data
                    });
                }
            });
        });

        req.on('error', reject);

        if (body) {
            req.write(JSON.stringify(body));
        }
        req.end();
    });
}

describe('BriPlanner API Tests', () => {
    beforeEach(() => {
        // Clear tasks before each test
        tasks.length = 0;
    });

    test('should start the server', async (t) => {
        return new Promise((resolve, reject) => {
            server = app.listen(0, () => {
                const address = server.address();
                baseUrl = `http://localhost:${address.port}`;
                console.log(`Test server running at ${baseUrl}`);
                resolve();
            });
            server.on('error', reject);
        });
    });

    test('GET /api/tasks - should return empty array initially', async (t) => {
        const res = await request('GET', '/api/tasks');
        assert.strictEqual(res.status, 200);
        assert.ok(Array.isArray(res.data));
        assert.strictEqual(res.data.length, 0);
    });

    test('POST /api/tasks - should create a new task', async (t) => {
        const res = await request('POST', '/api/tasks', {
            title: 'Test Task',
            description: 'Test Description'
        });

        assert.strictEqual(res.status, 201);
        assert.strictEqual(res.data.title, 'Test Task');
        assert.strictEqual(res.data.description, 'Test Description');
        assert.strictEqual(res.data.completed, false);
        assert.ok(res.data.id);
        assert.ok(Array.isArray(res.data.checklist));
        assert.ok(Array.isArray(res.data.children));
    });

    test('POST /api/tasks - should fail without title', async (t) => {
        const res = await request('POST', '/api/tasks', {
            description: 'No title task'
        });

        assert.strictEqual(res.status, 400);
        assert.strictEqual(res.data.error, 'Title is required');
    });

    test('GET /api/tasks/:id - should get a specific task', async (t) => {
        // First create a task
        const createRes = await request('POST', '/api/tasks', {
            title: 'Task to Get'
        });
        const taskId = createRes.data.id;

        // Then get it
        const res = await request('GET', `/api/tasks/${taskId}`);
        assert.strictEqual(res.status, 200);
        assert.strictEqual(res.data.title, 'Task to Get');
    });

    test('GET /api/tasks/:id - should return 404 for non-existent task', async (t) => {
        const res = await request('GET', '/api/tasks/non-existent-id');
        assert.strictEqual(res.status, 404);
    });

    test('PUT /api/tasks/:id - should update a task', async (t) => {
        // Create a task
        const createRes = await request('POST', '/api/tasks', {
            title: 'Original Title'
        });
        const taskId = createRes.data.id;

        // Update it
        const res = await request('PUT', `/api/tasks/${taskId}`, {
            title: 'Updated Title',
            completed: true
        });

        assert.strictEqual(res.status, 200);
        assert.strictEqual(res.data.title, 'Updated Title');
        assert.strictEqual(res.data.completed, true);
    });

    test('DELETE /api/tasks/:id - should delete a task', async (t) => {
        // Create a task
        const createRes = await request('POST', '/api/tasks', {
            title: 'Task to Delete'
        });
        const taskId = createRes.data.id;

        // Delete it
        const res = await request('DELETE', `/api/tasks/${taskId}`);
        assert.strictEqual(res.status, 200);

        // Verify it's gone
        const getRes = await request('GET', `/api/tasks/${taskId}`);
        assert.strictEqual(getRes.status, 404);
    });

    test('POST /api/tasks/:id/checklist - should add checklist item', async (t) => {
        // Create a task
        const createRes = await request('POST', '/api/tasks', {
            title: 'Task with Checklist'
        });
        const taskId = createRes.data.id;

        // Add checklist item
        const res = await request('POST', `/api/tasks/${taskId}/checklist`, {
            text: 'Checklist Item 1'
        });

        assert.strictEqual(res.status, 201);
        assert.strictEqual(res.data.text, 'Checklist Item 1');
        assert.strictEqual(res.data.completed, false);
        assert.ok(res.data.id);
    });

    test('PUT /api/tasks/:taskId/checklist/:itemId - should update checklist item', async (t) => {
        // Create task and checklist item
        const createRes = await request('POST', '/api/tasks', {
            title: 'Task for Checklist Update'
        });
        const taskId = createRes.data.id;

        const addItemRes = await request('POST', `/api/tasks/${taskId}/checklist`, {
            text: 'Item to Update'
        });
        const itemId = addItemRes.data.id;

        // Update the item
        const res = await request('PUT', `/api/tasks/${taskId}/checklist/${itemId}`, {
            completed: true
        });

        assert.strictEqual(res.status, 200);
        assert.strictEqual(res.data.completed, true);
    });

    test('DELETE /api/tasks/:taskId/checklist/:itemId - should delete checklist item', async (t) => {
        // Create task and checklist item
        const createRes = await request('POST', '/api/tasks', {
            title: 'Task for Checklist Delete'
        });
        const taskId = createRes.data.id;

        const addItemRes = await request('POST', `/api/tasks/${taskId}/checklist`, {
            text: 'Item to Delete'
        });
        const itemId = addItemRes.data.id;

        // Delete the item
        const res = await request('DELETE', `/api/tasks/${taskId}/checklist/${itemId}`);
        assert.strictEqual(res.status, 200);
    });

    test('POST /api/tasks - should create child task', async (t) => {
        // Create parent task
        const parentRes = await request('POST', '/api/tasks', {
            title: 'Parent Task'
        });
        const parentId = parentRes.data.id;

        // Create child task
        const res = await request('POST', '/api/tasks', {
            title: 'Child Task',
            parentId: parentId
        });

        assert.strictEqual(res.status, 201);
        assert.strictEqual(res.data.title, 'Child Task');

        // Verify parent has child
        const parentGetRes = await request('GET', `/api/tasks/${parentId}`);
        assert.strictEqual(parentGetRes.data.children.length, 1);
        assert.strictEqual(parentGetRes.data.children[0].title, 'Child Task');
    });

    test('Helper: findTaskById should find nested tasks', async (t) => {
        // Create parent and child
        const parentRes = await request('POST', '/api/tasks', {
            title: 'Parent'
        });
        const parentId = parentRes.data.id;

        const childRes = await request('POST', '/api/tasks', {
            title: 'Child',
            parentId: parentId
        });
        const childId = childRes.data.id;

        // Find child using helper
        const found = findTaskById(childId, tasks);
        assert.ok(found);
        assert.strictEqual(found.title, 'Child');
    });

    test('Helper: removeTaskById should work correctly', async (t) => {
        // Create a task directly in tasks array
        const testTask = {
            id: 'test-id',
            title: 'Test',
            children: []
        };
        tasks.push(testTask);

        const result = removeTaskById('test-id', tasks);
        assert.strictEqual(result, true);
        assert.strictEqual(tasks.length, 0);
    });

    // Clean up: close server after all tests
    after(() => {
        return new Promise((resolve) => {
            if (server) {
                server.close(resolve);
            } else {
                resolve();
            }
        });
    });
});
