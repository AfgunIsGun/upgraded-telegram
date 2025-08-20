import { Component, OnInit, inject } from '@angular/core';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { Observable } from 'rxjs';
import { Store } from '@ngxs/store';
import { TranslateState } from '../../modules/translate/translate.state';
import { PoseViewerSetting } from '../../modules/settings/settings.state';
import { AsyncPipe, TitleCasePipe } from '@angular/common';
import { SkeletonPoseViewerComponent } from '../translate/pose-viewers/skeleton-pose-viewer/skeleton-pose-viewer.component';
import { HumanPoseViewerComponent } from '../translate/pose-viewers/human-pose-viewer/human-pose-viewer.component';
import { AvatarPoseViewerComponent } from '../translate/pose-viewers/avatar-pose-viewer/avatar-pose-viewer.component';

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
  isLoading: boolean = false;
  hasError: boolean = false;
  errorMessage: string = '';

  constructor() { }

  ngOnInit(): void {
    // Handle query parameters
    this.route.queryParams.subscribe(params => {
      this.inputText = params['text'] || '';
      this.fromLanguage = params['from'] || 'en';
      this.toLanguage = params['to'] || 'asl';
      
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
    this.isLoading = true;
    this.hasError = false;
    
    try {
      this.store.dispatch(new SetSpokenLanguageText(this.inputText));
      this.store.dispatch(new SetSpokenLanguage(this.fromLanguage));
      this.store.dispatch(new SetSignedLanguage(this.toLanguage));
      this.store.dispatch(new ChangeTranslation());
      this.isLoading = false;
    } catch (error) {
      this.hasError = true;
      this.errorMessage = 'Translation failed. Please try again.';
      this.isLoading = false;
    }
  }

  onVideoError(event: Event): void {
    console.error('Video error:', event);
  }

  playVideoIfPaused(event: Event): void {
    const videoElement = event.target as HTMLVideoElement;
    if (videoElement.paused) {
      videoElement.play();
    }
  }

  retry(): void {
    if (this.inputText) {
      this.processTranslation();
    }
  }
}
