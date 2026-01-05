import React from 'react';
import { cn } from '@/lib/utils';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';

type AnimationType = 'fade-up' | 'fade-down' | 'fade-left' | 'fade-right' | 'zoom-in' | 'scale-up';

interface ScrollRevealProps {
  children: React.ReactNode;
  animation?: AnimationType;
  delay?: number;
  duration?: number;
  distance?: number;
  className?: string;
  threshold?: number;
}

const getAnimationStyles = (
  animation: AnimationType,
  isVisible: boolean,
  distance: number
): React.CSSProperties => {
  const baseStyles: React.CSSProperties = {
    opacity: isVisible ? 1 : 0,
    willChange: 'transform, opacity',
  };

  const transforms: Record<AnimationType, string> = {
    'fade-up': `translateY(${isVisible ? 0 : distance}px)`,
    'fade-down': `translateY(${isVisible ? 0 : -distance}px)`,
    'fade-left': `translateX(${isVisible ? 0 : distance}px)`,
    'fade-right': `translateX(${isVisible ? 0 : -distance}px)`,
    'zoom-in': `scale(${isVisible ? 1 : 0.9})`,
    'scale-up': `scale(${isVisible ? 1 : 0.95})`,
  };

  return {
    ...baseStyles,
    transform: transforms[animation],
  };
};

export function ScrollReveal({
  children,
  animation = 'fade-up',
  delay = 0,
  duration = 600,
  distance = 30,
  className,
  threshold = 0.1,
}: ScrollRevealProps) {
  const { ref, isVisible } = useScrollAnimation<HTMLDivElement>({ threshold });

  const animationStyles = getAnimationStyles(animation, isVisible, distance);

  return (
    <div
      ref={ref}
      className={cn('scroll-reveal', className)}
      style={{
        ...animationStyles,
        transition: `all ${duration}ms cubic-bezier(0.4, 0, 0.2, 1) ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}
