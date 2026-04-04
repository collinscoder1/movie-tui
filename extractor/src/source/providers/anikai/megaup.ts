// @ts-nocheck
const USER_AGENT_CHROME =
	"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36";

const MEDIA_STAGE_KEYS = {
	rc4_69: "ByxtbUSZ8731RKw93Qt5sbA+C2+jti5OIsvW6/kQnuo=",
	rc4_71: "j08xEgACKslVD/8gkcUdPGMfCLL/y8RZ91LoaS8EJmo=",
	rc4_73: "9CyJoa8T0x6WSkCTeIEEhHCr/87IIy07ok36Q4uolZ8=",
	rc4_75: "1jipydFkhK8O2zJLyPIu2P1YuFy2UHVmz7rZvm1m5HY=",
	rc4_77: "wjupjB6E7mqLFW09TaKED/EPF61nyn66MPy9ts6eKcM=",
	key_70: "3ETkwr6iuotF/Q8mF4JgMvFetOO3AqZaI/dKUxrnUdc=",
	key_72: "Jls46iknCTHk5Yl5becrhGqZ/w5Bi5N5C6jj4/LTkXc=",
	key_74: "E9MRZ63geqG82qI/2dziCZyForTK+Jw3PCPeFJg+waA=",
	key_76: "UpvTOIGfPj2yDzZzT1oZTJ7eu/yiVlGWH+Wph1b0jUU=",
	key_78: "YNzVsnUPWAccssXxvkh03G7DRsKSo4l/1oKsmeNCjGY=",
};

function decodeBase64(value) {
	return Buffer.from(value, "base64").toString("binary");
}

function decodeBase64Url(value) {
	let normalized = value.trim();
	const padding = 4 - (normalized.length % 4);
	if (padding < 4) {
		normalized += "=".repeat(padding);
	}

	normalized = normalized.replace(/-/g, "+").replace(/_/g, "/");
	return Buffer.from(normalized, "base64").toString("binary");
}

function rc4Crypt(key, value) {
	const state = Array.from({ length: 256 }, (_item, index) => index);
	let j = 0;

	for (let i = 0; i < 256; i += 1) {
		j = (j + state[i] + key.charCodeAt(i % key.length)) % 256;
		[state[i], state[j]] = [state[j], state[i]];
	}

	let i = 0;
	j = 0;
	let output = "";

	for (let index = 0; index < value.length; index += 1) {
		i = (i + 1) % 256;
		j = (j + state[i]) % 256;
		[state[i], state[j]] = [state[j], state[i]];
		const keyByte = state[(state[i] + state[j]) % 256];
		output += String.fromCharCode(value.charCodeAt(index) ^ keyByte);
	}

	return output;
}

function stringToCharCodes(value) {
	return value.split("").map((char) => char.charCodeAt(0));
}

function charCodesToString(value) {
	return String.fromCharCode.apply(null, value);
}

function computeMegaupCookieName(userAgent = USER_AGENT_CHROME) {
	let sum = 0;
	for (let index = 0; index < userAgent.length; index += 1) {
		sum += userAgent.charCodeAt(index);
	}
	return sum.toString(31);
}

function createMegaupCookie(cookieValue, userAgent = USER_AGENT_CHROME) {
	return {
		name: computeMegaupCookieName(userAgent),
		value:
			cookieValue ??
			Math.floor(900000 * Math.random())
				.toString(31)
				.padStart(1, "0"),
	};
}

function parseCookieHeader(cookieHeader) {
	const match = /^([^=]+)=([^;]+)$/.exec(cookieHeader.trim());
	if (!match) {
		throw new Error(`Invalid cookie header: ${cookieHeader}`);
	}
	return {
		name: match[1],
		value: match[2],
	};
}

function querySelectorLooksNative(enabled) {
	return !!enabled;
}

function normalizedUserAgent(value) {
	try {
		return value.replace(/[^A-Z0-9]/g, "").slice(-30);
	} catch {
		return "";
	}
}

