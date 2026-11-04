import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, DestroyRef, effect, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { switchMap } from 'rxjs';
import { Api, Notifier } from '../api.service';
import { Auth } from '../auth.service';
import { ApercuModification, Bagage, Catalogue, Categorie, PaiementRequest, Plan, Reservation, TypePassager, Vol } from '../models';
import { Countdown } from '../shared/countdown';
import { Horloge } from '../shared/horloge';
import { PassagerSiege, SeatMap } from '../shared/seat-map';
import { PaymentForm } from '../shared/payment-form';
import { Qr } from '../shared/qr';
import { AvionChargement, Squelette } from '../shared/spinner';

interface FormPassager { id: number; type: TypePassager; nom: string; prenom: string; dateNaissance: string; categorie: Categorie; prixBillet: number; }
interface FormOption { id: number; siege: string | null; bagage: Bagage; prioritaire: boolean; repas: boolean; }

const TYPES: Record<TypePassager, string> = { ADULTE: 'Adulte', ENFANT: 'Enfant', BEBE: 'Bébé' };

/** Page d'une réservation : passagers, sièges, bagages, options, paiement ; puis gestion du voyage (modifier, enregistrement, annuler). */
@Component({
  selector: 'app-reservation',
  imports: [FormsModule, CurrencyPipe, DatePipe, RouterLink, Countdown, SeatMap, PaymentForm, AvionChargement, Squelette, Qr],
  template: `
    @if (res(); as r) {
      <div class="card entete">
        <div>
          <h2>Réservation {{ r.reference }} <span class="badge {{ r.statut }}">{{ libelleStatut(r.statut) }}</span></h2>
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

      @if (r.statut === 'EXPIREE') {
        <div class="card"><h2>⏱ Délai de paiement dépassé</h2><p>Le vol n'est plus gardé pour cette réservation. Vous pouvez refaire une recherche.</p><a routerLink="/">Nouvelle recherche</a></div>
      }
      @if (r.statut === 'ANNULEE') {
        <div class="card"><h2>Réservation annulée</h2>
          <p>Montant remboursé : <b>{{ rembourse(r) | currency: 'EUR' }}</b>@if (rembourse(r) === 0 && r.totaux.paye === 0) { (aucun paiement à rembourser) }</p>
          <a routerLink="/">Réserver un autre vol</a></div>
      }

      @if (editable(r)) {
        <div class="deux">
          <div>
            <!-- 1. Passagers -->
            <section class="card">
              <h2>1. Passagers</h2>
              @if (r.statut === 'CONFIRMEE') { <p class="muted">Après paiement, seuls le nom et le prénom peuvent être corrigés.</p> }
              @for (p of formPassagers; track p.id; let i = $index) {
                <div class="passager">
                  <div class="num">{{ i + 1 }}</div>
                  <div class="filters">
                    <label>Type<input [value]="types[p.type]" disabled></label>
                    <label>Prénom<input [name]="'pr' + p.id" [(ngModel)]="p.prenom" autocomplete="off" required></label>
                    <label>Nom<input [name]="'no' + p.id" [(ngModel)]="p.nom" autocomplete="off" required></label>
                    <label>Date de naissance<input type="date" [name]="'dn' + p.id" [(ngModel)]="p.dateNaissance" [disabled]="r.statut === 'CONFIRMEE'" [max]="aujourdhui" required></label>
                  </div>
                  <div class="prix-p"><span class="badge {{ p.categorie }}">{{ p.categorie }}</span> {{ p.prixBillet | currency: 'EUR' }}</div>
                </div>
              }
              <button class="sec" (click)="enregistrerPassagers()">Enregistrer les passagers</button>
            </section>

            <!-- 2. Sièges -->
            <section class="card">
              <h2>2. Choix des sièges <small class="muted">(facultatif : un siège gratuit est attribué à l'enregistrement)</small></h2>
              @if (plan(); as pl) {
                <div class="sieges-zone">
                  <div>
                    <div class="onglets">
                      @for (p of passagersAvecSiege(); track p.id; let i = $index) {
                        <button type="button" [class.actif]="actifSiege() === p.id" (click)="actifSiege.set(p.id)">
                          {{ i + 1 }}. {{ p.libelle }} @if (p.siege) { · <b>{{ p.siege }}</b> }
                        </button>
                      }
                    </div>
                    @if (typeActif() === 'BEBE') { <p class="muted">Un bébé voyage sur les genoux d'un adulte : pas de siège.</p> }
                    @else {
                      <p class="muted">Cliquez sur un siège pour le passager sélectionné.
                        @if (typeActif() === 'ENFANT') { Les enfants ne peuvent pas s'asseoir près des sorties de secours. }</p>
                      <button class="small sec" (click)="viderSiege()">Pas de siège pour ce passager</button>
                    }
                    <ul class="legende">
                      @for (c of catalogue()?.classesSiege; track c.code) { <li><span class="pastille {{ c.code }}"></span> {{ c.libelle }} · <b>{{ c.prix > 0 ? '+' + (c.prix | currency: 'EUR') : 'gratuit' }}</b></li> }
                      <li><span class="pastille choisi"></span> Votre sélection</li>
                      <li><span class="pastille pris"></span> Occupé</li>
                    </ul>
                  </div>
                  <app-seat-map [plan]="pl" [passagers]="siegePassagers()" [actif]="actifSiege()" (choisir)="choisirSiege($event)" />
                </div>
              }
            </section>

            <!-- 3. Bagages et options -->
            <section class="card">
              <h2>3. Bagages et options</h2>
              <p class="muted">Un petit sac sous le siège est toujours inclus.</p>
              @for (o of formOptions; track o.id; let i = $index) {
                @if (typeDe(o.id) !== 'BEBE') {
                  <div class="passager">
                    <div class="num">{{ i + 1 }}</div>
                    <div class="filters">
                      <strong>{{ nomDe(o.id) }}</strong>
                      <label>Bagage
                        <select [name]="'bg' + o.id" [(ngModel)]="o.bagage">
                          @for (b of catalogue()?.bagages; track b.code) { <option [value]="b.code">{{ b.libelle }}{{ b.prix > 0 ? ' · +' + b.prix + ' €' : '' }}</option> }
                        </select>
                      </label>
                      <label class="case"><input type="checkbox" [name]="'pri' + o.id" [(ngModel)]="o.prioritaire"> Embarquement prioritaire · +{{ catalogue()?.embarquementPrioritaire }} €</label>
                      <label class="case"><input type="checkbox" [name]="'re' + o.id" [(ngModel)]="o.repas"> Repas à bord · +{{ catalogue()?.repas }} €</label>
                    </div>
                  </div>
                } @else { <div class="passager"><div class="num">{{ i + 1 }}</div><span>{{ nomDe(o.id) }} — voyage sur les genoux d'un adulte, sans option.</span></div> }
              }
              <label class="case assurance"><input type="checkbox" name="ass" [(ngModel)]="assurance">
                <span><b>🛡 Assurance annulation</b> · +{{ catalogue()?.assurance | currency: 'EUR' }} par passager<br>
                <small class="muted">Remboursement intégral si vous annulez votre voyage. Sans assurance, un billet annulé n'est pas remboursé.</small></span></label>
              <button class="sec" (click)="enregistrerOptions()">Enregistrer mes choix</button>
            </section>

            <!-- Gestion du voyage -->
            @if (r.statut === 'CONFIRMEE') {
              <section class="card">
                <h2>Gérer mon voyage</h2>
                <div class="actions-voyage">
                  <button [disabled]="!r.enregistrementOuvert" (click)="faireEnregistrement()">📲 Enregistrement en ligne</button>
                  <button class="sec" [disabled]="!r.modifiable" (click)="ouvrirModification()">🔁 Modifier le vol (+{{ catalogue()?.fraisModificationPourcent }} %)</button>
                  <a class="bouton sec" [routerLink]="['/recherche']" [queryParams]="retourParams(r)">↩ Réserver le vol retour</a>
                  <a class="bouton sec" routerLink="/">➕ Réserver un autre vol</a>
                  <button class="danger" (click)="annuler(r)">Annuler la réservation</button>
                </div>
                @if (!r.enregistrementOuvert && !enregistre(r)) { <p class="muted">L'enregistrement ouvre 48 h avant le départ (et ferme 1 h avant).</p> }
              </section>
            }

            @if (modificationOuverte()) {
              <section class="card">
                <h2>Modifier mon vol</h2>
                <p>Des frais de <b>{{ catalogue()?.fraisModificationPourcent }} %</b> du prix de vos billets s'ajoutent, plus la différence de prix si le nouveau vol est plus cher
                  (ex. pour un billet à 100 € : 10 € de frais). Vos sièges sont conservés s'ils sont libres sur le nouveau vol.</p>
                @if (!apercu()) {
                  <table>
                    <thead><tr><th>Vol</th><th>Départ</th><th>Prix adulte</th><th>Places</th><th></th></tr></thead>
                    <tbody>
                      @for (v of autresVols(); track v.id) {
                        <tr><td>{{ v.compagnie }} {{ v.numeroVol }}</td><td>{{ v.dateDepart | date: 'dd/MM/yy HH:mm' }}</td><td>{{ v.prixPromo | currency: 'EUR' }}</td><td>{{ v.placesRestantes }}</td>
                          <td><button class="small" (click)="voirApercu(v)">Choisir</button></td></tr>
                      } @empty { <tr><td colspan="5">Aucun autre vol disponible sur cette liaison.</td></tr> }
                    </tbody>
                  </table>
                } @else if (apercu(); as a) {
                  <table>
                    <tr><td>Nouveau vol</td><td>{{ a.nouveauVol.compagnie }} {{ a.nouveauVol.numeroVol }} · {{ a.nouveauVol.dateDepart | date: 'dd/MM/yy HH:mm' }}</td></tr>
                    <tr><td>Billets actuels</td><td>{{ a.ancienBillets | currency: 'EUR' }}</td></tr>
                    <tr><td>Billets sur le nouveau vol</td><td>{{ a.nouveauBillets | currency: 'EUR' }}</td></tr>
                    <tr><td>Différence de prix</td><td>{{ a.difference | currency: 'EUR' }}</td></tr>
                    <tr><td>Frais de modification ({{ a.fraisPourcent }} %)</td><td>{{ a.frais | currency: 'EUR' }}</td></tr>
                    <tr><td><b>À payer</b></td><td><b>{{ a.aPayer | currency: 'EUR' }}</b></td></tr>
                  </table>
                  <app-payment-form [carteEnregistree]="auth.utilisateur()?.carte ?? null" [montant]="a.aPayer" libelle="Confirmer la modification" [occupe]="occupe()" (soumettre)="confirmerModification($event)" />
                  <button class="sec" (click)="apercu.set(null)">← Choisir un autre vol</button>
                }
                <button class="sec" (click)="fermerModification()">Fermer</button>
              </section>
            }

            @if (r.statut === 'CONFIRMEE') {
              <section class="card">
                <h2>{{ titreBillets(r) }}</h2>
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
                <button class="no-print" (click)="imprimer()">🖨 Imprimer {{ enregistre(r) ? "mes cartes d'embarquement" : "mes billets" }}</button>
              </section>
            }
          </div>

          <!-- Récapitulatif -->
          <aside class="recap card">
            <h2>Récapitulatif</h2>
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
            @if (r.remisePromo > 0) { <p><span class="badge ENFANT">Promo -{{ r.remisePromo }} %</span> {{ r.codePromo }}</p> }
            @if (r.remiseGroupe > 0) { <p><span class="badge SENIOR">Remise de groupe -{{ r.remiseGroupe }} %</span></p> }

            @if (estimation().solde > 0) {
              <h3>Paiement</h3>
              <app-payment-form [carteEnregistree]="auth.utilisateur()?.carte ?? null" [montant]="estimation().solde"
                [libelle]="r.statut === 'EN_ATTENTE' ? 'Payer et confirmer' : 'Payer le solde'" [occupe]="occupe()" (soumettre)="payer($event)" />
            } @else if (r.statut === 'CONFIRMEE') { <p>✅ Réservation entièrement payée.</p> }
          </aside>
        </div>
      }

      @if (r.paiements.length) {
        <section class="card">
          <h2>Historique des paiements</h2>
          <table>
            <thead><tr><th>Date</th><th>Détail</th><th>Carte</th><th>Montant</th></tr></thead>
            <tbody>
              @for (p of r.paiements; track $index) {
                <tr><td>{{ p.date | date: 'dd/MM/yy HH:mm' }}</td><td>{{ p.motif }}</td><td>{{ p.carteMarque ? p.carteMarque + ' •••• ' + p.carteFin : '—' }}</td>
                  <td [class.rembourse]="p.montant < 0">{{ p.montant | currency: 'EUR' }}</td></tr>
              }
            </tbody>
          </table>
        </section>
      }
    } @else if (introuvable()) {
      <div class="card"><h2>Réservation introuvable</h2><a routerLink="/mes-voyages">Mes voyages</a></div>
    } @else { <app-avion-chargement texte="Chargement de votre réservation…" /><app-squelette [nombre]="2" [hauteur]="140" /> }
  `,
})
export class ReservationPage {
  private api = inject(Api);
  private notifier = inject(Notifier);
  private horloge = inject(Horloge);
  protected auth = inject(Auth);
  id = input.required<string>();

