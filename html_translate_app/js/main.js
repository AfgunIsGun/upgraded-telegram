// Modern Sign Language Translator - Main JavaScript
class SignTranslator {
  constructor() {
    this.currentTheme = 'light';
    this.currentMode = 'text';
    this.isTranslating = false;
    this.sourceLanguage = 'en';
    this.targetLanguage = 'asl';

    this.init();
  }

  init() {
    this.setupEventListeners();
    this.setupTheme();
    this.setupAnimations();
    this.loadUserPreferences();
  }

  setupEventListeners() {
    // Theme toggle
    const themeToggle = document.getElementById('themeToggle');
    themeToggle?.addEventListener('click', () => this.toggleTheme());

    // Input mode buttons
    const inputModeButtons = document.querySelectorAll('.input-mode-btn');
    inputModeButtons.forEach(btn => {
      btn.addEventListener('click', e => this.switchInputMode(e.target.closest('.input-mode-btn')));
    });

    // Language swap
    const swapBtn = document.getElementById('swapLanguages');
    swapBtn?.addEventListener('click', () => this.swapLanguages());

    // Text input
    const textInput = document.getElementById('textInput');
    textInput?.addEventListener('input', e => this.handleTextInput(e));
    textInput?.addEventListener('keydown', e => this.handleKeyDown(e));

    // Action buttons
    document.getElementById('clearBtn')?.addEventListener('click', () => this.clearInput());
    document.getElementById('speakBtn')?.addEventListener('click', () => this.speakText());
    document.getElementById('copyBtn')?.addEventListener('click', () => this.copyText());

    // Play translation
    document.getElementById('playTranslation')?.addEventListener('click', () => this.playTranslation());

    // Video controls
    document.getElementById('playPauseBtn')?.addEventListener('click', () => this.togglePlayPause());
    document.getElementById('fullscreenBtn')?.addEventListener('click', () => this.toggleFullscreen());

    // Help button
    document.getElementById('helpBtn')?.addEventListener('click', () => this.showHelp());

    // Language selectors
    document.getElementById('sourceLanguage')?.addEventListener('change', e => {
      this.sourceLanguage = e.target.value;
      this.saveUserPreferences();
    });

    document.getElementById('targetLanguage')?.addEventListener('change', e => {
      this.targetLanguage = e.target.value;
      this.saveUserPreferences();
    });

    // Window events
    window.addEventListener('resize', () => this.handleResize());
    window.addEventListener('beforeunload', () => this.saveUserPreferences());
  }

  setupTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      this.currentTheme = savedTheme;
    } else {
      // Detect system preference
      this.currentTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    this.applyTheme();

    // Listen for system theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
      if (!localStorage.getItem('theme')) {
        this.currentTheme = e.matches ? 'dark' : 'light';
        this.applyTheme();
      }
    });
  }

  toggleTheme() {
    this.currentTheme = this.currentTheme === 'light' ? 'dark' : 'light';
    this.applyTheme();
    this.saveUserPreferences();

    // Add animation to theme toggle button
    const themeToggle = document.getElementById('themeToggle');
    const icon = themeToggle.querySelector('i');

    themeToggle.style.transform = 'rotate(360deg) scale(1.1)';
    setTimeout(() => {
      themeToggle.style.transform = '';
      icon.className = this.currentTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    }, 300);
  }

  applyTheme() {
    document.documentElement.setAttribute('data-theme', this.currentTheme);
    localStorage.setItem('theme', this.currentTheme);

    // Update theme toggle icon
    const icon = document.querySelector('#themeToggle i');
    if (icon) {
      icon.className = this.currentTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    }
  }

  switchInputMode(button) {
    // Remove active class from all buttons
    document.querySelectorAll('.input-mode-btn').forEach(btn => {
      btn.classList.remove('active');
    });

    // Add active class to clicked button
    button.classList.add('active');

    // Get mode from data attribute
    this.currentMode = button.getAttribute('data-mode');

    // Add bounce animation
    button.classList.add('bounce-in');
    setTimeout(() => button.classList.remove('bounce-in'), 600);

    // Update UI based on mode
    this.updateUIForMode();
  }

  updateUIForMode() {
    const inputSection = document.querySelector('.input-section');
    const outputSection = document.querySelector('.output-section');

    switch (this.currentMode) {
      case 'text':
        inputSection.style.display = 'block';
        outputSection.querySelector('.video-placeholder p').textContent = 'Sign language video will appear here';
        break;
      case 'webcam':
        inputSection.style.display = 'block';
        outputSection.querySelector('.video-placeholder p').textContent = 'Webcam feed will appear here';
        this.showNotification('Webcam mode selected. Camera access required.', 'info');
        break;
      case 'upload':
        inputSection.style.display = 'block';
        outputSection.querySelector('.video-placeholder p').textContent = 'Upload a video file to translate';
        this.showNotification('Upload mode selected. Choose a video file.', 'info');
        break;
    }
  }

  swapLanguages() {
    const sourceSelect = document.getElementById('sourceLanguage');
    const targetSelect = document.getElementById('targetLanguage');

    if (sourceSelect && targetSelect) {
      const tempValue = sourceSelect.value;
      sourceSelect.value = targetSelect.value;
      targetSelect.value = tempValue;

      this.sourceLanguage = sourceSelect.value;
      this.targetLanguage = targetSelect.value;
    }

    // Add rotation animation to swap button
    const swapBtn = document.getElementById('swapLanguages');
    swapBtn.style.transform = 'rotate(180deg) scale(1.1)';
    setTimeout(() => {
      swapBtn.style.transform = '';
    }, 300);

    this.saveUserPreferences();
  }

  handleTextInput(event) {
    const text = event.target.value;
    const charCount = document.getElementById('charCount');

    if (charCount) {
      charCount.textContent = text.length;

      // Change color based on character count
      if (text.length > 450) {
        charCount.style.color = '#fa709a';
      } else if (text.length > 400) {
        charCount.style.color = '#fee140';
      } else {
        charCount.style.color = 'var(--text-muted)';
      }
    }

    // Auto-translate with debounce
    clearTimeout(this.translateTimeout);
    this.translateTimeout = setTimeout(() => {
      if (text.trim()) {
        this.translateText(text);
      }
    }, 1000);
  }

  handleKeyDown(event) {
    // Ctrl/Cmd + Enter to translate
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      const text = event.target.value;
      if (text.trim()) {
        this.translateText(text);
      }
    }
  }

  async translateText(text) {
    if (this.isTranslating) return;

    this.isTranslating = true;
    this.showLoading('Processing translation...');

    try {
      // Simulate API call
      await this.simulateTranslation(text);

      // Update sign writing display
      this.updateSignWriting(text);

      // Update video placeholder
      this.updateVideoOutput(text);

      this.showNotification('Translation completed successfully!', 'success');
    } catch (error) {
      console.error('Translation error:', error);
      this.showNotification('Translation failed. Please try again.', 'error');
    } finally {
      this.isTranslating = false;
      this.hideLoading();
    }
  }

  async simulateTranslation(text) {
    // Simulate API delay
    return new Promise(resolve => {
      setTimeout(resolve, 1500 + Math.random() * 1000);
    });
  }

  updateSignWriting(text) {
    const signwritingDisplay = document.querySelector('.signwriting-display');
    const placeholder = signwritingDisplay.querySelector('.signwriting-placeholder');

    if (placeholder) {
      placeholder.innerHTML = `
                <i class="fas fa-hands" style="color: var(--text-primary);"></i>
                <p style="color: var(--text-primary); font-weight: 500;">
                    Sign writing for:<br>
                    "${text.substring(0, 30)}${text.length > 30 ? '...' : ''}"
                </p>
            `;
    }
  }

  updateVideoOutput(text) {
    const videoPlaceholder = document.querySelector('.video-placeholder');
    const playBtn = videoPlaceholder.querySelector('.play-btn');

    if (playBtn) {
      playBtn.style.display = 'flex';
      playBtn.classList.add('pulse-glow');
    }

    const placeholderText = videoPlaceholder.querySelector('p');
    if (placeholderText) {
      placeholderText.textContent = 'Sign language video ready to play';
    }
  }

  clearInput() {
    const textInput = document.getElementById('textInput');
    const charCount = document.getElementById('charCount');

    if (textInput) {
      textInput.value = '';
      textInput.focus();
    }

    if (charCount) {
      charCount.textContent = '0';
      charCount.style.color = 'var(--text-muted)';
    }

    // Reset displays
    this.resetDisplays();

    // Add shake animation to clear button
    const clearBtn = document.getElementById('clearBtn');
    clearBtn.classList.add('shake');
    setTimeout(() => clearBtn.classList.remove('shake'), 500);
  }

  resetDisplays() {
    const signwritingDisplay = document.querySelector('.signwriting-display');
    const videoPlaceholder = document.querySelector('.video-placeholder');

    if (signwritingDisplay) {
      signwritingDisplay.innerHTML = `
                <div class="signwriting-placeholder">
                    <i class="fas fa-hands"></i>
                    <p>Sign writing will appear here</p>
                </div>
            `;
    }

    if (videoPlaceholder) {
      videoPlaceholder.innerHTML = `
                <i class="fas fa-play-circle"></i>
                <p>Sign language video will appear here</p>
                <button class="play-btn modern-btn" id="playTranslation" style="display: none;">
                    <i class="fas fa-play"></i>
                    <span>Play Translation</span>
                </button>
            `;

      // Re-attach event listener
      document.getElementById('playTranslation')?.addEventListener('click', () => this.playTranslation());
    }
  }

  async speakText() {
    const textInput = document.getElementById('textInput');
    const text = textInput?.value.trim();

    if (!text) {
      this.showNotification('No text to speak', 'warning');
      return;
    }

    if ('speechSynthesis' in window) {
      // Cancel any ongoing speech
      speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.volume = 0.8;

      // Add visual feedback
      const speakBtn = document.getElementById('speakBtn');
      speakBtn.classList.add('pulse-glow');

      utterance.onend = () => {
        speakBtn.classList.remove('pulse-glow');
      };

      speechSynthesis.speak(utterance);
    } else {
      this.showNotification('Speech synthesis not supported', 'error');
    }
  }

  async copyText() {
    const textInput = document.getElementById('textInput');
    const text = textInput?.value.trim();

    if (!text) {
      this.showNotification('No text to copy', 'warning');
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      this.showNotification('Text copied to clipboard!', 'success');

      // Add bounce animation to copy button
      const copyBtn = document.getElementById('copyBtn');
      copyBtn.classList.add('bounce-in');
      setTimeout(() => copyBtn.classList.remove('bounce-in'), 600);
    } catch (error) {
      console.error('Copy failed:', error);
      this.showNotification('Failed to copy text', 'error');
    }
  }

  playTranslation() {
    const playBtn = document.getElementById('playTranslation');
    const videoControls = document.querySelector('.video-controls');

    if (playBtn) {
      playBtn.style.display = 'none';
    }

    if (videoControls) {
      videoControls.style.opacity = '1';
    }

    // Simulate video playback
    this.simulateVideoPlayback();
    this.showNotification('Playing sign language translation', 'info');
  }

  simulateVideoPlayback() {
    const progressFill = document.querySelector('.progress-fill');
    const playPauseBtn = document.getElementById('playPauseBtn');
    const playPauseIcon = playPauseBtn?.querySelector('i');

    if (playPauseIcon) {
      playPauseIcon.className = 'fas fa-pause';
    }

    let progress = 0;
    const duration = 5000; // 5 seconds
    const interval = 50;

    const updateProgress = () => {
      progress += interval;
      const percentage = (progress / duration) * 100;

      if (progressFill) {
        progressFill.style.width = `${Math.min(percentage, 100)}%`;
      }

      if (progress < duration) {
        setTimeout(updateProgress, interval);
      } else {
        // Video ended
        if (playPauseIcon) {
          playPauseIcon.className = 'fas fa-play';
        }
        setTimeout(() => {
          if (progressFill) {
            progressFill.style.width = '0%';
          }
        }, 1000);
      }
    };

    updateProgress();
  }

  togglePlayPause() {
    const playPauseIcon = document.querySelector('#playPauseBtn i');

    if (playPauseIcon) {
      const isPlaying = playPauseIcon.classList.contains('fa-pause');
      playPauseIcon.className = isPlaying ? 'fas fa-play' : 'fas fa-pause';
    }
  }

  toggleFullscreen() {
    const videoContainer = document.querySelector('.video-container');

    if (videoContainer) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        videoContainer.requestFullscreen().catch(err => {
          console.error('Fullscreen error:', err);
          this.showNotification('Fullscreen not supported', 'error');
        });
      }
    }
  }

  showHelp() {
    const helpContent = `
            <div style="text-align: left; line-height: 1.6;">
                <h3 style="margin-bottom: 16px; color: var(--text-primary);">How to Use Sign Translator</h3>
                <ul style="margin: 0; padding-left: 20px; color: var(--text-secondary);">
                    <li>Type text in the input area to translate to sign language</li>
                    <li>Use Ctrl/Cmd + Enter for quick translation</li>
                    <li>Click the swap button to switch languages</li>
                    <li>Use the theme toggle to switch between light and dark modes</li>
                    <li>Click the play button to view the sign language video</li>
                </ul>
                <p style="margin-top: 16px; color: var(--text-muted); font-size: 0.9rem;">
                    This is a demo application showcasing modern web technologies.
                </p>
            </div>
        `;

    this.showModal('Help', helpContent);
  }

  showModal(title, content) {
    // Create modal if it doesn't exist
    let modal = document.getElementById('modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'modal';
      modal.className = 'modal-overlay';
      modal.innerHTML = `
                <div class="modal-content glass-card">
                    <div class="modal-header">
                        <h2 class="modal-title"></h2>
                        <button class="modal-close" id="modalClose">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body"></div>
                </div>
            `;
      document.body.appendChild(modal);

      // Add modal styles
      const modalStyles = `
                .modal-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0, 0, 0, 0.5);
                    backdrop-filter: blur(10px);
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    z-index: 10000;
                    opacity: 0;
                    visibility: hidden;
                    transition: var(--transition-normal);
                }
                .modal-overlay.visible {
                    opacity: 1;
                    visibility: visible;
                }
                .modal-content {
                    max-width: 500px;
                    width: 90%;
                    max-height: 80vh;
                    overflow-y: auto;
                    transform: scale(0.8);
                    transition: var(--transition-normal);
                }
                .modal-overlay.visible .modal-content {
                    transform: scale(1);
                }
                .modal-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: var(--spacing-lg);
                    border-bottom: 1px solid var(--divider-color);
                }
                .modal-title {
                    margin: 0;
                    color: var(--text-primary);
                }
                .modal-close {
                    background: none;
                    border: none;
                    color: var(--text-secondary);
                    font-size: 18px;
                    cursor: pointer;
                    padding: 8px;
                    border-radius: var(--radius-sm);
                    transition: var(--transition-fast);
                }
                .modal-close:hover {
                    background: rgba(255, 255, 255, 0.1);
                    color: var(--text-primary);
                }
                .modal-body {
                    padding: var(--spacing-lg);
                }
            `;

      const styleSheet = document.createElement('style');
      styleSheet.textContent = modalStyles;
      document.head.appendChild(styleSheet);

      // Add event listeners
      modal.addEventListener('click', e => {
        if (e.target === modal) {
          this.hideModal();
        }
      });

      document.getElementById('modalClose').addEventListener('click', () => {
        this.hideModal();
      });
    }

    // Update modal content
    modal.querySelector('.modal-title').textContent = title;
    modal.querySelector('.modal-body').innerHTML = content;

    // Show modal
    modal.classList.add('visible');
  }

  hideModal() {
    const modal = document.getElementById('modal');
    if (modal) {
      modal.classList.remove('visible');
    }
  }

  showLoading(message = 'Loading...') {
    const loadingOverlay = document.getElementById('loadingOverlay');
    const loadingText = loadingOverlay?.querySelector('.loading-text');

    if (loadingText) {
      loadingText.textContent = message;
    }

    if (loadingOverlay) {
      loadingOverlay.classList.add('visible');
    }
  }

  hideLoading() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
      loadingOverlay.classList.remove('visible');
    }
  }

  showNotification(message, type = 'info') {
    // Create notification if it doesn't exist
    let notification = document.getElementById('notification');
    if (!notification) {
      notification = document.createElement('div');
      notification.id = 'notification';
      notification.className = 'notification';
      document.body.appendChild(notification);

      // Add notification styles
      const notificationStyles = `
                .notification {
                    position: fixed;
                    top: var(--spacing-lg);
                    right: var(--spacing-lg);
                    background: var(--glass-bg);
                    backdrop-filter: var(--glass-backdrop);
                    border: 1px solid var(--glass-border);
                    border-radius: var(--radius-md);
                    padding: var(--spacing-md) var(--spacing-lg);
                    color: var(--text-primary);
                    font-weight: 500;
                    z-index: 10001;
                    transform: translateX(100%);
                    transition: var(--transition-normal);
                    max-width: 300px;
                    box-shadow: var(--glass-shadow);
                }
                .notification.visible {
                    transform: translateX(0);
                }
                .notification.success {
                    border-left: 4px solid #43e97b;
                }
                .notification.error {
                    border-left: 4px solid #f5576c;
                }
                .notification.warning {
                    border-left: 4px solid #fee140;
                }
                .notification.info {
                    border-left: 4px solid #4facfe;
                }
            `;

      const styleSheet = document.createElement('style');
      styleSheet.textContent = notificationStyles;
      document.head.appendChild(styleSheet);
    }

    // Update notification
    notification.textContent = message;
    notification.className = `notification ${type}`;

    // Show notification
    setTimeout(() => notification.classList.add('visible'), 100);

    // Hide notification after 3 seconds
    setTimeout(() => {
      notification.classList.remove('visible');
    }, 3000);
  }

  setupAnimations() {
    // Add stagger animation to feature cards
    const featureCards = document.querySelector('.feature-cards');
    if (featureCards) {
      featureCards.classList.add('stagger-animation');
    }

    // Add entrance animations
    const translationCard = document.getElementById('translationCard');
    if (translationCard) {
      translationCard.classList.add('slide-in-up');
    }

    const inputModeGroup = document.querySelector('.input-mode-group');
    if (inputModeGroup) {
      inputModeGroup.classList.add('slide-in-down');
    }
  }

  handleResize() {
    // Handle responsive behavior
    const isMobile = window.innerWidth <= 768;

    if (isMobile) {
      // Mobile-specific adjustments
      document.body.classList.add('mobile');
    } else {
      document.body.classList.remove('mobile');
    }
  }

  loadUserPreferences() {
    const preferences = localStorage.getItem('userPreferences');
    if (preferences) {
      try {
        const parsed = JSON.parse(preferences);
        this.sourceLanguage = parsed.sourceLanguage || 'en';
        this.targetLanguage = parsed.targetLanguage || 'asl';

        // Update selects
        const sourceSelect = document.getElementById('sourceLanguage');
        const targetSelect = document.getElementById('targetLanguage');

        if (sourceSelect) sourceSelect.value = this.sourceLanguage;
        if (targetSelect) targetSelect.value = this.targetLanguage;
      } catch (error) {
        console.error('Error loading preferences:', error);
      }
    }
  }

  saveUserPreferences() {
    const preferences = {
      theme: this.currentTheme,
      sourceLanguage: this.sourceLanguage,
      targetLanguage: this.targetLanguage,
      inputMode: this.currentMode,
    };

    localStorage.setItem('userPreferences', JSON.stringify(preferences));
  }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.signTranslator = new SignTranslator();

  // Add some initial animations
  setTimeout(() => {
    document.body.classList.add('loaded');
  }, 100);
});

// Handle page visibility changes
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    // Page is hidden, pause animations
    document.body.classList.add('paused');
  } else {
    // Page is visible, resume animations
    document.body.classList.remove('paused');
  }
});

// Export for potential module use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SignTranslator;
}
