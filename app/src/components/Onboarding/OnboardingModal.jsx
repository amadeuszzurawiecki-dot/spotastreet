import { useState } from 'react';
import useUserProfile from '../../hooks/useUserProfile';
import './OnboardingModal.css';

const SLIDES = [
  {
    icon: '📍',
    title: 'Witaj w Bolters Legnica!',
    desc: 'Unikalna gra topograficzna stworzona specjalnie dla mieszkańców Legnicy i prawdziwych kierowców Bolta.',
  },
  {
    icon: '⏱️',
    title: 'Graj i Rywalizuj',
    desc: 'Zgaduj ulice, trafiaj w dziesiątkę pinezką i zdobywaj punkty w rywalizacji z komputerem oraz innymi graczymi!',
  },
  {
    icon: '🚘',
    title: 'Skonfiguruj swój profil',
    desc: 'Wybierz swój ulubiony avatar Legnickiego Bolciarza i zarejestruj swoje auto, aby zabłysnąć w rankingach.',
  },
];

export function OnboardingModal({ onClose }) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const { completeOnboarding } = useUserProfile();

  const handleNext = () => {
    if (currentSlide < SLIDES.length - 1) {
      setCurrentSlide(prev => prev + 1);
    } else {
      completeOnboarding();
      onClose?.();
    }
  };

  const slide = SLIDES[currentSlide];

  return (
    <div className="onboarding-overlay animate-fade-in">
      <div className="onboarding-modal glass-card animate-scale-in">
        <div className="onboarding-modal__icon">{slide.icon}</div>
        <h2 className="onboarding-modal__title text-display">{slide.title}</h2>
        <p className="onboarding-modal__desc">{slide.desc}</p>

        {/* Slide Indicators */}
        <div className="onboarding-modal__dots">
          {SLIDES.map((_, i) => (
            <div
              key={i}
              className={`onboarding-modal__dot ${i === currentSlide ? 'onboarding-modal__dot--active' : ''}`}
            />
          ))}
        </div>

        <button className="btn-primary" onClick={handleNext}>
          {currentSlide === SLIDES.length - 1 ? 'Zaczynamy!' : 'Dalej →'}
        </button>
      </div>
    </div>
  );
}

export default OnboardingModal;
