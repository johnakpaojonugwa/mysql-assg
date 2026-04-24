import pool from '../configs/db.js';
import { generateOrderItemId } from '../utils/generate-id.js';

class OrderItemModel {
    // Schema
    static async createTable() {
        const createOrderItemsTableQuery = `
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
            )
        `;
        await pool.query(createOrderItemsTableQuery);
    }

    // Validations
    static validateQuantity(quantity) {
        const quantityNumber = Number(quantity);

        if (!Number.isInteger(quantityNumber) || quantityNumber < 1) {
            throw new Error("Quantity must be a positive integer");
        }

        return quantityNumber;
    }

    static validatePrice(price) {
        const priceNumber = Number(price);

        if (isNaN(priceNumber) || priceNumber < 0) {
            throw new Error("Price must be a positive number");
        }

        return priceNumber;
    }

    // Create
    static async addItemToOrder(orderId, productId, quantity, price) {
        const orderItemId = generateOrderItemId();
        const validatedQuantity = this.validateQuantity(quantity);
        const validatedPrice = this.validatePrice(price);

        const insertOrderItemQuery = `
            INSERT INTO order_items (order_item_id, order_id, product_id, quantity, price)
            VALUES (?, ?, ?, ?, ?)
        `;

        await pool.query(insertOrderItemQuery, [
            orderItemId,
            orderId,
            productId,
            validatedQuantity,
            validatedPrice
        ]);

        return await this.getOrderItemByOrderItemId(orderItemId);
    }

    // Read
    static async getOrderItemByOrderItemId(orderItemId) {
        const selectQuery = `
            SELECT * FROM order_items
            WHERE order_item_id = ?
            LIMIT 1
        `;
        const [rows] = await pool.query(selectQuery, [orderItemId]);
        return rows[0] || null;
    }

    static async getOrderItems(orderId) {
        const selectQuery = `
            SELECT oi.*, p.name, p.sku
            FROM order_items oi
            JOIN products p ON oi.product_id = p.product_id
            WHERE oi.order_id = ?
            ORDER BY oi.created_at ASC
        `;
        const [rows] = await pool.query(selectQuery, [orderId]);
        return rows;
    }

    static async getOrderItemCount(orderId) {
        const countQuery = `
            SELECT COUNT(*) as count FROM order_items WHERE order_id = ?
        `;
        const [rows] = await pool.query(countQuery, [orderId]);
        return rows[0]?.count || 0;
    }

    // Bulk create order items (transaction safe - called from service)
    static async createOrderItemsFromCartItems(connection, orderId, cartItems) {
        const insertOrderItemQuery = `
            INSERT INTO order_items (order_item_id, order_id, product_id, quantity, price)
            VALUES (?, ?, ?, ?, ?)
        `;

        for (const cartItem of cartItems) {
            const orderItemId = generateOrderItemId();
            await connection.query(insertOrderItemQuery, [
                orderItemId,
                orderId,
                cartItem.product_id,
                cartItem.quantity,
                cartItem.price_at_add
            ]);
        }

        return await this.getOrderItems(orderId);
    }
}

export default OrderItemModel;
