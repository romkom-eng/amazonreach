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
        // Fetch Sales/Financials
        try {
            const salesRes = await fetch(`${BACKEND_URL}/api/sales`, { credentials: 'include' });
            const salesData = await salesRes.json();

            if (salesData.success) {
                const data = salesData.data;
                const sourceBadge = data.source === 'Amazon' ? '<span class="badge real">Real</span>' : '<span class="badge mock">Sample</span>';

                document.getElementById('totalRevenueDisplay').textContent = '$' + parseFloat(data.totalRevenue).toLocaleString();

                const growthClass = parseFloat(data.revenueGrowth) >= 0 ? 'up' : 'down';
                const growthIcon = parseFloat(data.revenueGrowth) >= 0 ? '↑' : '↓';

                document.getElementById('revenueTrendDisplay').innerHTML = `
                    <span class="${growthClass}">${growthIcon} ${Math.abs(data.revenueGrowth)}%</span> vs last month ${sourceBadge}
                `;
            } else {
                console.warn('Sales API failed:', salesData);
                document.getElementById('totalRevenueDisplay').textContent = 'Error';
                document.getElementById('revenueTrendDisplay').textContent = salesData.error || 'Failed to load';
            }
        } catch (e) {
            console.error('Fetch Sales Error:', e);
            document.getElementById('totalRevenueDisplay').textContent = 'Err: ' + e.message;
        }

        // Fetch Orders for Active Count
        try {
            const ordersRes = await fetch(`${BACKEND_URL}/api/orders?limit=100`, { credentials: 'include' });
            const ordersData = await ordersRes.json();

            // We also need the growth from the Sales API for the total orders card if possible, 
            // but let's just use what we have from the sales call since it already computes it.
            // Actually, let's just reuse the sales data if it's already there.
            const salesRes = await fetch(`${BACKEND_URL}/api/sales`, { credentials: 'include' });
            const salesData = await salesRes.json();
            const ordersGrowth = salesData.success ? salesData.data.ordersGrowth : '0.0';

            if (ordersData.success) {
                const total = ordersData.data.total;
                document.getElementById('activeOrdersDisplay').textContent = total;

                const growthClass = parseFloat(ordersGrowth) >= 0 ? 'up' : 'down';
                const growthIcon = parseFloat(ordersGrowth) >= 0 ? '↑' : '↓';

                document.getElementById('ordersTrendDisplay').innerHTML = `
                    <span class="${growthClass}">${growthIcon} ${Math.abs(ordersGrowth)}%</span> vs last month
                `;
            } else {
                console.warn('Orders API failed:', ordersData);
                document.getElementById('activeOrdersDisplay').textContent = 'Error';
                document.getElementById('ordersTrendDisplay').textContent = ordersData.error || 'Failed to load';
            }
        } catch (e) {
            console.error('Fetch Orders Error:', e);
            document.getElementById('activeOrdersDisplay').textContent = 'Err: ' + e.message;
        }

        // Inventory Health (Placeholder logic until we have better metrics)
        const invDisplay = document.getElementById('inventoryHealthDisplay');
        if (invDisplay) {
            invDisplay.textContent = '98.5%';
            document.getElementById('inventoryTrendDisplay').innerHTML = `<span>-</span> Stable`;
        }

    } catch (error) {
        console.error('Failed to load dashboard data:', error);
    }
}
