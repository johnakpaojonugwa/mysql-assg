# MySQL Assignment - Backend API

A secure Node.js/Express REST API with JWT authentication, role-based access control, and MySQL database.

## Features

### Authentication & Authorization
- ✅ User registration and authentication with JWT tokens
- ✅ Access token (15min) + Refresh token (7d) pattern
- ✅ Role-based access control (admin/customer)
- ✅ Password hashing with bcryptjs (12 salt rounds)
- ✅ Strong password policy enforcement
- ✅ Rate limiting on authentication endpoints

### E-Commerce Features
- ✅ Product catalog with inventory management
- ✅ Shopping cart with per-user sessions
- ✅ Order management with status tracking
- ✅ Stock validation and atomic order processing
- ✅ Order cancellation with stock restoration
- ✅ Admin product and order management

### API Security
- ✅ Security headers with helmet.js
- ✅ CORS with configurable origins
- ✅ Request body size limits
- ✅ Environment validation
- ✅ Parameterized SQL queries (SQL injection safe)
- ✅ Rate limiting on sensitive endpoints
- ✅ Transaction support for critical operations

## Quick Start

### Prerequisites
- Node.js 16+
- MySQL 5.7+
- npm or yarn

### Installation

1. **Clone the repository**
```bash
cd mysql-assg
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment**
```bash
cp .env.example .env
# Edit .env with your database credentials
```

4. **Generate JWT secrets** (use 32+ char random strings)
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

5. **Start the server**
```bash
npm run dev    # Development with nodemon
npm start      # Production
```

## API Endpoints

### Authentication (`/api/auth`)
- `POST /register` - Register new user
- `POST /login` - Login with email/password
- `POST /refresh` - Refresh access token
- `POST /logout` - Logout and revoke refresh token

### User Self-Service (`/api/users`)
- `GET /me` - Get current user profile
- `PATCH /me` - Update profile (name, email, age)
- `PATCH /me/password` - Change password (requires current password)

### Admin Operations (`/api/admin/users`)
- `GET /users` - List all users
- `GET /users/:userId` - Get specific user
- `POST /users` - Create user
- `PATCH /users/:userId` - Update user (including role)
- `DELETE /users/:userId` - Delete user

### Products (`/api/products`)
- `GET /` - List all products (public)
- `GET /:productId` - Get product details (public)
- `POST /` - Create product (admin only)
- `PATCH /:productId` - Update product (admin only)
- `DELETE /:productId` - Delete product (admin only)

### Shopping Cart (`/api/cart`)
- `GET /` - Get user's cart (authenticated)
- `POST /items` - Add item to cart (authenticated)
- `PATCH /items/:cartItemId` - Update item quantity (authenticated)
- `DELETE /items/:cartItemId` - Remove item from cart (authenticated)
- `DELETE /` - Clear entire cart (authenticated)

### Orders (`/api/orders`)
- `POST /` - Create order from cart (authenticated, rate limited)
- `GET /` - List orders (customers see own, admins see all)
- `GET /:orderId` - Get order details (authenticated)
- `GET /:orderId/track` - Track order status (authenticated)
- `PATCH /:orderId/status` - Update order status (admin only)
- `POST /:orderId/cancel` - Cancel order (authenticated)

## Security Features

### Authentication & Authorization
- JWT-based stateless authentication
- Access token: 15-minute expiration
- Refresh token: 7-day expiration with database validation
- Refresh tokens are revoked on use and logout
- Role-based authorization (admin/customer)
- Admin-only endpoints for product management

### Password Security
- Minimum 8 characters, maximum 72 characters
- Requires uppercase, lowercase, number, and symbol
- Cannot contain parts of email or name
- Hashed with bcryptjs (12 salt rounds)
- Password change requires current password verification

### API Security
- Rate limiting: 5 requests per 15 minutes on `/api/auth`
- Order creation rate limit: 10 per 15 minutes per user
- Request body size limit: 10KB
- Security headers (helmet.js): XSS, Clickjacking, MIME sniffing protection
- CORS: Configurable origin whitelist
- Parameterized SQL queries (SQL injection protection)

### E-Commerce Security
- Atomic order processing with database transactions
- Stock validation and locking during order placement
- User authorization checks on cart and order operations
- Order ownership verification (customers see only their orders)
- Stock restoration on order cancellation

### Data Protection
- Passwords and internal IDs excluded from API responses
- Sensitive fields (password_hash) never exposed
- Environment variables for secrets

## Request/Response Examples

### Register
```bash
curl -X POST http://localhost:5002/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "full_name": "John Doe",
    "email": "john@example.com",
    "age": 25,
    "password": "SecurePass@123"
  }'
