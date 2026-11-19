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
    const leading = rawBase.slice(0, lastSpaceIndex + 1);
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

/**
 * Parses Dabia's `sentence_furigana` format (e.g. `これ[これ]は[は]何[なに]ですか[ですか]？`)
 * into ruby-ready segments, omitting `<ruby>` readings identical to the surface text.
 */
export const parseFurigana = (input: string): FuriganaSegment[] => {
  if (!input) return [];

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
  return targetWord ? highlightSegments(base, targetWord) : base;
};
