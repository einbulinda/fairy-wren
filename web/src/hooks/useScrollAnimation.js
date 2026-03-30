import { useEffect, useRef, useState } from "react";

/**
 * Hook for scroll-triggered animations using Intersection Observer
 * @param {Object} options - Configuration options
 * @param {number} options.threshold - Percentage of element visible before triggering (0-1)
 * @param {string} options.rootMargin - Margin around root for triggering
 * @param {boolean} options.triggerOnce - Whether to only trigger once
 * @returns {Object} - ref to attach to element and isVisible state
 */
export function useScrollAnimation(options = {}) {
  const { threshold = 0.15, rootMargin = "0px", triggerOnce = true } = options;
  const ref = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          if (triggerOnce) {
            observer.unobserve(element);
          }
        } else if (!triggerOnce) {
          setIsVisible(false);
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [threshold, rootMargin, triggerOnce]);

  return { ref, isVisible };
}

/**
 * Hook for animating multiple elements with staggered delays
 * @param {number} count - Number of elements to animate
 * @param {Object} options - Configuration options
 * @returns {Object} - refs array and visibility states
 */
export function useStaggerAnimation(count, options = {}) {
  const { threshold = 0.1, rootMargin = "0px", staggerDelay = 100 } = options;
  const refs = useRef([]);
  const [visibleItems, setVisibleItems] = useState(new Array(count).fill(false));

  useEffect(() => {
    const observers = [];

    refs.current.forEach((element, index) => {
      if (!element) return;

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setTimeout(() => {
              setVisibleItems((prev) => {
                const next = [...prev];
                next[index] = true;
                return next;
              });
            }, index * staggerDelay);
            observer.unobserve(element);
          }
        },
        { threshold, rootMargin }
      );

      observer.observe(element);
      observers.push(observer);
    });

    return () => {
      observers.forEach((observer) => observer.disconnect());
    };
  }, [count, threshold, rootMargin, staggerDelay]);

  const setRef = (index) => (el) => {
    refs.current[index] = el;
  };

  return { setRef, visibleItems };
}

/**
 * Hook for parallax scrolling effect
 * @param {number} speed - Parallax speed multiplier
 * @returns {Object} - ref and transform style
 */
export function useParallax(speed = 0.5) {
  const ref = useRef(null);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      if (!ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      const scrolled = window.scrollY;
      const elementTop = rect.top + scrolled;
      const relativeScroll = scrolled - elementTop + window.innerHeight;
      setOffset(relativeScroll * speed);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, [speed]);

  return { ref, offset };
}

export default useScrollAnimation;
