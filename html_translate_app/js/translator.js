// Translation Engine for Sign Language Translator
class TranslationEngine {
  constructor() {
    this.apiEndpoint = 'https://api.example.com/translate'; // Mock endpoint
    this.supportedLanguages = {
      spoken: {
        en: 'English',
        es: 'Spanish',
        fr: 'French',
        de: 'German',
        it: 'Italian',
        pt: 'Portuguese',
        ru: 'Russian',
        ja: 'Japanese',
        ko: 'Korean',
        zh: 'Chinese',
      },
      sign: {
        asl: 'American Sign Language',
        bsl: 'British Sign Language',
        fsl: 'French Sign Language',
        gsl: 'German Sign Language',
        jsl: 'Japanese Sign Language',
      },
    };

    this.translationCache = new Map();
    this.isOnline = navigator.onLine;

    this.setupNetworkListeners();
  }

  setupNetworkListeners() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.showNetworkStatus('Connected', 'success');
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.showNetworkStatus('Offline - Using cached translations', 'warning');
    });
  }

  async translateText(text, sourceLanguage, targetLanguage) {
    if (!text || !text.trim()) {
      throw new Error('No text provided for translation');
    }

    // Check cache first
    const cacheKey = `${text}-${sourceLanguage}-${targetLanguage}`;
    if (this.translationCache.has(cacheKey)) {
      return this.translationCache.get(cacheKey);
    }

    try {
      let result;

      if (this.isOnline) {
        result = await this.performOnlineTranslation(text, sourceLanguage, targetLanguage);
      } else {
        result = await this.performOfflineTranslation(text, sourceLanguage, targetLanguage);
      }

      // Cache the result
      this.translationCache.set(cacheKey, result);

      // Limit cache size
      if (this.translationCache.size > 100) {
        const firstKey = this.translationCache.keys().next().value;
        this.translationCache.delete(firstKey);
      }

      return result;
    } catch (error) {
      console.error('Translation error:', error);
      throw new Error('Translation failed. Please try again.');
    }
  }

  async performOnlineTranslation(text, sourceLanguage, targetLanguage) {
    // Simulate API call with realistic delay
    await this.delay(1000 + Math.random() * 2000);

    // Mock translation result
    const result = {
      originalText: text,
      translatedText: this.generateMockTranslation(text, targetLanguage),
      sourceLanguage: sourceLanguage,
      targetLanguage: targetLanguage,
      confidence: 0.85 + Math.random() * 0.15,
      signWriting: this.generateSignWriting(text),
      videoUrl: this.generateVideoUrl(text, targetLanguage),
      timestamp: Date.now(),
    };

    return result;
  }

  async performOfflineTranslation(text, sourceLanguage, targetLanguage) {
    // Simulate offline processing
    await this.delay(500);

    // Basic offline translation (limited functionality)
    const result = {
      originalText: text,
      translatedText: `[Offline] ${this.generateBasicTranslation(text, targetLanguage)}`,
      sourceLanguage: sourceLanguage,
      targetLanguage: targetLanguage,
      confidence: 0.6,
      signWriting: this.generateBasicSignWriting(text),
      videoUrl: null, // No video in offline mode
      timestamp: Date.now(),
      offline: true,
    };

    return result;
  }

  generateMockTranslation(text, targetLanguage) {
    // Mock translation based on target sign language
    const translations = {
      asl: `ASL translation for: "${text}"`,
      bsl: `BSL translation for: "${text}"`,
      fsl: `FSL translation for: "${text}"`,
      gsl: `GSL translation for: "${text}"`,
      jsl: `JSL translation for: "${text}"`,
    };

    return translations[targetLanguage] || `Sign language translation for: "${text}"`;
  }

  generateBasicTranslation(text, targetLanguage) {
    return `Basic ${targetLanguage.toUpperCase()} signs for: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`;
  }

  generateSignWriting(text) {
    // Mock sign writing symbols
    const symbols = ['𝕊', '𝕚', '𝕘', '𝕟', '𝕎', '𝕣', '𝕚', '𝕥', '𝕚', '𝕟', '𝕘'];
    const wordCount = text.split(' ').length;
    const signCount = Math.min(wordCount * 2, 20);

    return Array(signCount)
      .fill()
      .map(() => symbols[Math.floor(Math.random() * symbols.length)])
      .join(' ');
  }

  generateBasicSignWriting(text) {
    return '𝕊𝕚𝕘𝕟 𝕎𝕣𝕚𝕥𝕚𝕟𝕘';
  }

  generateVideoUrl(text, targetLanguage) {
    // Mock video URL generation
    const videoId = btoa(text + targetLanguage)
      .replace(/[^a-zA-Z0-9]/g, '')
      .substring(0, 12);
    return `https://cdn.example.com/sign-videos/${targetLanguage}/${videoId}.mp4`;
  }

  async validateInput(text, sourceLanguage, targetLanguage) {
    const errors = [];

    if (!text || text.trim().length === 0) {
      errors.push('Text input is required');
    }

    if (text && text.length > 500) {
      errors.push('Text is too long (maximum 500 characters)');
    }

    if (!this.supportedLanguages.spoken[sourceLanguage]) {
      errors.push('Source language is not supported');
    }

    if (!this.supportedLanguages.sign[targetLanguage]) {
      errors.push('Target sign language is not supported');
    }

    // Check for inappropriate content (basic filter)
    if (this.containsInappropriateContent(text)) {
      errors.push('Text contains inappropriate content');
    }

    return {
      isValid: errors.length === 0,
      errors: errors,
    };
  }

  containsInappropriateContent(text) {
    // Basic content filter
    const inappropriateWords = ['spam', 'test-inappropriate']; // Minimal list for demo
    const lowerText = text.toLowerCase();

    return inappropriateWords.some(word => lowerText.includes(word));
  }

  async getLanguageInfo(languageCode, type = 'spoken') {
    const languages = type === 'spoken' ? this.supportedLanguages.spoken : this.supportedLanguages.sign;

    return {
      code: languageCode,
      name: languages[languageCode] || 'Unknown Language',
      type: type,
      supported: !!languages[languageCode],
    };
  }

  async getSupportedLanguages() {
    return {
      spoken: Object.entries(this.supportedLanguages.spoken).map(([code, name]) => ({
        code,
        name,
        type: 'spoken',
      })),
      sign: Object.entries(this.supportedLanguages.sign).map(([code, name]) => ({
        code,
        name,
        type: 'sign',
      })),
    };
  }

  async getTranslationHistory(limit = 10) {
    // Get recent translations from cache
    const history = Array.from(this.translationCache.entries())
      .map(([key, value]) => ({
        key,
        ...value,
      }))
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);

    return history;
  }

  clearCache() {
    this.translationCache.clear();
    this.showNetworkStatus('Translation cache cleared', 'info');
  }

  async getTranslationStats() {
    return {
      totalTranslations: this.translationCache.size,
      cacheHitRate: this.calculateCacheHitRate(),
      averageConfidence: this.calculateAverageConfidence(),
      supportedLanguagePairs: this.getSupportedLanguagePairs(),
      isOnline: this.isOnline,
    };
  }

  calculateCacheHitRate() {
    // Mock calculation
    return Math.random() * 0.3 + 0.7; // 70-100%
  }

  calculateAverageConfidence() {
    if (this.translationCache.size === 0) return 0;

    const confidences = Array.from(this.translationCache.values()).map(result => result.confidence || 0);

    return confidences.reduce((sum, conf) => sum + conf, 0) / confidences.length;
  }

  getSupportedLanguagePairs() {
    const spokenCount = Object.keys(this.supportedLanguages.spoken).length;
    const signCount = Object.keys(this.supportedLanguages.sign).length;
    return spokenCount * signCount;
  }

  // Utility methods
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  showNetworkStatus(message, type) {
    // Use the main app's notification system if available
    if (window.signTranslator && window.signTranslator.showNotification) {
      window.signTranslator.showNotification(message, type);
    } else {
      console.log(`[${type.toUpperCase()}] ${message}`);
    }
  }

  // Text processing utilities
  preprocessText(text) {
    return text
      .trim()
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/[^\w\s.,!?-]/g, '') // Remove special characters
      .substring(0, 500); // Ensure length limit
  }

  postprocessTranslation(result) {
    // Add any post-processing logic here
    if (result.confidence < 0.5) {
      result.warning = 'Low confidence translation. Results may not be accurate.';
    }

    if (result.offline) {
      result.warning = 'Offline translation. Limited functionality available.';
    }

    return result;
  }

  // Error handling
  handleTranslationError(error, context) {
    const errorInfo = {
      message: error.message,
      context: context,
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      online: this.isOnline,
    };

    console.error('Translation Error:', errorInfo);

    // Log to analytics service (mock)
    this.logError(errorInfo);

    return errorInfo;
  }

  logError(errorInfo) {
    // Mock error logging
    if (this.isOnline) {
      // Would send to analytics service
      console.log('Error logged to analytics:', errorInfo);
    } else {
      // Store locally for later sync
      const errors = JSON.parse(localStorage.getItem('translationErrors') || '[]');
      errors.push(errorInfo);
      localStorage.setItem('translationErrors', JSON.stringify(errors.slice(-50))); // Keep last 50 errors
    }
  }
}

// Initialize translation engine
const translationEngine = new TranslationEngine();

// Export for use in other modules
if (typeof window !== 'undefined') {
  window.TranslationEngine = TranslationEngine;
  window.translationEngine = translationEngine;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = TranslationEngine;
}
