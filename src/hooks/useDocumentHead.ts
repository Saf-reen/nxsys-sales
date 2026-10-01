import { useEffect } from 'react';

const setMetaByName = (name: string, content: string) => {
  let tag = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute('name', name);
    document.head.appendChild(tag);
  }
  tag.setAttribute('content', content);
};

const setMetaByProperty = (property: string, content: string) => {
  let tag = document.querySelector<HTMLMetaElement>(`meta[property="${property}"]`);
  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute('property', property);
    document.head.appendChild(tag);
  }
  tag.setAttribute('content', content);
};

/** Keeps <title> and the description/OG/Twitter meta tags in sync with the current page. */
export const useDocumentHead = ({ title, description }: { title: string; description: string }): void => {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = title;
    setMetaByName('description', description);
    setMetaByProperty('og:title', title);
    setMetaByProperty('og:description', description);
    setMetaByName('twitter:title', title);
    setMetaByName('twitter:description', description);

    return () => {
      document.title = previousTitle;
    };
  }, [title, description]);
};
