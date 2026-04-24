import express from 'express';
import CartController from '../controllers/cart.controller.js';
import authenticateMiddleware from '../middleware/authenticate.js';

const cartRoutes = express.Router();

// All cart routes require authentication
cartRoutes.use(authenticateMiddleware);

// Get cart
cartRoutes.get('/', CartController.getCart);

// Add item to cart
cartRoutes.post(
    '/items',
    CartController.addItemToCart
);

// Update cart item quantity
cartRoutes.patch(
    '/items/:cartItemId',
    CartController.updateCartItemQuantity
);

// Remove item from cart
cartRoutes.delete(
    '/items/:cartItemId',
    CartController.removeItemFromCart
);

// Clear entire cart
cartRoutes.delete(
    '/',
    CartController.clearCart
);

export default cartRoutes;
