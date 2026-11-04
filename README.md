# ✈ Billets d'avion

Site de réservation de vols inspiré des compagnies aériennes (Ryanair, Royal Air Maroc…).
Back-end **Spring Boot 3.5** (Java 21, JPA, H2) + front **Angular 21** avec **PrimeNG 21** (thème Aura orange, composants PrimeNG partout : menu, tableaux, formulaires, calendriers, boîtes de dialogue, notifications, graphique…).

## Lancer
```bash
# 1. Back-end (http://localhost:8080)
cd backend && mvn spring-boot:run

# 2. Front-end (http://localhost:4200, proxy /api -> :8080)
cd frontend && npm install && npm start
```
Tests du back-end : `cd backend && mvn test` (11 tests d'intégration).
Si vous aviez lancé une version précédente, supprimez le dossier `backend/data` (le modèle de données a changé).

## Parcours client
1. **Accueil** : barre de recherche (départ, destination, date, passagers adultes/enfants/bébés, dates flexibles ±3 jours, code promo). **Aucune connexion nécessaire** pour chercher.
2. **Résultats** : horaires, durée, prix par adulte (promotion affichée), total estimé pour tous les passagers, places restantes.
3. **Réserver** : si la personne n'est pas connectée, on lui demande de **se connecter ou de s'inscrire**, puis elle reprend exactement le vol choisi. La réservation est **créée et gardée 15 minutes** (compte à rebours) avant paiement.
4. **Réservation** (une seule page) :
   - **Passagers** (nom, prénom, date de naissance ; le premier adulte est pré-rempli avec le compte) ; le prix dépend de l'âge le jour du vol.
   - **Choix des sièges** en **plan 2D** ou en **vue 3D de la cabine** (Three.js, chargé à la demande) : on avance dans l'allée (molette, flèches ↑ ↓, curseur), on regarde autour en glissant, on survole un siège pour voir sa catégorie et son prix, on clique pour le choisir, et on peut voir la cabine **depuis son siège**. Mêmes règles dans les deux vues : sièges gratuits (standard) ou payants (avant, grand espace jambes, premium). Les sièges déjà pris sont grisés ; enfants interdits près des sorties de secours ; bébés sur les genoux.
   - **Bagages** (cabine 10 kg, soute 20/32 kg), **embarquement prioritaire**, **repas**, **assurance annulation**.
   - **Récapitulatif en direct** et **paiement par carte fictif**.
5. **Après paiement** : code de réservation à 6 caractères, **compte à rebours jusqu'au départ**, et dans « Mes voyages » :
   - ajouter des options ou des sièges plus tard (solde à régler) ;
   - **modifier le vol** : frais de **10 %** du prix des billets + différence de prix (ex. billet à 100 € → 10 € de frais) ;
   - **enregistrement en ligne** (48 h → 1 h avant le départ) avec **carte d'embarquement** imprimable ;
   - **annuler** : remboursement intégral avec l'assurance, sinon pas de remboursement (vol annulé par la compagnie : toujours remboursé) ;
   - réserver le vol retour ou un autre vol.
6. **Mon compte** : profil et carte enregistrée.

## Règles de prix
- Tarif selon l'âge au jour du vol : bébé 10 %, enfant 50 %, jeune (12-25) 75 %, adulte 100 %, senior (65+) 80 %.
- **Remise de groupe** automatique : 5 % dès 5 passagers, 10 % dès 10, 15 % dès 20.
- **Promotions** (par l'admin) : automatiques ou sur code, sur un vol ou tous ; non cumulables entre elles (la meilleure est retenue), cumulables avec l'âge et le groupe.
- Sièges : premium +35 €, avant +15 €, grand espace +20 €, standard gratuit. Tous les tarifs sont dans `Catalogue.java`, `Bagage.java`, `ClasseSiege.java`.

## Données de démonstration (bouton admin)
Dans **Administration → Tableau de bord**, le bouton **« Insérer les données de démonstration »** ajoute en un clic : 24 vols (12 liaisons aller-retour), 5 promotions, 3 clients de démonstration et 3 réservations (dont un groupe de 6 et un voyage payé avec assurance).
**Aucun doublon** : chaque donnée est identifiée par une clé (numéro de vol, code promo, e-mail) et ignorée si elle existe déjà ; on peut cliquer autant de fois qu'on veut. Un bilan s'affiche (ajouté / déjà présent).
Comptes de démonstration (mot de passe `demo12345`) : `sara.benali@demo.be`, `karim.janssens@demo.be`, `lea.dubois@demo.be`.

## Administration
Connexion avec le compte administrateur (menu « Se connecter »). Identifiants par défaut `admin` / `admin123` : **à changer** via les variables d'environnement `ADMIN_USERNAME` et `ADMIN_PASSWORD`.
Tableau de bord, **ajout/modification/annulation/suppression de vols**, promotions, liste de toutes les réservations (recherche par référence ou e-mail, annulation avec remboursement), passagers d'un vol filtrables par catégorie d'âge (ex. « jeunes »).

## Chatbot gratuit
Bulle de chat en bas à droite (`POST /api/chat`), sans IA externe ni clé d'API : il reconnaît des mots-clés français et répond avec les vraies données (vols, prix, promotions, bagages, sièges, modification, annulation, enregistrement).

## Paiement fictif
Aucune banque n'est contactée. Le format de la carte est validé (Luhn, date, CVV) ; seuls la marque et les 4 derniers chiffres sont conservés, jamais le numéro complet ni le CVV.
Carte de test acceptée : `4242 4242 4242 4242` · refusée : `4000 0000 0000 0002`.

## Documentation du code
Chaque classe, méthode, constructeur et accesseur est documenté : **Javadoc** en français côté Java (`@param`, `@return`), **JSDoc** côté TypeScript. Les règles de prix et d'accès sont décrites dans les classes `Tarif`, `Catalogue`, `AdminInterceptor` et `ReservationService`.

## Pourquoi PrimeNG 21 et pas 22 ?
PrimeNG 22 exige une clé de licence PrimeUI (gratuite sous conditions, mais à demander) et affiche un bandeau « Invalid PrimeUI License » sans elle. PrimeNG 21 est sous licence MIT, sans clé : le projet utilise donc Angular 21 + PrimeNG 21.

## Sécurité
Mots de passe hachés (BCrypt), jeton de session de 8 h, contrôle d'accès côté serveur (public / connecté / admin), une réservation n'est visible que par son propriétaire. Les jetons sont gardés en mémoire du serveur : redémarrer le back-end déconnecte tout le monde.

## MySQL au lieu de H2
Ajouter `mysql-connector-j` au `pom.xml` et adapter `spring.datasource.*` dans `backend/src/main/resources/application.properties`.
