import pool from '../configs/db.js';
import { generateUserId } from '../utils/generate-id.js';
import bcryptjs from 'bcryptjs';

class UserModel {
    // Configuration
    static bcryptjsSaltRounds = 12;

    static passwordPolicy = {
        minimumLength: 8,
        maximumLength: 72,
        requireLowercaseLetter: true,
        requireUppercaseLetter: true,
        requireNumber: true,
        requireSymbol: true,
    };

    // Schema
    static async createTable() {
        const createUsersTableQuery = `
            CREATE TABLE IF NOT EXISTS users (
                id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                user_id VARCHAR(50) NOT NULL UNIQUE,
                full_name VARCHAR(100) NOT NULL,
                email VARCHAR(100) NOT NULL UNIQUE,
                password_hash VARCHAR(255) NOT NULL,
                role ENUM('customer','admin') NOT NULL DEFAULT 'customer',
                age TINYINT UNSIGNED NULL,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX index_users_created_at (created_at),
                INDEX index_users_email (email),
                INDEX index_users_role (role)
            )
        `;
        await pool.query(createUsersTableQuery);
    }

    // Validations
    static normalizeEmailAddress(emailAddress) {
        return String(emailAddress ?? "").trim().toLowerCase();
    }

    static validateFullName(fullName) {
        const fullNameTrimmed = String(fullName ?? "").trim();

        if (fullNameTrimmed.length < 2) {
            throw new Error("Full name must be at least 2 characters");
        }

        if (fullNameTrimmed.length > 100) {
            throw new Error("Full name must be at most 100 characters");
        }

        return fullNameTrimmed;
    }

    static validateEmailAddress(emailAddress) {
        const normalizedEmailAddress = this.normalizeEmailAddress(emailAddress);

        const basicEmailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!basicEmailPattern.test(normalizedEmailAddress)) {
            throw new Error("Invalid email address");
        }

        if (normalizedEmailAddress.length > 100) {
            throw new Error("Email must be at most 100 characters");
        }

