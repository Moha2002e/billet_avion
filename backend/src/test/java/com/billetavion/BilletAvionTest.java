package com.billetavion;

import com.billetavion.model.Categorie;
import com.billetavion.service.Tarif;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import java.math.BigDecimal;
import java.time.LocalDate;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = "spring.datasource.url=jdbc:h2:mem:test;DB_CLOSE_DELAY=-1")
class BilletAvionTest {
    @Autowired MockMvc mvc;

    @Test
    void categoriesParAge() {
        LocalDate d = LocalDate.of(2030, 6, 1);
        assertEquals(Categorie.BEBE, Categorie.pour(LocalDate.of(2029, 1, 1), d));
        assertEquals(Categorie.ENFANT, Categorie.pour(LocalDate.of(2020, 1, 1), d));
        assertEquals(Categorie.JEUNE, Categorie.pour(LocalDate.of(2010, 1, 1), d));
        assertEquals(Categorie.ADULTE, Categorie.pour(LocalDate.of(1990, 1, 1), d));
        assertEquals(Categorie.SENIOR, Categorie.pour(LocalDate.of(1960, 1, 1), d));
    }

    @Test
    void tarifs() {
        assertEquals(new BigDecimal("75.00"), Tarif.prix(new BigDecimal("100"), Categorie.JEUNE, 0));
        assertEquals(new BigDecimal("67.50"), Tarif.prix(new BigDecimal("100"), Categorie.JEUNE, 10));
        assertEquals(0, Tarif.remiseGroupePourcent(4));
        assertEquals(10, Tarif.remiseGroupePourcent(12));
    }

    private long creer(String url, String body) throws Exception {
        String json = mvc.perform(post(url).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        return Long.parseLong(json.replaceAll("^\\{\"id\":(\\d+).*$", "$1"));
    }

    private static final String VOL = """
        {"compagnie":"AF","numeroVol":"AF1","origine":"BRU","destination":"CDG",
         "dateDepart":"2040-01-01T10:00:00","dateArrivee":"2040-01-01T11:00:00","capacite":2,"prix":100}""";

    private static String passager(String nom, String naissance, String tel) {
        return "{\"nom\":\"" + nom + "\",\"prenom\":\"P\",\"dateNaissance\":\"" + naissance + "\",\"telephone\":\"" + tel + "\"}";
    }

    @Test
    void scenarioComplet() throws Exception {
        long vol = creer("/api/vols", VOL);
        mvc.perform(post("/api/vols").contentType(MediaType.APPLICATION_JSON)
                .content(VOL.replace("\"destination\":\"CDG\"", "\"destination\":\"bru\"")))
                .andExpect(status().isConflict());
        mvc.perform(post("/api/passagers").contentType(MediaType.APPLICATION_JSON).content(passager("A", "2000-01-01", "12")))
                .andExpect(status().isBadRequest());

        long jeune = creer("/api/passagers", passager("Jeune", "2020-01-01", "0470123456"));   // 20 ans en 2040
        long adulte = creer("/api/passagers", passager("Adulte", "1980-01-01", "0470123457")); // 60 ans
        long autre = creer("/api/passagers", passager("Autre", "1981-01-01", "0470123458"));

        mvc.perform(post("/api/reservations").contentType(MediaType.APPLICATION_JSON)
                .content("{\"passagerId\":" + jeune + ",\"volId\":" + vol + "}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.categorie").value("JEUNE")).andExpect(jsonPath("$.prix").value(75.0));
        mvc.perform(post("/api/reservations").contentType(MediaType.APPLICATION_JSON)   // doublon
                .content("{\"passagerId\":" + jeune + ",\"volId\":" + vol + "}"))
                .andExpect(status().isConflict());
        mvc.perform(post("/api/reservations").contentType(MediaType.APPLICATION_JSON)
                .content("{\"passagerId\":" + adulte + ",\"volId\":" + vol + "}")).andExpect(status().isCreated());
        mvc.perform(post("/api/reservations").contentType(MediaType.APPLICATION_JSON)   // vol complet
                .content("{\"passagerId\":" + autre + ",\"volId\":" + vol + "}"))
                .andExpect(status().isConflict());

        mvc.perform(get("/api/vols/" + vol + "/passagers?categorie=JEUNE"))
                .andExpect(jsonPath("$.length()").value(1)).andExpect(jsonPath("$[0].passagerNom").value("Jeune P"));
        mvc.perform(get("/api/vols/" + vol)).andExpect(jsonPath("$.placesRestantes").value(0));
        mvc.perform(delete("/api/vols/" + vol)).andExpect(status().isConflict());
    }

    @Test
    void voyageGroupe() throws Exception {
        long vol = creer("/api/vols", VOL.replace("\"capacite\":2", "\"capacite\":10"));
        StringBuilder ids = new StringBuilder();
        for (int i = 0; i < 5; i++) {
            long id = creer("/api/passagers", passager("G" + i, "1980-01-01", "04701234" + (10 + i)));
            ids.append(i == 0 ? "" : ",").append(id);
        }
        String body = "{\"nom\":\"Club\",\"responsable\":\"Moi\",\"volId\":" + vol + ",\"passagerIds\":[" + ids + "]}";
        String json = mvc.perform(post("/api/groupes").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.nbPassagers").value(5))
                .andExpect(jsonPath("$.remisePourcent").value(5))
                .andExpect(jsonPath("$.total").value(475.0)).andReturn().getResponse().getContentAsString();
        long groupe = Long.parseLong(json.replaceAll("^\\{\"id\":(\\d+).*$", "$1"));
        long premier = Long.parseLong(ids.toString().split(",")[0]);
        mvc.perform(delete("/api/groupes/" + groupe + "/passagers/" + premier))
                .andExpect(jsonPath("$.nbPassagers").value(4)).andExpect(jsonPath("$.remisePourcent").value(0))
                .andExpect(jsonPath("$.total").value(400.0));
        mvc.perform(post("/api/groupes/" + groupe + "/annuler")).andExpect(jsonPath("$.actif").value(false));
        mvc.perform(get("/api/stats")).andExpect(status().isOk());
    }
}
