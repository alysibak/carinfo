import { useParams, Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import * as api from '../services/api';

interface Category {
  id: string;
  name: string;
  description: string;
  count?: number;
}

export default function Explore() {
  const { category } = useParams<{ category: string }>();
  const [subcategories, setSubcategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSubcategories();
  }, [category]);

  const loadSubcategories = async () => {
    setLoading(true);

    if (category === 'body-style') {
      // Get counts for each body style
      const results = await api.searchCars({ filters: {} });
      const bodyCounts: Record<string, number> = {};

      results.results.forEach(car => {
        bodyCounts[car.bodyStyle] = (bodyCounts[car.bodyStyle] || 0) + 1;
      });

      setSubcategories([
        { id: 'sedan', name: 'Sedans', description: 'Classic four-door comfort', count: bodyCounts['sedan'] || 0 },
        { id: 'suv', name: 'SUVs', description: 'Spacious and versatile', count: bodyCounts['suv'] || 0 },
        { id: 'truck', name: 'Trucks', description: 'Power and capability', count: bodyCounts['truck'] || 0 },
        { id: 'coupe', name: 'Coupes', description: 'Sporty and stylish', count: bodyCounts['coupe'] || 0 },
        { id: 'hatchback', name: 'Hatchbacks', description: 'Compact and practical', count: bodyCounts['hatchback'] || 0 },
        { id: 'wagon', name: 'Wagons', description: 'Space meets style', count: bodyCounts['wagon'] || 0 },
        { id: 'convertible', name: 'Convertibles', description: 'Open-air freedom', count: bodyCounts['convertible'] || 0 },
        { id: 'minivan', name: 'Minivans', description: 'Family haulers', count: bodyCounts['minivan'] || 0 },
      ]);
    } else if (category === 'brand') {
      const makes = await api.getMakes();
      setSubcategories(makes.map(make => ({
        id: make.toLowerCase(),
        name: make,
        description: `Explore all ${make} vehicles`,
      })));
    } else if (category === 'purpose') {
      setSubcategories([
        { id: 'daily-commute', name: 'Daily Commute', description: 'Efficient and reliable everyday cars' },
        { id: 'family', name: 'Family', description: 'Safe, spacious family vehicles' },
        { id: 'performance', name: 'Performance', description: 'Thrilling sports and muscle cars' },
        { id: 'luxury', name: 'Luxury', description: 'Premium comfort and technology' },
        { id: 'off-road', name: 'Off-Road', description: 'Adventure-ready 4x4s' },
        { id: 'eco-friendly', name: 'Eco-Friendly', description: 'Hybrids and electric vehicles' },
      ]);
    } else if (category === 'era') {
      setSubcategories([
        { id: '1990s', name: '1990s Classics', description: '1995-1999: The golden era' },
        { id: '2000s', name: '2000s Evolution', description: '2000-2009: Modern begins' },
        { id: '2010s', name: '2010s Innovation', description: '2010-2019: Tech revolution' },
        { id: '2020s', name: '2020s Future', description: '2020-2024: Electric age' },
      ]);
    }

    setLoading(false);
  };

  const getCategoryTitle = () => {
    const titles: Record<string, string> = {
      'body-style': 'Browse by Vehicle Type',
      'brand': 'Browse by Manufacturer',
      'purpose': 'Browse by Purpose',
      'era': 'Browse by Era',
    };
    return titles[category || ''] || 'Explore';
  };

  const getCategoryDescription = () => {
    const descriptions: Record<string, string> = {
      'body-style': 'Choose the style that fits your needs',
      'brand': 'Select your preferred manufacturer',
      'purpose': 'Find vehicles perfect for your lifestyle',
      'era': 'Discover cars from different generations',
    };
    return descriptions[category || ''] || '';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <svg className="animate-spin h-16 w-16 text-blue-500 mx-auto mb-4" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <div className="text-slate-400 text-xl">Loading options...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900">
      <div className="container mx-auto px-4 py-12">
        {/* Back Button */}
        <Link
          to="/"
          className="inline-flex items-center text-slate-400 hover:text-white transition mb-8 group"
        >
          <svg className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Categories
        </Link>

        {/* Header */}
        <div className="text-center mb-16 animate-fade-in">
          <h1 className="text-6xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            {getCategoryTitle()}
          </h1>
          <p className="text-xl text-slate-400">
            {getCategoryDescription()}
          </p>
        </div>

        {/* Subcategory Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 max-w-7xl mx-auto">
          {subcategories.map((sub, index) => (
            <Link
              key={sub.id}
              to={`/vehicles/${category}/${sub.id}`}
              className="group relative overflow-hidden rounded-xl bg-slate-800 border-2 border-slate-700 hover:border-blue-500 transition-all duration-300 transform hover:scale-105 hover:shadow-2xl animate-slide-up"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-2xl font-bold text-white group-hover:text-blue-400 transition-colors">
                    {sub.name}
                  </h3>
                  {sub.count !== undefined && (
                    <span className="bg-blue-600 text-white text-sm px-3 py-1 rounded-full font-semibold">
                      {sub.count}
                    </span>
                  )}
                </div>

                <p className="text-slate-400 mb-4 line-clamp-2">
                  {sub.description}
                </p>

                <div className="flex items-center text-blue-400 font-semibold">
                  <span>Explore</span>
                  <svg className="w-5 h-5 ml-2 group-hover:translate-x-2 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </div>
              </div>

              {/* Hover gradient */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 to-purple-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
