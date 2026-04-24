import UserModel from "../models/user.model.js";

class AdminUsersController {
  static async getAllUsers(request, response) {
    try {
      const users = await UserModel.getAllUsers();
      return response.status(200).json({ 
        success: true,
        data: users 
      });
    } catch (error) {
      console.error("Error fetching users:", error);
      return response.status(500).json({ 
        success: false,
        message: "Failed to fetch users" 
      });
    }
  }

  static async getUserById(request, response) {
    try {
      const { userId } = request.params;

      const user = await UserModel.getUserById(userId);
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
      console.error("Error fetching user:", error);
      return response.status(500).json({ 
        success: false,
        message: "Failed to fetch user" 
      });
    }
  }

  static async createUser(request, response) {
    try {
      const {
        full_name: fullName,
        email: emailAddress,
        age,
        password,
        role,
      } = request.body;

      if (!fullName || !emailAddress || !password) {
        return response
          .status(400)
          .json({ 
            success: false,
            message: "full_name, email, and password are required" 
          });
      }

      const roleToCreate = role === undefined ? "customer" : role;

      const createdUser = await UserModel.createUser(
        fullName,
        emailAddress,
        age,
        password,
        roleToCreate
      );

      return response.status(201).json({ 
        success: true,
        data: createdUser 
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
      console.error("Error creating user:", error);
      return response.status(500).json({ 
        success: false,
        message: "Failed to create user" 
      });
    }
  }

  static async updateUser(request, response) {
    try {
      const { userId } = request.params;

      // Prevent an admin from removing their own admin role
      const authenticatedAdminUserId = request.authenticatedUser.userId;
      if (String(userId) === String(authenticatedAdminUserId) && request.body?.role !== undefined) {
        const requestedRole = UserModel.validateUserRole(request.body.role);
        if (requestedRole !== "admin") {
          return response.status(400).json({ 
            success: false,
            message: "You cannot remove your own admin role" 
          });
        }
      }

      const { role, ...updates } = request.body;

      const updatedUser = await UserModel.updateDynamicUser(userId, updates);
      if (!updatedUser) {
        return response.status(404).json({ 
          success: false,
          message: "User not found" 
        });
      }

      if (role !== undefined) {
        const updatedUserWithRole = await UserModel.updateUserRole(userId, role);
        return response.status(200).json({ 
          success: true,
          data: updatedUserWithRole 
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
      console.error("Error updating user:", error);
      return response.status(500).json({ 
        success: false,
        message: "Failed to update user" 
      });
    }
  }

  static async deleteUser(request, response) {
    try {
      const { userId } = request.params;

      const deleteResult = await UserModel.deleteUser(userId);
      if (!deleteResult.deleted) {
        return response.status(404).json({ 
          success: false,
          message: "User not found" 
        });
      }

      return response.status(200).json({ 
        success: true,
        message: "User deleted successfully" 
      });
    } catch (error) {
      console.error("Error deleting user:", error);
      return response.status(500).json({ 
        success: false,
        message: "Failed to delete user" 
      });
    }
  }
}

export default AdminUsersController;
