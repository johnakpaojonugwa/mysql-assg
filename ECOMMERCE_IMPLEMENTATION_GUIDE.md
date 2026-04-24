# E-Commerce Feature Implementation Guide

## Overview
This guide provides a complete implementation strategy for adding e-commerce features (products, cart, orders) to your existing Node.js/Express backend with MySQL.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    API Routes Layer                      │
│  (auth, products, cart, orders)                         │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│                  Controllers Layer                       │
│  (Handle requests, call services)                       │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│                   Services Layer                         │
│  (Business logic, transactions)                         │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│                    Models Layer                          │
│  (Database queries, validations)                        │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│                   Database Layer                         │
│  (MySQL with connection pooling)                        │
└─────────────────────────────────────────────────────────┘
```

## Database Schema Design

### 1. Users Table (Existing - No Changes)
```sql
CREATE TABLE IF NOT EXISTS users (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL UNIQUE,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('customer','admin') NOT NULL DEFAULT 'customer',
    age TINYINT UNSIGNED NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX index_users_created_at (created_at),
    INDEX index_users_email (email),
    INDEX index_users_role (role)
);
```

### 2. Products Table (NEW)
```sql
CREATE TABLE IF NOT EXISTS products (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    product_id VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    stock_quantity INT UNSIGNED NOT NULL DEFAULT 0,
    category VARCHAR(100),
    sku VARCHAR(100) UNIQUE,
    image_url VARCHAR(500),
    is_active BOOLEAN DEFAULT TRUE,
    created_by VARCHAR(50) NOT NULL,  -- Admin user_id
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(user_id),
    INDEX index_products_category (category),
    INDEX index_products_is_active (is_active),
    INDEX index_products_created_at (created_at)
);
```

### 3. Cart Table (NEW)
```sql
CREATE TABLE IF NOT EXISTS carts (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    cart_id VARCHAR(50) NOT NULL UNIQUE,
    user_id VARCHAR(50) NOT NULL UNIQUE,
    total_price DECIMAL(10, 2) NOT NULL DEFAULT 0,
    items_count INT UNSIGNED NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX index_carts_user_id (user_id)
);
```

### 4. Cart Items Table (NEW)
```sql
CREATE TABLE IF NOT EXISTS cart_items (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    cart_item_id VARCHAR(50) NOT NULL UNIQUE,
    cart_id VARCHAR(50) NOT NULL,
    product_id VARCHAR(50) NOT NULL,
    quantity INT UNSIGNED NOT NULL DEFAULT 1,
    price_at_add DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (cart_id) REFERENCES carts(cart_id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(product_id),
    INDEX index_cart_items_cart_id (cart_id),
    INDEX index_cart_items_product_id (product_id)
);
```

### 5. Orders Table (NEW)
```sql
CREATE TABLE IF NOT EXISTS orders (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    order_id VARCHAR(50) NOT NULL UNIQUE,
    user_id VARCHAR(50) NOT NULL,
    total_amount DECIMAL(10, 2) NOT NULL,
    status ENUM('pending','processing','shipped','delivered','cancelled') NOT NULL DEFAULT 'pending',
    shipping_address TEXT,
    billing_address TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    INDEX index_orders_user_id (user_id),
    INDEX index_orders_status (status),
    INDEX index_orders_created_at (created_at)
);
```

### 6. Order Items Table (NEW)
```sql
CREATE TABLE IF NOT EXISTS order_items (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    order_item_id VARCHAR(50) NOT NULL UNIQUE,
    order_id VARCHAR(50) NOT NULL,
    product_id VARCHAR(50) NOT NULL,
    quantity INT UNSIGNED NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(order_id),
    FOREIGN KEY (product_id) REFERENCES products(product_id),
    INDEX index_order_items_order_id (order_id),
    INDEX index_order_items_product_id (product_id)
);
```

## Implementation Steps

### Step 1: Database Schema Migration
- Add all new tables to your database
- Verify foreign key relationships
- Test indexes for performance

### Step 2: Create Models
- `ProductModel` - CRUD for products, stock management
- `CartModel` - Cart operations
- `CartItemModel` - Cart items management
- `OrderModel` - Order operations
- `OrderItemModel` - Order items management

### Step 3: Create Services
- `ProductService` - Business logic for products
- `CartService` - Cart management (add, remove, update)
- `OrderService` - Order creation, status updates
- `OrderTrackingService` - Order history and tracking

### Step 4: Create Controllers
- `ProductController` - Handle product requests
- `CartController` - Handle cart requests
- `OrderController` - Handle order requests

### Step 5: Create Routes
- `/api/products` - Product endpoints
- `/api/cart` - Cart endpoints
- `/api/orders` - Order endpoints

### Step 6: Middleware & Security
- Ensure authentication on all customer routes
- Admin-only endpoints for product management
- Validate input and authorization

## Key Implementation Details

### Foreign Keys & Relationships
- Products linked to admin user (creator)
- Cart linked to customer user (one-to-one)
- Cart items linked to cart and product
- Orders linked to customer user
- Order items linked to order and product

### Stock Management
- Decrease stock when order is placed
- Validate stock availability before order
- Optionally: increase stock if order cancelled

### Order Tracking
- Track order status changes
- Provide order history endpoint
- Include order items with pricing

### Transaction Safety
- Use database transactions for order placement
- Atomic operations for stock updates
- Rollback on any failure

## API Endpoints Summary

### Products (Admin & Customer)
- `GET /api/products` - List products (public)
- `GET /api/products/:productId` - Get product details
- `POST /api/products` - Create product (admin only)
- `PATCH /api/products/:productId` - Update product (admin only)
- `DELETE /api/products/:productId` - Delete product (admin only)

### Cart (Customer only)
- `GET /api/cart` - Get my cart
- `POST /api/cart/items` - Add item to cart
- `PATCH /api/cart/items/:cartItemId` - Update cart item quantity
- `DELETE /api/cart/items/:cartItemId` - Remove item from cart
- `DELETE /api/cart` - Clear cart

### Orders (Customer & Admin)
- `POST /api/orders` - Create order (customer)
- `GET /api/orders` - Get my orders (customer) / all orders (admin)
- `GET /api/orders/:orderId` - Get order details
- `PATCH /api/orders/:orderId/status` - Update order status (admin only)

## Best Practices to Follow

1. **Validation** - Validate all inputs (product details, quantities, etc.)
2. **Authorization** - Check user role and ownership before operations
3. **Error Handling** - Provide clear error messages
4. **Transactions** - Use database transactions for complex operations
5. **Indexing** - Ensure proper database indexes for performance
6. **Pagination** - Paginate product and order lists
7. **Soft Deletes** - Consider soft deletes instead of hard deletes
8. **Audit Logging** - Log important operations (admin actions)
9. **Concurrency** - Handle race conditions (stock updates)
10. **Response Consistency** - Follow same response format as existing code

## Implementation Flow

```
User Registration/Login (existing)
    ↓
View Products (GET /products)
    ↓
Add to Cart (POST /cart/items)
    ↓
Update Cart (PATCH /cart/items, DELETE /cart/items)
    ↓
Place Order (POST /orders) 
    ├─ Validate stock
    ├─ Deduct stock
    ├─ Create order
    ├─ Create order items
    └─ Clear cart
    ↓
Track Order (GET /orders/:orderId)
    ↓
Admin Updates Status (PATCH /orders/:orderId/status)
```

## Security Considerations

1. **Authentication** - All endpoints except /api/products (list) require auth
2. **Authorization** - Cart/Orders only accessible by owner or admin
3. **Stock Validation** - Prevent overselling with proper validation
4. **Price Verification** - Verify prices server-side (not from client)
5. **Admin Routes** - Product management only for admin users

## Next Steps

1. Create database migrations/schema
2. Implement models following existing patterns
3. Implement services with business logic
4. Implement controllers
5. Create routes
6. Test all endpoints
7. Add pagination and filtering
8. Add audit logging
9. Optimize database queries
10. Add API documentation (Swagger)
