// Element icon mapping - using category-based colored icons
export interface ElementDef {
  name: string
  icon: string
  color: string
  category: string
}

export interface Recipe {
  ingredient1: string
  ingredient2: string
  result: string
}

const CATEGORY_COLORS: Record<string, string> = {
  base: '#4A90D9',
  nature: '#27AE60',
  animal: '#E67E22',
  food: '#E74C3C',
  tech: '#8E44AD',
  building: '#95A5A6',
  person: '#F39C12',
  mythical: '#9B59B6',
  space: '#2C3E50',
  weather: '#3498DB',
  material: '#7F8C8D',
  tool: '#D35400',
  vehicle: '#1ABC9C',
  concept: '#E91E63',
  candy: '#FF6B9D',
}

function categorize(name: string): string {
  const lower = name.toLowerCase()

  // Candy/sweets
  if (['cadbury eggs', 'astronaut ice cream', 'caramel apple', 'caramelo', 'fun dip', 'guinness float',
    'juicy fruit', 'mounds', 'nerds', 'peeps', 'pop rocks', 'red vines', 'ring pop', 'skittles',
    'starburst', 'sweethearts', 'swedish fish', 'twix', 'vermicelles', 'milk-shake', 'milky way',
    'pokki'].includes(lower)) return 'candy'

  // Space
  if (['espace', 'planète', 'étoile', 'galaxie', 'lune', 'soleil', 'constellation', 'système solaire',
    'mars', 'saturne', 'météore', 'météorite', 'trou noir', 'super nova', 'ovni', 'tardis',
    'station spatiale', 'astronaute', 'vaisseau spatial', 'éclipse', 'aurore'].includes(lower)) return 'space'

  // Weather
  if (['pluie', 'neige', 'vent', 'tempête', 'nuage', 'brouillard', 'arc en ciel', 'double arc en ciel!',
    'ouragan', 'blizzard', 'grêle', 'avalanche', 'tsunami', 'inondation', 'ozone', 'atmosphère',
    'foudre', 'rosée', 'tempête de sable', 'smog', 'pluie acide', 'tremblement de terre'].includes(lower)) return 'weather'

  // Vehicles
  if (['voiture', 'avion', 'bateau', 'bus', 'train', 'vélo', 'moto', 'hélicoptère', 'fusée',
    'navire à vapeur', 'hydravion', 'drone', 'tank', 'tracteur', 'caravane', 'ambulance',
    'camion de pompier', 'camion de crème glacée', 'bateau à voile', 'bateau pirate',
    'avion en papier', 'skateboard', 'snowboard', 'motoneige', 'traîneau',
    'montagnes russes', 'voiture électrique', 'chariot', 'wagon'].includes(lower)) return 'vehicle'

  // Tech
  if (['ordinateur', 'internet', 'robot', 'électricité', 'email', 'imprimante', 'télescope',
    'microscope', 'cellule solaire', 'éolienne', 'machine à coudre', 'moteur à vapeur',
    'tronçonneuse', 'mixeur', 'aspirateur', 'roomba', 'souris d\'ordinateur', 'fibre optique',
    'fil électrique', 'sabre laser', 'taser', 'doge', 'cyborg'].includes(lower)) return 'tech'

  // Buildings
  if (['maison', 'château', 'pyramide', 'gratte-ciel', 'phare', 'bibliothèque', 'hôpital',
    'banque', 'ferme', 'grange', 'boulangerie', 'village', 'ville', 'iglou', 'tente',
    'cabane', 'cabane dans les arbres', 'serre', 'tunnel', 'pont', 'barrage',
    'station spatiale', 'niche', 'nichoir', 'ruines', 'maison en pain d\'épice',
    'cimetière'].includes(lower)) return 'building'

  // Persons
  if (['humain', 'fermier', 'docteur', 'ingénieur', 'chevalier', 'pirate', 'ninja',
    'astronaute', 'magicien', 'sorcière', 'pompier', 'boucher', 'boulanger', 'pilote',
    'marin', 'surfeur', 'pêcheur', 'cycliste', 'nageur', 'guerrier', 'nerd',
    'bûcheron', 'électricien', 'facteur', 'jardinier', 'famille', 'père noël',
    'batman', 'don quichotte', 'willy wonka', 'héros', 'faune', 'centaure',
    'darth vader', 'jedi', 'yoda', 'ivre'].includes(lower)) return 'person'

  // Mythical
  if (['dragon', 'licorne', 'phénix', 'pégase', 'vampire', 'zombie', 'loup-garou',
    'fantôme', 'momie', 'ange', 'faucheuse', 'sirène', 'minotaure', 'golem',
    'extraterrestre', 'sphinx', 'yéti', 'nessie', 'pinocchio', 'frankenstein',
    'godzilla', 'excalibur', 'bonhomme de pain d\'épices', 'tortue ninja',
    'cheval de troie', 'ptérodactyle', 'le docteur'].includes(lower)) return 'mythical'

  // Animals
  if (['chat', 'chien', 'cheval', 'vache', 'cochon', 'mouton', 'chèvre', 'poisson',
    'oiseau', 'aigle', 'canard', 'pingouin', 'requin', 'baleine', 'serpent', 'lézard',
    'dinosaure', 'araignée', 'abeille', 'fourmi', 'papillon', 'grenouille', 'tortue',
    'singe', 'lion', 'loup', 'renard', 'ours', 'lapin', 'souris', 'rat', 'écureuil',
    'chauve-souris', 'corbeau', 'perroquet', 'mouette', 'colibri', 'pivert', 'hibou',
    'toucan', 'paon', 'autruche', 'méduse', 'hippocampe', 'étoile de mer', 'piranha',
    'espadon', 'poisson volant', 'anguille électrique', 'alligator', 'caméléon',
    'scorpion', 'castor', 'chameau', 'alpaga', 'renne', 'tatou', 'ornithorynque',
    'sanglier', 'bétail', 'animal sauvage', 'caneton', 'vautour', 'phoque',
    'lamantin', 'narval', 'rauque', 'hippopotame', 'écureuil volant', 'yack',
    'chèvre de montagne', 'tyrannosaurus rex', 'papillon de nuit', 'goldfish',
    'doge', 'chat de clavier', 'plancton', 'bactéries', 'algue', 'algues'].includes(lower)) return 'animal'

  // Food
  if (['pain', 'fromage', 'beurre', 'lait', 'œuf', 'viande', 'fruit', 'légume',
    'gâteau', 'pizza', 'hamburger', 'sandwich', 'sushi', 'bière', 'vin', 'alcool',
    'thé', 'café', 'jus', 'soda', 'confiture', 'miel', 'sucre', 'farine', 'pâte',
    'biscuit chinois', 'crème glacée', 'yaourt', 'yogourt glacé', 'omelette',
    'toast', 'beignet', 'frites', 'pâtes', 'spaghetti', 'caramel', 'chocolat',
    'céréales', 'soupe de poulet', 'cheeseburger', 'fromage grillé', 'pâtes au fromage',
    'barbe à papa', 'guimauves', 'steak', 'lard', 'jambon', 'blé', 'banane',
    'carotte', 'citrouille', 'tarte', 'gâteau (tarte)', 'pâte à biscuits',
    'pâte à gâteau', 'mayonnaise', 'viande séchée', 'pain à la banane',
    'recette', 'livre de recettes', 'poisson-frites', 'caviar', 'thé glacé',
    'limonade', 'smoothie', 'lait au chocolat', 'lait de coco', 'sucette glacée',
    'aile de poulet', 'poulet', 'noix de coco', 'noix', 'vinaigre', 'sel',
    'huile', 'canne à sucre', 'parfum', 'tabac', 'herbe', 'herbe à chat',
    'pénicilline'].includes(lower)) return 'food'

  // Nature
  if (['arbre', 'fleur', 'plante', 'herbe-grass', 'forêt', 'montagne', 'rivière',
    'lac', 'mer', 'océan', 'île', 'volcan', 'désert', 'plage', 'glacier',
    'cascade', 'marais', 'étang', 'oasis', 'cactus', 'feuille', 'mousse',
    'nénuphar', 'bonsaï', 'arbre fruitier', 'palmier', 'tournesol', 'rose',
    'lierre', 'haie', 'verger', 'jardin', 'champ', 'dune', 'geyser',
    'chaîne de montagnes', 'antarctique', 'archipel', 'horizon', 'terre',
    'eau', 'feu', 'air', 'coton', 'foin', 'botte de foin'].includes(lower)) return 'nature'

  // Material
  if (['pierre', 'sable', 'argile', 'bois', 'métal', 'acier', 'verre', 'brique',
    'charbon', 'diamant', 'or', 'obsidienne', 'granit', 'grès', 'lave',
    'cendre', 'boue', 'poussière', 'vapeur', 'fumée', 'glace', 'neige',
    'pétrole', 'rouille', 'fossile', 'poudre à canon', 'dynamite',
    'cire', 'cuir', 'laine', 'fil', 'tissu', 'corde', 'papier',
    'charbon de bois', 'sel', 'argent', 'dioxyde de carbone', 'oxygène',
    'neige carbonique', 'sables mouvants'].includes(lower)) return 'material'

  // Tools
  if (['outil', 'marteau', 'hache', 'ciseaux', 'aiguille', 'lame', 'épée',
    'armure', 'bouclier', 'pistolet', 'canon', 'bombe atomique', 'grenade',
    'lance-flammes', 'extincteur', 'balai', 'canne à pêche', 'fourche',
    'faux', 'lasso', 'shuriken', 'baguette magique', 'règle',
    'crayon', 'crayon (mine de plomb)', 'taille-crayon', 'lampe',
    'lampe de poche', 'lampe à huile', 'bougie', 'miroir', 'lunettes',
    'lunettes de soleil', 'lunettes de natation', 'lunettes de protection',
    'lunettes de ski', 'parapluie', 'parachute', 'stéthoscope', 'scalpel',
    'horloge', 'montre', 'réveil', 'minuteur', 'cadran solaire', 'sablier',
    'baïonnette', 'balle', 'gilet pare-balles', 'cape', 'paille de fer',
    'frigo', 'chaudière', 'chaudron', 'tondeuse à gazon'].includes(lower)) return 'tool'

  // Concept
  if (['amour', 'temps', 'énergie', 'vie', 'pression', 'froid', 'son',
    'lumière', 'jour', 'nuit', 'crépuscule', 'idée', 'histoire', 'musique',
    'conte de fées', 'maladie', 'mal de ser', 'allergie', 'sang',
    'cadavre', 'squelette', 'os', 'vague', 'marée', 'éruption',
    'explosion', 'rayon x', 'prisme'].includes(lower)) return 'concept'

  return 'material'
}

