import { Component, OnInit, inject, OnDestroy } from '@angular/core';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { Observable, Subscription, timer } from 'rxjs';
import { Store } from '@ngxs/store';
import { TranslateState } from '../../modules/translate/translate.state';
import { PoseViewerSetting } from '../../modules/settings/settings.state';
import { AsyncPipe, TitleCasePipe } from '@angular/common';
import { SkeletonPoseViewerComponent } from '../translate/pose-viewers/skeleton-pose-viewer/skeleton-pose-viewer.component';
import { HumanPoseViewerComponent } from '../translate/pose-viewers/human-pose-viewer/human-pose-viewer.component';
import { AvatarPoseViewerComponent } from '../translate/pose-viewers/avatar-pose-viewer/avatar-pose-viewer.component';
import {
  SetSpokenLanguageText,
  SetSpokenLanguage,
  SetSignedLanguage,
  ChangeTranslation
} from '../../modules/translate/translate.actions';
import { SetSetting } from '../../modules/settings/settings.actions';

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
    AvatarPoseViewerComponent
  ]
})
export class OutputOnlyComponent implements OnInit, OnDestroy {
  private store = inject(Store);
  private sanitizer = inject(DomSanitizer);
  private route = inject(ActivatedRoute);

  videoUrl: string | undefined;
  safeVideoUrl: SafeUrl | undefined;
  pose$: Observable<string> | undefined;
  poseViewerSetting$: Observable<PoseViewerSetting> | undefined;

  // New properties for handling query parameters
  inputText: string = '';
  fromLanguage: string = '';
  toLanguage: string = '';

  private subscriptions: Subscription[] = [];

  constructor() { }

  ngOnInit(): void {
    // Initialize default settings like the main translate component
    this.store.dispatch([
      new SetSetting('receiveVideo', true),
      new SetSetting('detectSign', false),
      new SetSetting('drawSignWriting', false),
      new SetSetting('drawPose', true),
      new SetSetting('poseViewer', 'pose'),
    ]);

    // Handle query parameters
    const paramsSub = this.route.queryParams.subscribe(params => {
      this.inputText = params['text'] || '';
      this.fromLanguage = params['from'] || 'en';
      this.toLanguage = params['to'] || 'ase'; // Convert 'asl' to 'ase' (American Sign Language)

      // Convert common language codes to the format expected by the backend
      if (this.toLanguage === 'asl') {
        this.toLanguage = 'ase';
      }
      if (this.toLanguage === 'gsl') {
        this.toLanguage = 'gsg';
      }
      if (this.toLanguage === 'fsl') {
        this.toLanguage = 'fsl';
      }

      if (this.inputText) {
        this.processTranslation();
      }
    });
    this.subscriptions.push(paramsSub);

    // Keep existing store subscriptions for backward compatibility
    this.pose$ = this.store.select(state => state.translate.signedLanguagePose);
    this.poseViewerSetting$ = this.store.select(state => state.settings.poseViewer);
    
    const videoSub = this.store.select(state => state.translate.signedLanguageVideo).subscribe(url => {
      this.videoUrl = url as string;
      this.safeVideoUrl = url ? this.sanitizer.bypassSecurityTrustUrl(url as string) : undefined;
    });
    this.subscriptions.push(videoSub);

    // Auto-retry mechanism for failed translations
    const retrySub = timer(5000, 10000).subscribe(() => {
      if (this.inputText && !this.videoUrl && !this.pose$) {
        console.log('Retrying translation...');
        this.processTranslation();
      }
    });
    this.subscriptions.push(retrySub);
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  private async processTranslation(): Promise<void> {
    try {
      // First, set the languages
      await this.store.dispatch(new SetSpokenLanguage(this.fromLanguage)).toPromise();
      await this.store.dispatch(new SetSignedLanguage(this.toLanguage)).toPromise();

      // Then set the text, which automatically triggers ChangeTranslation
      await this.store.dispatch(new SetSpokenLanguageText(this.inputText)).toPromise();

      // Force translation change if needed
      setTimeout(() => {
        this.store.dispatch(new ChangeTranslation());
      }, 100);

    } catch (error) {
      console.error('Translation error:', error);
      // Retry after error
      setTimeout(() => {
        if (this.inputText) {
          this.processTranslation();
        }
      }, 2000);
    }
  }

  onVideoError(event: Event): void {
    console.error('Video error:', event);
    // Try to reload the video after error
    setTimeout(() => {
      if (this.inputText) {
        this.processTranslation();
      }
    }, 1000);
  }

  playVideoIfPaused(event: Event): void {
    const videoElement = event.target as HTMLVideoElement;
    if (videoElement.paused) {
      videoElement.play().catch(error => {
        console.error('Failed to play video:', error);
      });
    }
  }

  retry(): void {
    if (this.inputText) {
      this.processTranslation();
    }
  }

  // Helper method to get language display name
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