  protected res = signal<Reservation | null>(null);
  protected introuvable = signal(false);
  protected catalogue = signal<Catalogue | null>(null);
  protected plan = signal<Plan | null>(null);
  protected siegePassagers = signal<PassagerSiege[]>([]);
  protected actifSiege = signal(0);
  protected occupe = signal(false);
  protected modificationOuverte = signal(false);
  protected autresVols = signal<Vol[]>([]);
  protected apercu = signal<ApercuModification | null>(null);

  protected formPassagers: FormPassager[] = [];
  protected formOptions: FormOption[] = [];
  protected assurance = false;
  protected types = TYPES;
  protected aujourdhui = new Date().toISOString().slice(0, 10);
  private prixSiege = new Map<string, number>();
  private expireVerifie = false;

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
  private charger(id: number, rechargerPlan = true) {
    this.api.reservation(id).subscribe({
      next: (r) => { this.appliquer(r); if (rechargerPlan) this.chargerPlan(r); },
      error: () => this.introuvable.set(true),
    });
  }

  private chargerPlan(r: Reservation) {
    this.api.plan(r.vol.id, r.id).subscribe((p) => {
      this.plan.set(p);
      this.prixSiege = new Map(p.plan.flatMap((rg) => rg.sieges.map((s) => [s.code, rg.prix] as [string, number])));
    });
  }

