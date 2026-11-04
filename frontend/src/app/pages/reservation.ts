import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, effect, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { Checkbox } from 'primeng/checkbox';
import { DatePicker } from 'primeng/datepicker';
import { Dialog } from 'primeng/dialog';
import { Divider } from 'primeng/divider';
import { InputText } from 'primeng/inputtext';
import { Message } from 'primeng/message';
import { Select } from 'primeng/select';
import { SelectButton } from 'primeng/selectbutton';
import { TableModule } from 'primeng/table';
import { Tag } from 'primeng/tag';
import { ToggleSwitch } from 'primeng/toggleswitch';
import { switchMap } from 'rxjs';
import { Api, Notifier } from '../api.service';
import { Auth } from '../auth.service';
import { ApercuModification, Bagage, Catalogue, Categorie, PaiementRequest, Plan, Reservation, TypePassager, Vol } from '../models';
import { Confirmer } from '../shared/confirmer';
import { Countdown } from '../shared/countdown';
import { aujourdhui, versDate, versIsoDate } from '../shared/dates';
import { Horloge } from '../shared/horloge';
import { PaymentForm } from '../shared/payment-form';
import { Qr } from '../shared/qr';
import { PassagerSiege, SeatMap } from '../shared/seat-map';
import { AvionChargement, Squelette } from '../shared/spinner';

/** Données d'un passager en cours de saisie (la date de naissance est un objet Date pour le calendrier PrimeNG). */
interface FormPassager { id: number; type: TypePassager; nom: string; prenom: string; dateNaissance: Date | null; categorie: Categorie; prixBillet: number; }
/** Choix d'un passager en cours de saisie : siège, bagage et options. */
interface FormOption { id: number; siege: string | null; bagage: Bagage; prioritaire: boolean; repas: boolean; }

/** Libellés des types de passagers. */
const TYPES: Record<TypePassager, string> = { ADULTE: 'Adulte', ENFANT: 'Enfant', BEBE: 'Bébé' };

