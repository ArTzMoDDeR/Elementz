# Panel d'administration - Alchemy Game

## Configuration initiale

### 1. Base de données Neon

Exécute le script SQL suivant dans l'éditeur SQL de Neon:

```sql
-- Créer la table
CREATE TABLE IF NOT EXISTS elements (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,
  image_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_elements_name ON elements(name);
```

Puis exécute le fichier `/scripts/insert-elements.sql` pour insérer les 615 éléments.

### 2. Variables d'environnement

Assure-toi que les variables suivantes sont configurées dans ton projet Vercel:

- `DATABASE_URL` - String de connexion Neon (déjà configuré via l'intégration)
- `BLOB_READ_WRITE_TOKEN` - Token Vercel Blob (déjà configuré via l'intégration)

## Panel d'administration

Accède au panel via: `/admin`

### Fonctionnalités:

- **Statistiques**: Vois le nombre total d'éléments, ceux avec/sans image
- **Recherche**: Trouve rapidement un élément par nom
- **Filtres**: Affiche tous les éléments, seulement ceux avec image, ou sans image
- **Upload rapide**: Clique sur "Upload" pour chaque élément et sélectionne un fichier JPG

### Upload d'images

Pour uploader les images rapidement:

1. Prépare tes images au format JPG nommées: `nom_element.jpg`
2. Va sur `/admin`
3. Utilise le filtre "Sans image" pour voir les éléments manquants
4. Clique sur "Upload" et sélectionne l'image correspondante
5. L'image est automatiquement uploadée sur Vercel Blob et l'URL est enregistrée dans la base de données

### Architecture

- **API Routes**:
  - `GET /api/elements` - Récupère tous les éléments
  - `POST /api/elements/[name]/image` - Upload une image pour un élément spécifique

- **Storage**:
  - Images stockées sur Vercel Blob dans le dossier `elements/`
  - URLs publiques accessibles instantanément
  - CDN global pour des performances optimales

- **Base de données**:
  - PostgreSQL via Neon
  - Table `elements` avec les colonnes: id, name, category, image_url, created_at, updated_at

## Jeu principal

Le jeu charge automatiquement les images depuis la base de données au démarrage. Les éléments sans image afficheront:
- Les icônes SVG pour les 4 éléments de base (eau, feu, terre, air)
- Une pastille colorée avec la première lettre pour les autres éléments

La progression du joueur est sauvegardée dans le localStorage du navigateur.
