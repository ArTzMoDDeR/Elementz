export interface ElementDef {
  name: string
  icon: string
  color: string
  category: string
  imageUrl?: string | null
}

export interface Recipe {
  ingredient1: string
  ingredient2: string
  result: string
}

const CATEGORY_COLORS: Record<string, string> = {
  base: '#3B82F6',
  nature: '#22C55E',
  animal: '#F97316',
  food: '#EF4444',
  tech: '#8B5CF6',
  building: '#6B7280',
  person: '#EAB308',
  mythical: '#A855F7',
  space: '#1E3A5F',
  weather: '#06B6D4',
  material: '#78716C',
  tool: '#EA580C',
  vehicle: '#14B8A6',
  concept: '#EC4899',
}

function categorize(name: string): string {
  const n = name.toLowerCase()
  if (['eau','feu','terre','air'].includes(n)) return 'base'
  const animals = ['abeille','acier','aigle','alligator','alpaga','anguille','animal sauvage','araignée','autruche','baleine','bactéries','canard','caneton','castor','chameau','chat','chauve-souris','cheval','chèvre','chèvre de montagne','chien','cochon','colibri','corbeau','dinosaure','doge','écureuil','écureuil volant','espadon','fourmi','goldfish','grenouille','hamster','hibou','hippocampe','hippopotame','lamantin','lapin','lézard','lion','loup','méduse','mouette','mouton','narval','oiseau','ornithorynque','paon','papillon','papillon de nuit','perroquet','phoque','pigeon','pingouin','piranha','pivert','plancton','poisson','poisson volant','ptérodactyle','rat','rauque','renard','renne','requin','sanglier','scorpion','serpent','singe','souris','tatou','tortue','tortue ninja','toucan','tyrannosaurus rex','vache','vautour','ver','yack','bétail','chat de clavier','algue','algues']
  if (animals.includes(n)) return 'animal'
  const weather = ['pluie','neige','vent','tempête','nuage','brouillard','arc en ciel','double arc en ciel!','ouragan','blizzard','grêle','avalanche','tsunami','inondation','ozone','atmosphère','foudre','rosée','tempête de sable','smog','pluie acide','tremblement de terre']
  if (weather.includes(n)) return 'weather'
  const space = ['espace','planète','étoile','galaxie','lune','soleil','constellation','système solaire','mars','saturne','météore','météorite','trou noir','super nova','ovni','tardis','station spatiale','astronaute','vaisseau spatial','éclipse','aurore']
  if (space.includes(n)) return 'space'
  const vehicles = ['voiture','avion','bateau','bus','train','vélo','moto','hélicoptère','fusée','navire à vapeur','hydravion','drone','tank','tracteur','caravane','ambulance','camion de pompier','camion de crème glacée','bateau à voile','bateau pirate','avion en papier','skateboard','snowboard','motoneige','traîneau','montagnes russes','voiture électrique','chariot','wagon']
  if (vehicles.includes(n)) return 'vehicle'
  const tech = ['ordinateur','internet','robot','électricité','email','imprimante','télescope','microscope','cellule solaire','éolienne','machine à coudre','moteur à vapeur','tronçonneuse','mixeur','aspirateur','roomba','souris d\'ordinateur','fibre optique','fil électrique','sabre laser','taser','cyborg']
  if (tech.includes(n)) return 'tech'
  const buildings = ['maison','château','pyramide','gratte-ciel','phare','bibliothèque','hôpital','banque','ferme','grange','boulangerie','village','ville','iglou','tente','cabane','cabane dans les arbres','serre','tunnel','pont','barrage','niche','nichoir','ruines','maison en pain d\'épice','cimetière']
  if (buildings.includes(n)) return 'building'
  const persons = ['humain','fermier','docteur','ingénieur','chevalier','pirate','ninja','magicien','sorcière','pompier','boucher','boulanger','pilote','marin','surfeur','pêcheur','cycliste','nageur','guerrier','nerd','bûcheron','électricien','facteur','jardinier','famille','père noël','batman','don quichotte','willy wonka','héros','faune','centaure','darth vader','jedi','yoda','ivre']
  if (persons.includes(n)) return 'person'
  const mythical = ['dragon','licorne','phénix','pégase','vampire','zombie','loup-garou','fantôme','momie','ange','faucheuse','sirène','minotaure','golem','extraterrestre','sphinx','nessie','pinocchio','frankenstein','godzilla','excalibur','bonhomme de pain d\'épices','cheval de troie','le docteur']
  if (mythical.includes(n)) return 'mythical'
  const food = ['pain','fromage','beurre','lait','œuf','viande','fruit','légume','gâteau','pizza','hamburger','sandwich','sushi','bière','vin','alcool','thé','café','jus','soda','confiture','miel','sucre','farine','pâte','biscuit chinois','crème glacée','yaourt','yogourt glacé','omelette','toast','beignet','frites','pâtes','spaghetti','caramel','chocolat','céréales','soupe de poulet','cheeseburger','fromage grillé','pâtes au fromage','barbe à papa','guimauves','steak','lard','jambon','blé','banane','carotte','citrouille','tarte','gâteau (tarte)','pâte à biscuits','pâte à gâteau','mayonnaise','viande séchée','pain à la banane','recette','livre de recettes','poisson-frites','caviar','thé glacé','limonade','smoothie','lait au chocolat','lait de coco','sucette glacée','aile de poulet','poulet','noix de coco','noix','vinaigre','sel','huile','canne à sucre','tabac','herbe','herbe à chat','pénicilline','milk-shake']
  if (food.includes(n)) return 'food'
  const nature = ['arbre','fleur','plante','herbe-grass','forêt','montagne','rivière','lac','mer','océan','île','volcan','désert','plage','glacier','cascade','marais','étang','oasis','cactus','feuille','mousse','nénuphar','bonsaï','arbre fruitier','palmier','tournesol','rose','lierre','haie','verger','jardin','champ','dune','geyser','chaîne de montagnes','antarctique','archipel','horizon','coton','foin','botte de foin']
  if (nature.includes(n)) return 'nature'
  const material = ['pierre','sable','argile','bois','métal','acier','verre','brique','charbon','diamant','or','obsidienne','granit','grès','lave','cendre','boue','poussière','vapeur','fumée','glace','pétrole','rouille','fossile','poudre à canon','dynamite','cire','cuir','laine','fil','tissu','corde','papier','charbon de bois','argent','dioxyde de carbone','oxygène','neige carbonique','sables mouvants']
  if (material.includes(n)) return 'material'
  const tools = ['outil','marteau','hache','ciseaux','aiguille','lame','épée','armure','bouclier','pistolet','canon','bombe atomique','grenade','lance-flammes','extincteur','balai','canne à pêche','fourche','faux','lasso','shuriken','baguette magique','règle','crayon','crayon (mine de plomb)','taille-crayon','lampe','lampe de poche','lampe à huile','bougie','miroir','lunettes','lunettes de soleil','lunettes de natation','lunettes de protection','lunettes de ski','parapluie','parachute','stéthoscope','scalpel','horloge','montre','réveil','minuteur','cadran solaire','sablier','baïonnette','balle','gilet pare-balles','cape','paille de fer','frigo','chaudière','chaudron','tondeuse à gazon']
  if (tools.includes(n)) return 'tool'
  const concept = ['amour','temps','énergie','vie','pression','froid','son','lumière','jour','nuit','crépuscule','idée','histoire','musique','conte de fées','maladie','mal de mer','allergie','sang','cadavre','squelette','os','vague','marée','éruption','explosion','rayon x','prisme']
  if (concept.includes(n)) return 'concept'
  return 'material'
}

