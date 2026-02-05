// ============================================
//  Mock Amazon SP-API Data
//  Realistic structure matching actual SP-API responses
// ============================================

const { v4: uuidv4 } = require('uuid');

// Helper function to generate random date in the past 30 days
function randomDate(daysAgo = 30) {
    const date = new Date();
    date.setDate(date.getDate() - Math.floor(Math.random() * daysAgo));
    return date.toISOString();
}

// Helper function to generate random price
function randomPrice(min, max) {
    return (Math.random() * (max - min) + min).toFixed(2);
}

// Mock Orders Data
const mockOrders = [
    {
        AmazonOrderId: '123-4567890-1234567',
        PurchaseDate: randomDate(5),
        LastUpdateDate: randomDate(4),
        OrderStatus: 'Shipped',
        OrderTotal: { Amount: '49.99', CurrencyCode: 'USD' },
        NumberOfItemsShipped: 2,
        NumberOfItemsUnshipped: 0,
        ShipmentServiceLevelCategory: 'Standard',
        OrderType: 'StandardOrder',
        ProductName: 'Wireless Earbuds',
        BuyerName: 'John D.',
        ShippingAddress: {
            City: 'New York',
            StateOrRegion: 'NY',
            PostalCode: '10001',
            CountryCode: 'US'
        }
    },
    {
        AmazonOrderId: '234-5678901-2345678',
        PurchaseDate: randomDate(7),
        LastUpdateDate: randomDate(6),
        OrderStatus: 'Delivered',
        OrderTotal: { Amount: '89.99', CurrencyCode: 'USD' },
        NumberOfItemsShipped: 1,
        NumberOfItemsUnshipped: 0,
        ShipmentServiceLevelCategory: 'Expedited',
        OrderType: 'StandardOrder',
        ProductName: 'Iron Charger',
        BuyerName: 'Sarah M.',
        ShippingAddress: {
            City: 'Los Angeles',
            StateOrRegion: 'CA',
            PostalCode: '90001',
            CountryCode: 'US'
        }
    },
    {
        AmazonOrderId: '345-6789012-3456789',
        PurchaseDate: randomDate(10),
        LastUpdateDate: randomDate(9),
        OrderStatus: 'Pending',
        OrderTotal: { Amount: '129.99', CurrencyCode: 'USD' },
        NumberOfItemsShipped: 0,
        NumberOfItemsUnshipped: 3,
        ShipmentServiceLevelCategory: 'Standard',
        OrderType: 'StandardOrder',
        ProductName: 'K-Beauty Skincare Set',
        BuyerName: 'Emily R.',
        ShippingAddress: {
            City: 'Chicago',
            StateOrRegion: 'IL',
            PostalCode: '60601',
            CountryCode: 'US'
        }
    },
    {
        AmazonOrderId: '456-7890123-4567890',
        PurchaseDate: randomDate(3),
        LastUpdateDate: randomDate(2),
        OrderStatus: 'Shipped',
        OrderTotal: { Amount: '34.99', CurrencyCode: 'USD' },
        NumberOfItemsShipped: 1,
        NumberOfItemsUnshipped: 0,
        ShipmentServiceLevelCategory: 'Standard',
        OrderType: 'StandardOrder',
        ProductName: 'Toner Pack',
        BuyerName: 'Michael B.',
        ShippingAddress: {
            City: 'Seattle',
            StateOrRegion: 'WA',
            PostalCode: '98101',
            CountryCode: 'US'
        }
    },
    {
        AmazonOrderId: '567-8901234-5678901',
        PurchaseDate: randomDate(15),
        LastUpdateDate: randomDate(14),
        OrderStatus: 'Delivered',
        OrderTotal: { Amount: '199.99', CurrencyCode: 'USD' },
        NumberOfItemsShipped: 5,
        NumberOfItemsUnshipped: 0,
        ShipmentServiceLevelCategory: 'Expedited',
        OrderType: 'StandardOrder',
        ProductName: 'Gaming Mouse',
        BuyerName: 'Lisa K.',
        ShippingAddress: {
            City: 'Boston',
            StateOrRegion: 'MA',
            PostalCode: '02101',
            CountryCode: 'US'
        }
    }
];

