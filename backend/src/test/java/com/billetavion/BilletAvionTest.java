package com.billetavion;

import com.billetavion.model.Categorie;
import com.billetavion.service.Tarif;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.concurrent.atomic.AtomicInteger;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = "spring.datasource.url=jdbc:h2:mem:test;DB_CLOSE_DELAY=-1")
/** Tests d'intégration de l'API (MockMvc, base H2 en mémoire) : accès, prix, réservations, paiement, promotions, chat, données de démonstration. */
class BilletAvionTest {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    static final AtomicInteger SEQ = new AtomicInteger();
    static final String VISA = "{\"numeroCarte\":\"4242 4242 4242 4242\",\"titulaire\":\"Jean Test\",\"expiration\":\"12/40\",\"cvv\":\"123\",\"enregistrer\":true}";
    static final String REFUSEE = "{\"numeroCarte\":\"4000 0000 0000 0002\",\"titulaire\":\"Jean Test\",\"expiration\":\"12/40\",\"cvv\":\"123\"}";
    static final String ENREGISTREE = "{\"carteEnregistree\":true}";

    // ---------- helpers ----------
    /** Convertit une réponse JSON (texte) en arbre JSON pour la lire dans les tests. */
    JsonNode lire(String body) throws Exception { return json.readTree(body); }

    /**
     * Envoie une requête à l'API et vérifie le code HTTP attendu.
     *
     * @param req la requête
     * @param jeton le jeton de session, ou null pour un visiteur
     * @param body le corps JSON, ou null
     * @param statut le code HTTP attendu
     * @return le corps de la réponse
     */
    String envoyer(MockHttpServletRequestBuilder req, String jeton, String body, int statut) throws Exception {
        if (body != null) req.contentType(MediaType.APPLICATION_JSON).content(body);
        if (jeton != null) req.header("Authorization", "Bearer " + jeton);
        return mvc.perform(req).andExpect(status().is(statut)).andReturn().getResponse().getContentAsString();
    }

    /** Connecte l'administrateur par défaut et renvoie son jeton. */
    String admin() throws Exception {
        return lire(envoyer(post("/api/auth/login"), null, "{\"identifiant\":\"admin\",\"motDePasse\":\"admin123\"}", 200)).get("token").asText();
    }

    /** Client de test : jeton de session et identifiant. */
    record Client(String jeton, long id) {}

    /** Inscrit un nouveau client de test (e-mail unique) et renvoie son jeton. */
    Client client() throws Exception {
        String email = "client" + SEQ.incrementAndGet() + "@test.be";
        JsonNode r = lire(envoyer(post("/api/auth/inscription"), null, "{\"email\":\"" + email + "\",\"motDePasse\":\"motdepasse1\",\"nom\":\"Dupont\",\"prenom\":\"Jean\",\"telephone\":\"0470123456\",\"dateNaissance\":\"1990-05-10\"}", 201));
        return new Client(r.get("token").asText(), r.get("utilisateur").get("id").asLong());
    }

    /** Crée un vol Bruxelles → Paris en tant qu'administrateur et renvoie son identifiant. */
    long vol(String jeton, String numero, int capacite, int prix, LocalDateTime depart) throws Exception {
        String body = "{\"compagnie\":\"AF\",\"numeroVol\":\"" + numero + "\",\"origine\":\"Bruxelles\",\"destination\":\"Paris\",\"dateDepart\":\"" + depart
                + "\",\"dateArrivee\":\"" + depart.plusHours(1) + "\",\"capacite\":" + capacite + ",\"prix\":" + prix + "}";
        return lire(envoyer(post("/api/vols"), jeton, body, 201)).get("id").asLong();
    }

    /** Crée une réservation pour un client et renvoie la réponse. */
    JsonNode reserver(Client c, long vol, int adultes, int enfants, int bebes) throws Exception {
        return lire(envoyer(post("/api/reservations"), c.jeton(), "{\"volId\":" + vol + ",\"adultes\":" + adultes + ",\"enfants\":" + enfants + ",\"bebes\":" + bebes + "}", 201));
    }

