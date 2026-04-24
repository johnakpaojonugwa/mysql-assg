import express from 'express';
import UserSelfController from '../controllers/user-self.controller.js';
import { authenticateAccessToken } from "../middleware/authenticate.js";

const usersRouter = express.Router();

usersRouter.get("/me", authenticateAccessToken, UserSelfController.getMe);
usersRouter.patch("/me", authenticateAccessToken, UserSelfController.updateMe);
usersRouter.patch("/me/password", authenticateAccessToken, UserSelfController.changeMyPassword);


export default usersRouter;
