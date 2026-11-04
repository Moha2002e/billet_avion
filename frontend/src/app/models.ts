export type Categorie = 'BEBE' | 'ENFANT' | 'JEUNE' | 'ADULTE' | 'SENIOR';

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

export interface Passager {
  id: number; nom: string; prenom: string; dateNaissance: string; age: number;
  categorie: Categorie; categorieLibelle: string; telephone: string; email: string | null;
}
export type PassagerRequest = Pick<Passager, 'nom' | 'prenom' | 'dateNaissance' | 'telephone'> & { email: string | null };

export interface Reservation {
  id: number; volId: number; volLibelle: string; dateDepart: string;
  passagerId: number; passagerNom: string; categorie: Categorie;
  groupeId: number | null; groupeNom: string | null; prix: number; codePromo: string | null; remisePromo: number;
  statut: 'CONFIRMEE' | 'ANNULEE'; dateReservation: string;
}

export interface Groupe {
  id: number; nom: string; responsable: string; volId: number; volLibelle: string;
  actif: boolean; nbPassagers: number; remisePourcent: number; total: number; membres: Reservation[];
}

export interface Stats {
  totalVols: number; volsAVenir: number; totalPassagers: number;
  passagersParCategorie: Record<Categorie, number>;
  reservationsActives: number; groupesActifs: number; revenuTotal: number; tauxRemplissagePourcent: number;
}

export interface Promotion {
  id: number; code: string; description: string; pourcentage: number; dateDebut: string; dateFin: string;
  automatique: boolean; volId: number | null; volLibelle: string | null; actif: boolean; enCours: boolean;
}
export type PromotionRequest = Omit<Promotion, 'id' | 'volLibelle' | 'enCours'>;

export interface ChatReponse { reponse: string; suggestions: string[]; }
