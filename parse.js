const fs = require('fs');
try {
    const data = fs.readFileSync('keyword_stats.csv');
    console.log("File read successfully, size:", data.length);
    // Simple heuristic: read as utf-16le using Buffer
    const str = data.toString('utf16le');

    const lines = str.split('\n');
    console.log("Lines found:", lines.length);

    if (lines.length > 2) {
        const header = lines[2].split('\t');
        console.log("Header:", header.join(', '));

        // Find column indices
        let keywordIdx = -1, volumeIdx = -1, compIdx = -1;
        header.forEach((col, i) => {
            const lower = col.toLowerCase();
            if (lower.includes('keyword')) keywordIdx = i;
            else if (lower.includes('volume') || lower.includes('searches')) volumeIdx = i;
            else if (lower.includes('competition') && !lower.includes('index')) compIdx = i;
        });

        console.log(`Indices: KW=${keywordIdx}, VOL=${volumeIdx}, COMP=${compIdx}`);

        const results = [];
        for (let i = 3; i < lines.length; i++) {
            const parts = lines[i].split('\t');
            if (parts.length > Math.max(keywordIdx, volumeIdx, compIdx)) {
                const kw = parts[keywordIdx];
                const comp = parts[compIdx] ? parts[compIdx].trim() : '';
                const volStr = parts[volumeIdx] ? parts[volumeIdx].replace(/,/g, '').replace(/"/g, '').trim() : '';
                const vol = parseInt(volStr, 10) || 0;

                if (vol >= 100) {
                    results.push({ kw, vol, comp });
                }
            }
        }

        // Low/Medium competition filter
        const lowMed = results.filter(r => r.comp === 'Low' || r.comp === 'Medium');
        lowMed.sort((a, b) => b.vol - a.vol);

        let outMd = "## Recommended Top Targets (Low/Med Competition)\n\n";
        lowMed.slice(0, 30).forEach(r => {
            outMd += `- **${r.kw}** (Volume: ${r.vol}, Competition: ${r.comp})\n`;
        });

        // High competition fallback
        results.sort((a, b) => b.vol - a.vol);
        outMd += "\n## Top Targets (All Competition)\n\n";
        results.slice(0, 20).forEach(r => {
            outMd += `- **${r.kw}** (Volume: ${r.vol}, Competition: ${r.comp})\n`;
        });

        fs.writeFileSync('top_keywords.md', outMd, 'utf8');
        console.log("Successfully wrote top_keywords.md");
    }

} catch (e) {
    console.error("Error reading file:", e);
}