```

Response:
```json
{
  "success": true,
  "data": {
    "user_id": "USR_abc123...",
    "full_name": "John Doe",
    "email": "john@example.com",
    "role": "customer",
    "age": 25
  },
  "tokens": {
    "access_token": "eyJhbGc...",
    "refresh_token": "eyJhbGc...",
    "token_type": "Bearer",
    "access_token_expires_in": "15m",
    "refresh_token_expires_in": "7d"
  }
}
```

### Login
```bash
curl -X POST http://localhost:5002/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "SecurePass@123"
  }'
```

### Change Password
```bash
curl -X PATCH http://localhost:5002/api/users/me/password \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "current_password": "SecurePass@123",
    "new_password": "NewSecurePass@456"
  }'
```

### Products (Admin)
```bash
# Create product
curl -X POST http://localhost:5002/api/products \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Laptop Pro",
    "price": 1299.99,
    "stock_quantity": 10,
    "category": "Electronics",
    "sku": "LAP-001",
    "description": "High-performance laptop"
  }'

# Get products (public)
curl http://localhost:5002/api/products
```

### Shopping Cart (Customer)
```bash
# Get cart
curl http://localhost:5002/api/cart \
  -H "Authorization: Bearer <customer_token>"

# Add item to cart
curl -X POST http://localhost:5002/api/cart/items \
  -H "Authorization: Bearer <customer_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "product_id": "PROD_abc123...",
    "quantity": 2
  }'

# Update item quantity
curl -X PATCH http://localhost:5002/api/cart/items/ITEM_xyz789... \
  -H "Authorization: Bearer <customer_token>" \
  -H "Content-Type: application/json" \
  -d '{"quantity": 3}'

# Remove item from cart
curl -X DELETE http://localhost:5002/api/cart/items/ITEM_xyz789... \
  -H "Authorization: Bearer <customer_token>"
```

### Orders (Customer)
```bash
# Create order from cart
curl -X POST http://localhost:5002/api/orders \
  -H "Authorization: Bearer <customer_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "shipping_address": "123 Main St, New York, NY 10001",
    "billing_address": "123 Main St, New York, NY 10001"
  }'

# Get user's orders
curl http://localhost:5002/api/orders \
  -H "Authorization: Bearer <customer_token>"

# Track order
curl http://localhost:5002/api/orders/ORD_abc123.../track \
  -H "Authorization: Bearer <customer_token>"

# Cancel order
curl -X POST http://localhost:5002/api/orders/ORD_abc123.../cancel \
  -H "Authorization: Bearer <customer_token>"
```

### Orders (Admin)
```bash
# Get all orders
curl http://localhost:5002/api/orders \
  -H "Authorization: Bearer <admin_token>"

# Update order status
curl -X PATCH http://localhost:5002/api/orders/ORD_abc123.../status \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{"status": "shipped"}'
```

## Project Structure

```
.
├── app.js                              # Express app setup
├── server.js                           # Server entry point
├── package.json                        # Dependencies
├── .env.example                        # Environment template
├── configs/
│   └── db.js                           # MySQL connection pool
├── controllers/
│   ├── auth.controller.js              # Auth endpoints
│   ├── user-self.controller.js         # User self-service
│   ├── admin-users.controller.js       # Admin user management
│   ├── product.controller.js           # Product CRUD (admin)
│   ├── cart.controller.js              # Shopping cart management
│   └── order.controller.js             # Order processing
├── middleware/
│   ├── authenticate.js                 # JWT verification
│   └── authorize.js                    # Role-based authorization
├── models/
│   ├── user.model.js                   # User CRUD & validation
│   ├── refresh-token.model.js          # Refresh token management
│   ├── product.model.js                # Product CRUD & inventory
│   ├── cart.model.js                   # Shopping cart management
│   ├── cart-item.model.js              # Cart items
│   ├── order.model.js                  # Order records & tracking
│   └── order-item.model.js             # Order line items
├── routes/
│   ├── auth.routes.js
│   ├── users.routes.js
│   ├── admin.routes.js
│   ├── product.routes.js
│   ├── cart.routes.js
│   └── order.routes.js
├── services/
│   ├── auth.service.js                 # Auth business logic
│   ├── product.service.js              # Product service
│   ├── cart.service.js                 # Cart service
│   └── order.service.js                # Order service with transactions
└── utils/
    └── generate-id.js                  # ID generators (user, product, order, etc.)
