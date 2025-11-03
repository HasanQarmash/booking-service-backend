# Booking Service API Documentation

## Base URL
```
http://localhost:3000/api
```

## Table of Contents
1. [Authentication](#authentication)
2. [User Management](#user-management)
3. [Error Handling](#error-handling)
4. [Rate Limiting](#rate-limiting)

---

## Authentication

All authenticated endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer <token>
```

### 1. Register User

**Endpoint:** `POST /api/auth/register`

**Description:** Create a new user account

**Request Body:**
```json
{
  "full_name": "John Doe",
  "email": "john.doe@example.com",
  "phone": "0599123456",
  "password": "SecurePassword123"
}
```

**Validation Rules:**
- `full_name`: Required, minimum 2 characters
- `email`: Required, valid email format
- `phone`: Required, valid Palestinian phone number (starts with 059, 056, 0598, 0597, etc., 10 digits total)
- `password`: Required, minimum 8 characters

**Success Response (201):**
```json
{
  "message": "User registered successfully",
  "user": {
    "id": "uuid-here",
    "full_name": "John Doe",
    "email": "john.doe@example.com",
    "phone": "0599123456"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Error Responses:**
- `400 Bad Request`: Missing required fields or validation errors
- `400 Bad Request`: Email already exists

**Example Error:**
```json
{
  "message": "Email already exists"
}
```

---

### 2. Login User

**Endpoint:** `POST /api/auth/login`

**Description:** Authenticate user and receive JWT token

**Rate Limit:** 5 requests per 15 minutes

**Request Body:**
```json
{
  "email": "john.doe@example.com",
  "password": "SecurePassword123"
}
```

**Success Response (200):**
```json
{
  "message": "Login successful",
  "user": {
    "id": "uuid-here",
    "full_name": "John Doe",
    "email": "john.doe@example.com",
    "phone": "0599123456"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Error Responses:**
- `400 Bad Request`: Missing email or password
- `400 Bad Request`: Invalid credentials
- `429 Too Many Requests`: Rate limit exceeded

**Example Errors:**
```json
{
  "message": "Missing required fields: email or password"
}
```
```json
{
  "message": "Invalid credentials"
}
```

---

### 3. Request Password Reset

**Endpoint:** `POST /api/auth/request-reset`

**Description:** Request a password reset link (sent via email)

**Request Body:**
```json
{
  "email": "john.doe@example.com"
}
```

**Success Response (200):**
```json
{
  "message": "Password reset link sent successfully"
}
```

**Error Responses:**
- `400 Bad Request`: Missing email
- `404 Not Found`: User not found
- `500 Internal Server Error`: Email sending failed

**Example Errors:**
```json
{
  "message": "Missing required fields: email"
}
```
```json
{
  "message": "User not found"
}
```

**Note:** The reset token is sent via email and is valid for 15 minutes.

---

### 4. Reset Password

**Endpoint:** `PATCH /api/auth/reset-password/:token`

**Description:** Reset user password using the token from email

**Request Body:**
```json
{
  "token": "reset-token-from-email",
  "newPassword": "NewSecurePassword123"
}
```

**Validation Rules:**
- `newPassword`: Required, minimum 8 characters

**Success Response (200):**
```json
{
  "message": "Password reset successful"
}
```

**Error Responses:**
- `400 Bad Request`: Missing token or password
- `400 Bad Request`: Invalid or expired token
- `400 Bad Request`: Password validation error

---

## User Management

### 1. Get All Users

**Endpoint:** `GET /api/users`

**Description:** Retrieve all users (requires authentication)

**Headers:**
```
Authorization: Bearer <token>
```

**Success Response (200):**
```json
[
  {
    "id": "uuid-1",
    "full_name": "John Doe",
    "email": "john.doe@example.com",
    "phone": "0599123456"
  },
  {
    "id": "uuid-2",
    "full_name": "Jane Smith",
    "email": "jane.smith@example.com",
    "phone": "0599234567"
  }
]
```

**Error Responses:**
- `401 Unauthorized`: Missing or invalid token
- `403 Forbidden`: Token expired

---

### 2. Get User by Email

**Endpoint:** `GET /api/users/:email`

**Description:** Retrieve a specific user by email (requires authentication)

**Headers:**
```
Authorization: Bearer <token>
```

**Example:** `GET /api/users/john.doe@example.com`

**Success Response (200):**
```json
{
  "id": "uuid-here",
  "full_name": "John Doe",
  "email": "john.doe@example.com",
  "phone": "0599123456"
}
```

**Error Responses:**
- `401 Unauthorized`: Missing or invalid token
- `404 Not Found`: User not found

---

### 3. Update User

**Endpoint:** `PUT /api/users/:email`

**Description:** Update user information (requires authentication)

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "full_name": "John Updated Doe",
  "phone": "0599999999",
  "password": "NewPassword123"
}
```

**Validation Rules:**
- `full_name`: Optional, minimum 2 characters if provided
- `phone`: Optional, valid Palestinian phone number if provided
- `password`: Optional, minimum 8 characters if provided

**Success Response (200):**
```json
{
  "message": "User updated successfully",
  "user": {
    "id": "uuid-here",
    "full_name": "John Updated Doe",
    "email": "john.doe@example.com",
    "phone": "0599999999"
  }
}
```

**Error Responses:**
- `400 Bad Request`: Validation errors
- `401 Unauthorized`: Missing or invalid token
- `404 Not Found`: User not found

---

### 4. Delete User

**Endpoint:** `DELETE /api/users/:email`

**Description:** Delete a user account (requires authentication)

**Headers:**
```
Authorization: Bearer <token>
```

**Example:** `DELETE /api/users/john.doe@example.com`

**Success Response (200):**
```json
{
  "message": "User deleted successfully"
}
```

**Error Responses:**
- `401 Unauthorized`: Missing or invalid token
- `404 Not Found`: User not found

---

## Error Handling

### Standard Error Response Format

All errors follow this format:
```json
{
  "message": "Error description here"
}
```

### Common HTTP Status Codes

| Status Code | Description |
|-------------|-------------|
| 200 | Success |
| 201 | Created (e.g., user registration) |
| 400 | Bad Request (validation errors, missing fields) |
| 401 | Unauthorized (missing or invalid token) |
| 403 | Forbidden (valid token but expired/insufficient permissions) |
| 404 | Not Found (resource doesn't exist) |
| 429 | Too Many Requests (rate limit exceeded) |
| 500 | Internal Server Error |

### Common Error Messages

**Validation Errors:**
```json
{ "message": "Missing required fields: full_name, email" }
{ "message": "Invalid email format" }
{ "message": "Password must be at least 8 characters long" }
{ "message": "Full name must be at least 2 characters long" }
{ "message": "Phone number is invalid. It must be a valid Palestinian phone number." }
```

**Authentication Errors:**
```json
{ "message": "Invalid credentials" }
{ "message": "No token provided" }
{ "message": "Invalid token" }
{ "message": "Token expired" }
```

**Resource Errors:**
```json
{ "message": "User not found" }
{ "message": "Email already exists" }
```

---

## Rate Limiting

### Login Endpoint
- **Limit:** 5 requests per 15 minutes
- **Applies to:** `POST /api/auth/login`
- **Response when exceeded:** 
  ```json
  {
    "message": "Too many login attempts, please try again later."
  }
  ```

### General API Rate Limit
- **Limit:** 100 requests per 15 minutes
- **Applies to:** All API endpoints
- **Headers:** Rate limit info included in response headers
  - `X-RateLimit-Limit`: Maximum requests allowed
  - `X-RateLimit-Remaining`: Requests remaining
  - `X-RateLimit-Reset`: Time when limit resets

---

## JWT Token

### Token Structure

The JWT token contains the following payload:
```json
{
  "id": "user-uuid",
  "full_name": "John Doe",
  "email": "john.doe@example.com",
  "phone": "0599123456",
  "iat": 1698765432,
  "exp": 1698769032
}
```

### Token Expiration
- Default: 1 hour
- Can be configured via `JWT_EXPIRES_IN` environment variable

### Using the Token

Include the token in the Authorization header for all protected endpoints:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## Palestinian Phone Number Format

Valid formats:
- `0599123456` (10 digits starting with 059)
- `0569123456` (10 digits starting with 056)
- `0598123456` (10 digits starting with 0598)
- `0597123456` (10 digits starting with 0597)

Pattern: `/^(?:\+970|0|\+972)?[5-9][0-9]{7,8}$/`

**Valid prefixes:**
- 059X (Jawwal)
- 056X (Ooredoo)
- 0598 (various providers)
- 0597 (various providers)

---

## CORS Configuration

The API supports CORS with the following configuration:
- **Allowed Origin:** `http://localhost:4200` (configurable via `FRONTEND_URL`)
- **Allowed Methods:** GET, POST, PUT, DELETE
- **Credentials:** Supported

---

## Example Frontend Integration

### JavaScript/TypeScript Example

```typescript
// Login Example
async function login(email: string, password: string) {
  try {
    const response = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message);
    }

    const data = await response.json();
    // Store token in localStorage or secure storage
    localStorage.setItem('token', data.token);
    return data;
  } catch (error) {
    console.error('Login failed:', error);
    throw error;
  }
}

// Authenticated Request Example
async function getUsers() {
  const token = localStorage.getItem('token');
  
  try {
    const response = await fetch('http://localhost:3000/api/users', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message);
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to fetch users:', error);
    throw error;
  }
}

// Register Example
async function register(userData: {
  full_name: string;
  email: string;
  phone: string;
  password: string;
}) {
  try {
    const response = await fetch('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message);
    }

    const data = await response.json();
    localStorage.setItem('token', data.token);
    return data;
  } catch (error) {
    console.error('Registration failed:', error);
    throw error;
  }
}
```

### Angular Service Example

```typescript
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'http://localhost:3000/api';

  constructor(private http: HttpClient) {}

  register(userData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/register`, userData);
  }

  login(email: string, password: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/login`, { email, password });
  }

  getUsers(): Observable<any[]> {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
    return this.http.get<any[]>(`${this.apiUrl}/users`, { headers });
  }

  updateUser(email: string, userData: any): Observable<any> {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
    return this.http.put(`${this.apiUrl}/users/${email}`, userData, { headers });
  }

  deleteUser(email: string): Observable<any> {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
    return this.http.delete(`${this.apiUrl}/users/${email}`, { headers });
  }
}
```

---

## Environment Variables

Required environment variables for the backend:

```env
# Server
PORT=3000
NODE_ENV=development

# Database
POSTGRES_USER=your_db_user
POSTGRES_PASSWORD=your_db_password
POSTGRES_DB=booking_service
POSTGRES_HOST=localhost
POSTGRES_PORT=5432

# JWT
JWT_SECRET=your-secret-key-here
JWT_EXPIRES_IN=1h

# Password Hashing
BCRYPT_PASSWORD=your-pepper-here
SALT_ROUNDS=10

# Frontend
FRONTEND_URL=http://localhost:4200

# Email (for password reset)
EMAIL_HOST=smtp.example.com
EMAIL_PORT=587
EMAIL_USERNAME=your-email@example.com
EMAIL_PASSWORD=your-email-password
EMAIL_FROM=noreply@example.com
EMAIL_FROM_NAME=Booking Service
```

---

## Testing

### Running Tests
```bash
npm test
```

### Test Coverage
- Authentication endpoints (register, login, password reset)
- User CRUD operations
- User model methods
- Validation and error handling
- Security tests (SQL injection, password hashing)

---

## Version Information

- **API Version:** 1.0.0
- **Last Updated:** November 1, 2025
- **Node Version:** 18.x or higher
- **Database:** PostgreSQL 14+

---

## Support & Contact

For questions or issues:
- **Developer:** Abdelrahman Jaber
- **Repository:** booking-service-backend

---

## Changelog

### Version 1.0.0 (Current)
- Initial API release
- User registration and authentication
- JWT-based authorization
- Password reset functionality
- User CRUD operations
- Rate limiting on sensitive endpoints
- Email notification system
