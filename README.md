# CodeCraftHub

CodeCraftHub is a small REST API for tracking courses you want to learn. It uses Node.js, Express, and a local JSON file, so no database or user account is needed.

## Features

- Create, list, view, update, and delete courses
- Automatically generated numeric IDs and creation timestamps
- Input validation for required fields, dates, and course statuses
- Persistent storage in `courses.json`, created automatically on first use
- JSON error responses for invalid requests, missing courses, and storage failures

## Project structure

```text
codecrafthub/
├── app.js          # Express application and API routes
├── courses.json    # Course data (created automatically)
├── package.json    # Project metadata and dependencies
└── README.md       # Project documentation
```

## Installation

Install [Node.js](https://nodejs.org/) and then install the project dependencies:

```bash
npm install
```

## Run the application

```bash
npm start
```

The API listens on `http://localhost:5000`. The `courses.json` file is created the first time an API request needs to read the course list.

## Course fields

Each course has the following shape:

```json
{
  "id": 1,
  "name": "Python Basics",
  "description": "Learn Python fundamentals",
  "target_date": "2026-12-31",
  "status": "Not Started",
  "created_at": "2026-09-29T09:12:00.000Z"
}
```

When creating a course, provide `name`, `description`, `target_date`, and `status`. The target date must be a real calendar date in `YYYY-MM-DD` format. Status must be `Not Started`, `In Progress`, or `Completed`. The API generates `id` and `created_at`.

## API endpoints

All responses use JSON. Successful responses include `"success": true`; validation and server errors include `"success": false`.

### Create a course

`POST /api/courses`

```bash
curl -X POST http://localhost:5000/api/courses \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Python Basics\",\"description\":\"Learn Python fundamentals\",\"target_date\":\"2026-12-31\",\"status\":\"Not Started\"}"
```

Returns `201 Created` and the new course.

### Get all courses

`GET /api/courses`

```bash
curl http://localhost:5000/api/courses
```

Returns `200 OK` with a `count` and a `courses` array.

### Get one course

`GET /api/courses/:id`

```bash
curl http://localhost:5000/api/courses/1
```

Returns `200 OK`, or `404 Not Found` if the course does not exist.

### Update a course

`PUT /api/courses/:id`

Send one or more editable fields. Fields not included stay unchanged; the course ID and creation time cannot be changed.

```bash
curl -X PUT http://localhost:5000/api/courses/1 \
  -H "Content-Type: application/json" \
  -d "{\"status\":\"In Progress\"}"
```

Returns `200 OK`, or `404 Not Found` if the course does not exist.

### Delete a course

`DELETE /api/courses/:id`

```bash
curl -X DELETE http://localhost:5000/api/courses/1
```

Returns `200 OK` and the deleted course, or `404 Not Found` if it does not exist.

## Troubleshooting

- **`Cannot find module 'express'`**: run `npm install`.
- **Port 5000 is already in use**: stop the other process using the port before starting CodeCraftHub.
- **Course data cannot be read or saved**: check that the project directory is writable and that `courses.json` contains valid JSON (a JSON array of courses).
- **`400 Bad Request`**: check that the JSON body is valid and that required fields, date format, and status values meet the rules above.