/** Page d'une réservation : passagers, sièges, bagages, options, paiement ; puis gestion du voyage (modifier, enregistrement, annuler). */
@Component({
  selector: 'app-reservation',
  imports: [FormsModule, CurrencyPipe, DatePipe, RouterLink, Countdown, SeatMap, PaymentForm, AvionChargement, Squelette, Qr,
    Button, Card, Checkbox, DatePicker, Dialog, Divider, InputText, Message, Select, SelectButton, TableModule, Tag, ToggleSwitch],
  template: `
    @if (res(); as r) {
      <p-card class="mb-4">
        <div class="entete-page">
          <div>
            <h2>Réservation {{ r.reference }} <p-tag [value]="libelleStatut(r.statut)" [severity]="gravite(r.statut)" /></h2>
            <div class="trajet">{{ r.vol.origine }} → {{ r.vol.destination }}</div>
            <div>{{ r.vol.dateDepart | date: 'EEEE d MMMM y, HH:mm' }} → {{ r.vol.dateArrivee | date: 'HH:mm' }} · {{ r.vol.compagnie }} {{ r.vol.numeroVol }}</div>
          </div>
          <div class="compte-box">
            @if (r.statut === 'EN_ATTENTE' && r.expireLe) {
              <small>Vol gardé pour vous pendant</small>
              <div><app-countdown [cible]="r.expireLe" [court]="true" termine="Délai dépassé" /></div>
            } @else if (r.statut === 'CONFIRMEE') {
              <small>Départ dans</small>
              <div><app-countdown [cible]="r.vol.dateDepart" termine="Le vol est parti" /></div>
            }
          </div>
        </div>
      </p-card>

      @if (r.statut === 'EXPIREE') {
        <p-message severity="warn" icon="pi pi-clock" class="mb-3">
          Le délai de paiement est dépassé : le vol n'est plus gardé pour cette réservation. <a routerLink="/">Nouvelle recherche</a>
        </p-message>
      }
      @if (r.statut === 'ANNULEE') {
        <p-message severity="error" icon="pi pi-times-circle" class="mb-3">
          Réservation annulée. Montant remboursé : <b>{{ rembourse(r) | currency: 'EUR' }}</b>.
          @if (rembourse(r) === 0 && r.totaux.paye > 0) { Sans assurance annulation, le billet n'est pas remboursé. }
          <a routerLink="/">Réserver un autre vol</a>
        </p-message>
      }

      @if (editable(r)) {
        <div class="deux">
          <div>
            <!-- 1. Passagers -->
            <p-card header="1. Passagers" class="mb-4">
              @if (r.statut === 'CONFIRMEE') { <p-message severity="info" size="small" class="mb-3">Après paiement, seuls le nom et le prénom peuvent être corrigés.</p-message> }
              @for (p of formPassagers; track p.id; let i = $index) {
                <div class="passager">
                  <span class="num">{{ i + 1 }}</span>
                  <div class="champs-passager">
                    <div class="champ"><label>Type</label><input pInputText [value]="types[p.type]" disabled /></div>
                    <div class="champ"><label [for]="'pr' + p.id">Prénom</label><input pInputText [id]="'pr' + p.id" [(ngModel)]="p.prenom" autocomplete="off" /></div>
                    <div class="champ"><label [for]="'no' + p.id">Nom</label><input pInputText [id]="'no' + p.id" [(ngModel)]="p.nom" autocomplete="off" /></div>
                    <div class="champ"><label [for]="'dn' + p.id">Date de naissance</label>
                      <p-datepicker [inputId]="'dn' + p.id" [(ngModel)]="p.dateNaissance" [maxDate]="max" dateFormat="dd/mm/yy" [showIcon]="true" iconDisplay="input"
                        [disabled]="r.statut === 'CONFIRMEE'" placeholder="jj/mm/aaaa" appendTo="body" /></div>
                  </div>
                  <div class="prix-p"><p-tag [value]="p.categorie" severity="info" /> <b>{{ p.prixBillet | currency: 'EUR' }}</b></div>
                </div>
              }
              <p-button label="Enregistrer les passagers" icon="pi pi-save" severity="secondary" [outlined]="true" (onClick)="enregistrerPassagers()" styleClass="mt-3" />
            </p-card>

            <!-- 2. Sièges -->
            <p-card header="2. Choix des sièges" subheader="Facultatif : un siège gratuit est attribué à l'enregistrement" class="mb-4">
              @if (plan(); as pl) {
                <div class="sieges-zone">
                  <div>
                    <p-selectbutton [options]="optionsSiege()" optionLabel="libelle" optionValue="id" [ngModel]="actifSiege()" (ngModelChange)="actifSiege.set($event)" [allowEmpty]="false" />
                    @if (typeActif() === 'BEBE') { <p class="muted">Un bébé voyage sur les genoux d'un adulte : pas de siège.</p> }
                    @else {
                      <p class="muted">Cliquez sur un siège pour le passager sélectionné.
                        @if (typeActif() === 'ENFANT') { Les enfants ne peuvent pas s'asseoir près des sorties de secours. }</p>
                      <p-button label="Pas de siège pour ce passager" size="small" severity="secondary" [outlined]="true" (onClick)="viderSiege()" />
                    }
                    <ul class="legende">
                      @for (c of catalogue()?.classesSiege; track c.code) { <li><span class="pastille {{ c.code }}"></span> {{ c.libelle }} · <b>{{ c.prix > 0 ? '+' + (c.prix | currency: 'EUR') : 'gratuit' }}</b></li> }
                      <li><span class="pastille choisi"></span> Votre sélection</li>
                      <li><span class="pastille pris"></span> Occupé</li>
                    </ul>
                  </div>
                  <app-seat-map [plan]="pl" [passagers]="siegePassagers()" [actif]="actifSiege()" (choisir)="choisirSiege($event)" />
                </div>
              } @else { <app-squelette [nombre]="1" [hauteur]="200" /> }
            </p-card>

            <!-- 3. Bagages et options -->
            <p-card header="3. Bagages et options" subheader="Un petit sac sous le siège est toujours inclus" class="mb-4">
              @for (o of formOptions; track o.id; let i = $index) {
                <div class="passager">
                  <span class="num">{{ i + 1 }}</span>
                  @if (typeDe(o.id) !== 'BEBE') {
                    <div class="champs-passager">
                      <strong>{{ nomDe(o.id) }}</strong>
                      <div class="champ"><label>Bagage</label>
                        <p-select [options]="optionsBagage()" optionLabel="libelle" optionValue="code" [(ngModel)]="o.bagage" appendTo="body" /></div>
                      <div class="ligne-choix"><p-checkbox [inputId]="'pri' + o.id" [(ngModel)]="o.prioritaire" [binary]="true" />
                        <label [for]="'pri' + o.id">Embarquement prioritaire · +{{ catalogue()?.embarquementPrioritaire }} €</label></div>
                      <div class="ligne-choix"><p-checkbox [inputId]="'re' + o.id" [(ngModel)]="o.repas" [binary]="true" />
                        <label [for]="'re' + o.id">Repas à bord · +{{ catalogue()?.repas }} €</label></div>
                    </div>
                  } @else { <span>{{ nomDe(o.id) }} — voyage sur les genoux d'un adulte, sans option.</span> }
                </div>
              }
              <div class="assurance">
                <p-toggleswitch inputId="assurance" [(ngModel)]="assurance" />
                <label for="assurance"><b><i class="pi pi-shield"></i> Assurance annulation</b> · +{{ catalogue()?.assurance | currency: 'EUR' }} par passager<br>
                  <small class="muted">Remboursement intégral si vous annulez votre voyage. Sans assurance, un billet annulé n'est pas remboursé.</small></label>
              </div>
              <p-button label="Enregistrer mes choix" icon="pi pi-save" severity="secondary" [outlined]="true" (onClick)="enregistrerOptions()" styleClass="mt-3" />
            </p-card>

            <!-- Gestion du voyage -->
            @if (r.statut === 'CONFIRMEE') {
              <p-card header="Gérer mon voyage" class="mb-4">
                <div class="actions-voyage">
                  <p-button label="Enregistrement en ligne" icon="pi pi-mobile" [disabled]="!r.enregistrementOuvert" (onClick)="faireEnregistrement()" />
                  <p-button [label]="'Modifier le vol (+' + catalogue()?.fraisModificationPourcent + ' %)'" icon="pi pi-sync" severity="secondary" [disabled]="!r.modifiable" (onClick)="ouvrirModification()" />
                  <p-button label="Réserver le vol retour" icon="pi pi-replay" severity="secondary" [outlined]="true" routerLink="/recherche" [queryParams]="retourParams(r)" />
                  <p-button label="Réserver un autre vol" icon="pi pi-plus" severity="secondary" [outlined]="true" routerLink="/" />
                  <p-button label="Annuler la réservation" icon="pi pi-times" severity="danger" [outlined]="true" (onClick)="annuler(r)" />
                </div>
                @if (!r.enregistrementOuvert && !enregistre(r)) { <p class="muted">L'enregistrement ouvre 48 h avant le départ (et ferme 1 h avant).</p> }
              </p-card>

              <p-card [header]="titreBillets(r)" class="mb-4 billets">
                @if (!enregistre(r)) { <p class="muted">Billet électronique : présentez ce QR code à l'aéroport. Faites l'enregistrement en ligne pour obtenir votre carte d'embarquement avec la porte.</p> }
                @for (p of r.passagers; track p.id) {
                  <div class="embarquement">
                    <div class="gauche">
                      <small>{{ r.vol.compagnie }} · vol {{ r.vol.numeroVol }} · {{ typeDocument(r) }}</small>
                      <div class="villes">{{ r.vol.origine }} → {{ r.vol.destination }}</div>
                      <div><b>{{ (p.nom ?? '').toUpperCase() }} {{ p.prenom }}</b></div>
                      <small>{{ r.vol.dateDepart | date: 'EEE d MMM y' }} · Départ {{ r.vol.dateDepart | date: 'HH:mm' }} → Arrivée {{ r.vol.dateArrivee | date: 'HH:mm' }}</small>
                      @if (enregistre(r)) { <small>Embarquement {{ r.heureEmbarquement | date: 'HH:mm' }} · Porte {{ r.porte }}</small> }
                      <small>Bagage : {{ libelleBagage(p.bagage) }}@if (p.prioritaire) { · Embarquement prioritaire }</small>
                    </div>
                    <div class="droite">
                      <app-qr [valeur]="contenuQr(r, p)" [taille]="110" />
                      <div>Siège <b>{{ libelleSiege(p) }}</b></div>
                      <small>Réf. <b>{{ r.reference }}</b></small>
                    </div>
                  </div>
                }
                <p-button class="no-print" [label]="enregistre(r) ? 'Imprimer mes cartes d\\'embarquement' : 'Imprimer mes billets'" icon="pi pi-print" (onClick)="imprimer()" />
              </p-card>
            }
          </div>

          <!-- Récapitulatif -->
          <p-card header="Récapitulatif" class="recap">
            <table class="lignes">
              <tr><td>Billets ({{ r.passagers.length }})</td><td>{{ r.totaux.billets | currency: 'EUR' }}</td></tr>
              <tr><td>Sièges</td><td>{{ estimation().sieges | currency: 'EUR' }}</td></tr>
              <tr><td>Bagages</td><td>{{ estimation().bagages | currency: 'EUR' }}</td></tr>
              <tr><td>Options</td><td>{{ estimation().options | currency: 'EUR' }}</td></tr>
              <tr><td>Assurance</td><td>{{ estimation().assurance | currency: 'EUR' }}</td></tr>
              @if (r.totaux.frais > 0) { <tr><td>Frais de modification</td><td>{{ r.totaux.frais | currency: 'EUR' }}</td></tr> }
              <tr class="total"><td>Total</td><td>{{ estimation().total | currency: 'EUR' }}</td></tr>
              @if (r.totaux.paye > 0) { <tr><td>Déjà payé</td><td>-{{ r.totaux.paye | currency: 'EUR' }}</td></tr> }
              <tr class="total"><td>Reste à payer</td><td>{{ estimation().solde | currency: 'EUR' }}</td></tr>
            </table>
            @if (r.remisePromo > 0) { <p-tag [value]="'Promo -' + r.remisePromo + ' % ' + (r.codePromo ?? '')" severity="warn" icon="pi pi-tag" /> }
            @if (r.remiseGroupe > 0) { <p-tag [value]="'Remise de groupe -' + r.remiseGroupe + ' %'" severity="info" icon="pi pi-users" /> }

            @if (estimation().solde > 0) {
              <p-divider />
              <h3>Paiement</h3>
              <app-payment-form [carteEnregistree]="auth.utilisateur()?.carte ?? null" [montant]="estimation().solde"
                [libelle]="r.statut === 'EN_ATTENTE' ? 'Payer et confirmer' : 'Payer le solde'" [occupe]="occupe()" (soumettre)="payer($event)" />
            } @else if (r.statut === 'CONFIRMEE') { <p-message severity="success" icon="pi pi-check-circle" class="mt-3">Réservation entièrement payée.</p-message> }
          </p-card>
        </div>
      }

      @if (r.paiements.length) {
        <p-card header="Historique des paiements" class="mb-4">
          <p-table [value]="r.paiements" styleClass="p-datatable-sm">
            <ng-template #header><tr><th>Date</th><th>Détail</th><th>Carte</th><th>Montant</th></tr></ng-template>
            <ng-template #body let-p>
              <tr><td>{{ p.date | date: 'dd/MM/yy HH:mm' }}</td><td>{{ p.motif }}</td><td>{{ p.carteMarque ? p.carteMarque + ' •••• ' + p.carteFin : '—' }}</td>
                <td [class.rembourse]="p.montant < 0">{{ p.montant | currency: 'EUR' }}</td></tr>
            </ng-template>
          </p-table>
        </p-card>
      }

      <p-dialog header="Modifier mon vol" [visible]="modificationOuverte()" (visibleChange)="modificationOuverte.set($event)" [modal]="true" [draggable]="false" [style]="{ width: 'min(760px, 95vw)' }">
        <p-message severity="info" icon="pi pi-info-circle" class="mb-3">
          Des frais de <b>{{ catalogue()?.fraisModificationPourcent }} %</b> du prix de vos billets s'ajoutent, plus la différence de prix si le nouveau vol est plus cher
          (ex. pour un billet à 100 € : 10 € de frais). Vos sièges sont conservés s'ils sont libres sur le nouveau vol.
        </p-message>
        @if (!apercu()) {
          <p-table [value]="autresVols()" styleClass="p-datatable-sm">
            <ng-template #header><tr><th>Vol</th><th>Départ</th><th>Prix adulte</th><th>Places</th><th></th></tr></ng-template>
            <ng-template #body let-v>
              <tr><td>{{ v.compagnie }} {{ v.numeroVol }}</td><td>{{ v.dateDepart | date: 'dd/MM/yy HH:mm' }}</td><td>{{ v.prixPromo | currency: 'EUR' }}</td><td>{{ v.placesRestantes }}</td>
                <td><p-button label="Choisir" size="small" (onClick)="voirApercu(v)" /></td></tr>
            </ng-template>
            <ng-template #emptymessage><tr><td colspan="5">Aucun autre vol disponible sur cette liaison.</td></tr></ng-template>
          </p-table>
        } @else if (apercu(); as a) {
          <table class="lignes">
            <tr><td>Nouveau vol</td><td>{{ a.nouveauVol.compagnie }} {{ a.nouveauVol.numeroVol }} · {{ a.nouveauVol.dateDepart | date: 'dd/MM/yy HH:mm' }}</td></tr>
            <tr><td>Billets actuels</td><td>{{ a.ancienBillets | currency: 'EUR' }}</td></tr>
            <tr><td>Billets sur le nouveau vol</td><td>{{ a.nouveauBillets | currency: 'EUR' }}</td></tr>
            <tr><td>Différence de prix</td><td>{{ a.difference | currency: 'EUR' }}</td></tr>
            <tr><td>Frais de modification ({{ a.fraisPourcent }} %)</td><td>{{ a.frais | currency: 'EUR' }}</td></tr>
            <tr class="total"><td>À payer</td><td>{{ a.aPayer | currency: 'EUR' }}</td></tr>
          </table>
          <p-divider />
          <app-payment-form [carteEnregistree]="auth.utilisateur()?.carte ?? null" [montant]="a.aPayer" libelle="Confirmer la modification" [occupe]="occupe()" (soumettre)="confirmerModification($event)" />
          <p-button label="Choisir un autre vol" icon="pi pi-arrow-left" severity="secondary" [text]="true" (onClick)="apercu.set(null)" styleClass="mt-2" />
        }
      </p-dialog>
    } @else if (introuvable()) {
      <p-card header="Réservation introuvable"><a routerLink="/mes-voyages">Mes voyages</a></p-card>
    } @else { <app-avion-chargement texte="Chargement de votre réservation…" /><app-squelette [nombre]="2" [hauteur]="140" /> }
  `,
})
export class ReservationPage {
  private api = inject(Api);
  private notifier = inject(Notifier);
  private horloge = inject(Horloge);
  private confirmer = inject(Confirmer);
  protected auth = inject(Auth);
  /** Identifiant de la réservation (paramètre d'URL). */
  id = input.required<string>();

