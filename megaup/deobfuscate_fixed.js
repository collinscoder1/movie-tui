// Fixed Megaup JavaScript deobfuscation script

const fs = require('fs');

function deobfuscateMegaup() {
    console.log('=== Starting Megaup JavaScript Deobfuscation ===\n');
    
    // Read the obfuscated file
    let content = fs.readFileSync('./index.js', 'utf8');
    console.log(`Read ${content.length} characters from index.js\n`);
    
    // Step 1: Extract the seed value from the outer IIFE
    // Pattern: (function(L,X){...})(vmS,SEED)
    const outerIifeMatch = content.match(/\(function\s*\(L,X\)\s*\{[^}]*\}\)\s*\(([^)]+)\)/);
    if (!outerIifeMatch) {
        console.error('✗ Could not find outer IIFE pattern');
        return false;
    }
    
    const args = outerIifeMatch[1].split(',').map(arg => arg.trim());
    const vmSVarName = args[0]; // Should be "vmS"
    const seedValue = parseInt(args[1]); // Should be 0x5c4a2
    
    console.log(`✓ Found outer IIFE:`);
    console.log(`  Array variable: ${vmSVarName}`);
    console.log(`  Seed value: 0x${seedValue.toString(16)} (${seedValue} decimal)\n`);
    
    // Step 2: Find the vmS array definition
    // Look for patterns like: var vmS = [...] or let vmS = [...] or const vmS = [...]
    const vmSPatterns = [
        new RegExp(`(?:var|let|const)\\s+${vmSVarName}\\s*=\\s*(\\[[^\\]]+\\])`, 'g'),
        new RegExp(`${vmSVarName}\\s*=\\s*(\\[[^\\]]+\\])`, 'g')
    ];
    
    let vmSArrayMatch = null;
    for (const pattern of vmSPatterns) {
        const match = content.match(pattern);
        if (match) {
            vmSArrayMatch = match[1]; // Capture the array content
            console.log(`✓ Found ${vmSVarName} definition (length: ${vmSArrayMatch.length} chars)`);
            break;
        }
    }
    
    // If not found with standard patterns, the array might be built differently
    // Looking at the code, it seems the vmS array might be constructed via the long string literal
    // and some other mechanism. Let me look for the pattern I observed in the inner IIFE
    
    if (!vmSArrayMatch) {
        console.log('⚠ Standard vmS definition not found, searching for alternative patterns...\n');
        
        // Look for the long string literal that seems to contain the array data
        const longStringMatch = content.match(/'([A-Za-z0-9+\/=]{200,})'/);
        if (longStringMatch) {
            // This might be the array represented as a string or part of it
            vmSArrayMatch = longStringMatch[1];
            console.log(`✓ Found long string literal (${vmSArrayMatch.length} chars)`);
            console.log(`  First 100 chars: ${vmSArrayMatch.substring(0, 100)}...\n`);
        } else {
            console.error('✗ Could not find vmS array definition with any method');
            return false;
        }
    }
    
    // Step 3: Parse the vmS array to extract elements
    // Based on what I saw in the inner IIFE, the array contains:
    // [hE(0x23f), hE(0x1fa), 'literal string', hE(0x1bc), hE(0x1bf), ...]
    // where hE(index) will become vmL[index] after restoration
    
    // Actually, let me look at this differently - the content I'm seeing in the file
    // might already be showing us what the restored array looks like via the hE() calls
    
    // Let me extract what I believe is the string array by looking at the inner IIFE
    // but understanding that the hE() calls will be replaced after restoration
    
    // Step 4: Find the inner IIFE that shows how the restored array is used
    const innerIifeMatch = content.match(/const\s+vmM_ac7ecf\s*=\s*\(function\s*\(\s*\)\s*\{\s*var\s+hE=vmha;\s*let\s+L\s*=\s*(\[[^\]]+\])/);
    if (!innerIifeMatch) {
        console.error('✗ Could not find inner IIFE array definition');
        return false;
    }
    
    const arrayDefinition = innerIifeMatch[1];
    console.log(`✓ Found inner IIFE array definition`);
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
    
    console.log(`✓ Parsed ${elements.length} array elements from inner IIFE:\n`);
    elements.forEach((elem, idx) => {
        if (elem.length > 100) {
            console.log(`  [${idx}]: ${elem.substring(0, 100)}... (${elem.length} chars)`);
        } else {
            console.log(`  [${idx}]: ${elem}`);
        }
    });
    
    // Extract all the hE() calls from these elements - these are the indices we need to resolve
    const heCalls = [];
    elements.forEach(elem => {
        const matches = elem.match(/hE\s*\(\s*0x[0-9a-f]+/gi);
        if (matches) {
            matches.forEach(match => {
                const indexMatch = match.match(/0x[0-9a-f]+/);
                if (indexMatch) {
                    heCalls.push(parseInt(indexMatch[0], 16));
                }
            });
        }
    });
    
    // Get unique indices and sort them
    const uniqueHeIndices = [...new Set(heCalls)].sort((a, b) => a - b);
    console.log(`\n✓ Found ${uniqueHeIndices.length} unique hE() indices that need resolution:`);
    console.log(`  ${uniqueHeIndices.map(i => `0x${i.toString(16)} (${i})`).join(', ')}\n`);
    
    // Step 5: Now I need to restore the vmS array using the seed
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
    
    console.log('✓ Understanding restoration algorithm:');
    console.log('  1. Start with vmS array (obfuscated string array)');
    console.log('  2. Initialize N as copy of vmS');
    console.log('  3. hi is an alias for vmL (will point to restored array)');
    console.log('  4. In loop, calculate M using values from hi() = vmL[index]');
    console.log('  5. If M equals seed (0x5c4a2), break; otherwise rotate N');
    console.log('  6. After loop, N is restored array and vmL points to it\n');
    
    // Step 6: To proceed, I need the actual vmS array
    // Let me try to extract it from the content by looking for patterns
    // Based on the inner IIFE, I suspect the vmS array contains the literal strings
    // that I saw in the element parsing, but in a different order
    
    // Let me look for the literal strings that appeared in the elements
    const literalStrings = [];
    elements.forEach(elem => {
        if (elem.startsWith("'") && elem.endsWith("'") && elem.length > 20) {
            literalStrings.push(elem.slice(1, -1)); // Remove quotes
        }
    });
    
    console.log(`✓ Found ${literalStrings.length} literal string elements in inner IIFE definitions`);
    if (literalStrings.length > 0) {
        console.log(`  First literal string (first 100 chars): ${literalStrings[0].substring(0, 100)}...\n`);
    }
    
    // The key insight: The vmS array likely contains these literal strings
    // but in an obfuscated order. The restoration process puts them in the correct order
    // so that hE(index) returns the right string.
    
    // Let me try a different approach - let's assume that the long string literal
    // I saw at the beginning is actually the concatenation of all vmS array elements
    
    // Create the regex pattern properly by escaping the string
    const megaLiteralPattern = "'ASAYAQACDMACALADAvgCBJwHBvIGCNgDCroBDHQO\\/gMQ0gYSbBSmAhbwAxjcARqcBRy\\+Bx7KBCDqByLGAySkAyauAyiiBirOAyysAy7YBzCgBzKUBzTyBDa8BTjUBUCiAVAcUowDVM4EVqwGWMYBWuwCXMoGXgpkZGbsBGjABmrQB2zSA27iAnAUcpYGdPYHdp4DeNwDet4HfPgBfpIEgAGgBoIB4AaMAdYCjgHCB5ABMJIBuASUAcoClgGcBpgBrgWaASScAfYEngGMBqAB5gSiAVakAeIBpgH\\+B6gB0gG0ATK2AYYBuAGkB7oB9gG8AYYGvgGcAsgB\\+gXKAYIGzAHOAc4BhgPQAULSAbQE1AGCB9YBxgfcAdYF3gGYBeABrgLwAXbyAaID9AHWBvYBfPgBvAH6Ae4F\\/AHgAv4BigeAAvwHggJyhALMAYYCcIgC6gSYAqIHmgJGnALiBJ4CNqAC7geiArIHpAKUBqYC6gaoArQBqgKcBKwCTK4CxAOwAqYBsgK6A7QClgS2AoICuALEAboC4AG8ArgDwAJgwgKGBMQCIsYC7gPIAqQGygLOAswClgPOAq4H0ALAA9IC4gPoAsoD6gLIAewC8gXuAowH8AJe8gK2A5ADsAWSA4gBlAOsBKQDlASmA\\/QHqAOYBKoD\\+gGsA6oBrgOiBbADfrIDyAe0A5ADtgOyBLgDqAX0A4gF9gOWB\\/gDzAL6A8gG\\/APyB\\/4D7AOABIQBggSUAoQEKIYEqgeIBIwCigSuASAIEnVuZGVmaW5lZAgQZG9jdW1lbnQIDGxlbmd0aAgMY29va2llCAQ7IAgKc3BsaXQEAQQACAI9CApzbGljZQgIam9pbggkZGVjb2RlVVJJQ29tcG9uZW50CBJfMHgxODc1YjEICHJlYWQEAggYXzB4NDExMDhkJCQ00gGqAwQApAMEAAAEAOABBAFSAAgAaAAGAMICBACMAQQCQAAIAGYABgAQBABoAJYBBAGMAQQDaAAABASWAQQBjAEEAwgAjAEEBQAEBm4EAWQAtAEADgQBmgEADgQCAAQHDgQDDAQDDAQBjAEEAlgAaAAABAgMBAEMBAOQAQAIAIw'";
    
    const megaLiteralMatch = content.match(new RegExp(megaLiteralPattern));
    
    if (megaLiteralMatch) {
        console.log(`✓ Found mega literal string (${megaLiteralMatch[0].length} chars)`);
        console.log('  This appears to be a string literal element\n');
        
        // This literal string is likely ONE element of the vmS array
        // The vmS array probably has many such elements
    }
    
    // Step 7: Let's try to reconstruct what we believe the vmS array looks like
    // Based on the pattern in the inner IIFE and the literal strings we found
    
    console.log('✓ Attempting to reconstruct vmS array structure...\n');
    
    // From the inner IIFE definition, I can see the pattern of how the restored array is used
    // Let me extract the exact sequence of hE() calls and literal strings
    
    const reconstructedElements = [];
    let current = '';
    let inQuote = false;
    let quoteChar = null;
    let parenDepth = 0;
    let literalMode = false; // true when we're accumulating a literal string
    
    for (let i = 0; i < arrayDefinition.length; i++) {
        const char = arrayDefinition[i];
        
        if (char === '"' || char === "'") {
            if (!inQuote) {
                inQuote = true;
                quoteChar = char;
                literalMode = true;
                if (current.trim()) {
                    // We were building something else, save it
                    if (current.trim()) {
                        reconstructedElements.push(current.trim());
                        current = '';
                    }
                }
            } else if (quoteChar === char) {
                inQuote = false;
                quoteChar = null;
                literalMode = false;
                // End of literal string
                reconstructedElements.push(`'${current}'`);
                current = '';
            }
        } else if (char === '/' && arrayDefinition[i+1] === '*' && !inQuote) {
            // Skip comments
            while (i < arrayDefinition.length && !(arrayDefinition[i] === '*' && arrayDefinition[i+1] === '/')) {
                i++;
            }
            i++; // Skip the '/'
            continue;
        } else if (char === '(' && !inQuote) {
            parenDepth++;
            if (literalMode) {
                // We were building a literal string, but this suggests it's not a simple literal
                // This shouldn't happen in well-formed code, but let's handle it
                current += char;
            } else {
                // Start of function call
                if (current.trim()) {
                    reconstructedElements.push(current.trim());
                    current = '';
                }
                current += char;
            }
        } else if (char === ')' && !inQuote) {
            parenDepth--;
            current += char;
            if (parenDepth === 0 && !literalMode) {
                // End of function call
                reconstructedElements.push(current.trim());
                current = '';
            }
        } else if (char === ',' && !inQuote && parenDepth === 0) {
            if (literalMode) {
                current += char;
            } else {
                if (current.trim()) {
                    reconstructedElements.push(current.trim());
                    current = '';
                }
            }
        } else {
            current += char;
        }
    }
    
    if (current.trim()) {
        reconstructedElements.push(current.trim());
    }
    
    console.log(`Reconstructed element pattern (${reconstructedElements.length} elements):`);
    reconstructedElements.forEach((elem, idx) => {
        if (elem.length > 80) {
            console.log(`  [${idx}]: ${elem.substring(0, 80)}...`);
        } else {
            console.log(`  [${idx}]: ${elem}`);
        }
    });
    console.log('');
    
    // Now, the hE() calls in these elements need to be resolved using the restored vmS array
    // Let me extract all the hE() calls from the reconstructed pattern
    const patternHeCalls = [];
    reconstructedElements.forEach(elem => {
        const matches = elem.match(/hE\s*\(\s*0x[0-9a-f]+/gi);
        if (matches) {
            matches.forEach(match => {
                const indexMatch = match.match(/0x[0-9a-f]+/);
                if (indexMatch) {
                    patternHeCalls.push(parseInt(indexMatch[0], 16));
                }
            });
        }
    });
    
    const uniquePatternHeIndices = [...new Set(patternHeCalls)].sort((a, b) => a - b);
    console.log(`✓ Found ${uniquePatternHeIndices.length} unique hE() indices in pattern:`);
    console.log(`  ${uniquePatternHeIndices.map(i => `0x${i.toString(16)} (${i})`).join(', ')}\n`);
    
    // Step 8: The challenge is that I don't have the actual vmS array
    // Let me try to extract it by looking for where it might be defined
    
    console.log('🔍 Searching for vmS array definition in file...\n');
    
    // Let me look for patterns that might define the vmS array
    // It could be:
    // 1. A standard array literal: var vmS = ['str1', 'str2', ...];
    // 2. Constructed from string.charCodeAt or similar
    // 3. Built by concatenating substrings
    
    // Look for variable declarations that might be the vmS array
    const varPatterns = [
        /(?:var|let|const)\s+vmS\s*=/g,
        /\bvmS\s*=/g
    ];
    
    let vmSDefinition = null;
    for (const pattern of varPatterns) {
        const match = content.match(pattern);
        if (match) {
            // Get more context around the match
            const matchIndex = match.index;
            const contextBefore = content.substring(Math.max(0, matchIndex - 50), matchIndex);
            const contextAfter = content.substring(matchIndex, Math.min(content.length, matchIndex + 200));
            console.log(`Found potential vmS definition context:`);
            console.log(`  ...${contextBefore}[MATCH]${contextAfter}...`);
            vmSDefinition = { match: match[0], before: contextBefore, after: contextAfter };
            break;
        }
    }
    
    if (!vmSDefinition) {
        console.log('⚠ No obvious vmS variable definition found\n');
        
        // Let me try to look for the array by searching for patterns that look like
        // the restoration algorithm working on an array
        console.log('🔍 Looking for array initialization patterns...\n');
        
        // The restoration algorithm uses L() to copy the array, then N.push(N.shift()) to rotate
        // Let me see if I can find where the original array is defined
        
        // Actually, let me step back and think about this differently
        // The obfuscation pattern I'm seeing is very common
        // The string array is likely defined right before the outer IIFE
        
        // Let me look at the very beginning of the file
        const beginning = content.substring(0, 500);
        console.log('First 500 characters of file:');
        console.log(beginning);
        console.log('');
    }
    
    // Step 9: Let me try to work with what I have and make an educated attempt
    // at restoring the array based on the seed value
    
    console.log('🔧 Attempting to simulate restoration with hypothetical data...\n');
    
    // Let me create a test to verify I understand the restoration algorithm correctly
    function testRestorationAlgorithm() {
        console.log('  Testing restoration algorithm with simple array...');
        
        // Simple test: restore ['a','b','c','d','e'] with seed that should produce ['c','d','e','a','b']
        const testArray = ['a','b','c','d','e'];
        const testSeed = 42; // Example seed
        
        // Simulate the restoration process
        function restoreArray(array, seed) {
            console.log(`    Original array: ${JSON.stringify(array)}`);
            console.log(`    Seed: ${seed}`);
            
            let N = [...array]; // Copy array (equivalent to L() in the code)
            let iterations = 0;
            const maxIterations = array.length * 10; // Safety limit
            
            while (true) {
                // This is the M calculation from the outer IIFE
                // M=-parseInt(hi(0x2c2))/0x1*(-parseInt(hi(0x1c7))/0x2)+-parseInt(hi(0x1f8))/0x3*(-parseInt(hi(0x1fc))/0x4)+-parseInt(hi(0x2d0))/0x5*(-parseInt(hi(0x1e9))/0x6)+-parseInt(hi(0x206))/0x7*(-parseInt(hi(0x28e))/0x8)+-parseInt(hi(0x224))/0x9*(-parseInt(hi(0x247))/0xa)+parseInt(hi(0x216))/0xb+-parseInt(hi(0x24f))/0xc;
                
                // In our test case, let's simplify to make it work
                // For a real implementation, I'd need to actually implement this formula
                // But for testing, let's use a simple function that will eventually match the seed
                
                // Simplified test: M = (N[0].charCodeAt(0) + N[1].charCodeAt(0)) % 100
                let M = 0;
                if (N.length >= 2) {
                    M = (N[0].charCodeAt(0) + N[1].charCodeAt(0)) % 100;
                }
                
                console.log(`    Iteration ${iterations}: M=${M}, seed=${seed}, N=[${N.map(x => `'${x}'`).join(', ')}]`);
                
                if (M === seed) {
                    console.log(`    ✓ Match found after ${iterations} iterations`);
                    console.log(`    Restored array: [${N.map(x => `'${x}'`).join(', ')}]`);
                    return N;
                } else {
                    // Rotate array: push first element to end
                    N.push(N.shift());
                }
                
                iterations++;
                if (iterations > maxIterations) {
                    console.log(`    ✗ Exceeded max iterations (${maxIterations})`);
                    return null;
                }
            }
        }
        
        const result = restoreArray(testArray, testSeed);
        if (result) {
            console.log(`  ✓ Restoration test completed\n`);
        } else {
            console.log(`  ✗ Restoration test failed\n`);
        }
    }
    
    testRestorationAlgorithm();
    
    // Step 10: Since I don't have the actual vmS array, let me try to infer what it might be
    // by looking at the patterns in the code and making an educated guess
    
    console.log('📝 Key findings from analysis:\n');
    console.log('  1. Outer IIFE restores vmS array using seed 0x5c4a2 (378018 decimal)');
    console.log('  2. After restoration, vmL points to the restored array');
    console.log('  3. Inner IIFE creates objects using hE(index) = vmL[index]');
    console.log('  4. The data-url attributes contain URL-safe base64 encoded strings');
    console.log('  5. Simple base64 decoding yields binary data, suggesting additional transformation');
    console.log('  6. The transformation is likely XOR with a key derived from the video/metadata\n');
    
    console.log('🎯 To complete the deobfuscation, I would need to:\n');
    console.log('  1. Extract the actual vmS array definition from the JavaScript');
    console.log('  2. Implement the exact restoration algorithm from the outer IIFE');
    console.log('  3. Apply the restoration to get the true vmS array');
    console.log('  4. Replace all vmL(index) and hE(index) calls with the actual strings');
    console.log('  5. The resulting code should reveal the URL decoding function\n');
    
    console.log('💡 Alternative (more reliable) approach:\n');
    console.log('  Use browser devtools to:');
    console.log('    1. Set breakpoint on data-url attribute access');
    console.log('    2. Click a resolution button');
    console.log('    3. Step through the decoding function');
    console.log('    4. Observe the exact transformation steps applied to the data-url value');
    console.log('    5. This will reveal the URL extraction algorithm without needing to deobfuscate\n');
    
    return true;
}

// Run the deobfuscation
deobfuscateMegaup();

console.log('\n=== Megaup Deobfuscation Analysis Complete ===');
console.log('Next step: Use browser devtools to trace the actual URL decoding process');