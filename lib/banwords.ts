// Banned words for usernames — English + French
// Checked case-insensitively and with common substitutions (leet speak stripped before check)

const BANWORDS = [
  // ── English ──
  'nigger', 'nigga', 'faggot', 'fag', 'cunt', 'chink', 'kike', 'spic', 'wetback',
  'tranny', 'retard', 'retarded', 'spastic', 'beaner', 'cracker', 'gook', 'towelhead',
  'sandnigger', 'dyke', 'whore', 'slut', 'bitch', 'asshole', 'bastard', 'motherfucker',
  'fucker', 'fuckface', 'cocksucker', 'dickhead', 'shithead', 'douchebag', 'prick',
  'twat', 'wanker', 'cuck', 'incel', 'pedo', 'pedophile', 'rapist', 'nazi', 'hitler',
  'kkk', 'genocide', 'isis', 'jihad',

  // ── French ──
  'salope', 'pute', 'putain', 'connard', 'connasse', 'enculé', 'encule', 'fdp',
  'fils de pute', 'pd', 'pédé', 'pede', 'tapette', 'gouine', 'nègre', 'negre',
  'négro', 'negro', 'bâtard', 'batard', 'merde', 'chier', 'niquer', 'nique',
  'niqueur', 'niqueuse', 'baise', 'baiser', 'suceur', 'suceuse', 'branleur',
  'branlette', 'couille', 'couilles', 'bite', 'queue', 'chatte', 'con', 'conne',
  'abruti', 'abrutie', 'débile', 'debile', 'idiot', 'idiote', 'imbécile', 'imbecile',
  'crétin', 'cretin', 'crétine', 'cretine', 'bouffon', 'bouffonne',
  'racaille', 'bounty', 'bougnoule', 'youpin', 'feuj', 'fritz', 'rital',
  'pédophile', 'pedophile', 'violeur', 'violeuse', 'nazi', 'hitler', 'génocide', 'genocide',
]

/** Normalize a string: lowercase + strip common leet-speak substitutions */
function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/4/g, 'a')
    .replace(/3/g, 'e')
    .replace(/@/g, 'a')
    .replace(/1/g, 'i')
    .replace(/0/g, 'o')
    .replace(/5/g, 's')
    .replace(/\$/g, 's')
    .replace(/7/g, 't')
    .replace(/\s+/g, '')
    .replace(/[_\-\.]/g, '')
    // Strip accents for normalization
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

/**
 * Returns true if the username contains a banned word.
 * Normalizes both the input and the ban list for leet-speak / accent bypass.
 */
export function containsBanword(username: string): boolean {
  const normalized = normalize(username)
  return BANWORDS.some(word => {
    const normWord = normalize(word)
    return normalized.includes(normWord)
  })
}
