const RELATIVE_UNITS: Array<{ unit: Intl.RelativeTimeFormatUnit; seconds: number }> = [
  { unit: 'year', seconds: 31_536_000 },
  { unit: 'month', seconds: 2_592_000 },
  { unit: 'day', seconds: 86_400 },
  { unit: 'hour', seconds: 3_600 },
  { unit: 'minute', seconds: 60 },
  { unit: 'second', seconds: 1 },
];

/** Formats an ISO timestamp relative to `now` using `Intl.RelativeTimeFormat`. */
export const formatRelativeTime = (
  iso: string,
  locale: string,
  now: number,
): string => {
  const timestamp = Date.parse(iso);
  if (Number.isNaN(timestamp)) return '';

  const diffMs = timestamp - now;
  const diffSeconds = Math.round(diffMs / 1000);
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'always' });

  for (const { unit, seconds } of RELATIVE_UNITS) {
    if (Math.abs(diffSeconds) >= seconds || unit === 'second') {
      let amount = Math.round(diffSeconds / seconds);
      if (amount === 0) {
        amount = diffMs >= 0 ? 1 : -1; // the rounded value can be -0, so use the raw sign
      }
      return rtf.format(amount, unit);
    }
  }
  return '';
};

/** Formats an ISO timestamp as a short localized month + day string (e.g. "Oct 2" / "10月2日"). */
export const formatShortDate = (iso: string, locale: string): string => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' }).format(date);
};
