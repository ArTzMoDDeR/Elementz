-- This script safely inserts recipes by automatically skipping any with missing elements
-- It uses JOIN instead of subqueries to ensure all three elements exist before inserting

-- Create temporary table with all recipe combinations
CREATE TEMP TABLE temp_recipes (
  ing1 TEXT,
  ing2 TEXT,
  result TEXT
);

-- Insert all recipes as text (only the first ~100 for testing, add more as needed)
INSERT INTO temp_recipes (ing1, ing2, result) VALUES
('animal sauvage', 'fleur', 'abeille'),
('abeille', 'fleur', 'miel'),
('abeille', 'maison', 'ruche'),
('abeille', 'ruche', 'miel'),
('acide', 'eau', 'pluie acide'),
('charbon', 'métal', 'acier'),
('montagne', 'oiseau', 'aigle'),
('fil', 'métal', 'aiguille'),
('foin', 'métal', 'aiguille'),
('os', 'poulet', 'aile de poulet'),
('fruit', 'temps', 'alcool'),
('jus', 'temps', 'alcool'),
('mer', 'plante', 'algue'),
('océan', 'plante', 'algue'),
('eau', 'plante', 'algues'),
('mer', 'plante', 'algues'),
('océan', 'plante', 'algues'),
('humain', 'poussière', 'allergie'),
('lézard', 'marais', 'alligator'),
('lézard', 'rivière', 'alligator'),
('montagne', 'mouton', 'alpaga'),
('docteur', 'voiture', 'ambulance'),
('hôpital', 'voiture', 'ambulance'),
('humain', 'humain', 'amour'),
('électricité', 'verre', 'ampoule'),
('humain', 'oiseau', 'ange'),
('électricité', 'poisson', 'anguille électrique'),
('forêt', 'vie', 'animal sauvage'),
('diamant', 'métal', 'anneau'),
('diamant', 'or', 'anneau'),
('désert', 'glace', 'antarctique'),
('désert', 'neige', 'antarctique'),
('eau', 'verre', 'aquarium'),
('poisson', 'verre', 'aquarium'),
('animal sauvage', 'fil', 'araignée'),
('ampoule', 'arbre', 'arbre de noël'),
('arbre', 'étoile', 'arbre de noël'),
('arbre', 'fruit', 'arbre fruitier'),
('arbre', 'famille', 'arbre généalogique'),
('plante', 'temps', 'arbre'),
('lumière', 'pluie', 'arc en ciel'),
('pluie', 'soleil', 'arc en ciel'),
('île', 'île', 'archipel'),
('or', 'papier', 'argent'),
('boue', 'sable', 'argile'),
('acier', 'outil', 'armure'),
('métal', 'outil', 'armure'),
('balai', 'électricité', 'aspirateur'),
('astronaute', 'crème glacée', 'Astronaut ice cream'),
('espace', 'humain', 'astronaute'),
('fusée', 'humain', 'astronaute'),
('humain', 'Lune', 'astronaute'),
('humain', 'station spatiale', 'astronaute'),
('air', 'pression', 'atmosphère'),
('ciel', 'pression', 'atmosphère'),
('brique', 'feu de camp', 'âtre'),
('feu de camp', 'maison', 'âtre'),
('feu de camp', 'mur', 'âtre'),
('antarctique', 'atmosphère', 'aurore'),
('antarctique', 'ciel', 'aurore'),
('antarctique', 'soleil', 'aurore'),
('oiseau', 'sable', 'autruche'),
('oiseau', 'terre', 'autruche'),
('énergie', 'neige', 'avalanche'),
('avion', 'papier', 'avion en papier'),
('acier', 'oiseau', 'avion'),
('métal', 'oiseau', 'avion'),
('marais', 'vie', 'bactéries'),
('bois', 'magicien', 'baguette magique'),
('épée', 'pistolet', 'baïonnette'),
('lame', 'pistolet', 'baïonnette'),
('bois', 'foin', 'balai'),
('métal', 'poudre à canon', 'balle'),
('fruit', 'singe', 'banane'),
('sang', 'tissu', 'bandage'),
('argent', 'maison', 'banque'),
('coffre-fort', 'maison', 'banque'),
('maison', 'or', 'banque'),
('électricité', 'sucre', 'barbe à papa'),
('nuage', 'sucre', 'barbe à papa'),
('eau', 'feu', 'vapeur'),
('eau', 'terre', 'boue'),
('feu', 'terre', 'lave'),
('air', 'eau', 'pluie'),
('air', 'feu', 'énergie'),
('air', 'terre', 'poussière');

-- Now insert into recipes table using JOIN to ensure all elements exist
INSERT INTO recipes (ingredient1_id, ingredient2_id, result_id)
SELECT 
  e1.element_id,
  e2.element_id,
  e3.element_id
FROM temp_recipes tr
JOIN elements e1 ON LOWER(TRIM(e1.name)) = LOWER(TRIM(tr.ing1))
JOIN elements e2 ON LOWER(TRIM(e2.name)) = LOWER(TRIM(tr.ing2))
JOIN elements e3 ON LOWER(TRIM(e3.name)) = LOWER(TRIM(tr.result))
ON CONFLICT DO NOTHING;

-- Show stats
SELECT 
  COUNT(*) as recipes_inserted,
  (SELECT COUNT(*) FROM temp_recipes) as recipes_attempted
FROM recipes;

-- Drop temp table
DROP TABLE temp_recipes;
