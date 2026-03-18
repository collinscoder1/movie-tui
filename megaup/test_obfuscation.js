// Test script to understand Megaup obfuscation

// Extract the string array from index.js
const vmL_array = [
  "ASAYAQACDMACALADAvgCBJwHBvIGCNgDCroBDHQO/gMQ0gYSbBSmAhbwAxjcARqcBRy+Bx7KBCDqByLGAySkAyauAyiiBirOAyysAy7YBzCgBzKUBzTyBDa8BTjUBUCiAVAcUowDVM4EVqwGWMYBWuwCXMoGXgpkZGbsBGjABmrQB2zSA27iAnAUcpYGdPYHdp4DeNwDet4HfPgBfpIEgAGgBoIB4AaMAdYCjgHCB5ABMJIBuASUAcoClgGcBpgBrgWaASScAfYEngGMBqAB5gSiAVakAeIBpgH+B6gB0gG0ATK2AYYBuAGkB7oB9gG8AYYGvgGcAsgB+gXKAYIGzAHOAc4BhgPQAULSAbQE1AGCB9YBxgfcAdYF3gGYBeABrgLwAXbyAaID9AHWBvYBfPgBvAH6Ae4F/AHgAv4BigeAAvwHggJyhALMAYYCcIgC6gSYAqIHmgJGnALiBJ4CNqAC7geiArIHpAKUBqYC6gaoArQBqgKcBKwCTK4CxAOwAqYBsgK6A7QClgS2AoICuALEAboC4AG8ArgDwAJgwgKGBMQCIsYC7gPIAqQGygLOAswClgPOAq4H0ALAA9IC4gPoAsoD6gLIAewC8gXuAowH8AJe8gK2A5ADsAWSA4gBlAOsBKQDlASmA/QHqAOYBKoD+gGsA6oBrgOiBbADfrIDyAe0A5ADtgOyBLgDqAX0A4gF9gOWB/gDzAL6A8gG/APyB/4D7AOABIQBggSUAoQEKIYEqgeIBIwCigSuASAIEnVuZGVmaW5lZAgQZG9jdW1lbnQIDGxlbmd0aAgMY29va2llCAQ7IAgKc3BsaXQEAQQACAI9CApzbGljZQgIam9pbggkZGVjb2RlVVJJQ29tcG9uZW50CBJfMHgxODc1YjEICHJlYWQEAggYXzB4NDExMDhkJCQ00gGqAwQApAMEAAAEAOABBAFSAAgAaAAGAMICBACMAQQCQAAIAGYABgAQBABoAJYBBAGMAQQDaAAABASWAQQBjAEEAwgAjAEEBQAEBm4EAWQAtAEADgQBmgEADgQCAAQHDgQDDAQDDAQBjAEEAlgAaAAABAgMBAEMBAOQAQAIAIwBBAUABAZuBAEOBAQABAgABAYMBAQIAIwBBAkABAZuBAEIAIwBBAoABAZuBAEOBAV0AAwEBAAEB5ABAJYBBAsABAZsBAEOBAYMBAIMBAYMBAUMBAamAwQMCACMAQQNAAQObgQCkgEABgAQBAAMBAZUAGgAfgB2AGQAqgMEAKQDBAB4BA+sAwQAZAAMBAM4AAgAIAAOBAMGAGQAEAQAaAAMBAIQBACQAQBkAAwEAnAAGgweGB4e0gEkNjQ4SsIBogGmAaQBwgGoAbQBsgG0AcABQsQBzgHMAdABAnasAQC2AQ==",
  "0x23f",
  "0x1fa"
];

console.log('String array length:', vmL_array.length);

