import OrderService from '../services/order.service.js';

class OrderController {
    static async createOrder(request, response) {
        try {
            const userId = request.authenticatedUser.userId;
            const { shipping_address: shippingAddress, billing_address: billingAddress } = request.body;

            const result = await OrderService.createOrderFromCart(userId, {
                shippingAddress,
                billingAddress
            });

            return response.status(201).json({
                success: true,
                data: result
            });
        } catch (error) {
            if (error instanceof Error) {
                return response.status(400).json({
                    success: false,
                    message: error.message
                });
            }

            console.error('Error creating order:', error);
            return response.status(500).json({
                success: false,
                message: 'Failed to create order'
            });
        }
    }

    static async getOrder(request, response) {
        try {
            const { orderId } = request.params;
            const userId = request.authenticatedUser.userId;
            const userRole = request.authenticatedUser.role;

            // If customer, verify they own the order
            const result = await OrderService.getOrder(
                orderId,
                userRole === 'customer' ? userId : null
            );

            return response.status(200).json({
                success: true,
                data: result
            });
        } catch (error) {
            if (error instanceof Error) {
                if (error.message.includes('Unauthorized')) {
                    return response.status(403).json({
                        success: false,
                        message: error.message
                    });
                }
                if (error.message === 'Order not found') {
                    return response.status(404).json({
                        success: false,
                        message: 'Order not found'
                    });
                }
                return response.status(400).json({
                    success: false,
                    message: error.message
                });
            }

            console.error('Error fetching order:', error);
            return response.status(500).json({
                success: false,
                message: 'Failed to fetch order'
            });
        }
    }

    static async getOrders(request, response) {
        try {
            const userId = request.authenticatedUser.userId;
            const userRole = request.authenticatedUser.role;
            const limit = Math.min(Number(request.query.limit) || 20, 100);
            const page = Number(request.query.page) || 1;

            let result;
            if (userRole === 'customer') {
                // Customers can only see their own orders
                result = await OrderService.getUserOrders(userId, limit, page);
            } else if (userRole === 'admin') {
                // Admins can see all orders with optional filtering
                const filters = {};
                if (request.query.status) {
                    filters.status = request.query.status;
                }
                if (request.query.user_id) {
                    filters.user_id = request.query.user_id;
                }
                result = await OrderService.getAllOrders(limit, page, filters);
            }

            return response.status(200).json({
                success: true,
                ...result
            });
        } catch (error) {
            console.error('Error fetching orders:', error);
            return response.status(500).json({
                success: false,
                message: 'Failed to fetch orders'
            });
        }
    }

    static async updateOrderStatus(request, response) {
        try {
            const { orderId } = request.params;
            const { status } = request.body;

            if (!status) {
                return response.status(400).json({
                    success: false,
                    message: 'status is required'
                });
            }

            const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
            if (!validStatuses.includes(status)) {
                return response.status(400).json({
                    success: false,
                    message: `status must be one of: ${validStatuses.join(', ')}`
                });
            }

            const result = await OrderService.updateOrderStatus(orderId, status);

            return response.status(200).json({
                success: true,
                data: result
            });
        } catch (error) {
            if (error instanceof Error) {
                if (error.message === 'Order not found') {
                    return response.status(404).json({
                        success: false,
                        message: 'Order not found'
                    });
                }
                return response.status(400).json({
                    success: false,
                    message: error.message
                });
            }

            console.error('Error updating order status:', error);
            return response.status(500).json({
                success: false,
                message: 'Failed to update order status'
            });
        }
    }

    static async cancelOrder(request, response) {
        try {
            const { orderId } = request.params;
            const userId = request.authenticatedUser.userId;
            const userRole = request.authenticatedUser.role;

            // Get order to check ownership
            const order = await OrderService.getOrder(orderId);
            if (order.order.user_id !== userId && userRole === 'customer') {
                return response.status(403).json({
                    success: false,
                    message: 'Unauthorized to cancel this order'
                });
            }

            const result = await OrderService.cancelOrder(orderId);

            return response.status(200).json({
                success: true,
                data: result
            });
        } catch (error) {
            if (error instanceof Error) {
                if (error.message === 'Order not found') {
                    return response.status(404).json({
                        success: false,
                        message: 'Order not found'
                    });
                }
                return response.status(400).json({
                    success: false,
                    message: error.message
                });
            }

            console.error('Error cancelling order:', error);
            return response.status(500).json({
                success: false,
                message: 'Failed to cancel order'
            });
        }
    }

    static async trackOrder(request, response) {
        try {
            const { orderId } = request.params;
            const userId = request.authenticatedUser.userId;
            const userRole = request.authenticatedUser.role;

            const result = await OrderService.trackOrder(
                orderId,
                userRole === 'customer' ? userId : null
            );

            return response.status(200).json({
                success: true,
                data: result
            });
        } catch (error) {
            if (error instanceof Error) {
                if (error.message.includes('Unauthorized')) {
                    return response.status(403).json({
                        success: false,
                        message: error.message
                    });
                }
                if (error.message === 'Order not found') {
                    return response.status(404).json({
                        success: false,
                        message: 'Order not found'
                    });
                }
                return response.status(400).json({
                    success: false,
                    message: error.message
                });
            }

            console.error('Error tracking order:', error);
            return response.status(500).json({
                success: false,
                message: 'Failed to track order'
            });
        }
    }
}

export default OrderController;
