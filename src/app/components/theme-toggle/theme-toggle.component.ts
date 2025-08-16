import { Component, OnInit } from '@angular/core';
import { IonicModule } from '@ionic/angular';

@Component({
  selector: 'app-theme-toggle',
  standalone: true,
  imports: [IonicModule],
  template: `
    <ion-button 
      fill="clear" 
      (click)="toggleTheme()" 
      class="theme-toggle-btn">
      <ion-icon 
        [name]="isDark ? 'sunny' : 'moon'" 
        slot="icon-only">
      </ion-icon>
    </ion-button>
  `,
  styleUrls: ['./theme-toggle.component.scss']
})
export class ThemeToggleComponent implements OnInit {
  isDark = false;

  ngOnInit() {
    this.isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    this.applyTheme();
  }

  toggleTheme() {
    this.isDark = !this.isDark;
    this.applyTheme();
  }

  private applyTheme() {
    document.body.classList.toggle('dark-theme', this.isDark);
    localStorage.setItem('theme', this.isDark ? 'dark' : 'light');
  }
}