// The obfuscation IIFE pattern:
// (function(L,X){var hi=vmL,N=L();while(!![]){try{var M=-parseInt(hi(0x2c2))/0x1*(-parseInt(hi(0x1c7))/0x2)+-parseInt(hi(0x1f8))/0x3*(-parseInt(hi(0x1fc))/0x4)+-parseInt(hi(0x2d0))/0x5*(-parseInt(hi(0x1e9))/0x6)+-parseInt(hi(0x206))/0x7*(-parseInt(hi(0x28e))/0x8)+-parseInt(hi(0x224))/0x9*(-parseInt(hi(0x247))/0xa)+parseInt(hi(0x216))/0xb+-parseInt(hi(0x24f))/0xc;if(M===X)break;else N['push'](N['shift']());}catch(D){N['push'](N['shift']());}}}(vmS,0x5c4a2))

// Let's test the restoration logic with a simpler example
function testObfuscationLogic() {
  // Simple test array
  let testArr = ['a', 'b', 'c', 'd', 'e'];
  let original = [...testArr]; // Keep copy
  
  // Simple restoration function (simulating the obfuscation pattern)
  function restoreArray(arr, seed) {
    let N = [...arr]; // Copy array
    let iterations = 0;
    
    while (true) {
      // Simple calculation for demo (this would be the complex formula in real code)
      let M = (N[0].charCodeAt(0) + N[1].charCodeAt(0)) % 10;
      
      if (M === seed) {
        break;
      } else {
        // Rotate array
        N.push(N.shift());
      }
      iterations++;
      
      // Prevent infinite loop
      if (iterations > arr.length * 2) {
        console.log('Warning: Too many iterations');
        break;
      }
    }
    
    return N;
  }
  
  console.log('Original:', original);
  console.log('Restored with seed 0:', restoreArray(testArr, 0));
  console.log('Restored with seed 1:', restoreArray(testArr, 1));
}

// Run test
testObfuscationLogic();

// Extract the actual obfuscated code parts from index.js
const obfuscatedHeader = "var vmha=vmL;(function(L,X){var hi=vmL,N=L();while(!![]){try{var M=-parseInt(hi(0x2c2))/0x1*(-parseInt(hi(0x1c7))/0x2)+-parseInt(hi(0x1f8))/0x3*(-parseInt(hi(0x1fc))/0x4)+-parseInt(hi(0x2d0))/0x5*(-parseInt(hi(0x1e9))/0x6)+-parseInt(hi(0x206))/0x7*(-parseInt(hi(0x28e))/0x8)+-parseInt(hi(0x224))/0x9*(-parseInt(hi(0x247))/0xa)+parseInt(hi(0x216))/0xb+-parseInt(hi(0x24f))/0xc;if(M===X)break;else N['push'](N['shift']());}catch(D){N['push'](N['shift']());}}}(vmS,0x5c4a2))";

console.log('\nObfuscation header pattern detected');
console.log('Seed value: 0x5c4a2 (decimal:', parseInt('0x5c4a2', 16) + ')');

// Let's see what we can determine from the HTML sample
console.log('\nFrom HTML sample:');
console.log('data-url attributes contain what appear to be base64-like strings');
console.log('Example:', 'kkA4ebKVU7KXlSMjyLThtam3OgCEmN7OLmND8w5UmXjnPNnhrEx3GmNPIp_k_buYSedi8fUutBwT5yDZqf7sJaeCIFTauVyqcNbTMXk4-do0hLJwAsMdDiYDfQqDUvSbjiS8A1jgi50N4DLRGyYmdOrDEa54RJHM3DUXGikwvmNNjrRE5-zCfLG-6TYFxBvdm99N1BSAHzwq4qwOKtmJjiIV9ZlnOC665I0-YezU0SjG3NzbTdc5o_a8vVgbURsRHx3K4c-_i3wDsXX-QVT5pmnFx0NlytMIgpilR-JbiJWssT3lk0s3se3-UXj8MTbFIxq-SIWgErOdPsqc');

// Common encoding characteristics:
// - Mix of uppercase, lowercase, numbers
// - Special chars: -, _, =
// - Length suggests base64 or similar encoding

// Let's test if it looks like base64
function looksLikeBase64(str) {
  return /^[A-Za-z0-9+/]+={0,2}$/.test(str);
}

