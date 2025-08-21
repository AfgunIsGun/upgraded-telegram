import { Component, OnInit, OnDestroy, inject, signal, effect, ViewChild, AfterViewInit, PLATFORM_ID, ElementRef } from '@angular/core';
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
import { fromEvent, Subscription } from 'rxjs';
import { tap } from 'rxjs/operators';

type Status = 'loading' | 'error' | 'success' | 'idle' | 'translating' | 'preview';

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
  private platformId = inject(PLATFORM_ID);
  private tabBar: HTMLElement;
  private poseEndedSubscription: Subscription;

  @ViewChild(SkeletonPoseViewerComponent) poseViewer: SkeletonPoseViewerComponent;
  @ViewChild('videoPlayer') videoPlayer: ElementRef<HTMLVideoElement>;

  // State as signals
  status = signal<Status>('idle');
  error = signal<string | null>(null);

  // Input from query params
  inputText = signal('');
  fromLanguage = signal('');
  toLanguage = signal('');

  // Data from store
  pose = toSignal(this.store.select(state => state.translate.signedLanguagePose));
  videoUrl = toSignal(this.store.select(state => state.translate.signedLanguageVideo));
  poseViewerSetting = toSignal(this.store.select(state => state.settings.poseViewer));

  constructor() {
    effect(() => {
      const pose = this.pose();
      if (pose && this.status() === 'loading') {
          this.status.set('preview');
          // Request video as soon as pose is available to reduce preview lag
          this.store.dispatch(new SetSetting('receiveVideo', true));
      }
    });

    effect(() => {
      const video = this.videoUrl();
      if (video && this.status() === 'preview') {
          this.status.set('translating');
          setTimeout(() => {
            if (this.videoPlayer) {
              this.videoPlayer.nativeElement.playbackRate = 0.001;
            }
          }, 0);
      }
    });

    effect(() => {
      const text = this.inputText();
      if (text && this.status() === 'idle') {
        this.processTranslation();
      }
    });
  }

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.tabBar = document.querySelector('ion-tab-bar');
      if (this.tabBar) {
        this.tabBar.style.display = 'none';
      }

      setTimeout(() => {
        const acceptAllButton = document.querySelector('button[data-role="all"]');
        if (acceptAllButton) {
          (acceptAllButton as HTMLElement).click();
        }
      }, 2000); // Increased timeout
    }

    this.store.dispatch([
      new SetSetting('receiveVideo', false), // Initially, we want the pose
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

  ngAfterViewInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      setTimeout(() => {
        if (this.poseViewer) {
          const pose = this.poseViewer.poseEl().nativeElement;
          this.poseEndedSubscription = fromEvent(pose, 'ended$')
            .pipe(
              tap(async () => {
                pose.play();
              })
            )
            .subscribe();
        }
      }, 0);
    }

    if (this.videoPlayer) {
      this.videoPlayer.nativeElement.playbackRate = 0.001;
    }
  }

  ngOnDestroy(): void {
    if (isPlatformBrowser(this.platformId)) {
      if (this.tabBar) {
        this.tabBar.style.display = 'flex'; // Or its original display value
      }
    }
    if (this.poseEndedSubscription) {
      this.poseEndedSubscription.unsubscribe();
    }
  }

  onVideoEnded() {
    setTimeout(() => {
      if (this.videoPlayer && this.videoPlayer.nativeElement) {
        this.videoPlayer.nativeElement.play();
      }
    }, 1500);
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
