// Cloudflare Workers Scheduled Handler (Cron Jobs)
// Path: functions/scheduled.js

export async function onSchedule(event, env, ctx) {
    const { cron, scheduledTime } = event;

    console.log(`⏰ Cron triggered: ${cron} at ${new Date(scheduledTime).toISOString()}`);

    try {
        // Auto-reorder: Daily at midnight (0 0 * * *)
        if (cron === '0 0 * * *') {
            console.log('🔄 Running auto-reorder...');

            // Call auto-reorder function
            const response = await fetch(`https://amazonreach.pages.dev/api/automation/auto-reorder`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });

            const result = await response.json();
            console.log('Auto-reorder result:', result);
        }

        // Weekly report: Monday 9 AM (0 9 * * MON)
        if (cron === '0 9 * * MON' || cron === '0 9 * * 1') {
            console.log('📊 Running weekly report...');

            // Call weekly report function
            const response = await fetch(`https://amazonreach.pages.dev/api/automation/weekly-report`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });

            const result = await response.json();
            console.log('Weekly report result:', result);
        }

        return new Response('Cron job completed', { status: 200 });

    } catch (error) {
        console.error('Cron error:', error);
        return new Response(`Cron job failed: ${error.message}`, { status: 500 });
    }
}
