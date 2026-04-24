# Security Guidelines

## Overview
This document outlines security practices and measures implemented in the MySQL Assignment backend.

## Authentication & Authorization

### JWT Implementation
- **Access Token**: 15-minute expiration, used for API requests
- **Refresh Token**: 7-day expiration, stored in database for validation
- **Token Type**: Includes `token_type` claim to prevent token type confusion attacks
- **Revocation**: Refresh tokens are revoked after use and on logout

### Password Security
- **Hashing**: bcryptjs with 12 salt rounds (adaptable difficulty)
- **Policy Enforcement**:
  - Minimum 8 characters, maximum 72 characters
  - Requires: uppercase, lowercase, number, symbol
  - Cannot contain parts of email or name
- **Change Verification**: Old password verification required

### Role-Based Access Control
- **Roles**: `admin`, `customer`
- **Admin Protection**: Admins cannot remove their own admin role
- **Default Role**: New users created as `customer`

## API Security

### Rate Limiting
- **Auth Endpoints**: 5 requests per 15 minutes
- **Implementation**: express-rate-limit middleware
- **Prevents**: Brute-force attacks, password enumeration

### Request Limits
- **Body Size**: 10KB maximum
- **Content-Type**: application/json, application/x-www-form-urlencoded
- **Prevents**: Large payload attacks, DoS attempts

### CORS Configuration
- **Origins**: Configurable via `ALLOWED_ORIGINS` env var
- **Methods**: GET, POST, PUT, PATCH, DELETE, OPTIONS
- **Credentials**: Support for credential-based requests
- **Prevents**: Cross-origin attacks

### HTTP Security Headers (Helmet.js)
- `Content-Security-Policy`: Prevents XSS attacks
- `X-Frame-Options`: Prevents clickjacking
- `X-Content-Type-Options`: Prevents MIME type sniffing
- `Strict-Transport-Security`: Enforces HTTPS
- `X-XSS-Protection`: Legacy XSS protection

## Data Protection

### Sensitive Data Handling
- **Excluded from API**: password_hash, internal numeric IDs
- **Database Storage**: Passwords hashed, never stored plaintext
- **Environment Secrets**: JWT secrets in environment variables
- **Queries**: Parameterized to prevent SQL injection

### Refresh Token Security
Refresh tokens have additional safeguards:
- Stored in database for validation
- Revoked after successful token refresh
- Revoked on logout
- Indexed by user_id and is_revoked for efficient lookups
- Verified for exact match (not just claims)

## Database Security

### Connection Security
- **Connection Pooling**: Limits concurrent connections (max 10)
- **Queue Management**: Prevents connection exhaustion
- **Environment Config**: Database credentials via env vars

### Query Safety
- **Parameterized Queries**: All queries use prepared statements
- **Type Validation**: Input validation before queries
- **Indexes**: Added for frequent lookups (email, role, created_at)

### Data Validation
All user inputs validated in `UserModel`:
- Email format and length
- Full name length (2-100 chars)
- Age range (0-100)
- Role (admin/customer only)
- Password policy compliance

## Error Handling

### Information Disclosure
- Generic error messages for authentication failures
- No stack traces in production responses
- Console logging for debugging (development only)
- Timing-attack resistant: Dummy password hash for timing consistency

### Logging Best Practices
- Log authentication failures (for monitoring)
- Log admin actions (for audit trail)
- Log validation errors (for troubleshooting)
- Do NOT log passwords or tokens

## Environment Security

### Required Configuration
```bash
# Generate secure random strings
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Variable Validation
Server validates all required variables on startup:
- Database credentials
- JWT secrets (must be set)
- Port configuration
- CORS allowed origins

## Common Vulnerabilities

### Prevented
- **SQL Injection**: Parameterized queries
- **XSS**: Response content-type headers, input validation
- **CSRF**: JWT-based authentication (token in header, not cookie)
- **Brute Force**: Rate limiting on auth endpoints
- **Timing Attacks**: Dummy password hash for consistent timing
- **CORS Attacks**: Configurable origin whitelist
- **Clickjacking**: X-Frame-Options header
- **MIME Sniffing**: X-Content-Type-Options header

### Mitigated
- **Session Fixation**: Tokens issued per login, revoked on logout
- **Privilege Escalation**: Role validation on every request
- **Token Compromise**: Short-lived access tokens, refresh token revocation

## TODO / Future Improvements

- [ ] Structured logging (Winston/Bunyan)
- [ ] Request ID tracking for debugging
- [ ] Password reset email verification
- [ ] Email address verification
- [ ] Two-factor authentication (2FA)
- [ ] Audit logs for admin actions
- [ ] API rate limiting per user
- [ ] HTTPS enforcement in production
- [ ] Refresh token rotation on use
- [ ] Token blacklisting for security events
- [ ] OWASP Security Headers compliance check
- [ ] Penetration testing

## Deployment Checklist

Before production deployment:

- [ ] Set NODE_ENV=production
- [ ] Use strong, random JWT secrets (32+ chars)
- [ ] Configure HTTPS/TLS
- [ ] Set ALLOWED_ORIGINS to your frontend domain(s)
- [ ] Enable database backups
- [ ] Monitor authentication failures
- [ ] Set up error logging/monitoring
- [ ] Use environment variables, never hardcode secrets
- [ ] Validate all .env variables are set
- [ ] Test rate limiting is working
- [ ] Ensure CORS is restrictive (not wildcard)
- [ ] Review database user permissions (least privilege)
- [ ] Keep dependencies updated
- [ ] Configure database connection timeouts
- [ ] Set up automated backups and disaster recovery

## Vulnerability Reporting

If you discover a security vulnerability, please:
1. DO NOT open a public issue
2. Email security details to the maintainer
3. Include steps to reproduce
4. Allow time for a fix before public disclosure

## References

- [OWASP Top 10](https://owasp.org/Top10/)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [Express.js Security](https://expressjs.com/en/advanced/best-practice-security.html)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
