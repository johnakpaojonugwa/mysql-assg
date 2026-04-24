import pool from '../configs/db.js';
import { generateProductId } from '../utils/generate-id.js';

class ProductModel {
    static bcryptjsSaltRounds = 12;

    // Schema
    static async createTable() {
        const createProductsTableQuery = `
            CREATE TABLE IF NOT EXISTS products (
                id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                product_id VARCHAR(50) NOT NULL UNIQUE,
                name VARCHAR(255) NOT NULL,
                description TEXT,
                price DECIMAL(10, 2) NOT NULL,
                stock_quantity INT UNSIGNED NOT NULL DEFAULT 0,
                category VARCHAR(100),
                sku VARCHAR(100) UNIQUE,
                image_url VARCHAR(500),
                is_active BOOLEAN DEFAULT TRUE,
                created_by VARCHAR(50) NOT NULL,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (created_by) REFERENCES users(user_id),
                INDEX index_products_category (category),
                INDEX index_products_is_active (is_active),
                INDEX index_products_created_at (created_at),
                INDEX index_products_name (name)
            )
        `;
        await pool.query(createProductsTableQuery);
    }

    // Validations
    static validateProductName(name) {
        const nameTrimmed = String(name ?? "").trim();

        if (nameTrimmed.length < 3) {
            throw new Error("Product name must be at least 3 characters");
        }

        if (nameTrimmed.length > 255) {
            throw new Error("Product name must be at most 255 characters");
        }

        return nameTrimmed;
    }

    static validatePrice(price) {
        const priceNumber = Number(price);

        if (isNaN(priceNumber) || priceNumber < 0) {
            throw new Error("Price must be a positive number");
        }

        if (priceNumber > 999999.99) {
            throw new Error("Price exceeds maximum allowed value");
        }

        return priceNumber;
    }

    static validateStockQuantity(quantity) {
        const quantityNumber = Number(quantity);

        if (!Number.isInteger(quantityNumber) || quantityNumber < 0) {
            throw new Error("Stock quantity must be a non-negative integer");
        }

        return quantityNumber;
    }

    static validateCategory(category) {
        if (category === undefined || category === null || category === "") {
            return null;
        }

        const categoryTrimmed = String(category ?? "").trim();

        if (categoryTrimmed.length < 2) {
            throw new Error("Category must be at least 2 characters");
        }

        if (categoryTrimmed.length > 100) {
            throw new Error("Category must be at most 100 characters");
        }

        return categoryTrimmed;
    }

    static validateSku(sku) {
        if (sku === undefined || sku === null || sku === "") {
            return null;
        }

        const skuTrimmed = String(sku ?? "").trim().toUpperCase();

        if (skuTrimmed.length < 3) {
            throw new Error("SKU must be at least 3 characters");
        }

        if (skuTrimmed.length > 100) {
            throw new Error("SKU must be at most 100 characters");
        }

        return skuTrimmed;
    }

    static validateDescription(description) {
        if (description === undefined || description === null || description === "") {
            return null;
        }

        const descriptionTrimmed = String(description ?? "").trim();

        if (descriptionTrimmed.length > 5000) {
            throw new Error("Description must be at most 5000 characters");
        }

        return descriptionTrimmed;
    }

    static validateImageUrl(imageUrl) {
        if (imageUrl === undefined || imageUrl === null || imageUrl === "") {
            return null;
        }

        const urlString = String(imageUrl ?? "").trim();

        if (urlString.length > 500) {
            throw new Error("Image URL must be at most 500 characters");
        }

        try {
            new URL(urlString);
        } catch {
            throw new Error("Invalid image URL format");
        }

        return urlString;
    }

    static removeSensitiveFieldsFromProduct(productRow) {
        if (!productRow) return null;

        const {
            id: internalNumericId,
            ...safeProduct
        } = productRow;

        return safeProduct;
    }

