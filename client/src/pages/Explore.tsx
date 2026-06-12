import { useParams, Link } from 'react-router-dom';
import { useEffect, useState } from 'react';

interface Category {
  id: string;
  name: string;
  count?: number;
}

export default function Explore() {
  const { category } = useParams<{ category: string }>();
  const [subcategories, setSubcategories] = useState<Category[]>([]);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  useEffect(() => {
    let categories: Category[] = [];

    if (category === 'body-style') {
      categories = [
        { id: 'sedan', name: 'SEDAN' },
        { id: 'suv', name: 'SUV' },
        { id: 'truck', name: 'TRUCK' },
        { id: 'coupe', name: 'COUPE' },
        { id: 'hatchback', name: 'HATCHBACK' },
        { id: 'wagon', name: 'WAGON' },
        { id: 'convertible', name: 'CONVERTIBLE' },
        { id: 'minivan', name: 'MINIVAN' },
      ];
    } else if (category === 'brand') {
      categories = [
        { id: 'Toyota', name: 'TOYOTA' },
        { id: 'Honda', name: 'HONDA' },
        { id: 'Ford', name: 'FORD' },
        { id: 'Chevrolet', name: 'CHEVROLET' },
        { id: 'BMW', name: 'BMW' },
        { id: 'Mercedes-Benz', name: 'MERCEDES-BENZ' },
        { id: 'Audi', name: 'AUDI' },
        { id: 'Porsche', name: 'PORSCHE' },
        { id: 'Tesla', name: 'TESLA' },
        { id: 'Ferrari', name: 'FERRARI' },
        { id: 'Lamborghini', name: 'LAMBORGHINI' },
        { id: 'Lexus', name: 'LEXUS' },
        { id: 'Nissan', name: 'NISSAN' },
        { id: 'Mazda', name: 'MAZDA' },
        { id: 'Subaru', name: 'SUBARU' },
        { id: 'Land Rover', name: 'LAND ROVER' },
      ];
    } else if (category === 'purpose') {
      categories = [
        { id: 'daily-commute', name: 'DAILY COMMUTE' },
        { id: 'family', name: 'FAMILY' },
        { id: 'performance', name: 'PERFORMANCE' },
        { id: 'luxury', name: 'LUXURY' },
        { id: 'off-road', name: 'OFF-ROAD' },
        { id: 'eco-friendly', name: 'ECO-FRIENDLY' },
      ];
    } else if (category === 'era') {
      categories = [
        { id: '1990s', name: '1990s CLASSICS' },
        { id: '2000s', name: '2000s MILLENNIUM' },
        { id: '2010s', name: '2010s MODERN' },
        { id: '2020s', name: '2020s FUTURE' },
      ];
    }

    setSubcategories(categories);
  }, [category]);

  const getCategoryTitle = () => {
    switch (category) {
      case 'body-style': return 'SELECT TYPE';
      case 'brand': return 'SELECT MAKE';
      case 'purpose': return 'SELECT PURPOSE';
      case 'era': return 'SELECT ERA';
      default: return 'SELECT';
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header Section */}
      <section className="h-screen flex flex-col items-center justify-center relative overflow-hidden border-b border-zinc-800">
        <div className="absolute inset-0 bg-gradient-to-b from-black via-zinc-900 to-black opacity-50" />

        <div className="relative z-10 text-center px-8 max-w-6xl">
          {/* Back Link */}
          <Link
            to="/"
            className="inline-flex items-center gap-3 text-xs tracking-[0.3em] text-zinc-600 hover:text-white transition-colors mb-12 group"
          >
            <svg className="w-6 h-6 group-hover:-translate-x-2 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M7 16l-4-4m0 0l4-4m-4 4h18" />
            </svg>
            <span>BACK</span>
          </Link>

          <div className="overflow-hidden mb-8">
            <h1 className="text-7xl md:text-8xl font-black tracking-tighter">
              {getCategoryTitle()}
            </h1>
          </div>

          <div className="h-px w-48 bg-gradient-to-r from-transparent via-zinc-700 to-transparent mx-auto mb-8" />

          <p className="text-sm tracking-[0.3em] text-zinc-600 uppercase">
            {subcategories.length} Options Available
          </p>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-12 left-1/2 transform -translate-x-1/2 animate-bounce">
          <div className="w-px h-16 bg-gradient-to-b from-white to-transparent" />
        </div>
      </section>

      {/* Subcategories Grid - Full Screen Sections */}
      {subcategories.map((subcat, index) => (
        <Link
          key={subcat.id}
          to={`/vehicles/${category}/${encodeURIComponent(subcat.id)}`}
          className="block"
          onMouseEnter={() => setHoveredIndex(index)}
          onMouseLeave={() => setHoveredIndex(null)}
        >
          <section className="h-screen flex items-center justify-center relative overflow-hidden border-b border-zinc-800 group cursor-pointer">
            {/* Background Effect */}
            <div
              className={`absolute inset-0 bg-white transition-opacity duration-700 ${
                hoveredIndex === index ? 'opacity-5' : 'opacity-0'
              }`}
            />

            {/* Grid Pattern */}
            <div className="absolute inset-0 opacity-5">
              <div className="absolute inset-0" style={{
                backgroundImage: 'linear-gradient(rgba(255,255,255,.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.05) 1px, transparent 1px)',
                backgroundSize: '50px 50px'
              }} />
            </div>

            {/* Content */}
            <div className="relative z-10 text-center px-8">
              {/* Index */}
              <div className="mb-8">
                <p className="text-8xl md:text-9xl font-black text-zinc-900 group-hover:text-zinc-800 transition-colors duration-700">
                  {String(index + 1).padStart(2, '0')}
                </p>
              </div>

              {/* Name */}
              <div className="mb-8">
                <h2 className="text-5xl md:text-7xl font-black tracking-tighter group-hover:tracking-wider transition-all duration-700">
                  {subcat.name}
                </h2>
              </div>

              {/* Divider */}
              <div className={`h-px w-64 mx-auto mb-8 transition-all duration-700 ${
                hoveredIndex === index
                  ? 'bg-gradient-to-r from-transparent via-white to-transparent'
                  : 'bg-gradient-to-r from-transparent via-zinc-800 to-transparent'
              }`} />

              {/* Enter Arrow */}
              <div className={`inline-flex items-center gap-4 text-xs tracking-[0.3em] transition-all duration-700 ${
                hoveredIndex === index ? 'text-white translate-x-4' : 'text-zinc-700 translate-x-0'
              }`}>
                <span>ENTER</span>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </div>
            </div>
          </section>
        </Link>
      ))}
    </div>
  );
}
