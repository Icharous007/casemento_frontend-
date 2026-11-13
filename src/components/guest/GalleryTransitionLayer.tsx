import { useEffect, useState } from 'react';

interface TransitionEventDetail {
  id: string;
  photoUrl: string | null;
  active: boolean;
}

export default function GalleryTransitionLayer() {
  const [transition, setTransition] = useState<TransitionEventDetail | null>(null);

  useEffect(() => {
    function handleTransition(event: Event) {
      const { detail } = event as CustomEvent<TransitionEventDetail>;
      setTransition((current) => {
        if (!detail.active && current?.id !== detail.id) return current;
        return detail.active ? detail : null;
      });
    }

    window.addEventListener('casamento:gallery-transition', handleTransition);
    return () => window.removeEventListener('casamento:gallery-transition', handleTransition);
  }, []);

  if (!transition?.active || !transition.photoUrl) return null;

  return (
    <div className="gallery-transition-layer" aria-hidden="true">
      <img src={transition.photoUrl} alt="" />
    </div>
  );
}
