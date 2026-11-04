import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Tab, TabList, Tabs } from 'primeng/tabs';

/** Menu de l'espace administrateur : onglets PrimeNG vers chaque page d'administration. */
@Component({
  selector: 'app-admin-menu',
  imports: [Tabs, TabList, Tab],
  template: `
    <p-tabs [value]="actif" (valueChange)="aller($event)" class="mb-3">
      <p-tablist>
        @for (o of onglets; track o.route) { <p-tab [value]="o.route"><i [class]="o.icone"></i>&nbsp;{{ o.libelle }}</p-tab> }
      </p-tablist>
    </p-tabs>
  `,
})
export class AdminMenu {
  private router = inject(Router);
  /** Pages de l'administration. */
  protected onglets = [
    { route: '/admin', libelle: 'Tableau de bord', icone: 'pi pi-chart-bar' },
    { route: '/admin/vols', libelle: 'Vols', icone: 'pi pi-send' },
    { route: '/admin/promotions', libelle: 'Promotions', icone: 'pi pi-tag' },
    { route: '/admin/reservations', libelle: 'Réservations', icone: 'pi pi-ticket' },
  ];
  /** Onglet correspondant à l'adresse actuelle. */
  protected actif = this.router.url.split('?')[0];

  /**
   * Ouvre la page de l'onglet choisi.
   * @param route l'adresse de la page (valeur de l'onglet)
   */
  protected aller(route: string | number | undefined): void { if (typeof route === 'string') this.router.navigateByUrl(route); }
}
