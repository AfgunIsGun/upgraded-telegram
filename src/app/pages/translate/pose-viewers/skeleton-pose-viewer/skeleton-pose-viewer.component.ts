import {AfterViewInit, Component, CUSTOM_ELEMENTS_SCHEMA, Input} from '@angular/core';
import {fromEvent} from 'rxjs';
import {takeUntil, tap} from 'rxjs/operators';
import {BasePoseViewerComponent} from '../pose-viewer.component';
import {PlayableVideoEncoder} from '../playable-video-encoder';

@Component({
  selector: 'app-skeleton-pose-viewer',
  templateUrl: './skeleton-pose-viewer.component.html',
  styleUrls: ['./skeleton-pose-viewer.component.scss'],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class SkeletonPoseViewerComponent extends BasePoseViewerComponent implements AfterViewInit {
  @Input() src: string;

  ngAfterViewInit(): void {
    const pose = this.poseEl().nativeElement;

    fromEvent(pose, 'firstRender$')
      .pipe(
        tap(async () => {
          const poseCanvas = pose.shadowRoot.querySelector('canvas');
          pose.currentTime = 0; // Force time back to 0

          // startRecording is imperfect, specifically when the tab is out of focus.
          if (!PlayableVideoEncoder.isSupported()) {
            await this.startRecording(poseCanvas as any);
          } else {
            // Start capturing frames using requestAnimationFrame
            const record = async () => {
              if (pose.currentTime >= pose.duration) {
                this.stopRecording();
                return;
              }
              const imageBitmap = await createImageBitmap(poseCanvas);
              await this.addCacheFrame(imageBitmap);
              requestAnimationFrame(record);
            };
            requestAnimationFrame(record);
          }
        }),
        takeUntil(this.ngUnsubscribe)
      )
      .subscribe();

    fromEvent(pose, 'ended$')
      .pipe(
        tap(async () => this.stopRecording()),
        takeUntil(this.ngUnsubscribe)
      )
      .subscribe();

    this.pauseInvisible();
  }

  pauseInvisible() {
    const pose = this.poseEl().nativeElement;

    // TODO: this should be on the current element, not document
    fromEvent(document, 'visibilitychange')
      .pipe(
        tap(async () => {
          if (document.visibilityState === 'visible') {
            await pose.play();
            if (this.mediaRecorder) {
              this.mediaRecorder.resume();
            }
          } else {
            await pose.pause();
            if (this.mediaRecorder) {
              this.mediaRecorder.pause();
            }
          }
        }),
        takeUntil(this.ngUnsubscribe)
      )
      .subscribe();
  }
}