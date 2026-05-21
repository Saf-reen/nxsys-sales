import { useMemo, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { resolveAssetUrl } from '@/services';
import placeholder from '../../assets/placeholder.jpg';

const ZOOM_FACTOR = 3;
const LENS_FRACTION = 0.35; // Lens covers 35% of the container each axis

interface LensData {
  x: number;
  y: number;
  containerW: number;
  containerH: number;
  containerRight: number;
  containerTop: number;
}

function ProductGallery({ images = [] as any[], alt = 'Product image' }: { images?: any[]; alt?: string }) {
  const [selectedImage, setSelectedImage] = useState('');
  const [isHovering, setIsHovering] = useState(false);
  const [lens, setLens] = useState<LensData | null>(null);
  const mainImageRef = useRef<HTMLDivElement>(null);

  const galleryImages = useMemo(() => {
    const raw = Array.isArray(images) ? images : [];
    const urls = raw
      .map((img: any) => (typeof img === 'string' ? img : (img?.image || img?.url || img?.image_url)))
      .filter(Boolean);
    return [...new Set(urls)] as string[];
  }, [images]);

  const activeImage = galleryImages.find((img) => img === selectedImage) || galleryImages[0] || '';
  const resolvedImage = resolveAssetUrl(activeImage) || placeholder;

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!mainImageRef.current) return;
    const r = mainImageRef.current.getBoundingClientRect();
    const lensW = r.width * LENS_FRACTION;
    const lensH = r.height * LENS_FRACTION;
    const mouseX = e.clientX - r.left;
    const mouseY = e.clientY - r.top;
    setLens({
      x: Math.max(0, Math.min(mouseX - lensW / 2, r.width - lensW)),
      y: Math.max(0, Math.min(mouseY - lensH / 2, r.height - lensH)),
      containerW: r.width,
      containerH: r.height,
      containerRight: r.right,
      containerTop: r.top,
    });
    if (!isHovering) setIsHovering(true);
  };

  const handleMouseLeave = () => {
    setIsHovering(false);
    setLens(null);
  };

  if (!galleryImages.length) {
    return (
      <div className="flex aspect-square w-full items-center justify-center rounded-2xl border border-slate-100 bg-slate-50">
        <img src={placeholder} alt="No preview" className="w-1/3 opacity-15" />
      </div>
    );
  }

  // Build zoom panel CSS — only on lg screens with enough room to the right
  let zoomStyle: React.CSSProperties | null = null;
  if (lens && typeof window !== 'undefined' && window.innerWidth >= 1024) {
    const { x, y, containerW, containerH, containerRight, containerTop } = lens;
    const lensW = containerW * LENS_FRACTION;
    const lensH = containerH * LENS_FRACTION;
    const lensCenterX = x + lensW / 2;
    const lensCenterY = y + lensH / 2;
    const panelLeft = containerRight + 16;
    const panelW = containerW;
    const panelH = containerH;

    if (panelLeft + panelW <= window.innerWidth - 8) {
      zoomStyle = {
        position: 'fixed',
        left: panelLeft,
        top: containerTop,
        width: panelW,
        height: panelH,
        zIndex: 9999,
        backgroundImage: `url(${resolvedImage})`,
        backgroundPosition: `${panelW / 2 - lensCenterX * ZOOM_FACTOR}px ${panelH / 2 - lensCenterY * ZOOM_FACTOR}px`,
        backgroundSize: `${containerW * ZOOM_FACTOR}px ${containerH * ZOOM_FACTOR}px`,
        backgroundRepeat: 'no-repeat',
        backgroundColor: 'white',
      };
    }
  }

  return (
    <div className="flex flex-col-reverse gap-4 lg:flex-row lg:gap-5">
      {/* Thumbnails Sidebar */}
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
                src={resolveAssetUrl(image) ?? undefined}
                alt={`${alt} view ${idx + 1}`}
                className="h-full w-full object-contain p-1.5 transition-transform duration-300 group-hover:scale-110"
                loading="lazy"
                decoding="async"
                onError={(e: any) => { e.currentTarget.src = placeholder; }}
              />
              {activeImage === image && (
                <div className="absolute inset-0 bg-primary/5 pointer-events-none" />
              )}
            </button>
          ))}
        </div>
      )}

      {/* Main Image */}
      <div
        ref={mainImageRef}
        className="relative flex-1 aspect-square overflow-hidden rounded-2xl border border-slate-200/60 bg-white shadow-sm"
        style={{ cursor: isHovering ? 'crosshair' : 'zoom-in' }}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={handleMouseLeave}
        onMouseMove={handleMouseMove}
      >
        <div className="absolute inset-0 flex items-center justify-center p-4 sm:p-6 lg:p-10">
          <img
            key={activeImage}
            src={resolvedImage}
            alt={alt}
            className="h-full w-full object-contain"
            loading="eager"
            fetchPriority="high"
            decoding="async"
            onError={(e: any) => { e.currentTarget.src = placeholder; }}
          />
        </div>

        {/* Lens rectangle */}
        {lens && (
          <div
            className="absolute pointer-events-none"
            style={{
              left: lens.x,
              top: lens.y,
              width: lens.containerW * LENS_FRACTION,
              height: lens.containerH * LENS_FRACTION,
              border: '1px solid rgba(100,100,100,0.35)',
              background: 'rgba(255,255,255,0.18)',
              boxShadow: '0 0 0 1px rgba(0,0,0,0.06)',
            }}
          />
        )}

        {/* Mobile dot indicators */}
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

      {/* Zoom panel — rendered into document.body via portal */}
      {zoomStyle && typeof document !== 'undefined' &&
        createPortal(
          <div
            className="overflow-hidden rounded-2xl border border-slate-200 shadow-[0_20px_60px_rgba(0,0,0,0.14)] pointer-events-none"
            style={zoomStyle}
          />,
          document.body,
        )
      }
    </div>
  );
}

export default ProductGallery;