  /** Réservation affichée. */
  protected res = signal<Reservation | null>(null);
  protected introuvable = signal(false);
  protected catalogue = signal<Catalogue | null>(null);
  protected plan = signal<Plan | null>(null);
  /** Passagers avec leur siège, pour le plan de l'avion. */
  protected siegePassagers = signal<PassagerSiege[]>([]);
  /** Passager dont on choisit le siège. */
  protected actifSiege = signal(0);
  /** Vrai pendant un paiement. */
  protected occupe = signal(false);
  protected modificationOuverte = signal(false);
  protected autresVols = signal<Vol[]>([]);
  protected apercu = signal<ApercuModification | null>(null);

  protected formPassagers: FormPassager[] = [];
  protected formOptions: FormOption[] = [];
  protected assurance = false;
  protected types = TYPES;
  /** Date maximale de naissance : aujourd'hui. */
  protected max = aujourdhui();
  private prixSiege = new Map<string, number>();
  private expireVerifie = false;

  /** Charge le catalogue et la réservation, et surveille la fin du délai de paiement. */
  constructor() {
    this.api.catalogue().subscribe((c) => this.catalogue.set(c));
    effect(() => { const id = Number(this.id()); if (id) this.charger(id); });
    // Quand le délai de paiement est dépassé, on recharge pour afficher l'état « expirée »
    effect(() => {
      const r = this.res();
      if (r?.statut === 'EN_ATTENTE' && r.expireLe && this.horloge.maintenant() > new Date(r.expireLe).getTime() && !this.expireVerifie) {
        this.expireVerifie = true;
        this.charger(r.id);
      }
    });
  }

