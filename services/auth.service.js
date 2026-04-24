import jwt from "jsonwebtoken";
import bcryptjs from "bcryptjs";
import crypto from "crypto";
import UserModel from "../models/user.model.js";
import RefreshTokenModel from "../models/refresh-token.model.js";

class AuthService {
  static accessTokenLifetime = "15m";
  static refreshTokenLifetime = "7d";

  static getJwtSecrets() {
    const accessTokenSecret = process.env.JWT_ACCESS_SECRET;
    const refreshTokenSecret = process.env.JWT_REFRESH_SECRET;

    if (!accessTokenSecret || !refreshTokenSecret) {
      throw new Error("JWT secrets are not set (JWT_ACCESS_SECRET, JWT_REFRESH_SECRET)");
    }

    return { accessTokenSecret, refreshTokenSecret };
  }

  static signAccessToken({ userId, emailAddress, role }) {
    const { accessTokenSecret } = this.getJwtSecrets();

    return jwt.sign(
      { sub: userId, email: emailAddress, role, token_type: "access" },
      accessTokenSecret,
      { expiresIn: this.accessTokenLifetime }
    );
  }

  static signRefreshToken({ userId }) {
    const { refreshTokenSecret } = this.getJwtSecrets();

    const refreshTokenId = crypto.randomUUID();

    const refreshToken = jwt.sign(
      { sub: userId, jti: refreshTokenId, token_type: "refresh" },
      refreshTokenSecret,
      { expiresIn: this.refreshTokenLifetime }
    );

    return { refreshToken, refreshTokenId };
  }

  static async registerUser({ fullName, emailAddress, age, password }) {
    const createdUser = await UserModel.createUser(fullName, emailAddress, age, password, "customer");

    const accessToken = this.signAccessToken({
      userId: createdUser.user_id,
      emailAddress: createdUser.email,
      role: createdUser.role,
    });

    const { refreshToken, refreshTokenId } = this.signRefreshToken({
      userId: createdUser.user_id,
    });

    await RefreshTokenModel.storeRefreshToken({
      refreshTokenId,
      userId: createdUser.user_id,
      refreshToken,
    });

    return {
      data: createdUser,
      tokens: {
        access_token: accessToken,
        refresh_token: refreshToken,
        token_type: "Bearer",
        access_token_expires_in: this.accessTokenLifetime,
        refresh_token_expires_in: this.refreshTokenLifetime,
      },
    };
  }

  static async loginUser({ emailAddress, password }) {
    const userRow = await UserModel.getUserByEmailForAuthentication(emailAddress);

    const dummyPasswordHashForTiming =
      "$2b$12$C6UzMDM.H6dfI/f/IKcEeO4j7Kp6qD0lFQn8yH0Z8H3k1pQpF3VQ2";

    const passwordHashToCompare = userRow?.password_hash || dummyPasswordHashForTiming;
    const isPasswordValid = await bcryptjs.compare(String(password ?? ""), passwordHashToCompare);

    if (!userRow || !isPasswordValid) return null;

    const safeUser = UserModel.removeSensitiveFieldsFromUser(userRow);

    const accessToken = this.signAccessToken({
      userId: safeUser.user_id,
      emailAddress: safeUser.email,
      role: safeUser.role,
    });

    const { refreshToken, refreshTokenId } = this.signRefreshToken({
      userId: safeUser.user_id,
    });

    await RefreshTokenModel.storeRefreshToken({
      refreshTokenId,
      userId: safeUser.user_id,
      refreshToken,
    });

    return {
      data: safeUser,
      tokens: {
        access_token: accessToken,
        refresh_token: refreshToken,
        token_type: "Bearer",
        access_token_expires_in: this.accessTokenLifetime,
        refresh_token_expires_in: this.refreshTokenLifetime,
      },
    };
  }

  static async refreshAccessToken({ refreshToken }) {
    const { refreshTokenSecret } = this.getJwtSecrets();

    let decodedRefreshToken;
    try {
      decodedRefreshToken = jwt.verify(refreshToken, refreshTokenSecret);
    } catch {
      return null;
    }

    if (decodedRefreshToken?.token_type !== "refresh") return null;

    const refreshTokenId = decodedRefreshToken.jti;
    const userId = decodedRefreshToken.sub;

    const isStoredAndActive = await RefreshTokenModel.isRefreshTokenActive({
      refreshTokenId,
      userId,
      refreshToken,
    });

    if (!isStoredAndActive) return null;

    await RefreshTokenModel.revokeRefreshToken({ refreshTokenId });

    const user = await UserModel.getUserById(userId);
    if (!user) return null;

    const newAccessToken = this.signAccessToken({
      userId: user.user_id,
      emailAddress: user.email,
      role: user.role,
    });

    const { refreshToken: newRefreshToken, refreshTokenId: newRefreshTokenId } =
      this.signRefreshToken({ userId: user.user_id });

    await RefreshTokenModel.storeRefreshToken({
      refreshTokenId: newRefreshTokenId,
      userId: user.user_id,
      refreshToken: newRefreshToken,
    });

    return {
      tokens: {
        access_token: newAccessToken,
        refresh_token: newRefreshToken,
        token_type: "Bearer",
        access_token_expires_in: this.accessTokenLifetime,
        refresh_token_expires_in: this.refreshTokenLifetime,
      },
    };
  }

  static async logout({ refreshToken }) {
    const { refreshTokenSecret } = this.getJwtSecrets();

    let decodedRefreshToken;
    try {
      decodedRefreshToken = jwt.verify(refreshToken, refreshTokenSecret);
    } catch {
      return null;
    }

    if (decodedRefreshToken?.token_type !== "refresh") return null;

    await RefreshTokenModel.revokeRefreshToken({ refreshTokenId: decodedRefreshToken.jti });
    return { success: true };
  }
}

export default AuthService;