    /** Construit le JSON d'identité d'un passager. */
    String identite(JsonNode p, String nom, String naissance) {
        return "{\"id\":" + p.get("id").asLong() + ",\"nom\":\"" + nom + "\",\"prenom\":\"Test\",\"dateNaissance\":\"" + naissance + "\"}";
    }

    /** Compare un montant attendu à la valeur JSON, sans tenir compte des zéros finaux. */
    static void egal(String attendu, JsonNode valeur) { assertEquals(0, new BigDecimal(attendu).compareTo(valeur.decimalValue()), "attendu " + attendu + " mais " + valeur); }

    // ---------- règles pures ----------
    @Test
    /** Les catégories d'âge et le calcul des prix (âge, groupe, promotion) sont corrects. */
    void categoriesEtTarifs() {
        LocalDate d = LocalDate.of(2030, 6, 1);
        assertEquals(Categorie.BEBE, Categorie.pour(LocalDate.of(2029, 1, 1), d));
        assertEquals(Categorie.ENFANT, Categorie.pour(LocalDate.of(2020, 1, 1), d));
        assertEquals(Categorie.JEUNE, Categorie.pour(LocalDate.of(2010, 1, 1), d));
        assertEquals(Categorie.SENIOR, Categorie.pour(LocalDate.of(1960, 1, 1), d));
        assertEquals(new BigDecimal("67.50"), Tarif.prix(new BigDecimal("100"), Categorie.JEUNE, 10));
        assertEquals(new BigDecimal("40.50"), Tarif.prix(new BigDecimal("100"), Categorie.ADULTE, 10, 55));
        assertEquals(10, Tarif.remiseGroupePourcent(12));
    }

    // ---------- accès ----------
    @Test
    /** Les routes publiques, connectées et administrateur sont bien protégées (401, 403) et l'inscription refuse les doublons. */
    void controleDesAcces() throws Exception {
        LocalDateTime dep = LocalDateTime.now().plusDays(10);
        String vol = "{\"compagnie\":\"AF\",\"numeroVol\":\"X1\",\"origine\":\"A\",\"destination\":\"B\",\"dateDepart\":\"" + dep + "\",\"dateArrivee\":\"" + dep.plusHours(1) + "\",\"capacite\":10,\"prix\":50}";
        envoyer(post("/api/vols"), null, vol, 401);
        envoyer(post("/api/vols"), client().jeton(), vol, 403);
        envoyer(post("/api/vols"), admin(), vol, 201);
        envoyer(get("/api/vols/recherche"), null, null, 200);            // recherche publique
        envoyer(get("/api/catalogue"), null, null, 200);
        envoyer(post("/api/reservations"), null, "{\"volId\":1,\"adultes\":1,\"enfants\":0,\"bebes\":0}", 401);
        envoyer(get("/api/admin/stats"), client().jeton(), null, 403);
        envoyer(get("/api/admin/stats"), admin(), null, 200);
        envoyer(post("/api/auth/login"), null, "{\"identifiant\":\"admin\",\"motDePasse\":\"mauvais\"}", 401);
        client();
        String email = "doublon@test.be";
        String reg = "{\"email\":\"" + email + "\",\"motDePasse\":\"motdepasse1\",\"nom\":\"N\",\"prenom\":\"P\",\"telephone\":\"\",\"dateNaissance\":\"1990-01-01\"}";
        envoyer(post("/api/auth/inscription"), null, reg, 201);
        envoyer(post("/api/auth/inscription"), null, reg, 409);
        envoyer(post("/api/auth/inscription"), null, reg.replace("motdepasse1", "court"), 400);
    }

