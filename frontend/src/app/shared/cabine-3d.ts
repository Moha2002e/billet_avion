import { Component, ElementRef, OnDestroy, afterNextRender, effect, input, output, signal, untracked, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Button } from 'primeng/button';
import { ProgressSpinner } from 'primeng/progressspinner';
import { Slider } from 'primeng/slider';
import { Tag } from 'primeng/tag';
import type * as THREE from 'three';
import { ClasseSiege, Plan } from '../models';
import { PassagerSiege } from './seat-map';

/** Distance entre deux rangées de sièges, en mètres. */
const PAS = 0.86;
/** Position latérale (en mètres) des sièges A à F : trois à gauche, couloir au centre, trois à droite. */
const X_SIEGE = [-1.55, -1.05, -0.55, 0.55, 1.05, 1.55];
/** Demi-largeur de la cabine. */
const DEMI_LARGEUR = 1.95;
/** Hauteur sous plafond. */
const HAUTEUR = 2.25;
/** Hauteur des yeux dans l'allée. */
const HAUTEUR_ALLEE = 1.5;
/** Distance entre la caméra et la rangée regardée. */
const RECUL = 1.4;
/** Couleur de l'appuie-tête selon la catégorie du siège (mêmes couleurs que la légende du plan 2D). */
const COULEUR_TETIERE: Record<ClasseSiege, number> = { PREMIUM: 0x7c2d12, AVANT: 0xe07f3c, ESPACE: 0xf5b301, STANDARD: 0xcfd4da };
/** Libellé de chaque catégorie de siège. */
const LIBELLE: Record<ClasseSiege, string> = {
  PREMIUM: 'Premium - grand confort', AVANT: "Avant de l'appareil", ESPACE: 'Grand espace jambes', STANDARD: 'Standard',
};
/** Couleurs de cheveux des passagers déjà installés (pour la décoration). */
const CHEVEUX = [0x3b2a20, 0x1c1c1c, 0x8a5a2b, 0xc9a15b, 0x5a3825, 0x777777];

/** Un siège de la scène 3D : ses morceaux et son état. */
interface Siege3d {
  code: string; rang: number; classe: ClasseSiege; prix: number; libre: boolean; x: number; z: number;
  groupe: THREE.Group; tetiere: THREE.Mesh; tete?: THREE.Mesh; badge?: THREE.Mesh;
}

/**
 * Vue 3D de la cabine (Three.js) : on avance dans l'allée, on regarde autour avec la souris ou le doigt,
 * et on clique sur un siège pour le choisir. Même contrat que le plan 2D (SeatMap) : mêmes entrées, même sortie.
 * Three.js est chargé à la demande (pas dans le chargement initial du site).
 */