        return normalizedEmailAddress;
    }

    static validateAge(age) {
        if (age === undefined || age === null || age === "") {
            return null;
        }

        const ageNumber = Number(age);
        if (!Number.isInteger(ageNumber)) {
            throw new Error("Age must be an integer");
        }

        if (ageNumber < 0 || ageNumber > 100) {
            throw new Error("Age must be between 0 and 100");
        }

        return ageNumber;
    }

    static validateUserRole(role) {
        const normalizedRole = String(role ?? "").trim().toLowerCase();
        const allowedRoles = new Set(["customer", "admin"]);

        if (!allowedRoles.has(normalizedRole)) {
            throw new Error("Role must be either 'customer' or 'admin'");
        }

        return normalizedRole;
    }

    static validatePasswordAgainstPolicy(password, { emailAddress, fullName } = {}) {
        const passwordString = String(password ?? "");

        const {
            minimumLength,
            maximumLength,
            requireLowercaseLetter,
            requireUppercaseLetter,
            requireNumber,
            requireSymbol,
        } = this.passwordPolicy;

        if (passwordString.length < minimumLength) {
            throw new Error(`Password must be at least ${minimumLength} characters`);
        }

        if (passwordString.length > maximumLength) {
            throw new Error(`Password must be at most ${maximumLength} characters`);
        }

        if (requireLowercaseLetter && !/[a-z]/.test(passwordString)) {
            throw new Error("Password must include a lowercase letter");
        }

        if (requireUppercaseLetter && !/[A-Z]/.test(passwordString)) {
            throw new Error("Password must include an uppercase letter");
        }

        if (requireNumber && !/[0-9]/.test(passwordString)) {
            throw new Error("Password must include a number");
        }

        if (requireSymbol && !/[^A-Za-z0-9]/.test(passwordString)) {
            throw new Error("Password must include a symbol");
        }

        if (emailAddress) {
            const normalizedEmailAddress = this.normalizeEmailAddress(emailAddress);
            const emailLocalPart = normalizedEmailAddress.split("@")[0] || "";
            if (emailLocalPart && passwordString.toLowerCase().includes(emailLocalPart.toLowerCase())) {
                throw new Error("Password must not contain parts of your email");
            }
        }

        if (fullName) {
            const normalizedFullName = String(fullName).trim().toLowerCase();
            const fullNameParts = normalizedFullName.split(/\s+/).filter(Boolean);

            const containsNamePart = fullNameParts.some(
                (namePart) => namePart.length >= 3 && passwordString.toLowerCase().includes(namePart)
            );

            if (containsNamePart) {
                throw new Error("Password must not contain parts of your name");
            }
        }

        return true;
    }

    static removeSensitiveFieldsFromUser(userRow) {
        if (!userRow) return null;

        const {
            password_hash: passwordHash,
            id: internalNumericId,
            ...safeUser
        } = userRow;

        return safeUser;
    }

    static async getUserByUserIdIncludingPasswordHash(userId) {
        const selectUserQuery = "SELECT * FROM users WHERE user_id = ? LIMIT 1";
        const [rows] = await pool.query(selectUserQuery, [userId]);
        return rows[0] || null;
    }

    // Reads 
    static async getAllUsers() {
        const selectAllUsersQuery = `
            SELECT user_id, full_name, email, role, age, created_at, updated_at
            FROM users
            ORDER BY created_at DESC
        `;
        const [rows] = await pool.query(selectAllUsersQuery);
        return rows;
    }

    static async getUserById(userId) {
        const selectUserQuery = `
            SELECT user_id, full_name, email, role, age, created_at, updated_at
            FROM users
            WHERE user_id = ?
            LIMIT 1
        `;
        const [rows] = await pool.query(selectUserQuery, [userId]);
        return rows[0] || null;
    }

    static async getUserByEmailForAuthentication(emailAddress) {
        const validatedEmailAddress = this.validateEmailAddress(emailAddress);
        const selectUserQuery = "SELECT * FROM users WHERE email = ? LIMIT 1";
        const [rows] = await pool.query(selectUserQuery, [validatedEmailAddress]);
        return rows[0] || null;
    }

    // Writes
    static async createUser(fullName, emailAddress, age, password, role = "customer") {
        const userId = generateUserId();

        const validatedFullName = this.validateFullName(fullName);
        const validatedEmailAddress = this.validateEmailAddress(emailAddress);
        const validatedAge = this.validateAge(age);
        const validatedRole = this.validateUserRole(role);

        this.validatePasswordAgainstPolicy(password, {
            emailAddress: validatedEmailAddress,
            fullName: validatedFullName,
        });

        const passwordHash = await bcryptjs.hash(String(password), this.bcryptjsSaltRounds);

        const insertUserQuery = `
            INSERT INTO users (user_id, full_name, email, password_hash, role, age)
            VALUES (?, ?, ?, ?, ?, ?)
        `;

        await pool.query(insertUserQuery, [
            userId,
            validatedFullName,
            validatedEmailAddress,
            passwordHash,
            validatedRole,
            validatedAge,
        ]);

        return await this.getUserById(userId);
    }

    static async updateUser(userId, fullName, emailAddress, age) {
        const validatedFullName = this.validateFullName(fullName);
        const validatedEmailAddress = this.validateEmailAddress(emailAddress);
        const validatedAge = this.validateAge(age);

        const updateUserQuery = `
            UPDATE users
            SET full_name = ?, email = ?, age = ?
            WHERE user_id = ?
        `;

        const [updateResult] = await pool.query(updateUserQuery, [
            validatedFullName,
            validatedEmailAddress,
            validatedAge,
            userId,
        ]);

        if (updateResult.affectedRows === 0) return null;
        return await this.getUserById(userId);
    }

    static async updateUserRole(userId, role) {
        const validatedRole = this.validateUserRole(role);

        const updateUserRoleQuery = `
            UPDATE users
            SET role = ?
            WHERE user_id = ?
        `;

        const [updateResult] = await pool.query(updateUserRoleQuery, [validatedRole, userId]);
        if (updateResult.affectedRows === 0) return null;

        return await this.getUserById(userId);
    }

    static async updateDynamicUser(userId, updates = {}) {
        const allowedFields = new Set(["full_name", "email", "age", "password"]);

        const updateClauses = [];
        const updateValues = [];

        const existingUser = await this.getUserByUserIdIncludingPasswordHash(userId);
        if (!existingUser) return null;

        for (const [fieldName, fieldValue] of Object.entries(updates)) {
            if (!allowedFields.has(fieldName)) continue;

            if (fieldName === "full_name") {
                const validatedFullName = this.validateFullName(fieldValue);
                updateClauses.push("full_name = ?");
                updateValues.push(validatedFullName);
                continue;
            }

            if (fieldName === "email") {
                const validatedEmailAddress = this.validateEmailAddress(fieldValue);
                updateClauses.push("email = ?");
                updateValues.push(validatedEmailAddress);
                continue;
            }

            if (fieldName === "age") {
                const validatedAge = this.validateAge(fieldValue);
                updateClauses.push("age = ?");
                updateValues.push(validatedAge);
                continue;
            }

            if (fieldName === "password") {
                const emailAddressForValidation = updates.email
                    ? this.normalizeEmailAddress(updates.email)
                    : existingUser.email;

                const fullNameForValidation = updates.full_name
                    ? String(updates.full_name)
                    : existingUser.full_name;

                this.validatePasswordAgainstPolicy(fieldValue, {
                    emailAddress: emailAddressForValidation,
                    fullName: fullNameForValidation,
                });

                const passwordHash = await bcryptjs.hash(String(fieldValue), this.bcryptjsSaltRounds);
                updateClauses.push("password_hash = ?");
                updateValues.push(passwordHash);
                continue;
            }
        }

        if (updateClauses.length === 0) {
            throw new Error("No valid fields to update");
        }

        const updateUserQuery = `
            UPDATE users
            SET ${updateClauses.join(", ")}
            WHERE user_id = ?
        `;
        updateValues.push(userId);

        const [updateResult] = await pool.query(updateUserQuery, updateValues);
        if (updateResult.affectedRows === 0) return null;

        return await this.getUserById(userId);
    }

    static async updatePassword(userId, newPassword) {
        const existingUser = await this.getUserByUserIdIncludingPasswordHash(userId);
        if (!existingUser) return null;

        this.validatePasswordAgainstPolicy(newPassword, {
            emailAddress: existingUser.email,
            fullName: existingUser.full_name,
        });

        const passwordHash = await bcryptjs.hash(String(newPassword), this.bcryptjsSaltRounds);

        const updatePasswordQuery = `
            UPDATE users
            SET password_hash = ?
            WHERE user_id = ?
        `;
        const [updateResult] = await pool.query(updatePasswordQuery, [passwordHash, userId]);

        if (updateResult.affectedRows === 0) return null;
        return await this.getUserById(userId);
    }

    static async deleteUser(userId) {
        const deleteUserQuery = "DELETE FROM users WHERE user_id = ?";
        const [deleteResult] = await pool.query(deleteUserQuery, [userId]);
        return { deleted: deleteResult.affectedRows > 0 };
    }

    // Auth helper
    static async verifyUser(emailAddress, password) {
        const validatedEmailAddress = this.validateEmailAddress(emailAddress);

        const user = await this.getUserByEmailForAuthentication(validatedEmailAddress);

        const dummyPasswordHashForTiming =
            "$2b$12$C6UzMDM.H6dfI/f/IKcEeO4j7Kp6qD0lFQn8yH0Z8H3k1pQpF3VQ2";

        const passwordHashToCompare = user?.password_hash || dummyPasswordHashForTiming;
        const isPasswordValid = await bcryptjs.compare(String(password ?? ""), passwordHashToCompare);

        if (!user || !isPasswordValid) return null;

        return this.removeSensitiveFieldsFromUser(user);
    }
}

export default UserModel;