  // ---------------------------------------------------------------- chargement

  /**
   * Charge une réservation (et son plan de cabine).
   * @param id l'identifiant de la réservation
   * @param rechargerPlan vrai pour recharger aussi le plan des sièges
   */
  private charger(id: number, rechargerPlan = true): void {
    this.api.reservation(id).subscribe({
      next: (r) => { this.appliquer(r); if (rechargerPlan) this.chargerPlan(r); },
      error: () => this.introuvable.set(true),
    });
  }

  /** Charge le plan de cabine du vol et mémorise le prix de chaque siège. @param r la réservation */
  private chargerPlan(r: Reservation): void {
    this.api.plan(r.vol.id, r.id).subscribe((p) => {
      this.plan.set(p);
      this.prixSiege = new Map(p.plan.flatMap((rg) => rg.sieges.map((s) => [s.code, rg.prix] as [string, number])));
    });
  }

  /** Remplit les formulaires locaux avec la réservation reçue du serveur. @param r la réservation */
  private appliquer(r: Reservation): void {
    this.res.set(r);
    this.expireVerifie = r.statut !== 'EN_ATTENTE';
    this.formPassagers = r.passagers.map((p) => ({ id: p.id, type: p.type, nom: p.nom ?? '', prenom: p.prenom ?? '',
      dateNaissance: versDate(p.dateNaissance), categorie: p.categorie, prixBillet: p.prixBillet }));
    this.formOptions = r.passagers.map((p) => ({ id: p.id, siege: p.siege, bagage: p.bagage, prioritaire: p.prioritaire, repas: p.repas }));
    this.assurance = r.assurance;
    this.rafraichirSieges();
    const premier = r.passagers.find((p) => p.type !== 'BEBE');
    if (!this.actifSiege() || !r.passagers.some((p) => p.id === this.actifSiege())) this.actifSiege.set(premier?.id ?? 0);
  }

