import { load } from 'cheerio';
import type { Cheerio, CheerioAPI } from 'cheerio';
import type { Element } from 'domhandler';
import type { WcoEpisode, WcoSeriesDetail, WcoSeriesSummary, WcoVideoInfo } from './types.js';
import { cfFetch } from './curl-fetch.js';

export interface WcoFetchOptions {
  baseUrl?: string;
  embedUrl?: string;
  fetchImpl?: typeof fetch;
  signal?: AbortSignal;
}

const DEFAULT_BASE_URL = process.env.WCO_URL ?? 'https://www.wcoflix.tv';
const DEFAULT_EMBED_URL = process.env.WCO_EMBED_URL ?? 'https://embed.wcostream.com/inc/embed';

const USER_AGENT_CHROME =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36';

// REMOVE specific sec-fetch-* headers from the base, they change per request type.
const BASE_HEADERS: Record<string, string> = {
  'accept-language': 'en-US,en;q=0.9',
  'cache-control': 'no-cache',
  'pragma': 'no-cache',
  'sec-ch-ua': '"Not:A-Brand";v="99", "Brave";v="145", "Chromium";v="145"',
  'sec-ch-ua-mobile': '?0',
  'sec-ch-ua-platform': '"Linux"',
  'sec-gpc': '1',
  'user-agent': USER_AGENT_CHROME
};

// Common HTML Page load headers
const PAGE_HEADERS: Record<string, string> = {
  ...BASE_HEADERS,
  'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  'sec-fetch-dest': 'document',
  'sec-fetch-mode': 'navigate',
  'sec-fetch-site': 'none',
  'sec-fetch-user': '?1',
  'upgrade-insecure-requests': '1'
};

function toAbsoluteUrl(value: string, base: string): string {
  try {
    return new URL(value, base).toString();
  } catch {
    return value;
  }
}

function extractEpisodes(document: CheerioAPI, baseUrl: string): WcoEpisode[] {
  const episodes: WcoEpisode[] = [];
  const primaryNodes = document('div.cat-eps');

  const pushFromAnchor = (anchor: Cheerio<Element>, fallbackTitle?: string) => {
    const href = anchor.attr('href');
    const title = (anchor.text() || fallbackTitle || '').trim();
    if (!href || !title) return;
    episodes.push({ title, url: toAbsoluteUrl(href, baseUrl) });
  };

  if (primaryNodes.length > 0) {
    primaryNodes.each((_, element) => {
      const anchor = document(element).find('a').first();
      if (anchor.length === 0) return;
      pushFromAnchor(anchor);
    });
  } else {
    const fallbackNodes = document('div#episodeList > a');
    fallbackNodes.each((_, element) => {
      const anchor = document(element);
      const title = anchor.find('span').first().text().trim();
      pushFromAnchor(anchor, title);
    });
  }

  return episodes.reverse();
}

function isWcoRelatedUrl(url: string): boolean {
  return url.includes('wcoflix.tv') ||
    url.includes('wcostream.com') ||
    url.includes('/getvid?evid=');
}

async function performFetch(url: string, init: RequestInit, customFetchImpl?: typeof fetch) {
  const fetchFn = isWcoRelatedUrl(url) ? cfFetch : (customFetchImpl ?? fetch);
  const response = await fetchFn(url, init);
  if (!response.ok) {
    throw new Error(`WCO request failed: ${response.status} ${response.statusText}`);
  }
  return response;
}

export async function searchSeries(keyword: string, options: WcoFetchOptions = {}): Promise<WcoSeriesSummary[]> {
  const baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
  const fetchImpl = options.fetchImpl;
  const form = new FormData();
  form.append('catara', keyword);
  form.append('konuara', 'series');
  const response = await performFetch(`${baseUrl}/search`, {
    method: 'POST',
    body: form,
    headers: PAGE_HEADERS
  }, fetchImpl);
  const html = await response.text();
  const $ = load(html);
  const items: WcoSeriesSummary[] = [];
  $('ul.items > li').each((_, element) => {
    const anchor = $('div.recent-release-episodes > a', element).first();
    const title = anchor.text().trim();
    if (!title) return;
    let url = anchor.attr('href');
    if (!url) return;
    if (!/^https?:\/\//i.test(url)) {
      url = `${baseUrl}${url}`;
    }
    const thumbnail = $('img', element).first().attr('src') ?? undefined;
    items.push({ title, url, thumbnail });
  });
  return items;
}

