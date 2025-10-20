# API Documentation

Complete reference for the LeetCode Practice App REST API.

## Base URL

```
http://localhost:3001/api
```

## Endpoints

### Health Check

Check if the server is running and database is connected.

**Endpoint**: `GET /api/health`

**Response**:
```json
{
  "status": "ok",
  "timestamp": "2025-10-20T12:00:00.000Z",
  "database": "connected"
}
```

---

### Get All Problems

Retrieve all problems with user progress.

**Endpoint**: `GET /api/problems`

**Query Parameters**:
- `sort` (optional): Sort field (`difficulty`, `popularity`, `acceptance_rate`, `solved`)
- `order` (optional): Sort order (`asc`, `desc`)

**Example**:
```bash
curl "http://localhost:3001/api/problems?sort=difficulty&order=asc" | jq .
```

**Response**:
```json
[
  {
    "id": 1,
    "title": "Two Sum",
    "concept": "Arrays & Hashing",
    "difficulty": "Easy",
    "acceptance_rate": 49.5,
    "popularity": 95,
    "leetcode_link": "https://leetcode.com/problems/two-sum/",
    "solved": true,
    "solved_at": "2025-10-15T10:30:00.000Z",
    "notes": "Used hash map for O(n) solution"
  }
]
```

---

### Get Problems by Concept

Retrieve problems filtered by concept/category.

**Endpoint**: `GET /api/problems/concept/:concept`

**Parameters**:
- `concept`: Concept name (URL-encoded)

**Example**:
```bash
curl "http://localhost:3001/api/problems/concept/Arrays%20%26%20Hashing" | jq .
```

**Response**: Same format as "Get All Problems"

---

### Update Problem Progress

Mark a problem as solved/unsolved or add notes.

**Endpoint**: `PUT /api/problems/:id/progress`

**Parameters**:
- `id`: Problem ID (integer)

**Request Body**:
```json
{
  "solved": true,
  "notes": "Used dynamic programming approach"
}
```

Both fields are optional. You can update just `solved` or just `notes`.

**Example**:
```bash
# Mark as solved
curl -X PUT http://localhost:3001/api/problems/1/progress \
  -H "Content-Type: application/json" \
  -d '{"solved": true}'

# Add notes
curl -X PUT http://localhost:3001/api/problems/1/progress \
  -H "Content-Type: application/json" \
  -d '{"notes": "Remember to handle edge cases"}'

# Both together
curl -X PUT http://localhost:3001/api/problems/1/progress \
  -H "Content-Type: application/json" \
  -d '{"solved": true, "notes": "Completed with O(n) time complexity"}'
```

**Response**:
```json
{
  "message": "Progress updated successfully",
  "problem_id": 1,
  "solved": true
}
```

---

### Get Progress Statistics

Get overall progress statistics.

**Endpoint**: `GET /api/stats`

**Example**:
```bash
curl http://localhost:3001/api/stats | jq .
```

**Response**:
```json
{
  "total_problems": 500,
  "solved_problems": 75,
  "unsolved_problems": 425,
  "percentage_complete": 15.0,
  "by_difficulty": {
    "Easy": {
      "total": 150,
      "solved": 45,
      "percentage": 30.0
    },
    "Medium": {
      "total": 250,
      "solved": 25,
      "percentage": 10.0
    },
    "Hard": {
      "total": 100,
      "solved": 5,
      "percentage": 5.0
    }
  },
  "by_concept": [
    {
      "concept": "Arrays & Hashing",
      "total": 45,
      "solved": 12,
      "percentage": 26.7
    }
  ]
}
```

---

### Import Problems from CSV

Import or update problems from CSV file.

**Endpoint**: `POST /api/import-problems`

**Example**:
```bash
curl -X POST http://localhost:3001/api/import-problems
```

**Response**:
```json
{
  "message": "Successfully imported problems",
  "count": 500,
  "inserted": 450,
  "updated": 50
}
```

**Note**: This endpoint reads from the CSV file specified in the server configuration.

---

## Error Responses

All endpoints may return error responses in this format:

```json
{
  "error": "Error message description"
}
```

### Common HTTP Status Codes

- `200 OK`: Request succeeded
- `400 Bad Request`: Invalid request parameters
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Server error

## Rate Limiting

Currently no rate limiting is implemented. For production deployment, consider adding rate limiting middleware.

## Authentication

Currently no authentication is implemented. All endpoints are public. Future versions will include:

- JWT-based authentication
- User-specific progress tracking
- API keys for programmatic access

## CORS

The API accepts requests from all origins. In production, configure CORS to allow only your frontend domain.

## Pagination

Currently not implemented. All problems are returned in a single response. For large datasets, pagination should be added:

```
GET /api/problems?page=1&limit=50
```

---

For deployment instructions, see [DEPLOYMENT.md](DEPLOYMENT.md).

For architecture details, see [ARCHITECTURE.md](ARCHITECTURE.md).

