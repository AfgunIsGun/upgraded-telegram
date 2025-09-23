import { Component, OnInit, OnDestroy, inject, signal, effect, ViewChild, AfterViewInit, PLATFORM_ID, ElementRef } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Store } from '@ngxs/store';
import { isPlatformBrowser } from '@angular/common';
import { SkeletonPoseViewerComponent } from '../translate/pose-viewers/skeleton-pose-viewer/skeleton-pose-viewer.component';
import { HumanPoseViewerComponent } from '../translate/pose-viewers/human-pose-viewer/human-pose-viewer.component';
import { AvatarPoseViewerComponent } from '../translate/pose-viewers/avatar-pose-viewer/avatar-pose-viewer.component';
import { SetSpokenLanguageText, SetSpokenLanguage, SetSignedLanguage } from '../../modules/translate/translate.actions';
import { SetSetting } from '../../modules/settings/settings.actions';
import { toSignal } from '@angular/core/rxjs-interop';
import { fromEvent, Subscription } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Client } from '@gradio/client';
import { FFmpeg } from '@ffmpeg/ffmpeg';

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
  private ffmpeg: FFmpeg;
  private manifestPromise: Promise<void>;
  private wlaslManifest: WordManifest[] = [];

  @ViewChild(SkeletonPoseViewerComponent) poseViewer: SkeletonPoseViewerComponent;
  @ViewChild('videoPlayer') videoPlayer: ElementRef<HTMLVideoElement>;

  status = signal<Status>('idle');
  error = signal<string | null>(null);
  inputText = signal('');
  fromLanguage = signal('');
  toLanguage = signal('');
  outputType = signal('skeleton');
  pose = toSignal(this.store.select(state => state.translate.signedLanguagePose));
  videoUrl = toSignal(this.store.select(state => state.translate.signedLanguageVideo));
  humanVideoUrl = signal<string | null>(null);
  poseViewerSetting = toSignal(this.store.select(state => state.settings.poseViewer));

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.tabBar = document.querySelector('ion-tab-bar');
      if (this.tabBar) {
        this.tabBar.style.display = 'none';
      }
    }

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

    // Original skeleton effect for pose -> preview
    effect(() => {
      const pose = this.pose();
      if (pose && this.status() === 'loading') {
        this.status.set('preview');
        this.store.dispatch(new SetSetting('receiveVideo', true));
      }
    });

    // Original skeleton effect for video -> translating
    effect(() => {
      const video = this.videoUrl();
      if (video && this.status() === 'preview' && this.outputType() === 'skeleton') {
        this.status.set('translating');
      }
    });
  }

  loadManifest(): Promise<void> {
    if (!this.manifestPromise) { // Only create the promise once
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

  async ngOnInit(): Promise<void> {
    await this.loadManifest();

    if (isPlatformBrowser(this.platformId)) {
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
      this.humanVideoUrl.set(null);
      this.inputText.set(params['text']?.toLowerCase() || '');
      this.fromLanguage.set(params['from'] || 'en');
      this.toLanguage.set(params['to'] || 'ase');
      this.outputType.set(params['output'] || 'skeleton');
    });
  }

  ngAfterViewInit(): void {
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

      console.log(`[Human Video] Searching for word: "${word}"`);
      const manifestEntry = this.wlaslManifest.find(entry => entry.word === word);
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

      console.log('[Human Video] Displaying preview video.');
      this.humanVideoUrl.set(URL.createObjectURL(videoBlob));
      this.status.set('translating');

      console.log('[Human Video] Forcefully re-encoding video with FFMPEG (libx264 & aac)...');
      await this.ffmpeg.load({
        coreURL: '/assets/ffmpeg/ffmpeg-core.js',
        wasmURL: '/assets/ffmpeg/ffmpeg-core.wasm',
        workerURL: '/assets/ffmpeg/ffmpeg-core.worker.js',
      });
      this.ffmpeg.on('log', ({ message }) => console.log(`[FFMPEG]: ${message}`))
      await this.ffmpeg.writeFile('input.mp4', new Uint8Array(await videoBlob.arrayBuffer()));
      await this.ffmpeg.exec(['-i', 'input.mp4', '-vf', 'scale=1282:720', '-ar', '16000', '-ac', '1', '-c:v', 'libx264', '-c:a', 'aac', 'output.mp4']);
      const reencodedData = await this.ffmpeg.readFile('output.mp4');
      const reencodedBlob = new Blob([(reencodedData as Uint8Array).buffer], { type: 'video/mp4' });
      console.log('[Human Video] Re-encoding complete.');

      const refImageResponse = await fetch('/assets/human/man.png');
      const refImageBlob = await refImageResponse.blob();

      console.log('[Human Video] Connecting to external API...');
      const client = await Client.connect('Wan-AI/Wan2.2-Animate');

      console.log('[Human Video] Sending to external API...');
      const result = await client.predict('/predict', {
        ref_img: refImageBlob,
        video: { video: reencodedBlob },
        model_id: 'wan2.2-animate-move',
        model: 'wan-pro',
      });
      console.log('[Human Video] Received response from API.');

      if (!result.data[0]) {
        const errorMessage = result.data[1] || 'The API returned an empty result.';
        throw new Error(errorMessage);
      }
      console.log('[Human Video] API call successful. Processing final video.');

      const resultUrl = (result.data[0] as any).url;
      const finalVideoResponse = await fetch(resultUrl);
      const finalVideoBlob = await finalVideoResponse.blob();
      this.humanVideoUrl.set(URL.createObjectURL(finalVideoBlob));
      console.log('[Human Video] Final video displayed.');

    } catch (e) {
      console.error('Human video generation error:', e);
      this.error.set(e.message || 'Human video generation failed.');
      this.status.set('error');
    }
  }

  onVideoEnded() {
    if (this.videoPlayer && this.videoPlayer.nativeElement) {
      this.videoPlayer.nativeElement.play();
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
    if (this.outputType() === 'human') {
      this.generateHumanVideo(this.inputText());
    } else {
      this.processTranslation();
    }
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