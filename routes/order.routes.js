import express from 'express';
import OrderController from '../controllers/order.controller.js';
import authenticateMiddleware from '../middleware/authenticate.js';
import authorizeMiddleware from '../middleware/authorize.js';
import rateLimit from 'express-rate-limit';

const orderRoutes = express.Router();

// Rate limiter for order creation (prevent abuse)
const orderCreationLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // Allow 10 orders per 15 minutes per user
    message: 'Too many orders created. Please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => req.authenticatedUser?.userId || req.ip
});

// All order routes require authentication
orderRoutes.use(authenticateMiddleware);

// Create order from cart
orderRoutes.post(
    '/',
    orderCreationLimiter,
    OrderController.createOrder
);

// Get orders (customers see their own, admins see all)
orderRoutes.get('/', OrderController.getOrders);

// Get specific order
orderRoutes.get('/:orderId', OrderController.getOrder);

// Track order (customers see their own, admins see any)
orderRoutes.get('/:orderId/track', OrderController.trackOrder);

// Update order status (admin only)
orderRoutes.patch(
    '/:orderId/status',
    authorizeMiddleware(['admin']),
    OrderController.updateOrderStatus
);

// Cancel order (customer can cancel own, admin can cancel any)
orderRoutes.post(
    '/:orderId/cancel',
    OrderController.cancelOrder
);

export default orderRoutes;
