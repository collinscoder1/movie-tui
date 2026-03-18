// Final analysis of Megaup obfuscation and URL extraction mechanism

const fs = require('fs');

function analyzeMegaup() {
    console.log('=== Megaup Obfuscation and URL Extraction Analysis ===\n');
    
    // Read the obfuscated file
    const content = fs.readFileSync('./index.js', 'utf8');
    console.log(`Read ${content.length} characters from index.js\n`);
    
    // 1. Analyze the obfuscation structure
    console.log('=== 1. Obfuscation Structure ===');
    
    // Outer IIFE: (function(L,X){...})(vmS,SEED)
    const outerIifeMatch = content.match(/\(function\s*\(L,X\)\s*\{[^}]*\}\)\s*\(([^)]+)\)/);
    let seedValue = null;
    let vmSVarName = null;
    if (outerIifeMatch) {
        const args = outerIifeMatch[1].split(',').map(arg => arg.trim());
        vmSVarName = args[0];
        seedValue = parseInt(args[1]);
        
        console.log(`✓ Outer IIFE found:`);
        console.log(`  Array variable: ${vmSVarName}`);
        console.log(`  Seed value: 0x${seedValue.toString(16)} (${seedValue} decimal)`);
        
        // Show the restoration algorithm
        const functionBodyMatch = outerIifeMatch[0].match(/\(function\s*\(L,X\)\s*\{([^}]*)\}\)/);
        if (functionBodyMatch) {
            const functionBody = functionBodyMatch[1];
            console.log(`\n  Restoration algorithm:`);
            console.log(`  var hi=vmL, N=L();`);
            console.log(`  while(!![]){`);
            console.log(`    try{`);
            console.log(`      var M=${functionBodyMatch[1].match(/var\s+M\s*=\s*([^;]+);/)?.[1].trim()};`);
            console.log(`      if(M===X)break;else N['push'](N['shift']());`);
            console.log(`    }catch(D){N['push'](N['shift']());}`);
            console.log(`  }`);
            console.log(`  // After loop: N is restored array, vmL (hi) points to it\n`);
        }
    }
    
    // 2. Analyze how the restored array is used
    console.log('=== 2. Array Usage Pattern ===');
    
    // Inner IIFE showing hE() usage
    const innerIifeMatch = content.match(/const\s+vmM_ac7ecf\s*=\s*\(function\s*\(\s*\)\s*\{\s*var\s+hE=vmha;\s*let\s+L\s*=\s*(\[[^\]]+\])/);
    if (innerIifeMatch) {
        console.log(`✓ Inner IIFE found that creates objects using hE(index) = vmL[index]`);
        
        // Extract the array definition
        const arrayDef = innerIifeMatch[1];
        console.log(`  Array definition preview: ${arrayDef.substring(0, 150)}...\n`);
        
        // Extract all hE() calls
        const heMatches = arrayDef.match(/hE\s*\(\s*0x[0-9a-f]+/gi);
        if (heMatches) {
            const indices = [];
            heMatches.forEach(match => {
                const indexMatch = match.match(/0x[0-9a-f]+/);
                if (indexMatch) {
                    indices.push(parseInt(indexMatch[0], 16));
                }
            });
            const uniqueIndices = [...new Set(indices)].sort((a, b) => a - b);
            console.log(`  Found ${uniqueIndices.length} unique hE() indices:`);
            console.log(`  ${uniqueIndices.map(i => `0x${i.toString(16)} (${i})`).join(', ')}\n`);
        }
    }
    
    // 3. Analyze the HTML structure for data-url attributes
    console.log('=== 3. HTML Data-url Analysis ===');
    const htmlContent = fs.readFileSync('./index.html', 'utf8');
    
    // Find data-url attributes
    const dataUrlMatches = htmlContent.match(/data-url="([^"]*)"/g);
    if (dataUrlMatches) {
        console.log(`✓ Found ${dataUrlMatches.length} data-url attributes:`);
        dataUrlMatches.forEach((match, index) => {
            const value = match.match(/data-url="([^"]*)"/)[1];
            console.log(`  [${index + 1}] Length: ${value.length} chars`);
            console.log(`      Preview: ${value.substring(0, 50)}...`);
            
            // Check if it looks like URL-safe base64
            const isUrlSafeBase64 = /^[A-Za-z0-9_-]+$/.test(value);
            console.log(`      Is URL-safe base64: ${isUrlSafeBase64}`);
            
            if (isUrlSafeBase64) {
                // Try to decode as base64
                try {
                    const standardBase64 = value.replace(/-/g, '+').replace(/_/g, '/');
                    const padded = standardBase64.length % 4 === 0 ? standardBase64 : standardBase64 + '='.repeat(4 - (standardBase64.length % 4));
                    const decoded = Buffer.from(padded, 'base64');
                    console.log(`      Base64 decoded length: ${decoded.length} bytes`);
                    console.log(`      First 16 bytes hex: ${decoded.slice(0, 16).toString('hex')}`);
                } catch (e) {
                    console.log(`      Base64 decoding error: ${e.message}`);
                }
            }
            console.log('');
        });
    }
    
    // 4. Check the vendor file for utility functions
    console.log('=== 4. Utility Library (vendor-CvOp7rn7.js) ===');
    const vendorContent = fs.readFileSync('./vendor-CvOp7rn7.js', 'utf8');
    console.log(`✓ Vendor file length: ${vendorContent.length} characters`);
    
    // Look for interesting functions
    const interestingFunctions = [
        /function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/g,
        /\.prototype\.\[([a-zA-Z_$][a-zA-Z0-9_$]*)\]\s*=/g
    ];
    
    interestingFunctions.forEach((pattern, index) => {
        const matches = [...new Set(vendorContent.match(pattern))];
        if (matches) {
            console.log(`  Pattern ${index + 1} matches (${matches.length}):`);
            matches.slice(0, 5).forEach((match, idx) => {
                console.log(`    ${match}`);
            });
            if (matches.length > 5) {
                console.log(`    ... and ${matches.length - 5} more`);
            }
            console.log('');
        }
    });
    
    // 5. Summary and recommendations
    console.log('=== 5. Summary and Recommendations ===');
    console.log(`✓ Megaup uses a two-stage string array obfuscation:`);
    console.log(`    1. Outer IIFE restores the vmS array using seed 0x${seedValue ? seedValue.toString(16) : 'unknown'}`);
    console.log(`    2. Inner IIFE accesses elements via hE(index) = vmL[index]`);
    console.log(`✓ Data-url attributes contain URL-safe base64 encoded strings`);
    console.log(`✓ Simple base64 decoding yields binary data, suggesting additional transformation`);
    console.log(`\n🔧 To extract the actual URL decoding algorithm:`);
    console.log(`   Option 1 (Static analysis):`);
    console.log(`     1. Find the exact vmS array definition in index.js`);
    console.log(`     2. Implement the restoration algorithm with seed 0x${seedValue ? seedValue.toString(16) : 'unknown'}`);
    console.log(`     3. Apply restoration to get the true vmS array`);
    console.log(`     4. Replace all vmL(index) and hE(index) calls with the actual strings`);
    console.log(`     5. The resulting code should reveal the URL decoding function`);
    console.log(`   Option 2 (Dynamic analysis - RECOMMENDED):`);
    console.log(`     1. Load Megaup page in browser with devtools open`);
    console.log(`     2. Set breakpoint on attributechanged or getattribute for data-url`);
    console.log(`     3. Click a resolution button`);
    console.log(`     4. Step through the decoding function`);
    console.log(`     5. Observe the exact transformation steps applied to the data-url value`);
    console.log(`     6. This will reveal the URL extraction algorithm without deobfuscation\n`);
    
    console.log('🎯 Conclusion:');
    console.log('   The obfuscation hides the URL decoding logic, but the data-url pattern is clear:');
    console.log('   URL-safe base64 encoded strings that, when properly decoded, yield actual download URLs.');
    console.log('   The transformation likely involves XOR with a key derived from video/metadata.');
}

analyzeMegaup();

console.log('=== Analysis Complete ===');