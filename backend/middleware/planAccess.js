// Plan Access Middleware
// Restricts API access based on user's subscription plan

const PLAN_HIERARCHY = {
    starter: 1,
    professional: 2,
    enterprise: 3
};

const PLAN_LIMITS = {
    starter: {
        monthlyRevenueLimit: 10000,
        marketplaceIntegrations: 1,
        teamMembers: 1,
        apiAccess: false,
        features: {
            basicAnalytics: true,
            advancedAnalytics: false,
            forecasting: false,
            export: false,
            aiInventory: false,
            prioritySupport: false,
            customIntegrations: false,
            whiteLabel: false
        }
    },
    professional: {
        monthlyRevenueLimit: 100000,
        marketplaceIntegrations: Infinity,
        teamMembers: 5,
        apiAccess: true,
        features: {
            basicAnalytics: true,
            advancedAnalytics: true,
            forecasting: true,
            export: true,
            aiInventory: true,
            prioritySupport: true,
            customIntegrations: false,
            whiteLabel: false
        }
    },
    enterprise: {
        monthlyRevenueLimit: Infinity,
        marketplaceIntegrations: Infinity,
        teamMembers: Infinity,
        apiAccess: true,
        features: {
            basicAnalytics: true,
            advancedAnalytics: true,
            forecasting: true,
            export: true,
            aiInventory: true,
            prioritySupport: true,
            customIntegrations: true,
            whiteLabel: true
        }
    }
};

/**
 * Middleware to require minimum plan level
 * @param {string} minPlan - Minimum required plan ('starter', 'professional', 'enterprise')
 */
function requirePlan(minPlan) {
    return (req, res, next) => {
        const user = req.user;

        if (!user) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required'
            });
        }

        const userPlan = user.plan || 'starter';
        const userLevel = PLAN_HIERARCHY[userPlan] || 1;
        const requiredLevel = PLAN_HIERARCHY[minPlan] || 1;

        if (userLevel >= requiredLevel) {
            return next();
        }

        return res.status(403).json({
            success: false,
            error: 'Upgrade required',
            message: `This feature requires ${minPlan} plan or higher`,
            currentPlan: userPlan,
            requiredPlan: minPlan,
            upgradeUrl: '/pricing'
        });
    };
}

/**
 * Middleware to check if user has specific feature access
 * @param {string} featureName - Name of the feature to check
 */
function requireFeature(featureName) {
    return (req, res, next) => {
        const user = req.user;

        if (!user) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required'
            });
        }

        const userPlan = user.plan || 'starter';
        const planLimits = PLAN_LIMITS[userPlan];

        if (planLimits && planLimits.features[featureName]) {
            return next();
        }

        // Find which plan has this feature
        const requiredPlan = Object.keys(PLAN_LIMITS).find(plan =>
            PLAN_LIMITS[plan].features[featureName]
        );

        return res.status(403).json({
            success: false,
            error: 'Feature not available',
            message: `This feature requires ${requiredPlan} plan or higher`,
            currentPlan: userPlan,
            requiredPlan: requiredPlan,
            upgradeUrl: '/pricing'
        });
    };
}

/**
 * Check marketplace integration limit
 */
function checkIntegrationLimit(req, res, next) {
    const user = req.user;

    if (!user) {
        return res.status(401).json({
            success: false,
            error: 'Authentication required'
        });
    }

    const userPlan = user.plan || 'starter';
    const planLimits = PLAN_LIMITS[userPlan];
    const currentIntegrations = user.marketplaceIntegrations?.length || 0;

    if (currentIntegrations >= planLimits.marketplaceIntegrations) {
        return res.status(403).json({
            success: false,
            error: 'Integration limit reached',
            message: `Your ${userPlan} plan allows ${planLimits.marketplaceIntegrations} marketplace integration(s)`,
            currentIntegrations,
            limit: planLimits.marketplaceIntegrations,
            upgradeUrl: '/pricing'
        });
    }

    next();
}

/**
 * Check revenue limit
 */
function checkRevenueLimit(req, res, next) {
    const user = req.user;

    if (!user) {
        return res.status(401).json({
            success: false,
            error: 'Authentication required'
        });
    }

    const userPlan = user.plan || 'starter';
    const planLimits = PLAN_LIMITS[userPlan];
    const currentRevenue = user.revenueThisMonth || 0;

    if (currentRevenue >= planLimits.monthlyRevenueLimit) {
        return res.status(403).json({
            success: false,
            error: 'Revenue limit reached',
            message: `Your ${userPlan} plan has a $${planLimits.monthlyRevenueLimit.toLocaleString()} monthly revenue limit`,
            currentRevenue,
            limit: planLimits.monthlyRevenueLimit,
            upgradeUrl: '/pricing'
        });
    }

    next();
}

/**
 * Get plan limits for a specific plan
 */
function getPlanLimits(plan) {
    return PLAN_LIMITS[plan] || PLAN_LIMITS.starter;
}

module.exports = {
    requirePlan,
    requireFeature,
    checkIntegrationLimit,
    checkRevenueLimit,
    getPlanLimits,
    PLAN_HIERARCHY,
    PLAN_LIMITS
};
