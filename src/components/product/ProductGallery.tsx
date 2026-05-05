import { useMemo, useState } from 'react';
import { resolveAssetUrl } from '@/services';
import placeholder from '../../assets/placeholder.jpg';

function ProductGallery({ images = [] as any[], alt = 'Product image' }: { images?: any[]; alt?: string }) {
  const [selectedImage, setSelectedImage] = useState('');

  const galleryImages = useMemo(
    () =>
      [
        ...new Set(
          (Array.isArray(images) ? images : [])
            .map((img) => (typeof img === 'string' ? img : img?.image))
            .filter(Boolean),
        ),
      ],
    [images],
  );

  const activeImage =
    galleryImages.find((image) => image === selectedImage) || galleryImages[0] || '';

  if (!galleryImages.length) {
    return (
      <div className="flex aspect-square w-full items-center justify-center rounded-2xl border border-slate-100 bg-slate-50">
        <img src={placeholder} alt="No preview" className="w-1/3 opacity-15" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 lg:gap-6">
      {/* Main image */}
      <div className="group relative aspect-square overflow-hidden rounded-2xl border border-slate-200/60 bg-gradient-to-br from-slate-50 to-white p-5 shadow-[0_4px_24px_rgba(15,23,42,0.06)] transition-all duration-500 sm:rounded-3xl sm:p-8 lg:p-10">
        <img
          src={(resolveAssetUrl(activeImage)) ?? undefined}
          alt={alt}
          className="h-full w-full object-contain transition-transform duration-700 group-hover:scale-[1.04]"
          loading="eager"
          fetchPriority="high"
          decoding="async"
          onError={(e) => { e.currentTarget.src = placeholder; }}
        />
      </div>

      {/* Thumbnails */}
      {galleryImages.length > 1 && (
        <div className="flex flex-wrap gap-2.5 sm:gap-3">
          {galleryImages.map((image, idx) => (
            <button
              key={`${image}-${idx}`}
              type="button"
              onMouseEnter={() => setSelectedImage(image)}
              onClick={() => setSelectedImage(image)}
              className={`h-[60px] w-[60px] overflow-hidden rounded-xl border-2 transition-all duration-200 sm:h-[72px] sm:w-[72px] ${
                activeImage === image
                  ? 'border-primary shadow-[0_0_0_3px_rgba(251,198,29,0.2)]'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <img
                src={(resolveAssetUrl(image)) ?? undefined}
                alt={`${alt} view ${idx + 1}`}
                className="h-full w-full object-contain p-2"
                loading="lazy"
                decoding="async"
                onError={(e) => { e.currentTarget.src = placeholder; }}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default ProductGallery;
