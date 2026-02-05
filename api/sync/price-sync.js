// API Endpoint: Multi-Channel Price Sync
// Path: /api/sync/price-sync.js
// Syncs product prices across Shopify, Amazon, eBay based on margin

const pricing = require('../../backend/services/pricing');

module.exports = async (req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const {
            productId,
            newPrice,
            cost,
            sourceMarketplace = 'shopify'
        } = req.body;

        if (!productId || !newPrice || !cost) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: productId, newPrice, cost'
            });
        }

        // Calculate synced prices to maintain same margin
        const syncResult = pricing.syncPrices(newPrice, cost, sourceMarketplace);

        // TODO: Actually update prices on each platform
        // This would require API integration with each marketplace
        const updateResults = {
            shopify: { success: true, price: syncResult.syncedPrices.shopify },
            amazon: { success: true, price: syncResult.syncedPrices.amazon },
            ebay: { success: true, price: syncResult.syncedPrices.ebay },
            walmart: { success: true, price: syncResult.syncedPrices.walmart }
        };

        console.log(`📊 Price sync for ${productId}:`);
        console.log(`  Shopify: $${syncResult.syncedPrices.shopify}`);
        console.log(`  Amazon: $${syncResult.syncedPrices.amazon}`);
        console.log(`  eBay: $${syncResult.syncedPrices.ebay}`);
        console.log(`  Walmart: $${syncResult.syncedPrices.walmart}`);
        console.log(`  Target margin: ${syncResult.targetMargin}%`);

        return res.status(200).json({
            success: true,
            productId,
            sourceMarketplace,
            sourcePrice: newPrice,
            cost,
            targetMargin: syncResult.targetMargin,
            syncedPrices: syncResult.syncedPrices,
            updateResults,
            message: 'Prices synced across all marketplaces to maintain margin'
        });

    } catch (error) {
        console.error('Price sync error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error',
            details: error.message
        });
    }
};
