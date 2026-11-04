/** Catégorie d'âge d'un passager, qui détermine le coefficient de prix. */
export type Categorie = 'BEBE' | 'ENFANT' | 'JEUNE' | 'ADULTE' | 'SENIOR';
/** Type choisi à la recherche : adulte (12 ans et +), enfant (2-11 ans), bébé (0-1 an, sur les genoux). */
export type TypePassager = 'ADULTE' | 'ENFANT' | 'BEBE';
/** Bagage au choix : le petit sac est inclus, les autres sont payants. */
export type Bagage = 'AUCUN' | 'CABINE_10KG' | 'SOUTE_20KG' | 'SOUTE_32KG';
/** Catégorie de siège : plus il y a de place, plus c'est cher ; standard gratuit. */
export type ClasseSiege = 'PREMIUM' | 'AVANT' | 'ESPACE' | 'STANDARD';
/** Statut d'une réservation (en attente de paiement, confirmée, annulée, expirée). */
export type StatutReservation = 'EN_ATTENTE' | 'CONFIRMEE' | 'ANNULEE' | 'EXPIREE';

/** Catégories d'âge avec leur libellé (pour les menus et filtres). */
export const CATEGORIES: { code: Categorie; libelle: string }[] = [
  { code: 'BEBE', libelle: 'Bébé (0-1 an)' },
  { code: 'ENFANT', libelle: 'Enfant (2-11 ans)' },
  { code: 'JEUNE', libelle: 'Jeune (12-25 ans)' },
  { code: 'ADULTE', libelle: 'Adulte (26-64 ans)' },
  { code: 'SENIOR', libelle: 'Senior (65 ans et +)' },
];

/** Vol tel que renvoyé par l'API, avec places restantes et prix promotionnel. */
export interface Vol {
  id: number; compagnie: string; numeroVol: string; origine: string; destination: string;
  dateDepart: string; dateArrivee: string; capacite: number; prix: number;
  statut: 'PROGRAMME' | 'ANNULE'; placesRestantes: number; promoPourcent: number; prixPromo: number;
}
/** Informations envoyées pour ajouter ou modifier un vol. */
export type VolRequest = Omit<Vol, 'id' | 'statut' | 'placesRestantes' | 'promoPourcent' | 'prixPromo'>;
/** Un résultat de recherche : le vol et le prix total estimé pour tous les passagers. */
export interface ResultatVol { vol: Vol; prixTotalEstime: number; }
/** Critères d'une recherche de vols (barre de recherche). */
export interface Recherche { origine: string; destination: string; date: string; flexibilite: number; adultes: number; enfants: number; bebes: number; codePromo?: string; }

/** Carte bancaire enregistrée (marque et 4 derniers chiffres, jamais le numéro complet). */
export interface Carte { marque: string; fin: string; titulaire: string; expiration: string; }
/** Compte connecté (client ou administrateur). */
export interface Utilisateur {
  id: number; email: string; nom: string; prenom: string; telephone: string; dateNaissance: string;
  role: 'CLIENT' | 'ADMIN'; carte: Carte | null;
}
/** Réponse de connexion : jeton de session et compte. */
export interface AuthReponse { token: string; utilisateur: Utilisateur; }

/** Passager d'une réservation : identité, prix du billet, siège et options. */
export interface PassagerRes {
  id: number; type: TypePassager; nom: string | null; prenom: string | null; dateNaissance: string | null;
  categorie: Categorie; prixBillet: number; siege: string | null; siegePrix: number; bagage: Bagage;
  prioritaire: boolean; repas: boolean; enregistre: boolean;
}
/** Opération de paiement, de modification ou de remboursement (montant négatif). */
export interface Paiement { montant: number; type: 'PAIEMENT' | 'MODIFICATION' | 'REMBOURSEMENT'; carteMarque: string | null; carteFin: string | null; motif: string; date: string; }
/** Totaux d'une réservation : billets, sièges, bagages, options, assurance, frais, total, payé et solde. */
export interface Totaux { billets: number; sieges: number; bagages: number; options: number; assurance: number; frais: number; total: number; paye: number; solde: number; }
/** Réservation complète : vol, passagers, totaux, paiements et états (enregistrement ouvert, modifiable…). */
export interface Reservation {
  id: number; reference: string; statut: StatutReservation; vol: Vol; creeLe: string; expireLe: string | null;
  assurance: boolean; codePromo: string | null; remisePromo: number; remiseGroupe: number;
  passagers: PassagerRes[]; totaux: Totaux; paiements: Paiement[];
  detailsComplets: boolean; enregistrementOuvert: boolean; modifiable: boolean;
  porte: string; heureEmbarquement: string; client: string;
}
/** Aperçu du coût d'un changement de vol : différence de prix, frais de 10 % et total à payer. */
export interface ApercuModification {
  nouveauVol: Vol; ancienBillets: number; nouveauBillets: number; difference: number;
  frais: number; fraisPourcent: number; aPayer: number;
}
/** Opération de paiement, de modification ou de remboursement (montant négatif). */
export interface PaiementRequest {
  numeroCarte?: string; titulaire?: string; expiration?: string; cvv?: string; enregistrer?: boolean; carteEnregistree?: boolean;
}

/** Siège du plan de cabine et sa disponibilité. */
export interface Siege { code: string; libre: boolean; }
/** Rangée du plan de cabine : catégorie, prix et sièges. */
export interface Rangee { rang: number; classe: ClasseSiege; prix: number; sieges: Siege[]; }
/** Plan de cabine d'un vol. */
export interface Plan { volId: number; rangees: number; plan: Rangee[]; }

/** Tarifs et règles commerciales (bagages, sièges, assurance, frais de modification). */
export interface Catalogue {
  bagages: { code: Bagage; libelle: string; prix: number }[];
  classesSiege: { code: ClasseSiege; libelle: string; prix: number }[];
  categories: { code: Categorie; libelle: string; coefficient: number }[];
  assurance: number; embarquementPrioritaire: number; repas: number;
  fraisModificationPourcent: number; delaiPaiementMinutes: number;
}

/** Promotion : automatique ou sur code, pour un vol ou tous les vols. */
export interface Promotion {
  id: number; code: string; description: string; pourcentage: number; dateDebut: string; dateFin: string;
  automatique: boolean; volId: number | null; volLibelle: string | null; actif: boolean; enCours: boolean;
}
/** Informations envoyées pour ajouter ou modifier une promotion. */
export type PromotionRequest = Omit<Promotion, 'id' | 'volLibelle' | 'enCours'>;

/** Ligne de la liste des passagers d'un vol (administrateur). */
export interface Manifeste { reference: string; passager: string; categorie: Categorie; siege: string | null; bagage: Bagage; statut: StatutReservation; }
/** Statistiques du tableau de bord de l'administrateur. */
export interface Stats {
  totalVols: number; volsAVenir: number; clients: number; reservationsConfirmees: number; reservationsEnAttente: number;
  passagersParCategorie: Record<Categorie, number>; revenuTotal: number; tauxRemplissagePourcent: number;
}
/** Réponse du chatbot et suggestions de questions. */
export interface ChatReponse { reponse: string; suggestions: string[]; }

/** Résultat du bouton « Insérer les données de démonstration » (chaque donnée existante est ignorée, jamais dupliquée). */
export interface DonneesResultat {
  volsAjoutes: number; volsExistants: number; promotionsAjoutees: number; promotionsExistantes: number;
  clientsAjoutes: number; clientsExistants: number; reservationsAjoutees: number;
}
