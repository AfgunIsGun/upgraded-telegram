import { Component, OnInit, OnDestroy, inject, signal, effect, ViewChild, AfterViewInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Store } from '@ngxs/store';
import { PoseViewerSetting } from '../../modules/settings/settings.state';
import { AsyncPipe, TitleCasePipe } from '@angular/common';
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
import { fromEvent } from 'rxjs';
import { tap } from 'rxjs/operators';

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
export class OutputOnlyComponent implements OnInit, OnDestroy, AfterViewInit {
  private store = inject(Store);
  private route = inject(ActivatedRoute);
  private tabBar: HTMLElement;

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
    this.tabBar = document.querySelector('ion-tab-bar');
    if (this.tabBar) {
      this.tabBar.style.display = 'none';
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

    document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
  }

  ngAfterViewInit(): void {
    if (this.poseViewer) {
      const pose = this.poseViewer.poseEl().nativeElement;
      fromEvent(pose, 'ended$')
        .pipe(
          tap(async () => {
            setTimeout(async () => {
              await pose.play();
            }, 1500);
          })
        )
        .subscribe();
    }
  }

  ngOnDestroy(): void {
    if (this.tabBar) {
      this.tabBar.style.display = 'flex'; // Or its original display value
    }
    document.removeEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
  }

  handleVisibilityChange(): void {
    if (!this.poseViewer) {
      return;
    }

    const pose = this.poseViewer.poseEl().nativeElement;
    if (document.hidden) {
      pose.pause();
    } else {
      pose.play();
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
