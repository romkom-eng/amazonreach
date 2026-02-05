// ============================================
// In-Memory User Database (for demo)
// Replace with actual PostgreSQL in production
// ============================================

const bcrypt = require('bcryptjs');

// In-memory users store
const users = [
    {
        id: 1,
        email: 'admin@nextgate.com',
        password_hash: bcrypt.hashSync('Admin@123456', 10),
        name: 'NextGate Admin',
        role: 'admin',
        subscription_status: 'active',
        subscription_plan: 'enterprise',
        created_at: new Date(),
        account_locked: false,
        failed_login_attempts: 0
    }
];

// In-memory audit logs
const auditLogs = [];

let nextUserId = 2;

class Database {
    // ========== User Methods ==========

    async createUser(userData) {
        const { email, password, name, company_name } = userData;

        // Check if user exists
        if (users.find(u => u.email === email)) {
            throw new Error('User with this email already exists');
        }

        // Hash password
        const password_hash = await bcrypt.hash(password, 10);

        // Calculate password expiration (365 days)
        const password_expires_at = new Date();
        password_expires_at.setDate(password_expires_at.getDate() + 365);

        const user = {
            id: nextUserId++,
            email,
            password_hash,
            name: name || email.split('@')[0],
            company_name: company_name || null,
            role: 'user',
            subscription_status: 'inactive', // Requires payment
            subscription_plan: null,
            stripe_customer_id: null,
            subscription_id: null,
            mfa_enabled: false,
            mfa_secret: null,
            account_locked: false,
            failed_login_attempts: 0,
            password_created_at: new Date(),
            password_expires_at,
            last_password_change: new Date(),
            created_at: new Date(),
            updated_at: new Date(),
            last_login: null,
            ip_address: null
        };

        users.push(user);
        return this.sanitizeUser(user);
    }

    async findUserByEmail(email) {
        return users.find(u => u.email === email) || null;
    }

    async findUserById(id) {
        return users.find(u => u.id === id) || null;
    }

    async getAllUsers() {
        return users.map(user => this.sanitizeUser(user));
    }

    async verifyPassword(plainPassword, hashedPassword) {
        return await bcrypt.compare(plainPassword, hashedPassword);
    }

    async updateUser(userId, updates) {
        const userIndex = users.findIndex(u => u.id === userId);
        if (userIndex === -1) {
            throw new Error('User not found');
        }

        users[userIndex] = {
            ...users[userIndex],
            ...updates,
            updated_at: new Date()
        };

        return this.sanitizeUser(users[userIndex]);
    }

    async incrementFailedLogins(userId) {
        const user = await this.findUserById(userId);
        if (!user) return;

        user.failed_login_attempts += 1;
        user.last_failed_login = new Date();

        // Lock account after 5 failed attempts
        if (user.failed_login_attempts >= 5) {
            user.account_locked = true;
        }
    }

    async resetFailedLogins(userId) {
        const user = await this.findUserById(userId);
        if (!user) return;

        user.failed_login_attempts = 0;
        user.last_failed_login = null;
    }

    async updateSubscription(userId, subscriptionData) {
        return await this.updateUser(userId, {
            stripe_customer_id: subscriptionData.customer_id,
            subscription_id: subscriptionData.subscription_id,
            subscription_status: subscriptionData.status,
            subscription_plan: subscriptionData.plan,
            subscription_current_period_end: subscriptionData.current_period_end
        });
    }

    // Remove sensitive fields
    sanitizeUser(user) {
        if (!user) return null;
        const { password_hash, ...sanitized } = user;
        return sanitized;
    }

    // ========== Audit Log Methods ==========

    async createAuditLog(logData) {
        const log = {
            id: auditLogs.length + 1,
            user_id: logData.user_id,
            action: logData.action,
            details: logData.details || null,
            ip_address: logData.ip_address || null,
            user_agent: logData.user_agent || null,
            created_at: new Date()
        };

        auditLogs.push(log);
        return log;
    }

    async getAuditLogs(userId = null, limit = 100) {
        let logs = auditLogs;

        if (userId) {
            logs = logs.filter(l => l.user_id === userId);
        }

        return logs
            .sort((a, b) => b.created_at - a.created_at)
            .slice(0, limit);
    }

    // ========== Password Methods ==========

    isPasswordExpired(user) {
        if (!user.password_expires_at) return false;
        return new Date() > new Date(user.password_expires_at);
    }

    async changePassword(userId, newPassword) {
        const password_hash = await bcrypt.hash(newPassword, 10);

        const password_expires_at = new Date();
        password_expires_at.setDate(password_expires_at.getDate() + 365);

        return await this.updateUser(userId, {
            password_hash,
            password_expires_at,
            last_password_change: new Date()
        });
    }
}

module.exports = new Database();
