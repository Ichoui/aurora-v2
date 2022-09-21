import { Component, Input, OnInit } from '@angular/core';
import { Coords } from '../../models/cities';
import * as moment from 'moment';
import 'moment/locale/fr';
import { Cloudy, Currently, Daily, DailyTemp, Hourly, IconsOWM, LottiesValues, Unit } from '../../models/weather';
import { Chart, registerables } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { BehaviorSubject, Subject } from 'rxjs';
import { Storage } from '@ionic/storage';
import { AnimationOptions } from 'ngx-lottie';
import { ELocales } from '../../models/locales';
import { StorageService } from '../../storage.service';
Chart.register(...registerables);

@Component({
  selector: 'app-meteo',
  templateUrl: './meteo.component.html',
  styleUrls: ['./meteo.component.scss'],
})
export class MeteoComponent implements OnInit {
  @Input() coords: Coords;

  @Input()
  set currentWeatherInput(value: Currently) {
    this.currentWeather$.next(value);
  }

  get currentWeatherInput(): Currently {
    return this.currentWeather$.getValue();
  }

  @Input()
  set hourlyWeatherInput(value: Hourly[]) {
    this.hourlyWeather$.next(value);
  }

  get hourlyWeatherInput(): Hourly[] {
    return this.hourlyWeather$.getValue();
  }

  @Input()
  set sevenDayWeatherInput(value: Daily[]) {
    this.sevenDayWeather$.next(value);
  }

  get sevenDayWeatherInput() {
    return this.sevenDayWeather$.getValue();
  }

  @Input() utc: number;
  @Input() unit: Unit;

  // Observable
  currentWeather$ = new BehaviorSubject<Currently>(null);
  hourlyWeather$ = new BehaviorSubject<Hourly[]>(null);
  sevenDayWeather$ = new BehaviorSubject<Daily[]>(null);

  // Var reflettant observables
  currentWeather: Currently;

  sunset: string | moment.Moment;
  sunrise: string | moment.Moment;
  actualDate: string | moment.Moment;
  Unit = Unit;

  dataNumberInCharts = 8;
  private _temps: number[] = [];
  private _nextHours = [];

  cloudy: Cloudy[] = [];
  days: Daily[] = [];

  todayTemp: DailyTemp;
  // lotties
  lottieConfig: AnimationOptions;
  readonly widthCurrent = 110;
  readonly heightCurrent = 110;

  private _locale: string;
  private _englishFormat = false; // h, hh : 12 && H,HH : 24

  constructor(private _storageService: StorageService) {}

  ngOnInit() {
    this._storageService.getData('locale').then((locale: ELocales) => {
      this._locale = locale;
      if (locale === ELocales.EN) { this._englishFormat = true; }
      this.todayForecast();
      this.nextHoursForecast();
      this.sevenDayForecast();
    });

    // Convert seconds to hours
    this.utc = this.utc / 60 / 60;
  }

  todayForecast() {
    this.currentWeather$.pipe().subscribe((res: Currently) => {
      this.currentWeather = res;
      this.sunset = this.manageDates(res.sunset, this._englishFormat ? 'h:mm A' : 'H:mm');
      this.sunrise = this.manageDates(res.sunrise, this._englishFormat ? 'h:mm A' : 'H:mm');
      this._lotties(this.calculateWeaterIcons(res));
      this.actualDate = this.manageDates(moment().unix(), this._englishFormat ? 'dddd Do of MMMM, hh:mm:ss' : 'dddd DD MMMM, HH:mm:ss');
    });
  }