function buildCookieSensitiveKey(seedBase64, options = {}) {
	const output = stringToCharCodes(decodeBase64(seedBase64));
	const userAgent = options.userAgent ?? USER_AGENT_CHROME;
	const querySelectorNative =
		options.querySelectorNative === undefined ? true : options.querySelectorNative;
	const cookieValue = options.cookie?.value ?? "";

	if (querySelectorLooksNative(querySelectorNative)) {
		const uaTail = normalizedUserAgent(userAgent);
		for (let index = 0; index < output.length; index += 4) {
			output[index] = uaTail.charCodeAt(index % uaTail.length);
		}

		for (let index = 0; index < output.length; index += 6) {
			output[index] = cookieValue.charCodeAt(index % cookieValue.length);
		}

		return output;
	}

	for (let index = 0; index < output.length - 5; index += 3) {
		output[index] = output[index + 2];
	}

	return output;
}

function applyFn20(value) {
	return (((value - 234) + 256) % 256);
}

function applyFn21(value) {
	return (((value << 1) & 255) | (value >>> 7));
}

function applyFn24(value) {
	return (((value >>> 2) | ((value << 6) & 255)) & 255);
}

function applyFn25(value) {
	return ((value + 144) % 256);
}

function applyFn27(value) {
	return ((((value << 2) & 255) | (value >>> 6)) & 255);
}

function applyFn33(value) {
	return (((value - 144) + 256) % 256);
}

function applyFn34(value) {
	return ((value + 190) % 256);
}

function applyFn35(value) {
	return (1 ^ value);
}

function applyFn36(value) {
	return (148 ^ value);
}

function applyFn38(value) {
	return ((value + 144) % 256);
}

function applyFn40(value) {
	return (((value << 1) & 255) | (value >>> 7));
}

function applyFn41(value) {
	return (((value >>> 1) | ((value << 7) & 255)) & 255);
}

function applyFn42(value) {
	return (((value - 72) + 256) % 256);
}

function applyFn48(value) {
	return (1 ^ value);
}

function applyFn49(value) {
	return ((value + 234) % 256);
}

function applyFn52(value) {
	return ((((value << 4) & 255) | (value >>> 4)) & 255);
}

function applyFn55(value) {
	return ((((value << 3) & 255) | (value >>> 5)) & 255);
}

function applyFn63(value) {
	return ((((value << 4) & 255) | (value >>> 4)) & 255);
}

function transformStage70(mode, value) {
	switch (mode) {
		case 0:
			return applyFn40(value);
		case 1:
			return applyFn25(value);
		case 2:
			return applyFn24(value);
		case 3:
		case 7:
			return applyFn35(value);
		case 4:
		case 9:
			return applyFn42(value);
		case 5:
			return applyFn21(value);
		case 6:
			return applyFn55(value);
		case 8:
			return applyFn27(value);
		default:
			return value;
	}
}

function transformStage72(mode, value) {
	switch (mode) {
		case 0:
		case 7:
		case 9:
			return applyFn25(value);
		case 1:
			return applyFn52(value);
		case 2:
		case 3:
		case 6:
			return applyFn21(value);
		case 4:
			return applyFn35(value);
		case 5:
			return applyFn20(value);
		case 8:
			return applyFn42(value);
		default:
			return value;
	}
}

function transformStage74(mode, value) {
	switch (mode) {
		case 0:
			return applyFn34(value);
		case 1:
		case 9:
			return applyFn52(value);
		case 2:
			return applyFn27(value);
		case 3:
		case 7:
			return applyFn20(value);
		case 4:
			return applyFn24(value);
		case 5:
			return applyFn25(value);
		case 6:
			return applyFn40(value);
		case 8:
			return applyFn55(value);
		default:
			return value;
	}
}

function transformStage76(mode, value) {
	switch (mode) {
		case 0:
		case 7:
			return applyFn24(value);
		case 1:
			return applyFn21(value);
		case 2:
			return applyFn38(value);
		case 3:
			return applyFn36(value);
		case 4:
			return applyFn34(value);
		case 5:
			return applyFn35(value);
		case 6:
			return applyFn20(value);
		case 8:
			return applyFn27(value);
		case 9:
			return applyFn52(value);
		default:
			return value;
	}
}

