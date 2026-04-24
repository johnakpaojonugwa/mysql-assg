import ProductModel from '../models/product.model.js';

class ProductService {
    static async createProduct({ name, price, stockQuantity, createdBy, description, category, sku, imageUrl }) {
        return await ProductModel.createProduct(name, price, stockQuantity, createdBy, {
            description,
            category,
            sku,
            imageUrl
        });
    }

    static async getProduct(productId) {
        const product = await ProductModel.getProductByProductId(productId);
        if (!product) {
            throw new Error('Product not found');
        }
        return product;
    }

    static async getAllProducts(limit = 20, page = 1, filters = {}) {
        const offset = (page - 1) * limit;
        
        const products = await ProductModel.getAllProducts(limit, offset, filters);
        const total = await ProductModel.getProductCount(filters);

        return {
            data: products,
            pagination: {
                total,
                limit,
                page,
                pages: Math.ceil(total / limit)
            }
        };
    }

    static async updateProduct(productId, updates) {
        const product = await ProductModel.getProductByProductIdIncludingInactive(productId);
        if (!product) {
            throw new Error('Product not found');
        }

        return await ProductModel.updateProduct(productId, updates);
    }

    static async deleteProduct(productId) {
        const product = await ProductModel.getProductByProductIdIncludingInactive(productId);
        if (!product) {
            throw new Error('Product not found');
        }

        return await ProductModel.softDeleteProduct(productId);
    }

    static async verifyStockAvailable(productId, requiredQuantity) {
        const hasStock = await ProductModel.hasStockAvailable(productId, requiredQuantity);
        if (!hasStock) {
            throw new Error(`Insufficient stock for product ${productId}`);
        }
        return true;
    }

    static async decreaseStock(productId, quantity) {
        return await ProductModel.decreaseStock(productId, quantity);
    }

    static async increaseStock(productId, quantity) {
        return await ProductModel.increaseStock(productId, quantity);
    }
}

export default ProductService;
