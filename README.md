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
- **Tableau de bord** : vols, passagers par catégorie, réservations, groupes, taux de remplissage, chiffre d'affaires.

## API REST (`/api`)
`/vols`, `/vols/{id}/passagers?categorie=`, `/vols/{id}/annuler`, `/passagers`, `/passagers/{id}/reservations`,
`/reservations`, `/reservations/{id}/annuler`, `/groupes`, `/groupes/{id}/passagers`, `/groupes/{id}/annuler`, `/stats`.

## MySQL au lieu de H2
Ajouter `mysql-connector-j` au `pom.xml` et adapter `spring.datasource.*` dans `backend/src/main/resources/application.properties`.
