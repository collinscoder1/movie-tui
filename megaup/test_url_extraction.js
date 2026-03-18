// Test script to demonstrate Megaup URL extraction process
// Based on analysis of the obfuscated code and HTML structure

/**
 * Hypothesis for Megaup URL extraction:
 * 
 * 1. The data-url attribute contains a URL-safe base64 encoded string
 * 2. The obfuscated JavaScript decodes this string to get the actual download URL
 * 3. The decoding likely involves:
 *    - Converting URL-safe base64 (-_, to +/ )
 *    - Adding padding if needed
 *    - Base64 decoding
 *    - Possibly additional transformations (XOR, etc.)
 */

/**
 * Test if a string looks like the data-url values we saw
 * Example: kkA4ebKVU7KXlSMjyLThtam3OgCEmN7OLmND8w5UmXjnPNnhrEx3GmNPIp_k_buYSedi8fUutBwT5yDZqf7sJaeCIFTauVyqcNbTMXk4-do0hLJwAsMdDiYDfQqDUvSbjiS8A1jgi50N4DLRGyYmdOrDEa54RJHM3DUXGikwvmNNjrRE5-zCfLG-6TYFxBvdm99N1BSAHzwq4qwOKtmJjiIV9ZlnOC665I0-YezU0SjG3NzbTdc5o_a8vVgbURsRHx3K4c-_i3wDsXX-QVT5pmnFx0NlytMIgpilR-JbiJWssT3lk0s3se3-UXj8MTbFIxq-SIWgErOdPsqc
 */
function looksLikeMegaupDataUrl(str) {
    // Check if it's URL-safe base64 format (A-Z, a-z, 0-9, -, _, no padding)
    const urlSafeBase64Regex = /^[A-Za-z0-9_-]+$/;
    return urlSafeBase64Regex.test(str) && str.length > 50; // These are quite long
}

/**
 * Convert URL-safe base64 to standard base64
 * URL-safe: - -> +, _ -> /
 * Standard: + -> +, / -> /
 */
function urlSafeToBase64(urlSafeStr) {
    return urlSafeStr
        .replace(/-/g, '+')  // URL-safe - to standard +
        .replace(/_/g, '/'); // URL-safe _ to standard /
}

/**
 * Add padding to base64 string if needed
 * Base64 length should be multiple of 4
 */
 function addBase64Padding(base64Str) {
    const paddingNeeded = (4 - (base64Str.length % 4)) % 4;
    return base64Str + '='.repeat(paddingNeeded);
}

/**
 * Attempt to decode a Megaup data-url value
 * This is a hypothesis based on common patterns
 */
function decodeMegaupDataUrl(encodedUrl) {
    console.log(`Input (${encodedUrl.length} chars): ${encodedUrl.substring(0, 50)}...`);
    
    // Step 1: Convert URL-safe base64 to standard base64
    const standardBase64 = urlSafeToBase64(encodedUrl);
    console.log(`After URL-safe to std conversion: ${standardBase64.substring(0, 50)}...`);
    
    // Step 2: Add padding if needed
    const paddedBase64 = addBase64Padding(standardBase64);
    console.log(`After padding: ${paddedBase64.substring(0, 50)}...`);
    
    // Step 3: Decode base64
    try {
        // Note: In browser, we'd use atob(); in Node.js, we use Buffer
        const decoded = Buffer.from(paddedBase64, 'base64').toString('utf-8');
        console.log(`Decoded (${decoded.length} chars): ${decoded.substring(0, 100)}...`);
        return decoded;
    } catch (e) {
        console.log(`Base64 decoding failed: ${e.message}`);
        
        // Maybe it's not UTF-8? Try as raw bytes or latin1
        try {
            const decodedLatin1 = Buffer.from(paddedBase64, 'base64').toString('latin1');
            console.log(`Decoded as latin1 (${decodedLatin1.length} chars): ${decodedLatin1.substring(0, 100)}...`);
            return decodedLatin1;
        } catch (e2) {
            console.log(`Latin1 decoding also failed: ${e2.message}`);
            return null;
        }
    }
}

// Test with the example from the HTML
const sampleDataUrl = 'kkA4ebKVU7KXlSMjyLThtam3OgCEmN7OLmND8w5UmXjnPNnhrEx3GmNPIp_k_buYSedi8fUutBwT5yDZqf7sJaeCIFTauVyqcNbTMXk4-do0hLJwAsMdDiYDfQqDUvSbjiS8A1jgi50N4DLRGyYmdOrDEa54RJHM3DUXGikwvmNNjrRE5-zCfLG-6TYFxBvdm99N1BSAHzwq4qwOKtmJjiIV9ZlnOC665I0-YezU0SjG3NzbTdc5o_a8vVgbURsRHx3K4c-_i3wDsXX-QVT5pmnFx0NlytMIgpilR-JbiJWssT3lk0s3se3-UXj8MTbFIxq-SIWgErOdPsqc';

console.log('=== Testing Megaup URL Extraction Hypothesis ===\n');

