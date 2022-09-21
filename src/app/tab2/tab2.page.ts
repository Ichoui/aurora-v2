import { Component } from '@angular/core';
import { cities, CodeLocalisation, Coords } from '../models/cities';
import { AuroraService } from '../aurora.service';
import { NavController } from '@ionic/angular';
import { ACEModule, Kp27day, KpForecast } from '../models/aurorav2';
import { Geolocation } from '@ionic-native/geolocation/ngx';
import { ErrorTemplate } from '../shared/broken/broken.model';
import { StorageService } from '../storage.service';

// import 'moment/locale/fr';
const API_CALL_NUMBER = 1; // nombre de fois où une API est appelé sur cette page

@Component({
    selector: 'app-tab2',
    templateUrl: 'tab2.page.html',
    styleUrls: ['tab2.page.scss'],
})
export class Tab2Page {
    loading = true;
    tabLoading: string[] = [];

    localisation: string;
    // getCode: string;
    coords: Coords;
    city: string;
    country: string;

    eventRefresh: any;

    // Data inputs
    moduleACE: any = {} as any;
    kpForecast: KpForecast[] = [] as any;
    kpForecast27days: Kp27day[] = [] as any;

    dataError = new ErrorTemplate(null);

    constructor(private _geoloc: Geolocation,
                private _storageService: StorageService,
                private _navCtrl: NavController, private _auroraService: AuroraService) {
    }

    ionViewWillEnter() {
        this.tabLoading = [];
        // Cheminement en fonction si la localisation est pré-set ou si géoloc
        this._storageService.getData('localisation').then(
            (codeLocation: CodeLocalisation) => {
                if (!codeLocation) {
                    this._userLocalisation();
                } else if (codeLocation.code === 'currentLocation' || codeLocation.code === 'marker') {
                    this._getExistingLocalisation(codeLocation.lat, codeLocation.long);
                } else {
                    this._chooseExistingCity(codeLocation.code);
                }
            },
            error => {
                console.warn('Local storage error', error);
                this.dataError = new ErrorTemplate({
                    value: true,
                    status: error.status,
                    message: error.statusText,
                    error,
                });
            }
        );
    }

    /**
     * Seulement premier accès sur cette page
     * Déterminer la localisation actuelle de l'utilisateur
     */
    private _userLocalisation() {
        this._geoloc
            .getCurrentPosition()
            .then(resp => {
                this._getExistingLocalisation(resp.coords.latitude, resp.coords.longitude);
            })
            .catch(error => {
                console.warn('Geolocalisation error', error);
                this.loading = false;
                this.dataError = new ErrorTemplate({
                    value: true,
                    status: error.status,
                    message: error.statusText,
                    error,
                });
            });
    }

    /**
     * @param lat {number}
     * @param long {number}
     * Set les coords avec celles existante en localStorage (déjà eu accès tab3 et marker placé ou géolocalisé)
     * */
    private _getExistingLocalisation(lat: number, long: number) {
        this.coords = {
            latitude: lat,
            longitude: long,
        };
        this._getSolarWind();
    }

    /**
     * @param code slug de la ville pour pouvoir récupérer les données liées au code
     * Choisir une des villes pré-enregistrées
     */
    private _chooseExistingCity(code: string): void {
        const city = cities.find(res => res.code === code);
        this.city = city.ville;
        this.country = city.pays;

        this.coords = {
            latitude: city.latitude,
            longitude: city.longitude,
        };
        this._getSolarWind();
    }

    /**
     * Récupère les données ACE de vent solaire & nowcast
     * */
    private _getSolarWind(): void {
        this._auroraService.auroraLiveV2$(this.coords.latitude, this.coords.longitude).subscribe(
            (ace: ACEModule) => {
                this.loading = false;
                this.moduleACE = ace;
                this.kpForecast27days = ace['kp:27day'];
                this.kpForecast = ace['kp:forecast'];
                this._trickLoading('1st');
            },
            error => {
                console.warn('Wind Solar data error', error);
                this.loading = false;
                this.dataError = new ErrorTemplate({
                    value: true,
                    status: error.status,
                    message: error.statusText,
                    error,
                });
            }
        );
    }

    /**
     * @param count {string}
     * Gère le loader
     * Lorsque tout les appels API sont passés et le tableau égal à la valeur API_CALL_NUMBER, débloque le loader
     * */
    private _trickLoading(count: string): void {
        this.tabLoading.push(count);
        if (this.tabLoading.length === API_CALL_NUMBER) {
            this.loading = false;
            this.eventRefresh ? this.eventRefresh.target.complete() : '';
        }
    }

    /**
     @param event {event} renvoyé par le rafraichissement
     * Attends les retours des résultats d'API pour retirer l'animation visuelle
     * */
    doRefresh(event) {
        this.tabLoading = [];
        this.eventRefresh = event;
        this._getSolarWind();
    }
}
