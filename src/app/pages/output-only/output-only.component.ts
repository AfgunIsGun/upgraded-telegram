import {
  Component,
  OnInit,
  OnDestroy,
  inject,
  signal,
  effect,
  ViewChild,
  AfterViewInit,
  PLATFORM_ID,
  ElementRef,
} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {Store} from '@ngxs/store';
import {isPlatformBrowser} from '@angular/common';
import {SkeletonPoseViewerComponent} from '../translate/pose-viewers/skeleton-pose-viewer/skeleton-pose-viewer.component';
import {HumanPoseViewerComponent} from '../translate/pose-viewers/human-pose-viewer/human-pose-viewer.component';
import {AvatarPoseViewerComponent} from '../translate/pose-viewers/avatar-pose-viewer/avatar-pose-viewer.component';
import {SetSpokenLanguageText, SetSpokenLanguage, SetSignedLanguage} from '../../modules/translate/translate.actions';
import {SetSetting} from '../../modules/settings/settings.actions';
import {toSignal} from '@angular/core/rxjs-interop';
import {fromEvent, Subscription} from 'rxjs';
import {tap} from 'rxjs/operators';

import {FFmpeg} from '@ffmpeg/ffmpeg';

type Status = 'loading' | 'error' | 'success' | 'idle' | 'translating' | 'preview' | 'generating';

interface WordManifest {
  word: string;
  file: string;
}

@Component({
  selector: 'app-output-only',
  templateUrl: './output-only.component.html',
  styleUrls: ['./output-only.component.scss'],
  standalone: true,
  imports: [SkeletonPoseViewerComponent],
})
export class OutputOnlyComponent implements OnInit, OnDestroy, AfterViewInit {
  private store = inject(Store);
  private route = inject(ActivatedRoute);
  private platformId = inject(PLATFORM_ID);
  private tabBar: HTMLElement;
  private poseEndedSubscription: Subscription;
  private manifestPromise: Promise<void>;
  private wlaslManifest: WordManifest[] = [];
  private ffmpeg: FFmpeg;

  @ViewChild(SkeletonPoseViewerComponent) poseViewer: SkeletonPoseViewerComponent;
  @ViewChild('videoPlayer') videoPlayer: ElementRef<HTMLVideoElement>;

  // State as signals
  status = signal<Status>('idle');
  error = signal<string | null>(null);

  // Input from query params
  inputText = signal('');
  fromLanguage = signal('');
  toLanguage = signal('');
  outputType = signal('skeleton');

  // Data from store
  pose = toSignal(this.store.select(state => state.translate.signedLanguagePose));
  videoUrl = toSignal(this.store.select(state => state.translate.signedLanguageVideo));
  humanVideoUrl = signal<string | null>(null);
  poseViewerSetting = toSignal(this.store.select(state => state.settings.poseViewer));

  constructor() {
    effect(() => {
      const pose = this.pose();
      if (pose && this.status() === 'loading') {
        this.status.set('preview');
        this.store.dispatch(new SetSetting('receiveVideo', true));
      }
    });

    effect(() => {
      const video = this.videoUrl();
      if (video && this.status() === 'preview') {
        if (this.outputType() === 'human') {
          this.status.set('generating');
          this.generateHumanVideo(video);
        } else {
          this.status.set('translating');
          setTimeout(() => {
            if (this.videoPlayer) {
              this.videoPlayer.nativeElement.playbackRate = 1;
            }
          }, 0);
        }
      }
    });

    // Main trigger effect
    effect(() => {
      const text = this.inputText();
      if (text && this.status() === 'idle') {
        if (this.outputType() === 'human') {
          this.generateHumanVideo(text);
        } else {
          this.processTranslation();
        }
      }
    });
  }

  loadManifest(): Promise<void> {
    if (!this.manifestPromise) {
      // Only create the promise once
      this.manifestPromise = new Promise(async (resolve, reject) => {
        if (isPlatformBrowser(this.platformId)) {
          try {
            console.log('[Human Video] Fetching video manifest...');
            const response = await fetch('/assets/wlasl-manifest.json');
            const data = await response.json();
            this.wlaslManifest = data.words;
            console.log('[Human Video] Manifest loaded successfully.');
            resolve();
          } catch (e) {
            console.error('Failed to load WLASL manifest:', e);
            reject(e);
          }
        } else {
          resolve(); // Resolve immediately on server
        }
      });
    }
    return this.manifestPromise;
  }

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.tabBar = document.querySelector('ion-tab-bar');
      if (this.tabBar) {
        this.tabBar.style.display = 'none';
      }
      this.ffmpeg = new FFmpeg();
    }

    this.store.dispatch([
      new SetSetting('receiveVideo', false),
      new SetSetting('detectSign', false),
      new SetSetting('drawSignWriting', false),
      new SetSetting('drawPose', true),
      new SetSetting('poseViewer', 'pose'),
    ]);

    this.route.queryParams.subscribe(params => {
      this.status.set('idle');
      this.inputText.set(params['text'] || '');
      this.fromLanguage.set(params['from'] || 'en');

      let toLang = params['to'] || 'ase';
      if (toLang === 'asl') toLang = 'ase';
      if (toLang === 'gsl') toLang = 'gsg';
      this.toLanguage.set(toLang);
      this.outputType.set(params['output'] || 'skeleton');
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
      this.videoPlayer.nativeElement.playbackRate = 1;
    }
  }

  ngOnDestroy(): void {
    if (isPlatformBrowser(this.platformId) && this.tabBar) {
      this.tabBar.style.display = 'flex';
    }
    if (this.poseEndedSubscription) {
      this.poseEndedSubscription.unsubscribe();
    }
  }

  async generateHumanVideo(word: string): Promise<void> {
    this.status.set('generating');
    this.error.set(null);
    console.log(`[Human Video] Starting generation for: "${word}"`);

    try {
      await this.loadManifest();

      console.log(`[Human Video] Searching for phrase: "${word}"`);
      let manifestEntry = this.wlaslManifest.find(entry => entry.word === word);

      if (!manifestEntry) {
        console.log(`[Human Video] Phrase not found, searching for first word...`);
        const firstWord = word.split(' ')[0];
        manifestEntry = this.wlaslManifest.find(entry => entry.word === firstWord);
      }
      if (!manifestEntry) {
        throw new Error(`Video not found for word: "${word}"`);
      }
      console.log(`[Human Video] Found video: ${manifestEntry.file}`);

      const videoPath = `/assets/wlasl/${manifestEntry.word}/${manifestEntry.file}`;
      const videoResponse = await fetch(videoPath);
      if (!videoResponse.ok) {
        throw new Error(`Failed to fetch video: ${videoResponse.statusText}`);
      }
      const videoBlob = await videoResponse.blob();

      console.log('[Human Video] Displaying local video.');
      this.humanVideoUrl.set(URL.createObjectURL(videoBlob));
      this.status.set('success');
      setTimeout(() => this.videoPlayer.nativeElement.play(), 0);
    } catch (e) {
      console.error('Human video generation error:', e);
      this.error.set(e.message || 'Human video generation failed.');
      this.status.set('error');
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
    if (this.outputType() === 'human') {
      this.generateHumanVideo(this.inputText());
    } else {
      this.processTranslation();
    }
  }

  getLanguageDisplayName(code: string): string {
    const languageMap: {[key: string]: string} = {
      en: 'English',
      de: 'German',
      fr: 'French',
      es: 'Spanish',
      ase: 'American Sign Language',
      gsg: 'German Sign Language',
      fsl: 'French Sign Language',
      auto: 'Auto-detect',
    };

    return languageMap[code] || code.toUpperCase();
  }
}
