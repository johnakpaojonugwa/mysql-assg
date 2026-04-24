import pool from '../configs/db.js';
import { generateOrderId } from '../utils/generate-id.js';

class OrderModel {
    // Schema
    static async createTable() {
        const createOrdersTableQuery = `
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
            )
        `;
        await pool.query(createOrdersTableQuery);
    }

    // Validations
    static validateOrderStatus(status) {
        const validStatuses = new Set(['pending', 'processing', 'shipped', 'delivered', 'cancelled']);
        const normalizedStatus = String(status ?? "").trim().toLowerCase();

        if (!validStatuses.has(normalizedStatus)) {
            throw new Error("Order status must be one of: pending, processing, shipped, delivered, cancelled");
        }

        return normalizedStatus;
    }

    static validateAddress(address) {
        if (address === undefined || address === null || address === "") {
            return null;
        }

        const addressTrimmed = String(address ?? "").trim();

        if (addressTrimmed.length < 10) {
            throw new Error("Address must be at least 10 characters");
        }

        if (addressTrimmed.length > 1000) {
            throw new Error("Address must be at most 1000 characters");
        }

        return addressTrimmed;
    }

    // Create
    static async createOrder(userId, totalAmount, { shippingAddress = null, billingAddress = null } = {}) {
        const orderId = generateOrderId();
        const validatedShippingAddress = this.validateAddress(shippingAddress);
        const validatedBillingAddress = this.validateAddress(billingAddress);

        const insertOrderQuery = `
            INSERT INTO orders (order_id, user_id, total_amount, status, shipping_address, billing_address)
            VALUES (?, ?, ?, 'pending', ?, ?)
        `;

        await pool.query(insertOrderQuery, [
            orderId,
            userId,
            totalAmount,
            validatedShippingAddress,
            validatedBillingAddress
        ]);

        return await this.getOrderByOrderId(orderId);
    }

    // Read
    static async getOrderByOrderId(orderId) {
        const selectOrderQuery = `
            SELECT * FROM orders
            WHERE order_id = ?
            LIMIT 1
        `;
        const [rows] = await pool.query(selectOrderQuery, [orderId]);
        return rows[0] || null;
    }

    static async getOrdersByUserId(userId, limit = 20, offset = 0) {
        const selectOrdersQuery = `
            SELECT * FROM orders
            WHERE user_id = ?
            ORDER BY created_at DESC
            LIMIT ? OFFSET ?
        `;
        const [rows] = await pool.query(selectOrdersQuery, [userId, limit, offset]);
        return rows;
    }

    static async getAllOrders(limit = 20, offset = 0, filters = {}) {
        let query = 'SELECT * FROM orders WHERE 1=1';
        const params = [];

        if (filters.status) {
            query += ' AND status = ?';
            params.push(filters.status);
        }

        if (filters.userId) {
            query += ' AND user_id = ?';
            params.push(filters.userId);
        }

        query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
        params.push(limit, offset);

        const [rows] = await pool.query(query, params);
        return rows;
    }

    static async getOrderCount(filters = {}) {
        let query = 'SELECT COUNT(*) as total FROM orders WHERE 1=1';
        const params = [];

        if (filters.status) {
            query += ' AND status = ?';
            params.push(filters.status);
        }

        if (filters.userId) {
            query += ' AND user_id = ?';
            params.push(filters.userId);
        }

        const [rows] = await pool.query(query, params);
        return rows[0]?.total || 0;
    }

    // Update
    static async updateOrderStatus(orderId, newStatus) {
        const validatedStatus = this.validateOrderStatus(newStatus);

        const updateOrderQuery = `
            UPDATE orders
            SET status = ?, updated_at = CURRENT_TIMESTAMP
            WHERE order_id = ?
        `;

        const [updateResult] = await pool.query(updateOrderQuery, [validatedStatus, orderId]);

        if (updateResult.affectedRows === 0) return null;

        return await this.getOrderByOrderId(orderId);
    }

    static async updateOrder(orderId, updates = {}) {
        const allowedFields = new Set(['status', 'shipping_address', 'billing_address']);

        const updateClauses = [];
        const updateValues = [];

        const existingOrder = await this.getOrderByOrderId(orderId);
        if (!existingOrder) return null;

        for (const [fieldName, fieldValue] of Object.entries(updates)) {
            if (!allowedFields.has(fieldName)) continue;

            if (fieldName === 'status') {
                const validatedStatus = this.validateOrderStatus(fieldValue);
                updateClauses.push('status = ?');
                updateValues.push(validatedStatus);
                continue;
            }

            if (fieldName === 'shipping_address') {
                const validatedAddress = this.validateAddress(fieldValue);
                updateClauses.push('shipping_address = ?');
                updateValues.push(validatedAddress);
                continue;
            }

            if (fieldName === 'billing_address') {
                const validatedAddress = this.validateAddress(fieldValue);
                updateClauses.push('billing_address = ?');
                updateValues.push(validatedAddress);
                continue;
            }
        }

        if (updateClauses.length === 0) {
            throw new Error('No valid fields to update');
        }

        const updateOrderQuery = `
            UPDATE orders
            SET ${updateClauses.join(', ')}, updated_at = CURRENT_TIMESTAMP
            WHERE order_id = ?
        `;
        updateValues.push(orderId);

        const [updateResult] = await pool.query(updateOrderQuery, updateValues);
        if (updateResult.affectedRows === 0) return null;

        return await this.getOrderByOrderId(orderId);
    }

    // Get order count for user
    static async getUserOrderCount(userId) {
        const countQuery = `
            SELECT COUNT(*) as count FROM orders WHERE user_id = ?
        `;
        const [rows] = await pool.query(countQuery, [userId]);
        return rows[0]?.count || 0;
    }
}

export default OrderModel;
