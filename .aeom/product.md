# Minder

## What kind of product
`tool`: a small family web app to share out the objects of a house that has been sold. (seen: README.md)

## What it is for
The family house has been sold and everything in it must find a new home. Muriel photographs every object, one after the other: the soup tureen, the oak sideboard, the lamps, the boxes of books, the frames. Each invited relative then sees the objects one by one and swipes right for « je le veux » or left for « non merci », and Muriel reads who wants what, with the objects several people want put first so the family can talk them through. (seen: README.md)

## Who uses it
Muriel, the owner of the list, who is not a techie and uploads dozens of photos in a row from her phone; and the relatives she invites by link, of every age, from teenagers to grandparents, who open it a few times on their phone in the weeks before the move. (seen: brief from Stan)

## Where it is used
`both`: mobile first, a phone at 390 px is the main target, and it must also be pleasant on a computer at 1280 px. (seen: brief from Stan)

## The main loop
Muriel adds photos of objects and fixes their descriptions; relatives open the list, swipe through every object they have not seen yet, undo a mistake, search for one they remember; Muriel reads the recap of who wants what and the conflicts. (seen: src/components/list-detail.tsx, src/components/swipe.tsx, src/components/recap.tsx)

## Key journeys

### Share out the house's objects
Why: Muriel wants her family to say which objects they want before the move. (seen: src/components/lists.tsx, src/components/list-detail.tsx)
1. Open `/login` and type her e-mail, then press « Recevoir mon lien ».
2. Read the « vérifiez votre boîte mail » state, open the link from her mail.
3. On `/lists`, type « La maison de Rennes » and press « Créer une liste ».
4. On `/lists/:id`, press « Ajouter des photos » and pick several photos at once.
5. Watch each photo's progress, then fix one title and description in the grid and press « Enregistrer ».
6. In the invite panel, press « Créer un lien à partager » and copy or share it.

### Choose what I want to keep
Why: a relative wants to say which objects they would like, quickly, on their phone. (seen: src/components/invite.tsx, src/components/swipe.tsx)
1. Open the invite link `/invite/:token`.
2. Press « Rejoindre la liste », signing in by e-mail link when asked.
3. On `/lists/:id`, press « Commencer à swiper ».
4. On `/lists/:id/swipe`, swipe right or press « Je le veux », swipe left or press « Non merci ».
5. Press « Annuler » to undo the last choice.
6. Reach « Tout vu » when every object has been seen.

### Find an object I remember
Why: a relative remembers « la lampe verte du bureau » and wants to find it. (seen: src/components/search.tsx)
1. On `/lists/:id/search`, type « lampe verte ».
2. Press « Chercher ».
3. Read the results, each with its title and description.

### See who wants what
Why: Muriel wants to know which objects several people want, to talk it over. (seen: src/components/recap.tsx)
1. On `/lists/:id`, press « Récapitulatif ».
2. On `/lists/:id/recap`, read each relative's progress.
3. Read the objects most wanted first, with who said yes and the conflicts marked.

### Follow a dead link
Why: a relative opens an old or wrong link and must find their way back. (seen: src/components/invite.tsx)
1. Open an expired `/invite/:token` and read that it has expired.
2. Open an address that does not exist and read the 404 page, then go back home.
