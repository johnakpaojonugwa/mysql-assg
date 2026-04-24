import crypto from 'crypto';
import pool from '../configs/db.js';
import OrderModel from '../models/order.model.js';
import OrderItemModel from '../models/order-item.model.js';
import CartModel from '../models/cart.model.js';
import CartItemModel from '../models/cart-item.model.js';
import ProductModel from '../models/product.model.js';

class OrderService {
    /**
     * Create an order from cart items
     * Uses database transaction for atomicity
     */
    static async createOrderFromCart(userId, { shippingAddress, billingAddress }) {
        const connection = await pool.getConnection();

        try {
            await connection.beginTransaction();

            // Get user's cart
            const cart = await CartModel.getCartByUserId(userId);
            if (!cart) {
                throw new Error('Cart not found');
            }

            // Get cart items
            const cartItems = await CartItemModel.getCartItems(cart.cart_id);
            if (cartItems.length === 0) {
                throw new Error('Cannot create order from empty cart');
            }

            // Verify stock for all items and calculate total
            let totalAmount = 0;
            for (const cartItem of cartItems) {
                // Get fresh product data
                const productQuery = 'SELECT * FROM products WHERE product_id = ? FOR UPDATE';
                const [productRows] = await connection.query(productQuery, [cartItem.product_id]);
                const product = productRows[0];

                if (!product) {
                    throw new Error(`Product ${cartItem.product_id} not found`);
                }

                if (product.stock_quantity < cartItem.quantity) {
                    throw new Error(
                        `Insufficient stock for ${product.name}. ` +
                        `Available: ${product.stock_quantity}, Requested: ${cartItem.quantity}`
                    );
                }

                totalAmount += cartItem.quantity * cartItem.price_at_add;
            }

            // Create order
            const createOrderQuery = `
                INSERT INTO orders (order_id, user_id, total_amount, status, shipping_address, billing_address)
                SELECT ?, ?, ?, 'pending', ?, ?
            `;
            const orderId = `ORD_${crypto.randomBytes(8).toString('hex')}`;
            await connection.query(createOrderQuery, [
                orderId,
                userId,
                totalAmount,
                shippingAddress || null,
                billingAddress || null
            ]);

            // Add items to order and decrease stock
            for (const cartItem of cartItems) {
                // Add to order items
                const orderItemId = `OITEM_${crypto.randomBytes(8).toString('hex')}`;
                const insertOrderItemQuery = `
                    INSERT INTO order_items (order_item_id, order_id, product_id, quantity, price)
                    VALUES (?, ?, ?, ?, ?)
                `;
                await connection.query(insertOrderItemQuery, [
                    orderItemId,
                    orderId,
                    cartItem.product_id,
                    cartItem.quantity,
                    cartItem.price_at_add
                ]);

                // Decrease stock
                const updateStockQuery = `
                    UPDATE products
                    SET stock_quantity = stock_quantity - ?
                    WHERE product_id = ?
                `;
                await connection.query(updateStockQuery, [cartItem.quantity, cartItem.product_id]);
            }

            // Clear cart
            const deleteCartItemsQuery = `
                DELETE FROM cart_items WHERE cart_id = ?
            `;
            await connection.query(deleteCartItemsQuery, [cart.cart_id]);

            const updateCartQuery = `
                UPDATE carts SET items_count = 0, total_price = 0, updated_at = CURRENT_TIMESTAMP WHERE cart_id = ?
            `;
            await connection.query(updateCartQuery, [cart.cart_id]);

            await connection.commit();

            // Fetch and return complete order
            return await OrderModel.getOrderByOrderId(orderId);
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    static async getOrder(orderId, userId = null) {
        const order = await OrderModel.getOrderByOrderId(orderId);
        if (!order) {
            throw new Error('Order not found');
        }

        // If userId provided, verify ownership (for customers)
        if (userId && order.user_id !== userId) {
            throw new Error('Unauthorized access to order');
        }

        const items = await OrderItemModel.getOrderItems(orderId);

        return {
            order,
            items
        };
    }

    static async getUserOrders(userId, limit = 20, page = 1) {
        const offset = (page - 1) * limit;

        const orders = await OrderModel.getOrdersByUserId(userId, limit, offset);
        const total = await OrderModel.getUserOrderCount(userId);

        // Get items for each order
        const ordersWithItems = await Promise.all(
            orders.map(async (order) => ({
                order,
                items: await OrderItemModel.getOrderItems(order.order_id)
            }))
        );

        return {
            data: ordersWithItems,
            pagination: {
                total,
                limit,
                page,
                pages: Math.ceil(total / limit)
            }
        };
    }

    static async getAllOrders(limit = 20, page = 1, filters = {}) {
        const offset = (page - 1) * limit;

        const orders = await OrderModel.getAllOrders(limit, offset, filters);
        const total = await OrderModel.getOrderCount(filters);

        // Get items for each order
        const ordersWithItems = await Promise.all(
            orders.map(async (order) => ({
                order,
                items: await OrderItemModel.getOrderItems(order.order_id)
            }))
        );

        return {
            data: ordersWithItems,
            pagination: {
                total,
                limit,
                page,
                pages: Math.ceil(total / limit)
            }
        };
    }

    static async updateOrderStatus(orderId, newStatus) {
        const order = await OrderModel.getOrderByOrderId(orderId);
        if (!order) {
            throw new Error('Order not found');
        }

        return await OrderModel.updateOrderStatus(orderId, newStatus);
    }

    static async cancelOrder(orderId) {
        const order = await OrderModel.getOrderByOrderId(orderId);
        if (!order) {
            throw new Error('Order not found');
        }

        if (order.status === 'cancelled') {
            throw new Error('Order is already cancelled');
        }

        if (order.status === 'delivered') {
            throw new Error('Cannot cancel delivered order');
        }

        // Get order items
        const items = await OrderItemModel.getOrderItems(orderId);

        // Restore stock for each item
        for (const item of items) {
            await ProductModel.increaseStock(item.product_id, item.quantity);
        }

        // Update order status
        return await OrderModel.updateOrderStatus(orderId, 'cancelled');
    }

    static async trackOrder(orderId, userId = null) {
        const order = await OrderModel.getOrderByOrderId(orderId);
        if (!order) {
            throw new Error('Order not found');
        }

        // If userId provided, verify ownership
        if (userId && order.user_id !== userId) {
            throw new Error('Unauthorized access to order');
        }

        const items = await OrderItemModel.getOrderItems(orderId);

        return {
            order_id: order.order_id,
            status: order.status,
            created_at: order.created_at,
            updated_at: order.updated_at,
            total_amount: order.total_amount,
            items_count: items.length,
            items
        };
    }
}

export default OrderService;
