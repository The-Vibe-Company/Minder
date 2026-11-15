# Lot 2 API contract
Apply supabase/migrations/20261115000006_drafts_likes_profiles.sql before using.
- POST /api/lists/:id/items unchanged body {photoPath,title?}; item now has status: draft|published and published_at.
- PATCH /api/items/:id {title?,description?}: author/member or owner.
- POST /api/items/:id/publish: {item}; no unpublish endpoint.
- GET /api/lists/:id: {list,role,items,drafts}; drafts is owner-only count.
- GET /api/me: {id,email,displayName,onboarded}; PATCH {displayName} completes onboarding (trimmed 1–40 chars, no @).
- /lists* redirects to /welcome?next=<original path and query> until onboarded; callback/join runs before this redirect.
- GET /api/me/likes: {items:[{id,title,description,photoUrl,list_id,list:{id,title},voted_at}]}, newest first, published and current membership only.
- DELETE /api/items/:id/vote removes a like.
- DELETE /api/lists/:id owner-only: {ok:true,removedPhotos}; best-effort storage cleanup before cascade delete.
- GET /api/lists/:id/recap also returns list:{id,title}; published items only.
Use GET /api/me displayName for header, never email as a person's name.
