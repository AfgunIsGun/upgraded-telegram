import { Component, Input } from '@angular/core';
import { IonicModule } from '@ionic/angular';

@Component({
  selector: 'app-floating-action-button',
  standalone: true,
  imports: [IonicModule],
  template: `
    <ion-fab vertical="bottom" horizontal="end" slot="fixed">
      <ion-fab-button [color]="color" class="floating-fab">
        <ion-icon [name]="icon"></ion-icon>
      </ion-fab-button>
    </ion-fab>
  `,
  styleUrls: ['./floating-action-button.component.scss']
})
export class FloatingActionButtonComponent {
  @Input() icon: string = 'add';
  @Input() color: string = 'primary';
}

