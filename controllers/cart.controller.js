import CartService from '../services/cart.service.js';

class CartController {
    static async getCart(request, response) {
        try {
            const userId = request.authenticatedUser.userId;

            const result = await CartService.getCart(userId);

            return response.status(200).json({
                success: true,
                data: result
            });
        } catch (error) {
            console.error('Error fetching cart:', error);
            return response.status(500).json({
                success: false,
                message: 'Failed to fetch cart'
            });
        }
    }

    static async addItemToCart(request, response) {
        try {
            const userId = request.authenticatedUser.userId;
            const { product_id: productId, quantity } = request.body;

            if (!productId || !quantity) {
                return response.status(400).json({
                    success: false,
                    message: 'product_id and quantity are required'
                });
            }

            if (quantity < 1 || quantity > 999) {
                return response.status(400).json({
                    success: false,
                    message: 'quantity must be between 1 and 999'
                });
            }

            const cartItem = await CartService.addItemToCart(userId, productId, quantity);

            return response.status(201).json({
                success: true,
                data: cartItem
            });
        } catch (error) {
            if (error instanceof Error) {
                return response.status(400).json({
                    success: false,
                    message: error.message
                });
            }

            console.error('Error adding item to cart:', error);
            return response.status(500).json({
                success: false,
                message: 'Failed to add item to cart'
            });
        }
    }

    static async updateCartItemQuantity(request, response) {
        try {
            const userId = request.authenticatedUser.userId;
            const { cartItemId } = request.params;
            const { quantity } = request.body;

            if (!quantity) {
                return response.status(400).json({
                    success: false,
                    message: 'quantity is required'
                });
            }

            if (quantity < 1 || quantity > 999) {
                return response.status(400).json({
                    success: false,
                    message: 'quantity must be between 1 and 999'
                });
            }

            const updated = await CartService.updateCartItemQuantity(userId, cartItemId, quantity);

            return response.status(200).json({
                success: true,
                data: updated
            });
        } catch (error) {
            if (error instanceof Error) {
                if (error.message.includes('Unauthorized')) {
                    return response.status(403).json({
                        success: false,
                        message: error.message
                    });
                }
                return response.status(400).json({
                    success: false,
                    message: error.message
                });
            }

            console.error('Error updating cart item:', error);
            return response.status(500).json({
                success: false,
                message: 'Failed to update cart item'
            });
        }
    }

    static async removeItemFromCart(request, response) {
        try {
            const userId = request.authenticatedUser.userId;
            const { cartItemId } = request.params;

            await CartService.removeItemFromCart(userId, cartItemId);

            return response.status(200).json({
                success: true,
                message: 'Item removed from cart'
            });
        } catch (error) {
            if (error instanceof Error) {
                if (error.message.includes('Unauthorized')) {
                    return response.status(403).json({
                        success: false,
                        message: error.message
                    });
                }
                return response.status(400).json({
                    success: false,
                    message: error.message
                });
            }

            console.error('Error removing item from cart:', error);
            return response.status(500).json({
                success: false,
                message: 'Failed to remove item from cart'
            });
        }
    }

    static async clearCart(request, response) {
        try {
            const userId = request.authenticatedUser.userId;

            await CartService.clearCart(userId);

            return response.status(200).json({
                success: true,
                message: 'Cart cleared successfully'
            });
        } catch (error) {
            console.error('Error clearing cart:', error);
            return response.status(500).json({
                success: false,
                message: 'Failed to clear cart'
            });
        }
    }
}

export default CartController;