    // Create
    static async createProduct(name, price, stockQuantity, createdBy, { description = null, category = null, sku = null, imageUrl = null } = {}) {
        const productId = generateProductId();

        const validatedName = this.validateProductName(name);
        const validatedPrice = this.validatePrice(price);
        const validatedStockQuantity = this.validateStockQuantity(stockQuantity);
        const validatedDescription = this.validateDescription(description);
        const validatedCategory = this.validateCategory(category);
        const validatedSku = this.validateSku(sku);
        const validatedImageUrl = this.validateImageUrl(imageUrl);

        const insertProductQuery = `
            INSERT INTO products (product_id, name, price, stock_quantity, description, category, sku, image_url, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        await pool.query(insertProductQuery, [
            productId,
            validatedName,
            validatedPrice,
            validatedStockQuantity,
            validatedDescription,
            validatedCategory,
            validatedSku,
            validatedImageUrl,
            createdBy,
        ]);

        return await this.getProductByProductId(productId);
    }

    // Read
    static async getAllProducts(limit = 20, offset = 0, filters = {}) {
        let query = 'SELECT * FROM products WHERE is_active = TRUE';
        const params = [];

        if (filters.category) {
            query += ' AND category = ?';
            params.push(filters.category);
        }

        if (filters.search) {
            query += ' AND (name LIKE ? OR description LIKE ?)';
            const searchTerm = `%${filters.search}%`;
            params.push(searchTerm, searchTerm);
        }

        query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
        params.push(limit, offset);

        const [rows] = await pool.query(query, params);
        return rows.map(row => this.removeSensitiveFieldsFromProduct(row));
    }

    static async getProductByProductId(productId) {
        const selectProductQuery = `
            SELECT * FROM products
            WHERE product_id = ?
            LIMIT 1
        `;
        const [rows] = await pool.query(selectProductQuery, [productId]);
        return this.removeSensitiveFieldsFromProduct(rows[0]) || null;
    }

    static async getProductByProductIdIncludingInactive(productId) {
        const selectProductQuery = `
            SELECT * FROM products
            WHERE product_id = ?
            LIMIT 1
        `;
        const [rows] = await pool.query(selectProductQuery, [productId]);
        return rows[0] || null;
    }

    static async getProductBySku(sku) {
        const validatedSku = this.validateSku(sku);
        const selectProductQuery = `
            SELECT * FROM products
            WHERE sku = ?
            LIMIT 1
        `;
        const [rows] = await pool.query(selectProductQuery, [validatedSku]);
        return this.removeSensitiveFieldsFromProduct(rows[0]) || null;
    }

    static async getProductCount(filters = {}) {
        let query = 'SELECT COUNT(*) as total FROM products WHERE is_active = TRUE';
        const params = [];

        if (filters.category) {
            query += ' AND category = ?';
            params.push(filters.category);
        }

        if (filters.search) {
            query += ' AND (name LIKE ? OR description LIKE ?)';
            const searchTerm = `%${filters.search}%`;
            params.push(searchTerm, searchTerm);
        }

        const [rows] = await pool.query(query, params);
        return rows[0]?.total || 0;
    }

    // Update
    static async updateProduct(productId, updates = {}) {
        const allowedFields = new Set(["name", "price", "stock_quantity", "description", "category", "sku", "image_url", "is_active"]);

        const updateClauses = [];
        const updateValues = [];

        const existingProduct = await this.getProductByProductIdIncludingInactive(productId);
        if (!existingProduct) return null;

        for (const [fieldName, fieldValue] of Object.entries(updates)) {
            if (!allowedFields.has(fieldName)) continue;

            if (fieldName === "name") {
                const validatedName = this.validateProductName(fieldValue);
                updateClauses.push("name = ?");
                updateValues.push(validatedName);
                continue;
            }

            if (fieldName === "price") {
                const validatedPrice = this.validatePrice(fieldValue);
                updateClauses.push("price = ?");
                updateValues.push(validatedPrice);
                continue;
            }

            if (fieldName === "stock_quantity") {
                const validatedStockQuantity = this.validateStockQuantity(fieldValue);
                updateClauses.push("stock_quantity = ?");
                updateValues.push(validatedStockQuantity);
                continue;
            }

            if (fieldName === "description") {
                const validatedDescription = this.validateDescription(fieldValue);
                updateClauses.push("description = ?");
                updateValues.push(validatedDescription);
                continue;
            }

            if (fieldName === "category") {
                const validatedCategory = this.validateCategory(fieldValue);
                updateClauses.push("category = ?");
                updateValues.push(validatedCategory);
                continue;
            }

            if (fieldName === "sku") {
                const validatedSku = this.validateSku(fieldValue);
                updateClauses.push("sku = ?");
                updateValues.push(validatedSku);
                continue;
            }

            if (fieldName === "image_url") {
                const validatedImageUrl = this.validateImageUrl(fieldValue);
                updateClauses.push("image_url = ?");
                updateValues.push(validatedImageUrl);
                continue;
            }

            if (fieldName === "is_active") {
                const isActiveBoolean = Boolean(fieldValue);
                updateClauses.push("is_active = ?");
                updateValues.push(isActiveBoolean);
                continue;
            }
        }

        if (updateClauses.length === 0) {
            throw new Error("No valid fields to update");
        }

        const updateProductQuery = `
            UPDATE products
            SET ${updateClauses.join(", ")}
            WHERE product_id = ?
        `;
        updateValues.push(productId);

        const [updateResult] = await pool.query(updateProductQuery, updateValues);
        if (updateResult.affectedRows === 0) return null;

        return await this.getProductByProductIdIncludingInactive(productId);
    }

    // Delete (soft delete)
    static async softDeleteProduct(productId) {
        const deleteProductQuery = `
            UPDATE products
            SET is_active = FALSE
            WHERE product_id = ?
        `;
        const [deleteResult] = await pool.query(deleteProductQuery, [productId]);
        return { deleted: deleteResult.affectedRows > 0 };
    }

    // Stock Management
    static async decreaseStock(productId, quantity) {
        const product = await this.getProductByProductIdIncludingInactive(productId);
        if (!product) return null;

        if (product.stock_quantity < quantity) {
            throw new Error(`Insufficient stock. Available: ${product.stock_quantity}, Requested: ${quantity}`);
        }

        const updateStockQuery = `
            UPDATE products
            SET stock_quantity = stock_quantity - ?
            WHERE product_id = ?
        `;
        await pool.query(updateStockQuery, [quantity, productId]);

        return await this.getProductByProductIdIncludingInactive(productId);
    }

    static async increaseStock(productId, quantity) {
        const product = await this.getProductByProductIdIncludingInactive(productId);
        if (!product) return null;

        const updateStockQuery = `
            UPDATE products
            SET stock_quantity = stock_quantity + ?
            WHERE product_id = ?
        `;
        await pool.query(updateStockQuery, [quantity, productId]);

        return await this.getProductByProductIdIncludingInactive(productId);
    }

    static async hasStockAvailable(productId, requiredQuantity) {
        const product = await this.getProductByProductIdIncludingInactive(productId);
        if (!product) return false;

        return product.stock_quantity >= requiredQuantity;
    }
}

export default ProductModel;
