import { Component, OnInit, inject, signal, effect } from '@angular/core';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
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
} from '../../modules/translate/translate.actions';
import { SetSetting } from '../../modules/settings/settings.actions';
import { toSignal } from '@angular/core/rxjs-interop';

type Status = 'loading' | 'error' | 'success' | 'idle';

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
export class OutputOnlyComponent implements OnInit {
  private store = inject(Store);
  private sanitizer = inject(DomSanitizer);
  private route = inject(ActivatedRoute);

  // State as signals
  status = signal<Status>('idle');
  error = signal<string | null>(null);
  
  // Input from query params
  inputText = signal('');
  fromLanguage = signal('');
  toLanguage = signal('');

  // Data from store
  videoUrl = toSignal(this.store.select(state => state.translate.signedLanguageVideo));
  safeVideoUrl = signal<SafeUrl | undefined>(undefined);
  pose = toSignal(this.store.select(state => state.translate.signedLanguagePose));
  poseViewerSetting = toSignal(this.store.select(state => state.settings.poseViewer));

  constructor() {
    effect(() => {
      const url = this.videoUrl();
      if (url) {
        this.safeVideoUrl.set(this.sanitizer.bypassSecurityTrustUrl(url as string));
        this.status.set('success');
      }
    });

    effect(() => {
      const text = this.inputText();
      if (text) {
        this.processTranslation();
      }
    });
  }

  ngOnInit(): void {
    this.store.dispatch([
      new SetSetting('receiveVideo', true),
      new SetSetting('detectSign', false),
      new SetSetting('drawSignWriting', false),
      new SetSetting('drawPose', true),
      new SetSetting('poseViewer', 'pose'),
    ]);

    this.route.queryParams.subscribe(params => {
      this.inputText.set(params['text'] || '');
      this.fromLanguage.set(params['from'] || 'en');
      
      let toLang = params['to'] || 'ase';
      if (toLang === 'asl') toLang = 'ase';
      if (toLang === 'gsl') toLang = 'gsg';
      this.toLanguage.set(toLang);
    });
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