@Component({
  selector: 'app-cabine-3d',
  imports: [FormsModule, Button, ProgressSpinner, Slider, Tag],
  template: `
    <div class="cabine3d" #zone tabindex="0" (keydown)="touche($event, true)" (keyup)="touche($event, false)" aria-label="Vue 3D de la cabine">
      <canvas #canvas></canvas>
      @if (chargement()) { <div class="voile"><p-progress-spinner strokeWidth="4" ariaLabel="Chargement de la cabine" /><span>Construction de la cabine…</span></div> }
      <div class="aide">Glissez pour regarder · molette ou ↑ ↓ pour avancer · cliquez un siège</div>
      @if (survol(); as s) { <div class="bulle" [style.left.px]="s.x" [style.top.px]="s.y">{{ s.texte }}</div> }
      <div class="infos">
        @if (vueSiege() && siegeVue()) { <p-tag [value]="'Vue depuis le siège ' + siegeVue()" icon="pi pi-eye" severity="secondary" /> }
        @else { <p-tag [value]="'Rangée ' + rang()" icon="pi pi-map-marker" severity="secondary" /> }
        <p-tag [value]="classeRang()" severity="warn" />
        @if (message()) { <p-tag [value]="message()" severity="danger" icon="pi pi-exclamation-triangle" /> }
      </div>
    </div>
    <div class="commandes">
      <p-button icon="pi pi-angle-double-left" severity="secondary" [outlined]="true" (onClick)="avancer(1)" ariaLabel="Reculer d'une rangée" label="Reculer" />
      <p-slider class="curseur" [min]="1" [max]="maxRang()" [ngModel]="rang()" (ngModelChange)="allerA($event)" ariaLabel="Position dans la cabine" />
      <p-button icon="pi pi-angle-double-right" severity="secondary" [outlined]="true" (onClick)="avancer(-1)" ariaLabel="Avancer d'une rangée" label="Avancer" iconPos="right" />
      <p-button [label]="vueSiege() ? 'Revenir dans l\\'allée' : 'Voir depuis mon siège'" icon="pi pi-eye" [outlined]="!vueSiege()" (onClick)="basculerVueSiege()" />
    </div>
  `,
  styles: `
    .cabine3d { position: relative; width: 100%; height: min(520px, 70vh); border-radius: 14px; overflow: hidden; background: #1d1a18; outline: none; touch-action: none; }
    .cabine3d:focus-visible { box-shadow: 0 0 0 3px var(--p-primary-400); }
    canvas { width: 100%; height: 100%; display: block; cursor: grab; }
    canvas:active { cursor: grabbing; }
    .voile { position: absolute; inset: 0; display: flex; flex-direction: column; gap: 10px; align-items: center; justify-content: center; color: #fff; background: rgba(29,26,24,.85); }
    .aide { position: absolute; top: 10px; left: 50%; transform: translateX(-50%); font-size: .75rem; color: #fff; background: rgba(0,0,0,.45); padding: 4px 12px; border-radius: 20px; pointer-events: none; white-space: nowrap; max-width: 95%; overflow: hidden; text-overflow: ellipsis; }
    .bulle { position: absolute; transform: translate(-50%, -140%); background: #fff; color: #1f2937; padding: 4px 10px; border-radius: 8px; font-size: .8rem; font-weight: 600; box-shadow: 0 4px 12px rgba(0,0,0,.35); pointer-events: none; white-space: nowrap; }
    .infos { position: absolute; bottom: 12px; left: 0; right: 0; display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; pointer-events: none; }
    .commandes { display: flex; align-items: center; gap: 12px; margin-top: 12px; flex-wrap: wrap; }
    .curseur { flex: 1; min-width: 140px; }
  `,
})
export class Cabine3d implements OnDestroy {
  /** Plan de cabine du vol (sièges, catégories, disponibilités). */
  plan = input.required<Plan>();
  /** Passagers de la réservation avec leur siège actuel. */
  passagers = input.required<PassagerSiege[]>();
  /** Identifiant du passager dont on choisit le siège. */
  actif = input.required<number>();
  /** Émis quand l'utilisateur clique sur un siège valide (code du siège). */
  choisir = output<string>();
  /** Émis si la 3D ne peut pas s'afficher (WebGL indisponible) : la page repasse au plan 2D. */
  indisponible = output<void>();

  private zone = viewChild.required<ElementRef<HTMLDivElement>>('zone');
  private canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');

  /** Vrai pendant la construction de la scène. */
  protected chargement = signal(true);
  /** Rangée devant laquelle se trouve la caméra. */
  protected rang = signal(1);
  /** Nombre de rangées (borne du curseur). */
  protected maxRang = signal(1);
  /** Texte de survol (code, catégorie, prix) et sa position à l'écran. */
  protected survol = signal<{ texte: string; x: number; y: number } | null>(null);
  /** Message d'erreur temporaire (siège refusé). */
  protected message = signal('');
  /** Vrai quand la caméra est placée sur le siège du passager actif. */
  protected vueSiege = signal(false);
  /** Catégorie de la rangée regardée (texte affiché). */
  protected classeRang = signal('');
  /** Code du siège depuis lequel on regarde (vue depuis le siège), ou vide. */
  protected siegeVue = signal('');

  private T!: typeof import('three');
  private rounded!: typeof import('three/addons/geometries/RoundedBoxGeometry.js').RoundedBoxGeometry;
  private renderer?: THREE.WebGLRenderer;
  private scene?: THREE.Scene;
  private camera?: THREE.PerspectiveCamera;
  private raycaster?: THREE.Raycaster;
  private sieges = new Map<string, Siege3d>();
  private cibles: THREE.Object3D[] = [];
  private ressources: { dispose(): void }[] = [];
  private textures = new Map<string, THREE.Texture>();
  private matTetiere = new Map<ClasseSiege, THREE.MeshStandardMaterial>();
  private matOccupe!: THREE.MeshStandardMaterial;
  private matChoisi!: THREE.MeshStandardMaterial;
  private matMien!: THREE.MeshStandardMaterial;
  private pret = false;
  private volConstruit = -1;
  private rangeesConstruites = 0;
  private raf = 0;
  private dernier = 0;
  private observateur?: ResizeObserver;
  private touches = new Set<string>();
  private yaw = 0;
  private pitch = 0;
  private cibleX = 0;
  private cibleY = HAUTEUR_ALLEE;
  private cibleZ = RECUL;
  private survolCode: string | null = null;
  private glisse = { actif: false, x: 0, y: 0, deplace: 0 };
  private temoinMessage: ReturnType<typeof setTimeout> | undefined;
  private ecouteurs: { cible: EventTarget; type: string; fn: EventListenerOrEventListenerObject; options?: AddEventListenerOptions }[] = [];

