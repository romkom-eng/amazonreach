// Pricing Calculator Service
// Calculates optimal prices across marketplaces while maintaining margins

class PricingService {
    constructor() {
        // Marketplace fee structures
        this.fees = {
            shopify: {
                transactionFee: 0.029, // 2.9%
                fixedFee: 0.30
            },
            amazon: {
                referralFee: 0.15, // 15% (varies by category)
                fbaFee: 3.00, // Varies by size/weight
                storageFee: 0.75 // per cubic foot per month
            },
            ebay: {
                finalValueFee: 0.129, // 12.9%
                listingFee: 0.35
            },
            walmart: {
                referralFee: 0.15
            }
        };
    }

    /**
     * Calculate selling price to maintain target margin
     */
    calculatePrice(cost, targetMargin, marketplace, options = {}) {
        const fees = this.fees[marketplace.toLowerCase()];

        if (!fees) {
            throw new Error(`Unknown marketplace: ${marketplace}`);
        }

        let price;

        switch (marketplace.toLowerCase()) {
            case 'shopify':
                // price * (1 - margin) - (price * transFee + fixedFee) = cost
                // Solve for price
                price = (cost + fees.fixedFee) / (1 - targetMargin - fees.transactionFee);
                break;

            case 'amazon':
                const fbaFee = options.fbaFee || fees.fbaFee;
                // price * (1 - margin - refFee) - fbaFee = cost
                price = (cost + fbaFee) / (1 - targetMargin - fees.referralFee);
                break;

            case 'ebay':
                // price * (1 - margin - finalValueFee) - listingFee = cost
                price = (cost + fees.listingFee) / (1 - targetMargin - fees.finalValueFee);
                break;

            case 'walmart':
                // price * (1 - margin - refFee) = cost
                price = cost / (1 - targetMargin - fees.referralFee);
                break;

            default:
                price = cost / (1 - targetMargin);
        }

        // Round to 2 decimals
        return Math.round(price * 100) / 100;
    }

    /**
     * Calculate all marketplace prices from a base price
     */
    calculateMultiChannelPrices(cost, targetMargin, basePrice = null) {
        const prices = {};

        // If base price provided, calculate target margin
        if (basePrice) {
            // Assuming base is Shopify
            const actualMargin = (basePrice - cost - this.fees.shopify.fixedFee) / basePrice - this.fees.shopify.transactionFee;
            targetMargin = actualMargin;
        }

        for (const marketplace of ['shopify', 'amazon', 'ebay', 'walmart']) {
            prices[marketplace] = this.calculatePrice(cost, targetMargin, marketplace);
        }

        return prices;
    }

    /**
     * Verify if price maintains minimum margin
     */
    verifyMargin(price, cost, marketplace) {
        const fees = this.fees[marketplace.toLowerCase()];
        let actualMargin;

        switch (marketplace.toLowerCase()) {
            case 'shopify':
                const netRevenue = price - (price * fees.transactionFee + fees.fixedFee);
                actualMargin = (netRevenue - cost) / price;
                break;

            case 'amazon':
                const netAfterFees = price * (1 - fees.referralFee) - fees.fbaFee;
                actualMargin = (netAfterFees - cost) / price;
                break;

            case 'ebay':
                const netEbay = price * (1 - fees.finalValueFee) - fees.listingFee;
                actualMargin = (netEbay - cost) / price;
                break;

            case 'walmart':
                const netWalmart = price * (1 - fees.referralFee);
                actualMargin = (netWalmart - cost) / price;
                break;

            default:
                actualMargin = (price - cost) / price;
        }

        return {
            actualMargin: Math.round(actualMargin * 10000) / 100, // percentage
            meetsTarget: actualMargin >= 0.25 // 25% minimum
        };
    }

    /**
     * Sync prices across platforms
     */
    syncPrices(newPrice, cost, sourceMarketplace) {
        // Calculate margin from source marketplace
        const marginCheck = this.verifyMargin(newPrice, cost, sourceMarketplace);
        const targetMargin = marginCheck.actualMargin / 100;

        // Calculate equivalent prices for other marketplaces
        const syncedPrices = this.calculateMultiChannelPrices(cost, targetMargin);

        return {
            sourceMarketplace,
            sourcePrice: newPrice,
            targetMargin: Math.round(targetMargin * 100), // percentage
            syncedPrices
        };
    }
}

module.exports = new PricingService();
