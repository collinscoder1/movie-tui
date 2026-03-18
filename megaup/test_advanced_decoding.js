// Advanced decoding tests for Megaup URL extraction
// Trying to figure out what transformation is applied after base64 decoding

const fs = require('fs');

/**
 * Convert URL-safe base64 to standard base64 and add padding
 */
function prepareBase64(urlSafeStr) {
    let standard = urlSafeStr
        .replace(/-/g, '+')
        .replace(/_/g, '/');
    const paddingNeeded = (4 - (standard.length % 4)) % 4;
    return standard + '='.repeat(paddingNeeded);
}

/**
 * Try various decoding strategies after base64
 */
function tryDecodingStrategies(base64Data) {
    const rawBytes = Buffer.from(base64Data, 'base64');
    const results = {};
    
    // 1. Direct UTF-8 (already tried, gives garbage)
    try {
        results.utf8 = rawBytes.toString('utf8');
    } catch (e) {
        results.utf8 = null;
    }
    
    // 2. Latin-1
    try {
        results.latin1 = rawBytes.toString('latin1');
    } catch (e) {
        results.latin1 = null;
    }
    
    // 3. Try as hex
    results.hex = rawBytes.toString('hex');
    
    // 4. Try XOR with single byte keys (common obfuscation)
    for (let key = 0; key < 256; key++) {
        const xored = Buffer.alloc(rawBytes.length);
        for (let i = 0; i < rawBytes.length; i++) {
            xored[i] = rawBytes[i] ^ key;
        }
        // Check if result looks like a URL (starts with http)
        const asString = xored.toString('utf8');
        if (asString.startsWith('http://') || asString.startsWith('https://')) {
            results[`xor_0x${key.toString(16).padStart(2, '0')}`] = asString;
            break; // Found one, no need to check others for now
        }
    }
    
    // 5. Try XOR with two-byte key (repeating)
    for (let key1 = 0; key1 < 256; key1++) {
        for (let key2 = 0; key2 < 256; key2++) {
            const xored = Buffer.alloc(rawBytes.length);
            for (let i = 0; i < rawBytes.length; i++) {
                xored[i] = rawBytes[i] ^ ((i % 2 === 0) ? key1 : key2);
            }
            const asString = xored.toString('utf8');
            if (asString.startsWith('http://') || asString.startsWith('https://')) {
                results[`xor2_0x${key1.toString(16).padStart(2, '0')}_0x${key2.toString(16).padStart(2, '0')}`] = asString;
                break;
            }
        }
        if (results[`xor2_0x${key1.toString(16).padStart(2, '0')}_0x00`]) break;
    }
    
    // 6. Try subtracting byte values
    for (let key = 0; key < 256; key++) {
        const subtracted = Buffer.alloc(rawBytes.length);
        for (let i = 0; i < rawBytes.length; i++) {
            subtracted[i] = (rawBytes[i] - key + 256) % 256;
        }
        const asString = subtracted.toString('utf8');
        if (asString.startsWith('http://') || asString.startsWith('https://')) {
            results[`sub_0x${key.toString(16).padStart(2, '0')}`] = asString;
            break;
        }
    }
    
    return results;
}

// Test with our sample data
const sampleDataUrl = 'kkA4ebKVU7KXlSMjyLThtam3OgCEmN7OLmND8w5UmXjnPNnhrEx3GmNPIp_k_buYSedi8fUutBwT5yDZqf7sJaeCIFTauVyqcNbTMXk4-do0hLJwAsMdDiYDfQqDUvSbjiS8A1jgi50N4DLRGyYmdOrDEa54RJHM3DUXGikwvmNNjrRE5-zCfLG-6TYFxBvdm99N1BSAHzwq4qwOKtmJjiIV9ZlnOC665I0-YezU0SjG3NzbTdc5o_a8vVgbURsRHx3K4c-_i3wDsXX-QVT5pmnFx0NlytMIgpilR-JbiJWssT3lk0s3se3-UXj8MTbFIxq-SIWgErOdPsqc';