function getIconLetter(name: string): string {
  const clean = name.replace(/[^a-zA-ZàâäéèêëïîôùûüÿçœæÀÂÄÉÈÊËÏÎÔÙÛÜŸÇŒÆ]/g, '')
  return clean.substring(0, 2).toUpperCase()
}

function makeElement(name: string): ElementDef {
  const cat = categorize(name)
  return {
    name,
    icon: getIconLetter(name),
    color: CATEGORY_COLORS[cat] || '#78716C',
    category: cat,
  }
}

export function parseRecipes(rawText: string): { elements: Map<string, ElementDef>, recipes: Recipe[] } {
  const elements = new Map<string, ElementDef>()
  const recipes: Recipe[] = []

  const lines = rawText.split('\n').filter(l => l.trim())

  for (const line of lines) {
    const eqIdx = line.indexOf(' = ')
    if (eqIdx === -1) continue

    const elementName = line.substring(0, eqIdx).trim()
    const recipePart = line.substring(eqIdx + 3).trim()

    // Register the element
    if (!elements.has(elementName)) {
      elements.set(elementName, makeElement(elementName))
    }

    // Parse recipes - split by " ou "
    const recipeParts = recipePart.split(' ou ')

    for (const r of recipeParts) {
      const trimmed = r.trim()
      // Skip "fondamentale" parts
      if (trimmed.includes('fondamental')) continue

      // Match "2 x element" pattern
      const doubleMatch = trimmed.match(/^2\s*[×x](.+)$/i)
      if (doubleMatch) {
        const ingredient = doubleMatch[1].trim()
        recipes.push({ ingredient1: ingredient, ingredient2: ingredient, result: elementName })
        if (!elements.has(ingredient)) elements.set(ingredient, makeElement(ingredient))
        continue
      }

      // Match "ingredient1+ingredient2" pattern
      const plusIdx = trimmed.indexOf('+')
      if (plusIdx !== -1) {
        const p1 = trimmed.substring(0, plusIdx).trim()
        const p2 = trimmed.substring(plusIdx + 1).trim()
        if (p1 && p2) {
          recipes.push({ ingredient1: p1, ingredient2: p2, result: elementName })
          if (!elements.has(p1)) elements.set(p1, makeElement(p1))
          if (!elements.has(p2)) elements.set(p2, makeElement(p2))
        }
      }
    }
  }

  // Ensure base elements are always present
  for (const base of ['eau', 'feu', 'terre', 'air']) {
    if (!elements.has(base)) {
      elements.set(base, makeElement(base))
    }
  }

  return { elements, recipes }
}

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

export function findRecipe(recipeMap: Map<string, string>, a: string, b: string): string | null {
  return recipeMap.get(`${a}|${b}`) || null
}
