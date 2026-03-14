import { intro, outro, isCancel, select, confirm, text } from '@clack/prompts';
import { EpisodeDescriptor, SearchResult, createSource, SourceKey, MediaSource } from '../source/index.js';
import { selectQueue, selectSubtitleLanguage, selectQualityPreference, selectDownloadPath, chooseSeason, selectResolution } from './prompts.js';
import { processDescriptor } from './downloads.js';
import { UserPreferences } from './types.js';
import { loadDefaultConfig, loadConfig, listConfigs, saveConfig, setDefaultConfig, Config, validateDownloadPath } from '../config.js';
import { runConfigTui } from './config-tui.js';
import { checkExistingDownloads, formatVerificationResults } from './file-checker.js';
import { multiselect } from '@clack/prompts';
import { parseEpisodeInput } from '../search.js';
import { SourceTvSeasonInfo, SourceMovieInfo, MediaType } from '../source/types.js';

type ActionType = 'download' | 'verify' | 'undownloaded';
type SearchMode = 'url' | 'tmdb' | 'name';

type SeasonInfo = SourceTvSeasonInfo;
type MovieInfo = SourceMovieInfo;

async function main(): Promise<void> {
  intro('vidsrc download manager TUI');
  try {
    // STEP 1: Config Selection (BLOCKING - must have downloadPath)
    const config = await selectConfigBlocking();
    if (!config || !config.downloadPath) {
      outro('Configuration with download path required. Please create a configuration first.');
      return;
    }

    // STEP 2: Show selected config
    console.log(`\nUsing configuration: ${config.name}`);
    console.log(`  Download path: ${config.downloadPath}`);
    console.log(`  Subtitle: ${config.subtitleLanguage ?? 'none'}`);
    console.log(`  Format: ${config.preferredFormat}`);
    console.log(`  Resolution: ${config.preferredResolution}`);

    // STEP 3: Convert to prefs
    const prefs = configToPrefs(config);
    const baseFolder = config.downloadPath;

    // STEP 4: Select source provider
    const sourceKey = await select({
      message: 'Select content source:',
    options: [
      { value: 'vidsrc', label: 'VidSrc (vidsrc.vip)' },
      { value: 'moviebox', label: 'Moviebox' },
      { value: 'wco', label: 'WCO (wcoflix.tv)' }
    ]
  });

    if (isCancel(sourceKey)) {
      outro('Operation canceled.');
      return;
    }

    // Create the source instance
    const source = createSource(sourceKey as SourceKey);

    // STEP 5: Media search mode (some modes may not work with all sources)
    const modeOptions: Array<{ value: SearchMode; label: string }> = [
      { value: 'url', label: 'Provide a URL' },
      { value: 'tmdb', label: 'Lookup by TMDb ID' },
      { value: 'name', label: 'Search by name' }
    ];

    const unsupportedModes: Partial<Record<SourceKey, SearchMode[]>> = {
      moviebox: ['url'],
      wco: ['tmdb']
    };

    const filteredModes = modeOptions.filter((option) =>
      !(unsupportedModes[sourceKey as SourceKey] ?? []).includes(option.value)
    );

    const mode = await select({
      message: 'How would you like to locate the media?',
      options: filteredModes
    });

    if (isCancel(mode)) {
      outro('Operation canceled.');
      return;
    }

    // STEP 6: Get season/show info (not individual episodes yet)
    const seasonInfo = await getSeasonInfo(mode as SearchMode, source);
    if (!seasonInfo) {
      outro('No media selected.');
      return;
    }

    // Handle movies differently - they're simple
    if (seasonInfo.type === 'movie') {
      const descriptor: EpisodeDescriptor = {
        type: 'movie',
        tmdbId: seasonInfo.tmdbId,
        season: null,
        episode: null,
        description: `${seasonInfo.title} (movie)`,
        title: seasonInfo.title,
        metadata: seasonInfo.metadata
      };

      // For movies, just ask what to do
      const action = await selectMovieAction();

      if (action === 'verify') {
        console.log('\nChecking existing downloads...');
        const { downloaded } = await checkExistingDownloads([descriptor], baseFolder);
        console.log(formatVerificationResults([descriptor], downloaded));
        outro('Done.');
        return;
      }

      // Download or Undownloaded
      let descriptorsToProcess: EpisodeDescriptor[] = [descriptor];
      if (action === 'undownloaded') {
        const { missing } = await checkExistingDownloads([descriptor], baseFolder);
        if (missing.length === 0) {
          console.log('\nMovie already downloaded!');
          outro('Done.');
          return;
        }
    descriptorsToProcess = missing;
    }

    // Select resolution for movie
    const selectedRes = await selectResolution(prefs.qualityPreference.resolution);
    prefs.qualityPreference.resolution = selectedRes;

    await processDownloads(descriptorsToProcess, source, prefs, baseFolder);
    return;
  }

    // STEP 6: For TV shows - Select action first
    const action = await selectTvAction();

    if (action === 'verify') {
      // Build all episode descriptors
      const descriptors = seasonInfo.episodes.map(ep => ({
        type: 'tv' as const,
        tmdbId: seasonInfo.tmdbId,
        season: seasonInfo.seasonNumber,
        episode: ep.episode_number,
        description: `${seasonInfo.title} S${seasonInfo.seasonNumber}E${ep.episode_number}`,
        title: seasonInfo.title,
        metadata: seasonInfo.metadata
      }));

      console.log('\nChecking existing downloads...');
      const { downloaded } = await checkExistingDownloads(descriptors, baseFolder);
      console.log(formatVerificationResults(descriptors, downloaded));
      outro('Done.');
      return;
    }

    // STEP 7: Select episodes (for download or undownloaded)
    const selectedEpisodes = await selectEpisodesFromSeason(seasonInfo);
    if (selectedEpisodes.length === 0) {
      outro('No episodes selected.');
      return;
    }

    // Build descriptors for selected episodes
    let descriptors: EpisodeDescriptor[] = selectedEpisodes.map(ep => ({
      type: 'tv',
      tmdbId: seasonInfo.tmdbId,
      season: seasonInfo.seasonNumber,
      episode: ep.episode_number,
      description: `${seasonInfo.title} S${seasonInfo.seasonNumber}E${ep.episode_number}`,
      title: seasonInfo.title,
      metadata: seasonInfo.metadata
    }));

    // STEP 8: Handle undownloaded action
    if (action === 'undownloaded') {
      const { missing } = await checkExistingDownloads(descriptors, baseFolder);
      if (missing.length === 0) {
        console.log('\nAll selected episodes already downloaded!');
        outro('Done.');
        return;
      }
    console.log(`\nFound ${missing.length} missing episodes. Queuing...`);
    descriptors = missing;
  }

  // Select resolution for all episodes
  const selectedRes = await selectResolution(prefs.qualityPreference.resolution);
  prefs.qualityPreference.resolution = selectedRes;

  await processDownloads(descriptors, source, prefs, baseFolder);

  } catch (error) {
    outro(`Error: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function getSeasonInfo(mode: SearchMode, source: MediaSource): Promise<SeasonInfo | MovieInfo | null> {
  if (mode === 'url') {
    const value = await text({ message: 'Enter the vidSrc URL:' });
    if (isCancel(value) || !value) {
      throw new Error('Canceled by user.');
    }
    const info = await source.describeFromUrl(value);
    if (info.type === 'movie') {
      return { type: 'movie', tmdbId: info.tmdbId, title: info.title, metadata: info.metadata };
    }
    return {
      type: 'tv',
      tmdbId: info.tmdbId,
      title: info.title,
      seasonNumber: info.season ?? info.seasonNumber,
      episodes: info.episodes,
      metadata: info.metadata
    };
  }

  const mediaTypeSelection = await select({
    message: 'Is it a movie or TV show?',
    options: [
      { value: 'movie', label: 'Movie' },
      { value: 'tv', label: 'TV show' }
    ]
  });
  if (isCancel(mediaTypeSelection)) {
    throw new Error('Canceled by user.');
  }
  const mediaType = mediaTypeSelection as MediaType;

  let tmdbId: string;

  if (mode === 'tmdb') {
    const idInput = await text({ message: 'Enter the TMDb ID:' });
    if (isCancel(idInput) || !idInput) {
      throw new Error('Canceled by user.');
    }
    tmdbId = idInput.trim();
  } else {
    const query = await text({ message: 'Enter name query:' });
    if (isCancel(query) || !query) {
      throw new Error('Canceled by user.');
    }
    const searchResults = await source.searchByName(mediaType, query.trim());
    if (!searchResults.length) {
      throw new Error('No results found for this query.');
    }
    const options = searchResults.map((item) => ({
      value: item,
      label: `${item.title} (${item.year})`
    }));
    const choice = await select({ message: 'Pick a result', options });
    if (isCancel(choice)) {
      throw new Error('Canceled by user.');
    }
    tmdbId = (choice as SearchResult).tmdbId;
  }

  if (mediaType === 'movie') {
    const details = await source.fetchMovieMetadata(tmdbId);
    return { type: 'movie', tmdbId, title: details.title, metadata: (details as any).metadata };
  }

  const show = await source.fetchShowDetails(tmdbId);
  const seasonNumber = await chooseSeason(show.seasons);
  const episodes = await source.fetchSeasonEpisodes(tmdbId, seasonNumber);
  
  const episodeMetadata = episodes.map(ep => ({
    episode_number: ep.episode_number,
    name: ep.name,
    metadata: ep.metadata
  }));
  
  return {
    type: 'tv',
    tmdbId,
    title: show.name,
    seasonNumber,
    episodes: episodeMetadata,
    metadata: show.metadata
  };
}

async function selectEpisodesFromSeason(seasonInfo: SeasonInfo): Promise<Array<{ episode_number: number; name?: string }>> {
  const choice = await select({
    message: `Season ${seasonInfo.seasonNumber} has ${seasonInfo.episodes.length} episodes. What would you like to do?`,
    options: [
      { value: 'all', label: 'Select all episodes' },
      { value: 'select', label: 'Select specific episodes (space to toggle)' },
      { value: 'custom', label: 'Enter episode range (e.g., 1-3,5)' }
    ]
  });

  if (isCancel(choice)) {
    throw new Error('Canceled by user.');
  }

  if (choice === 'all') {
    return seasonInfo.episodes;
  }

  if (choice === 'select') {
    const options = seasonInfo.episodes.map(ep => ({
      value: ep.episode_number,
      label: `Episode ${ep.episode_number}${ep.name ? `: ${ep.name}` : ''}`,
      hint: ep.name
    }));
    const selected = await multiselect({
      message: 'Select episodes (space to toggle, enter to confirm):',
      options
    });
    if (isCancel(selected)) {
      throw new Error('Canceled by user.');
    }
    return seasonInfo.episodes.filter(ep => (selected as number[]).includes(ep.episode_number));
  }

  // Custom range input
  const rangeInput = await text({
    message: 'Enter episode range (e.g., 1-3,5,7-10):'
  });
  if (isCancel(rangeInput) || !rangeInput) {
    throw new Error('Canceled by user.');
  }
  const available = seasonInfo.episodes.map(ep => ep.episode_number);
  const parsed = parseEpisodeInput(rangeInput, available);
  if (parsed.length === 0) {
    throw new Error('No valid episodes in range.');
  }
  return seasonInfo.episodes.filter(ep => parsed.includes(ep.episode_number));
}

async function selectTvAction(): Promise<ActionType> {
  const choice = await select({
    message: 'What would you like to do?',
    options: [
      { value: 'download', label: 'Download episodes' },
      { value: 'verify', label: 'Verify existing downloads' },
      { value: 'undownloaded', label: 'Download missing episodes only' }
    ]
  });
  if (isCancel(choice)) {
    throw new Error('Canceled by user.');
  }
  return choice as ActionType;
}

async function selectMovieAction(): Promise<ActionType> {
  const choice = await select({
    message: 'What would you like to do?',
    options: [
      { value: 'download', label: 'Download movie' },
      { value: 'verify', label: 'Verify existing download' },
      { value: 'undownloaded', label: 'Download if missing' }
    ]
  });
  if (isCancel(choice)) {
    throw new Error('Canceled by user.');
  }
  return choice as ActionType;
}

async function processDownloads(
  descriptors: EpisodeDescriptor[],
  source: MediaSource,
  prefs: UserPreferences,
  baseFolder: string
): Promise<void> {
  // Select queue
  const queueId = await selectQueue();
  if (isCancel(queueId)) {
    throw new Error('Canceled by user.');
  }

  // Confirm download
  const confirmed = await confirm({
    message: `Queue ${descriptors.length} item(s) for download?`
  });
  if (isCancel(confirmed) || !confirmed) {
    outro('Download canceled.');
    return;
  }

  // Process each descriptor
  console.log('\nProcessing downloads...\n');
  let success = 0;
  let fail = 0;
  let skip = 0;

  for (const descriptor of descriptors) {
    const result = await processDescriptor(descriptor, source, queueId, prefs, baseFolder);
    if (result === 'success') success++;
    else if (result === 'fail') fail++;
    else skip++;
  }

  console.log(`\n=== Summary: ${success} queued, ${fail} failed, ${skip} skipped ===\n`);
  outro('Download requests submitted.');
}

async function selectConfigBlocking(): Promise<Config | null> {
  const configNames = await listConfigs();
  if (configNames.length === 0) {
    console.log('No configurations found. Opening config setup...\n');
    await runConfigTui();
    const updatedNames = await listConfigs();
    if (updatedNames.length === 0) {
      return null;
    }
    // Load first available config after creating one
    const firstName = updatedNames[0];
    return loadConfig(firstName);
  }

  // Load all configs to check which is default
  const configs = (await Promise.all(configNames.map(loadConfig))).filter((c): c is Config => c !== null);
  
  const defaultConfig = configs.find(c => c.name === configNames[0]); // First config is typically default
  if (defaultConfig) {
    const useDefault = await confirm({
      message: `Use configuration "${defaultConfig.name}"?`
    });
    if (isCancel(useDefault)) {
      throw new Error('Canceled by user.');
    }
    if (useDefault) {
      return defaultConfig;
    }
  }

  const options = [
    ...configs.map(c => ({ value: c.name, label: c.name })),
    { value: 'new', label: 'Create new configuration' }
  ];
  const choice = await select({ message: 'Select configuration:', options });
  if (isCancel(choice)) {
    throw new Error('Canceled by user.');
  }
  if (choice === 'new') {
    await runConfigTui();
    const updatedNames = await listConfigs();
    const newestName = updatedNames[updatedNames.length - 1];
    return newestName ? loadConfig(newestName) : null;
  }

  return loadConfig(choice as string);
}

function configToPrefs(config: Config): UserPreferences {
  return {
    subtitleLanguage: config.subtitleLanguage ?? null,
    qualityPreference: {
      format: config.preferredFormat ?? 'any',
      resolution: config.preferredResolution ?? null
    }
  };
}

main();
