# Minder

Une maison vendue, des objets à transmettre : Muriel photographie les objets, puis la famille invitée choisit ce qu’elle souhaite garder. Site mobile-first, utilisable sur ordinateur. Interface volontairement sobre, prête à être restylée.

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
- `EMBED_URL` : origine HTTPS Modal sans chemin ; `EMBED_API_KEY` : authentification serveur.
- `EMBED_MODEL` : facultatif, doit être exactement `google/embeddinggemma-2`.

Ne jamais exposer les clés IA au navigateur. Sur Vercel, configurer les variables publiques avant le build. Les intégrations IA absentes ou indisponibles n’empêchent pas de créer les objets : description vide modifiable, vecteur nul et recherche textuelle. Les routes IA demandent jusqu’à 180 secondes ; le plan Vercel doit autoriser cette durée.

## Base de données

Les deux fichiers dans `supabase/migrations/` sont les copies verbatim du SQL déjà appliqué au projet live. **Ne pas les réappliquer sur ce projet.** Pour un nouveau projet, les appliquer dans l’ordre ; pgvector est requis dans le schéma `extensions`. Les triggers créent profils et appartenance propriétaire. Le bucket privé `item-photos` utilise des chemins `{list_id}/{uuid}.jpg`, lecture membres et écriture propriétaire uniquement.

## Architecture

- App Router Next.js, TypeScript, Tailwind. Pages et composants fins dans `src/app` et `src/components`, logique navigateur dans `src/hooks`.
- `src/proxy.ts` : middleware Next 16, rafraîchissement des cookies et protection de `/lists/**` ; chaque API vérifie aussi authentification et appartenance/rôle.
- Clients Supabase SSR et navigateur typés dans `src/lib/supabase`, schéma manuel dans `database.types.ts`.
- Upload direct navigateur : conversion JPEG max 1600 px, puis création serveur et enrichissement facultatif. Téléchargement privé via session et URLs signées pour affichage.
- OpenAI décrit l’image en français. Modal reste **côté serveur** pour protéger sa clé ; le modèle est **texte uniquement**, il vectorise la description éditable et non la photo. Documents : `title: none | text: …`, requêtes : `task: search result | query: …`. Vecteurs 768 dimensions transmis à pgvector sous forme littérale. Délai 45 s, une nouvelle tentative.
- Recherche textuelle française via RPC, sémantique via RPC `match_items`, hybride par fusion reciprocal-rank (k=60). Pas de dépendance IA pour la recherche par mots.
- Votes upsert par objet/utilisateur, annulation du dernier vote côté interface. Récapitulatif propriétaire trié par nombre de oui.

## Vérifier

```sh
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Les tests Vitest couvrent vecteurs, RRF, requête embeddings et dégradation. `/api/health` retourne uniquement des booléens de configuration, pas un test réseau.

Test manuel avec deux comptes : connexion email, création de liste, upload multiple, édition, invitation (y compris connexion depuis le lien), vote/annulation, recherche, récapitulatif et refus d’accès depuis un non-membre. Sans variables live, les validations automatisées ne prouvent pas ce parcours intégré. Après une heure, recharger pour renouveler les URLs des photos.