    // ---------- recherche ----------
    @Test
    /** La recherche est publique et filtre les vols sans assez de places. */
    void recherchePubliqueFiltrePlacesEtVilles() throws Exception {
        String a = admin();
        LocalDateTime dep = LocalDateTime.now().plusDays(20);
        vol(a, "R1", 4, 100, dep);
        JsonNode r = lire(envoyer(get("/api/vols/recherche?origine=bruxelles&destination=paris&adultes=2"), null, null, 200));
        assertTrue(r.size() >= 1);
        r = lire(envoyer(get("/api/vols/recherche?origine=bruxelles&destination=paris&adultes=30"), null, null, 200));
        assertEquals(0, r.size());   // pas assez de places
        assertTrue(lire(envoyer(get("/api/vols/villes"), null, null, 200)).toString().contains("Bruxelles"));
    }

    // ---------- parcours complet ----------
    @Test
    /** Parcours complet : réservation, passagers, sièges, bagages, assurance, paiement, options ajoutées, modification (+10 %), annulation avec remboursement. */
    void parcoursCompletReservationPaiementModificationAnnulation() throws Exception {
        String a = admin();
        Client c = client();
        LocalDateTime dep = LocalDateTime.now().plusDays(10).withHour(10).withMinute(0);
        long v1 = vol(a, "P1", 30, 100, dep);
        long v2 = vol(a, "P2", 30, 200, dep.plusDays(2));

        JsonNode r = reserver(c, v1, 1, 1, 1);
        long id = r.get("id").asLong();
        assertEquals("EN_ATTENTE", r.get("statut").asText());
        assertEquals(6, r.get("reference").asText().length());
        assertEquals(3, r.get("passagers").size());
        assertEquals("Dupont", r.get("passagers").get(0).get("nom").asText());     // pré-rempli avec le profil

        // un bébé ne peut pas être déclaré adulte, et l'âge doit correspondre au type
        JsonNode ps = r.get("passagers");
        String naissEnfant = LocalDate.now().minusYears(8).toString(), naissBebe = LocalDate.now().minusMonths(6).toString();
        envoyer(put("/api/reservations/" + id + "/passagers"), c.jeton(), "{\"passagers\":[" + identite(ps.get(1), "Petit", "1990-01-01") + "]}", 409);
        envoyer(put("/api/reservations/" + id + "/passagers"), c.jeton(), "{\"passagers\":[" + identite(ps.get(0), "Dupont", "1990-05-10") + ","
                + identite(ps.get(1), "Dupont", naissEnfant) + "," + identite(ps.get(2), "Dupont", naissBebe) + "]}", 200);

        // sièges, bagages, options, assurance
        long adulte = ps.get(0).get("id").asLong(), enfant = ps.get(1).get("id").asLong(), bebe = ps.get(2).get("id").asLong();
        String opts = "{\"assurance\":true,\"passagers\":[{\"id\":" + adulte + ",\"siege\":\"1A\",\"bagage\":\"SOUTE_20KG\",\"prioritaire\":true,\"repas\":false},"
                + "{\"id\":" + enfant + ",\"siege\":\"3A\",\"bagage\":\"AUCUN\",\"prioritaire\":false,\"repas\":false},"
                + "{\"id\":" + bebe + ",\"siege\":null,\"bagage\":\"AUCUN\",\"prioritaire\":false,\"repas\":false}]}";
        JsonNode m = lire(envoyer(put("/api/reservations/" + id + "/options"), c.jeton(), opts, 200));
        egal("160", m.get("totaux").get("billets"));    // 100 + 50 + 10
        egal("50", m.get("totaux").get("sieges"));      // 35 premium + 15 avant
        egal("25", m.get("totaux").get("bagages"));
        egal("7", m.get("totaux").get("options"));
        egal("19.80", m.get("totaux").get("assurance")); // 2 passagers assurés (pas le bébé)
        egal("261.80", m.get("totaux").get("total"));

        // erreurs : bébé avec siège, enfant en sortie de secours, siège inexistant
        envoyer(put("/api/reservations/" + id + "/options"), c.jeton(), opts.replace("\"id\":" + bebe + ",\"siege\":null", "\"id\":" + bebe + ",\"siege\":\"5A\""), 409);
        envoyer(put("/api/reservations/" + id + "/options"), c.jeton(), opts.replace("\"siege\":\"3A\"", "\"siege\":\"11A\""), 409);
        envoyer(put("/api/reservations/" + id + "/options"), c.jeton(), opts.replace("\"siege\":\"3A\"", "\"siege\":\"99Z\""), 409);

        // le siège 1A est retenu : un autre client ne peut pas le prendre
        Client autre = client();
        JsonNode r2 = reserver(autre, v1, 1, 0, 0);
        long p2 = r2.get("passagers").get(0).get("id").asLong();
        envoyer(put("/api/reservations/" + r2.get("id").asLong() + "/options"), autre.jeton(),
                "{\"assurance\":false,\"passagers\":[{\"id\":" + p2 + ",\"siege\":\"1A\",\"bagage\":\"AUCUN\"}]}", 409);
        assertFalse(lire(envoyer(get("/api/vols/" + v1 + "/sieges"), null, null, 200)).get("plan").get(0).get("sieges").get(0).get("libre").asBoolean());
        // confidentialité : une réservation n'est pas visible par un autre compte
        envoyer(get("/api/reservations/" + id), autre.jeton(), null, 404);

        // paiement fictif : carte refusée puis acceptée
        envoyer(post("/api/reservations/" + id + "/paiement"), c.jeton(), REFUSEE, 409);
        envoyer(post("/api/reservations/" + id + "/paiement"), c.jeton(), "{\"numeroCarte\":\"1234\",\"titulaire\":\"X\",\"expiration\":\"12/40\",\"cvv\":\"123\"}", 409);
        JsonNode payee = lire(envoyer(post("/api/reservations/" + id + "/paiement"), c.jeton(), VISA, 200));
        assertEquals("CONFIRMEE", payee.get("statut").asText());
        egal("261.80", payee.get("totaux").get("paye"));
        egal("0", payee.get("totaux").get("solde"));
        assertEquals("4242", payee.get("paiements").get(0).get("carteFin").asText());
        assertFalse(payee.toString().contains("4242424242424242"));     // jamais le numéro complet
        assertTrue(lire(envoyer(get("/api/auth/me"), c.jeton(), null, 200)).get("carte").get("fin").asText().equals("4242"));

        // option ajoutée après paiement : solde à payer, réglé avec la carte enregistrée
        JsonNode plus = lire(envoyer(put("/api/reservations/" + id + "/options"), c.jeton(), opts.replace("\"id\":" + adulte + ",\"siege\":\"1A\",\"bagage\":\"SOUTE_20KG\",\"prioritaire\":true,\"repas\":false",
                "\"id\":" + adulte + ",\"siege\":\"1A\",\"bagage\":\"SOUTE_20KG\",\"prioritaire\":true,\"repas\":true"), 200));
        egal("9", plus.get("totaux").get("solde"));
        assertEquals("CONFIRMEE", plus.get("statut").asText());
        JsonNode reglee = lire(envoyer(post("/api/reservations/" + id + "/paiement"), c.jeton(), ENREGISTREE, 200));
        egal("0", reglee.get("totaux").get("solde"));
        envoyer(post("/api/reservations/" + id + "/paiement"), c.jeton(), ENREGISTREE, 409);   // rien à payer

        // modification du vol : frais 10 % du prix des billets + différence de prix
        JsonNode ap = lire(envoyer(get("/api/reservations/" + id + "/modification?nouveauVolId=" + v2), c.jeton(), null, 200));
        egal("160", ap.get("ancienBillets"));
        egal("320", ap.get("nouveauBillets"));
        egal("16", ap.get("frais"));                                   // 10 % de 160
        egal("160", ap.get("difference"));
        egal("176", ap.get("aPayer"));
        envoyer(get("/api/reservations/" + id + "/modification?nouveauVolId=" + v1), c.jeton(), null, 409);   // même vol
        JsonNode modif = lire(envoyer(post("/api/reservations/" + id + "/modification"), c.jeton(),
                "{\"nouveauVolId\":" + v2 + ",\"paiement\":" + ENREGISTREE + "}", 200));
        assertEquals(v2, modif.get("vol").get("id").asLong());
        egal("16", modif.get("totaux").get("frais"));
        egal("0", modif.get("totaux").get("solde"));
        assertEquals("1A", modif.get("passagers").get(0).get("siege").asText());   // siège conservé car libre

        // enregistrement fermé : le vol est dans 12 jours
        envoyer(post("/api/reservations/" + id + "/enregistrement"), c.jeton(), null, 409);

        // annulation avec assurance : tout est remboursé
        JsonNode annulee = lire(envoyer(post("/api/reservations/" + id + "/annuler"), c.jeton(), null, 200));
        assertEquals("ANNULEE", annulee.get("statut").asText());
        egal("0", annulee.get("totaux").get("paye"));
        assertEquals(0, lire(envoyer(get("/api/vols/" + v2 + "/sieges"), null, null, 200)).get("plan").get(0).get("sieges").get(0).get("libre").asBoolean() ? 0 : 1);
    }

