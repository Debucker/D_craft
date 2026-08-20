/**
 * PROFANITY FILTER
 * -----------------------------------------------------------------------
 * Keeps the notes board civil. Two goals pull against each other here:
 *
 *  1. Catching evasion. "f u c k", "f.u.c.k", "fvck", "sh1t", "FUUUCK" and
 *     "a$$hole" are all the same word to a reader, so they are folded onto the
 *     same spelling before matching.
 *  2. NOT catching innocent words. The classic failure is blocking
 *     "Scunthorpe", "class analysis", "shiitake" or "document" because a rude
 *     substring hides inside one. Matching is therefore done on whole words,
 *     with substring matching reserved for a handful of terms that have no
 *     innocent host word in ordinary English.
 *
 * This is a filter, not a moderation system. It stops casual abuse; a
 * determined person will still get something through, so anything shown
 * publicly must remain deletable by the owner.
 *
 * NOTE ON ORDERING IN THIS FILE: the character maps must be declared before
 * `normalise`, and `normalise` before the derived sets that call it at module
 * load — `const` bindings are not hoisted, and reordering will throw.
 */

const LEET: Readonly<Record<string, string>> = {
  '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '8': 'b',
  '@': 'a', $: 's', '!': 'i', '+': 't', '(': 'c',
};

/** Cyrillic to Latin, so Cyrillic-script profanity folds onto the same list. */
const CYRILLIC: Readonly<Record<string, string>> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z',
  и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r',
  с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'c', ч: 'ch', ш: 'sh', щ: 'sch',
  ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
};

/**
 * Fold a string down to comparable letters. The order of these steps matters:
 *
 *  1. lowercase, strip accents
 *  2. collapse repeated characters BEFORE transliterating, so "бляять" loses
 *     its doubled я and lands on "blyat" rather than "blyayat"
 *  3. transliterate Cyrillic, then undo leetspeak
 *  4. non-alphanumerics become spaces
 *  5. collapse repeats AGAIN, because leetspeak creates them — "a$$hole"
 *     only becomes "asshole" at this point, and must end up as "ashole"
 *  6. join runs of single letters, so "f u c k" and "f.u.c.k" become "fuck"
 *  7. collapse repeats once more — joining can re-create doubles that step 5
 *     could not see across the spaces ("n i g g e r")
 *
 * The word list is folded through this same function, so both sides agree that
 * "asshole" is spelled "ashole" once collapsed.
 */
function normalise(input: string): string {
  const folded = input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/(.)\1+/g, '$1');

  let mapped = '';
  for (const char of folded) {
    if (CYRILLIC[char] !== undefined) mapped += CYRILLIC[char];
    else if (LEET[char] !== undefined) mapped += LEET[char];
    else mapped += char;
  }

  const tokens = mapped
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/([a-z])\1+/g, '$1')
    .trim()
    .split(' ')
    .filter(Boolean);

  // Join runs of single characters: ["f","u","c","k"] -> ["fuck"].
  const out: string[] = [];
  let run: string[] = [];
  const flush = () => {
    if (run.length > 0) out.push(run.join(''));
    run = [];
  };
  for (const token of tokens) {
    if (token.length === 1) {
      run.push(token);
    } else {
      flush();
      out.push(token);
    }
  }
  flush();

  // One last collapse. Joining letter runs can re-create doubles that the
  // earlier pass could not see through the spaces: "n i g g e r" becomes
  // "nigger" only here, and must end up spelled the same as plain "nigger".
  return out.join(' ').replace(/([a-z])\1+/g, '$1');
}

/** Matched as whole words, after normalisation. */
const WORDS: readonly string[] = [
  'anal', 'anus', 'arse', 'arsehole', 'ass', 'asses', 'asshole', 'assholes',
  'bastard', 'biatch', 'bitch', 'bitches', 'blowjob', 'bollocks', 'boner',
  'boob', 'boobs', 'bullshit', 'clit', 'cock', 'cocks', 'crap', 'cum', 'cunt',
  'cunts', 'dick', 'dickhead', 'dicks', 'dildo', 'douche', 'dumbass',
  'fag', 'faggot', 'fags', 'fuck', 'fucked', 'fucker', 'fuckers', 'fuckface',
  'fuckhead', 'fucking', 'fucks', 'fuk', 'fuking', 'fvck', 'fvcker', 'fvcking',
  'goddamn', 'handjob', 'hoe', 'horny', 'jackass', 'jerkoff', 'jizz', 'kunt',
  'motherfucker', 'motherfucking', 'nigga', 'niggas', 'nigger', 'niggers',
  'nutsack', 'penis', 'piss', 'pissed', 'porn', 'porno', 'prick', 'pussy',
  'retard', 'retarded', 'rimjob', 'schlong', 'scrotum', 'shit', 'shite',
  'shits', 'shitted', 'shitting', 'shitty', 'shyt', 'slut', 'sluts', 'smegma',
  'twat', 'twats', 'vagina', 'wank', 'wanker', 'whore', 'whores',
  // Russian / Cyrillic roots, spelled as they come out of the transliterator.
  'blyad', 'blyat', 'bliad', 'ebal', 'eban', 'ebat', 'gandon', 'huy', 'hui',
  'huj', 'idi nahui', 'mudak', 'mudila', 'nahui', 'nahuy', 'pidor', 'pidoras',
  'pizda', 'pizdec', 'pizdets', 'suka', 'sukin', 'zalupa',
];

/**
 * Matched as a substring, so they are caught even when buried in a longer run.
 * This list stays tiny on purpose:
 *   - "shit" is NOT here — "shiitake" normalises to "shitake"
 *   - "cunt" is NOT here — Scunthorpe
 *   - "ass" and "cum" are NOT here — "class", "document"
 * Whole-word matching above already covers those.
 */
const SEVERE: readonly string[] = [
  'fuck', 'nigger', 'nigga', 'faggot', 'motherfuck', 'pidoras', 'pizdec',
];

const WORD_SET: ReadonlySet<string> = new Set(WORDS.map((word) => normalise(word)));

/** Longest phrase in WORDS, in words — how far ahead we join tokens. */
const MAX_PHRASE = WORDS.reduce((max, word) => Math.max(max, word.split(' ').length), 1);

const SEVERE_NORMALISED: readonly string[] = SEVERE.map((term) =>
  normalise(term).replace(/ /g, ''),
);

export interface ProfanityResult {
  readonly clean: boolean;
  /** The offending term, for a message that tells the writer what to change. */
  readonly matched?: string;
}

export function checkProfanity(input: string): ProfanityResult {
  const normalised = normalise(input);
  if (!normalised) return { clean: true };

  const tokens = normalised.split(' ').filter(Boolean);

  // Whole words, and short phrases like "idi nahui".
  for (let i = 0; i < tokens.length; i++) {
    for (let span = 1; span <= MAX_PHRASE && i + span <= tokens.length; span++) {
      const phrase = tokens.slice(i, i + span).join(' ');
      if (WORD_SET.has(phrase)) return { clean: false, matched: phrase };
    }
  }

  const collapsed = tokens.join('');
  for (const term of SEVERE_NORMALISED) {
    if (collapsed.includes(term)) return { clean: false, matched: term };
  }

  return { clean: true };
}

/** Exported for the test script. */
export const __internals = { normalise };
