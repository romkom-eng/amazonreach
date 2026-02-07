// ============================================
// Real Database (Firebase Firestore)
// ============================================

const bcrypt = require('bcryptjs');
const { db } = require('./firebase');
const USERS_COLLECTION = 'users';
const AUDIT_COLLECTION = 'audit_logs';

class Database {
    // ========== User Methods ==========

    async createUser(userData) {
        const { email, password, name, company_name } = userData;

        // Check if user exists
        const existingUser = await this.findUserByEmail(email);
        if (existingUser) {
            throw new Error('User with this email already exists');
        }

        // Hash password
        const password_hash = await bcrypt.hash(password, 10);

        // Calculate password expiration (365 days)
        const password_expires_at = new Date();
        password_expires_at.setDate(password_expires_at.getDate() + 365);

        const newUser = {
            email,
            password_hash,
            name: name || email.split('@')[0],
            company_name: company_name || null,
            role: 'user',
            subscription_status: 'active', // Default to active (Free Trial)
            subscription_plan: 'free_trial',
            stripe_customer_id: null,
            subscription_id: null,
            mfa_enabled: false,
            mfa_secret: null,
            account_locked: false,
            failed_login_attempts: 0,
            password_created_at: new Date().toISOString(),
            password_expires_at: password_expires_at.toISOString(),
            last_password_change: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            last_login: null,
            ip_address: null
        };

        // Add to Firestore
        const docRef = await db.collection(USERS_COLLECTION).add(newUser);

        // Return user with ID
        return { id: docRef.id, ...newUser };
    }

    async findUserByEmail(email) {
        const snapshot = await db.collection(USERS_COLLECTION).where('email', '==', email).limit(1).get();
        if (snapshot.empty) return null;

        const doc = snapshot.docs[0];
        return { id: doc.id, ...doc.data() };
    }

    async findUserById(id) {
        const doc = await db.collection(USERS_COLLECTION).doc(id).get();
        if (!doc.exists) return null;
        return { id: doc.id, ...doc.data() };
    }

    async getAllUsers() {
        const snapshot = await db.collection(USERS_COLLECTION).get();
        return snapshot.docs.map(doc => this.sanitizeUser({ id: doc.id, ...doc.data() }));
    }

    async verifyPassword(plainPassword, hashedPassword) {
        return await bcrypt.compare(plainPassword, hashedPassword);
    }

    async updateUser(userId, updates) {
        // Update timestamp
        const finalUpdates = {
            ...updates,
            updated_at: new Date().toISOString()
        };

        await db.collection(USERS_COLLECTION).doc(userId).update(finalUpdates);
        return this.findUserById(userId);
    }

    async incrementFailedLogins(userId) {
        const user = await this.findUserById(userId);
        if (!user) return;

        let failedAttempts = (user.failed_login_attempts || 0) + 1;
        let accountLocked = user.account_locked;

        if (failedAttempts >= 5) {
            accountLocked = true;
        }

        await this.updateUser(userId, {
            failed_login_attempts: failedAttempts,
            last_failed_login: new Date().toISOString(),
            account_locked: accountLocked
        });
    }

    async resetFailedLogins(userId) {
        await this.updateUser(userId, {
            failed_login_attempts: 0,
            last_failed_login: null
        });
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

    sanitizeUser(user) {
        if (!user) return null;
        const { password_hash, ...sanitized } = user;
        // Convert Firestore Timestamps to Dates if needed, but we stored ISO strings above
        return sanitized;
    }

    // ========== Audit Log Methods ==========

    async createAuditLog(logData) {
        const log = {
            user_id: logData.user_id,
            action: logData.action,
            details: logData.details || null,
            ip_address: logData.ip_address || null,
            user_agent: logData.user_agent || null,
            created_at: new Date().toISOString()
        };

        const docRef = await db.collection(AUDIT_COLLECTION).add(log);
        return { id: docRef.id, ...log };
    }

    async getAuditLogs(userId = null, limit = 100) {
        let query = db.collection(AUDIT_COLLECTION).orderBy('created_at', 'desc').limit(limit);

        if (userId) {
            query = query.where('user_id', '==', userId);
        }

        const snapshot = await query.get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
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
            password_expires_at: password_expires_at.toISOString(),
            last_password_change: new Date().toISOString()
        });
    }
}

module.exports = new Database();
