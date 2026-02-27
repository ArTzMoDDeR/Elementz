-- Normalize all user_progress.discovered arrays to canonical French names.
-- Removes duplicates caused by storing both FR and EN versions of the same element.
UPDATE user_progress up
SET discovered = (
  SELECT array_agg(DISTINCT el.name_french ORDER BY el.name_french)
  FROM unnest(up.discovered) AS d(name)
  JOIN elements el ON el.name_french = d.name OR el.name_english = d.name
)
WHERE up.discovered IS NOT NULL;
