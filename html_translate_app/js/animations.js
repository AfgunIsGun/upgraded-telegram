// Advanced Animations Controller
class AnimationController {
  constructor() {
    this.isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.animationQueue = [];
    this.isAnimating = false;
    this.observers = new Map();

    this.init();
  }

  init() {
    this.setupIntersectionObserver();
    this.setupMotionPreferences();
    this.setupParticleSystem();
    this.setupScrollAnimations();
  }

  setupMotionPreferences() {
    // Listen for motion preference changes
    window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', e => {
      this.isReducedMotion = e.matches;
      this.updateAnimationsForMotionPreference();
    });
  }

  updateAnimationsForMotionPreference() {
    const body = document.body;

    if (this.isReducedMotion) {
      body.classList.add('reduced-motion');
      this.pauseAllAnimations();
    } else {
      body.classList.remove('reduced-motion');
      this.resumeAllAnimations();
    }
  }

  setupIntersectionObserver() {
    // Animate elements when they come into view
    const observerOptions = {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px',
    };

    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          this.animateElementIntoView(entry.target);
        }
      });
    }, observerOptions);

    // Observe elements that should animate on scroll
    const animatableElements = document.querySelectorAll('.feature-card, .glass-card, .input-mode-btn, .modern-btn');

    animatableElements.forEach(el => {
      observer.observe(el);
    });

    this.observers.set('intersection', observer);
  }

  animateElementIntoView(element) {
    if (this.isReducedMotion) return;

    const animations = ['fade-in-scale', 'slide-in-up', 'bounce-in'];

    const randomAnimation = animations[Math.floor(Math.random() * animations.length)];

    element.style.opacity = '0';
    element.style.transform = 'translateY(20px) scale(0.9)';

    requestAnimationFrame(() => {
      element.classList.add(randomAnimation);
      element.style.opacity = '';
      element.style.transform = '';
    });
  }

  setupParticleSystem() {
    if (this.isReducedMotion) return;

    this.createFloatingParticles();
    this.createInteractiveParticles();
  }

  createFloatingParticles() {
    const particleContainer = document.querySelector('.particles-bg');
    if (!particleContainer) return;

    // Create additional dynamic particles
    for (let i = 0; i < 20; i++) {
      const particle = document.createElement('div');
      particle.className = 'dynamic-particle';
      particle.style.cssText = `
                position: absolute;
                width: ${Math.random() * 4 + 1}px;
                height: ${Math.random() * 4 + 1}px;
                background: rgba(255, 255, 255, ${Math.random() * 0.5 + 0.1});
                border-radius: 50%;
                left: ${Math.random() * 100}%;
                top: ${Math.random() * 100}%;
                animation: float-dynamic ${Math.random() * 10 + 5}s ease-in-out infinite;
                animation-delay: ${Math.random() * 5}s;
                pointer-events: none;
            `;
      particleContainer.appendChild(particle);
    }

    // Add dynamic float animation
    const style = document.createElement('style');
    style.textContent = `
            @keyframes float-dynamic {
                0%, 100% {
                    transform: translateY(0px) translateX(0px) rotate(0deg);
                    opacity: 0.3;
                }
                25% {
                    transform: translateY(-30px) translateX(20px) rotate(90deg);
                    opacity: 0.8;
                }
                50% {
                    transform: translateY(-15px) translateX(-10px) rotate(180deg);
                    opacity: 0.5;
                }
                75% {
                    transform: translateY(-40px) translateX(30px) rotate(270deg);
                    opacity: 0.9;
                }
            }
        `;
    document.head.appendChild(style);
  }

  createInteractiveParticles() {
    let mouseX = 0;
    let mouseY = 0;
    const particles = [];

    // Track mouse movement
    document.addEventListener('mousemove', e => {
      mouseX = e.clientX;
      mouseY = e.clientY;

      if (!this.isReducedMotion && Math.random() < 0.1) {
        this.createMouseParticle(mouseX, mouseY);
      }
    });

    // Create particles on click
    document.addEventListener('click', e => {
      if (!this.isReducedMotion) {
        this.createClickRipple(e.clientX, e.clientY);
      }
    });
  }

  createMouseParticle(x, y) {
    const particle = document.createElement('div');
    particle.className = 'mouse-particle';
    particle.style.cssText = `
            position: fixed;
            left: ${x}px;
            top: ${y}px;
            width: 4px;
            height: 4px;
            background: rgba(255, 255, 255, 0.6);
            border-radius: 50%;
            pointer-events: none;
            z-index: 9999;
            animation: mouse-particle-fade 1s ease-out forwards;
        `;

    document.body.appendChild(particle);

    // Remove particle after animation
    setTimeout(() => {
      if (particle.parentNode) {
        particle.parentNode.removeChild(particle);
      }
    }, 1000);

    // Add animation if not exists
    if (!document.getElementById('mouse-particle-styles')) {
      const style = document.createElement('style');
      style.id = 'mouse-particle-styles';
      style.textContent = `
                @keyframes mouse-particle-fade {
                    0% {
                        transform: scale(1) translateY(0);
                        opacity: 1;
                    }
                    100% {
                        transform: scale(0) translateY(-20px);
                        opacity: 0;
                    }
                }
            `;
      document.head.appendChild(style);
    }
  }

  createClickRipple(x, y) {
    const ripple = document.createElement('div');
    ripple.className = 'click-ripple';
    ripple.style.cssText = `
            position: fixed;
            left: ${x - 25}px;
            top: ${y - 25}px;
            width: 50px;
            height: 50px;
            border: 2px solid rgba(255, 255, 255, 0.5);
            border-radius: 50%;
            pointer-events: none;
            z-index: 9999;
            animation: click-ripple-expand 0.6s ease-out forwards;
        `;

    document.body.appendChild(ripple);

    // Remove ripple after animation
    setTimeout(() => {
      if (ripple.parentNode) {
        ripple.parentNode.removeChild(ripple);
      }
    }, 600);

    // Add animation if not exists
    if (!document.getElementById('click-ripple-styles')) {
      const style = document.createElement('style');
      style.id = 'click-ripple-styles';
      style.textContent = `
                @keyframes click-ripple-expand {
                    0% {
                        transform: scale(0);
                        opacity: 1;
                    }
                    100% {
                        transform: scale(2);
                        opacity: 0;
                    }
                }
            `;
      document.head.appendChild(style);
    }
  }

  setupScrollAnimations() {
    if (this.isReducedMotion) return;

    let ticking = false;

    const updateScrollAnimations = () => {
      const scrollY = window.scrollY;
      const windowHeight = window.innerHeight;

      // Parallax effect for background elements
      const parallaxElements = document.querySelectorAll('.gradient-bg, .mesh-overlay');
      parallaxElements.forEach((el, index) => {
        const speed = 0.5 + index * 0.2;
        el.style.transform = `translateY(${scrollY * speed}px)`;
      });

      // Scale effect for cards
      const cards = document.querySelectorAll('.glass-card');
      cards.forEach(card => {
        const rect = card.getBoundingClientRect();
        const cardCenter = rect.top + rect.height / 2;
        const distanceFromCenter = Math.abs(windowHeight / 2 - cardCenter);
        const maxDistance = windowHeight / 2;
        const scale = 1 - (distanceFromCenter / maxDistance) * 0.05;

        card.style.transform = `scale(${Math.max(0.95, Math.min(1, scale))})`;
      });

      ticking = false;
    };

    const requestScrollUpdate = () => {
      if (!ticking) {
        requestAnimationFrame(updateScrollAnimations);
        ticking = true;
      }
    };

    window.addEventListener('scroll', requestScrollUpdate, {passive: true});
  }

  // Animation queue system
  queueAnimation(element, animationClass, duration = 1000) {
    return new Promise(resolve => {
      this.animationQueue.push({
        element,
        animationClass,
        duration,
        resolve,
      });

      if (!this.isAnimating) {
        this.processAnimationQueue();
      }
    });
  }

  async processAnimationQueue() {
    if (this.animationQueue.length === 0) {
      this.isAnimating = false;
      return;
    }

    this.isAnimating = true;
    const animation = this.animationQueue.shift();

    animation.element.classList.add(animation.animationClass);

    setTimeout(() => {
      animation.element.classList.remove(animation.animationClass);
      animation.resolve();
      this.processAnimationQueue();
    }, animation.duration);
  }

  // Utility methods
  animateValue(element, start, end, duration, formatter = val => val) {
    if (this.isReducedMotion) {
      element.textContent = formatter(end);
      return Promise.resolve();
    }

    return new Promise(resolve => {
      const startTime = performance.now();

      const updateValue = currentTime => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Easing function (ease-out)
        const easeOut = 1 - Math.pow(1 - progress, 3);
        const currentValue = start + (end - start) * easeOut;

        element.textContent = formatter(currentValue);

        if (progress < 1) {
          requestAnimationFrame(updateValue);
        } else {
          resolve();
        }
      };

      requestAnimationFrame(updateValue);
    });
  }

  typeWriter(element, text, speed = 50) {
    if (this.isReducedMotion) {
      element.textContent = text;
      return Promise.resolve();
    }

    return new Promise(resolve => {
      element.textContent = '';
      let i = 0;

      const typeInterval = setInterval(() => {
        if (i < text.length) {
          element.textContent += text.charAt(i);
          i++;
        } else {
          clearInterval(typeInterval);
          resolve();
        }
      }, speed);
    });
  }

  morphElement(element, targetStyles, duration = 500) {
    if (this.isReducedMotion) {
      Object.assign(element.style, targetStyles);
      return Promise.resolve();
    }

    return new Promise(resolve => {
      const startStyles = {};
      const endStyles = {};

      // Get initial values
      Object.keys(targetStyles).forEach(prop => {
        startStyles[prop] = parseFloat(getComputedStyle(element)[prop]) || 0;
        endStyles[prop] = parseFloat(targetStyles[prop]);
      });

      const startTime = performance.now();

      const updateStyles = currentTime => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeOut = 1 - Math.pow(1 - progress, 3);

        Object.keys(targetStyles).forEach(prop => {
          const currentValue = startStyles[prop] + (endStyles[prop] - startStyles[prop]) * easeOut;
          element.style[prop] = currentValue + (prop.includes('opacity') ? '' : 'px');
        });

        if (progress < 1) {
          requestAnimationFrame(updateStyles);
        } else {
          resolve();
        }
      };

      requestAnimationFrame(updateStyles);
    });
  }

  // Performance monitoring
  measureAnimationPerformance(animationName, callback) {
    const startTime = performance.now();

    const result = callback();

    if (result instanceof Promise) {
      return result.then(() => {
        const endTime = performance.now();
        console.log(`Animation "${animationName}" took ${endTime - startTime} milliseconds`);
      });
    } else {
      const endTime = performance.now();
      console.log(`Animation "${animationName}" took ${endTime - startTime} milliseconds`);
      return result;
    }
  }

  // Cleanup methods
  pauseAllAnimations() {
    document.body.style.animationPlayState = 'paused';
    document.querySelectorAll('*').forEach(el => {
      el.style.animationPlayState = 'paused';
    });
  }

  resumeAllAnimations() {
    document.body.style.animationPlayState = 'running';
    document.querySelectorAll('*').forEach(el => {
      el.style.animationPlayState = 'running';
    });
  }

  cleanup() {
    // Clean up observers
    this.observers.forEach(observer => {
      observer.disconnect();
    });
    this.observers.clear();

    // Clear animation queue
    this.animationQueue = [];
    this.isAnimating = false;

    // Remove dynamic particles
    document.querySelectorAll('.dynamic-particle, .mouse-particle, .click-ripple').forEach(el => {
      if (el.parentNode) {
        el.parentNode.removeChild(el);
      }
    });
  }
}

