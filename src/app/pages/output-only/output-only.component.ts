import { Component, OnInit, inject } from '@angular/core';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { Observable } from 'rxjs';
import { Store } from '@ngxs/store';
import { TranslateState } from '../../modules/translate/translate.state';
import { PoseViewerSetting } from '../../modules/settings/settings.state';
import { AsyncPipe } from '@angular/common';
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
    SkeletonPoseViewerComponent,
    HumanPoseViewerComponent,
    AvatarPoseViewerComponent
  ]
})
export class OutputOnlyComponent implements OnInit {
  private store = inject(Store);
  private sanitizer = inject(DomSanitizer);

  videoUrl: string | undefined;
  safeVideoUrl: SafeUrl | undefined;
  pose$: Observable<string> | undefined;
  poseViewerSetting$: Observable<PoseViewerSetting> | undefined;

  constructor() { }

  ngOnInit(): void {
    this.pose$ = this.store.select(TranslateState.signedLanguagePose);
    this.poseViewerSetting$ = this.store.select(state => state.settings.poseViewer);
    this.store.select(TranslateState.signedLanguageVideo).subscribe(url => {
      this.videoUrl = url;
      this.safeVideoUrl = url ? this.sanitizer.bypassSecurityTrustUrl(url) : undefined;
    });
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
}
