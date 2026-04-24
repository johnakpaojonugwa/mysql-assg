import express from 'express';
import ProductController from '../controllers/product.controller.js';
import authenticateMiddleware from '../middleware/authenticate.js';
import authorizeMiddleware from '../middleware/authorize.js';

const productRoutes = express.Router();

// Public routes
productRoutes.get('/', ProductController.getAllProducts);
productRoutes.get('/:productId', ProductController.getProduct);

// Admin only routes
productRoutes.post(
    '/',
    authenticateMiddleware,
    authorizeMiddleware(['admin']),
    ProductController.createProduct
);

productRoutes.patch(
    '/:productId',
    authenticateMiddleware,
    authorizeMiddleware(['admin']),
    ProductController.updateProduct
);

productRoutes.delete(
    '/:productId',
    authenticateMiddleware,
    authorizeMiddleware(['admin']),
    ProductController.deleteProduct
);

export default productRoutes;
