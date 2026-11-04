# ✈ Gestion de Billets d'Avion

Back-end **Spring Boot 3.5** (Java 21, JPA, H2) + front **Angular 22**.

## Lancer
```bash
# 1. Back-end (http://localhost:8080)
cd backend && mvn spring-boot:run

# 2. Front-end (http://localhost:4200, proxy /api -> :8080)
cd frontend && npm install && npm start
```
Tests du back-end : `cd backend && mvn test`.

## Fonctionnalités
- **Vols** : ajout, modification, suppression, annulation (annule les réservations), recherche (origine, destination, date, places disponibles), manifeste des passagers filtrable par catégorie d'âge.
- **Passagers** : ajout, modification, suppression, recherche, filtre par catégorie (bébé, enfant, jeune, adulte, senior) calculée depuis la date de naissance.
- **Réservations** : prix automatique selon l'âge du passager **à la date du vol** (bébé 10 %, enfant 50 %, jeune 75 %, adulte 100 %, senior 80 %), contrôle des places, doublons, vols annulés ou déjà partis ; annulation.
- **Voyages groupés** : un groupe = plusieurs passagers sur un même vol, remise 5 % dès 5 passagers, 10 % dès 10, 15 % dès 20 (prix recalculés quand on ajoute/retire des membres), annulation du groupe.
- **Promotions** : pourcentage de remise, période, sur un vol précis ou tous les vols, soit **automatique** (appliquée seule), soit **sur code promo** saisi à la réservation. Non cumulables entre elles (la meilleure est retenue), cumulables avec le tarif d'âge et la remise de groupe.
- **Administrateur** : seul l'admin peut ajouter/modifier/supprimer/annuler des vols et gérer les promotions (connexion par jeton, bouton « Admin » du menu). Identifiants par défaut `admin` / `admin123`, **à changer** via les variables d'environnement `ADMIN_USERNAME` et `ADMIN_PASSWORD`.
- **Chatbot gratuit** : bulle de chat en bas à droite, assistant intégré au back-end (`POST /api/chat`), sans IA externe ni clé d'API. Il comprend le français par mots-clés et répond avec les vraies données : vols (« vols de Bruxelles à Paris »), prix et tarifs par âge, promotions, voyages groupés, aide à la réservation.
- **Tableau de bord** : vols, passagers par catégorie, réservations, groupes, taux de remplissage, chiffre d'affaires.

## API REST (`/api`)
`/vols`, `/vols/{id}/passagers?categorie=`, `/vols/{id}/annuler`, `/passagers`, `/passagers/{id}/reservations`,
`/reservations`, `/reservations/{id}/annuler`, `/groupes`, `/groupes/{id}/passagers`, `/groupes/{id}/annuler`, `/stats`,
`/promotions`, `/promotions/verifier?code=&volId=`, `/admin/promotions`, `/auth/login`, `/auth/logout`, `/auth/me`, `/chat`.
Les écritures sur `/vols` et `/promotions` ainsi que `/admin/**` exigent `Authorization: Bearer <jeton>`.

## MySQL au lieu de H2
Ajouter `mysql-connector-j` au `pom.xml` et adapter `spring.datasource.*` dans `backend/src/main/resources/application.properties`.
