
const db = require('../database');
const alertSystem = require('../utils/alert');

/**
 * RBAC Middleware
 * @param {string[]} allowedRoles - Array of allowed roles (e.g. ['admin', 'manager'])
 */
function authorize(allowedRoles = []) {
    return async (req, res, next) => {
        // 1. Check if user is authenticated
        if (!req.session.user) {
            return res.status(401).json({
                success: false,
                error: 'Unauthorized: Please login first'
            });
        }

        // 2. Check if user has permission
        if (allowedRoles.length > 0 && !allowedRoles.includes(req.session.user.role?.trim())) {
            // Log unauthorized access attempt
            await db.createAuditLog({
                user_id: req.session.user.id,
                action: 'UNAUTHORIZED_ACCESS',
                details: {
                    resource: req.originalUrl,
                    required_roles: allowedRoles,
                    user_role: req.session.user.role
                },
                ip_address: req.ip,
                user_agent: req.get('User-Agent')
            });

            // Trigger Security Alert
            await alertSystem.sendAlert('UNAUTHORIZED_ACCESS_ATTEMPT', {
                user_id: req.session.user.id,
                email: req.session.user.email,
                role: req.session.user.role,
                target: req.originalUrl,
                ip: req.ip
            });

            return res.status(403).json({
                success: false,
                error: 'Forbidden: Insufficient permissions'
            });
        }

        next();
    };
}

module.exports = authorize;