    @Test
    /** Sans assurance annulation, un billet annulé n'est pas remboursé. */
    void annulationSansAssuranceNEstPasRemboursee() throws Exception {
        String a = admin();
        Client c = client();
        long v = vol(a, "S1", 12, 100, LocalDateTime.now().plusDays(5));
        JsonNode r = reserver(c, v, 1, 0, 0);
        long id = r.get("id").asLong();
        envoyer(put("/api/reservations/" + id + "/passagers"), c.jeton(), "{\"passagers\":[" + identite(r.get("passagers").get(0), "Dupont", "1990-05-10") + "]}", 200);
        envoyer(post("/api/reservations/" + id + "/paiement"), c.jeton(), VISA, 200);
        JsonNode x = lire(envoyer(post("/api/reservations/" + id + "/annuler"), c.jeton(), null, 200));
        egal("100", x.get("totaux").get("paye"));
        envoyer(post("/api/reservations/" + id + "/annuler"), c.jeton(), null, 409);
    }

    // ---------- enregistrement en ligne ----------
    @Test
    /** L'enregistrement en ligne attribue un siège gratuit et produit la carte d'embarquement. */
    void enregistrementEnLigneAttribueUnSiegeGratuit() throws Exception {
        String a = admin();
        Client c = client();
        long v = vol(a, "C1", 30, 100, LocalDateTime.now().plusHours(30));
        JsonNode r = reserver(c, v, 1, 0, 0);
        long id = r.get("id").asLong();
        envoyer(post("/api/reservations/" + id + "/enregistrement"), c.jeton(), null, 409);   // pas encore payé
        envoyer(put("/api/reservations/" + id + "/passagers"), c.jeton(), "{\"passagers\":[" + identite(r.get("passagers").get(0), "Dupont", "1990-05-10") + "]}", 200);
        envoyer(post("/api/reservations/" + id + "/paiement"), c.jeton(), VISA, 200);
        JsonNode ci = lire(envoyer(post("/api/reservations/" + id + "/enregistrement"), c.jeton(), null, 200));
        assertTrue(ci.get("passagers").get(0).get("enregistre").asBoolean());
        assertFalse(ci.get("passagers").get(0).get("siege").isNull());
        egal("0", ci.get("passagers").get(0).get("siegePrix"));
        assertTrue(ci.get("porte").asText().startsWith("B"));
    }

