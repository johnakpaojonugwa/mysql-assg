import UserModel from "../models/user.model.js";
import bcryptjs from "bcryptjs";

class UserSelfController {
  static async getMe(request, response) {
    try {
      const authenticatedUserId = request.authenticatedUser.userId;

      const user = await UserModel.getUserById(authenticatedUserId);
      if (!user) {
        return response.status(404).json({ 
          success: false,
          message: "User not found" 
        });
      }

      return response.status(200).json({ 
        success: true,
        data: user 
      });
    } catch (error) {
      console.error("Error fetching profile:", error);
      return response.status(500).json({ 
        success: false,
        message: "Failed to fetch profile" 
      });
    }
  }

  static async updateMe(request, response) {
    try {
      const authenticatedUserId = request.authenticatedUser.userId;

      // Block role updates through self-service
      const { role, ...updates } = request.body;

      const updatedUser = await UserModel.updateDynamicUser(authenticatedUserId, updates);
      if (!updatedUser) {
        return response.status(404).json({ 
          success: false,
          message: "User not found" 
        });
      }

      return response.status(200).json({ 
        success: true,
        data: updatedUser 
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
      console.error("Error updating profile:", error);
      return response.status(500).json({ 
        success: false,
        message: "Failed to update profile" 
      });
    }
  }

  static async changeMyPassword(request, response) {
    try {
      const authenticatedUserId = request.authenticatedUser.userId;
      const { current_password: currentPassword, new_password: newPassword } = request.body;

      if (!currentPassword || !newPassword) {
        return response.status(400).json({ 
          success: false,
          message: "current_password and new_password are required" 
        });
      }

      if (currentPassword === newPassword) {
        return response.status(400).json({ 
          success: false,
          message: "New password must be different from current password" 
        });
      }

      // Verify current password
      const user = await UserModel.getUserByUserIdIncludingPasswordHash(authenticatedUserId);
      if (!user) {
        return response.status(404).json({ 
          success: false,
          message: "User not found" 
        });
      }

      const isPasswordValid = await bcryptjs.compare(String(currentPassword), user.password_hash);
      if (!isPasswordValid) {
        return response.status(401).json({ 
          success: false,
          message: "Current password is incorrect" 
        });
      }

      const updatedUser = await UserModel.updatePassword(authenticatedUserId, newPassword);
      if (!updatedUser) {
        return response.status(404).json({ 
          success: false,
          message: "User not found" 
        });
      }

      return response.status(200).json({ 
        success: true,
        data: updatedUser 
      });
    } catch (error) {
      if (error instanceof Error) {
        return response.status(400).json({ 
          success: false,
          message: error.message 
        });
      }
      console.error("Error updating password:", error);
      return response.status(500).json({ 
        success: false,
        message: "Failed to update password" 
      });
    }
  }
}

export default UserSelfController;
