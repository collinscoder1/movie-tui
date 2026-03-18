#!/usr/bin/env node
import { extractVidsrcLinks } from './source/providers/vidsrc/extractor.js';

async function main(): Promise<void> {
  const [target] = process.argv.slice(2);
  if (!target) {
    console.error('Provide a dl.vidsrc url to extract.');
    process.exit(1);
  }
  try {
    const result = await extractVidsrcLinks(target);
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Extraction failed:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
