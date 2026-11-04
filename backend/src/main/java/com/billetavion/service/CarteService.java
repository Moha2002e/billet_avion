package com.billetavion.service;

import com.billetavion.model.Utilisateur;
import com.billetavion.web.Dtos.PaiementRequest;
import org.springframework.stereotype.Service;
import java.time.YearMonth;

/**
 * Paiement FICTIF : aucune banque n'est contactée. On valide le format de la carte (Luhn, date, CVV),
 * puis on ne garde que la marque et les 4 derniers chiffres. Le numéro complet et le CVV ne sont jamais stockés.
 * Carte de test acceptée : 4242 4242 4242 4242. Carte de test refusée : 4000 0000 0000 0002.
 */
@Service
public class CarteService {
    /**
     * Carte bancaire validée : marque et 4 derniers chiffres uniquement.
     *
     * @param marque la valeur « marque »
     * @param fin la valeur « fin »
     */
    public record Carte(String marque, String fin) {}

    /**
     * Valide une carte bancaire fictive (Luhn, date, CVV) et « débite » : aucun paiement réel. Seuls la marque et les 4 derniers chiffres sont conservés.
     *
     * @param u le client payeur (pour sa carte enregistrée)
     * @param p la carte saisie ou la demande de carte enregistrée
     * @return la marque et les 4 derniers chiffres
     */
    public Carte debiter(Utilisateur u, PaiementRequest p) {
        if (p.carteEnregistree()) {
            if (u.getCarteFin() == null) throw new Errors.Business("Aucune carte enregistrée sur ce compte");
            return new Carte(u.getCarteMarque(), u.getCarteFin());
        }
        String numero = p.numeroCarte() == null ? "" : p.numeroCarte().replaceAll("[ -]", "");
        if (!numero.matches("\\d{13,19}") || !luhn(numero)) throw new Errors.Business("Numéro de carte invalide");
        if (p.titulaire() == null || p.titulaire().isBlank()) throw new Errors.Business("Nom du titulaire requis");
        YearMonth exp = expiration(p.expiration());
        if (exp.isBefore(YearMonth.now())) throw new Errors.Business("Carte expirée");
        if (p.cvv() == null || !p.cvv().matches("\\d{3,4}")) throw new Errors.Business("Code de sécurité (CVV) invalide");

        String marque = numero.startsWith("4") ? "VISA" : numero.matches("^(5[1-5]|2[2-7]).*") ? "MASTERCARD" : numero.matches("^3[47].*") ? "AMEX" : "CARTE";
        String fin = numero.substring(numero.length() - 4);
        if (fin.equals("0002")) throw new Errors.Business("Paiement refusé par la banque (carte de test)");
        if (p.enregistrer()) {
            u.setCarteMarque(marque); u.setCarteFin(fin);
            u.setCarteTitulaire(p.titulaire().trim()); u.setCarteExpiration(p.expiration().trim());
        }
        return new Carte(marque, fin);
    }

    /**
     * Lit une date d'expiration « MM/AA ».
     *
     * @param s le texte saisi
     * @return le mois d'expiration
     */
    private static YearMonth expiration(String s) {
        if (s == null || !s.trim().matches("(0[1-9]|1[0-2])/(\\d{2})")) throw new Errors.Business("Date d'expiration invalide (MM/AA)");
        String[] m = s.trim().split("/");
        return YearMonth.of(2000 + Integer.parseInt(m[1]), Integer.parseInt(m[0]));
    }

    /**
     * Vérifie la somme de contrôle de Luhn d'un numéro de carte.
     *
     * @param n le numéro de carte (chiffres seuls)
     * @return vrai si le numéro est valide
     */
    static boolean luhn(String n) {
        int somme = 0; boolean double_ = false;
        for (int i = n.length() - 1; i >= 0; i--) {
            int d = n.charAt(i) - '0';
            if (double_) { d *= 2; if (d > 9) d -= 9; }
            somme += d; double_ = !double_;
        }
        return somme % 10 == 0;
    }
}