  /** Vrai si la réservation peut encore être modifiée (en attente de paiement, ou payée et vol à venir). @param r la réservation */
  protected editable(r: Reservation): boolean { return r.statut === 'EN_ATTENTE' || (r.statut === 'CONFIRMEE' && r.modifiable); }

  /** Libellé français d'un statut. @param s le statut */
  protected libelleStatut(s: string): string { return ({ EN_ATTENTE: 'En attente de paiement', CONFIRMEE: 'Confirmée', ANNULEE: 'Annulée', EXPIREE: 'Expirée' } as Record<string, string>)[s]; }

  /** Couleur d'étiquette PrimeNG selon le statut. @param s le statut */
  protected gravite(s: string): 'success' | 'warn' | 'danger' | 'secondary' {
    return ({ CONFIRMEE: 'success', EN_ATTENTE: 'warn', ANNULEE: 'danger', EXPIREE: 'danger' } as const)[s as 'CONFIRMEE'] ?? 'secondary';
  }

  /** Vrai si au moins un passager est enregistré en ligne. @param r la réservation */
  protected enregistre(r: Reservation): boolean { return r.passagers.some((p) => p.enregistre); }

  /** Montant total remboursé. @param r la réservation */
  protected rembourse(r: Reservation): number { return -r.paiements.filter((p) => p.type === 'REMBOURSEMENT').reduce((s, p) => s + p.montant, 0); }

