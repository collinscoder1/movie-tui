// Megaup JavaScript Deobfuscator
// This script attempts to restore the original strings and reveal the actual logic

const fs = require('fs');

function deobfuscateMegaup() {
    console.log('=== Megaup JavaScript Deobfuscator ===\n');
    
    // Read the obfuscated file
    const content = fs.readFileSync('./index.js', 'utf8');
    console.log(`Read ${content.length} characters from index.js\n`);
    
    // Extract the seed value from the outer IIFE
    // Pattern: (function(L,X){...})(vmS,SEED)
    const outerIifeMatch = content.match(/\(function\s*\(L,X\)\s*\{[^}]*\}\)\s*\(([^)]+)\)/);
    if (!outerIifeMatch) {
        console.error('Could not find outer IIFE pattern');
        return;
    }
    
    const args = outerIifeMatch[1].split(',').map(arg => arg.trim());
    const vmSVarName = args[0]; // Should be "vmS"
    const seedValue = parseInt(args[1]); // Should be 0x5c4a2
    
    console.log(`Found outer IIFE:`);
    console.log(`  Array variable: ${vmSVarName}`);
    console.log(`  Seed value: 0x${seedValue.toString(16)} (${seedValue} decimal)\n`);
    
    // Find the vmS array definition
    // Look for: var vmS = [...] or let vmS = [...] or const vmS = [...]
    const vmSPatterns = [
        new RegExp(`(?:var|let|const)\\s+${vmSVarName}\\s*=\\s*(\\[[^\\]]+\\])`, 'g'),
        new RegExp(`${vmSVarName}\\s*=\\s*(\\[[^\\]]+\\])`, 'g')
    ];
    
    let vmSArrayMatch = null;
    for (const pattern of vmSPatterns) {
        const match = content.match(pattern);
        if (match) {
            vmSArrayMatch = match[1]; // Capture the array content
            console.log(`Found ${vmSVarName} definition: ${vmSArrayMatch.substring(0, 100)}...\n`);
            break;
        }
    }
    
    // If not found with standard patterns, look for the long string literal
    // that appears to be the concatenated array elements
    if (!vmSArrayMatch) {
        console.log('Standard vmS definition not found, looking for long string literal...\n');
        
        // The pattern I observed: a very long string literal that seems to be 
        // the concatenation of array elements
        const longStringMatch = content.match(/'([A-Za-z0-9+\/=]{100,})'/);
        if (longStringMatch) {
            vmSArrayMatch = longStringMatch[1];
            console.log(`Found long string literal (${vmSArrayMatch.length} chars)`);
            console.log(`First 100 chars: ${vmSArrayMatch.substring(0, 100)}...\n`);
        } else {
            console.error('Could not find vmS array definition');
            return;
        }
    }
    
    // Parse the vmS array - this is tricky because it might be obfuscated too
    // Based on what I saw in the inner IIFE, the array contains:
    // [hE(0x23f), hE(0x1fa), 'literal string', hE(0x1bc), hE(0x1bf), ...]
    // where hE(index) will become vmL[index] after restoration
    
    // Let me try a different approach - extract what I believe is the string array
    // from the inner IIFE definition
    
    // Look for the inner IIFE that creates the L array
    const innerIifeMatch = content.match(/const\s+vmM_ac7ecf\s*=\s*\(function\s*\(\s*\)\s*\{\s*var\s+hE=vmha;\s*let\s+L\s*=\s*(\[[^\]]+\])/);
    if (!innerIifeMatch) {
        console.error('Could not find inner IIFE array definition');
        return;
    }
    
    const arrayDefinition = innerIifeMatch[1];
    console.log(`Found inner IIFE array definition:`);
    console.log(`  ${arrayDefinition.substring(0, 200)}...\n`);
    
    // Parse the array elements to understand the structure
    const elements = [];
    let current = '';
    let inQuote = false;
    let quoteChar = null;
    let parenDepth = 0;
    
    for (let i = 0; i < arrayDefinition.length; i++) {
        const char = arrayDefinition[i];
        
        if (char === '"' || char === "'") {
            if (!inQuote) {
                inQuote = true;
                quoteChar = char;
            } else if (quoteChar === char) {
                inQuote = false;
                quoteChar = null;
            }
        } else if (char === '(' && !inQuote) {
            parenDepth++;
        } else if (char === ')' && !inQuote) {
            parenDepth--;
        }
        
        if (char === ',' && !inQuote && parenDepth === 0) {
            elements.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    
    if (current.trim()) {
        elements.push(current.trim());
    }
    
    console.log(`Parsed ${elements.length} array elements:\n`);
    elements.forEach((elem, idx) => {
        if (elem.length > 100) {
            console.log(`  [${idx}]: ${elem.substring(0, 100)}... (${elem.length} chars)`);
        } else {
            console.log(`  [${idx}]: ${elem}`);
        }
    });
    
    // Now I need to restore the vmS array using the seed
    // The restoration algorithm is in the outer IIFE:
    // (function(L,X){
    //   var hi=vmL,N=L();
    //   while(!![]){
    //     try{
    //       var M=-parseInt(hi(0x2c2))/0x1*(-parseInt(hi(0x1c7))/0x2)+-parseInt(hi(0x1f8))/0x3*(-parseInt(hi(0x1fc))/0x4)+-parseInt(hi(0x2d0))/0x5*(-parseInt(hi(0x1e9))/0x6)+-parseInt(hi(0x206))/0x7*(-parseInt(hi(0x28e))/0x8)+-parseInt(hi(0x224))/0x9*(-parseInt(hi(0x247))/0xa)+parseInt(hi(0x216))/0xb+-parseInt(hi(0x24f))/0xc;
    //       if(M===X)break;else N['push'](N['shift']());
    //     }catch(D){N['push'](N['shift']());}
    //   }
    // })(vmS,0x5c4a2)
    
    // This rotates the array N until the calculated M equals X (the seed)
    // After the loop, N contains the restored array, and vmL (hi) points to it
    
    // To simulate this, I need to:
    // 1. Start with the vmS array (which I need to extract)
    // 2. Apply the rotation algorithm until M equals seed
    // 3. The resulting array is what vmL points to during execution
    
    console.log('\n=== To fully deobfuscate, I need to: ===');
    console.log('1. Extract the actual vmS array (the obfuscated string array)');
    console.log('2. Implement the restoration algorithm with seed 0x5c4a2');
    console.log('3. Replace all vmL(index) calls with the restored string values');
    console.log('4. The resulting code should reveal the actual URL decoding logic\n');
    
    // Let me try to extract what I believe is the vmS array from the content
    // Based on the long string literal I found earlier, and the pattern in the inner array
    
    // Looking at the inner array definition, I see patterns like:
    // hE(0x23f), hE(0x1fa), 'ASAYAQAC...', hE(0x1bc), hE(0x1bf), ...
    // This suggests that the vmS array contains a mix of:
    // - Actual string literals (like the long ASAYAQAC... string)
    // - Placeholders that will be replaced by vmL[index] after restoration
    
    // Let me attempt to reconstruct the vmS array by looking for patterns
    // in the content that might represent the original array
    
    console.log('=== Attempting to extract vmS array ===');
    
    // The long string literal I found might actually be the concatenation
    // of all string elements in the vmS array
    // Let me see if I can split it based on patterns from the inner array
    
    // Actually, let me look at this differently
    // The inner IIFE shows us what the restored array looks like when accessed via hE()
    // So if I can restore the vmS array, then hE(X) will give me the X-th element
    
    // Let me try to understand the restoration math
    console.log('\n=== Analyzing restoration algorithm ===');
    console.log('The outer IIFE loops, calculating:');
    console.log('M = -parseInt(hi(0x2c2))/1 * (-parseInt(hi(0x1c7))/2) +');
    console.log('    -parseInt(hi(0x1f8))/3 * (-parseInt(hi(0x1fc))/4) +');
    console.log('    -parseInt(hi(0x2d0))/5 * (-parseInt(hi(0x1e9))/6) +');
    console.log('    -parseInt(hi(0x206))/7 * (-parseInt(hi(0x28e))/8) +');
    console.log('    -parseInt(hi(0x224))/9 * (-parseInt(hi(0x247))/10) +');
    console.log('    parseInt(hi(0x216))/11 +');
    console.log('    -parseInt(hi(0x24f))/12');
    console.log('');
    console.log('Where hi(index) = vmL[index] = restored_vmS[index]');
    console.log('The loop continues rotating the array until M equals the seed (0x5c4a2)\n');
    
    // Let me try to brute force the restoration by making an assumption
    // about what the vmS array might look like
    
    console.log('=== Trying restoration with hypothetical vmS array ===');
    
    // Based on the inner array having many hE() calls and string literals,
    // let me assume the vmS array has a similar structure
    
    // Let me extract what appear to be the literal strings from the inner array definition
    const literalStrings = [];
    elements.forEach(elem => {
        if (elem.startsWith("'") && elem.endsWith("'") && elem.length > 20) {
            literalStrings.push(elem.slice(1, -1)); // Remove quotes
        }
    });
    
    console.log(`Found ${literalStrings.length} literal string elements in inner array`);
    if (literalStrings.length > 0) {
        console.log(`First literal string (first 100 chars): ${literalStrings[0].substring(0, 100)}...\n`);
    }
    
    // Now, the key insight: the vmS array likely contains these same literal strings
    // but in a different order, and the restoration process puts them in the right place
    
    // Let me look at the very long string literal again and see if it matches
    // the pattern of concatenated literals from the inner array
    
    const longLiteralMatch = content.match(/'ASAYAQACDMACALADAvgCBJwHBvIGCNgDCroBDHQO\/gMQ0gYSbBSmAhbwAxjcARqcBRy\+Bx7KBCDqByLGAySkAyauAyiiBirOAyysAy7YBzCgBzKUBzTyBDa8BTjUBUCiAVAcUowDVM4EVqwGWMYBWuwCXMoGXgpkZGbsBGjABmrQB2zSA27iAnAUcpYGdPYHdp4DeNwDet4HfPgBfpIEgAGgBoIB4AaMAdYCjgHCB5ABMJIBuASUAcoClgGcBpgBrgWaASScAfYEngGMBqAB5gSiAVakAeIBpgH\+B6gB0gG0ATK2AYYBuAGkB7oB9gG8AYYGvgGcAsgB\+gXKAYIGzAHOAc4BhgPQAULSAbQE1AGCB9YBxgfcAdYF3gGYBeABrgLwAXbyAaID9AHWBvYBfPgBvAH6Ae4F\/AHgAv4BigeAAvwHggJyhALMAYYCcIgC6gSYAqIHmgJGnALiBJ4CNqAC7geiArIHpAKUBqYC6gaoArQBqgKcBKwCTK4CxAOwAqYBsgK6A7QClgS2AoICuALEAboC4AG8ArgDwAJgwgKGBMQCIsYC7gPIAqQGygLOAswClgPOAq4H0ALAA9IC4gPoAsoD6gLIAewC8gXuAowH8AJe8gK2A5ADsAWSA4gBlAOsBKQDlASmA\/QHqAOYBKoD\+gGsA6oBrgOiBbADfrIDyAe0A5ADtgOyBLgDqAX0A4gF9gOWB\/gDzAL6A8gG\/APyB\/4D7AOABIQBggSUAoQEKIYEqgeIBIwCigSuASAIEnVuZGVmaW5lZAgQZG9jdW1lbnQIDGxlbmd0aAgMY29va2llCAQ7IAgKc3BsaXQEAQQACAI9CApzbGljZQgIam9pbggkZGVjb2RlVVJJQ29tcG9uZW50CBJfMHgxODc1YjEICHJlYWQEAggYXzB4NDExMDhkJCQ00gGqAwQApAMEAAAEAOABBAFSAAgAaAAGAMICBACMAQQCQAAIAGYABgAQBABoAJYBBAGMAQQDaAAABASWAQQBjAEEAwgAjAEEBQAEBm4EAWQAtAEADgQBmgEADgQCAAQHDgQDDAQDDAQBjAEEAlgAaAAABAgMBAEMBAOQAQAIAIw/);
    
    if (longLiteralMatch) {
        console.log(`\nFound the mega literal string (${longLiteralMatch[0].length} chars)`);
        console.log('This appears to be the first literal string element');
        
        // Let me see if I can find where this string is used in the vmS array context
        // by looking for patterns around it
        
        const contextBefore = content.substring(Math.max(0, longLiteralMatch.index - 100), longLiteralMatch.index);
        const contextAfter = content.substring(longLiteralMatch.index + longLiteralMatch[0].length, Math.min(content.length, longLiteralMatch.index + longLiteralMatch[0].length + 100));
        
        console.log(`Context before: ...${contextBefore}`);
        console.log(`Context after: ${contextAfter}...`);
    }
    
    console.log('\n=== Practical Approach for URL Extraction ===');
    console.log('Instead of fully deobfuscating, let me try to understand what the');
    console.log('obfuscated code is doing by examining its behavior:');
    console.log('');
    console.log('1. The code retrieves data-url attributes from HTML elements');
    console.log('2. It passes these values through a decoding function');
    console.log('3. The decoded values become the actual download URLs');
    console.log('');
    console.log('From the HTML sample, data-url values look like:');
    console.log('kkA4ebKVU7KXlSMjyLThtam3OgCEmN7OLmND8w5UmXjnPNnhrEx3GmNPIp_k_buYSedi8fUutBwT5yDZqf7sJaeCIFTauVyqcNbTMXk4-do0hLJwAsMdDiYDfQqDUvSbjiS8A1jgi50N4DLRGyYmdOrDEa54RJHM3DUXGikwvmNNjrRE5-zCfLG-6TYFxBvdm99N1BSAHzwq4qwOKtmJjiIV9ZlnOC665I0-YezU0SjG3NzbTdc5o_a8vVgbURsRHx3K4c-_i3wDsXX-QVT5pmnFx0NlytMIgpilR-JbiJWssT3lk0s3se3-UXj8MTbFIxq-SIWgErOdPsqc');
    console.log('');
    console.log('These appear to be URL-safe base64 encoded strings');
    console.log('(containing A-Z, a-z, 0-9, -, _, and no padding)');
    console.log('');
    console.log('My hypothesis:');
    console.log('- The obfuscation hides the decoding logic');
    console.log('- The decoding function likely converts URL-safe base64 to regular base64');
    console.log('- Then decodes it to get the actual URL');
    console.log('- The obfuscation uses string array restoration to hide keys/algorithms');
    console.log('');
    console.log('Next steps for manual analysis:');
    console.log('1. Set breakpoints in browser devtools on element attribute access');
    console.log('2. Observe what happens to the data-url value when clicked');
    console.log('3. Look for the function that processes this value');
    console.log('4. That function is likely the URL decoder we need to mimic');
}

deobfuscateMegaup();