console.log('=== Advanced Megaup Decoding Tests ===\n');

const base64Prepared = prepareBase64(sampleDataUrl);
console.log(`Prepared base64 (${base64Prepared.length} chars): ${base64Prepared.substring(0, 50)}...`);

const results = tryDecodingStrategies(base64Prepared);

// Check if we found any promising results
const urlResults = Object.keys(results).filter(key => 
    results[key] && 
    (results[key].startsWith('http://') || results[key].startsWith('https://'))
);

if (urlResults.length > 0) {
    console.log(`\n✓ Found ${urlResults.length} potential URL decoding strategies:\n`);
    urlResults.forEach(key => {
        console.log(`${key}:`);
        console.log(`  ${results[key]}\n`);
    });
} else {
    console.log('\n✗ No obvious URL patterns found with simple XOR/subtraction');
    
    // Let's see what we DO get - maybe it's partially obfuscated
    const rawBytes = Buffer.from(base64Prepared, 'base64');
    console.log(`\nRaw decoded bytes (${rawBytes.length}):`);
    console.log(`  First 20 bytes as hex: ${rawBytes.slice(0, 20).toString('hex')}`);
    console.log(`  First 20 bytes as decimal: ${Array.from(rawBytes.slice(0, 20))}`);
    
    // Check if there are patterns
    console.log(`\nByte analysis:`);
    console.log(`  Min byte value: ${Math.min(...rawBytes)}`);
    console.log(`  Max byte value: ${Math.max(...rawBytes)}`);
    console.log(`  Mean byte value: ${rawBytes.reduce((a, b) => a + b, 0) / rawBytes.length}`);
    
    // Try to see if it looks like it's been XOR'ed with something
    // If we XOR with the right key, we should get more printable characters
    let bestKey = 0;
    let maxPrintable = 0;
    
    for (let key = 0; key < 256; key++) {
        let printableCount = 0;
        for (let i = 0; i < Math.min(rawBytes.length, 1000); i++) { // Check first 1000 bytes
            const byte = (rawBytes[i] ^ key);
            if ((byte >= 32 && byte <= 126) || byte === 10 || byte === 13) { // Printable ASCII + newline/CR
                printableCount++;
            }
        }
        if (printableCount > maxPrintable) {
            maxPrintable = printableCount;
            bestKey = key;
        }
    }
    
    console.log(`\nBest single-byte XOR key for printable chars: 0x${bestKey.toString(16).padStart(2, '0')} (${bestKey})`);
    console.log(`  Printable chars in first 1000 bytes: ${maxPrintable}/1000`);
    
    if (maxPrintable > 800) { // If we found a good key
        const bestDecoded = Buffer.alloc(rawBytes.length);
        for (let i = 0; i < rawBytes.length; i++) {
            bestDecoded[i] = rawBytes[i] ^ bestKey;
        }
        const asString = bestDecoded.toString('utf8');
        console.log(`\nDecoded with key 0x${bestKey.toString(16).padStart(2, '0')}:`);
        console.log(`  First 200 chars: ${asString.substring(0, 200)}`);
        
        // Check if it looks like a URL now
        if (asString.startsWith('http://') || asString.startsWith('https://')) {
            console.log(`  ✓ Looks like a URL!`);
        } else if (asString.includes('.mp4') || asString.includes('.mkv') || asString.includes('.avi')) {
            console.log(`  ! Contains video extension`);
        }
    }
}

console.log('\n=== Next Steps ===');
console.log('The fact that simple base64 decoding gives binary data suggests:');
console.log('1. There is likely an additional XOR or similar transformation');
console.log('2. The key might be derived from the video ID or other metadata');
console.log('3. The obfuscated JavaScript in Megaup\'s files contains this logic');
console.log('');
console.log('To get the exact algorithm:');
console.log('- Browser devtools approach: breakpoint on data-url access');
console.log('- Trace the actual decoding function when user clicks resolution');
console.log('- This is more reliable than trying to deobfuscate the JavaScript statically');