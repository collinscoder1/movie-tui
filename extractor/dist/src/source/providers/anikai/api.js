import { load } from 'cheerio';
import { decodeDynamicValue, encodeDynamicValue } from './crypto.js';
const DEFAULT_BASE_URL = process.env.ANIKAI_URL ?? 'https://anikai.to';
const USER_AGENT_CHROME = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36';
const PAGE_HEADERS = {
    accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'accept-language': 'en-US,en;q=0.9',
    'cache-control': 'no-cache',
    pragma: 'no-cache',
    'sec-ch-ua': '"Not:A-Brand";v="99", "Brave";v="145", "Chromium";v="145"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Linux"',
    'sec-fetch-dest': 'document',
    'sec-fetch-mode': 'navigate',
    'sec-fetch-site': 'none',
    'sec-fetch-user': '?1',
    'upgrade-insecure-requests': '1',
    'user-agent': USER_AGENT_CHROME
};
const AJAX_HEADERS = {
    accept: 'application/json, text/javascript, */*; q=0.01',
    'accept-language': 'en-US,en;q=0.9',
    'cache-control': 'no-cache',
    pragma: 'no-cache',
    'sec-ch-ua': '"Not:A-Brand";v="99", "Brave";v="145", "Chromium";v="145"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Linux"',
    'sec-fetch-dest': 'empty',
    'sec-fetch-mode': 'cors',
    'sec-fetch-site': 'same-origin',
    'user-agent': USER_AGENT_CHROME,
    'x-requested-with': 'XMLHttpRequest'
};
function toAbsoluteUrl(value, baseUrl) {
    try {
        return new URL(value, baseUrl).toString();
    }
    catch {
        return value;
    }
}
function extractCount(value) {
    const match = value.match(/\d+/);
    return match ? Number.parseInt(match[0], 10) : null;
}
function parseEpisodeCount($) {
    let count = null;
    $('.main-entity .detail > div > div').each((_, element) => {
        const row = $(element);
        const labelText = row.clone().children().remove().end().text().trim();
        if (labelText.startsWith('Episodes:')) {
            count = extractCount(row.find('span').first().text());
        }
    });
    return count;
}
function normalizeUrl(value) {
    try {
        const url = new URL(value);
        url.hash = '';
        url.search = '';
        if (url.pathname.length > 1) {
            url.pathname = url.pathname.replace(/\/+$/, '');
        }
        return url.toString();
    }
    catch {
        return value.split('#')[0]?.replace(/\/+$/, '') ?? value;
    }
}
function parseSeasonNumber(value) {
    const match = value?.match(/\bseason\s+(\d+)\b/i);
    if (!match)
        return null;
    const seasonNumber = Number.parseInt(match[1], 10);
    return Number.isFinite(seasonNumber) ? seasonNumber : null;
}
function parseSeasons($, canonicalUrl, watchUrl, baseUrl) {
    const normalizedCanonicalUrl = normalizeUrl(canonicalUrl);
    const normalizedWatchUrl = normalizeUrl(watchUrl);
    const seasons = [];
    const seen = new Set();
    $('#seasons .swiper-slide').each((index, element) => {
        const root = $(element);
        const href = root.find('a.poster').attr('href')?.trim();
        if (!href)
            return;
        const url = toAbsoluteUrl(href, baseUrl);
        const normalizedUrl = normalizeUrl(url);
        if (seen.has(normalizedUrl))
            return;
        seen.add(normalizedUrl);
        const label = root.find('.detail span').first().text().trim() || `Season ${index + 1}`;
        const seasonNumber = parseSeasonNumber(label) ?? index + 1;
        const episodeCount = extractCount(root.find('.detail .btn').first().text());
        const isCurrent = root.hasClass('active')
            || normalizedUrl === normalizedCanonicalUrl
            || normalizedUrl === normalizedWatchUrl;
        seasons.push({
            seasonNumber,
            url,
            episodeCount,
            label,
            isCurrent
        });
    });
    return seasons.sort((left, right) => left.seasonNumber - right.seasonNumber);
}
function parseMediaKind(raw) {
    const value = raw?.trim().toUpperCase();
    return value ? value : null;
}
function buildEpisodes(count) {
    if (!count || count < 1)
        return [];
    return Array.from({ length: count }, (_, index) => ({
        episode: index + 1,
        title: `Episode ${index + 1}`
    }));
}
function parseAjaxPayload(text) {
    const payload = JSON.parse(text);
    if (payload.status !== 'ok' || typeof payload.result !== 'string') {
        throw new Error('AnimeKAI AJAX response missing result payload');
    }
    return payload;
}
function parseSyncData($) {
    const raw = $('#syncData').text().trim();
    if (!raw)
        return null;
    try {
        return JSON.parse(raw);
    }
    catch {
        return null;
    }
}
export function parseSearchResponse(html, baseUrl = DEFAULT_BASE_URL) {
    const $ = load(html);
    const items = [];
    const seen = new Set();
    $('.aitem-wrapper.regular .aitem').each((_, element) => {
        const root = $(element);
        const href = root.find('a.poster').attr('href');
        const titleNode = root.find('a.title').first();
        const title = titleNode.attr('title')?.trim() || titleNode.text().trim();
        if (!href || !title)
            return;
        const url = toAbsoluteUrl(href, baseUrl);
        if (seen.has(url))
            return;
        seen.add(url);
        const infoBolds = root.find('.info b').map((_, node) => $(node).text().trim()).get();
        const episodeCount = extractCount(infoBolds[0] ?? '');
        const kind = parseMediaKind(infoBolds[infoBolds.length - 1]);
        const subCount = extractCount(root.find('.info .sub').first().text());
        const dubCount = extractCount(root.find('.info .dub').first().text());
        items.push({
            title,
            url,
            kind,
            episodeCount,
            subCount,
            dubCount
        });
    });
    return items;
}
export function parseWatchResponse(html, watchUrl) {
    const $ = load(html);
    const syncData = parseSyncData($);
    const title = $('.main-entity h1.title').first().text().trim() || syncData?.name?.trim();
    if (!title) {
        throw new Error('AnimeKAI watch page missing title');
    }
    const canonicalUrl = $('link[rel="canonical"]').attr('href')?.trim() || watchUrl.split('#')[0];
    const animeId = $('#anime-rating').attr('data-id')?.trim() || syncData?.anime_id?.trim() || null;
    const mediaKind = parseMediaKind($('.main-entity .info b').last().text());
    const episodeCount = parseEpisodeCount($);
    const seasons = parseSeasons($, canonicalUrl, watchUrl, canonicalUrl);
    const currentSeasonNumber = seasons.find((season) => season.isCurrent)?.seasonNumber
        ?? (mediaKind === 'MOVIE' ? null : 1);
    const seriesUrl = seasons.find((season) => season.seasonNumber === 1)?.url
        ?? syncData?.series_url?.trim()
        ?? canonicalUrl;
    const hashEpisode = (() => {
        try {
            const fragment = new URL(watchUrl).hash;
            const match = fragment.match(/ep=(\d+)/);
            return match ? Number.parseInt(match[1], 10) : null;
        }
        catch {
            return null;
        }
    })();
    const currentEpisodeRaw = hashEpisode ?? (typeof syncData?.episode === 'string'
        ? Number.parseInt(syncData.episode, 10)
        : syncData?.episode ?? null);
    const currentEpisode = Number.isFinite(currentEpisodeRaw) ? Number(currentEpisodeRaw) : null;
    return {
        title,
        url: watchUrl,
        canonicalUrl,
        seriesUrl,
        currentSeasonNumber,
        animeId,
        mediaKind,
        episodeCount,
        currentEpisode,
        seasons: seasons.length > 0
            ? seasons
            : mediaKind === 'MOVIE'
                ? []
                : [{
                        seasonNumber: 1,
                        url: canonicalUrl,
                        episodeCount,
                        label: 'Season 1',
                        isCurrent: true
                    }],
        episodes: buildEpisodes(episodeCount)
    };
}
export function parseEpisodesResponse(text) {
    const payload = parseAjaxPayload(text);
    const $ = load(payload.result ?? '');
    const episodes = [];
    $('.eplist a[token]').each((_, element) => {
        const root = $(element);
        const episode = Number.parseInt(root.attr('num')?.trim() ?? '', 10);
        if (!Number.isFinite(episode))
            return;
        episodes.push({
            episode,
            title: root.find('span').first().text().trim() || `Episode ${episode}`,
            token: root.attr('token')?.trim() ?? null,
            slug: root.attr('slug')?.trim() ?? null,
            langs: Number.parseInt(root.attr('langs')?.trim() ?? '', 10) || null
        });
    });
    return episodes.sort((left, right) => left.episode - right.episode);
}
export function parseLinksResponse(text) {
    const payload = parseAjaxPayload(text);
    const $ = load(payload.result ?? '');
    const servers = [];
    $('.server-items[data-id]').each((_, group) => {
        const category = $(group).attr('data-id')?.trim() ?? 'unknown';
        $(group).find('.server[data-lid]').each((__, element) => {
            const root = $(element);
            const lid = root.attr('data-lid')?.trim();
            const sid = root.attr('data-sid')?.trim();
            const eid = root.attr('data-eid')?.trim();
            if (!lid || !sid || !eid)
                return;
            servers.push({
                category,
                sid,
                eid,
                lid,
                label: root.text().trim() || `Server ${sid}`
            });
        });
    });
    return servers;
}
function buildAjaxUrl(baseUrl, path, paramName, paramValue) {
    const url = new URL(path, baseUrl);
    url.searchParams.set(paramName, paramValue);
    url.searchParams.set('_', encodeDynamicValue(paramValue));
    return url;
}
async function requestHtml(url, options = {}) {
    const fetchImpl = options.fetchImpl ?? fetch;
    const response = await fetchImpl(url, {
        headers: PAGE_HEADERS,
        signal: options.signal
    });
    if (!response.ok) {
        throw new Error(`AnimeKAI request failed: ${response.status} ${response.statusText}`);
    }
    return response.text();
}
async function requestAjax(url, referer, options = {}) {
    const fetchImpl = options.fetchImpl ?? fetch;
    const response = await fetchImpl(url.toString(), {
        headers: {
            ...AJAX_HEADERS,
            origin: url.origin,
            referer
        },
        signal: options.signal
    });
    if (!response.ok) {
        throw new Error(`AnimeKAI AJAX request failed: ${response.status} ${response.statusText}`);
    }
    return response.text();
}
export async function searchAnime(query, options = {}) {
    const baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
    const url = new URL('/browser', baseUrl);
    url.searchParams.set('keyword', query);
    const html = await requestHtml(url.toString(), options);
    return parseSearchResponse(html, baseUrl);
}
export async function getWatchDetail(watchUrl, options = {}) {
    const html = await requestHtml(watchUrl, options);
    const detail = parseWatchResponse(html, watchUrl);
    if (!detail.animeId) {
        return detail;
    }
    try {
        const baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
        const ajaxUrl = buildAjaxUrl(baseUrl, '/ajax/episodes/list', 'ani_id', detail.animeId);
        const text = await requestAjax(ajaxUrl, watchUrl, options);
        const episodes = parseEpisodesResponse(text);
        if (episodes.length > 0) {
            detail.episodes = episodes;
        }
    }
    catch {
        // Fall back to the count-derived episode inventory when AJAX is unavailable.
    }
    return detail;
}
export async function getEpisodeServers(token, watchUrl, options = {}) {
    const baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
    const ajaxUrl = buildAjaxUrl(baseUrl, '/ajax/links/list', 'token', token);
    const text = await requestAjax(ajaxUrl, watchUrl, options);
    return parseLinksResponse(text);
}
export async function resolveServerEmbed(lid, watchUrl, server, options = {}) {
    const baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
    const ajaxUrl = buildAjaxUrl(baseUrl, '/ajax/links/view', 'id', lid);
    const text = await requestAjax(ajaxUrl, watchUrl, options);
    const payload = parseAjaxPayload(text);
    const decoded = decodeDynamicValue(payload.result);
    let url = decoded;
    if (decoded.trim().startsWith('{')) {
        try {
            const parsed = JSON.parse(decoded);
            if (typeof parsed.url === 'string' && parsed.url.trim()) {
                url = parsed.url;
            }
        }
        catch {
            // Keep the raw decoded payload when it is not valid JSON.
        }
    }
    return {
        lid,
        server,
        url
    };
}
