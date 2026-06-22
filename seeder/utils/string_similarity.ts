/**
 * String similarity utilities for detecting duplicate place names
 */

/**
 * Calculate Levenshtein distance between two strings
 * Returns the minimum number of single-character edits needed to change one string into another
 */
export function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;

  // Create a 2D array to store distances
  const dp: number[][] = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill(0));

  // Initialize first row and column
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  // Fill the rest of the table
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }

  return dp[m][n];
}

/**
 * Calculate similarity score based on Levenshtein distance (0-1, where 1 is identical)
 */
export function levenshteinSimilarity(str1: string, str2: string): number {
  const maxLen = Math.max(str1.length, str2.length);
  if (maxLen === 0) return 1;
  const distance = levenshteinDistance(str1, str2);
  return 1 - distance / maxLen;
}

/**
 * Calculate Jaro similarity between two strings
 * Better for short strings with transpositions
 */
export function jaroSimilarity(str1: string, str2: string): number {
  if (str1 === str2) return 1;

  const len1 = str1.length;
  const len2 = str2.length;

  if (len1 === 0 || len2 === 0) return 0;

  // Maximum distance for matching
  const matchDistance = Math.floor(Math.max(len1, len2) / 2) - 1;
  if (matchDistance < 0) return 0;

  const str1Matches = Array(len1).fill(false);
  const str2Matches = Array(len2).fill(false);

  let matches = 0;
  let transpositions = 0;

  // Find matches
  for (let i = 0; i < len1; i++) {
    const start = Math.max(0, i - matchDistance);
    const end = Math.min(i + matchDistance + 1, len2);

    for (let j = start; j < end; j++) {
      if (str2Matches[j] || str1[i] !== str2[j]) continue;
      str1Matches[i] = true;
      str2Matches[j] = true;
      matches++;
      break;
    }
  }

  if (matches === 0) return 0;

  // Count transpositions
  let k = 0;
  for (let i = 0; i < len1; i++) {
    if (!str1Matches[i]) continue;
    while (!str2Matches[k]) k++;
    if (str1[i] !== str2[k]) transpositions++;
    k++;
  }

  return (
    (matches / len1 + matches / len2 + (matches - transpositions / 2) / matches) / 3
  );
}

/**
 * Calculate Jaro-Winkler similarity (improved Jaro for common prefixes)
 */
export function jaroWinklerSimilarity(str1: string, str2: string): number {
  const jaroSim = jaroSimilarity(str1, str2);

  // Calculate common prefix length (max 4)
  let prefixLength = 0;
  for (let i = 0; i < Math.min(str1.length, str2.length, 4); i++) {
    if (str1[i] === str2[i]) {
      prefixLength++;
    } else {
      break;
    }
  }

  // Winkler modification: boost for common prefix
  const p = 0.1; // Constant scaling factor
  return jaroSim + prefixLength * p * (1 - jaroSim);
}

/**
 * Normalize a string for comparison
 * - Convert to lowercase
 * - Remove diacritics
 * - Remove punctuation
 * - Remove extra whitespace
 */
export function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[^\w\s]/g, '') // Remove punctuation
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}

/**
 * Calculate combined similarity score using multiple algorithms
 * Returns weighted average of different similarity metrics
 */
export function calculateSimilarity(str1: string, str2: string): number {
  const norm1 = normalizeString(str1);
  const norm2 = normalizeString(str2);

  // Exact match after normalization
  if (norm1 === norm2) return 1;

  // Calculate different similarity metrics
  const jaroWinkler = jaroWinklerSimilarity(norm1, norm2);
  const levenshtein = levenshteinSimilarity(norm1, norm2);

  // Weighted average (Jaro-Winkler is better for names, Levenshtein for typos)
  return jaroWinkler * 0.7 + levenshtein * 0.3;
}