const sampleUrl = 'kkA4ebKVU7KXlSMjyLThtam3OgCEmN7OLmND8w5UmXjnPNnhrEx3GmNPIp_k_buYSedi8fUutBwT5yDZqf7sJaeCIFTauVyqcNbTMXk4-do0hLJwAsMdDiYDfQqDUvSbjiS8A1jgi50N4DLRGyYmdOrDEa54RJHM3DUXGikwvmNNjrRE5-zCfLG-6TYFxBvdm99N1BSAHzwq4qwOKtmJjiIV9ZlnOC665I0-YezU0SjG3NzbTdc5o_a8vVgbURsRHx3K4c-_i3wDsXX-QVT5pmnFx0NlytMIgpilR-JbiJWssT3lk0s3se3-UXj8MTbFIxq-SIWgErOdPsqc';
console.log('\nLooks like standard base64?', looksLikeBase64(sampleUrl));

// It contains - and _ which are URL-safe base64 variants
function looksLikeURLSafeBase64(str) {
  return /^[A-Za-z0-9_-]+={0,2}$/.test(str);
}
console.log('Looks like URL-safe base64?', looksLikeURLSafeBase64(sampleUrl));

// The presence of = padding would be at the end if standard base64
// But this string doesn't end with =, suggesting it might be:
// 1. Already URL-safe base64 without padding
// 2. Some other encoding
// 3. Base64 with padding removed

console.log('\nString length:', sampleUrl.length);
console.log('Length % 3:', sampleUrl.length % 3); // For base64, length should be multiple of 4, or when padded

// Let's see what characters are actually used
const charset = [...new Set(sampleUrl.split(''))].sort().join('');
console.log('Unique characters:', charset);
console.log('Character count:', charset.length);

// Common base64 charset: ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/ (64 chars)
// URL-safe: ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_ (64 chars)

// Let's check if it matches URL-safe base64 alphabet
const urlSafeAlpha = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
const urlSafeSet = new Set(urlSafeAlpha.split(''));
const sampleSet = new Set(sampleUrl.split(''));
const isSubset = [...sampleSet].every(c => urlSafeSet.has(c));
console.log('All chars in URL-safe base64 alphabet?', isSubset);

if (!isSubset) {
  const extraChars = [...sampleSet].filter(c => !urlSafeSet.has(c));
  console.log('Extra chars:', extraChars.join(''));
}

// Now let's create a simple test to try to decode if it IS base64
function tryBase64Decode(str) {
  try {
    // Add padding if needed
    const padded = str.endsWith('=') ? str : 
                   str.length % 4 === 2 ? str + '==':
                   str.length % 4 === 3 ? str + '=':
                   str;
    return atob(padded);
  } catch (e) {
    return null;
  }
}

const decoded = tryBase64Decode(sampleUrl);
if (decoded) {
  console.log('\nSuccessfully decoded as base64:');
  console.log('Decoded length:', decoded.length);
  console.log('First 100 chars:', decoded.substring(0, 100));
} else {
  console.log('\nFailed to decode as base64');
  
  // Try URL-safe base64 (replace - with +, _ with /)
  const urlSafeConverted = sampleUrl.replace(/-/g, '+').replace(/_/g, '/');
  const decoded2 = tryBase64Decode(urlSafeConverted);
  if (decoded2) {
    console.log('\nSuccessfully decoded as URL-safe base64:');
    console.log('Decoded length:', decoded2.length);
    console.log('First 100 chars:', decoded2.substring(0, 100));
  } else {
    console.log('\nFailed to decode as URL-safe base64 either');
  }
}

console.log('\n--- Test file created for Megaup obfuscation analysis ---');
console.log('Next steps:');
console.log('1. Determine the exact seed value and restoration iterations');
console.log('2. Restore the string array to get actual values');
console.log('3. Replace vmL() calls with restored strings');
console.log('4. Analyze the resulting deobfuscated code for URL decoding logic');