import React, { useLayoutEffect } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import { MobileApp } from './app/mobile/MobileApp';
import { DesktopApp } from './app/desktop/DesktopApp';
import { useMediaQuery } from './shared/hooks/useMediaQuery';

const MOBILE_QUERY = '(max-width: 820px)';

function applyPlatformClass(isMobile: boolean) {
  document.body.classList.toggle('trajectum-mobile', isMobile);
  document.body.classList.toggle('trajectum-desktop', !isMobile);
}

function App() {
  const isMobile = useMediaQuery(MOBILE_QUERY);

  useLayoutEffect(() => {
    applyPlatformClass(isMobile);
    return () => {
      document.body.classList.remove('trajectum-mobile', 'trajectum-desktop');
    };
  }, [isMobile]);

  return isMobile ? <MobileApp /> : <DesktopApp />;
}

applyPlatformClass(window.matchMedia(MOBILE_QUERY).matches);
createRoot(document.getElementById('root')!).render(<App />);