function getIconLetter(name: string): string {
  // Get first meaningful letter(s)
  const clean = name.replace(/[^a-zA-ZàâäéèêëïîôùûüÿçœæÀÂÄÉÈÊËÏÎÔÙÛÜŸÇŒÆ]/g, '')
  return clean.substring(0, 2).toUpperCase()
}

// Parse all recipes from the text data
export function parseRecipes(rawText: string): { elements: Map<string, ElementDef>, recipes: Recipe[] } {
  const elements = new Map<string, ElementDef>()
  const recipes: Recipe[] = []

  const lines = rawText.split('\n').filter(l => l.trim())

  for (const line of lines) {
    // Match: name = recipe(s)
    const match = line.match(/^(.+?)\s*=\s*(.+)$/)
    if (!match) continue

    const elementName = match[1].trim()
    const recipePart = match[2].trim()

    // Register element
    if (!elements.has(elementName)) {
      const cat = categorize(elementName)
      elements.set(elementName, {
        name: elementName,
        icon: getIconLetter(elementName),
        color: CATEGORY_COLORS[cat] || '#7F8C8D',
        category: cat,
      })
    }

    // Check if it's a fundamental element
    if (recipePart.includes('fondamentale')) continue

    // Parse recipes - split by " ou "
    const recipeParts = recipePart.split(' ou ')

    for (const r of recipeParts) {
      const trimmed = r.trim()
      // Match "2 ×element" pattern
      const doubleMatch = trimmed.match(/^2\s*×(.+)$/)
      if (doubleMatch) {
        const ingredient = doubleMatch[1].trim()
        recipes.push({ ingredient1: ingredient, ingredient2: ingredient, result: elementName })
        // Register ingredient
        if (!elements.has(ingredient)) {
          const cat = categorize(ingredient)
          elements.set(ingredient, {
            name: ingredient,
            icon: getIconLetter(ingredient),
            color: CATEGORY_COLORS[cat] || '#7F8C8D',
            category: cat,
          })
        }
      } else {
        // Match "ingredient1+ingredient2" pattern
        const parts = trimmed.split('+').map(p => p.trim())
        if (parts.length === 2) {
          recipes.push({ ingredient1: parts[0], ingredient2: parts[1], result: elementName })
          // Register ingredients
          for (const p of parts) {
            if (!elements.has(p)) {
              const cat = categorize(p)
              elements.set(p, {
                name: p,
                icon: getIconLetter(p),
                color: CATEGORY_COLORS[cat] || '#7F8C8D',
                category: cat,
              })
            }
          }
        }
      }
    }
  }

  return { elements, recipes }
}

// Build a fast lookup map for recipes
export function buildRecipeMap(recipes: Recipe[]): Map<string, string> {
  const map = new Map<string, string>()
  for (const r of recipes) {
    const key1 = `${r.ingredient1}|${r.ingredient2}`
    const key2 = `${r.ingredient2}|${r.ingredient1}`
    if (!map.has(key1)) map.set(key1, r.result)
    if (!map.has(key2)) map.set(key2, r.result)
  }
  return map
}

// Find recipe result for two ingredients (O(1) with map)
export function findRecipe(recipeMap: Map<string, string>, a: string, b: string): string | null {
  return recipeMap.get(`${a}|${b}`) || null
}
