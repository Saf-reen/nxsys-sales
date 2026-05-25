import { useMemo } from 'react';
import placeholder from '../../assets/placeholder.jpg';
import { getBrandName, getCategoryName } from '@/services';
import { useProducts } from '@/hooks/useProducts';
import HeroBanner from '@/components/home/HeroBanner';
import TopSellersGrid from '@/components/home/TopSellersGrid';
import CategoryCarousel, { type CarouselVariant } from '@/components/home/CategoryCarousel';
import CategoryBrandStrip from '@/components/home/CategoryBrandStrip';
import WhyChooseUs from '@/components/home/WhyChooseUs';

import { categoryBrandStrip as showcaseCategoryBrandStrip, heroSlides } from '@/utils';

const CAROUSEL_VARIANTS: CarouselVariant[] = ['light', 'dark', 'tinted', 'slate'];

const normalizeText = (value: any) => String(value || '').trim();

const BRAND_SERIES_ALIASES = {
  Dell: ['precision', 'ultrasharp', 'latitude', 'optiplex', 'vostro', 'inspiron', 'alienware'],
  HP: ['hp z', 'zbook', 'elitedisplay', 'elitebook', 'probook', 'omen'],
  Lenovo: ['thinkpad', 'thinkcentre', 'thinkvision', 'legion', 'yoga'],
  Epson: ['ecotank', 'powerlite', 'workforce'],
  Acer: ['travelmate', 'predator', 'nitro', 'aspire', 'veriton'],
  MSI: ['stealth', 'raider', 'prestige', 'creator', 'vector', 'katana'],
};

const resolveBrandWithLogo = (brandName: any, logoByBrand: any) => {
  const normalizedBrandName = normalizeText(brandName).toLowerCase();

  if (!normalizedBrandName) {
    return null;
  }

  const directMatch = logoByBrand.get(normalizedBrandName);
  if (directMatch) {
    return directMatch;
  }

  for (const [logoName, logoEntry] of logoByBrand.entries()) {
    if (normalizedBrandName.includes(logoName)) {
      return logoEntry;
    }
  }

  for (const [brandKey, aliases] of Object.entries(BRAND_SERIES_ALIASES)) {
    if (aliases.some((alias) => normalizedBrandName.includes(alias))) {
      return logoByBrand.get(brandKey.toLowerCase()) || null;
    }
  }

  return null;
};

const buildProductCard = (product: any, categories: any[] = []) => {
  const categoryName = getCategoryName(product.category, categories);

  return {
    id: product.id,
    name: normalizeText(product.name),
    brand: normalizeText(product.brandName || getBrandName(product.brand)),
    category: categoryName,
    productType: normalizeText(product.subcategory) || categoryName || 'Product',
    mpn: product.mpn || product.model_number || product.model || '--',
    sku: product.sku || product.sku_code || product.item_code || '--',
    image: product.image || product.product_image || (Array.isArray(product.images) ? product.images[0] : '') || placeholder,
    images: product.images || [],
    isNew: Boolean(product.isNew || product.featured),
  };
};

function Home() {
  const { products = [], topSellingProducts = [], categories = [], brands = [], loading = false, error = null } = useProducts() ?? {};

  const topSellers = useMemo(() => {
    const sourceProducts =
      Array.isArray(topSellingProducts) && topSellingProducts.length
        ? topSellingProducts
        : Array.isArray(products)
          ? products
          : [];

    return sourceProducts.slice(0, 4).map((product: any) => buildProductCard(product, categories));
  }, [topSellingProducts, products, categories]);

  // Group products by category, sorted by count descending, max 6 categories
  const categoryCarousels = useMemo(() => {
    if (!Array.isArray(products) || !products.length) return [];
    const grouped: Record<string, any[]> = {};
    products.forEach((product: any) => {
      const catName = getCategoryName(product.category, categories);
      if (!catName) return;
      if (!grouped[catName]) grouped[catName] = [];
      grouped[catName].push(buildProductCard(product, categories));
    });
    return Object.entries(grouped)
      .filter(([, items]) => items.length >= 1)
      .sort(([, a], [, b]) => b.length - a.length)
      .map(([catName, items], idx) => ({
        category: catName,
        products: items.slice(0, 12),
        variant: CAROUSEL_VARIANTS[idx % CAROUSEL_VARIANTS.length],
      }));
  }, [products, categories]);

  const categoryBrandStrip = useMemo(() => {
    const logoByBrand = new Map(
      showcaseCategoryBrandStrip.brands.map((brand) => [normalizeText(brand.name).toLowerCase(), brand]),
    );

    const liveBrands = (
      Array.isArray(brands) && brands.length
        ? brands.map((brand) => brand?.name)
        : products.map((product) => product.brandName || getBrandName(product.brand, brands))
    )
      .map((brand) => normalizeText(brand))
      .filter(Boolean);

    const uniqueLiveBrands = Array.from(new Set(liveBrands));
    const normalizedLiveBrands = uniqueLiveBrands.map((brandName) => {
      const showcaseBrand = resolveBrandWithLogo(brandName, logoByBrand);
      return showcaseBrand ? { ...showcaseBrand, name: brandName } : { name: brandName };
    });

    const fallbackShowcaseBrands = showcaseCategoryBrandStrip.brands.filter(
      (brand) => !uniqueLiveBrands.some((liveBrand) => liveBrand.toLowerCase() === normalizeText(brand.name).toLowerCase()),
    );

    const finalBrands = [...normalizedLiveBrands, ...fallbackShowcaseBrands];

    return {
      ...showcaseCategoryBrandStrip,
      brands: finalBrands,
    };
  }, [brands, products]);


  return (
    <main className="bg-greyLight">
      <HeroBanner slides={heroSlides} />
      <TopSellersGrid products={topSellers} loading={loading} error={error || undefined} />

      {categoryCarousels.map(({ category, products: catProducts, variant }) => (
        <CategoryCarousel
          key={category}
          category={category}
          products={catProducts}
          variant={variant}
        />
      ))}

      <CategoryBrandStrip data={categoryBrandStrip} />
      <WhyChooseUs />
    </main>
  );
}

export default Home;


