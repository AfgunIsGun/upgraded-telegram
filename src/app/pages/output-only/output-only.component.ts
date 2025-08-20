import { Component, OnInit, inject } from '@angular/core';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { Observable } from 'rxjs';
import { Store } from '@ngxs/store';
import { TranslateState } from '../../modules/translate/translate.state';
import { PoseViewerSetting } from '../../modules/settings/settings.state';
import { AsyncPipe } from '@angular/common';
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
    SkeletonPoseViewerComponent,
    HumanPoseViewerComponent,
    AvatarPoseViewerComponent
  ]
})
export class OutputOnlyComponent implements OnInit {
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
    this.route.queryParams.subscribe(params => {
      this.inputText = params['text'] || '';
      this.fromLanguage = params['from'] || 'en';
      this.toLanguage = params['to'] || 'ase'; 
      
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

    // Keep existing store subscriptions for backward compatibility
    this.pose$ = this.store.select(state => state.translate.signedLanguagePose);
    this.poseViewerSetting$ = this.store.select(state => state.settings.poseViewer);
    this.store.select(state => state.translate.signedLanguageVideo).subscribe(url => {
      this.videoUrl = url as string;
      this.safeVideoUrl = url ? this.sanitizer.bypassSecurityTrustUrl(url as string) : undefined;
    });
  }

  private async processTranslation(): Promise<void> {
    try {
      // Dispatch actions to update the store with translation parameters
      // This follows the same pattern as the main translate component
      this.store.dispatch(new SetSpokenLanguage(this.fromLanguage));
      this.store.dispatch(new SetSignedLanguage(this.toLanguage));
      this.store.dispatch(new SetSpokenLanguageText(this.inputText));
      
      // The SetSpokenLanguageText action automatically triggers ChangeTranslation
      // so we don't need to dispatch it separately
      
    } catch (error) {
      console.error('Translation error:', error);
    }
  }

  onVideoError(event: Event): void {
    console.error('Video error:', event);
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


