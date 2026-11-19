export interface FuriganaSegment {
  text: string;
  reading?: string;
  highlighted?: boolean;
}

const TOKEN_PATTERN = /([^[\]]+)\[([^[\]]+)\]/g;
const KANJI_PATTERN = /[\u4E00-\u9FFF\u3400-\u4DBF々ヶ]/;

const pushToken = (
  segments: FuriganaSegment[],
  rawBase: string,
  reading: string,
): void => {
  if (rawBase === reading) {
    segments.push({ text: rawBase });
    return;
  }

  // Handle space-delimited Anki furigana where preceding plain words share the bracket match.
  const lastSpaceIndex = rawBase.search(/\s(?=\S*$)/);
  let token = rawBase;
  if (lastSpaceIndex !== -1) {
    // The space is Anki's marker for where the furigana base starts; it is never displayed.
    const leading = rawBase.slice(0, lastSpaceIndex).replace(/\s+/g, '');
    if (leading) {
      segments.push({ text: leading });
    }
    token = rawBase.slice(lastSpaceIndex + 1);
  }

  if (token === reading) {
    if (token) segments.push({ text: token });
    return;
  }

  // Split unbracketed non-kanji prefix (e.g. "これは何[なに]") when the reading applies only to the kanji part.
  const firstKanjiIndex = token.search(KANJI_PATTERN);
  if (firstKanjiIndex > 0) {
    const prefix = token.slice(0, firstKanjiIndex);
    const rest = token.slice(firstKanjiIndex);
    if (!reading.startsWith(prefix)) {
      segments.push({ text: prefix });
      segments.push(
        reading === rest ? { text: rest } : { text: rest, reading },
      );
      return;
    }
  }

  segments.push({ text: token, reading });
};

const parsePlain = (input: string): FuriganaSegment[] => {
  const segments: FuriganaSegment[] = [];
  let cursor = 0;
  TOKEN_PATTERN.lastIndex = 0;

  let match: RegExpExecArray | null;
  while ((match = TOKEN_PATTERN.exec(input)) !== null) {
    if (match.index > cursor) {
      segments.push({ text: input.slice(cursor, match.index) });
    }
    pushToken(segments, match[1], match[2]);
    cursor = match.index + match[0].length;
  }

  if (cursor < input.length) {
    segments.push({ text: input.slice(cursor) });
  }

  // Remaining ASCII spaces are Anki separators too (e.g. before a <b> tag or at the start).
  return segments
    .map((seg) => (seg.reading ? seg : { ...seg, text: seg.text.replace(/ +/g, '') }))
    .filter((seg) => seg.text);
};

/**
 * Parses Dabia's `sentence_furigana` (Anki style, e.g. `石[いし]の<b> 段[だん]</b>`) into ruby-ready segments.
 * A space marks where a furigana base starts and is not displayed; `<b>…</b>` marks the target word and becomes
 * `highlighted`; other markup is dropped. Readings identical to the surface text are omitted.
 */
export const parseFurigana = (input: string): FuriganaSegment[] => {
  if (!input) return [];

  const segments: FuriganaSegment[] = [];
  let bold = false;
  for (const part of input.split(/(<\/?b>)/i)) {
    if (/^<b>$/i.test(part)) {
      bold = true;
    } else if (/^<\/b>$/i.test(part)) {
      bold = false;
    } else if (part) {
      for (const seg of parsePlain(part.replace(/<[^>]*>/g, ''))) {
        segments.push(bold ? { ...seg, highlighted: true } : seg);
      }
    }
  }
  return segments;
};

/** Highlights the first occurrence of `targetWord` across parsed sentence segments. */
export const highlightSegments = (
  segments: FuriganaSegment[],
  targetWord: string,
): FuriganaSegment[] => {
  if (!targetWord || segments.length === 0) return segments;

  const plain = segments.map((seg) => seg.text).join('');
  const matchStart = plain.indexOf(targetWord);
  if (matchStart === -1) return segments;
  const matchEnd = matchStart + targetWord.length;

  const result: FuriganaSegment[] = [];
  let offset = 0;

  for (const seg of segments) {
    const segStart = offset;
    const segEnd = offset + seg.text.length;
    offset = segEnd;

    if (segEnd <= matchStart || segStart >= matchEnd) {
      result.push(seg);
      continue;
    }

    if (segStart >= matchStart && segEnd <= matchEnd) {
      result.push({ ...seg, highlighted: true });
      continue;
    }

    // Never split a ruby-annotated segment; highlight the whole unit if overlapped.
    if (seg.reading) {
      result.push({ ...seg, highlighted: true });
      continue;
    }

    const relStart = Math.max(0, matchStart - segStart);
    const relEnd = Math.min(seg.text.length, matchEnd - segStart);
    if (relStart > 0) {
      result.push({ text: seg.text.slice(0, relStart) });
    }
    result.push({ text: seg.text.slice(relStart, relEnd), highlighted: true });
    if (relEnd < seg.text.length) {
      result.push({ text: seg.text.slice(relEnd) });
    }
  }

  return result;
};

/** Builds sentence segments from `sentence_furigana` (or falls back to plain `sentence`) with target highlighting. */
export const buildSentenceSegments = (
  sentence: string | null,
  sentenceFurigana: string | null,
  targetWord?: string,
): FuriganaSegment[] => {
  const base = sentenceFurigana
    ? parseFurigana(sentenceFurigana)
    : sentence
      ? [{ text: sentence }]
      : [];
  // The data's own <b> marker is more precise than searching for the dictionary form of the word.
  if (base.some((seg) => seg.highlighted)) return base;
  return targetWord ? highlightSegments(base, targetWord) : base;
};
