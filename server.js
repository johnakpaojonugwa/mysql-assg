import dotenv from 'dotenv';
dotenv.config();

// Validate required environment variables
const requiredEnvVars = [
    'DB_HOST',
    'DB_USER',
    'DB_PASSWORD',
    'DB_NAME',
    'DB_PORT',
    'JWT_ACCESS_SECRET',
    'JWT_REFRESH_SECRET',
    'PORT'
];

const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
if (missingEnvVars.length > 0) {
    console.error(`❌ Missing required environment variables: ${missingEnvVars.join(', ')}`);
    process.exit(1);
}

import app from './app.js';
import pool from './configs/db.js';
import UserModel from './models/user.model.js';
import RefreshTokenModel from "./models/refresh-token.model.js";
import ProductModel from './models/product.model.js';
import CartModel from './models/cart.model.js';
import CartItemModel from './models/cart-item.model.js';
import OrderModel from './models/order.model.js';
import OrderItemModel from './models/order-item.model.js';


const PORT = process.env.PORT || 5002;

// Start the server after ensuring the database connection is successful
const startServer = async () => {
    try {
        const databaseConnection = await pool.getConnection();
        
        await databaseConnection.ping();
        
        console.log('✅ Database connection successful');

        databaseConnection.release();

        await UserModel.createTable();
        await RefreshTokenModel.createTable();
        await ProductModel.createTable();
        await CartModel.createTable();
        await CartItemModel.createTable();
        await OrderModel.createTable();
        await OrderItemModel.createTable();
        
        console.log('✅ Database tables initialized');

        app.listen(PORT, () => {
            console.log(`✅ Server is running on http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error('❌ Error connecting to the database:', error.message);
        process.exit(1);
    }
}

startServer();
