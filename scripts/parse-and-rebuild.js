import { readFileSync, writeFileSync } from 'fs'

const frData = JSON.parse(readFileSync('/vercel/share/v0-project/scripts/alchemy_FR.json', 'utf-8'))

// Manual translations FR -> EN for common elements
const translations = {
  'eau': 'water', 'feu': 'fire', 'terre': 'earth', 'air': 'air',
  'vie': 'life', 'temps': 'time', 'énergie': 'energy', 'amour': 'love',
  'pierre': 'stone', 'métal': 'metal', 'froid': 'cold', 'chaleur': 'heat',
  'lumière': 'light', 'obscurité': 'darkness', 'plante': 'plant', 'arbre': 'tree',
  'humain': 'human', 'animal sauvage': 'wild animal', 'oiseau': 'bird', 'poisson': 'fish',
  'mer': 'sea', 'océan': 'ocean', 'lac': 'lake', 'rivière': 'river',
  'montagne': 'mountain', 'volcan': 'volcano', 'désert': 'desert', 'forêt': 'forest',
  'pluie': 'rain', 'neige': 'snow', 'glace': 'ice', 'vapeur': 'steam',
  'nuage': 'cloud', 'ciel': 'sky', 'soleil': 'sun', 'lune': 'moon',
  'étoile': 'star', 'espace': 'space', 'planète': 'planet', 'terre': 'earth',
  'feu de camp': 'campfire', 'fumée': 'smoke', 'cendre': 'ash',
  'boue': 'mud', 'sable': 'sand', 'verre': 'glass', 'papier': 'paper',
  'bois': 'wood', 'outil': 'tool', 'roue': 'wheel', 'voiture': 'car',
  'maison': 'house', 'mur': 'wall', 'porte': 'door', 'fenêtre': 'window',
  'électricité': 'electricity', 'or': 'gold', 'argent': 'silver', 'diamant': 'diamond',
  'brique': 'brick', 'acier': 'steel', 'charbon': 'coal', 'huile': 'oil',
  'lait': 'milk', 'fromage': 'cheese', 'pain': 'bread', 'viande': 'meat',
  'fruit': 'fruit', 'légume': 'vegetable', 'fleur': 'flower', 'graine': 'seed',
  'fermier': 'farmer', 'champ': 'field', 'jardin': 'garden', 'marais': 'swamp',
  'famille': 'family', 'ville': 'city', 'village': 'village', 'château': 'castle',
  'épée': 'sword', 'bouclier': 'shield', 'armure': 'armor', 'pistolet': 'gun',
  'explosion': 'explosion', 'bombe': 'bomb', 'poudre à canon': 'gunpowder',
  'livre': 'book', 'papier': 'paper', 'encre': 'ink', 'plume': 'feather',
  'tissu': 'fabric', 'laine': 'wool', 'fil': 'thread', 'corde': 'rope',
  'bateau': 'boat', 'avion': 'plane', 'fusée': 'rocket', 'train': 'train',
  'cheval': 'horse', 'vache': 'cow', 'mouton': 'sheep', 'cochon': 'pig',
  'chien': 'dog', 'chat': 'cat', 'souris': 'mouse', 'loup': 'wolf',
  'dragon': 'dragon', 'licorne': 'unicorn', 'fée': 'fairy', 'elfe': 'elf',
  'magicien': 'wizard', 'sorcière': 'witch', 'vampire': 'vampire', 'zombie': 'zombie',
  'fantôme': 'ghost', 'squelette': 'skeleton', 'momie': 'mummy',
  'robot': 'robot', 'cyborg': 'cyborg', 'alien': 'alien', 'astronaute': 'astronaut',
  'docteur': 'doctor', 'scientifique': 'scientist', 'professeur': 'professor',
  'boulanger': 'baker', 'boucher': 'butcher', 'pompier': 'firefighter',
  'musique': 'music', 'art': 'art', 'peinture': 'painting', 'sculpture': 'sculpture',
  'gâteau': 'cake', 'biscuit': 'cookie', 'chocolat': 'chocolate', 'sucre': 'sugar',
  'café': 'coffee', 'thé': 'tea', 'jus': 'juice', 'alcool': 'alcohol',
  'vin': 'wine', 'bière': 'beer', 'sang': 'blood', 'poison': 'poison',
  'maladie': 'disease', 'médecine': 'medicine', 'hôpital': 'hospital',
  'école': 'school', 'université': 'university', 'bibliothèque': 'library',
  'tempête': 'storm', 'orage': 'thunderstorm', 'foudre': 'lightning', 'vent': 'wind',
  'arc en ciel': 'rainbow', 'aurore': 'aurora', 'éclipse': 'eclipse',
  'tsunami': 'tsunami', 'avalanche': 'avalanche', 'tremblement de terre': 'earthquake',
  'dinosaure': 'dinosaur', 'fossile': 'fossil', 'squelette': 'skeleton',
  'océan': 'ocean', 'marée': 'tide', 'vague': 'wave', 'plage': 'beach',
  'île': 'island', 'continent': 'continent', 'péninsule': 'peninsula',
  'histoire': 'story', 'légende': 'legend', 'mythe': 'myth',
  'temps': 'time', 'horloge': 'clock', 'montre': 'watch', 'calendrier': 'calendar',
  'jour': 'day', 'nuit': 'night', 'matin': 'morning', 'soir': 'evening',
  'saison': 'season', 'printemps': 'spring', 'été': 'summer', 'automne': 'autumn', 'hiver': 'winter',
  'oeuf': 'egg', 'œuf': 'egg', 'pâte': 'dough', 'farine': 'flour',
  'sel': 'salt', 'poivre': 'pepper', 'épice': 'spice',
  'or': 'gold', 'argent': 'silver', 'bronze': 'bronze', 'platine': 'platinum',
  'cuivre': 'copper', 'fer': 'iron', 'plomb': 'lead', 'étain': 'tin',
}