  /** Type (adulte, enfant, bébé) d'un passager. @param id l'identifiant du passager */
  protected typeDe(id: number): TypePassager | undefined { return this.formPassagers.find((p) => p.id === id)?.type; }

  /** Type du passager dont on choisit le siège. */
  protected typeActif(): TypePassager | undefined { return this.typeDe(this.actifSiege()); }

  /** Nom affiché d'un passager (ou son type s'il n'est pas encore renseigné). @param id l'identifiant du passager */
  protected nomDe(id: number): string {
    const p = this.formPassagers.find((x) => x.id === id);
    return p && (p.prenom || p.nom) ? `${p.prenom} ${p.nom}` : `Passager (${TYPES[p?.type ?? 'ADULTE']})`;
  }

  /** Choix du passager dans le sélecteur de sièges (bébés exclus), avec son siège actuel. */
  protected optionsSiege = signal<{ id: number; libelle: string }[]>([]);

  /** Options du menu déroulant des bagages (libellé et prix). */
  protected optionsBagage(): { code: Bagage; libelle: string }[] {
    return (this.catalogue()?.bagages ?? []).map((b) => ({ code: b.code, libelle: b.libelle + (b.prix > 0 ? ' · +' + b.prix + ' €' : '') }));
  }

  // ---------------------------------------------------------------- sièges

  /** Met à jour la liste des passagers avec leur siège (plan et sélecteur). */
  private rafraichirSieges(): void {
    this.siegePassagers.set(this.formPassagers.map((p) => ({
      id: p.id, type: p.type, libelle: this.nomDe(p.id),
      siege: this.formOptions.find((o) => o.id === p.id)?.siege ?? null,
    })));
    this.optionsSiege.set(this.siegePassagers().filter((p) => p.type !== 'BEBE').map((p, i) => ({ id: p.id, libelle: `${i + 1}. ${p.libelle}${p.siege ? ' · ' + p.siege : ''}` })));
  }

  /**
   * Attribue (ou retire) un siège au passager actif, puis passe au passager suivant sans siège.
   * @param code le siège cliqué
   */
  protected choisirSiege(code: string): void {
    const o = this.formOptions.find((x) => x.id === this.actifSiege());
    if (!o) return;
    o.siege = o.siege === code ? null : code;
    this.rafraichirSieges();
    const suivant = this.siegePassagers().find((p) => p.type !== 'BEBE' && !p.siege);
    if (o.siege && suivant) this.actifSiege.set(suivant.id);
  }

  /** Retire le siège du passager actif. */
  protected viderSiege(): void {
    const o = this.formOptions.find((x) => x.id === this.actifSiege());
    if (o) { o.siege = null; this.rafraichirSieges(); }
  }

  // ---------------------------------------------------------------- totaux (estimation avant enregistrement)

