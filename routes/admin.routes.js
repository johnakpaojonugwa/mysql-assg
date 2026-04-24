import { Router } from "express";
import { authenticateAccessToken } from "../middleware/authenticate.js";
import { requireAdminRole } from "../middleware/authorize.js";
import AdminUsersController from "../controllers/admin-users.controller.js";

const adminRouter = Router();

adminRouter.get("/users", authenticateAccessToken, requireAdminRole, AdminUsersController.getAllUsers);
adminRouter.get("/users/:userId", authenticateAccessToken, requireAdminRole, AdminUsersController.getUserById);
adminRouter.post("/users", authenticateAccessToken, requireAdminRole, AdminUsersController.createUser);
adminRouter.patch("/users/:userId", authenticateAccessToken, requireAdminRole, AdminUsersController.updateUser);
adminRouter.delete("/users/:userId", authenticateAccessToken, requireAdminRole, AdminUsersController.deleteUser);

export default adminRouter;
