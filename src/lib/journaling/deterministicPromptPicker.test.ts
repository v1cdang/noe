import {
  pickDeterministicDistinctIndices
} from '@/lib/journaling/deterministicPromptPicker';

describe('deterministicPromptPicker', () => {
  it('pickDeterministicDistinctIndices is deterministic for the same seed', () => {
    const first = pickDeterministicDistinctIndices(10, 3, 'seed-1');
    const second = pickDeterministicDistinctIndices(10, 3, 'seed-1');
    expect(first).toEqual(second);
  });

  it('pickDeterministicDistinctIndices returns distinct indices', () => {
    const indices = pickDeterministicDistinctIndices(10, 5, 'seed-2');
    expect(indices).toHaveLength(5);
    expect(new Set(indices).size).toBe(5);
  });

  it('pickDeterministicDistinctIndices caps pick count to indexCount', () => {
    const indices = pickDeterministicDistinctIndices(3, 10, 'seed-3');
    expect(indices).toHaveLength(3);
    expect(new Set(indices).size).toBe(3);
  });
});