```

## Configuration

### Environment Variables
All required variables are in `.env.example`:

| Variable | Description | Default |
|----------|-------------|---------|
| DB_HOST | MySQL host | localhost |
| DB_USER | MySQL user | root |
| DB_PASSWORD | MySQL password | Required |
| DB_NAME | Database name | mysql_assg |
| DB_PORT | MySQL port | 3306 |
| JWT_ACCESS_SECRET | Access token secret | Required (32+ chars) |
| JWT_REFRESH_SECRET | Refresh token secret | Required (32+ chars) |
| PORT | Server port | 5002 |
| ALLOWED_ORIGINS | CORS allowed origins | http://localhost:3000 |

## Database Schema

The server automatically creates required tables on startup:

### User Management
- `users` - User accounts and profiles
- `refresh_tokens` - Active refresh tokens for revocation

### E-Commerce
- `products` - Product catalog with inventory
- `carts` - Shopping cart per user
- `cart_items` - Items in shopping cart
- `orders` - Order records with status tracking
- `order_items` - Line items in orders

## Development

### Scripts
```bash
npm run dev    # Start with auto-reload (nodemon)
npm start      # Production start
npm test       # Run tests (not yet implemented)
```

### Database Initialization
The server automatically creates all required tables on startup. No manual migrations needed.

## Error Handling

All responses include a `success` boolean:

### Success (2xx)
```json
{
  "success": true,
  "data": { ... }
}
```

### Error (4xx/5xx)
```json
{
  "success": false,
  "message": "Error description"
}
```

Common HTTP Status Codes:
- `400` - Bad request (validation error)
- `401` - Unauthorized (missing/invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not found
- `409` - Conflict (duplicate email)
- `500` - Server error

## Security Best Practices

1. **Environment Secrets**
   - Never commit `.env` to version control
   - Use strong random values for JWT secrets
   - Rotate secrets periodically

2. **HTTPS**
   - Always use HTTPS in production
   - Consider adding `NODE_ENV=production` in production

3. **Token Storage** (Client-side)
   - Store access tokens in memory (not localStorage)
   - Store refresh tokens in httpOnly cookies
   - Implement token refresh logic client-side

4. **Monitoring**
   - Log authentication failures
   - Monitor for brute-force attempts
   - Track admin actions

## Known Limitations & Future Improvements

### Completed ✅
- [x] JWT authentication and authorization
- [x] Role-based access control (admin/customer)
- [x] User management system
- [x] Product catalog with inventory management
- [x] Shopping cart functionality
- [x] Order management and tracking
- [x] Rate limiting on sensitive endpoints
- [x] Transaction support for critical operations

### Planned Features
- [ ] Unit/integration tests
- [ ] Swagger/OpenAPI documentation
- [ ] Structured logging (winston)
- [ ] Email verification
- [ ] Password reset flow
- [ ] Two-factor authentication
- [ ] Audit logs for admin actions
- [ ] Database migrations
- [ ] Refresh token rotation
- [ ] Product reviews and ratings
- [ ] Wishlist functionality
- [ ] Coupon and discount system
- [ ] Payment gateway integration (Stripe/PayPal)
- [ ] Admin dashboard with analytics
- [ ] Advanced search and filtering
- [ ] Product recommendations
- [ ] Order history export

## License

ISC

## Support

For issues or questions, please check the error messages and documentation above.