  /** Démarre la scène après le premier affichage et resynchronise la scène quand les entrées changent. */
  constructor() {
    afterNextRender(() => { void this.demarrer(); });
    effect(() => {
      this.plan(); this.passagers(); this.actif();
      untracked(() => this.synchroniser());
    });
  }

  /** Libère le moteur 3D : animation, écouteurs, géométries, matériaux, textures et contexte WebGL. */
  ngOnDestroy(): void {
    cancelAnimationFrame(this.raf);
    clearTimeout(this.temoinMessage);
    this.observateur?.disconnect();
    for (const e of this.ecouteurs) e.cible.removeEventListener(e.type, e.fn, e.options);
    this.viderScene();
    this.textures.forEach((t) => t.dispose());
    this.renderer?.dispose();
    this.pret = false;
  }

  // ---------------------------------------------------------------- démarrage

  /** Charge Three.js à la demande, crée le rendu WebGL, construit la cabine et lance l'animation. */
  private async demarrer(): Promise<void> {
    try {
      this.T = await import('three');
      this.rounded = (await import('three/addons/geometries/RoundedBoxGeometry.js')).RoundedBoxGeometry;
      const T = this.T;
      this.renderer = new T.WebGLRenderer({ canvas: this.canvas().nativeElement, antialias: true, powerPreference: 'high-performance' });
    } catch {
      this.indisponible.emit();   // pas de WebGL : on retombe sur le plan 2D
      return;
    }
    const T = this.T;
    this.renderer!.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer!.setClearColor(0x1d1a18);
    this.camera = new T.PerspectiveCamera(68, 1, 0.05, 60);
    this.raycaster = new T.Raycaster();
    this.brancherEvenements();
    this.observateur = new ResizeObserver(() => this.redimensionner());
    this.observateur.observe(this.zone().nativeElement);
    this.pret = true;
    this.synchroniser();
    this.redimensionner();
    this.chargement.set(false);
    this.raf = requestAnimationFrame(this.boucle);
  }

  /** Reconstruit la cabine si le vol change, sinon met simplement à jour l'état des sièges. */
  private synchroniser(): void {
    if (!this.pret) return;
    const p = this.plan();
    if (p.volId !== this.volConstruit || p.rangees !== this.rangeesConstruites) this.construire();
    this.rafraichirEtats();
    this.placerCamera();
  }

