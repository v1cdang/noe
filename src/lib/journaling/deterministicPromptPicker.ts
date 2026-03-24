export function hashStringToUint32(value: string): number {
  let hash: number = 2166136261;
  for (let i: number = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function pickDeterministicIndex(indexCount: number, seed: string): number {
  if (indexCount <= 0) {
    throw new Error('indexCount must be > 0');
  }
  const hash: number = hashStringToUint32(seed);
  return hash % indexCount;
}

export function pickDeterministicDistinctIndices(
  indexCount: number,
  pickCount: number,
  seed: string,
): number[] {
  if (indexCount <= 0) {
    throw new Error('indexCount must be > 0');
  }
  const effectivePickCount: number = Math.min(Math.max(pickCount, 0), indexCount);
  const startIndex: number = pickDeterministicIndex(indexCount, seed);
  const indices: number[] = [];
  for (let i: number = 0; i < effectivePickCount; i += 1) {
    indices.push((startIndex + i) % indexCount);
  }
  return indices;
}

