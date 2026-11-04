import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { Checkbox } from 'primeng/checkbox';
import { DatePicker } from 'primeng/datepicker';
import { InputNumber } from 'primeng/inputnumber';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { Tag } from 'primeng/tag';
import { Api, Notifier } from '../../api.service';
import { Promotion, PromotionRequest, Vol } from '../../models';
import { AdminMenu } from '../../shared/admin-menu';
import { Confirmer } from '../../shared/confirmer';
import { aujourdhui, versDate, versIsoDate } from '../../shared/dates';

/** Formulaire d'une promotion (dates en objets Date pour le calendrier PrimeNG). */
interface FormPromo { code: string; description: string; pourcentage: number; dateDebut: Date | null; dateFin: Date | null; automatique: boolean; volId: number | null; actif: boolean; }

/** Crée un formulaire de promotion vide (début aujourd'hui, 10 %). @returns le formulaire */
const vide = (): FormPromo => ({ code: '', description: '', pourcentage: 10, dateDebut: aujourdhui(), dateFin: null, automatique: false, volId: null, actif: true });

/** Administration des promotions : ajout, modification, suppression. */
@Component({
  selector: 'app-admin-promotions',
  imports: [FormsModule, DatePipe, AdminMenu, Button, Card, Checkbox, DatePicker, InputNumber, InputText, Select, TableModule, Tag],
  template: `
    <app-admin-menu />
    <p-card [header]="editId() ? 'Modifier la promotion' : 'Ajouter une promotion'" class="mb-4">
      <form class="formulaire-ligne" (ngSubmit)="enregistrer()">
        <div class="champ"><label for="code">Code</label><input pInputText id="code" name="c" [(ngModel)]="form.code" pattern="[A-Za-z0-9_\\-]{3,30}" required /></div>
        <div class="champ"><label for="desc">Description</label><input pInputText id="desc" name="d" [(ngModel)]="form.description" required /></div>
        <div class="champ"><label for="pct">Remise (%)</label><p-inputnumber inputId="pct" name="p" [(ngModel)]="form.pourcentage" [min]="1" [max]="90" suffix=" %" [showButtons]="true" /></div>
        <div class="champ"><label for="debut">Début</label><p-datepicker inputId="debut" name="db" [(ngModel)]="form.dateDebut" dateFormat="dd/mm/yy" [showIcon]="true" iconDisplay="input" appendTo="body" /></div>
        <div class="champ"><label for="fin">Fin</label><p-datepicker inputId="fin" name="df" [(ngModel)]="form.dateFin" dateFormat="dd/mm/yy" [showIcon]="true" iconDisplay="input" appendTo="body" /></div>
        <div class="champ"><label for="vol">Vol concerné</label>
          <p-select inputId="vol" name="v" [(ngModel)]="form.volId" [options]="optionsVols()" optionLabel="libelle" optionValue="id" [showClear]="true" placeholder="Tous les vols" appendTo="body" /></div>
        <div class="ligne-choix"><p-checkbox inputId="auto" name="a" [(ngModel)]="form.automatique" [binary]="true" /><label for="auto">Automatique (sans code)</label></div>
        <div class="ligne-choix"><p-checkbox inputId="actif" name="ac" [(ngModel)]="form.actif" [binary]="true" /><label for="actif">Active</label></div>
        <p-button type="submit" [label]="editId() ? 'Enregistrer' : 'Ajouter'" [icon]="editId() ? 'pi pi-check' : 'pi pi-plus'" />
        @if (editId()) { <p-button type="button" label="Annuler" severity="secondary" [outlined]="true" (onClick)="reset()" /> }
      </form>
    </p-card>

    <p-card header="Toutes les promotions">
      <p-table [value]="promotions()" styleClass="p-datatable-sm" [rowHover]="true">
        <ng-template #header><tr><th>Code</th><th>Description</th><th>Remise</th><th>Période</th><th>Vol</th><th>Type</th><th>Statut</th><th></th></tr></ng-template>
        <ng-template #body let-p>
          <tr><td><b>{{ p.code }}</b></td><td>{{ p.description }}</td><td>-{{ p.pourcentage }} %</td>
            <td>{{ p.dateDebut | date: 'dd/MM/yy' }} → {{ p.dateFin | date: 'dd/MM/yy' }}</td><td>{{ p.volLibelle ?? 'Tous les vols' }}</td>
            <td>{{ p.automatique ? 'Automatique' : 'Sur code' }}</td>
            <td><p-tag [value]="p.enCours ? 'En cours' : 'Inactive'" [severity]="p.enCours ? 'success' : 'danger'" /></td>
            <td class="actions">
              <p-button icon="pi pi-pencil" size="small" severity="secondary" [outlined]="true" (onClick)="editer(p)" ariaLabel="Modifier" />
              <p-button icon="pi pi-trash" size="small" severity="danger" [outlined]="true" (onClick)="supprimer(p)" ariaLabel="Supprimer" />
            </td></tr>
        </ng-template>
        <ng-template #emptymessage><tr><td colspan="8">Aucune promotion.</td></tr></ng-template>
      </p-table>
    </p-card>
  `,
})
export class AdminPromotions {
  private api = inject(Api);
  private notifier = inject(Notifier);
  private confirmer = inject(Confirmer);
  /** Promotions affichées. */
  protected promotions = signal<Promotion[]>([]);
  /** Vols proposés pour restreindre une promotion. */
  protected vols = signal<Vol[]>([]);
  protected editId = signal<number | null>(null);
  protected form: FormPromo = vide();