  /** Estimation du récapitulatif à partir des choix en cours (avant enregistrement sur le serveur). */
  protected estimation(): { sieges: number; bagages: number; options: number; assurance: number; total: number; solde: number } {
    const r = this.res(), cat = this.catalogue();
    if (!r || !cat) return { sieges: 0, bagages: 0, options: 0, assurance: 0, total: 0, solde: 0 };
    const sieges = this.formOptions.reduce((s, o) => s + (o.siege ? this.prixSiege.get(o.siege) ?? 0 : 0), 0);
    const bagages = this.formOptions.reduce((s, o) => s + (cat.bagages.find((b) => b.code === o.bagage)?.prix ?? 0), 0);
    const options = this.formOptions.reduce((s, o) => s + (o.prioritaire ? cat.embarquementPrioritaire : 0) + (o.repas ? cat.repas : 0), 0);
    const assures = r.passagers.filter((p) => p.type !== 'BEBE').length;
    const assurance = this.assurance ? Math.round(cat.assurance * assures * 100) / 100 : 0;
    const total = Math.round((r.totaux.billets + sieges + bagages + options + assurance + r.totaux.frais) * 100) / 100;
    return { sieges, bagages, options, assurance, total, solde: Math.max(0, Math.round((total - r.totaux.paye) * 100) / 100) };
  }

  // ---------------------------------------------------------------- enregistrement des choix

  /** Envoie les passagers saisis au serveur. */
  private sauverPassagers() {
    return this.api.majPassagers(this.res()!.id, this.formPassagers.map((p) => ({ id: p.id, nom: p.nom, prenom: p.prenom, dateNaissance: versIsoDate(p.dateNaissance) || null })));
  }

  /** Envoie les sièges, bagages, options et l'assurance au serveur. */
  private sauverOptions() {
    return this.api.majOptions(this.res()!.id, { assurance: this.assurance,
      passagers: this.formOptions.map((o) => ({ id: o.id, siege: o.siege, bagage: o.bagage, prioritaire: o.prioritaire, repas: o.repas })) });
  }

  /** Enregistre d'abord les passagers puis les options, dans cet ordre. */
  private sauverTout() { return this.sauverPassagers().pipe(switchMap((r) => { this.res.set(r); return this.sauverOptions(); })); }

  /** Enregistre les passagers sans écraser les choix non enregistrés des autres sections. */
  protected enregistrerPassagers(): void {
    this.sauverPassagers().subscribe((r) => {
      this.res.set(r);
      this.formPassagers = r.passagers.map((p) => ({ id: p.id, type: p.type, nom: p.nom ?? '', prenom: p.prenom ?? '',
        dateNaissance: versDate(p.dateNaissance), categorie: p.categorie, prixBillet: p.prixBillet }));
      this.rafraichirSieges();
      this.notifier.ok('Passagers enregistrés');
    });
  }

  /** Enregistre sièges, bagages et options sans écraser les passagers en cours de saisie. */
  protected enregistrerOptions(): void {
    this.sauverOptions().subscribe((r) => {
      this.res.set(r);
      this.formOptions = r.passagers.map((p) => ({ id: p.id, siege: p.siege, bagage: p.bagage, prioritaire: p.prioritaire, repas: p.repas }));
      this.assurance = r.assurance;
      this.rafraichirSieges();
      this.notifier.ok('Vos choix sont enregistrés');
    });
  }

  // ---------------------------------------------------------------- paiement

  /**
   * Enregistre tous les choix puis paie le solde (paiement fictif).
   * @param p la carte saisie
   */
  protected payer(p: PaiementRequest): void {
    const r = this.res()!;
    this.occupe.set(true);
    const premier = r.statut === 'EN_ATTENTE';
    this.sauverTout().pipe(switchMap(() => this.api.payer(r.id, p))).subscribe({
      next: (maj) => {
        this.occupe.set(false); this.appliquer(maj);
        this.api.me().subscribe((u) => this.auth.majUtilisateur(u));   // carte enregistrée éventuelle
        this.notifier.ok(premier ? 'Paiement accepté : votre réservation est confirmée !' : 'Paiement accepté');
      },
      error: () => { this.occupe.set(false); this.charger(r.id, false); },
    });
  }

  // ---------------------------------------------------------------- gestion du voyage

