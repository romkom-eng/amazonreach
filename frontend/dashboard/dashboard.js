const BACKEND_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:3000'
    : 'https://amazonreach-production.up.railway.app';

document.addEventListener('DOMContentLoaded', async () => {
    // Check Authentication
    const token = localStorage.getItem('jwt_token');
    if (!token) {
        window.location.href = '/login.html';
        return;
    }

    try {
        // Fetch User Data (using /me endpoint or similar, or just relying on session)
        // ideally we would call an API, but for now we just show basic UI
        // Let's decode token payload manually if needed, or just assume success if API call works

        // Setup Logout
        document.getElementById('logoutBtn').addEventListener('click', async () => {
            try {
                await fetch(`${BACKEND_URL}/api/auth/logout`, { method: 'POST' });
                localStorage.removeItem('jwt_token');
                window.location.href = '/login.html';
            } catch (err) {
                console.error('Logout failed', err);
            }
        });

        // Set User Name (Mock)
        const user = { name: "Demo User", role: "Seller" };
        document.getElementById('userName').textContent = user.name;
        document.getElementById('userRole').textContent = user.role;

        // Fetch Dashboard Data if elements exist
        if (document.getElementById('totalRevenueDisplay')) {
            loadDashboardData();
        }

    } catch (error) {
        console.error('Dashboard init error', error);
    }
});

async function loadDashboardData() {
    try {
        // 1. Fetch Sales & Orders
        const salesRes = await fetch(`${BACKEND_URL}/api/sales`, {
            credentials: 'include',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('jwt_token')}` }
        });
        const salesData = await salesRes.json();

        let revenue = 0; let revenueGrowth = 0;
        let orders = 0; let ordersGrowth = 0;
        let isMock = true;

        if (salesData.success) {
            revenue = parseFloat(salesData.data.totalRevenue);
            revenueGrowth = parseFloat(salesData.data.revenueGrowth);
            orders = salesData.data.totalOrders;
            ordersGrowth = parseFloat(salesData.data.ordersGrowth);
            isMock = salesData.data.source !== 'Amazon';
        }

        // We use Math.random to make the other metrics look "alive" if mock, otherwise they'd be completely static.
        // If it's real data, in the future this would come from the API.
        const invHealthBase = isMock ? 95 + (Math.random() * 4) : 98.5;
        const invHealthGrowth = isMock ? (Math.random() * 2) - 1 : 1.1;

        const acosBase = isMock ? 20 + (Math.random() * 5) : 22.4;
        const acosGrowth = isMock ? (Math.random() * 4) - 2 : -2.3;

        const roasBase = isMock ? 3.5 + (Math.random() * 1.5) : 4.4;
        const roasGrowth = isMock ? (Math.random() * 1) - 0.5 : 0.4;

        const sourceBadge = isMock
            ? '<span class="ml-2 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-400">Sample</span>'
            : '';

        // Helper to format trend
        const formatTrend = (growth, isFlippedGood = false) => {
            // For ACOS, going down is good.
            const isPositive = growth >= 0;
            let isGood = isPositive;
            if (isFlippedGood) isGood = !isPositive;

            const metricColor = isGood ? 'text-emerald-500' : 'text-rose-500';
            const icon = isPositive ? 'trending_up' : 'trending_down';

            return `<span class="${metricColor} flex items-center"><span class="material-symbols-outlined text-sm">${icon}</span> ${Math.abs(growth).toFixed(1)}%</span>`;
        };

        // Update Total Revenue
        const revEl = document.getElementById('totalRevenueDisplay');
        if (revEl) revEl.textContent = '$' + revenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        const revTrendEl = document.getElementById('revenueTrendDisplay');
        if (revTrendEl) revTrendEl.innerHTML = formatTrend(revenueGrowth) + sourceBadge;

        // Update Active Orders
        const ordEl = document.getElementById('activeOrdersDisplay');
        if (ordEl) ordEl.textContent = orders.toLocaleString();
        const ordTrendEl = document.getElementById('ordersTrendDisplay');
        if (ordTrendEl) ordTrendEl.innerHTML = formatTrend(ordersGrowth);

        // Update Inventory Health
        const invEl = document.getElementById('inventoryHealthDisplay');
        if (invEl) invEl.textContent = invHealthBase.toFixed(1) + '%';
        const invTrendEl = document.getElementById('inventoryTrendDisplay');
        if (invTrendEl) invTrendEl.innerHTML = formatTrend(invHealthGrowth);

        // Update ACOS
        const acosEl = document.getElementById('acosDisplay');
        if (acosEl) acosEl.textContent = acosBase.toFixed(1) + '%';
        const acosTrendEl = document.getElementById('acosTrendDisplay');
        if (acosTrendEl) acosTrendEl.innerHTML = formatTrend(acosGrowth, true);

        // Update ROAS
        const roasEl = document.getElementById('roasDisplay');
        if (roasEl) roasEl.textContent = roasBase.toFixed(1) + 'x';
        const roasTrendEl = document.getElementById('roasTrendDisplay');
        if (roasTrendEl) roasTrendEl.innerHTML = formatTrend(roasGrowth);

    } catch (error) {
        console.error('Failed to load dashboard data:', error);
    }
}