export async function getSeriesDetail(seriesUrl: string, options: WcoFetchOptions = {}): Promise<WcoSeriesDetail> {
  const fetchImpl = options.fetchImpl;
  const response = await performFetch(seriesUrl, {
    headers: PAGE_HEADERS
  }, fetchImpl);
  const html = await response.text();
  const $ = load(html);
  const title = $('.video-title > h1').text().trim();
  if (!title) {
    throw new Error('WCO detail page missing title');
  }
  const thumbnail = $('#sidebar_cat > img.img5').attr('src') ?? undefined;
  const description = $('#sidebar_cat > p').text().trim() || undefined;
  const tags: string[] = [];
  $('#sidebar_cat > .genre-buton').each((_, element) => {
    const tagText = $(element).text().trim();
    if (tagText) {
      tags.push(tagText);
    }
  });
  const episodes = extractEpisodes($, seriesUrl);
  return {
    title,
    url: seriesUrl,
    thumbnail,
    description,
    tags,
    episodes
  };
}

function createLinkInfoBase(embedOrigin: string): string {
  if (embedOrigin.includes('/inc/embed')) {
    return embedOrigin.split('/inc/embed')[0];
  }
  return embedOrigin;
}

async function resolveCdnUrl(server: string, evid: string, embedUrl: string): Promise<string> {
  const url = `${server}/getvid?evid=${evid}&json`;
  const embedOrigin = new URL(embedUrl).origin;

  const response = await cfFetch(url, {
    headers: {
      ...BASE_HEADERS,
      'accept': '*/*',
      'origin': embedOrigin,
      'referer': `${embedOrigin}/`, // Cross-site fetch must point to the domain origin
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-site'
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to resolve CDN URL: ${response.status}`);
  }

  let cdnUrl = (await response.text()).trim();

  // Response might be JSON-encoded string with escaped slashes
  if (cdnUrl.startsWith('"') && cdnUrl.endsWith('"')) {
    try {
      cdnUrl = JSON.parse(cdnUrl);
    } catch {
      // Not valid JSON, use as-is
    }
  }

  // Strip &json from end if present
  cdnUrl = cdnUrl.replace(/&json$/, '');

  if (!cdnUrl.startsWith('http')) {
    throw new Error(`Invalid CDN URL received: ${cdnUrl.slice(0, 100)}`);
  }
  return cdnUrl;
}

export async function getVideoInfo(episodeUrl: string, options: WcoFetchOptions = {}): Promise<WcoVideoInfo> {
  const fetchImpl = options.fetchImpl;

  // Step 1: Get episode page
  const episodeResponse = await performFetch(episodeUrl, {
    headers: PAGE_HEADERS
  }, fetchImpl);
  const episodeHtml = await episodeResponse.text();

  const iframeMatch = episodeHtml.match(/<iframe[^>]+src="([^"]*embed[^"]*)"/i);
  if (!iframeMatch) {
    throw new Error('Unable to locate embed iframe on episode page');
  }

  const embedUrl = iframeMatch[1];

  // Step 2: Fetch embed immediately
  const embedResponse = await performFetch(embedUrl, {
    headers: {
      ...PAGE_HEADERS,
      'referer': episodeUrl,
      'sec-fetch-dest': 'iframe',
      'sec-fetch-site': 'cross-site'
    }
  }, fetchImpl);

  const embedHtml = await embedResponse.text();

  // Step 3: Extract getvidlink from embed page
  const linkMatch = embedHtml.match(/["']?\/inc\/embed\/getvidlink\.php[^"'\s>]+["']?/);
  if (!linkMatch) {
    throw new Error('Unable to extract getvidlink path from embed page');
  }

  const rawLink = linkMatch[0].replace(/^['"]|['"]$/g, '');
  const embedOrigin = options.embedUrl ?? DEFAULT_EMBED_URL;
  const linkInfoBase = createLinkInfoBase(embedOrigin);
  const linkInfoUrl = new URL(rawLink, linkInfoBase);
  const fileName = linkInfoUrl.searchParams.get('v') ?? 'video';

  // Step 4: Fetch link info (Must be identical to a browser's AJAX request)
  const linkInfoResponse = await performFetch(linkInfoUrl.toString(), {
    headers: {
      ...BASE_HEADERS,
      'accept': 'application/json, text/javascript, */*; q=0.01',
      'referer': embedUrl,
      'x-requested-with': 'XMLHttpRequest',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-origin'
    }
  }, fetchImpl);

  const linkInfo = await linkInfoResponse.json();
  if (!linkInfo?.server || !linkInfo?.enc) {
    throw new Error('Invalid video link information');
  }

  // Step 5: Resolve actual CDN URLs
  const video: WcoVideoInfo = {
    url: await resolveCdnUrl(linkInfo.server, linkInfo.enc, embedUrl),
    filename: `${fileName}.mp4`
  };

  if (linkInfo.hd) {
    video.hdUrl = await resolveCdnUrl(linkInfo.server, linkInfo.hd, embedUrl);
  }
  if (linkInfo.fhd) {
    video.fullHdUrl = await resolveCdnUrl(linkInfo.server, linkInfo.fhd, embedUrl);
  }

  return video;
}