// Simple translation function with fallback
function translateToEnglish(frName) {
  if (translations[frName]) return translations[frName]
  
  // Try basic patterns
  if (frName.includes(' de ')) {
    const parts = frName.split(' de ')
    const translated = parts.map(p => translations[p.trim()] || p).join(' ')
    return translated
  }
  
  // Return original if no translation
  return frName
}

// Extract all unique elements
const allElements = new Set()
Object.keys(frData).forEach(element => {
  allElements.add(element)
  frData[element].forEach(recipe => {
    recipe.forEach(ingredient => allElements.add(ingredient))
  })
})

// Create numbered elements list
const elements = Array.from(allElements).sort().map((frName, index) => ({
  number: index + 1,
  name_french: frName,
  name_english: translateToEnglish(frName),
  img: null
}))

// Create element name to number map
const nameToNumber = {}
elements.forEach(el => {
  nameToNumber[el.name_french] = el.number
})

// Generate SQL
let sql = `-- Rebuild database with French elements and recipes

DROP TABLE IF EXISTS recipes CASCADE;
DROP TABLE IF EXISTS elements CASCADE;

CREATE TABLE elements (
  id SERIAL PRIMARY KEY,
  number INTEGER UNIQUE NOT NULL,
  name_english TEXT NOT NULL,
  name_french TEXT NOT NULL,
  img TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE recipes (
  id SERIAL PRIMARY KEY,
  ingredient1_number INTEGER NOT NULL,
  ingredient2_number INTEGER NOT NULL,
  result_number INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(ingredient1_number, ingredient2_number)
);

-- Insert elements
INSERT INTO elements (number, name_english, name_french, img) VALUES\n`

sql += elements.map(el => 
  `  (${el.number}, ${escape(el.name_english)}, ${escape(el.name_french)}, NULL)`
).join(',\n')

sql += ';\n\n-- Insert recipes\nINSERT INTO recipes (ingredient1_number, ingredient2_number, result_number) VALUES\n'

const recipes = []
Object.entries(frData).forEach(([resultName, recipeList]) => {
  const resultNum = nameToNumber[resultName]
  if (!resultNum) return
  
  recipeList.forEach(recipe => {
    const [ing1Name, ing2Name] = recipe
    const ing1Num = nameToNumber[ing1Name]
    const ing2Num = nameToNumber[ing2Name]
    
    if (ing1Num && ing2Num) {
      // Always store smaller number first for consistency
      const [first, second] = ing1Num < ing2Num ? [ing1Num, ing2Num] : [ing2Num, ing1Num]
      recipes.push(`  (${first}, ${second}, ${resultNum})`)
    }
  })
})

sql += recipes.join(',\n')
sql += ';\n\n'
sql += `-- Stats: ${elements.length} elements, ${recipes.length} recipes\n`

writeFileSync('/vercel/share/v0-project/scripts/006-rebuild-fr.sql', sql)

console.log(`✅ Generated SQL with ${elements.length} elements and ${recipes.length} recipes`)
console.log(`📝 Output: scripts/006-rebuild-fr.sql`)

function escape(str) {
  return "'" + str.replace(/'/g, "''") + "'"
}