function transformStage78(mode, value) {
	switch (mode) {
		case 0:
		case 7:
			return applyFn24(value);
		case 1:
			return applyFn34(value);
		case 2:
		case 5:
			return applyFn42(value);
		case 3:
			return applyFn27(value);
		case 4:
		case 8:
			return applyFn36(value);
		case 6:
			return applyFn20(value);
		case 9:
			return applyFn40(value);
		default:
			return value;
	}
}

function runRc4Stage(input, keyBase64) {
	const key = decodeBase64(keyBase64);
	const decrypted = rc4Crypt(key, charCodesToString(input));
	return stringToCharCodes(decrypted);
}

function stage70(input, key) {
	const source = [...input];
	const output = [];
	let outputIndex = 0;
	let warmupIndex = 0;

	while (source.length) {
		warmupIndex += 1;
		if (warmupIndex <= 10) {
			source.shift();
		}

		let value = source.shift();
		const mode = outputIndex % 10;
		value = transformStage70(mode, value);
		value ^= key[outputIndex % 32];
		output.push(255 & value);
		outputIndex += 1;
	}

	return output;
}

function stage72(input, key) {
	const source = [...input];
	const output = [];
	let outputIndex = 0;
	let warmupIndex = 0;

	while (source.length) {
		warmupIndex += 1;
		if (warmupIndex <= 6) {
			source.shift();
		}

		let value = source.shift();
		const mode = outputIndex % 10;
		value = transformStage72(mode, value);
		value ^= key[outputIndex % 32];
		output.push(255 & value);
		outputIndex += 1;
	}

	return output;
}

function stage74(input, key) {
	const source = [...input];
	const output = [];
	let outputIndex = 0;
	let warmupIndex = 0;

	while (source.length) {
		warmupIndex += 1;
		if (warmupIndex <= 5) {
			source.shift();
		}

		let value = source.shift();
		const mode = outputIndex % 10;
		value = transformStage74(mode, value);
		value ^= key[outputIndex % 32];
		output.push(255 & value);
		outputIndex += 1;
	}

	return output;
}

function stage76(input, key) {
	const source = [...input];
	const output = [];
	let outputIndex = 0;
	let warmupIndex = 0;

	while (source.length) {
		warmupIndex += 1;
		if (warmupIndex <= 9) {
			source.shift();
		}

		let value = source.shift();
		const mode = outputIndex % 10;
		value = transformStage76(mode, value);
		value ^= key[outputIndex % 32];
		output.push(255 & value);
		outputIndex += 1;
	}

	return output;
}

function stage78(input, key) {
	const source = [...input];
	const output = [];
	let outputIndex = 0;
	let warmupIndex = 0;

	while (source.length) {
		warmupIndex += 1;
		if (warmupIndex <= 9) {
			source.shift();
		}

		let value = source.shift();
		const mode = outputIndex % 10;
		value = transformStage78(mode, value);
		value ^= key[outputIndex % 32];
		output.push(255 & value);
		outputIndex += 1;
	}

	return output;
}

function decodeMediaResultNative(token, options = {}) {
	const stages = decodeMediaStagesNative(token, options);
	return decodeURIComponent(charCodesToString(stages.stage78));
}