  /** Charge les promotions et les vols. */
  constructor() { this.charger(); this.api.vols().subscribe((v) => this.vols.set(v)); }

  /** Recharge toutes les promotions. */
  private charger(): void { this.api.toutesPromotions().subscribe((p) => this.promotions.set(p)); }

  /** Options du menu des vols (libellé lisible). */
  protected optionsVols(): { id: number; libelle: string }[] {
    return this.vols().map((v) => ({ id: v.id, libelle: `${v.compagnie} ${v.numeroVol} : ${v.origine} → ${v.destination}` }));
  }

  /** Ajoute ou modifie la promotion du formulaire. */
  protected enregistrer(): void {
    const id = this.editId();
    const corps: PromotionRequest = { code: this.form.code, description: this.form.description, pourcentage: this.form.pourcentage,
      dateDebut: versIsoDate(this.form.dateDebut), dateFin: versIsoDate(this.form.dateFin), automatique: this.form.automatique, volId: this.form.volId, actif: this.form.actif };
    (id ? this.api.modifierPromotion(id, corps) : this.api.creerPromotion(corps)).subscribe(() => {
      this.notifier.ok(id ? 'Promotion modifiée' : 'Promotion ajoutée'); this.reset(); this.charger();
    });
  }

  /** Charge une promotion dans le formulaire. @param p la promotion */
  protected editer(p: Promotion): void {
    this.editId.set(p.id);
    this.form = { code: p.code, description: p.description, pourcentage: p.pourcentage, dateDebut: versDate(p.dateDebut), dateFin: versDate(p.dateFin),
      automatique: p.automatique, volId: p.volId, actif: p.actif };
    scrollTo({ top: 0, behavior: 'smooth' });
  }

  /** Vide le formulaire. */
  protected reset(): void { this.editId.set(null); this.form = vide(); }

  /** Supprime une promotion après confirmation. @param p la promotion */
  protected async supprimer(p: Promotion): Promise<void> {
    if (!(await this.confirmer.demander(`Supprimer la promotion ${p.code} ?`, 'Suppression', true))) return;
    this.api.supprimerPromotion(p.id).subscribe(() => { this.notifier.ok('Promotion supprimée'); this.charger(); });
  }
}