if (looksLikeMegaupDataUrl(sampleDataUrl)) {
    console.log('✓ String matches expected Megaup data-url pattern\n');
    
    const decoded = decodeMegaupDataUrl(sampleDataUrl);
    
    if (decoded) {
        console.log('\n=== Decoding Result ===');
        console.log(`Decoded length: ${decoded.length} characters`);
        
        // Check if the decoded result looks like a URL
        if (decoded.startsWith('http://') || decoded.startsWith('https://')) {
            console.log('✓ Decoded result appears to be a valid URL!');
            console.log(`URL: ${decoded}`);
        } else {
            console.log('? Decoded result does not obviously look like a URL');
            console.log(`First 200 chars: ${decoded.substring(0, 200)}`);
            
            // Try to see if it contains URL-like patterns
            if (decoded.includes('.mp4') || decoded.includes('.mkv') || decoded.includes('.avi') || decoded.includes('.mov')) {
                console.log('! Contains video file extension - might be part of a URL');
            }
            if (decoded.includes('megaup.cc') || decoded.includes('dl.')) {
                console.log('! Contains megaup domain - might be part of a URL');
            }
        }
    } else {
        console.log('\n✗ Failed to decode the data-url value');
    }
} else {
    console.log('✗ String does not match expected Megaup data-url pattern');
}

// Let's also test the other examples from the HTML
const otherUrls = [
    'kkA4ebKVU7KXlSMjyLThtam3OgCEmN7OLmND8w5UmXjnPNnhrEx3GmNPIp_k_buYSedi8fUutBwT5yDZqf7sJaeCIFTauVyqcNbTMXk4-do0hLJwAsMdDiYDfQqDUvSbjiS8A1jgi50N4DLRGyY-dujAHaZ4JpHWgSo9AjxCompI46Nh88i3YLPkvjYRvQzGiolv1xSuaGYuy_4SG_vmriIv7YR2BAul76sybbKpyimY8IDcRtcHp8mv0FwnPhg6Vh28qM7LsglLqGHlQVClg3_8y1Jk_9cpiaOxWPJJpcOnrkr8lk800PX-TSPvHDaUTkW9Scj3N7s',
    'kkA4ebKVU7KXlSMjyLThtam3OgCEmN7OLmND8w5UmXjnPNnhrEx3GmNPIp_k_buYSedi8fUutBwT5yDZqf7sJaeCIFTauVyqcNbTMXk4-do0hLJwAsMdDiYDfQqDUvSbjiS8A1jgi50N4DLRGyYucujAHbp_JpHWgSo9AjxCompI46Nh88i3YLPkvjYRvQzGiolv1xSuaGYuy_4SG_vmriIv7YR2BAul76sybbKpyimY8IDcRtcHp8mv0FwnPhg6Vh28qM7LsglLqGHlQVClg3_8y1Jk_9cpiaOxWPJJpcOnrkr8lk803PT-TSPvHDaUTkW9Scj3N7s'
];

console.log('\n=== Testing Other Examples ===');
otherUrls.forEach((url, index) => {
    console.log(`\n--- Test ${index + 1} ---`);
    if (looksLikeMegaupDataUrl(url)) {
        console.log('✓ Matches pattern');
        const decoded = decodeMegaupDataUrl(url);
        if (decoded && (decoded.startsWith('http://') || decoded.startsWith('https://'))) {
            console.log(`✓ Valid URL: ${decoded.substring(0, 100)}...`);
        }
    }
});

// Let's also check if the decoded results might be the same (different resolutions of same video)
console.log('\n=== Checking if different resolutions decode to similar URLs ===');
const decoded1 = decodeMegaupDataUrl(sampleDataUrl);
const decoded2 = decodeMegaupDataUrl(otherUrls[0]);
const decoded3 = decodeMegaupDataUrl(otherUrls[1]);

if (decoded1 && decoded2 && decoded3) {
    // Simple similarity check - compare first 50 chars
    const sim12 = decoded1.substring(0, 50) === decoded2.substring(0, 50);
    const sim13 = decoded1.substring(0, 50) === decoded3.substring(0, 50);
    const sim23 = decoded2.substring(0, 50) === decoded3.substring(0, 50);
    
    console.log(`First 50 chars match:`);
    console.log(`  URL1 vs URL2: ${sim12 ? 'YES' : 'NO'}`);
    console.log(`  URL1 vs URL3: ${sim13 ? 'YES' : 'NO'}`);
    console.log(`  URL2 vs URL3: ${sim23 ? 'YES' : 'NO'}`);
    
    if (!sim12 || !sim13 || !sim23) {
        console.log('! Different resolutions likely have different URLs (as expected)');
    }
}

console.log('\n=== Summary ===');
console.log('Based on the analysis:');
console.log('1. Megaup stores download URLs in data-url attributes as URL-safe base64');
console.log('2. The obfuscated JavaScript decodes these values');
console.log('3. The decoding likely involves:');
console.log('   - URL-safe base64 to standard base64 conversion');
console.log('   - Base64 decoding');
console.log('   - Possible additional obfuscation (XOR, etc.) that we\'d need to see in action');
console.log('');
console.log('To get the exact decoding algorithm:');
console.log('- Use browser devtools to breakpoint on data-url access');
console.log('- Trace the decoding function when a resolution is clicked');
console.log('- This will reveal the actual transformation steps needed');