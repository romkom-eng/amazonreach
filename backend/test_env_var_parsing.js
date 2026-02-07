const serviceAccount = require('./serviceAccountKey.json');

// Simulate what the user might have pasted (valid JSON)
const validEnvVar = JSON.stringify(serviceAccount);

// Simulate invalid JSON (e.g. just a string or missing braces)
const invalidEnvVar = "backend/serviceAccountKey.json";

console.log("--- Test 1: Valid JSON ---");
try {
    const parsed = JSON.parse(validEnvVar);
    console.log("✅ Parsed successfully. Project ID:", parsed.project_id);
} catch (e) {
    console.error("❌ Failed to parse valid JSON");
}

console.log("\n--- Test 2: Invalid JSON (Path String) ---");
try {
    const parsed = JSON.parse(invalidEnvVar);
    console.log("✅ Parsed successfully???");
} catch (e) {
    console.error("❌ Failed to parse invalid JSON (Expected behavior). Error:", e.message);
}
