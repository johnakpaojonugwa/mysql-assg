import CartModel from '../models/cart.model.js';
import CartItemModel from '../models/cart-item.model.js';
import ProductModel from '../models/product.model.js';

class CartService {
    static async getCart(userId) {
        const cart = await CartModel.ensureUserHasCart(userId);
        const items = await CartItemModel.getCartItems(cart.cart_id);

        return {
            cart,
            items
        };
    }

    static async addItemToCart(userId, productId, quantity) {
        // Verify product exists and is active
        const product = await ProductModel.getProductByProductId(productId);
        if (!product) {
            throw new Error('Product not found');
        }

        // Verify stock
        if (!await ProductModel.hasStockAvailable(productId, quantity)) {
            throw new Error(`Insufficient stock. Available: ${product.stock_quantity}, Requested: ${quantity}`);
        }

        // Get or create cart
        const cart = await CartModel.ensureUserHasCart(userId);

        // Add item to cart
        const cartItem = await CartItemModel.addItemToCart(cart.cart_id, productId, quantity, product.price);

        // Update cart totals
        await CartModel.updateCartTotals(userId);

        return cartItem;
    }

    static async updateCartItemQuantity(userId, cartItemId, newQuantity) {
        // Verify cart item exists
        const cartItem = await CartItemModel.getCartItemByCartItemId(cartItemId);
        if (!cartItem) {
            throw new Error('Cart item not found');
        }

        // Verify user owns this cart
        const cart = await CartModel.getCartByCartId(cartItem.cart_id);
        if (cart.user_id !== userId) {
            throw new Error('Unauthorized access to cart');
        }

        // Verify product has enough stock
        const product = await ProductModel.getProductByProductId(cartItem.product_id);
        if (!product) {
            throw new Error('Product not found');
        }

        // Allow updating to same quantity or less (no stock check needed for decrease)
        // For increases, check stock
        if (newQuantity > cartItem.quantity) {
            const additionalQuantity = newQuantity - cartItem.quantity;
            if (!await ProductModel.hasStockAvailable(cartItem.product_id, additionalQuantity)) {
                throw new Error(`Insufficient stock. Available: ${product.stock_quantity}, Additional needed: ${additionalQuantity}`);
            }
        }

        // Update quantity
        const updated = await CartItemModel.updateCartItemQuantity(cartItemId, newQuantity);

        // Update cart totals
        await CartModel.updateCartTotals(userId);

        return updated;
    }

    static async removeItemFromCart(userId, cartItemId) {
        // Verify cart item exists
        const cartItem = await CartItemModel.getCartItemByCartItemId(cartItemId);
        if (!cartItem) {
            throw new Error('Cart item not found');
        }

        // Verify user owns this cart
        const cart = await CartModel.getCartByCartId(cartItem.cart_id);
        if (cart.user_id !== userId) {
            throw new Error('Unauthorized access to cart');
        }

        // Remove item
        await CartItemModel.removeCartItem(cartItemId);

        // Update cart totals
        await CartModel.updateCartTotals(userId);

        return { removed: true };
    }

    static async clearCart(userId) {
        return await CartModel.clearCart(userId);
    }
}

export default CartService;
