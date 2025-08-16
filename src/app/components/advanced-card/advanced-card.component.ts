import {Component, Input, OnInit} from '@angular/core';
import {CommonModule} from '@angular/common';
import {IonicModule} from '@ionic/angular';

@Component({
  selector: 'app-advanced-card',
  standalone: true,
  imports: [CommonModule, IonicModule],
  template: `
    <div
      class="advanced-card"
      [class.interactive]="interactive"
      [class.glowing]="glowing"
      [class.floating]="floating"
      (click)="onCardClick()">
      <!-- Animated background -->
      <div class="card-background"></div>

      <!-- Gradient border -->
      <div class="gradient-border" *ngIf="gradientBorder"></div>

      <!-- Content -->
      <div class="card-content">
        <div class="card-header" *ngIf="title || subtitle">
          <h3 class="card-title" *ngIf="title">{{ title }}</h3>
          <p class="card-subtitle" *ngIf="subtitle">{{ subtitle }}</p>
        </div>

        <div class="card-body">
          <ng-content></ng-content>
        </div>

        <div class="card-footer" *ngIf="hasFooterContent">
          <ng-content select="[slot=footer]"></ng-content>
        </div>
      </div>

      <!-- Floating particles -->
      <div class="particles" *ngIf="particles">
        <div class="particle" *ngFor="let particle of particleArray"></div>
      </div>

      <!-- Hover effect overlay -->
      <div class="hover-overlay"></div>
    </div>
  `,
  styleUrls: ['./advanced-card.component.scss'],
})
export class AdvancedCardComponent implements OnInit {
  @Input() title?: string;
  @Input() subtitle?: string;
  @Input() interactive: boolean = false;
  @Input() glowing: boolean = false;
  @Input() floating: boolean = false;
  @Input() gradientBorder: boolean = false;
  @Input() particles: boolean = false;
  @Input() particleCount: number = 20;

  particleArray: number[] = [];
  hasFooterContent: boolean = false;

  ngOnInit() {
    if (this.particles) {
      this.particleArray = Array(this.particleCount)
        .fill(0)
        .map((_, i) => i);
    }
  }

  onCardClick() {
    if (this.interactive) {
      // Add click animation or emit event
      console.log('Advanced card clicked');
    }
  }
}