    // ---------- capacité, groupes, promotions ----------
    @Test
    /** La remise de groupe s'applique dès 5 passagers et la capacité est respectée. */
    void capaciteEtRemiseDeGroupe() throws Exception {
        String a = admin();
        Client c = client();
        long v = vol(a, "G1", 6, 100, LocalDateTime.now().plusDays(7));
        JsonNode g = reserver(c, v, 5, 0, 0);
        egal("95", g.get("passagers").get(0).get("prixBillet"));        // 5 % dès 5 passagers
        assertEquals(5, g.get("remiseGroupe").asInt());
        envoyer(post("/api/reservations"), client().jeton(), "{\"volId\":" + v + ",\"adultes\":2,\"enfants\":0,\"bebes\":0}", 409);   // une seule place restante
        envoyer(post("/api/reservations"), c.jeton(), "{\"volId\":" + v + ",\"adultes\":0,\"enfants\":1,\"bebes\":0}", 409);          // au moins un adulte
    }

    @Test
    /** Les codes promo et les promotions automatiques s'appliquent (la meilleure est retenue). */
    void promotionsAutomatiquesEtCodes() throws Exception {
        String a = admin();
        Client c = client();
        long v = vol(a, "PR1", 20, 100, LocalDateTime.now().plusDays(9));
        String auj = LocalDate.now().toString(), fin = LocalDate.now().plusDays(30).toString();
        String promo = "{\"code\":\"ETE20\",\"description\":\"Été\",\"pourcentage\":20,\"dateDebut\":\"" + auj + "\",\"dateFin\":\"" + fin + "\",\"automatique\":false,\"volId\":" + v + ",\"actif\":true}";
        envoyer(post("/api/promotions"), a, promo, 201);
        envoyer(post("/api/promotions"), a, promo.replace("ETE20", "ete20"), 409);
        envoyer(post("/api/reservations"), c.jeton(), "{\"volId\":" + v + ",\"adultes\":1,\"enfants\":0,\"bebes\":0,\"codePromo\":\"FAUX\"}", 409);
        JsonNode r = lire(envoyer(post("/api/reservations"), c.jeton(), "{\"volId\":" + v + ",\"adultes\":1,\"enfants\":0,\"bebes\":0,\"codePromo\":\"ete20\"}", 201));
        egal("80", r.get("passagers").get(0).get("prixBillet"));
        envoyer(post("/api/promotions"), a, promo.replace("ETE20", "AUTO50").replace("\"pourcentage\":20", "\"pourcentage\":50").replace("\"automatique\":false", "\"automatique\":true"), 201);
        JsonNode vv = lire(envoyer(get("/api/vols/" + v), null, null, 200));
        assertEquals(50, vv.get("promoPourcent").asInt());
        egal("50", vv.get("prixPromo"));
    }

