import AuthService from "../services/auth.service.js";

class AuthController {
    static async register(request, response) {
        try {
            const { full_name: fullName, email: emailAddress, age, password } = request.body;

            if (!fullName || !emailAddress || !password) {
                return response.status(400).json({ 
                    success: false,
                    message: "full_name, email, and password are required" 
                });
            }

            const registrationResult = await AuthService.registerUser({
                fullName,
                emailAddress,
                age,
                password,
            });

            return response.status(201).json({ 
                success: true,
                ...registrationResult 
            });
        } catch (error) {
            if (error?.code === "ER_DUP_ENTRY") {
                return response.status(409).json({ 
                    success: false,
                    message: "Email already exists" 
                });
            }

            if (error instanceof Error) {
                return response.status(400).json({ 
                    success: false,
                    message: error.message 
                });
            }

            console.error("Registration error:", error);
            return response.status(500).json({ 
                success: false,
                message: "Registration failed" 
            });
        }
    }

    static async login(request, response) {
        try {
            const { email: emailAddress, password } = request.body;

            if (!emailAddress || !password) {
                return response.status(400).json({ 
                    success: false,
                    message: "Email and password are required" 
                });
            }

            const loginResult = await AuthService.loginUser({ emailAddress, password });
            if (!loginResult) {
                return response.status(401).json({ 
                    success: false,
                    message: "Invalid email or password" 
                });
            }

            return response.status(200).json({ 
                success: true,
                ...loginResult 
            });
        } catch (error) {
            if (error instanceof Error) {
                return response.status(400).json({ 
                    success: false,
                    message: error.message 
                });
            }
            console.error("Login error:", error);
            return response.status(500).json({ 
                success: false,
                message: "Login failed" 
            });
        }
    }

    static async refresh(request, response) {
        try {
            const { refresh_token: refreshToken } = request.body;

            if (!refreshToken) {
                return response.status(400).json({ 
                    success: false,
                    message: "refresh_token is required" 
                });
            }

            const refreshResult = await AuthService.refreshAccessToken({ refreshToken });
            if (!refreshResult) {
                return response.status(401).json({ 
                    success: false,
                    message: "Invalid or expired refresh token" 
                });
            }

            return response.status(200).json({ 
                success: true,
                ...refreshResult 
            });
        } catch (error) {
            console.error("Token refresh error:", error);
            return response.status(500).json({ 
                success: false,
                message: "Token refresh failed" 
            });
        }
    }

    static async logout(request, response) {
        try {
            const { refresh_token: refreshToken } = request.body;

            if (!refreshToken) {
                return response.status(400).json({ 
                    success: false,
                    message: "refresh_token is required" 
                });
            }

            const logoutResult = await AuthService.logout({ refreshToken });
            if (!logoutResult) {
                return response.status(400).json({ 
                    success: false,
                    message: "Logout failed" 
                });
            }

            return response.status(200).json({ 
                success: true,
                message: "Logged out successfully" 
            });
        } catch (error) {
            console.error("Logout error:", error);
            return response.status(500).json({ 
                success: false,
                message: "Logout failed" 
            });
        }
    }
}

export default AuthController;