// Specialized animation effects
class SpecialEffects {
  static createConfetti(x, y, colors = ['#667eea', '#764ba2', '#f093fb', '#f5576c']) {
    const confettiCount = 50;
    const confettiElements = [];

    for (let i = 0; i < confettiCount; i++) {
      const confetti = document.createElement('div');
      confetti.className = 'confetti';
      confetti.style.cssText = `
                position: fixed;
                left: ${x}px;
                top: ${y}px;
                width: ${Math.random() * 10 + 5}px;
                height: ${Math.random() * 10 + 5}px;
                background: ${colors[Math.floor(Math.random() * colors.length)]};
                pointer-events: none;
                z-index: 10000;
                animation: confetti-fall ${Math.random() * 2 + 2}s ease-out forwards;
                transform: rotate(${Math.random() * 360}deg);
            `;

      document.body.appendChild(confetti);
      confettiElements.push(confetti);
    }

    // Add confetti animation
    if (!document.getElementById('confetti-styles')) {
      const style = document.createElement('style');
      style.id = 'confetti-styles';
      style.textContent = `
                @keyframes confetti-fall {
                    0% {
                        transform: translateY(0) rotate(0deg);
                        opacity: 1;
                    }
                    100% {
                        transform: translateY(100vh) rotate(720deg);
                        opacity: 0;
                    }
                }
            `;
      document.head.appendChild(style);
    }

    // Cleanup after animation
    setTimeout(() => {
      confettiElements.forEach(el => {
        if (el.parentNode) {
          el.parentNode.removeChild(el);
        }
      });
    }, 4000);
  }

