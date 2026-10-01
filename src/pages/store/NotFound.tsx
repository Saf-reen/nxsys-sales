import { Link } from 'react-router-dom';
import { useDocumentHead } from '@/hooks/useDocumentHead';

function NotFound() {
  useDocumentHead({
    title: 'Page Not Found | NxSys Digital',
    description: 'The page you are looking for does not exist or has been moved. Return to the NxSys Digital catalog.',
  });

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center p-6 text-center">
      <div className="space-y-4">
        <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Error 404</p>
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">Page not found</h1>
        <p className="mx-auto max-w-md text-slate-600">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
          Check the URL or return to our catalog.
        </p>
        <h2 className="sr-only">Page not found</h2>
        <h3 className="sr-only">Suggested action</h3>
        <h4 className="sr-only">Return to catalog</h4>
        <h5 className="sr-only">Continue browsing</h5>
        <h6 className="sr-only">NxSys Digital</h6>
        <div className="pt-6">
          <Link
            to="/products"
            className="inline-flex rounded-full bg-slate-950 px-8 py-4 text-sm font-semibold text-white transition hover:bg-primary hover:text-textMain hover:opacity-90"
          >
            Back to Catalog
          </Link>
        </div>
      </div>
    </div>
  );
}

export default NotFound;
