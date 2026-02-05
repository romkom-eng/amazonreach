// Shipment Tracking Service
// Integrates with AfterShip or direct carrier APIs

const AFTERSHIP_API_KEY = process.env.AFTERSHIP_API_KEY || '';

class TrackingService {
    constructor() {
        this.apiKey = AFTERSHIP_API_KEY;
        this.baseUrl = 'https://api.aftership.com/v4';
    }

    /**
     * Track a shipment by tracking number
     */
    async trackShipment(trackingNumber, carrier = null) {
        if (!this.apiKey) {
            // Fallback: return mock data for demo
            return {
                success: true,
                status: 'In Transit',
                location: 'Los Angeles, CA',
                estimatedDelivery: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toDateString(),
                events: [
                    {
                        date: new Date().toISOString(),
                        status: 'In Transit',
                        location: 'Los Angeles, CA'
                    }
                ]
            };
        }

        try {
            const url = carrier
                ? `${this.baseUrl}/trackings/${carrier}/${trackingNumber}`
                : `${this.baseUrl}/trackings/${trackingNumber}`;

            const response = await fetch(url, {
                headers: {
                    'aftership-api-key': this.apiKey,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Tracking not found');
            }

            const data = await response.json();
            const tracking = data.data.tracking;

            return {
                success: true,
                status: tracking.tag,
                location: tracking.checkpoints[0]?.city || 'Unknown',
                estimatedDelivery: tracking.expected_delivery || 'Unknown',
                events: tracking.checkpoints.map(cp => ({
                    date: cp.checkpoint_time,
                    status: cp.message,
                    location: `${cp.city}, ${cp.state || cp.country_name}`
                }))
            };
        } catch (error) {
            console.error('Tracking error:', error);
            return {
                success: false,
                error: 'Unable to track shipment'
            };
        }
    }

    /**
     * Extract tracking number from message
     */
    extractTrackingNumber(message) {
        // Common tracking number patterns
        const patterns = [
            /\b(1Z[0-9A-Z]{16})\b/i, // UPS
            /\b(\d{12,15})\b/, // FedEx
            /\b(\d{20,22})\b/, // USPS
            /#(\d{10,})/  // Order number with #
        ];

        for (const pattern of patterns) {
            const match = message.match(pattern);
            if (match) {
                return match[1];
            }
        }

        return null;
    }

    /**
     * Generate human-readable tracking response
     */
    formatTrackingResponse(trackingData) {
        if (!trackingData.success) {
            return "I couldn't find tracking information for that shipment. Please check the tracking number and try again.";
        }

        let response = `Your package is currently **${trackingData.status}**. `;

        if (trackingData.location && trackingData.location !== 'Unknown') {
            response += `It's currently in ${trackingData.location}. `;
        }

        if (trackingData.estimatedDelivery && trackingData.estimatedDelivery !== 'Unknown') {
            response += `Estimated delivery: ${trackingData.estimatedDelivery}.`;
        }

        // Add latest event
        if (trackingData.events && trackingData.events.length > 0) {
            const latest = trackingData.events[0];
            response += `\n\nLatest update: ${latest.status} in ${latest.location}`;
        }

        return response;
    }
}

module.exports = new TrackingService();