    @Test
    /** Annuler un vol rembourse ses passagers et le rend non réservable. */
    void annulerUnVolRembourseLesReservations() throws Exception {
        String a = admin();
        Client c = client();
        long v = vol(a, "AN1", 20, 100, LocalDateTime.now().plusDays(9));
        JsonNode r = reserver(c, v, 1, 0, 0);
        long id = r.get("id").asLong();
        envoyer(put("/api/reservations/" + id + "/passagers"), c.jeton(), "{\"passagers\":[" + identite(r.get("passagers").get(0), "Dupont", "1990-05-10") + "]}", 200);
        envoyer(post("/api/reservations/" + id + "/paiement"), c.jeton(), VISA, 200);
        envoyer(delete("/api/vols/" + v), a, null, 409);                 // a des réservations
        envoyer(post("/api/vols/" + v + "/annuler"), a, null, 200);
        JsonNode apres = lire(envoyer(get("/api/reservations/" + id), c.jeton(), null, 200));
        assertEquals("ANNULEE", apres.get("statut").asText());
        egal("0", apres.get("totaux").get("paye"));                       // remboursé car annulé par la compagnie
        envoyer(post("/api/reservations"), c.jeton(), "{\"volId\":" + v + ",\"adultes\":1,\"enfants\":0,\"bebes\":0}", 409);   // plus réservable
        assertTrue(lire(envoyer(get("/api/admin/reservations?q=" + r.get("reference").asText()), a, null, 200)).size() == 1);
    }

