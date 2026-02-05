// Slack Service
// Sends notifications to Slack channels

const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL || '';

class SlackService {
    constructor() {
        this.webhookUrl = SLACK_WEBHOOK_URL;
    }

    /**
     * Send a simple message to Slack
     */
    async sendMessage(text, attachments = []) {
        if (!this.webhookUrl) {
            console.warn('Slack webhook not configured, message not sent');
            return { success: false, error: 'Slack not configured' };
        }

        try {
            const response = await fetch(this.webhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    text,
                    attachments
                })
            });

            if (response.ok) {
                return { success: true };
            } else {
                const error = await response.text();
                throw new Error(`Slack error: ${error}`);
            }
        } catch (error) {
            console.error('Slack send error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Send weekly report to Slack
     */
    async sendWeeklyReport(reportData) {
        const trend = reportData.trend > 0 ? ':chart_with_upwards_trend:' : ':chart_with_downwards_trend:';

        return await this.sendMessage(
            `📊 *Weekly Performance Report* - ${reportData.period}`,
            [
                {
                    color: '#6366F1',
                    fields: [
                        {
                            title: 'Total Revenue',
                            value: `$${reportData.revenue.toLocaleString()}`,
                            short: true
                        },
                        {
                            title: 'Orders',
                            value: reportData.orders.toString(),
                            short: true
                        },
                        {
                            title: 'ROAS',
                            value: `${reportData.roas}x`,
                            short: true
                        },
                        {
                            title: 'Top Product',
                            value: reportData.topProduct,
                            short: true
                        }
                    ]
                },
                {
                    color: '#10B981',
                    title: '🤖 AI Insights',
                    text: reportData.aiInsights,
                    footer: 'Powered by AmazonReach AI',
                    footer_icon: 'https://amazonreach.vercel.app/favicon.ico'
                }
            ]
        );
    }

    /**
     * Send auto-reorder notification
     */
    async sendReorderAlert(product, quantity, supplierEmail) {
        return await this.sendMessage(
            `🔄 *Auto-Reorder Triggered*`,
            [{
                color: '#F59E0B',
                fields: [
                    {
                        title: 'Product',
                        value: `${product.name} (SKU: ${product.sku})`,
                        short: false
                    },
                    {
                        title: 'Quantity',
                        value: `${quantity} units`,
                        short: true
                    },
                    {
                        title: 'Supplier',
                        value: supplierEmail,
                        short: true
                    },
                    {
                        title: 'Reason',
                        value: 'Predicted stockout within 7 days',
                        short: false
                    }
                ],
                footer: 'AmazonReach Auto-Reorder System'
            }]
        );
    }

    /**
     * Send low stock alert
     */
    async sendLowStockAlert(products) {
        const productList = products.map(p =>
            `• ${p.name}: ${p.daysRemaining} days remaining`
        ).join('\n');

        return await this.sendMessage(
            `⚠️ *Low Stock Alert*`,
            [{
                color: '#EF4444',
                text: `The following products are running low:\n\n${productList}`,
                footer: 'AmazonReach Inventory Management'
            }]
        );
    }

    /**
     * Send customer support escalation
     */
    async sendSupportEscalation(ticket) {
        return await this.sendMessage(
            `🆘 *Support Escalation*`,
            [{
                color: '#8B5CF6',
                fields: [
                    {
                        title: 'Subject',
                        value: ticket.subject,
                        short: false
                    },
                    {
                        title: 'Customer',
                        value: ticket.userEmail,
                        short: true
                    },
                    {
                        title: 'Priority',
                        value: ticket.priority.toUpperCase(),
                        short: true
                    },
                    {
                        title: 'Message',
                        value: ticket.message,
                        short: false
                    }
                ],
                footer: 'AI could not auto-resolve this issue'
            }]
        );
    }
}

module.exports = new SlackService();
