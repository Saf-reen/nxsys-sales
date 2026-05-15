import { useMemo, useState, useRef } from 'react';
import { resolveAssetUrl } from '@/services';
import placeholder from '../../assets/placeholder.jpg';

function ProductGallery({ images = [] as any[], alt = 'Product image' }: { images?: any[]; alt?: string }) {
  const [selectedImage, setSelectedImage] = useState('');
  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomPos, setZoomPos] = useState({ x: 0, y: 0 });
  const mainImageRef = useRef<HTMLDivElement>(null);

  const galleryImages = useMemo(
    () => {
      const raw = Array.isArray(images) ? images : [];
      const urls = raw
        .map((img) => (typeof img === 'string' ? img : (img?.image || img?.url || img?.image_url)))
        .filter(Boolean);
      return [...new Set(urls)];
    },
    [images],
  );

  const activeImage =
    galleryImages.find((image) => image === selectedImage) || galleryImages[0] || '';

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!mainImageRef.current) return;
    const { left, top, width, height } = mainImageRef.current.getBoundingClientRect();
    const x = ((e.pageX - left - window.scrollX) / width) * 100;
    const y = ((e.pageY - top - window.scrollY) / height) * 100;
    setZoomPos({ x, y });
  };

  if (!galleryImages.length) {
    return (
      <div className="flex aspect-square w-full items-center justify-center rounded-2xl border border-slate-100 bg-slate-50">
        <img src={placeholder} alt="No preview" className="w-1/3 opacity-15" />
      </div>
    );
  }

  return (
    <div className="flex flex-col-reverse gap-4 lg:flex-row lg:gap-5">
      {/* Thumbnails Sidebar - Left on Desktop, Bottom on Mobile */}
      {galleryImages.length > 1 && (
        <div className="flex flex-row gap-2 overflow-x-auto pb-2 scrollbar-hide lg:flex-col lg:gap-3 lg:overflow-visible lg:pb-0">
          {galleryImages.map((image, idx) => (
            <button
              key={`${image}-${idx}`}
              type="button"
              onMouseEnter={() => setSelectedImage(image)}
              onClick={() => setSelectedImage(image)}
              className={`group relative h-[56px] w-[56px] shrink-0 overflow-hidden rounded-lg border-2 transition-all duration-200 lg:h-[64px] lg:w-[64px] ${
                activeImage === image
                  ? 'border-primary shadow-[0_0_0_2px_rgba(251,198,29,0.2)]'
                  : 'border-slate-100 bg-white hover:border-primary/40'
              }`}
            >
              <img
                src={(resolveAssetUrl(image)) ?? undefined}
                alt={`${alt} view ${idx + 1}`}
                className="h-full w-full object-contain p-1.5 transition-transform duration-300 group-hover:scale-110"
                loading="lazy"
                decoding="async"
                onError={(e) => { e.currentTarget.src = placeholder; }}
              />
              {activeImage === image && (
                <div className="absolute inset-0 bg-primary/5 pointer-events-none" />
              )}
            </button>
          ))}
        </div>
      )}

      {/* Main Image Viewport */}
      <div 
        ref={mainImageRef}
        className="relative flex-1 aspect-square overflow-hidden rounded-2xl border border-slate-200/60 bg-white cursor-zoom-in shadow-sm"
        onMouseEnter={() => setIsZoomed(true)}
        onMouseLeave={() => setIsZoomed(false)}
        onMouseMove={handleMouseMove}
      >
        <div className="absolute inset-0 flex items-center justify-center p-4 sm:p-6 lg:p-10">
          <img
            key={activeImage} // Key helps trigger animation on image change
            src={(resolveAssetUrl(activeImage)) ?? undefined}
            alt={alt}
            className={`h-full w-full object-contain transition-all duration-300 animate-fade-in ${isZoomed ? 'opacity-0' : 'opacity-100'}`}
            loading="eager"
            fetchPriority="high"
            decoding="async"
            onError={(e) => { e.currentTarget.src = placeholder; }}
          />
        </div>
        
        {/* Amazon-style Zoom Overlay */}
        {isZoomed && (
          <div 
            className="absolute inset-0 z-10 pointer-events-none bg-no-repeat transition-opacity duration-300"
            style={{
              backgroundImage: `url(${resolveAssetUrl(activeImage)})`,
              backgroundPosition: `${zoomPos.x}% ${zoomPos.y}%`,
              backgroundSize: '250%',
              backgroundColor: 'white'
            }}
          />
        )}

        {/* Small badge for multiple images hint on mobile */}
        {galleryImages.length > 1 && (
          <div className="absolute bottom-4 right-4 flex gap-1 lg:hidden">
            {galleryImages.map((_, i) => (
              <div 
                key={i} 
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  activeImage === galleryImages[i] ? 'w-4 bg-primary' : 'w-1.5 bg-slate-300'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default ProductGallery;