function decodeMediaStagesNative(token, options = {}) {
	const cookie = typeof options.cookie === "string"
		? parseCookieHeader(options.cookie)
		: options.cookie ?? null;
	const environment = {
		userAgent: options.userAgent ?? USER_AGENT_CHROME,
		querySelectorNative:
			options.querySelectorNative === undefined
				? true
				: options.querySelectorNative,
		cookie,
	};

	const input = stringToCharCodes(decodeBase64Url(token));
	const stage69 = runRc4Stage(input, MEDIA_STAGE_KEYS.rc4_69);
	const stage70Key = buildCookieSensitiveKey(MEDIA_STAGE_KEYS.key_70, environment);
	const stage70Result = stage70(stage69, stage70Key);
	const stage71 = runRc4Stage(stage70Result, MEDIA_STAGE_KEYS.rc4_71);
	const stage72Key = buildCookieSensitiveKey(MEDIA_STAGE_KEYS.key_72, environment);
	const stage72Result = stage72(stage71, stage72Key);
	const stage73 = runRc4Stage(stage72Result, MEDIA_STAGE_KEYS.rc4_73);
	const stage74Key = buildCookieSensitiveKey(MEDIA_STAGE_KEYS.key_74, environment);
	const stage74Result = stage74(stage73, stage74Key);
	const stage75 = runRc4Stage(stage74Result, MEDIA_STAGE_KEYS.rc4_75);
	const stage76Key = buildCookieSensitiveKey(MEDIA_STAGE_KEYS.key_76, environment);
	const stage76Result = stage76(stage75, stage76Key);
	const stage77 = runRc4Stage(stage76Result, MEDIA_STAGE_KEYS.rc4_77);
	const stage78Key = buildCookieSensitiveKey(MEDIA_STAGE_KEYS.key_78, environment);
	const stage78Result = stage78(stage77, stage78Key);

	return {
		input,
		stage69,
		stage70: stage70Result,
		stage71,
		stage72: stage72Result,
		stage73,
		stage74: stage74Result,
		stage75,
		stage76: stage76Result,
		stage77,
		stage78: stage78Result,
	};
}

const PAGE_HEADERS: Record<string, string> = {
  accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  'accept-language': 'en-US,en;q=0.9',
  'cache-control': 'no-cache',
  pragma: 'no-cache',
  'user-agent': USER_AGENT_CHROME
};

const MEDIA_HEADERS: Record<string, string> = {
  accept: 'application/json, text/javascript, */*; q=0.01',
  'accept-language': 'en-US,en;q=0.9',
  'cache-control': 'no-cache',
  pragma: 'no-cache',
  'user-agent': USER_AGENT_CHROME,
  'x-requested-with': 'XMLHttpRequest'
};

function parseEmbedId(input: string): { url: URL; embedId: string } {
  const url = new URL(input);
  const match = url.pathname.match(/^\/(?:e|e2)\/([^/?#]+)/);
  if (!match) {
    throw new Error('Megaup embed URL must match /e/<id> or /e2/<id>');
  }
  return { url, embedId: match[1] };
}

async function requestText(
  url: URL,
  headers: Record<string, string>,
  fetchImpl: typeof fetch,
  signal?: AbortSignal
): Promise<string> {
  const response = await fetchImpl(url.toString(), { headers, signal });
  if (!response.ok) {
    throw new Error(`Megaup request failed: ${response.status} ${response.statusText}`);
  }
  return response.text();
}

export interface MegaupFetchOptions {
  fetchImpl?: typeof fetch;
  signal?: AbortSignal;
  cookie?: string | { name: string; value: string } | null;
  cookieValue?: string | null;
}

export interface MegaupResolvedMediaPayload {
  embedId: string;
  cookie: string;
  mediaUrl: string;
  encryptedResult: string;
  decodedText: string;
  decodedPayload: Record<string, unknown>;
}

export interface MegaupResolvedDownload extends MegaupResolvedMediaPayload {
  downloadUrl: string | null;
}

export async function resolveMegaupMediaPayload(embedUrl: string, options: MegaupFetchOptions = {}): Promise<MegaupResolvedMediaPayload> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const { url, embedId } = parseEmbedId(embedUrl);
  const cookie = typeof options.cookie === 'string'
    ? parseCookieHeader(options.cookie)
    : options.cookie ?? createMegaupCookie(options.cookieValue ?? undefined);
  const cookieHeader = `${cookie.name}=${cookie.value}`;

  const mediaUrl = new URL(`/media/${embedId}`, url.origin);
  mediaUrl.search = url.search;

  const responseText = await requestText(
    mediaUrl,
    {
      ...MEDIA_HEADERS,
      cookie: cookieHeader,
      origin: url.origin,
      referer: embedUrl
    },
    fetchImpl,
    options.signal
  );

  const payload = JSON.parse(responseText) as { status?: number; result?: string };
  if (payload.status !== 200 || typeof payload.result !== 'string') {
    throw new Error('Megaup media response missing encrypted result');
  }

  const decodedText = decodeMediaResultNative(payload.result, { cookie });
  const decodedPayload = JSON.parse(decodedText) as Record<string, unknown>;

  return {
    embedId,
    cookie: cookieHeader,
    mediaUrl: mediaUrl.toString(),
    encryptedResult: payload.result,
    decodedText,
    decodedPayload
  };
}

export async function resolveMegaupEmbedDownload(embedUrl: string, options: MegaupFetchOptions = {}): Promise<MegaupResolvedDownload> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const { url } = parseEmbedId(embedUrl);
  const cookie = typeof options.cookie === 'string'
    ? parseCookieHeader(options.cookie)
    : options.cookie ?? createMegaupCookie(options.cookieValue ?? undefined);
  const cookieHeader = `${cookie.name}=${cookie.value}`;

  await requestText(url, { ...PAGE_HEADERS, cookie: cookieHeader }, fetchImpl, options.signal);

  const mediaPayload = await resolveMegaupMediaPayload(embedUrl, {
    ...options,
    fetchImpl,
    cookie
  });

  return {
    ...mediaPayload,
    downloadUrl: typeof mediaPayload.decodedPayload.download === 'string' ? mediaPayload.decodedPayload.download : null
  };
}

const DOWNLOAD_KEY = 'eb9HtHBFBTz3mwm4';
const DATA_URL_PATTERN = /<div[^>]*class="item"[^>]*data-url="([^"]+)"[^>]*data-res="([^"]+)"[^>]*>/g;
const DATA_URL_ONLY_PATTERN = /data-url="([^"]+)"/g;

