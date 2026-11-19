import { describe, it, expect } from 'vitest';
import {
  buildSentenceSegments,
  highlightSegments,
  parseFurigana,
} from './furigana';

describe('furigana utils', () => {
  it('parses bracketed tokens and omits reading when identical to token', () => {
    expect(parseFurigana('これ[これ]は[は]何[なに]ですか[ですか]？')).toEqual([
      { text: 'これ' },
      { text: 'は' },
      { text: '何', reading: 'なに' },
      { text: 'ですか' },
      { text: '？' },
    ]);
  });

  it('splits unbracketed kana prefix before kanji when reading does not include the prefix', () => {
    expect(parseFurigana('これは何[なに]ですか？')).toEqual([
      { text: 'これは' },
      { text: '何', reading: 'なに' },
      { text: 'ですか？' },
    ]);

    expect(parseFurigana('お茶[おちゃ]を飲[の]む')).toEqual([
      { text: 'お茶', reading: 'おちゃ' },
      { text: 'を' },
      { text: '飲', reading: 'の' },
      { text: 'む' },
    ]);
  });

  it('handles space-delimited tokens and empty input', () => {
    expect(parseFurigana('')).toEqual([]);
    expect(parseFurigana('これは 何[なに]')).toEqual([
      { text: 'これは ' },
      { text: '何', reading: 'なに' },
    ]);
  });

  it('falls back to plain sentence when sentence_furigana is null', () => {
    expect(buildSentenceSegments('これは何ですか？', null, '何')).toEqual([
      { text: 'これは' },
      { text: '何', highlighted: true },
      { text: 'ですか？' },
    ]);
    expect(buildSentenceSegments(null, null, '何')).toEqual([]);
  });

  it('highlights single-segment and multi-segment target words', () => {
    const single = buildSentenceSegments(
      'これは何ですか？',
      'これ[これ]は[は]何[なに]ですか[ですか]？',
      '何',
    );
    expect(single).toEqual([
      { text: 'これ' },
      { text: 'は' },
      { text: '何', reading: 'なに', highlighted: true },
      { text: 'ですか' },
      { text: '？' },
    ]);

    const multi = buildSentenceSegments('パンを食べる。', 'パンを食[た]べる。', '食べる');
    expect(multi).toEqual([
      { text: 'パンを' },
      { text: '食', reading: 'た', highlighted: true },
      { text: 'べる', highlighted: true },
      { text: '。' },
    ]);
  });

  it('leaves segments unchanged when target word is missing or empty', () => {
    const parsed = parseFurigana('これ[これ]は[は]何[なに]ですか[ですか]？');
    expect(highlightSegments(parsed, '猫')).toEqual(parsed);
    expect(highlightSegments(parsed, '')).toEqual(parsed);
  });
});
