import ProductService from '../services/product.service.js';

class ProductController {
    static async createProduct(request, response) {
        try {
            const adminUserId = request.authenticatedUser.userId;
            const {
                name,
                price,
                stock_quantity: stockQuantity,
                description,
                category,
                sku,
                image_url: imageUrl
            } = request.body;

            if (!name || price === undefined || stockQuantity === undefined) {
                return response.status(400).json({
                    success: false,
                    message: 'name, price, and stock_quantity are required'
                });
            }

            const product = await ProductService.createProduct({
                name,
                price,
                stockQuantity,
                createdBy: adminUserId,
                description,
                category,
                sku,
                imageUrl
            });

            return response.status(201).json({
                success: true,
                data: product
            });
        } catch (error) {
            if (error?.code === 'ER_DUP_ENTRY') {
                return response.status(409).json({
                    success: false,
                    message: 'SKU already exists'
                });
            }

            if (error instanceof Error) {
                return response.status(400).json({
                    success: false,
                    message: error.message
                });
            }

            console.error('Error creating product:', error);
            return response.status(500).json({
                success: false,
                message: 'Failed to create product'
            });
        }
    }

    static async getProduct(request, response) {
        try {
            const { productId } = request.params;

            const product = await ProductService.getProduct(productId);

            return response.status(200).json({
                success: true,
                data: product
            });
        } catch (error) {
            if (error instanceof Error && error.message === 'Product not found') {
                return response.status(404).json({
                    success: false,
                    message: 'Product not found'
                });
            }

            console.error('Error fetching product:', error);
            return response.status(500).json({
                success: false,
                message: 'Failed to fetch product'
            });
        }
    }

    static async getAllProducts(request, response) {
        try {
            const limit = Math.min(Number(request.query.limit) || 20, 100);
            const page = Number(request.query.page) || 1;
            const category = request.query.category;
            const search = request.query.search;

            const filters = {};
            if (category) filters.category = category;
            if (search) filters.search = search;

            const result = await ProductService.getAllProducts(limit, page, filters);

            return response.status(200).json({
                success: true,
                ...result
            });
        } catch (error) {
            console.error('Error fetching products:', error);
            return response.status(500).json({
                success: false,
                message: 'Failed to fetch products'
            });
        }
    }

    static async updateProduct(request, response) {
        try {
            const { productId } = request.params;
            const updates = request.body;

            const product = await ProductService.updateProduct(productId, updates);

            return response.status(200).json({
                success: true,
                data: product
            });
        } catch (error) {
            if (error instanceof Error) {
                if (error.message === 'Product not found') {
                    return response.status(404).json({
                        success: false,
                        message: 'Product not found'
                    });
                }

                return response.status(400).json({
                    success: false,
                    message: error.message
                });
            }

            console.error('Error updating product:', error);
            return response.status(500).json({
                success: false,
                message: 'Failed to update product'
            });
        }
    }

    static async deleteProduct(request, response) {
        try {
            const { productId } = request.params;

            await ProductService.deleteProduct(productId);

            return response.status(200).json({
                success: true,
                message: 'Product deleted successfully'
            });
        } catch (error) {
            if (error instanceof Error) {
                if (error.message === 'Product not found') {
                    return response.status(404).json({
                        success: false,
                        message: 'Product not found'
                    });
                }
                return response.status(400).json({
                    success: false,
                    message: error.message
                });
            }

            console.error('Error deleting product:', error);
            return response.status(500).json({
                success: false,
                message: 'Failed to delete product'
            });
        }
    }
}

export default ProductController;
