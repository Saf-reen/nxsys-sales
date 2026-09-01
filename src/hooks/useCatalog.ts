import { useContext } from 'react';
import { CatalogContext } from '@/context/catalogContext';
import type { CatalogContextValue } from '@/types';

export const useCatalog = (): CatalogContextValue => {
  const context = useContext(CatalogContext);
  if (context === null) {
    throw new Error('useCatalog must be used within a CatalogProvider');
  }
  return context;
};
