export const pct = (fraction: number, digits = 0) => `${(fraction * 100).toFixed(digits)}%`;
export const pct100 = (value: number, digits = 0) => `${value.toFixed(digits)}%`;
export const dec = (value: number, digits = 2) => value.toFixed(digits);
export const round = (value: number) => Math.round(value).toString();

/** "a" or "an" for the following word. */
export const article = (word: string) => (/^[aeiou]/i.test(word) ? "an" : "a");

/** Lower-case only the first letter: "Fix your Anubis" → "fix your Anubis". */
export const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
