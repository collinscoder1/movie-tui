// Deobfuscation script for Megaup index.js

// First, I need to extract the vmS array from the beginning of the file
// Looking at the code, it seems vmS is defined somewhere earlier, but I only see the IIFE call
// Let me reconstruct what I can see

// From the beginning of the file:
// var vmha=vmL;(function(L,X){var hi=vmL,N=L();while(!![]){try{var M=-parseInt(hi(0x2c2))/0x1*(-parseInt(hi(0x1c7))/0x2)+-parseInt(hi(0x1f8))/0x3*(-parseInt(hi(0x1fc))/0x4)+-parseInt(hi(0x2d0))/0x5*(-parseInt(hi(0x1e9))/0x6)+-parseInt(hi(0x206))/0x7*(-parseInt(hi(0x28e))/0x8)+-parseInt(hi(0x224))/0x9*(-parseInt(hi(0x247))/0xa)+parseInt(hi(0x216))/0xb+-parseInt(hi(0x24f))/0xc;if(M===X)break;else N['push'](N['shift']());}catch(D){N['push'](N['shift']());}}}(vmS,0x5c4a2));

// The string array appears to be defined in the second part after the import
// Looking at: const vmM_ac7ecf=(function(){var hE=vmha;let L=[hE(0x23f),hE(0x1fa),'ASAYAQACDMACALADAvgCBJwHBvIGCNgDCroBDHQO/gMQ0gYSbBSmAhbwAxjcARqcBRy+Bx7KBCDqByLGAySkAyauAyiiBirOAyysAy7YBzCgBzKUBzTyBDa8BTjUBUCiAVAcUowDVM4EVqwGWMYBWuwCXMoGXgpkZGbsBGjABmrQB2zSA27iAnAUcpYGdPYHdp4DeNwDet4HfPgBfpIEgAGgBoIB4AaMAdYCjgHCB5ABMJIBuASUAcoClgGcBpgBrgWaASScAfYEngGMBqAB5gSiAVakAeIBpgH+B6gB0gG0ATK2AYYBuAGkB7oB9gG8AYYGvgGcAsgB+gXKAYIGzAHOAc4BhgPQAULSAbQE1AGCB9YBxgfcAdYF3gGYBeABrgLwAXbyAaID9AHWBvYBfPgBvAH6Ae4F/AHgAv4BigeAAvwHggJyhALMAYYCcIgC6gSYAqIHmgJGnALiBJ4CNqAC7geiArIHpAKUBqYC6gaoArQBqgKcBKwCTK4CxAOwAqYBsgK6A7QClgS2AoICuALEAboC4AG8ArgDwAJgwgKGBMQCIsYC7gPIAqQGygLOAswClgPOAq4H0ALAA9IC4gPoAsoD6gLIAewC8gXuAowH8AJe8gK2A5ADsAWSA4gBlAOsBKQDlASmA/QHqAOYBKoD+gGsA6oBrgOiBbADfrIDyAe0A5ADtgOyBLgDqAX0A4gF9gOWB/gDzAL6A8gG/APyB/4D7AOABIQBggSUAoQEKIYEqgeIBIwCigSuASAIEnVuZGVmaW5lZAgQZG9jdW1lbnQIDGxlbmd0aAgMY29va2llCAQ7IAgKc3BsaXQEAQQACAI9CApzbGljZQgIam9pbggkZGVjb2RlVVJJQ29tcG9uZW50CBJfMHgxODc1YjEICHJlYWQEAggYXzB4NDExMDhkJCQ00gGqAwQApAMEAAAEAOABBAFSAAgAaAAGAMICBACMAQQCQAAIAGYABgAQBABoAJYBBAGMAQQDaAAABASWAQQBjAEEAwgAjAEEBQAEBm4EAWQAtAEADgQBmgEADgQCAAQHDgQDDAQDDAQBjAEEAlgAaAAABAgMBAEMBAOQAQAIAIw...

// It looks like the actual string array content starts after the import statement
// Let me try to extract it by finding the pattern

const fs = require('fs');

// Read the file
const content = fs.readFileSync('./index.js', 'utf8');

// Since it's one big line, let's work with it
console.log('File length:', content.length);

// Let me try to extract the string array by looking for the pattern after the import
const importIndex = content.indexOf("import{D as vmK}from'./vendor-CvOp7rn7.js';");
console.log('Import found at:', importIndex);

