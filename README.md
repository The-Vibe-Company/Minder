# Minder

Une maison vendue, des objets à transmettre : Muriel photographie les objets, puis la famille invitée choisit ce qu’elle souhaite garder. Site mobile-first (390 px d’abord), agréable aussi sur ordinateur. Direction artistique « toile » : la grande table de la cuisine sous sa toile cirée (voir `.aeom/standard.md`).

## Démarrer

Node 24 et pnpm 10 :

```sh
pnpm install
cp .env.example .env.local
pnpm dev
```

Configurer `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Aucune clé service-role : toutes les opérations utilisent la session utilisateur et les politiques RLS. Autoriser dans Supabase Auth les URL de callback du site et des previews Vercel (`/auth/callback`), avec le flux email magic link. Le callback accepte PKCE `code` et `token_hash`/`type`.

## Variables

`.env.example` contient uniquement des valeurs vides :

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` : projet Supabase.
- `NEXT_PUBLIC_SITE_URL` : origine publique facultative ; sinon origine de la requête.
- `OPENAI_API_KEY`, `OPENAI_VISION_MODEL` : description visuelle ; modèle par défaut `gpt-4.1-mini`.

Ne jamais exposer les clés IA au navigateur. Sur Vercel, configurer les variables publiques avant le build. Les intégrations IA absentes ou indisponibles n’empêchent pas de créer les objets : titre et description vides modifiables, avec `aiAvailable: false` et un message `notice` dans la réponse de création. OpenAI a un délai maximal de 45 secondes ; la route de création et Vercel sont limités à 60 secondes (région cdg1).

## Base de données

Les trois fichiers dans `supabase/migrations/` sont les copies verbatim du SQL déjà appliqué au projet live. **Ne pas les réappliquer sur ce projet.** Pour un nouveau projet, les appliquer dans l’ordre ; pgvector est requis dans le schéma `extensions`. Les triggers créent profils et appartenance propriétaire. Le bucket privé `item-photos` utilise des chemins `{list_id}/{uuid}.jpg`, lecture membres et écriture propriétaire uniquement.

## Architecture

- App Router Next.js, TypeScript, Tailwind. Pages et composants fins dans `src/app` et `src/components`, logique navigateur dans `src/hooks`.
- `src/proxy.ts` : middleware Next 16, rafraîchissement des cookies et protection de `/lists/**` ; chaque API vérifie aussi authentification et appartenance/rôle.
- Clients Supabase SSR et navigateur typés dans `src/lib/supabase`, schéma manuel dans `database.types.ts`.
- Upload direct navigateur : conversion JPEG max 1600 px, puis création serveur et enrichissement facultatif. Téléchargement privé via session et URLs signées pour affichage.
- OpenAI propose un titre français de 2 à 5 mots et une description. Un titre fourni à la création est préservé ; une édition manuelle concurrente prime sur la génération automatique. Aucun appel de vectorisation. La colonne nullable `items.embedding` reste inutilisée pour plus tard.
- Recherche uniquement textuelle via `search_items_text` : FTS française pondérée titre (A) et description (B), avec correspondance `ilike`. `GET /api/lists/[listId]/search?q=...` ignore tout paramètre `mode` historique.
- Création : `{photoPath, title?}` ; édition PATCH : `{title?, description?}` (au moins un champ). Titre limité à 120 caractères, description à 3000.
- Votes upsert par objet/utilisateur, annulation du dernier vote côté interface. Récapitulatif propriétaire trié par nombre de oui.

## Design

La direction a été choisie avec [All Eyes On Me](https://github.com/The-Vibe-Company/all-eyes-on-me) : fiche produit dans `.aeom/product.md`, standard du front (jetons, kit, règles) dans `.aeom/standard.md`, maquettes de la direction retenue dans `.aeom/direction/`. Les jetons vivent dans `src/app/globals.css` (`@theme`, classes du kit en `@utility`), les composants partagés dans `src/components/ui.tsx`.

En développement, `/dev/preview` affiche chaque écran derrière la connexion avec de fausses données (fetch simulé, envoi de photos simulé ; un nom de fichier contenant « flou » échoue exprès). La route répond 404 dans un build de production. `.aeom/runs/` reste hors de git.

## Vérifier

```sh
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Les tests Vitest couvrent la sortie structurée de vision et sa dégradation, la recherche textuelle et les helpers auth. `/api/health` est exécuté à chaque requête via `connection()` (équivalent dynamique compatible Cache Components) et retourne uniquement `{ok, supabase, openai}`, pas un test réseau.

Test manuel avec deux comptes : connexion email, création de liste, upload multiple, édition, invitation (y compris connexion depuis le lien), vote/annulation, recherche, récapitulatif et refus d’accès depuis un non-membre. Sans variables live, les validations automatisées ne prouvent pas ce parcours intégré. Après une heure, recharger pour renouveler les URLs des photos.
