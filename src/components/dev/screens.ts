// The screens of the development-only preview, by route segment.
export const SCREENS = {
  lists: "Mes listes",
  "lists-vide": "Mes listes, nouveau compte",
  proprietaire: "Liste, vue de Muriel",
  invite: "Liste, vue d’un proche",
  swipe: "Swiper",
  "swipe-fini": "Swiper, tout vu",
  recherche: "Rechercher",
  recap: "Récapitulatif",
  invitation: "Invitation",
  "invitation-connecte": "Invitation, déjà connecté·e",
  "invitation-expiree": "Invitation expirée",
  connexion: "Connexion",
} as const;
export type Screen = keyof typeof SCREENS;
