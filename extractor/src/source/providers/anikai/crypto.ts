import {
  DECODE_CHAIN,
  RC4_KEY_SOURCES,
  STAGE_SPECS,
  XOR_KEYS
} from './crypto-data.js';

type Bytes = number[];
type StageName = keyof typeof STAGE_SPECS;
type Rc4KeyName = keyof typeof RC4_KEY_SOURCES;

type CompiledStage = {
  prefix: number;
  key: readonly number[];
  tables: readonly Uint8Array[];
  inverseTables: readonly Uint8Array[];
  prefixBytes: readonly number[];
};

const compiledStages = new Map<StageName, CompiledStage>();
const compiledRc4Keys = new Map<Rc4KeyName, Uint8Array>();

const STAGE_PREFIXES: Record<StageName, number[]> = {
  V: Array.from(Buffer.from('xb2XwHNB', 'base64')),
  l: Array.from(Buffer.from('52iDqjzlqe8=', 'base64')),
  t: Array.from(Buffer.from('1SUReYlCRA==', 'base64')),
  ea: Array.from(Buffer.from('WJwgqCmf', 'base64')),
  Y: Array.from(Buffer.from('yrP+EVA1Dw==', 'base64'))
};

function normalizeBase64Url(input: string): string {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  const padding = normalized.length % 4;
  if (padding === 0) return normalized;
  return normalized + '='.repeat(4 - padding);
}

function base64UrlDecodeBytes(input: string): Bytes {
  return Array.from(Buffer.from(normalizeBase64Url(input), 'base64'));
}

function base64UrlEncodeBytes(bytes: readonly number[]): string {
  return Buffer.from(bytes)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function base64DecodeBytes(input: string): Uint8Array {
  return Uint8Array.from(Buffer.from(input, 'base64'));
}

function latin1BytesToString(bytes: readonly number[]): string {
  return String.fromCharCode(...bytes);
}

function stringToLatin1Bytes(input: string): Bytes {
  return Array.from(Buffer.from(input, 'latin1'));
}

function rc4(keyBytes: ArrayLike<number>, dataBytes: ArrayLike<number>): Bytes {
  const state = new Uint8Array(256);
  for (let index = 0; index < 256; index += 1) {
    state[index] = index;
  }

  let j = 0;
  for (let index = 0; index < 256; index += 1) {
    j = (j + state[index] + keyBytes[index % keyBytes.length]) % 256;
    const temp = state[index];
    state[index] = state[j];
    state[j] = temp;
  }

  let i = 0;
  j = 0;
  const output: number[] = [];
  for (let index = 0; index < dataBytes.length; index += 1) {
    i = (i + 1) % 256;
    j = (j + state[i]) % 256;
    const temp = state[i];
    state[i] = state[j];
    state[j] = temp;
    const streamByte = state[(state[i] + state[j]) % 256];
    output.push(dataBytes[index] ^ streamByte);
  }

  return output;
}

function getCompiledStage(stageName: StageName): CompiledStage {
  const cached = compiledStages.get(stageName);
  if (cached) return cached;

  const stage = STAGE_SPECS[stageName];
  const key = XOR_KEYS[stage.key];
  const tables = stage.tables.map((tableBase64: string, bucket: number) => {
    const table = base64DecodeBytes(tableBase64);
    const normalized = new Uint8Array(256);
    const firstCycleKey = key[bucket];

    for (let index = 0; index < 256; index += 1) {
      normalized[index] = table[index] ^ firstCycleKey;
    }

    return normalized;
  });

  const inverseTables = tables.map((table: Uint8Array) => {
    const inverse = new Uint8Array(256);
    for (let index = 0; index < 256; index += 1) {
      inverse[table[index]] = index;
    }
    return inverse;
  });

  const compiled = {
    prefix: stage.prefix,
    key,
    tables,
    inverseTables,
    prefixBytes: STAGE_PREFIXES[stageName]
  };

  compiledStages.set(stageName, compiled);
  return compiled;
}

function getRc4Key(name: Rc4KeyName): Uint8Array {
  const cached = compiledRc4Keys.get(name);
  if (cached) return cached;

  const keyBytes = base64DecodeBytes(RC4_KEY_SOURCES[name]);
  compiledRc4Keys.set(name, keyBytes);
  return keyBytes;
}

function applyDecodeStage(input: readonly number[], stageName: StageName): Bytes {
  const stage = getCompiledStage(stageName);
  const output: number[] = [];

  for (let inputIndex = 0; inputIndex < input.length; inputIndex += 1) {
    if (inputIndex < stage.prefix && inputIndex % 2 === 0) {
      continue;
    }

    const outputIndex = output.length;
    const table = stage.tables[outputIndex % 10];
    const keyByte = stage.key[outputIndex % stage.key.length];
    output.push(table[input[inputIndex]] ^ keyByte);
  }

  return output;
}

function applyEncodeStage(output: readonly number[], stageName: StageName): Bytes {
  const stage = getCompiledStage(stageName);
  const skipCount = stage.prefix / 2;
  const inputLength =
    output.length < skipCount ? output.length * 2 : output.length + skipCount;
  const input = new Array(inputLength);
  const prefixFill = Math.min(skipCount, output.length);

  for (let prefixIndex = 0; prefixIndex < prefixFill; prefixIndex += 1) {
    input[prefixIndex * 2] = stage.prefixBytes[prefixIndex];
  }

  for (let outputIndex = 0; outputIndex < output.length; outputIndex += 1) {
    const inputIndex =
      outputIndex < skipCount
        ? outputIndex * 2 + 1
        : outputIndex + skipCount;
    const inverseTable = stage.inverseTables[outputIndex % 10];
    const keyByte = stage.key[outputIndex % stage.key.length];
    input[inputIndex] = inverseTable[output[outputIndex] ^ keyByte];
  }

  return input;
}

export function decodeDynamicValue(token: string): string {
  let bytes = base64UrlDecodeBytes(token);

  for (const step of DECODE_CHAIN) {
    bytes = applyDecodeStage(bytes, step.stage as StageName);
    bytes = rc4(getRc4Key(step.rc4Key as Rc4KeyName), bytes);
  }

  return decodeURIComponent(latin1BytesToString(bytes));
}

export function encodeDynamicValue(input: string): string {
  let bytes = stringToLatin1Bytes(encodeURIComponent(input));

  for (const step of [...DECODE_CHAIN].reverse()) {
    bytes = rc4(getRc4Key(step.rc4Key as Rc4KeyName), bytes);
    bytes = applyEncodeStage(bytes, step.stage as StageName);
  }

  return base64UrlEncodeBytes(bytes);
}
