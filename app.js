import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import usersRouter from './routes/users.routes.js';
import authRouter from './routes/auth.routes.js';
import adminRouter from './routes/admin.routes.js';
import productRoutes from './routes/product.routes.js';
import cartRoutes from './routes/cart.routes.js';
import orderRoutes from './routes/order.routes.js';
const app = express();

// Security middleware - helmet for HTTP headers
app.use(helmet());

// CORS configuration
app.use(cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Request body size limits
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ limit: '10kb', extended: true }));

// Rate limiting for authentication endpoints
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 requests per windowMs
    message: 'Too many authentication attempts, please try again later',
    standardHeaders: true,
    legacyHeaders: false
});

app.get('/', (request, response) => {
    response.status(200).json({ success: true, message: 'Welcome to the SQL Backend API' });
});

/* ROUTES */
// users (self-service)
app.use('/api/users', usersRouter); // http://localhost:5002/api/users
// auth with rate limiting
app.use('/api/auth', authLimiter, authRouter); // http://localhost:5002/api/auth
// admin 
app.use('/api/admin', adminRouter); // http://localhost:5002/api/admin
// e-commerce: products
app.use('/api/products', productRoutes); // http://localhost:5002/api/products
// e-commerce: shopping cart
app.use('/api/cart', cartRoutes); // http://localhost:5002/api/cart
// e-commerce: orders
app.use('/api/orders', orderRoutes); // http://localhost:5002/api/orders

export default app;