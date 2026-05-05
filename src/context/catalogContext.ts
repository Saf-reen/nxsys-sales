import { createContext } from 'react';
import type { CatalogContextValue } from '@/types';

export const CatalogContext = createContext<CatalogContextValue | null>(null);
