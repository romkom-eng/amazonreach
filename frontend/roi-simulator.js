/**
 * AmazonReach ROI Simulator
 * Logic for comparing Case A (Solo Attempt) vs Case B (Expert Co-Pilot)
 */

class ROISimulator {
    constructor() {
        this.BENCHMARKS = {
            AVERAGE_SOLO_AD_WASTE: 2333,
            SOLO_CONVERSION_RATE: 0.03,
            EXPERT_CONVERSION_RATE: 0.12,
            SOLO_FEES_PERCENT: 0.15, // Hidden inefficiencies
            EXPERT_FEES_PERCENT: 0.08, // Optimized fulfillment/categories
            DELAY_REVENUE_LOSS_MULT: 3, // Months of zero revenue for solo
        };
    }

    /**
     * @param {number} estimatedPrice 
     * @param {number} monthlyQuantity 
     */
    calculate(estimatedPrice, monthlyQuantity) {
        const baseRevenue = estimatedPrice * monthlyQuantity;

        // Case A: Solo
        const soloRevenue = baseRevenue * 0.7; // 30% discount for poor SEO/delayed start
        const soloProfit = soloRevenue * (1 - this.BENCHMARKS.SOLO_FEES_PERCENT) - this.BENCHMARKS.AVERAGE_SOLO_AD_WASTE;

        // Case B: Expert
        const expertRevenue = baseRevenue;
        const expertProfit = expertRevenue * (1 - this.BENCHMARKS.EXPERT_FEES_PERCENT); // Ads are optimized out of profit for display simplicity

        const delta = expertProfit - soloProfit;

        return {
            solo: {
                revenue: Math.round(soloRevenue),
                profit: Math.round(soloProfit),
                conversion: (this.BENCHMARKS.SOLO_CONVERSION_RATE * 100) + '%'
            },
            expert: {
                revenue: Math.round(expertRevenue),
                profit: Math.round(expertProfit),
                conversion: (this.BENCHMARKS.EXPERT_CONVERSION_RATE * 100) + '%'
            },
            savings: Math.round(delta)
        };
    }
}

// Export for use in results page if needed
if (typeof window !== 'undefined') {
    window.ROISimulator = new ROISimulator();
}