export interface MegaupFinalDownloadEntry {
  resolution: string | null;
  encoded: string;
  checkUrl: string;
  downloadUrl: string;
}

export interface MegaupResolvedFinalDownloads extends MegaupResolvedDownload {
  entries: MegaupFinalDownloadEntry[];
}

function decodeMegaupDataUrl(encoded: string): string {
  const binary = decodeBase64Url(encoded);
  const decrypted = rc4Crypt(DOWNLOAD_KEY, binary);
  return decodeURIComponent(decrypted);
}

function convertCheckToDownload(checkUrl: string): string {
  return checkUrl.replace('/check', '/download');
}

function extractMegaupDownloadEntries(source: string): MegaupFinalDownloadEntry[] {
  const entries: MegaupFinalDownloadEntry[] = [];
  const itemMatches = [...source.matchAll(DATA_URL_PATTERN)];

  if (itemMatches.length > 0) {
    for (const match of itemMatches) {
      const encoded = match[1];
      const resolution = match[2] || null;
      const checkUrl = decodeMegaupDataUrl(encoded);
      entries.push({
        resolution,
        encoded,
        checkUrl,
        downloadUrl: convertCheckToDownload(checkUrl)
      });
    }
    return entries;
  }

  const encodedMatches = [...source.matchAll(DATA_URL_ONLY_PATTERN)];
  if (encodedMatches.length > 0) {
    for (const match of encodedMatches) {
      const encoded = match[1];
      const checkUrl = decodeMegaupDataUrl(encoded);
      entries.push({
        resolution: null,
        encoded,
        checkUrl,
        downloadUrl: convertCheckToDownload(checkUrl)
      });
    }
  }

  return entries;
}

export async function resolveMegaupFinalDownloads(embedUrl: string, options: MegaupFetchOptions = {}): Promise<MegaupResolvedFinalDownloads> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const resolved = await resolveMegaupEmbedDownload(embedUrl, options);
  if (!resolved.downloadUrl) {
    return {
      ...resolved,
      entries: []
    };
  }

  const downloadPageUrl = new URL(resolved.downloadUrl);
  const pageHtml = await requestText(
    downloadPageUrl,
    {
      ...PAGE_HEADERS,
      cookie: resolved.cookie,
      referer: embedUrl
    },
    fetchImpl,
    options.signal
  );

  return {
    ...resolved,
    entries: extractMegaupDownloadEntries(pageHtml)
  };
}

export {
  USER_AGENT_CHROME,
  computeMegaupCookieName,
  createMegaupCookie,
  decodeMediaResultNative,
  decodeMediaStagesNative,
  parseCookieHeader,
  convertCheckToDownload,
  decodeMegaupDataUrl,
  extractMegaupDownloadEntries
};
