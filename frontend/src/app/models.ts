export type Categorie = 'BEBE' | 'ENFANT' | 'JEUNE' | 'ADULTE' | 'SENIOR';
export type TypePassager = 'ADULTE' | 'ENFANT' | 'BEBE';
export type Bagage = 'AUCUN' | 'CABINE_10KG' | 'SOUTE_20KG' | 'SOUTE_32KG';
export type ClasseSiege = 'PREMIUM' | 'AVANT' | 'ESPACE' | 'STANDARD';
export type StatutReservation = 'EN_ATTENTE' | 'CONFIRMEE' | 'ANNULEE' | 'EXPIREE';

export const CATEGORIES: { code: Categorie; libelle: string }[] = [
  { code: 'BEBE', libelle: 'Bébé (0-1 an)' },
  { code: 'ENFANT', libelle: 'Enfant (2-11 ans)' },
  { code: 'JEUNE', libelle: 'Jeune (12-25 ans)' },
  { code: 'ADULTE', libelle: 'Adulte (26-64 ans)' },
  { code: 'SENIOR', libelle: 'Senior (65 ans et +)' },
];

export interface Vol {
  id: number; compagnie: string; numeroVol: string; origine: string; destination: string;
  dateDepart: string; dateArrivee: string; capacite: number; prix: number;
  statut: 'PROGRAMME' | 'ANNULE'; placesRestantes: number; promoPourcent: number; prixPromo: number;
}
export type VolRequest = Omit<Vol, 'id' | 'statut' | 'placesRestantes' | 'promoPourcent' | 'prixPromo'>;
export interface ResultatVol { vol: Vol; prixTotalEstime: number; }
export interface Recherche { origine: string; destination: string; date: string; flexibilite: number; adultes: number; enfants: number; bebes: number; codePromo?: string; }

export interface Carte { marque: string; fin: string; titulaire: string; expiration: string; }
export interface Utilisateur {
  id: number; email: string; nom: string; prenom: string; telephone: string; dateNaissance: string;
  role: 'CLIENT' | 'ADMIN'; carte: Carte | null;
}
export interface AuthReponse { token: string; utilisateur: Utilisateur; }

export interface PassagerRes {
  id: number; type: TypePassager; nom: string | null; prenom: string | null; dateNaissance: string | null;
  categorie: Categorie; prixBillet: number; siege: string | null; siegePrix: number; bagage: Bagage;
  prioritaire: boolean; repas: boolean; enregistre: boolean;
}
export interface Paiement { montant: number; type: 'PAIEMENT' | 'MODIFICATION' | 'REMBOURSEMENT'; carteMarque: string | null; carteFin: string | null; motif: string; date: string; }
export interface Totaux { billets: number; sieges: number; bagages: number; options: number; assurance: number; frais: number; total: number; paye: number; solde: number; }
export interface Reservation {
  id: number; reference: string; statut: StatutReservation; vol: Vol; creeLe: string; expireLe: string | null;
  assurance: boolean; codePromo: string | null; remisePromo: number; remiseGroupe: number;
  passagers: PassagerRes[]; totaux: Totaux; paiements: Paiement[];
  detailsComplets: boolean; enregistrementOuvert: boolean; modifiable: boolean;
  porte: string; heureEmbarquement: string; client: string;
}
export interface ApercuModification {
  nouveauVol: Vol; ancienBillets: number; nouveauBillets: number; difference: number;
  frais: number; fraisPourcent: number; aPayer: number;
}
export interface PaiementRequest {
  numeroCarte?: string; titulaire?: string; expiration?: string; cvv?: string; enregistrer?: boolean; carteEnregistree?: boolean;
}

export interface Siege { code: string; libre: boolean; }
export interface Rangee { rang: number; classe: ClasseSiege; prix: number; sieges: Siege[]; }
export interface Plan { volId: number; rangees: number; plan: Rangee[]; }

export interface Catalogue {
  bagages: { code: Bagage; libelle: string; prix: number }[];
  classesSiege: { code: ClasseSiege; libelle: string; prix: number }[];
  categories: { code: Categorie; libelle: string; coefficient: number }[];
  assurance: number; embarquementPrioritaire: number; repas: number;
  fraisModificationPourcent: number; delaiPaiementMinutes: number;
}

export interface Promotion {
  id: number; code: string; description: string; pourcentage: number; dateDebut: string; dateFin: string;
  automatique: boolean; volId: number | null; volLibelle: string | null; actif: boolean; enCours: boolean;
}
export type PromotionRequest = Omit<Promotion, 'id' | 'volLibelle' | 'enCours'>;

export interface Manifeste { reference: string; passager: string; categorie: Categorie; siege: string | null; bagage: Bagage; statut: StatutReservation; }
export interface Stats {
  totalVols: number; volsAVenir: number; clients: number; reservationsConfirmees: number; reservationsEnAttente: number;
  passagersParCategorie: Record<Categorie, number>; revenuTotal: number; tauxRemplissagePourcent: number;
}
export interface ChatReponse { reponse: string; suggestions: string[]; }
