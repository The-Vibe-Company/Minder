// Fake data for the development-only preview (/dev/preview). Never imported by real pages.
import type { Item } from "../ui";

const svg = (body: string) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400"><rect width="400" height="280" fill="#e6e3dc"/><rect y="280" width="400" height="120" fill="#d4cfc4"/>${body}</svg>`,
  )}`;

const ART = {
  soupiere: svg(
    `<ellipse cx="200" cy="318" rx="120" ry="14" fill="#bdb6a8"/><path d="M140 308h120l-12-20h-96z" fill="#f3f1ea"/><path d="M100 220c0 50 44 78 100 78s100-28 100-78z" fill="#fbfaf6" stroke="#c9c3b6" stroke-width="3"/><path d="M104 218c4-44 46-64 96-64s92 20 96 64z" fill="#fbfaf6" stroke="#c9c3b6" stroke-width="3"/><path d="M116 202c52 10 116 10 168 0" stroke="#2343a6" stroke-width="5" fill="none"/><circle cx="200" cy="146" r="11" fill="#fbfaf6" stroke="#c9c3b6" stroke-width="3"/><g fill="#2343a6"><circle cx="200" cy="252" r="9"/><circle cx="182" cy="242" r="6"/><circle cx="218" cy="242" r="6"/><circle cx="182" cy="262" r="6"/><circle cx="218" cy="262" r="6"/></g>`,
  ),
  buffet: svg(
    `<rect x="70" y="150" width="260" height="140" rx="6" fill="#8a5a2b"/><rect x="62" y="140" width="276" height="16" rx="4" fill="#6f4520"/><rect x="86" y="170" width="108" height="104" rx="4" fill="#9b6a37"/><rect x="206" y="170" width="108" height="104" rx="4" fill="#9b6a37"/><circle cx="186" cy="222" r="5" fill="#d9b25b"/><circle cx="214" cy="222" r="5" fill="#d9b25b"/><rect x="84" y="290" width="12" height="22" fill="#6f4520"/><rect x="304" y="290" width="12" height="22" fill="#6f4520"/>`,
  ),
  lampe: svg(
    `<ellipse cx="200" cy="316" rx="70" ry="10" fill="#bdb6a8"/><path d="M150 312h100l-8-16h-84z" fill="#b8913c"/><path d="M200 296V160" stroke="#b8913c" stroke-width="8"/><path d="M120 166c14-44 146-44 160 0z" fill="#17704a"/><path d="M120 166h160" stroke="#0f5636" stroke-width="5"/>`,
  ),
  miroir: svg(
    `<ellipse cx="200" cy="190" rx="84" ry="120" fill="#c9a24a"/><ellipse cx="200" cy="190" rx="68" ry="102" fill="#dfe6ea"/><path d="M164 130c10-22 30-30 44-30" stroke="#fff" stroke-width="8" stroke-linecap="round" fill="none" opacity=".8"/>`,
  ),
  livres: svg(
    `<path d="M90 190h220l-14 120H104z" fill="#c69a63"/><path d="M80 170h240v24H80z" fill="#b5864f"/>${[
      0, 1, 2, 3, 4, 5, 6,
    ]
      .map(
        (i) =>
          `<rect x="${108 + i * 28}" y="${118 + (i % 3) * 10}" width="22" height="${70 - (i % 3) * 10}" fill="${["#2343a6", "#b3261e", "#17704a", "#ffd84a", "#5b45b0", "#0f6b78", "#b4540b"][i]}"/>`,
      )
      .join("")}`,
  ),
  verres: svg(
    `${[0, 1, 2]
      .map(
        (i) =>
          `<g transform="translate(${110 + i * 90} 0)"><path d="M0 130h56c0 50-12 70-28 72-16-2-28-22-28-72z" fill="#f6f8fb" stroke="#9aa6b8" stroke-width="3"/><path d="M28 202v80" stroke="#9aa6b8" stroke-width="4"/><ellipse cx="28" cy="286" rx="26" ry="6" fill="#f6f8fb" stroke="#9aa6b8" stroke-width="3"/></g>`,
      )
      .join("")}`,
  ),
  singer: svg(
    `<rect x="90" y="270" width="230" height="22" rx="4" fill="#6f4520"/><path d="M120 270v-90c0-30 20-44 60-44h110c20 0 30 10 30 30v24h-40v80z" fill="#1d1d22"/><rect x="250" y="190" width="30" height="80" fill="#1d1d22"/><circle cx="150" cy="170" r="18" fill="#d9b25b"/><path d="M190 160h80" stroke="#d9b25b" stroke-width="4"/>`,
  ),
  fauteuil: svg(
    `<rect x="120" y="110" width="160" height="130" rx="30" fill="#d8a427"/><rect x="100" y="200" width="200" height="60" rx="20" fill="#e5b43a"/><rect x="88" y="170" width="40" height="100" rx="18" fill="#c99520"/><rect x="272" y="170" width="40" height="100" rx="18" fill="#c99520"/><path d="M120 270l-8 40M280 270l8 40" stroke="#6f4520" stroke-width="8"/>`,
  ),
  boutons: svg(
    `<ellipse cx="200" cy="240" rx="120" ry="44" fill="#2a5c8f"/><path d="M80 240v-30c0-24 54-44 120-44s120 20 120 44v30" fill="#3a6fa5"/><ellipse cx="200" cy="208" rx="112" ry="38" fill="#e9e4d6"/>${[
      [150, 200, "#b3261e"],
      [190, 192, "#ffd84a"],
      [230, 206, "#17704a"],
      [170, 218, "#2343a6"],
      [250, 194, "#fff"],
      [210, 222, "#5b45b0"],
    ]
      .map(([x, y, c]) => `<circle cx="${x}" cy="${y}" r="9" fill="${c}"/>`)
      .join("")}`,
  ),
  tableau: svg(
    `<rect x="80" y="70" width="240" height="170" fill="#8a5a14"/><rect x="94" y="84" width="212" height="142" fill="#bcd3e6"/><rect x="94" y="180" width="212" height="46" fill="#2a5c8f"/><path d="M200 110v70h40z" fill="#fff"/><path d="M196 120v60h-32z" fill="#f3f1ea"/><path d="M160 182h90l-10 12h-70z" fill="#6f4520"/>`,
  ),
};

const auto = (description: string) => ({
  description,
  description_auto: description,
});
export const LIST_ID = "4b1f7f0e-2c5a-4d55-9c1e-7f4e3c2a9b10";
export const MEMBERS = [
  { id: "m-muriel", display_name: "Muriel" },
  { id: "m-stan", display_name: "Stan" },
  { id: "m-claire", display_name: "Claire" },
  { id: "m-leo", display_name: "Léo" },
  { id: "m-jeanne", display_name: "Mamie Jeanne" },
  { id: "m-thomas", display_name: "Thomas" },
];
const P = Object.fromEntries(MEMBERS.map((m) => [m.display_name, m]));

export function items(): Item[] {
  return [
    {
      id: "i-soupiere",
      title: "La soupière de Quimper",
      photoUrl: ART.soupiere,
      ...auto(
        "Soupière en faïence de Quimper, décor de fleurs bleues, une petite ébréchure au couvercle.",
      ),
      yes: [P.Stan, P.Claire, P["Mamie Jeanne"]],
      no: [P.Thomas],
    },
    {
      id: "i-buffet",
      title: "Le buffet du salon",
      photoUrl: ART.buffet,
      description:
        "Buffet en chêne du salon, deux portes et deux tiroirs. Lourd : prévoir deux paires de bras et un camion.",
      description_auto: "Meuble en bois avec deux portes.",
      yes: [P.Thomas, P.Stan],
      no: [P.Claire, P["Léo"]],
    },
    {
      id: "i-lampe",
      title: "La lampe verte du bureau",
      photoUrl: ART.lampe,
      ...auto(
        "Lampe de bureau, abat-jour en verre vert, pied en laiton. Fonctionne.",
      ),
      yes: [P["Léo"]],
      no: [P.Stan],
    },
    {
      id: "i-livres",
      title: null,
      photoUrl: ART.livres,
      description: "",
      description_auto: null,
      yes: [],
      no: [P.Claire, P.Thomas],
    },
    {
      id: "i-miroir",
      title: "Le miroir de l’entrée",
      photoUrl: ART.miroir,
      description:
        "Miroir ovale doré de l’entrée. Celui où l’on vérifiait sa coiffure avant de partir.",
      description_auto: "Miroir ovale à cadre doré.",
      yes: [P.Claire],
      no: [],
    },
    {
      id: "i-singer",
      title: "La Singer de Mamie",
      photoUrl: ART.singer,
      ...auto(
        "Machine à coudre Singer noire avec décor doré, posée sur un socle en bois.",
      ),
      yes: [P["Mamie Jeanne"], P.Claire],
      no: [],
    },
    {
      id: "i-fauteuil",
      title: "Le fauteuil moutarde",
      photoUrl: ART.fauteuil,
      description:
        "Fauteuil en velours moutarde, un peu râpé sur l’accoudoir droit.",
      description_auto: null,
      yes: [],
      no: [P.Stan],
    },
    {
      id: "i-boutons",
      title: "La boîte à boutons",
      photoUrl: ART.boutons,
      description:
        "La boîte à boutons de Mamie. Personne ne sait combien il y en a.",
      description_auto: null,
      yes: [P["Léo"], P.Thomas, P.Claire],
      no: [],
    },
    {
      id: "i-verres",
      title: "Les six verres à pied",
      photoUrl: ART.verres,
      ...auto("Six verres à pied en cristal, ceux des grandes occasions."),
      yes: [],
      no: [],
    },
    {
      id: "i-tableau",
      title: "Le tableau du bateau",
      photoUrl: ART.tableau,
      description: "Le tableau du bateau, peint par l’oncle Pierre.",
      description_auto: null,
      yes: [P.Stan],
      no: [],
    },
  ];
}
