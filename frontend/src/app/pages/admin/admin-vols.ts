import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { DatePicker } from 'primeng/datepicker';
import { InputNumber } from 'primeng/inputnumber';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { Tag } from 'primeng/tag';
import { Tooltip } from 'primeng/tooltip';
import { Api, Notifier } from '../../api.service';
import { CATEGORIES, Manifeste, Vol, VolRequest } from '../../models';
import { AdminMenu } from '../../shared/admin-menu';
import { Confirmer } from '../../shared/confirmer';
import { versDate, versIsoDate, versIsoDateHeure } from '../../shared/dates';

/** Formulaire d'un vol (les dates sont des objets Date pour le calendrier PrimeNG). */
interface FormVol { compagnie: string; numeroVol: string; origine: string; destination: string; dateDepart: Date | null; dateArrivee: Date | null; capacite: number; prix: number; }

/** Crée un formulaire de vol vide. @returns un formulaire avec des valeurs par défaut */
const vide = (): FormVol => ({ compagnie: '', numeroVol: '', origine: '', destination: '', dateDepart: null, dateArrivee: null, capacite: 150, prix: 100 });

/** Administration des vols : ajout, modification, annulation, suppression et liste des passagers par catégorie d'âge. */
@Component({
  selector: 'app-admin-vols',
  imports: [FormsModule, DatePipe, CurrencyPipe, AdminMenu, Button, Card, DatePicker, InputNumber, InputText, Select, TableModule, Tag, Tooltip],
  template: `
    <app-admin-menu />
    <p-card [header]="editId() ? 'Modifier le vol' : 'Ajouter un vol'" class="mb-4">
      <form class="formulaire-ligne" (ngSubmit)="enregistrer()">
        <div class="champ"><label for="compagnie">Compagnie</label><input pInputText id="compagnie" name="c" [(ngModel)]="form.compagnie" required /></div>
        <div class="champ"><label for="numero">N° de vol</label><input pInputText id="numero" name="n" [(ngModel)]="form.numeroVol" required /></div>
        <div class="champ"><label for="origine">Origine</label><input pInputText id="origine" name="o" [(ngModel)]="form.origine" required /></div>
        <div class="champ"><label for="destination">Destination</label><input pInputText id="destination" name="d" [(ngModel)]="form.destination" required /></div>
        <div class="champ"><label for="depart">Départ</label>
          <p-datepicker inputId="depart" name="dd" [(ngModel)]="form.dateDepart" [showTime]="true" hourFormat="24" dateFormat="dd/mm/yy" [showIcon]="true" iconDisplay="input" appendTo="body" /></div>
        <div class="champ"><label for="arrivee">Arrivée</label>
          <p-datepicker inputId="arrivee" name="da" [(ngModel)]="form.dateArrivee" [showTime]="true" hourFormat="24" dateFormat="dd/mm/yy" [showIcon]="true" iconDisplay="input" appendTo="body" /></div>
        <div class="champ"><label for="places">Places</label><p-inputnumber inputId="places" name="p" [(ngModel)]="form.capacite" [min]="1" [showButtons]="true" /></div>
        <div class="champ"><label for="prix">Prix adulte</label><p-inputnumber inputId="prix" name="x" [(ngModel)]="form.prix" mode="currency" currency="EUR" locale="fr-FR" [min]="0.01" /></div>
        <p-button type="submit" [label]="editId() ? 'Enregistrer' : 'Ajouter'" [icon]="editId() ? 'pi pi-check' : 'pi pi-plus'" />
        @if (editId()) { <p-button type="button" label="Annuler" severity="secondary" [outlined]="true" (onClick)="reset()" /> }
      </form>
    </p-card>

    <p-card header="Vols">
      <div class="filtres">
        <input pInputText placeholder="Origine" [(ngModel)]="f.origine" (ngModelChange)="charger()" />
        <input pInputText placeholder="Destination" [(ngModel)]="f.destination" (ngModelChange)="charger()" />
        <p-datepicker [(ngModel)]="dateFiltre" (ngModelChange)="charger()" dateFormat="dd/mm/yy" [showIcon]="true" iconDisplay="input" [showClear]="true" placeholder="Date" appendTo="body" />
      </div>
      <p-table [value]="vols()" [paginator]="vols().length > 8" [rows]="8" styleClass="p-datatable-sm" [rowHover]="true">
        <ng-template #header><tr><th>Vol</th><th>Trajet</th><th>Départ</th><th>Prix</th><th>Places</th><th>Statut</th><th></th></tr></ng-template>
        <ng-template #body let-v>
          <tr>
            <td>{{ v.compagnie }} {{ v.numeroVol }}</td><td>{{ v.origine }} → {{ v.destination }}</td>
            <td>{{ v.dateDepart | date: 'dd/MM/yy HH:mm' }}</td>
            <td>{{ v.prix | currency: 'EUR' }} @if (v.promoPourcent > 0) { <p-tag [value]="'-' + v.promoPourcent + ' %'" severity="warn" /> }</td>
            <td>{{ v.placesRestantes }} / {{ v.capacite }}</td>
            <td><p-tag [value]="v.statut === 'ANNULE' ? 'Annulé' : 'Programmé'" [severity]="v.statut === 'ANNULE' ? 'danger' : 'success'" /></td>
            <td class="actions">
              <p-button icon="pi pi-users" size="small" severity="secondary" [outlined]="true" pTooltip="Passagers" (onClick)="voirPassagers(v)" ariaLabel="Passagers" />
              <p-button icon="pi pi-pencil" size="small" severity="secondary" [outlined]="true" (onClick)="editer(v)" ariaLabel="Modifier" />
              @if (v.statut === 'PROGRAMME') { <p-button icon="pi pi-ban" size="small" severity="warn" [outlined]="true" (onClick)="annuler(v)" ariaLabel="Annuler le vol" /> }
              <p-button icon="pi pi-trash" size="small" severity="danger" [outlined]="true" (onClick)="supprimer(v)" ariaLabel="Supprimer" />
            </td>
          </tr>
        </ng-template>
        <ng-template #emptymessage><tr><td colspan="7">Aucun vol.</td></tr></ng-template>
      </p-table>
    </p-card>

    @if (manifesteVol(); as mv) {
      <p-card [header]="'Passagers du vol ' + mv.numeroVol + ' (' + mv.origine + ' → ' + mv.destination + ')'" class="mt-4">
        <div class="filtres">
          <p-select [options]="categories" optionLabel="libelle" optionValue="code" [(ngModel)]="categorie" (ngModelChange)="chargerManifeste()" placeholder="Toutes les catégories" [showClear]="true" appendTo="body" />
          <p-button label="Voir les jeunes" icon="pi pi-filter" severity="secondary" [outlined]="true" (onClick)="categorie = 'JEUNE'; chargerManifeste()" />
        </div>
        <p-table [value]="manifeste()" styleClass="p-datatable-sm">
          <ng-template #header><tr><th>Réservation</th><th>Passager</th><th>Catégorie</th><th>Siège</th><th>Bagage</th></tr></ng-template>
          <ng-template #body let-m><tr><td>{{ m.reference }}</td><td>{{ m.passager }}</td><td><p-tag [value]="m.categorie" severity="info" /></td><td>{{ m.siege ?? '—' }}</td><td>{{ m.bagage }}</td></tr></ng-template>
          <ng-template #emptymessage><tr><td colspan="5">Aucun passager.</td></tr></ng-template>
        </p-table>
      </p-card>
    }
  `,
})
export class AdminVols {
  private api = inject(Api);
  private notifier = inject(Notifier);
  private confirmer = inject(Confirmer);
  /** Vols affichés. */
  protected vols = signal<Vol[]>([]);
  /** Passagers du vol sélectionné. */
  protected manifeste = signal<Manifeste[]>([]);
  protected manifesteVol = signal<Vol | null>(null);
  /** Identifiant du vol en cours de modification (null = ajout). */
  protected editId = signal<number | null>(null);
  protected categories = CATEGORIES;
  protected categorie: string | null = null;
  protected form: FormVol = vide();
  protected f = { origine: '', destination: '' };
  /** Filtre par date de départ. */
  protected dateFiltre: Date | null = null;

