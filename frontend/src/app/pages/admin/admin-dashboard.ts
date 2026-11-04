import { CurrencyPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { UIChart } from 'primeng/chart';
import { Message } from 'primeng/message';
import { Api, Notifier } from '../../api.service';
import { CATEGORIES, DonneesResultat, Stats } from '../../models';
import { AdminMenu } from '../../shared/admin-menu';
import { Confirmer } from '../../shared/confirmer';

/** Tableau de bord de l'administrateur : statistiques, graphique par catégorie d'âge, bouton de données de démonstration. */
@Component({
  selector: 'app-admin-dashboard',
  imports: [AdminMenu, CurrencyPipe, Button, Card, UIChart, Message],
  template: `
    <app-admin-menu />
    <div class="entete-page">
      <h2>Tableau de bord</h2>
      <p-button label="Insérer les données de démonstration" icon="pi pi-database" [loading]="insertion()" (onClick)="insererDonnees()" />
    </div>

    @if (resultat(); as r) {
      <p-message severity="success" icon="pi pi-check-circle" class="mb-3" [closable]="true">
        <div>
          <b>Données de démonstration :</b>
          {{ r.volsAjoutes }} vol(s) ajouté(s) ({{ r.volsExistants }} déjà présent(s)) ·
          {{ r.promotionsAjoutees }} promotion(s) ajoutée(s) ({{ r.promotionsExistantes }} déjà présente(s)) ·
          {{ r.clientsAjoutes }} client(s) ajouté(s) ({{ r.clientsExistants }} déjà présent(s)) ·
          {{ r.reservationsAjoutees }} réservation(s) ajoutée(s).
          @if (r.clientsAjoutes > 0) { Comptes de démonstration : <code>sara.benali&#64;demo.be</code>, <code>karim.janssens&#64;demo.be</code>, <code>lea.dubois&#64;demo.be</code> — mot de passe <code>demo12345</code>. }
        </div>
      </p-message>
    }

    @if (stats(); as s) {
      <div class="grille">
        <p-card class="tuile-stat"><i class="pi pi-send"></i><b>{{ s.totalVols }}</b><span>Vols ({{ s.volsAVenir }} à venir)</span></p-card>
        <p-card class="tuile-stat"><i class="pi pi-users"></i><b>{{ s.clients }}</b><span>Clients inscrits</span></p-card>
        <p-card class="tuile-stat"><i class="pi pi-ticket"></i><b>{{ s.reservationsConfirmees }}</b><span>Réservations confirmées</span></p-card>
        <p-card class="tuile-stat"><i class="pi pi-clock"></i><b>{{ s.reservationsEnAttente }}</b><span>En attente de paiement</span></p-card>
        <p-card class="tuile-stat"><i class="pi pi-percentage"></i><b>{{ s.tauxRemplissagePourcent }} %</b><span>Remplissage des vols</span></p-card>
        <p-card class="tuile-stat"><i class="pi pi-euro"></i><b>{{ s.revenuTotal | currency: 'EUR' }}</b><span>Chiffre d'affaires (net des remboursements)</span></p-card>
      </div>
      <p-card header="Passagers (réservations confirmées) par catégorie d'âge" class="mt-4">
        <div class="graphique"><p-chart type="doughnut" [data]="donnees()" [options]="options" /></div>
      </p-card>
    }
  `,
})
export class AdminDashboard {
  private api = inject(Api);
  private notifier = inject(Notifier);
  private confirmer = inject(Confirmer);
  /** Statistiques du tableau de bord. */
  protected stats = signal<Stats | null>(null);
  /** Résultat de la dernière insertion de données de démonstration. */
  protected resultat = signal<DonneesResultat | null>(null);
  /** Vrai pendant l'insertion des données. */
  protected insertion = signal(false);
  /** Options du graphique en anneau. */
  protected options = { plugins: { legend: { position: 'bottom' as const } }, maintainAspectRatio: false };
  /** Données du graphique : nombre de passagers par catégorie d'âge. */
  protected donnees = computed(() => {
    const s = this.stats();
    return {
      labels: CATEGORIES.map((c) => c.libelle),
      datasets: [{ data: CATEGORIES.map((c) => s?.passagersParCategorie[c.code] ?? 0),
        backgroundColor: ['#e91e63', '#f5b301', '#2196f3', '#e07f3c', '#9c27b0'] }],
    };
  });

  /** Charge les statistiques. */
  constructor() { this.charger(); }

  /** Recharge les statistiques depuis le serveur. */
  private charger(): void { this.api.stats().subscribe((s) => this.stats.set(s)); }

  /**
   * Insère les données de démonstration après confirmation. Les données déjà présentes sont ignorées : jamais de doublon.
   */
  protected async insererDonnees(): Promise<void> {
    const ok = await this.confirmer.demander(
      'Insérer les vols, promotions, clients et réservations de démonstration ? Ce qui existe déjà ne sera pas dupliqué.', 'Données de démonstration');
    if (!ok) return;
    this.insertion.set(true);
    this.api.insererDonnees().subscribe({
      next: (r) => {
        this.insertion.set(false); this.resultat.set(r); this.charger();
        const total = r.volsAjoutes + r.promotionsAjoutees + r.clientsAjoutes + r.reservationsAjoutees;
        if (total > 0) this.notifier.ok(`${total} donnée(s) insérée(s)`); else this.notifier.info('Toutes les données de démonstration sont déjà présentes : rien n\'a été ajouté.');
      },
      error: () => this.insertion.set(false),
    });
  }
}
