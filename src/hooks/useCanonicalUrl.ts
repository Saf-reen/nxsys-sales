import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const SITE_ORIGIN = 'https://nxsysdigital.com';

/**
 * /product/:id and /products/:id both render ProductDetails (see App.tsx routes).
 * Canonicalize the singular alias to the plural form so Google treats them as
 * one URL instead of duplicate content.
 */
const toCanonicalPath = (pathname: string): string => pathname.replace(/^\/product\//, '/products/');

/** Keeps the document's <link rel="canonical"> in sync with the current route. */
export const useCanonicalUrl = (): void => {
  const location = useLocation();

  useEffect(() => {
    const path = toCanonicalPath(location.pathname);
    let link = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = document.createElement('link');
      link.setAttribute('rel', 'canonical');
      document.head.appendChild(link);
    }
    link.setAttribute('href', `${SITE_ORIGIN}${path}`);
  }, [location.pathname]);
};
