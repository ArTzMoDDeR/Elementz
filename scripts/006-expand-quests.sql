-- ─── 1. Add quest type support for daily + specific_element ─────────────────

-- Add reset_hours column for daily quests (NULL = permanent)
ALTER TABLE quest_definitions ADD COLUMN IF NOT EXISTS reset_hours int DEFAULT NULL;
-- Add required_element column for specific_element quests
ALTER TABLE quest_definitions ADD COLUMN IF NOT EXISTS required_element text DEFAULT NULL;

-- Add reset tracking on user_quests
ALTER TABLE user_quests ADD COLUMN IF NOT EXISTS reset_at timestamptz DEFAULT NULL;

-- ─── 2. Remove the broken "se connecter" quest ──────────────────────────────
DELETE FROM quest_definitions WHERE type = 'login' OR title_fr ILIKE '%connecte%' OR title_en ILIKE '%login%' OR title_en ILIKE '%sign in%';

-- ─── 3. Daily quests (reset every 24h) ───────────────────────────────────────
INSERT INTO quest_definitions (type, title_fr, title_en, desc_fr, desc_en, target_value, icon, sort_order, reset_hours) VALUES
  ('discover_n_daily', 'Premier pas du jour',   'First step today',    'Découvrez 1 nouvel élément aujourd''hui',  'Discover 1 new element today',   1,  'sun',      1, 24),
  ('discover_n_daily', 'Explorateur du jour',   'Daily explorer',      'Découvrez 5 nouveaux éléments aujourd''hui', 'Discover 5 new elements today',  5,  'compass',  2, 24),
  ('discover_n_daily', 'Chasseur quotidien',    'Daily hunter',        'Découvrez 10 nouveaux éléments aujourd''hui','Discover 10 new elements today', 10, 'flame',    3, 24)
ON CONFLICT DO NOTHING;

-- ─── 4. Milestone quests (discover_n permanent) ──────────────────────────────
INSERT INTO quest_definitions (type, title_fr, title_en, desc_fr, desc_en, target_value, icon, sort_order) VALUES
  ('discover_n', 'Premiers éléments',     'First elements',      'Découvrez vos 10 premiers éléments',       'Discover your first 10 elements',      10,   'sparkles', 10),
  ('discover_n', 'Apprenti alchimiste',   'Apprentice',          'Découvrez 25 éléments',                    'Discover 25 elements',                 25,   'flask',    11),
  ('discover_n', 'Alchimiste',            'Alchemist',           'Découvrez 50 éléments',                    'Discover 50 elements',                 50,   'flask',    12),
  ('discover_n', 'Grand alchimiste',      'Grand alchemist',     'Découvrez 100 éléments',                   'Discover 100 elements',                100,  'crown',    13),
  ('discover_n', 'Maître des éléments',   'Element master',      'Découvrez 150 éléments',                   'Discover 150 elements',                150,  'crown',    14),
  ('discover_n', 'Légende vivante',       'Living legend',       'Découvrez 200 éléments',                   'Discover 200 elements',                200,  'gem',      15),
  ('discover_n', 'Demi-dieu',             'Demigod',             'Découvrez 300 éléments',                   'Discover 300 elements',                300,  'star',     16),
  ('discover_n', 'Omniscient',            'Omniscient',          'Découvrez 400 éléments',                   'Discover 400 elements',                400,  'star',     17),
  ('discover_n', 'Créateur suprême',      'Supreme creator',     'Découvrez 500 éléments',                   'Discover 500 elements',                500,  'crown',    18),
  ('discover_n', 'Tout-Puissant',         'All-Powerful',        'Découvrez les 593 éléments !',             'Discover all 593 elements!',           593,  'gem',      19)
ON CONFLICT DO NOTHING;

