const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const DATA_FILE = path.join(__dirname, 'courses.json');
const PORT = 5000;
const VALID_STATUSES = ['Not Started', 'In Progress', 'Completed'];
const REQUIRED_FIELDS = ['name', 'description', 'target_date', 'status'];

app.use(express.json());

// Give storage errors a safe, useful message without exposing local file paths.
class StorageError extends Error {
  constructor(message, cause) {
    super(message, { cause });
    this.name = 'StorageError';
  }
}

// Read all courses. The first read creates an empty data file for a new project.
function loadCourses() {
  let fileContents;

  try {
    fileContents = fs.readFileSync(DATA_FILE, 'utf8');
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw new StorageError('Unable to read course data.', error);
    }

    saveCourses([]);
    return [];
  }

  try {
    const courses = JSON.parse(fileContents);
    if (!Array.isArray(courses)) {
      throw new Error('Course data must be a JSON array.');
    }
    return courses;
  } catch (error) {
    throw new StorageError('Course data file contains invalid JSON.', error);
  }
}

// Save all courses as readable JSON so beginners can inspect the file.
function saveCourses(courses) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(courses, null, 2), 'utf8');
  } catch (error) {
    throw new StorageError('Unable to save course data.', error);
  }
}

// Pick an ID larger than every existing ID, starting with 1 for an empty file.
function getNextId(courses) {
  return courses.reduce((largestId, course) => Math.max(largestId, course.id), 0) + 1;
}

function isValidTargetDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

function validateCourseFields(data, fields) {
  const errors = [];

  for (const field of fields) {
    if (field === 'name' || field === 'description') {
      if (typeof data[field] !== 'string' || data[field].trim() === '') {
        errors.push(`${field} must be a non-empty string.`);
      }
    } else if (field === 'target_date' && !isValidTargetDate(data[field])) {
      errors.push('target_date must be a valid date in YYYY-MM-DD format.');
    } else if (field === 'status' && !VALID_STATUSES.includes(data[field])) {
      errors.push(`status must be one of: ${VALID_STATUSES.join(', ')}.`);
    }
  }

  return errors;
}

function parseCourseId(value) {
  if (!/^[1-9]\d*$/.test(value)) {
    return null;
  }

  const id = Number(value);
  return Number.isSafeInteger(id) ? id : null;
}

// Create a course.
app.post('/api/courses', (req, res) => {
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
    return res.status(400).json({ success: false, error: 'Request body must be a JSON object.' });
  }

  const errors = validateCourseFields(req.body, REQUIRED_FIELDS);
  if (errors.length > 0) {
    return res.status(400).json({ success: false, errors });
  }

  const courses = loadCourses();
  const course = {
    id: getNextId(courses),
    name: req.body.name.trim(),
    description: req.body.description.trim(),
    target_date: req.body.target_date,
    status: req.body.status,
    created_at: new Date().toISOString(),
  };

  courses.push(course);
  saveCourses(courses);
  return res.status(201).json({ success: true, course });
});

// List every course.
app.get('/api/courses', (req, res) => {
  const courses = loadCourses();
  return res.status(200).json({ success: true, count: courses.length, courses });
});

// Find a course by its numeric ID.
app.get('/api/courses/:id', (req, res) => {
  const courseId = parseCourseId(req.params.id);
  if (courseId === null) {
    return res.status(400).json({ success: false, error: 'Course ID must be a positive integer.' });
  }

  const course = loadCourses().find((item) => item.id === courseId);
  if (!course) {
    return res.status(404).json({ success: false, error: `Course with ID ${courseId} not found.` });
  }

  return res.status(200).json({ success: true, course });
});

// Update one or more course fields without changing its ID or creation time.
app.put('/api/courses/:id', (req, res) => {
  const courseId = parseCourseId(req.params.id);
  if (courseId === null) {
    return res.status(400).json({ success: false, error: 'Course ID must be a positive integer.' });
  }

  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
    return res.status(400).json({ success: false, error: 'Request body must be a JSON object.' });
  }

  const fields = Object.keys(req.body);
  if (fields.length === 0) {
    return res.status(400).json({ success: false, error: 'Provide at least one course field to update.' });
  }

  const allowedFields = ['name', 'description', 'target_date', 'status'];
  const unknownFields = fields.filter((field) => !allowedFields.includes(field));
  if (unknownFields.length > 0) {
    return res.status(400).json({
      success: false,
      error: `Fields cannot be updated: ${unknownFields.join(', ')}.`,
    });
  }

  const errors = validateCourseFields(req.body, fields);
  if (errors.length > 0) {
    return res.status(400).json({ success: false, errors });
  }

  const courses = loadCourses();
  const course = courses.find((item) => item.id === courseId);
  if (!course) {
    return res.status(404).json({ success: false, error: `Course with ID ${courseId} not found.` });
  }

  for (const field of fields) {
    course[field] = field === 'name' || field === 'description' ? req.body[field].trim() : req.body[field];
  }

  saveCourses(courses);
  return res.status(200).json({ success: true, course });
});

// Remove a course from the JSON file.
app.delete('/api/courses/:id', (req, res) => {
  const courseId = parseCourseId(req.params.id);
  if (courseId === null) {
    return res.status(400).json({ success: false, error: 'Course ID must be a positive integer.' });
  }

  const courses = loadCourses();
  const courseIndex = courses.findIndex((item) => item.id === courseId);
  if (courseIndex === -1) {
    return res.status(404).json({ success: false, error: `Course with ID ${courseId} not found.` });
  }

  const [deletedCourse] = courses.splice(courseIndex, 1);
  saveCourses(courses);
  return res.status(200).json({ success: true, deleted_course: deletedCourse });
});

// Convert malformed JSON and file-system failures into clear JSON responses.
app.use((error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
    return res.status(400).json({ success: false, error: 'Request body contains invalid JSON.' });
  }

  if (error instanceof StorageError) {
    console.error(`${error.message} ${error.cause ? error.cause.message : ''}`.trim());
    return res.status(500).json({ success: false, error: error.message });
  }

  console.error('Unexpected server error:', error);
  return res.status(500).json({ success: false, error: 'An unexpected server error occurred.' });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`CodeCraftHub API is running at http://localhost:${PORT}`);
    console.log(`Course data is stored in ${DATA_FILE}`);
  });
}

module.exports = app;