  private appliquer(r: Reservation) {
    this.res.set(r);
    this.expireVerifie = r.statut !== 'EN_ATTENTE';
    this.formPassagers = r.passagers.map((p) => ({ id: p.id, type: p.type, nom: p.nom ?? '', prenom: p.prenom ?? '',
      dateNaissance: p.dateNaissance ?? '', categorie: p.categorie, prixBillet: p.prixBillet }));
    this.formOptions = r.passagers.map((p) => ({ id: p.id, siege: p.siege, bagage: p.bagage, prioritaire: p.prioritaire, repas: p.repas }));
    this.assurance = r.assurance;
    this.rafraichirSieges();
    const premier = r.passagers.find((p) => p.type !== 'BEBE');
    if (!this.actifSiege() || !r.passagers.some((p) => p.id === this.actifSiege())) this.actifSiege.set(premier?.id ?? 0);
  }

  protected editable(r: Reservation) { return r.statut === 'EN_ATTENTE' || (r.statut === 'CONFIRMEE' && r.modifiable); }
  protected libelleStatut(s: string) { return ({ EN_ATTENTE: 'En attente de paiement', CONFIRMEE: 'Confirmée', ANNULEE: 'Annulée', EXPIREE: 'Expirée' } as Record<string, string>)[s]; }
  protected enregistre(r: Reservation) { return r.passagers.some((p) => p.enregistre); }
  protected rembourse(r: Reservation) { return -r.paiements.filter((p) => p.type === 'REMBOURSEMENT').reduce((s, p) => s + p.montant, 0); }
  protected typeDe(id: number) { return this.formPassagers.find((p) => p.id === id)?.type; }
  protected typeActif() { return this.typeDe(this.actifSiege()); }
  protected nomDe(id: number) {
    const p = this.formPassagers.find((x) => x.id === id);
    return p && (p.prenom || p.nom) ? `${p.prenom} ${p.nom}` : `Passager (${TYPES[p?.type ?? 'ADULTE']})`;
  }
  protected passagersAvecSiege() { return this.siegePassagers().filter((p) => p.type !== 'BEBE'); }