-- ─── 5. Specific element quests ──────────────────────────────────────────────
INSERT INTO quest_definitions (type, title_fr, title_en, desc_fr, desc_en, target_value, icon, sort_order, required_element) VALUES
  ('specific_element', 'L''étincelle de vie',   'Spark of life',       'Créez l''élément Vie',                     'Create the Life element',              1, 'droplets', 30, 'Vie'),
  ('specific_element', 'Être humain',           'Human being',         'Créez l''élément Humain',                  'Create the Human element',             1, 'sparkles', 31, 'Humain'),
  ('specific_element', 'Feu sacré',             'Sacred fire',         'Créez l''élément Feu',                     'Create the Fire element',              1, 'flame',    32, 'Feu'),
  ('specific_element', 'Tempête',               'Storm',               'Créez l''élément Tempête',                 'Create the Storm element',             1, 'wind',     33, 'Tempête'),
  ('specific_element', 'Océan primordial',      'Primordial ocean',    'Créez l''élément Océan',                   'Create the Ocean element',             1, 'droplets', 34, 'Océan'),
  ('specific_element', 'Civilisation',          'Civilization',        'Créez l''élément Civilisation',            'Create the Civilization element',      1, 'mountain', 35, 'Civilisation'),
  ('specific_element', 'Dragon légendaire',     'Legendary dragon',    'Créez l''élément Dragon',                  'Create the Dragon element',            1, 'star',     36, 'Dragon'),
  ('specific_element', 'Intelligence',          'Intelligence',        'Créez l''élément Intelligence',            'Create the Intelligence element',      1, 'microscope',37,'Intelligence')
ON CONFLICT DO NOTHING;

-- ─── 6. Secondary permanent quests ───────────────────────────────────────────
INSERT INTO quest_definitions (type, title_fr, title_en, desc_fr, desc_en, target_value, icon, sort_order) VALUES
  ('discover_n', 'Petit curieux',          'Curious mind',        'Découvrez 5 éléments',                     'Discover 5 elements',                  5,   'compass',  40),
  ('discover_n', 'Collectionneur',         'Collector',           'Découvrez 75 éléments',                    'Discover 75 elements',                 75,  'gem',      41),
  ('discover_n', 'Encyclopédiste',         'Encyclopedist',       'Découvrez 250 éléments',                   'Discover 250 elements',                250, 'microscope',42),
  ('discover_n', 'Créateur de mondes',     'World builder',       'Découvrez 350 éléments',                   'Discover 350 elements',                350, 'mountain', 43),
  ('discover_n', 'Presque tout',           'Almost everything',   'Découvrez 450 éléments',                   'Discover 450 elements',                450, 'star',     44),
  ('discover_n', 'Moitié du chemin',       'Halfway there',       'Découvrez la moitié des éléments (296)',   'Discover half of all elements (296)',  296, 'compass',  45),
  ('combinations_n', 'Premier mélange',    'First mix',           'Réalisez votre première combinaison',      'Make your first combination',          1,   'flask',    50),
  ('combinations_n', 'Chimiste débutant',  'Beginner chemist',    'Réalisez 10 combinaisons',                 'Make 10 combinations',                 10,  'flask',    51),
  ('combinations_n', 'Laboratoire actif',  'Active lab',          'Réalisez 50 combinaisons',                 'Make 50 combinations',                 50,  'flask',    52),
  ('combinations_n', 'Mille expériences',  'Thousand experiments','Réalisez 100 combinaisons',                'Make 100 combinations',                100, 'microscope',53),
  ('combinations_n', 'Chercheur fou',      'Mad scientist',       'Réalisez 500 combinaisons',                'Make 500 combinations',                500, 'microscope',54),
  ('combinations_n', 'Titan de l''alchimie','Titan of alchemy',   'Réalisez 1000 combinaisons',              'Make 1000 combinations',               1000,'crown',    55),
  ('combinations_n', 'Légende de l''atelier','Workshop legend',   'Réalisez 5000 combinaisons',              'Make 5000 combinations',               5000,'gem',      56),
  ('session_n',  'Joueur régulier',        'Regular player',      'Jouez 5 sessions différentes',             'Play 5 different sessions',            5,   'sun',      60),
  ('session_n',  'Dévoué',                 'Dedicated',           'Jouez 20 sessions différentes',            'Play 20 different sessions',           20,  'star',     61),
  ('session_n',  'Inconditional',          'Die-hard fan',        'Jouez 50 sessions différentes',            'Play 50 different sessions',           50,  'crown',    62)
ON CONFLICT DO NOTHING;
