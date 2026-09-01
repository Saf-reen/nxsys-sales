import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  path?: string;
  active?: boolean;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  containerClassName?: string;
}

const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ items, containerClassName = "" }) => {
  return (
    <div className={`border-b border-slate-200 bg-white shadow-sm ${containerClassName}`}>
      <div className="container-shell">
        <nav className="flex flex-wrap items-center gap-x-2 py-4 text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">
          <Link to="/" className="hover:text-primary transition-colors">Home</Link>
          
          {items.map((item, index) => (
            <React.Fragment key={index}>
              <ChevronRight size={12} className="text-slate-300 shrink-0" />
              {item.path && !item.active ? (
                <Link 
                  to={item.path} 
                  className="hover:text-primary transition-colors whitespace-nowrap"
                >
                  {item.label}
                </Link>
              ) : (
                <span className={`truncate ${item.active ? 'text-slate-900' : ''}`}>
                  {item.label}
                </span>
              )}
            </React.Fragment>
          ))}
        </nav>
      </div>
    </div>
  );
};

export default Breadcrumbs;