    @Test
    /** Le chatbot répond aux questions courantes et reconnaît les villes comme mots entiers. */
    void chatbot() throws Exception {
        String a = admin();
        vol(a, "CH1", 20, 100, LocalDateTime.now().plusDays(9));
        for (String q : new String[]{"Bonjour", "quels bagages ?", "sièges premium", "comment modifier mon vol", "annuler et remboursement", "enregistrement", "blabla zzz"}) {
            JsonNode r = lire(envoyer(post("/api/chat"), null, "{\"message\":\"" + q + "\"}", 200));
            assertFalse(r.get("reponse").asText().isBlank(), q);
        }
        String vers = lire(envoyer(post("/api/chat"), null, "{\"message\":\"vol vers Paris\"}", 200)).get("reponse").asText();
        assertTrue(vers.contains("Bruxelles → Paris"), vers);
        assertTrue(lire(envoyer(post("/api/chat"), null, "{\"message\":\"modifier mon vol\"}", 200)).get("reponse").asText().contains("10 %"));
        envoyer(post("/api/chat"), null, "{\"message\":\" \"}", 400);
    }

    /** Le bouton « Insérer les données » : réservé à l'admin, et sans doublon même si on clique plusieurs fois. */
    @Test
    void donneesDeDemonstrationSansDoublons() throws Exception {
        envoyer(post("/api/admin/donnees"), null, null, 401);
        envoyer(post("/api/admin/donnees"), client().jeton(), null, 403);
        String a = admin();

        JsonNode premier = lire(envoyer(post("/api/admin/donnees"), a, null, 200));
        assertEquals(24, premier.get("volsAjoutes").asInt() + premier.get("volsExistants").asInt());
        assertEquals(5, premier.get("promotionsAjoutees").asInt() + premier.get("promotionsExistantes").asInt());
        assertEquals(3, premier.get("clientsAjoutes").asInt() + premier.get("clientsExistants").asInt());
        assertTrue(premier.get("reservationsAjoutees").asInt() >= 2, "des réservations de démonstration sont créées");

        long vols = lire(envoyer(get("/api/vols"), null, null, 200)).size();
        long promos = lire(envoyer(get("/api/admin/promotions"), a, null, 200)).size();
        long reservations = lire(envoyer(get("/api/admin/reservations"), a, null, 200)).size();

        JsonNode second = lire(envoyer(post("/api/admin/donnees"), a, null, 200));
        assertEquals(0, second.get("volsAjoutes").asInt());
        assertEquals(24, second.get("volsExistants").asInt());
        assertEquals(0, second.get("promotionsAjoutees").asInt());
        assertEquals(0, second.get("clientsAjoutes").asInt());
        assertEquals(0, second.get("reservationsAjoutees").asInt());
        // aucun doublon en base
        assertEquals(vols, lire(envoyer(get("/api/vols"), null, null, 200)).size());
        assertEquals(promos, lire(envoyer(get("/api/admin/promotions"), a, null, 200)).size());
        assertEquals(reservations, lire(envoyer(get("/api/admin/reservations"), a, null, 200)).size());

        // un compte de démonstration peut se connecter et voit sa réservation payée
        JsonNode sara = lire(envoyer(post("/api/auth/login"), null, "{\"identifiant\":\"sara.benali@demo.be\",\"motDePasse\":\"demo12345\"}", 200));
        JsonNode mes = lire(envoyer(get("/api/reservations"), sara.get("token").asText(), null, 200));
        assertEquals(1, mes.size());
        assertEquals("CONFIRMEE", mes.get(0).get("statut").asText());
        assertEquals(3, mes.get(0).get("passagers").size());
    }
}
