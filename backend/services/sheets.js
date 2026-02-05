// Google Sheets Service
// Handles reading/writing to Google Sheets for Helium 10 integration and reporting

const { google } = require('googleapis');

const CREDENTIALS = process.env.GOOGLE_SHEETS_CREDENTIALS ?
    JSON.parse(process.env.GOOGLE_SHEETS_CREDENTIALS) : null;

class SheetsService {
    constructor() {
        this.auth = null;
        this.sheets = null;

        if (CREDENTIALS) {
            this.initAuth();
        }
    }

    async initAuth() {
        try {
            this.auth = new google.auth.GoogleAuth({
                credentials: CREDENTIALS,
                scopes: ['https://www.googleapis.com/auth/spreadsheets']
            });

            this.sheets = google.sheets({ version: 'v4', auth: this.auth });
        } catch (error) {
            console.error('Google Sheets auth failed:', error);
        }
    }

    /**
     * Read data from a sheet
     */
    async readSheet(spreadsheetId, range) {
        if (!this.sheets) {
            throw new Error('Google Sheets not configured');
        }

        try {
            const response = await this.sheets.spreadsheets.values.get({
                spreadsheetId,
                range
            });

            return response.data.values || [];
        } catch (error) {
            console.error('Read sheet error:', error);
            throw error;
        }
    }

    /**
     * Write data to a sheet
     */
    async writeSheet(spreadsheetId, range, values) {
        if (!this.sheets) {
            throw new Error('Google Sheets not configured');
        }

        try {
            await this.sheets.spreadsheets.values.update({
                spreadsheetId,
                range,
                valueInputOption: 'RAW',
                resource: { values }
            });

            return { success: true };
        } catch (error) {
            console.error('Write sheet error:', error);
            throw error;
        }
    }

    /**
     * Append data to a sheet
     */
    async appendSheet(spreadsheetId, range, values) {
        if (!this.sheets) {
            throw new Error('Google Sheets not configured');
        }

        try {
            await this.sheets.spreadsheets.values.append({
                spreadsheetId,
                range,
                valueInputOption: 'RAW',
                resource: { values }
            });

            return { success: true };
        } catch (error) {
            console.error('Append sheet error:', error);
            throw error;
        }
    }

    /**
     * Update weekly report in Google Sheets
     */
    async updateWeeklyReport(spreadsheetId, reportData) {
        const values = [[
            new Date().toISOString().split('T')[0], // Date
            reportData.revenue,
            reportData.orders,
            reportData.roas,
            reportData.topProduct,
            reportData.aiInsights
        ]];

        return await this.appendSheet(
            spreadsheetId,
            'A:F', // Columns A-F
            values
        );
    }

    /**
     * Analyze Helium 10 keywords from sheet
     */
    async analyzeKeywords(spreadsheetId, sheetName = 'Sheet1') {
        // Read keywords from sheet
        const data = await this.readSheet(spreadsheetId, `${sheetName}!A2:D`);

        const keywords = data.map(row => ({
            keyword: row[0],
            searchVolume: parseInt(row[1]) || 0,
            competition: row[2],
            updated: row[3] || ''
        }));

        return keywords;
    }

    /**
     * Write keyword analysis results back to sheet
     */
    async writeKeywordAnalysis(spreadsheetId, sheetName, row, analysis) {
        const values = [[
            analysis.nicheScore,
            analysis.recommendation,
            analysis.relatedKeywords.join(', '),
            new Date().toISOString()
        ]];

        // Write to columns E-H of the specific row
        const range = `${sheetName}!E${row}:H${row}`;
        return await this.writeSheet(spreadsheetId, range, values);
    }
}

module.exports = new SheetsService();
