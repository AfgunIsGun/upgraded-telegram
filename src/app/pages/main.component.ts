import {Component, inject, signal} from '@angular/core';
import {NavigationEnd, Router} from '@angular/router';
import {filter} from 'rxjs/operators';
import {IonIcon, IonLabel, IonRouterOutlet, IonTabBar, IonTabButton, IonTabs} from '@ionic/angular/standalone';
import {home, person, settings} from 'ionicons/icons';
import {addIcons} from 'ionicons';
import {TranslocoPipe} from '@ngneat/transloco';

@Component({
  selector: 'app-main',
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.scss'],
  standalone: true,
  imports: [IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel, IonRouterOutlet, TranslocoPipe],
})
export class MainComponent {
  private router = inject(Router);
  hideTabBar = signal(false);

  constructor() {
    addIcons({home, person, settings});

    this.router.events.pipe(filter(event => event instanceof NavigationEnd)).subscribe(event => {
      this.hideTabBar.set((event as NavigationEnd).urlAfterRedirects.startsWith('/output'));
    });
  }
}
