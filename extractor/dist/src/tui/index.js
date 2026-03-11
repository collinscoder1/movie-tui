import { intro, outro, isCancel, select } from '@clack/prompts';
import { selectQueue, selectSubtitleLanguage, selectQualityPreference } from './prompts.js';
import { buildDescriptors } from './descriptors.js';
import { processDescriptor } from './downloads.js';
async function main() {
    intro('vidsrc download manager TUI');
    try {
        const mode = await select({
            message: 'How would you like to locate the media?',
            options: [
                { value: 'url', label: 'Provide a vidSrc URL' },
                { value: 'tmdb', label: 'Lookup by TMDb ID' },
                { value: 'name', label: 'Search by name' }
            ]
        });
        if (isCancel(mode)) {
            outro('Operation canceled.');
            return;
        }
        const descriptors = await buildDescriptors(mode);
        if (!descriptors.length) {
            outro('No episodes selected.');
            return;
        }
        const queueId = await selectQueue();
        const prefs = await collectPreferences();
        let successCount = 0;
        let failCount = 0;
        let skipCount = 0;
        for (const descriptor of descriptors) {
            console.log(`\nProcessing ${descriptor.description} ...`);
            const result = await processDescriptor(descriptor, queueId, prefs);
            if (result === 'success')
                successCount++;
            else if (result === 'fail')
                failCount++;
            else
                skipCount++;
        }
        console.log(`\n=== Summary: ${successCount} queued, ${failCount} failed, ${skipCount} skipped ===`);
        outro('Download requests submitted.');
    }
    catch (error) {
        outro(`Error: ${error instanceof Error ? error.message : String(error)}`);
    }
}
async function collectPreferences() {
    const subtitleLanguage = await selectSubtitleLanguage();
    const qualityPreference = await selectQualityPreference();
    return { subtitleLanguage, qualityPreference };
}
main();