// Mock Products/Inventory Data
const mockInventory = [
    {
        SKU: 'KBEAUTY-001',
        ProductName: '무궁화 아이패드 (Wireless Earbuds)',
        ASIN: 'B08XYZ1234',
        FulfillableQuantity: 150,
        InboundWorkingQuantity: 50,
        InboundShippedQuantity: 0,
        ReservedQuantity: 12,
        Price: '49.99',
        Status: 'Active'
    },
    {
        SKU: 'KBEAUTY-002',
        ProductName: 'Sheet Mask Pack',
        ASIN: 'B08ABC5678',
        FulfillableQuantity: 45,
        InboundWorkingQuantity: 0,
        InboundShippedQuantity: 100,
        ReservedQuantity: 5,
        Price: '29.99',
        Status: 'Low Stock'
    },
    {
        SKU: 'KBEAUTY-003',
        ProductName: 'K-Beauty Skincare Set',
        ASIN: 'B08DEF9012',
        FulfillableQuantity: 89,
        InboundWorkingQuantity: 20,
        InboundShippedQuantity: 0,
        ReservedQuantity: 8,
        Price: '129.99',
        Status: 'Active'
    },
    {
        SKU: 'KFOOD-001',
        ProductName: 'K-Pop Snack Bundle',
        ASIN: 'B08GHI3456',
        FulfillableQuantity: 8,
        InboundWorkingQuantity: 50,
        InboundShippedQuantity: 0,
        ReservedQuantity: 2,
        Price: '39.99',
        Status: 'Out of Stock'
    }
];

// Mock Shipping/Tracking Data
const mockShipments = [
    {
        TrackingNumber: '#123456 - "Wireless Earbuds"',
        Status: 'Delivered',
        Location: 'New York, NY',
        OrderId: '123-4567890-1234567',
        EstimatedDelivery: randomDate(-2),
        CurrentLocation: 'Delivered'
    },
    {
        TrackingNumber: '#123457 - "K-Beauty Skincare"',
        Status: 'In Transit',
        Location: 'Chicago, IL',
        OrderId: '234-5678901-2345678',
        EstimatedDelivery: randomDate(-1),
        CurrentLocation: 'Chicago, IL - Out for Delivery'
    },
    {
        TrackingNumber: '#123458 - "K-Pop Snacks"',
        Status: 'Processing',
        Location: 'Seattle, WA - FBA Warehouse',
        OrderId: '345-6789012-3456789',
        EstimatedDelivery: randomDate(3),
        CurrentLocation: 'FBA Warehouse - Preparing for shipment'
    }
];

// Mock Financial Data (Revenue, Fees, Profit)
function generateMockFinancials() {
    const totalRevenue = 85300.10;
    const amazonFees = totalRevenue * 0.15; // 15%
    const shippingCosts = totalRevenue * 0.10; // 10%
    const marketingCosts = totalRevenue * 0.05; // 5%
    const totalCosts = amazonFees + shippingCosts + marketingCosts;
    const netProfit = totalRevenue - totalCosts;

    return {
        totalRevenue: totalRevenue.toFixed(2),
        amazonFees: amazonFees.toFixed(2),
        shippingCosts: shippingCosts.toFixed(2),
        marketingCosts: marketingCosts.toFixed(2),
        totalCosts: totalCosts.toFixed(2),
        netProfit: netProfit.toFixed(2),
        profitMargin: ((netProfit / totalRevenue) * 100).toFixed(1)
    };
}

// Mock Revenue Trend (Last 30 Days)
function generateRevenueTrend() {
    const trend = [];
    for (let i = 29; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const revenue = 1500 + Math.random() * 2000; // Random between $1500-$3500

        trend.push({
            date: date.toISOString().split('T')[0],
            revenue: parseFloat(revenue.toFixed(2)),
            orders: Math.floor(revenue / 60) // Average order value ~$60
        });
    }
    return trend;
}

module.exports = {
    mockOrders,
    mockInventory,
    mockShipments,
    generateMockFinancials,
    generateRevenueTrend
};