  nextHoursForecast() {
    this.hourlyWeather$.pipe().subscribe((res: Hourly[]) => {
      this.cloudy = [];
      res.forEach((hours: Hourly, i) => {
        if (this._temps.length < this.dataNumberInCharts && i % 2 === 0) {
          this._temps.push(Math.round(hours.temp));
          this._nextHours.push(this.manageDates(hours.dt, this._englishFormat ? 'hh A' : 'HH:mm'));
        }
        const cloudy: Cloudy = {
          percent: hours.clouds,
          time: this.manageDates(hours.dt, this._englishFormat ? 'hhA' : 'HH:mm'),
        };
        if (this.cloudy.length < this.dataNumberInCharts) {
          this.cloudy.push(cloudy);
        }
      });
    });
    new Chart('next-hours', {
      type: 'line',
      plugins: [ChartDataLabels],
      data: {
        labels: this._nextHours,
        datasets: [
          {
            data: this._temps,
            backgroundColor: [
              'rgba(105, 191, 175, 0.4)',
              'rgba(105, 191, 175, 0.4)',
              'rgba(105, 191, 175, 0.4)',
              'rgba(105, 191, 175, 0.4)',
              'rgba(105, 191, 175, 0.4)',
              'rgba(105, 191, 175, 0.4)',
              'rgba(105, 191, 175, 0.4)',
              'rgba(105, 191, 175, 0.4)',
            ],
            borderColor: [
              'rgba(140, 255, 234, 0.4)',
              'rgba(105, 191, 175, 0.4)',
              'rgba(105, 191, 175, 0.4)',
              'rgba(105, 191, 175, 0.4)',
              'rgba(105, 191, 175, 0.4)',
              'rgba(105, 191, 175, 0.4)',
              'rgba(105, 191, 175, 0.4)',
              'rgba(105, 191, 175, 0.4)',
            ],
            borderWidth: 2,
            pointBorderWidth: 3,
            pointHitRadius: 10,
            pointHoverBackgroundColor: '#8cffea',
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          tooltip : { enabled: false},
          legend: {display: false},
          datalabels: {
            align: 'end',
            color: '#8cffea',
            font: {
              family: 'Oswald-SemiBold',
              size: 15,
            },
            formatter(value) {
              return value + '°';
            }
          },
        },
        scales: {
          x:
            {
              grid: {
                display: false,
              },
              ticks: {
                color: '#949494',
                font: (ctx, options) => ({family: 'Oswald-SemiBold'})
              },
            },
          y:
            {
              display: false,
              grid: {
                display: false,
              },
            }
        },
        layout: {
          padding: {
            top: 30,
          },
        },
      },
    });
  }

  sevenDayForecast() {
    this.sevenDayWeather$.pipe().subscribe((res: Daily[]) => {
      this.days = [];
      res.forEach((day: Daily, index) => {
        if (index === 0) {
          this.todayTemp = day.temp;
        } else {
          day.date = this.manageDates(day.dt, 'ddd');
          this.days.push(day);
        }
      });
    });
  }

  /**
   * Permet de gérer les dates qui sont au format Unix Timestamp (seconds)
   * @param date {number} Date retournée par l'API
   * @param format {string} Permet de choisir le formatage de la date. (ex: YYYY MM DD)
   * .utc() pour gérer l'heure au format UTC et Input() Offset pour ajouter/soustraires les heures
   * */
  manageDates(date: number, format?: string): string | moment.Moment {
    let unixToLocal;
    unixToLocal = moment.unix(date).utc().add(this.utc, 'h').locale(this._locale);
    // if (this.language === 'fr') {
    // } else {
    //   unixToLocal = moment.unix(date).add(this.utc, 'h').locale('en');
    // }
    return unixToLocal.format(format);
  }

  /**
   * @param currentWeather {Currently}
   * Permet de calculer le lottie à afficher. Comporte des cas regroupés ou cas particulier
   * https://openweathermap.org/weather-conditions#Weather-Condition-Codes-2
   * */
  calculateWeaterIcons(currentWeather: Currently): LottiesValues {
    const mainIcon = currentWeather.weather[0].main;
    const idIcon = currentWeather.weather[0].id;
    const icon = currentWeather.weather[0].icon;

    let daytime,
      night = false;

    if (icon.slice(-1) === 'd') {
      daytime = true;
    } else if (icon.slice(-1) === 'n') {
      night = true;
    }

    switch (mainIcon) {
      case IconsOWM.DRIZZLE:
      case IconsOWM.RAIN:
        return LottiesValues.RAIN;

      case IconsOWM.CLEAR:
        if (currentWeather.wind_speed >= 50) {
          return LottiesValues.WIND;
        } else {
          if (daytime) {
            return LottiesValues.CLEAR_DAY;
          }

          if (night) {
            return LottiesValues.CLEAR_NIGHT;
          }
        }
        break;

      case IconsOWM.CLOUDS:
        if (idIcon === 804) {
          return LottiesValues.VERY_CLOUDY;
        }
        if (daytime) {
          if (idIcon === 803) {
            return LottiesValues.PARTLY_CLOUDY_DAY;
          } else {
            return LottiesValues.CLOUDY_DAY;
          }
        }
        if (night) {
          if (idIcon === 803) {
            return LottiesValues.PARTLY_CLOUDY_NIGHT;
          } else {
            return LottiesValues.CLOUDY_NIGHT;
          }
        }
        break;

      case IconsOWM.THUNDERSTORM:
        return LottiesValues.THUNDERSTORM;

      case IconsOWM.SNOW:
        return LottiesValues.SNOW;

      default:
        if (daytime) {
          return LottiesValues.CLEAR_DAY;
        }
        if (night) {
          return LottiesValues.CLEAR_NIGHT;
        }
    }
  }

  /** 
  http://www.toujourspret.com/techniques/orientation/topographie/rose_vents1.gif
    */
  calculateWindDeg(windSpeed): string {
    if (windSpeed >= 337.5 && windSpeed < 22.5) {
      return 'N';
    } else if (windSpeed >= 22.5 && windSpeed < 67.5) {
      return 'NE';
    } else if (windSpeed >= 67.5 && windSpeed < 112.5) {
      return 'E';
    } else if (windSpeed >= 112.5 && windSpeed < 157.5) {
      return 'SE';
    } else if (windSpeed >= 157.5 && windSpeed < 202.5) {
      return 'S';
    } else if (windSpeed >= 202.5 && windSpeed < 247.5) {
      return this._locale === ELocales.FR ? 'SO' : 'SW';
    } else if (windSpeed >= 247.5 && windSpeed < 292.5) {
      return this._locale === ELocales.FR ? 'O' : 'W';
    } else if (windSpeed >= 292.5 && windSpeed < 337.5) {
      return this._locale === ELocales.FR ? 'NO' : 'NW';
    }
  }

  calculateUV(indexUv): string {
    if (indexUv >= 0 && indexUv < 3) {
      return this._locale === ELocales.FR ? 'Faible' : 'Low';
    } else if (indexUv >= 3 && indexUv < 6) {
      return this._locale === ELocales.FR ? 'Modéré' : 'Moderate';
    } else if (indexUv >= 6 && indexUv < 8) {
      return this._locale === ELocales.FR ? 'Élevé' : 'High';
    } else if (indexUv >= 8 && indexUv < 11) {
      return this._locale === ELocales.FR ? 'Très élevé' : 'Very high';
    } else if (indexUv >= 11) {
      return this._locale === ELocales.FR ? 'Extrême' : 'Extreme';
    }
  }

  private _lotties(icon: LottiesValues): void {
    // if (icon === 'fog' || icon === 'snow' || icon === 'wind') {
    // not used atm, keep for sevenDays lotties evol
    //   this.widthCurrent = this.heightCurrent = 65;
    //   this.width7Fcst = this.height7Fcst = 35;
    // }

    this.lottieConfig = {
      path: `assets/lotties/lottie-${icon}.json`,
      // path: `assets/lotties/lottie-very-cloudy-night.json`,
      renderer: 'svg',
      autoplay: true,
      loop: true,
    };
  }
}