if (importIndex !== -1) {
  // Look for the start of the string array after the import
  const afterImport = content.substring(importIndex);
  const arrayStart = afterImport.indexOf("let L=[");
  console.log('Array start found at:', arrayStart !== -1 ? importIndex + arrayStart : -1);
  
  if (arrayStart !== -1) {
    // Extract from "let L=[" to the matching closing bracket
    let arrayContent = afterImport.substring(arrayStart);
    
    // Find the matching closing bracket for the array
    let bracketCount = 0;
    let endPos = 0;
    for (let i = 0; i < arrayContent.length; i++) {
      if (arrayContent[i] === '[') bracketCount++;
      if (arrayContent[i] === ']') {
        bracketCount--;
        if (bracketCount === 0) {
          endPos = i + 1;
          break;
        }
      }
    }
    
    if (endPos > 0) {
      const arrayDef = arrayContent.substring(0, endPos);
      console.log('Array definition:', arrayDef);
      
      // Now let's try to extract the vmS array
      // Based on the pattern, vmS should be the array that gets passed to the first IIFE
      // Looking at the very beginning: (function(L,X){...})(vmS,0x5c4a2);
      
      const iifePattern = /\(function\(L,X\)\{[^}]*\}\([^)]+\)\)/;
      const iifeMatch = content.match(iifePattern);
      if (iifeMatch) {
        console.log('IIFE pattern found:', iifeMatch[0]);
        // Extract the arguments: vmS,0x5c4a2
        const argsMatch = iifeMatch[0].match(/\(function\(L,X\)\{[^}]*\}\)\(([^)]+)\)/);
        if (argsMatch) {
          const args = argsMatch[1];
          console.log('IIFE arguments:', args);
          // This should be "vmS,0x5c4a2"
          const [vmSArg, seedArg] = args.split(',').map(s => s.trim());
          console.log('vmS argument:', vmSArg);
          console.log('seed argument:', seedArg);
          
          // Now I need to find where vmS is actually defined
          // Let's look for var vmS = [...] or let vmS = [...] or const vmS = [...]
          const vmSDefinitionPatterns = [
            /(?:var|let|const)\s+vmS\s*=\s*\[[^\]]*\]/g,
            /vmS\s*=\s*\[[^\]]*\]/g
          ];
          
          let vmSArray = null;
          for (const pattern of vmSDefinitionPatterns) {
            const match = content.match(pattern);
            if (match) {
              console.log('Found vmS definition:', match[0]);
              // Extract the array part
              const arrayMatch = match[0].match(/\[[^\]]*\]/);
              if (arrayMatch) {
                // This is tricky - the array content is likely obfuscated too
                // Let's look for the pattern where strings are defined
                vmSArray = arrayMatch[0];
                break;
              }
            }
          }
          
          if (!vmSArray) {
            // Maybe vmS is defined by the long string literal I saw earlier
            // Let's look for long string literals that might be the array
            const longStringPattern = /'[A-Za-z0-9\+/\=]{100,}/g;
            const longStrings = content.match(longStringPattern);
            if (longStrings && longStrings.length > 0) {
              console.log('Found', longStrings.length, 'long string literals');
              console.log('First long string (first 100 chars):', longStrings[0].substring(0, 100));
              // The first one might be our vmS array content
              vmSArray = longStrings[0];
            }
          }
        }
      }
    }
  }
}

// Let's also try a different approach - simulate the obfuscation process
console.log('\n=== Attempting to simulate the restoration process ===');

// Based on what I can see, let me try to reconstruct the process
// The outer IIFE: (function(L,X){...})(vmS,0x5c4a2)
// Where L is the string array, X is the seed 0x5c4a2

// The inner part has: var hi=vmL,N=L();while(!![]){...}
// This means:
// - hi is an alias for vmL (which will be the restored L)
// - N is initialized as a copy of L via L()
// - Then it loops, calculating M and rotating N until M equals X

// Let me try to extract what I believe is the vmS array from the content
// Looking for the long string literal near the beginning

