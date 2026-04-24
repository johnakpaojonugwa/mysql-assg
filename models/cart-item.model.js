import pool from '../configs/db.js';
import { generateCartItemId } from '../utils/generate-id.js';

class CartItemModel {
    // Schema
    static async createTable() {
        const createCartItemsTableQuery = `
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
            )
        `;
        await pool.query(createCartItemsTableQuery);
    }

    // Validations
    static validateQuantity(quantity) {
        const quantityNumber = Number(quantity);

        if (!Number.isInteger(quantityNumber) || quantityNumber < 1) {
            throw new Error("Quantity must be a positive integer");
        }

        if (quantityNumber > 999) {
            throw new Error("Quantity cannot exceed 999");
        }

        return quantityNumber;
    }

    // Create/Add
    static async addItemToCart(cartId, productId, quantity, priceAtAdd) {
        const validatedQuantity = this.validateQuantity(quantity);

        // Check if item already in cart
        const existingItem = await this.getCartItemByCartAndProduct(cartId, productId);

        if (existingItem) {
            // Update quantity instead
            return await this.updateCartItemQuantity(existingItem.cart_item_id, validatedQuantity + existingItem.quantity);
        }

        const cartItemId = generateCartItemId();

        const insertCartItemQuery = `
            INSERT INTO cart_items (cart_item_id, cart_id, product_id, quantity, price_at_add)
            VALUES (?, ?, ?, ?, ?)
        `;

        await pool.query(insertCartItemQuery, [
            cartItemId,
            cartId,
            productId,
            validatedQuantity,
            priceAtAdd
        ]);

        return await this.getCartItemByCartItemId(cartItemId);
    }

    // Read
    static async getCartItemByCartItemId(cartItemId) {
        const selectQuery = `
            SELECT * FROM cart_items
            WHERE cart_item_id = ?
            LIMIT 1
        `;
        const [rows] = await pool.query(selectQuery, [cartItemId]);
        return rows[0] || null;
    }

    static async getCartItemByCartAndProduct(cartId, productId) {
        const selectQuery = `
            SELECT * FROM cart_items
            WHERE cart_id = ? AND product_id = ?
            LIMIT 1
        `;
        const [rows] = await pool.query(selectQuery, [cartId, productId]);
        return rows[0] || null;
    }

    static async getCartItems(cartId) {
        const selectQuery = `
            SELECT ci.*, p.name, p.price as current_price, p.stock_quantity
            FROM cart_items ci
            JOIN products p ON ci.product_id = p.product_id
            WHERE ci.cart_id = ?
            ORDER BY ci.created_at DESC
        `;
        const [rows] = await pool.query(selectQuery, [cartId]);
        return rows;
    }

    // Update
    static async updateCartItemQuantity(cartItemId, newQuantity) {
        const validatedQuantity = this.validateQuantity(newQuantity);

        const updateQuery = `
            UPDATE cart_items
            SET quantity = ?, updated_at = CURRENT_TIMESTAMP
            WHERE cart_item_id = ?
        `;

        const [updateResult] = await pool.query(updateQuery, [validatedQuantity, cartItemId]);
        
        if (updateResult.affectedRows === 0) return null;

        return await this.getCartItemByCartItemId(cartItemId);
    }

    // Delete
    static async removeCartItem(cartItemId) {
        const deleteQuery = `
            DELETE FROM cart_items
            WHERE cart_item_id = ?
        `;

        const [deleteResult] = await pool.query(deleteQuery, [cartItemId]);

        return { deleted: deleteResult.affectedRows > 0 };
    }

    // Delete all items from cart
    static async removeAllFromCart(cartId) {
        const deleteQuery = `
            DELETE FROM cart_items
            WHERE cart_id = ?
        `;

        const [deleteResult] = await pool.query(deleteQuery, [cartId]);

        return { deleted: deleteResult.affectedRows > 0 };
    }

    // Get cart item count
    static async getCartItemCount(cartId) {
        const countQuery = `
            SELECT COUNT(*) as count FROM cart_items WHERE cart_id = ?
        `;
        const [rows] = await pool.query(countQuery, [cartId]);
        return rows[0]?.count || 0;
    }
}

export default CartItemModel;
