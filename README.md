# BriPlanner
Detailed Automated Planner for ADHD folks

![BriPlanner Screenshot](https://github.com/user-attachments/assets/bd658bd6-9304-463f-a94e-bd2e7b124c6a)

## Features

- ✅ **Task Management** - Create, update, and delete tasks
- 📋 **Checklists** - Add checklist items to break down tasks into smaller steps
- 📁 **Subtasks** - Create child tasks for hierarchical organization
- 📧 **Email Reminders** - Send task reminders via email
- 🎨 **Clean UI** - Simple, distraction-free interface

## How Node.js Works (For NetSuite Developers)

If you're coming from NetSuite SuiteScript, here's how Node.js compares:

### SuiteScript vs Node.js + Express

| SuiteScript | Node.js + Express |
|-------------|-------------------|
| Upload files to File Cabinet | Files stay on your server/computer |
| Deploy via Script Deployment records | Run with `npm start` |
| Use NetSuite APIs (N/record, N/search) | Use npm packages |
| RESTlets handle HTTP requests | Express routes handle HTTP requests |
| Data stored in NetSuite records | Data stored in files/databases |

### Key Concepts

1. **Express Server** (`server.js`) - This is like a RESTlet that handles all your HTTP requests. Instead of defining entry points in NetSuite, you define routes:

```javascript
// SuiteScript RESTlet
function get(requestParams) {
    return record.load({ type: 'task', id: requestParams.id });
}

// Express equivalent
app.get('/api/tasks/:id', (req, res) => {
    const task = findTaskById(req.params.id);
    res.json(task);
});
```

2. **Static Files** (`public/` folder) - HTML, CSS, and JavaScript files served to the browser. No File Cabinet needed!

3. **npm Packages** - Instead of SuiteScript modules, you install packages:
   - `express` - Web server framework
   - `uuid` - Generate unique IDs (like internal IDs in NetSuite)
   - `nodemailer` - Send emails (like N/email module)

## Quick Start

### Prerequisites
- [Node.js](https://nodejs.org/) (version 18 or higher)

### Installation

```bash
# Clone the repository
git clone https://github.com/KingGingy/BriPlanner.git
cd BriPlanner

# Install dependencies
npm install

# Start the server
npm start
```

### Usage

1. Open your browser to `http://localhost:3000`
2. Add tasks using the form
3. Click on tasks to add checklists and subtasks
4. Use the "Details" button to send email reminders

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tasks` | Get all tasks |
| POST | `/api/tasks` | Create a new task |
| GET | `/api/tasks/:id` | Get a specific task |
| PUT | `/api/tasks/:id` | Update a task |
| DELETE | `/api/tasks/:id` | Delete a task |
| POST | `/api/tasks/:id/checklist` | Add checklist item |
| PUT | `/api/tasks/:taskId/checklist/:itemId` | Update checklist item |
| DELETE | `/api/tasks/:taskId/checklist/:itemId` | Delete checklist item |
| POST | `/api/tasks/:id/email` | Send email reminder |

## Project Structure

```
BriPlanner/
├── server.js           # Main Express server (like a RESTlet)
├── package.json        # Dependencies and scripts
├── public/             # Static files served to browser
│   ├── index.html      # Main HTML page
│   ├── css/
│   │   └── style.css   # Styles
│   └── js/
│       └── app.js      # Frontend JavaScript
└── test/
    └── api.test.js     # API tests
```

## Running Tests

```bash
npm test
```

## Future Enhancements

- [ ] Database persistence (MongoDB, PostgreSQL)
- [ ] User authentication
- [ ] Due dates and reminders
- [ ] Recurring tasks
- [ ] Mobile app

## License

ISC
Automated Planner for ADHD folks
>Helpful side project to learn