  /**
   * Annule la réservation après confirmation (le message précise si le billet sera remboursé).
   * @param r la réservation
   */
  protected async annuler(r: Reservation): Promise<void> {
    const msg = r.totaux.paye > 0 && !r.assurance
      ? 'Annuler cette réservation ? SANS assurance annulation, votre billet ne sera PAS remboursé.'
      : 'Annuler cette réservation ?' + (r.totaux.paye > 0 ? ' Vous serez remboursé intégralement (assurance annulation).' : '');
    if (!(await this.confirmer.demander(msg, 'Annulation', true))) return;
    this.api.annuler(r.id).subscribe((maj) => { this.appliquer(maj); this.notifier.ok('Réservation annulée'); });
  }

  /** Effectue l'enregistrement en ligne (siège gratuit attribué si besoin). */
  protected faireEnregistrement(): void {
    const r = this.res()!;
    this.api.enregistrement(r.id).subscribe((maj) => { this.appliquer(maj); this.chargerPlan(maj); this.notifier.ok('Enregistrement effectué : votre carte d\'embarquement est prête'); });
  }

  /** Ouvre la fenêtre d'impression du navigateur (seuls les billets sont imprimés). */
  protected imprimer(): void { window.print(); }

  /** Titre de la section des billets. @param r la réservation */
  protected titreBillets(r: Reservation): string { return this.enregistre(r) ? "Cartes d'embarquement" : 'Mes billets'; }

  /** Type de document imprimé. @param r la réservation */
  protected typeDocument(r: Reservation): string { return this.enregistre(r) ? "CARTE D'EMBARQUEMENT" : 'BILLET ÉLECTRONIQUE'; }

  /** Texte du siège sur le billet. @param p le passager */
  protected libelleSiege(p: { type: TypePassager; siege: string | null }): string { return p.type === 'BEBE' ? 'Sur genoux' : (p.siege ?? "À l'enregistrement"); }

  /** Libellé d'un bagage. @param b le code du bagage */
  protected libelleBagage(b: Bagage): string { return this.catalogue()?.bagages.find((x) => x.code === b)?.libelle ?? b; }

  /**
   * Contenu du QR code : référence, passager, vol, date et siège (ce que lirait un portique).
   * @param r la réservation
   * @param p le passager
   */
  protected contenuQr(r: Reservation, p: { id: number; nom: string | null; prenom: string | null; siege: string | null }): string {
    return ['BA1', r.reference, r.vol.numeroVol, r.vol.dateDepart.slice(0, 16), `${(p.nom ?? '').toUpperCase()}/${p.prenom ?? ''}`, p.siege ?? '-', p.id].join('|');
  }

  /** Paramètres de recherche du vol retour (liaison inversée, mêmes passagers). @param r la réservation */
  protected retourParams(r: Reservation): Record<string, string | number | null> {
    const nb = (t: TypePassager) => r.passagers.filter((p) => p.type === t).length;
    return { origine: r.vol.destination, destination: r.vol.origine, adultes: nb('ADULTE'), enfants: nb('ENFANT') || null, bebes: nb('BEBE') || null };
  }

  // ---------------------------------------------------------------- modification du vol

  /** Ouvre la fenêtre de modification et charge les autres vols de la même liaison. */
  protected ouvrirModification(): void {
    const r = this.res()!;
    this.modificationOuverte.set(true); this.apercu.set(null);
    this.api.vols({ origine: r.vol.origine, destination: r.vol.destination, disponibles: true }).subscribe((vols) =>
      this.autresVols.set(vols.filter((v) => v.id !== r.vol.id && new Date(v.dateDepart).getTime() > Date.now() && v.origine.toLowerCase() === r.vol.origine.toLowerCase() && v.destination.toLowerCase() === r.vol.destination.toLowerCase())));
  }

  /** Ferme la fenêtre de modification. */
  protected fermerModification(): void { this.modificationOuverte.set(false); this.apercu.set(null); }

  /** Calcule et affiche le coût d'un changement vers un autre vol. @param v le nouveau vol */
  protected voirApercu(v: Vol): void { this.api.apercuModification(this.res()!.id, v.id).subscribe((a) => this.apercu.set(a)); }

  /**
   * Confirme la modification du vol en payant frais et différence.
   * @param p la carte saisie
   */
  protected confirmerModification(p: PaiementRequest): void {
    const r = this.res()!, a = this.apercu();
    if (!a) return;
    this.occupe.set(true);
    this.api.modifierVol(r.id, a.nouveauVol.id, p).subscribe({
      next: (maj) => {
        this.occupe.set(false); this.fermerModification(); this.appliquer(maj); this.chargerPlan(maj);
        this.notifier.ok('Vol modifié : le nouveau vol est confirmé');
      },
      error: () => this.occupe.set(false),
    });
  }
}
