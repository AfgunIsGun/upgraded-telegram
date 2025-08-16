import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-loading-animation',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="loading-container" [class.visible]="isVisible">
      <div class="loading-spinner">
        <div class="spinner-ring"></div>
        <div class="spinner-ring"></div>
        <div class="spinner-ring"></div>
      </div>
      <p class="loading-text" *ngIf="message">{{ message }}</p>
    </div>
  `,
  styleUrls: ['./loading-animation.component.scss']
})
export class LoadingAnimationComponent {
  @Input() isVisible: boolean = false;
  @Input() message: string = 'Loading...';
}