  // ---------------------------------------------------------------- sièges
  private rafraichirSieges() {
    this.siegePassagers.set(this.formPassagers.map((p) => ({
      id: p.id, type: p.type, libelle: this.nomDe(p.id),
      siege: this.formOptions.find((o) => o.id === p.id)?.siege ?? null,
    })));
  }

  protected choisirSiege(code: string) {
    const o = this.formOptions.find((x) => x.id === this.actifSiege());
    if (!o) return;
    o.siege = o.siege === code ? null : code;
    this.rafraichirSieges();
    // passe automatiquement au passager suivant qui n'a pas encore de siège
    const suivant = this.siegePassagers().find((p) => p.type !== 'BEBE' && !p.siege);
    if (o.siege && suivant) this.actifSiege.set(suivant.id);
  }

  protected viderSiege() {
    const o = this.formOptions.find((x) => x.id === this.actifSiege());
    if (o) { o.siege = null; this.rafraichirSieges(); }
  }

  // ---------------------------------------------------------------- totaux (estimation avant enregistrement)
  protected estimation() {
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
  private sauverPassagers() {
    return this.api.majPassagers(this.res()!.id, this.formPassagers.map((p) => ({ id: p.id, nom: p.nom, prenom: p.prenom, dateNaissance: p.dateNaissance || null })));
  }
  private sauverOptions() {
    return this.api.majOptions(this.res()!.id, { assurance: this.assurance,
      passagers: this.formOptions.map((o) => ({ id: o.id, siege: o.siege, bagage: o.bagage, prioritaire: o.prioritaire, repas: o.repas })) });
  }
  /** Enregistre d'abord les passagers puis les options, dans cet ordre. */
  private sauverTout() { return this.sauverPassagers().pipe(switchMap((r) => { this.res.set(r); return this.sauverOptions(); })); }

  // Enregistrer une section ne doit pas écraser les modifications non enregistrées des autres sections
  protected enregistrerPassagers() {
    this.sauverPassagers().subscribe((r) => {
      this.res.set(r);
      this.formPassagers = r.passagers.map((p) => ({ id: p.id, type: p.type, nom: p.nom ?? '', prenom: p.prenom ?? '',
        dateNaissance: p.dateNaissance ?? '', categorie: p.categorie, prixBillet: p.prixBillet }));
      this.rafraichirSieges();
      this.notifier.ok('Passagers enregistrés');
    });
  }
  protected enregistrerOptions() {
    this.sauverOptions().subscribe((r) => {
      this.res.set(r);
      this.formOptions = r.passagers.map((p) => ({ id: p.id, siege: p.siege, bagage: p.bagage, prioritaire: p.prioritaire, repas: p.repas }));
      this.assurance = r.assurance;
      this.rafraichirSieges();
      this.notifier.ok('Vos choix sont enregistrés');
    });
  }

  // ---------------------------------------------------------------- paiement
  protected payer(p: PaiementRequest) {
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
  protected annuler(r: Reservation) {
    const msg = r.totaux.paye > 0 && !r.assurance
      ? 'Annuler cette réservation ? SANS assurance annulation, votre billet ne sera PAS remboursé.'
      : 'Annuler cette réservation ?' + (r.totaux.paye > 0 ? ' Vous serez remboursé intégralement (assurance annulation).' : '');
    if (!confirm(msg)) return;
    this.api.annuler(r.id).subscribe((maj) => { this.appliquer(maj); this.notifier.ok('Réservation annulée'); });
  }

  protected faireEnregistrement() {
    const r = this.res()!;
    this.api.enregistrement(r.id).subscribe((maj) => { this.appliquer(maj); this.chargerPlan(maj); this.notifier.ok('Enregistrement effectué : votre carte d\'embarquement est prête'); });
  }

  protected imprimer() { window.print(); }

  protected titreBillets(r: Reservation) { return this.enregistre(r) ? "🎫 Cartes d'embarquement" : '🎫 Mes billets'; }
  protected typeDocument(r: Reservation) { return this.enregistre(r) ? "CARTE D'EMBARQUEMENT" : 'BILLET ÉLECTRONIQUE'; }
  protected libelleSiege(p: { type: TypePassager; siege: string | null }) { return p.type === 'BEBE' ? 'Sur genoux' : (p.siege ?? "À l'enregistrement"); }

  protected libelleBagage(b: Bagage) { return this.catalogue()?.bagages.find((x) => x.code === b)?.libelle ?? b; }

  /** Contenu du QR code : référence, passager, vol, date et siège (ce que lirait un portique). */
  protected contenuQr(r: Reservation, p: { id: number; nom: string | null; prenom: string | null; siege: string | null }) {
    return ['BA1', r.reference, r.vol.numeroVol, r.vol.dateDepart.slice(0, 16), `${(p.nom ?? '').toUpperCase()}/${p.prenom ?? ''}`, p.siege ?? '-', p.id].join('|');
  }

  protected retourParams(r: Reservation) {
    const nb = (t: TypePassager) => r.passagers.filter((p) => p.type === t).length;
    return { origine: r.vol.destination, destination: r.vol.origine, adultes: nb('ADULTE'), enfants: nb('ENFANT') || null, bebes: nb('BEBE') || null };
  }

  // ---------------------------------------------------------------- modification du vol
  protected ouvrirModification() {
    const r = this.res()!;
    this.modificationOuverte.set(true); this.apercu.set(null);
    this.api.vols({ origine: r.vol.origine, destination: r.vol.destination, disponibles: true }).subscribe((vols) =>
      this.autresVols.set(vols.filter((v) => v.id !== r.vol.id && new Date(v.dateDepart).getTime() > Date.now() && v.origine.toLowerCase() === r.vol.origine.toLowerCase() && v.destination.toLowerCase() === r.vol.destination.toLowerCase())));
  }
  protected fermerModification() { this.modificationOuverte.set(false); this.apercu.set(null); }
  protected voirApercu(v: Vol) { this.api.apercuModification(this.res()!.id, v.id).subscribe((a) => this.apercu.set(a)); }

  protected confirmerModification(p: PaiementRequest) {
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
