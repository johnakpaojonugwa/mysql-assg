import pool from '../configs/db.js';
import { generateCartId } from '../utils/generate-id.js';

class CartModel {
    // Schema
    static async createTable() {
        const createCartsTableQuery = `
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
            )
        `;
        await pool.query(createCartsTableQuery);
    }

    // Create
    static async createCart(userId) {
        const cartId = generateCartId();

        const insertCartQuery = `
            INSERT INTO carts (cart_id, user_id, total_price, items_count)
            VALUES (?, ?, 0, 0)
        `;

        await pool.query(insertCartQuery, [cartId, userId]);

        return await this.getCartByUserId(userId);
    }

    // Read
    static async getCartByUserId(userId) {
        const selectCartQuery = `
            SELECT * FROM carts
            WHERE user_id = ?
            LIMIT 1
        `;
        const [rows] = await pool.query(selectCartQuery, [userId]);
        return rows[0] || null;
    }

    static async getCartByCartId(cartId) {
        const selectCartQuery = `
            SELECT * FROM carts
            WHERE cart_id = ?
            LIMIT 1
        `;
        const [rows] = await pool.query(selectCartQuery, [cartId]);
        return rows[0] || null;
    }

    // Update
    static async updateCartTotals(userId) {
        // Get all items in cart and calculate totals
        const getTotalsQuery = `
            SELECT 
                SUM(quantity) as total_items,
                SUM(quantity * price_at_add) as total_price
            FROM cart_items
            WHERE cart_id = (SELECT cart_id FROM carts WHERE user_id = ?)
        `;
        const [totalsRows] = await pool.query(getTotalsQuery, [userId]);
        const totals = totalsRows[0] || { total_items: 0, total_price: 0 };

        const updateCartQuery = `
            UPDATE carts
            SET items_count = ?, total_price = ?, updated_at = CURRENT_TIMESTAMP
            WHERE user_id = ?
        `;

        await pool.query(updateCartQuery, [
            totals.total_items || 0,
            totals.total_price || 0,
            userId
        ]);

        return await this.getCartByUserId(userId);
    }

    // Clear cart
    static async clearCart(userId) {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            // Delete all cart items
            const deleteCartItemsQuery = `
                DELETE FROM cart_items
                WHERE cart_id = (SELECT cart_id FROM carts WHERE user_id = ?)
            `;
            await connection.query(deleteCartItemsQuery, [userId]);

            // Reset cart totals
            const updateCartQuery = `
                UPDATE carts
                SET items_count = 0, total_price = 0, updated_at = CURRENT_TIMESTAMP
                WHERE user_id = ?
            `;
            await connection.query(updateCartQuery, [userId]);

            await connection.commit();
            return await this.getCartByUserId(userId);
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    // Check if user has cart
    static async ensureUserHasCart(userId) {
        let cart = await this.getCartByUserId(userId);
        if (!cart) {
            cart = await this.createCart(userId);
        }
        return cart;
    }
}

export default CartModel;