const potentialArrayMatch = content.match(/'ASAYAQACDMACALADAvgCBJwHBvIGCNgDCroBDHQO\/gMQ0gYSbBSmAhbwAxjcARqcBRy\+Bx7KBCDqByLGAySkAyauAyiiBirOAyysAy7YBzCgBzKUBzTyBDa8BTjUBUCiAVAcUowDVM4EVqwGWMYBWuwCXMoGXgpkZGbsBGjABmrQB2zSA27iAnAUcpYGdPYHdp4DeNwDet4HfPgBfpIEgAGgBoIB4AaMAdYCjgHCB5ABMJIBuASUAcoClgGcBpgBrgWaASScAfYEngGMBqAB5gSiAVakAeIBpgH\+B6gB0gG0ATK2AYYBuAGkB7oB9gG8AYYGvgGcAsgB\+gXKAYIGzAHOAc4BhgPQAULSAbQE1AGCB9YBxgfcAdYF3gGYBeABrgLwAXbyAaID9AHWBvYBfPgBvAH6Ae4F\/AHgAv4BigeAAvwHggJyhALMAYYCcIgC6gSYAqIHmgJGnALiBJ4CNqAC7geiArIHpAKUBqYC6gaoArQBqgKcBKwCTK4CxAOwAqYBsgK6A7QClgS2AoICuALEAboC4AG8ArgDwAJgwgKGBMQCIsYC7gPIAqQGygLOAswClgPOAq4H0ALAA9IC4gPoAsoD6gLIAewC8gXuAowH8AJe8gK2A5ADsAWSA4gBlAOsBKQDlASmA\/QHqAOYBKoD\+gGsA6oBrgOiBbADfrIDyAe0A5ADtgOyBLgDqAX0A4gF9gOWB\/gDzAL6A8gG\/APyB\/4D7AOABIQBggSUAoQEKIYEqgeIBIwCigSuASAIEnVuZGVmaW5lZAgQZG9jdW1lbnQIDGxlbmd0aAgMY29va2llCAQ7IAgKc3BsaXQEAQQACAI9CApzbGljZQgIam9pbggkZGVjb2RlVVJJQ29tcG9uZW50CBJfMHgxODc1YjEICHJlYWQEAggYXzB4NDExMDhkJCQ00gGqAwQApAMEAAAEAOABBAFSAAgAaAAGAMICBACMAQQCQAAIAGYABgAQBABoAJYBBAGMAQQDaAAABASWAQQBjAEEAwgAjAEEBQAEBm4EAWQAtAEADgQBmgEADgQCAAQHDgQDDAQDDAQBjAEEAlgAaAAABAgMBAEMBAOQAQAIAIw/);

if (potentialArrayMatch) {
  console.log('\nFound potential vmS array content!');
  console.log('Length:', potentialArrayMatch[0].length);
  
  // This looks like it might be a concatenation of multiple strings
  // Let me see if it's actually an array of strings
  // Based on the pattern in the inner IIFE, the array has elements like:
  // [hE(0x23f), hE(0x1fa), 'long string literal', hE(0x444), hE(0x447), ...]
  
  // Let's try to reconstruct what the array might look like by looking at the inner IIFE
  const innerIIFEMatch = content.match(/const\s+vmM_ac7ecf\s*=\s*\(function\(\s*\)\s*\{\s*var\s+hE=vmha;\s*let\s+L=\s*\[([^\]]+)\]\s*;/);
  if (innerIIFEMatch) {
    console.log('\nFound inner IIFE array definition:');
    console.log(innerIIFEMatch[1]);
    
    // Parse the array elements
    const arrayElementsStr = innerIIFEMatch[1];
    // Split by commas but be careful about quoted strings containing commas
    const elements = [];
    let current = '';
    let inQuote = false;
    let quoteChar = null;
    
    for (let i = 0; i < arrayElementsStr.length; i++) {
      const char = arrayElementsStr[i];
      if (char === '"' || char === "'") {
        if (!inQuote) {
          inQuote = true;
          quoteChar = char;
        } else if (quoteChar === char) {
          inQuote = false;
          quoteChar = null;
        }
      }
      
      if (char === ',' && !inQuote) {
        elements.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    if (current) {
      elements.push(current.trim());
    }
    
    console.log('\nArray elements:', elements);
    console.log('Number of elements:', elements.length);
    
    // Now, if I had the restored vmS array, I could replace the hE() calls
    // hE(index) means vmL[index] where vmL is the restored vmS array
    
    // Let's try to restore the vmS array using the seed
    // But first I need to know what vmS actually is
    
    // Let me try a different approach - let's assume the long string I found
    // is actually the concatenation of all array elements separated by some delimiter
    // or that it IS the array represented as a string
    
    console.log('\n=== Trying to understand the string array format ===');
    
    // Let's look at the vendor file to see if it has clues
    console.log('\n=== Examining vendor-CvOp7rn7.js ===');
    const vendorContent = fs.readFileSync('./vendor-CvOp7rn7.js', 'utf8');
    console.log('Vendor file length:', vendorContent.length);
    console.log('Vendor file preview (first 200 chars):');
    console.log(vendorContent.substring(0, 200));
  }
}

console.log('\n=== Summary of findings ===');
console.log('1. Outer IIFE restores vmS array using seed 0x5c4a2 (378018 decimal)');
console.log('2. After restoration, vmL points to the restored array');
console.log('3. Inner IIFE creates array L using hE(index) which is vmL[index]');
console.log('4. The actual logic uses these resolved strings');
console.log('');
console.log('To fully deobfuscate, I need to:');
console.log('1. Find the actual vmS array definition');
console.log('2. Simulate the restoration process with seed 0x5c4a2');
console.log('3. Replace all vmL(index) calls with the restored strings');
console.log('4. The resulting code should be readable');