  /** Charge la liste des vols. */
  constructor() { this.charger(); }

  /** Recharge les vols selon les filtres (origine, destination, date). */
  protected charger(): void { this.api.vols({ ...this.f, date: versIsoDate(this.dateFiltre) || undefined }).subscribe((v) => this.vols.set(v)); }

  /** Ajoute ou modifie le vol du formulaire. */
  protected enregistrer(): void {
    const id = this.editId();
    const corps: VolRequest = { compagnie: this.form.compagnie, numeroVol: this.form.numeroVol, origine: this.form.origine, destination: this.form.destination,
      dateDepart: versIsoDateHeure(this.form.dateDepart), dateArrivee: versIsoDateHeure(this.form.dateArrivee), capacite: this.form.capacite, prix: this.form.prix };
    (id ? this.api.modifierVolAdmin(id, corps) : this.api.creerVol(corps)).subscribe(() => {
      this.notifier.ok(id ? 'Vol modifié avec succès' : 'Vol ajouté avec succès'); this.reset(); this.charger();
    });
  }

  /** Charge un vol dans le formulaire pour le modifier. @param v le vol */
  protected editer(v: Vol): void {
    this.editId.set(v.id);
    this.form = { compagnie: v.compagnie, numeroVol: v.numeroVol, origine: v.origine, destination: v.destination,
      dateDepart: versDate(v.dateDepart), dateArrivee: versDate(v.dateArrivee), capacite: v.capacite, prix: v.prix };
    scrollTo({ top: 0, behavior: 'smooth' });
  }

  /** Vide le formulaire et repasse en mode ajout. */
  protected reset(): void { this.editId.set(null); this.form = vide(); }

  /** Annule un vol (toutes ses réservations sont remboursées) après confirmation. @param v le vol */
  protected async annuler(v: Vol): Promise<void> {
    if (!(await this.confirmer.demander(`Annuler le vol ${v.numeroVol} ? Toutes ses réservations seront annulées et remboursées.`, 'Annulation du vol', true))) return;
    this.api.annulerVol(v.id).subscribe(() => { this.notifier.ok('Vol annulé, passagers remboursés'); this.charger(); });
  }

  /** Supprime un vol sans réservation après confirmation. @param v le vol */
  protected async supprimer(v: Vol): Promise<void> {
    if (!(await this.confirmer.demander(`Supprimer le vol ${v.numeroVol} ?`, 'Suppression', true))) return;
    this.api.supprimerVol(v.id).subscribe(() => { this.notifier.ok('Vol supprimé'); this.charger(); });
  }

  /** Affiche les passagers d'un vol. @param v le vol */
  protected voirPassagers(v: Vol): void { this.manifesteVol.set(v); this.categorie = null; this.chargerManifeste(); }

  /** Recharge les passagers du vol sélectionné selon la catégorie choisie. */
  protected chargerManifeste(): void { const v = this.manifesteVol(); if (v) this.api.manifeste(v.id, this.categorie ?? undefined).subscribe((m) => this.manifeste.set(m)); }
}
