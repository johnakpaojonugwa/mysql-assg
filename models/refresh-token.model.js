import pool from "../configs/db.js";

class RefreshTokenModel {
  static async createTable() {
    const createRefreshTokensTableQuery = `
      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        refresh_token_id CHAR(36) NOT NULL UNIQUE,
        user_id VARCHAR(50) NOT NULL,
        refresh_token TEXT NOT NULL,
        is_revoked BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        revoked_at TIMESTAMP NULL DEFAULT NULL,
        INDEX index_refresh_tokens_user_id (user_id),
        INDEX index_refresh_tokens_is_revoked (is_revoked)
      )
    `;
    await pool.query(createRefreshTokensTableQuery);
  }

  static async storeRefreshToken({ refreshTokenId, userId, refreshToken }) {
    const insertRefreshTokenQuery = `
      INSERT INTO refresh_tokens (refresh_token_id, user_id, refresh_token)
      VALUES (?, ?, ?)
    `;
    await pool.query(insertRefreshTokenQuery, [refreshTokenId, userId, refreshToken]);
    return { stored: true };
  }

  static async isRefreshTokenActive({ refreshTokenId, userId, refreshToken }) {
    const selectRefreshTokenQuery = `
      SELECT refresh_token_id, user_id, refresh_token, is_revoked
      FROM refresh_tokens
      WHERE refresh_token_id = ? AND user_id = ?
      LIMIT 1
    `;
    const [rows] = await pool.query(selectRefreshTokenQuery, [refreshTokenId, userId]);

    const storedRefreshTokenRow = rows[0];
    if (!storedRefreshTokenRow) return false;
    if (storedRefreshTokenRow.is_revoked) return false;

    return storedRefreshTokenRow.refresh_token === refreshToken;
  }

  static async revokeRefreshToken({ refreshTokenId }) {
    const revokeRefreshTokenQuery = `
      UPDATE refresh_tokens
      SET is_revoked = TRUE, revoked_at = CURRENT_TIMESTAMP
      WHERE refresh_token_id = ?
    `;
    const [updateResult] = await pool.query(revokeRefreshTokenQuery, [refreshTokenId]);
    return { revoked: updateResult.affectedRows > 0 };
  }
}

export default RefreshTokenModel;