  /** Adapte la taille du rendu et la perspective à la taille de la zone. */
  private redimensionner(): void {
    if (!this.renderer || !this.camera) return;
    const z = this.zone().nativeElement;
    const w = Math.max(1, z.clientWidth), h = Math.max(1, z.clientHeight);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  // ---------------------------------------------------------------- construction de la scène

  /** Position avant-arrière (en mètres) d'une rangée : la rangée 1 est à l'arrière, les suivantes vers le nez. */
  private zRang(rang: number): number { return -(rang - 1) * PAS; }

  /** Supprime tous les objets de la scène et libère leurs ressources (géométries, matériaux). */
  private viderScene(): void {
    for (const r of this.ressources) r.dispose();
    this.ressources = [];
    this.sieges.clear();
    this.cibles = [];
    this.scene = undefined;
  }

  /** Enregistre un objet jetable pour le libérer plus tard. @param r géométrie ou matériau @returns le même objet */
  private suivre<R extends { dispose(): void }>(r: R): R { this.ressources.push(r); return r; }

  /** Crée un matériau standard suivi pour libération. @param couleur la couleur @param options options (émission, rugosité) */
  private materiau(couleur: number, options: THREE.MeshStandardMaterialParameters = {}): THREE.MeshStandardMaterial {
    return this.suivre(new this.T.MeshStandardMaterial({ color: couleur, roughness: 0.85, metalness: 0.05, ...options }));
  }

  /** Crée un parallélépipède placé dans la scène. @param w largeur @param h hauteur @param d profondeur @param mat matériau @param x position x @param y position y @param z position z */
  private boite(w: number, h: number, d: number, mat: THREE.Material, x: number, y: number, z: number): THREE.Mesh {
    const m = new this.T.Mesh(this.suivre(new this.T.BoxGeometry(w, h, d)), mat);
    m.position.set(x, y, z);
    this.scene!.add(m);
    return m;
  }

  /** Construit toute la cabine : coque, lumières, hublots, plaques de rangées et sièges. */
  private construire(): void {
    const T = this.T, plan = this.plan();
    this.viderScene();
    this.scene = new T.Scene();
    this.scene.background = new T.Color(0x1d1a18);
    this.scene.fog = new T.Fog(0x1d1a18, 7, 26);
    this.volConstruit = plan.volId;
    this.rangeesConstruites = plan.rangees;
    this.maxRang.set(plan.rangees);

    // Lumières : lumière d'ambiance chaude + lumière qui suit la caméra
    this.scene.add(new T.HemisphereLight(0xfff1de, 0x4a4036, 1.9));
    const suiveuse = new T.PointLight(0xffe6c4, 7, 14, 1.4);
    suiveuse.name = 'suiveuse';
    this.scene.add(suiveuse);

    const zAvant = this.zRang(plan.rangees) - 2.2, zArriere = 2.9;
    const longueur = zArriere - zAvant, milieu = (zAvant + zArriere) / 2;

    // Coque : sol, couloir, plafond, bande lumineuse, murs, coffres à bagages
    this.boite(DEMI_LARGEUR * 2, 0.05, longueur, this.materiau(0x2d2f3a), 0, -0.025, milieu);
    this.boite(0.7, 0.012, longueur, this.materiau(0x40434f), 0, 0.006, milieu);
    this.boite(DEMI_LARGEUR * 2, 0.05, longueur, this.materiau(0xe8e2da), 0, HAUTEUR, milieu);
    this.boite(0.4, 0.02, longueur, this.materiau(0xfff1d6, { emissive: 0xfff1d6, emissiveIntensity: 1.4 }), 0, HAUTEUR - 0.04, milieu);
    const mur = this.materiau(0xd9d1c7), coffre = this.materiau(0xcbc2b5), dessousCoffre = this.materiau(0xa89f93);
    for (const cote of [-1, 1]) {
      this.boite(0.05, HAUTEUR, longueur, mur, cote * DEMI_LARGEUR, HAUTEUR / 2, milieu);
      this.boite(1.0, 0.3, longueur, coffre, cote * (DEMI_LARGEUR - 0.5), HAUTEUR - 0.4, milieu);
      this.boite(1.0, 0.03, longueur, dessousCoffre, cote * (DEMI_LARGEUR - 0.5), HAUTEUR - 0.56, milieu);
    }
    // Cloisons avant (porte) et arrière
    this.boite(DEMI_LARGEUR * 2, HAUTEUR, 0.05, this.materiau(0xc9bdac), 0, HAUTEUR / 2, zAvant);
    this.boite(0.95, 1.95, 0.04, this.materiau(0xb79d7a), 0, 0.98, zAvant + 0.04);
    this.boite(0.5, 0.12, 0.03, this.materiau(0xfff1d6, { emissive: 0xfff1d6, emissiveIntensity: 1.2 }), 0, 2.05, zAvant + 0.05);
    this.boite(DEMI_LARGEUR * 2, HAUTEUR, 0.05, this.materiau(0xc9bdac), 0, HAUTEUR / 2, zArriere);

    // Hublots, plaques de numéro de rangée et petits balisages lumineux du couloir
    const verre = this.materiau(0xcfe8ff, { emissive: 0xbfe0ff, emissiveIntensity: 0.9 });
    const cadre = this.materiau(0x6b645c);
    const balise = this.materiau(0xffc766, { emissive: 0xffb347, emissiveIntensity: 1.6 });
    const geoBalise = this.suivre(new T.BoxGeometry(0.07, 0.02, 0.07));
    for (let r = 1; r <= plan.rangees; r++) {
      const z = this.zRang(r);
      for (const cote of [-1, 1]) {
        this.boite(0.05, 0.46, 0.34, cadre, cote * (DEMI_LARGEUR - 0.03), 1.15, z);
        const v = new T.Mesh(this.suivre(new T.PlaneGeometry(0.26, 0.34)), verre);
        v.position.set(cote * (DEMI_LARGEUR - 0.06), 1.15, z);
        v.rotation.y = cote < 0 ? Math.PI / 2 : -Math.PI / 2;
        this.scene.add(v);
        const plaque = new T.Mesh(this.suivre(new T.PlaneGeometry(0.2, 0.14)), new T.MeshBasicMaterial({ map: this.texte(String(r), '#ffffff', '#1f2937', 64, 44), transparent: true }));
        plaque.position.set(cote * 1.0, 1.9, z);
        plaque.rotation.y = cote < 0 ? Math.PI / 2 : -Math.PI / 2;
        this.scene.add(plaque);
        const b = new T.Mesh(geoBalise, balise);
        b.position.set(cote * 0.34, 0.02, z - PAS / 2);
        this.scene.add(b);
      }
    }

    // Matériaux des sièges : un par catégorie, plus les états occupé / choisi / mien
    this.matTetiere.clear();
    (Object.keys(COULEUR_TETIERE) as ClasseSiege[]).forEach((c) => this.matTetiere.set(c, this.materiau(COULEUR_TETIERE[c], { roughness: 0.6 })));
    this.matOccupe = this.materiau(0x8b9096, { roughness: 0.9 });
    this.matChoisi = this.materiau(0x1f2937, { roughness: 0.5, emissive: 0x3a4a6a, emissiveIntensity: 0.5 });
    // Siège du passager actif : blanc lumineux qui pulse (bien distinct des sièges orange)
    this.matMien = this.materiau(0xffffff, { roughness: 0.4, emissive: 0xffe9c9, emissiveIntensity: 0.8 });

    // Sièges
    const corps = this.materiau(0x4b4f5c, { roughness: 0.95 }), accoudoir = this.materiau(0x2f3139);
    const R = this.rounded;
    const geoCoussin = this.suivre(new R(0.46, 0.12, 0.5, 3, 0.04));
    const geoDossier = this.suivre(new R(0.46, 0.58, 0.1, 3, 0.04));
    const geoTetiere = this.suivre(new R(0.36, 0.2, 0.12, 3, 0.05));
    const geoAccoudoir = this.suivre(new T.BoxGeometry(0.04, 0.05, 0.4));
    const geoLabel = this.suivre(new T.PlaneGeometry(0.3, 0.12));
    for (const rangee of plan.plan) {
      for (const s of rangee.sieges) {
        const lettre = 'ABCDEF'.indexOf(s.code.slice(-1));
        if (lettre < 0) continue;
        const x = X_SIEGE[lettre], z = this.zRang(rangee.rang);
        const g = new T.Group();
        g.position.set(x, 0, z);
        const coussin = new T.Mesh(geoCoussin, corps); coussin.position.set(0, 0.42, 0.02);
        const dossier = new T.Mesh(geoDossier, corps); dossier.position.set(0, 0.78, 0.2);
        const tetiere = new T.Mesh(geoTetiere, this.matTetiere.get(rangee.classe)!); tetiere.position.set(0, 1.17, 0.2);
        const etiquette = new T.Mesh(geoLabel, new T.MeshBasicMaterial({ map: this.texte(s.code, '#f5f1ea', '#4b4f5c', 96, 40), transparent: true }));
        etiquette.position.set(0, 0.6, 0.255);
        g.add(coussin, dossier, tetiere, etiquette);
        for (const dx of [-0.24, 0.24]) { const a = new T.Mesh(geoAccoudoir, accoudoir); a.position.set(dx, 0.58, 0.02); g.add(a); }
        for (const m of [coussin, dossier, tetiere, etiquette]) { m.userData['code'] = s.code; this.cibles.push(m); }
        this.scene.add(g);
        this.sieges.set(s.code, { code: s.code, rang: rangee.rang, classe: rangee.classe, prix: rangee.prix, libre: s.libre, x, z, groupe: g, tetiere });
      }
    }
  }

  /**
   * Fabrique (ou réutilise) une petite texture de texte pour les étiquettes de siège et les plaques de rangée.
   * @param texte le texte à écrire @param couleurTexte couleur du texte @param fond couleur du fond @param largeur largeur en pixels @param hauteur hauteur en pixels
   */
  private texte(texte: string, couleurTexte: string, fond: string, largeur: number, hauteur: number): THREE.Texture {
    const cle = `${texte}|${couleurTexte}|${fond}|${largeur}`;
    const existante = this.textures.get(cle);
    if (existante) return existante;
    const c = document.createElement('canvas');
    c.width = largeur * 2; c.height = hauteur * 2;
    const g = c.getContext('2d')!;
    g.fillStyle = fond; g.beginPath(); g.roundRect(0, 0, c.width, c.height, 14); g.fill();
    g.fillStyle = couleurTexte; g.font = `bold ${hauteur * 1.15}px system-ui, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(texte, c.width / 2, c.height / 2 + 2);
    const t = new this.T.CanvasTexture(c);
    t.colorSpace = this.T.SRGBColorSpace;
    this.textures.set(cle, t);
    return t;
  }

  /** Met à jour l'apparence de chaque siège : occupé (avec un passager), choisi, siège du passager actif, ou libre. */
  private rafraichirEtats(): void {
    if (!this.scene) return;
    const T = this.T, plan = this.plan();
    const etat = new Map<string, boolean>();
    for (const r of plan.plan) for (const s of r.sieges) etat.set(s.code, s.libre);
    const numeros = new Map<string, number>();
    this.passagers().forEach((p, i) => { if (p.siege) numeros.set(p.siege, i + 1); });
    const siegeActif = this.passagers().find((p) => p.id === this.actif())?.siege ?? null;
    for (const s of this.sieges.values()) {
      s.libre = etat.get(s.code) ?? s.libre;
      const numero = numeros.get(s.code);
      let tete = !s.libre && !numero;
      if (numero) s.tetiere.material = s.code === siegeActif ? this.matMien : this.matChoisi;
      else s.tetiere.material = s.libre ? this.matTetiere.get(s.classe)! : this.matOccupe;
      if (tete && !s.tete) {
        const cheveux = CHEVEUX[(s.rang * 7 + s.code.charCodeAt(s.code.length - 1)) % CHEVEUX.length];
        s.tete = new T.Mesh(this.suivre(new T.SphereGeometry(0.11, 14, 12)), this.materiau(cheveux, { roughness: 1 }));
        s.tete.position.set(0, 1.42, 0.2);
        s.groupe.add(s.tete);
      }
      if (s.tete) s.tete.visible = tete;
      if (numero) {
        if (!s.badge) {
          s.badge = new T.Mesh(this.suivre(new T.PlaneGeometry(0.26, 0.26)), new T.MeshBasicMaterial({ transparent: true }));
          s.badge.position.set(0, 1.6, 0.27);
          s.groupe.add(s.badge);
        }
        (s.badge.material as THREE.MeshBasicMaterial).map = this.texte(String(numero), '#ffffff', '#e07f3c', 56, 56);
        (s.badge.material as THREE.MeshBasicMaterial).needsUpdate = true;
        s.badge.visible = true;
      } else if (s.badge) s.badge.visible = false;
    }
  }

  // ---------------------------------------------------------------- caméra et navigation

  /** Place la cible de la caméra : dans l'allée devant la rangée choisie, ou sur le siège du passager actif. */
  private placerCamera(): void {
    const siege = this.siegeActif();
    if (this.vueSiege() && siege) {
      this.cibleX = siege.x; this.cibleY = 1.2; this.cibleZ = siege.z + 0.12;
    } else {
      this.cibleX = 0; this.cibleY = HAUTEUR_ALLEE;
      this.cibleZ = Math.min(this.cibleZ, 1.9);
    }
  }

  /** Siège (objet 3D) actuellement choisi par le passager actif, ou undefined. */
  private siegeActif(): Siege3d | undefined {
    const code = this.passagers().find((p) => p.id === this.actif())?.siege;
    return code ? this.sieges.get(code) : undefined;
  }

  /** Borne la position de la caméra entre l'arrière et l'avant de la cabine. @param z la position demandée */
  private limiterZ(z: number): number {
    const mini = this.zRang(this.rangeesConstruites) + 1.0;
    return Math.max(mini, Math.min(1.9, z));
  }

  /** Avance ou recule d'une rangée. @param delta +1 pour reculer d'une rangée, -1 pour avancer */
  protected avancer(delta: number): void {
    this.vueSiege.set(false);
    this.allerA(Math.max(1, Math.min(this.maxRang(), this.rang() + delta)));
  }

  /** Va devant une rangée précise (curseur). @param rang le numéro de rangée */
  protected allerA(rang: number): void {
    this.vueSiege.set(false);
    this.cibleX = 0; this.cibleY = HAUTEUR_ALLEE;
    this.cibleZ = this.limiterZ(this.zRang(rang) + RECUL);
    this.rang.set(rang);
  }

  /** Passe de la vue dans l'allée à la vue depuis le siège du passager actif, et inversement. */
  protected basculerVueSiege(): void {
    if (this.vueSiege()) { this.vueSiege.set(false); this.allerA(this.rang()); return; }
    const siege = this.siegeActif();
    if (!siege) { this.afficherMessage("Choisissez d'abord un siège pour voir la vue depuis celui-ci"); return; }
    this.vueSiege.set(true);
    this.siegeVue.set(siege.code);
    this.yaw = 0; this.pitch = 0;
    this.placerCamera();
  }

  /**
   * Gère les touches du clavier (flèches, ZQSD, WASD) pour avancer et tourner la tête.
   * @param e l'événement clavier @param enfoncee vrai à l'appui, faux au relâchement
   */
  protected touche(e: KeyboardEvent, enfoncee: boolean): void {
    const k = e.key.toLowerCase();
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'z', 's', 'a', 'q', 'd'].includes(k)) {
      e.preventDefault();
      if (enfoncee) this.touches.add(k); else this.touches.delete(k);
    }
  }

  // ---------------------------------------------------------------- souris, doigt, molette

  /** Ajoute un écouteur d'événement mémorisé pour pouvoir le retirer à la destruction. @param cible l'objet écouté @param type le nom de l'événement @param fn la fonction appelée @param options options d'écoute */
  private ecouter(cible: EventTarget, type: string, fn: (e: any) => void, options?: AddEventListenerOptions): void {
    cible.addEventListener(type, fn, options);
    this.ecouteurs.push({ cible, type, fn, options });
  }

  /** Branche la souris, le doigt et la molette sur le canvas. */
  private brancherEvenements(): void {
    const c = this.canvas().nativeElement;
    this.ecouter(c, 'pointerdown', (e: PointerEvent) => {
      this.glisse = { actif: true, x: e.clientX, y: e.clientY, deplace: 0 };
      c.setPointerCapture(e.pointerId);
      this.zone().nativeElement.focus({ preventScroll: true });
    });
    this.ecouter(c, 'pointermove', (e: PointerEvent) => {
      if (this.glisse.actif) {
        const dx = e.clientX - this.glisse.x, dy = e.clientY - this.glisse.y;
        this.glisse.x = e.clientX; this.glisse.y = e.clientY; this.glisse.deplace += Math.abs(dx) + Math.abs(dy);
        this.yaw = Math.max(-1.3, Math.min(1.3, this.yaw + dx * 0.004));
        this.pitch = Math.max(-0.6, Math.min(0.5, this.pitch + dy * 0.003));
        this.survol.set(null);
      } else this.survoler(e);
    });
    this.ecouter(c, 'pointerup', (e: PointerEvent) => {
      const clic = this.glisse.actif && this.glisse.deplace < 6;
      this.glisse.actif = false;
      if (clic) this.cliquer(e);
    });
    this.ecouter(c, 'pointerleave', () => { this.survol.set(null); this.survolerCode(null); });
    this.ecouter(c, 'wheel', (e: WheelEvent) => {
      e.preventDefault();
      this.vueSiege.set(false);
      this.cibleX = 0; this.cibleY = HAUTEUR_ALLEE;
      this.cibleZ = this.limiterZ(this.cibleZ - e.deltaY * 0.004);
    }, { passive: false });
  }

  /**
   * Trouve le siège sous le pointeur.
   * @param e l'événement du pointeur @returns le siège touché, ou undefined
   */
  private siegeSousPointeur(e: PointerEvent): Siege3d | undefined {
    if (!this.camera || !this.raycaster) return undefined;
    const r = this.canvas().nativeElement.getBoundingClientRect();
    const ndc = new this.T.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.camera);
    const touche = this.raycaster.intersectObjects(this.cibles, false)[0];
    return touche ? this.sieges.get(touche.object.userData['code']) : undefined;
  }

  /** Affiche l'info-bulle du siège survolé (code, catégorie, prix, disponibilité). @param e l'événement du pointeur */
  private survoler(e: PointerEvent): void {
    const s = this.siegeSousPointeur(e);
    this.survolerCode(s?.code ?? null);
    if (!s) { this.survol.set(null); return; }
    const r = this.zone().nativeElement.getBoundingClientRect();
    const prix = s.prix > 0 ? `+${s.prix} €` : 'gratuit';
    this.survol.set({ texte: `${s.code} · ${LIBELLE[s.classe]} · ${s.libre ? prix : 'occupé'}`, x: e.clientX - r.left, y: e.clientY - r.top });
  }

  /** Agrandit légèrement l'appuie-tête du siège survolé. @param code le siège survolé, ou null */
  private survolerCode(code: string | null): void {
    if (code === this.survolCode) return;
    if (this.survolCode) this.sieges.get(this.survolCode)?.tetiere.scale.setScalar(1);
    if (code) this.sieges.get(code)?.tetiere.scale.setScalar(1.18);
    this.survolCode = code;
  }

  /** Clic sur un siège : le choisit s'il est autorisé, sinon explique pourquoi pas. @param e l'événement du pointeur */
  private cliquer(e: PointerEvent): void {
    const s = this.siegeSousPointeur(e);
    if (!s) return;
    const refus = this.refus(s);
    if (refus) this.afficherMessage(refus); else { this.message.set(''); this.choisir.emit(s.code); }
  }

  /**
   * Indique pourquoi un siège ne peut pas être choisi par le passager actif (mêmes règles que le serveur).
   * @param s le siège @returns le motif de refus, ou null si le siège est autorisé
   */
  private refus(s: Siege3d): string | null {
    const type = this.passagers().find((p) => p.id === this.actif())?.type ?? 'ADULTE';
    if (type === 'BEBE') return 'Un bébé voyage sur les genoux d\'un adulte : pas de siège';
    const pris = this.passagers().find((p) => p.siege === s.code);
    if (pris && pris.id !== this.actif()) return 'Siège déjà choisi par un autre passager';
    if (!s.libre && !pris) return `Le siège ${s.code} est occupé`;
    if (type === 'ENFANT' && s.classe === 'ESPACE') return 'Pas de sortie de secours pour un enfant';
    return null;
  }

  /** Affiche un message d'erreur pendant 3 secondes. @param texte le message */
  private afficherMessage(texte: string): void {
    this.message.set(texte);
    clearTimeout(this.temoinMessage);
    this.temoinMessage = setTimeout(() => this.message.set(''), 3000);
  }

  // ---------------------------------------------------------------- animation

  /**
   * Image d'animation : déplacement fluide de la caméra, clavier, pulsation du siège choisi, rendu.
   * @param t l'horodatage fourni par le navigateur (millisecondes)
   */
  private boucle = (t: number): void => {
    this.raf = requestAnimationFrame(this.boucle);
    if (!this.renderer || !this.scene || !this.camera) return;
    const dt = Math.min(0.05, (t - this.dernier) / 1000 || 0.016);
    this.dernier = t;
    const avance = (this.touches.has('arrowup') || this.touches.has('w') || this.touches.has('z') ? 1 : 0) - (this.touches.has('arrowdown') || this.touches.has('s') ? 1 : 0);
    const tourne = (this.touches.has('arrowleft') || this.touches.has('a') || this.touches.has('q') ? 1 : 0) - (this.touches.has('arrowright') || this.touches.has('d') ? 1 : 0);
    if (avance && !this.vueSiege()) this.cibleZ = this.limiterZ(this.cibleZ - avance * dt * 3.2);
    if (tourne) this.yaw = Math.max(-1.3, Math.min(1.3, this.yaw + tourne * dt * 1.6));
    const k = Math.min(1, dt * 7);
    const cam = this.camera;
    cam.position.x += (this.cibleX - cam.position.x) * k;
    cam.position.y += (this.cibleY - cam.position.y) * k;
    cam.position.z += (this.cibleZ - cam.position.z) * k;
    cam.rotation.set(this.pitch, this.yaw, 0, 'YXZ');
    this.scene.getObjectByName('suiveuse')?.position.set(cam.position.x, cam.position.y + 0.4, cam.position.z - 0.5);
    this.matMien.emissiveIntensity = 0.55 + 0.35 * Math.sin(t / 220);
    // Rangée regardée (mise à jour de l'affichage seulement si elle change)
    const rang = Math.max(1, Math.min(this.rangeesConstruites, Math.round(-(cam.position.z - RECUL) / PAS) + 1));
    if (rang !== this.rang() && !this.vueSiege()) this.rang.set(rang);
    const classe = this.plan().plan[rang - 1]?.classe;
    const texte = classe ? LIBELLE[classe] : '';
    if (texte !== this.classeRang()) this.classeRang.set(texte);
    this.renderer.render(this.scene, cam);
  };

  // ---------------------------------------------------------------- aide aux tests

  /**
   * Position à l'écran (en pixels, relative à la page) de l'appuie-tête d'un siège. Sert aux tests automatisés
   * pour cliquer sur un siège précis.
   * @param code le siège (ex. 7B)
   * @returns les coordonnées, ou null si le siège est hors champ ou inconnu
   */
  projeter(code: string): { x: number; y: number } | null {
    const s = this.sieges.get(code);
    if (!s || !this.camera) return null;
    const v = new this.T.Vector3(s.x, 1.17, s.z + 0.2).project(this.camera);
    if (v.z > 1 || Math.abs(v.x) > 1 || Math.abs(v.y) > 1) return null;
    const r = this.canvas().nativeElement.getBoundingClientRect();
    return { x: r.left + ((v.x + 1) / 2) * r.width, y: r.top + ((1 - v.y) / 2) * r.height };
  }
}
