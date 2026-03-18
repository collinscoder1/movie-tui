// Analyze Megaup obfuscation by examining the actual code structure

const fs = require('fs');
const content = fs.readFileSync('./index.js', 'utf8');

console.log('=== Megaup Obfuscation Analysis ===\n');

// From the hex dump, I can see:
// var vmha=vmL;(function(L,X){...})(vmS,0x5c4a2);

// Let me extract the exact outer IIFE pattern
const outerIifePattern = /\(function\s*\(L,X\)\s*\{[^}]*\}\)\s*\(([^)]+)\)/;
const match = content.match(outerIifePattern);

if (match) {
    console.log('Found outer IIFE:');
    console.log(`  Full match: ${match[0]}`);
    console.log(`  Arguments: ${match[1]}`);
    
    // Parse arguments: vmS,0x5c4a2
    const args = match[1].split(',').map(arg => arg.trim());
    console.log(`  Array variable: ${args[0]}`);
    console.log(`  Seed value: ${args[1]} (${parseInt(args[1], 16)} decimal)\n`);
    
    // Now let's look at the function body to understand the restoration algorithm
    const functionBodyMatch = match[0].match(/\(function\s*\(L,X\)\s*\{([^}]*)\}\)/);
    if (functionBodyMatch) {
        const functionBody = functionBodyMatch[1];
        console.log('Function body:');
        console.log(functionBody);
        console.log('');
        
        // Extract the key parts:
        // var hi=vmL,N=L();
        // while(!![]){
        //   try{
        //     var M=-parseInt(hi(0x2c2))/0x1*(-parseInt(hi(0x1c7))/0x2)+...
        //     if(M===X)break;else N['push'](N['shift']());
        //   }catch(D){N['push'](N['shift']());}
        // }
        
        console.log('=== Restoration Algorithm ===');
        console.log('1. hi is an alias for vmL (which will become the restored array)');
        console.log('2. N is initialized as a copy of L via L()');
        console.log('3. Loop calculates M using values from hi() (i.e., vmL[index])');
        console.log('4. If M equals X (seed), break; otherwise rotate N (push first to end)');
        console.log('5. After loop, N contains the restored array, and vmL points to it\n');
        
        // Let me extract the M calculation formula
        const mCalcMatch = functionBodyMatch[1].match(/var\s+M\s*=\s*([^;]+);/);
        if (mCalcMatch) {
            const mFormula = mCalcMatch[1];
            console.log('M calculation formula:');
            console.log(mFormula);
            console.log('');
            
            // Parse the formula to understand what indices are being accessed
            // -parseInt(hi(0x2c2))/0x1*(-parseInt(hi(0x1c7))/0x2)+...
            const hiCalls = mFormula.match(/hi\s*\(\s*0x[0-9a-f]+/gi);
            if (hiCalls) {
                console.log('hi() calls (array indices being accessed):');
                hiCalls.forEach(call => {
                    const indexMatch = call.match(/0x[0-9a-f]+/);
                    if (indexMatch) {
                        const index = parseInt(indexMatch[0], 16);
                        console.log(`  hi(${indexMatch[0]}) [decimal ${index}]`);
                    }
                });
                console.log('');
            }
        }
    }
}

// Now let's look at where the restored array is used
// After the outer IIFE, we see: import{D as vmK}from'./vendor-CvOp7rn7.js';
// Then: const vmM_ac7ecf=(function(){var hE=vmha;let L=[hE(0x23f),hE(0x1fa),'ASAYAQAC...', ...]);

console.log('=== Inner IIFE Analysis ===');
const innerIifePattern = /const\s+vmM_ac7ecf\s*=\s*\(function\s*\(\s*\)\s*\{\s*var\s+hE=vmha;\s*let\s+L\s*=\s*(\[[^\]]+\])/;
const innerMatch = content.match(innerIifePattern);

if (innerMatch) {
    console.log('Found inner IIFE that creates the L array using hE()');
    console.log(`Array definition: ${innerMatch[1].substring(0, 200)}...\n`);
    
    // The hE(index) calls will resolve to vmL[index] after restoration
    // So I need to extract all the hE() calls from this array definition
    const heCalls = innerMatch[1].match(/hE\s*\(\s*0x[0-9a-f]+/gi);
    if (heCalls) {
        console.log('hE() calls in inner array (indices that will be resolved after restoration):');
        const indices = [];
        heCalls.forEach(call => {
            const indexMatch = call.match(/0x[0-9a-f]+/);
            if (indexMatch) {
                const index = parseInt(indexMatch[0], 16);
                indices.push(index);
            }
        });
        
        // Sort and deduplicate
        const uniqueIndices = [...new Set(indices)].sort((a, b) => a - b);
        console.log(`Unique indices: ${uniqueIndices.map(i => `0x${i.toString(16)} (${i})`).join(', ')}`);
        console.log(`Total unique indices: ${uniqueIndices.length}\n`);
        
        // These are the positions in the restored vmS array that will be accessed
        // by the inner IIFE to build the L array
    }
}

// Let me also check the vendor file to see what utilities it provides
console.log('=== Checking vendor-CvOp7rn7.js ===');
const vendorContent = fs.readFileSync('./vendor-CvOp7rn7.js', 'utf8');
console.log(`Vendor file length: ${vendorContent.length} characters`);

// Look for interesting function names or patterns
const interestingPatterns = [
    /function\s+[a-zA-Z_$][a-zA-Z0-9_$]*/g,
    /\.prototype\.\[[a-zA-Z_$][a-zA-Z0-9_$]*\]/g,
    /\[[a-zA-Z_$][a-zA-Z0-9_$]*\]\s*=/g
];

interestingPatterns.forEach(pattern => {
    const matches = vendorContent.match(pattern);
    if (matches && matches.length > 0) {
        console.log(`\nFound ${matches.length} matches for pattern ${pattern}:`);
        // Show first few unique matches
        const uniqueMatches = [...new Set(matches.slice(0, 20))];
        uniqueMatches.forEach((match, idx) => {
            if (idx < 10) {
                console.log(`  ${match}`);
            }
        });
        if (uniqueMatches.length > 10) {
            console.log(`  ... and ${uniqueMatches.length - 10} more`);
        }
    }
});

console.log('\n=== Conclusion ===');
console.log('The obfuscation uses a two-stage process:');
console.log('1. Outer IIFE restores the vmS array using seed 0x5c4a2');
console.log('2. Inner IIFE creates various objects/arrays using hE(index) = vmL[index]');
console.log('3. The actual logic uses these resolved strings');
console.log('');
console.log('To understand the URL decoding:');
console.log('1. Need to restore the vmS array with seed 0x5c4a2');
console.log('2. Then replace all hE(index)/vmL(index) calls with actual strings');
console.log('3. The resulting code should be readable JavaScript');
console.log('');
console.log('Alternative approach (recommended):');
console.log('- Use browser devtools to set breakpoint on data-url attribute access');
console.log('- Trace what happens to the value when user clicks resolution');
console.log('- The decoding function will be exposed in the call stack');
console.log('- This avoids needing to fully deobfuscate the JavaScript');