  static createFireworks(x, y) {
    const fireworkColors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7'];
    const particleCount = 30;

    for (let i = 0; i < particleCount; i++) {
      const particle = document.createElement('div');
      const angle = (i / particleCount) * Math.PI * 2;
      const velocity = Math.random() * 100 + 50;
      const color = fireworkColors[Math.floor(Math.random() * fireworkColors.length)];

      particle.style.cssText = `
                position: fixed;
                left: ${x}px;
                top: ${y}px;
                width: 4px;
                height: 4px;
                background: ${color};
                border-radius: 50%;
                pointer-events: none;
                z-index: 10000;
                animation: firework-particle 1.5s ease-out forwards;
                --angle: ${angle}rad;
                --velocity: ${velocity}px;
            `;

      document.body.appendChild(particle);

      setTimeout(() => {
        if (particle.parentNode) {
          particle.parentNode.removeChild(particle);
        }
      }, 1500);
    }

    // Add firework animation
    if (!document.getElementById('firework-styles')) {
      const style = document.createElement('style');
      style.id = 'firework-styles';
      style.textContent = `
                @keyframes firework-particle {
                    0% {
                        transform: translate(0, 0) scale(1);
                        opacity: 1;
                    }
                    100% {
                        transform: translate(
                            calc(cos(var(--angle)) * var(--velocity)),
                            calc(sin(var(--angle)) * var(--velocity))
                        ) scale(0);
                        opacity: 0;
                    }
                }
            `;
      document.head.appendChild(style);
    }
  }

  static createTextShimmer(element, duration = 2000) {
    const originalText = element.textContent;
    const shimmerOverlay = document.createElement('div');

    shimmerOverlay.style.cssText = `
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
            animation: shimmer-pass ${duration}ms ease-in-out;
        `;

    element.style.position = 'relative';
    element.style.overflow = 'hidden';
    element.appendChild(shimmerOverlay);

    // Add shimmer animation
    if (!document.getElementById('shimmer-styles')) {
      const style = document.createElement('style');
      style.id = 'shimmer-styles';
      style.textContent = `
                @keyframes shimmer-pass {
                    0% { left: -100%; }
                    100% { left: 100%; }
                }
            `;
      document.head.appendChild(style);
    }

    setTimeout(() => {
      if (shimmerOverlay.parentNode) {
        shimmerOverlay.parentNode.removeChild(shimmerOverlay);
      }
    }, duration);
  }
}

// Initialize animation controller
let animationController;

document.addEventListener('DOMContentLoaded', () => {
  animationController = new AnimationController();

  // Make it globally available
  window.animationController = animationController;
  window.SpecialEffects = SpecialEffects;
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  if (animationController) {
    animationController.cleanup();
  }
});

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {AnimationController, SpecialEffects};
}
