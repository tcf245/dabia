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
      { text: 'これは' },
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

  // Real card data is Anki style: a space marks where a furigana base starts, and <b> marks the target word.
  it('drops Anki separator spaces and never shows them', () => {
    const plain = (input: string) => parseFurigana(input).map((seg) => seg.text).join('');
    expect(plain('建設現場[けんせつげんば]の 荒[あら]い 力仕事[ちからしごと]は 体[からだ]にこたえる'))
      .toBe('建設現場の荒い力仕事は体にこたえる');
    expect(parseFurigana('の 荒[あら]い')).toEqual([{ text: 'の' }, { text: '荒', reading: 'あら' }, { text: 'い' }]);
  });

  it('turns <b> tags into highlighted segments instead of showing them', () => {
    const segments = parseFurigana('石[いし]の<b> 段[だん]</b>');
    expect(segments.map((seg) => seg.text).join('')).toBe('石の段');
    expect(segments).toContainEqual({ text: '段', reading: 'だん', highlighted: true });
    expect(segments.filter((seg) => seg.highlighted)).toHaveLength(1);
  });

  it('keeps plain words inside <b> highlighted', () => {
    const segments = parseFurigana('<b>ただ 今[いま]</b> 家[いえ]に 着[つ]いた');
    expect(segments.map((seg) => seg.text).join('')).toBe('ただ今家に着いた');
    expect(segments.filter((seg) => seg.highlighted).map((seg) => seg.text).join('')).toBe('ただ今');
  });

  it('prefers the <b> marker over searching for the target word', () => {
    const segments = buildSentenceSegments('みっともない格好', '<b>みっともない</b> 格好[かっこう]', '格好');
    expect(segments.filter((seg) => seg.highlighted).map((seg) => seg.text)).toEqual(['みっともない']);
  });

  it('strips other markup such as <br>', () => {
    expect(parseFurigana('猫[ねこ]<br>だ').map((seg) => seg.text).join('')).toBe('猫だ');
  });
});
