import { Component, OnInit, OnDestroy, inject, signal, effect, ViewChild, PLATFORM_ID } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Store } from '@ngxs/store';
import { PoseViewerSetting } from '../../modules/settings/settings.state';
import { AsyncPipe, TitleCasePipe, isPlatformBrowser } from '@angular/common';
import { SkeletonPoseViewerComponent } from '../translate/pose-viewers/skeleton-pose-viewer/skeleton-pose-viewer.component';
import { HumanPoseViewerComponent } from '../translate/pose-viewers/human-pose-viewer/human-pose-viewer.component';
import { AvatarPoseViewerComponent } from '../translate/pose-viewers/avatar-pose-viewer/avatar-pose-viewer.component';
import {
  SetSpokenLanguageText,
  SetSpokenLanguage,
  SetSignedLanguage,
} from '../../modules/translate/translate.actions';
import { SetSetting } from '../../modules/settings/settings.actions';
import { toSignal } from '@angular/core/rxjs-interop';

type Status = 'loading' | 'error' | 'success' | 'idle' | 'translating';

@Component({
  selector: 'app-output-only',
  templateUrl: './output-only.component.html',
  styleUrls: ['./output-only.component.scss'],
  standalone: true,
  imports: [
    AsyncPipe,
    TitleCasePipe,
    SkeletonPoseViewerComponent,
    HumanPoseViewerComponent,
    AvatarPoseViewerComponent,
  ],
})
export class OutputOnlyComponent implements OnInit, OnDestroy {
  private store = inject(Store);
  private route = inject(ActivatedRoute);
  private platformId = inject(PLATFORM_ID);
  private tabBar: HTMLElement;
  private cookieConsentElement: HTMLElement;
  private observer: MutationObserver;

  @ViewChild(SkeletonPoseViewerComponent) poseViewer: SkeletonPoseViewerComponent;

  // State as signals
  status = signal<Status>('idle');
  error = signal<string | null>(null);
  
  // Input from query params
  inputText = signal('');
  fromLanguage = signal('');
  toLanguage = signal('');

  // Data from store
  videoUrl = toSignal(this.store.select(state => state.translate.signedLanguageVideo));
  pose = toSignal(this.store.select(state => state.translate.signedLanguagePose));
  poseViewerSetting = toSignal(this.store.select(state => state.settings.poseViewer));

  constructor() {
    effect(() => {
      const url = this.videoUrl();
      if (url) {
        this.status.set('translating');
      } else if (this.status() === 'translating' && !url) {
        // Remains in translating state, showing pose viewer
      } else if (this.status() !== 'error') {
        this.status.set('idle');
      }
    });

    effect(() => {
      const text = this.inputText();
      if (text && this.status() === 'idle') {
        this.processTranslation();
      }
    });
    
    effect(() => {
        const pose = this.pose();
        if (pose && this.status() === 'loading') {
            this.status.set('translating');
        }
    });
  }

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.tabBar = document.querySelector('ion-tab-bar');
      if (this.tabBar) {
        this.tabBar.style.display = 'none';
      }

      this.observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === 1 && (node as HTMLElement).classList.contains('cm')) {
              (node as HTMLElement).style.display = 'none';
            }
          });
        });
      });

      this.observer.observe(document.body, { childList: true, subtree: true });

      // Also try to hide it immediately
      this.cookieConsentElement = document.querySelector('.cm');
      if (this.cookieConsentElement) {
        this.cookieConsentElement.style.display = 'none';
      }
    }

    this.store.dispatch([
      new SetSetting('receiveVideo', true),
      new SetSetting('detectSign', false),
      new SetSetting('drawSignWriting', false),
      new SetSetting('drawPose', true),
      new SetSetting('poseViewer', 'pose'),
    ]);

    this.route.queryParams.subscribe(params => {
      this.status.set('idle'); // Reset status on new params
      this.inputText.set(params['text'] || '');
      this.fromLanguage.set(params['from'] || 'en');
      
      let toLang = params['to'] || 'ase';
      if (toLang === 'asl') toLang = 'ase';
      if (toLang === 'gsl') toLang = 'gsg';
      this.toLanguage.set(toLang);
    });
  }

  ngOnDestroy(): void {
    if (this.observer) {
      this.observer.disconnect();
    }
    if (isPlatformBrowser(this.platformId)) {
      if (this.tabBar) {
        this.tabBar.style.display = 'flex'; // Or its original display value
      }

      if (this.cookieConsentElement) {
        this.cookieConsentElement.style.display = 'block';
      }
    }
  }

  private async processTranslation(): Promise<void> {
    this.status.set('loading');
    this.error.set(null);
    try {
      await this.store.dispatch(new SetSpokenLanguage(this.fromLanguage())).toPromise();
      await this.store.dispatch(new SetSignedLanguage(this.toLanguage())).toPromise();
      await this.store.dispatch(new SetSpokenLanguageText(this.inputText())).toPromise();
    } catch (e) {
      console.error('Translation error:', e);
      this.error.set('Translation failed. Please try again.');
      this.status.set('error');
    }
  }

  retry(): void {
    this.processTranslation();
  }
  
  getLanguageDisplayName(code: string): string {
    const languageMap: { [key: string]: string } = {
      'en': 'English',
      'de': 'German',
      'fr': 'French',
      'es': 'Spanish',
      'ase': 'American Sign Language',
      'gsg': 'German Sign Language',
      'fsl': 'French Sign Language',
      'auto': 'Auto-detect'
    };

    return languageMap[code] || code.toUpperCase();
  }
}
