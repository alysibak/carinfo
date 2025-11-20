import { useParams, Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import * as api from '../services/api';
import type { CarSpecs } from '../types/car.types';
import { getCarImageUrl } from '../utils/carImages';
import { useCarStore } from '../stores/carStore';
import TCOCalculator from '../components/TCOCalculator';

export default function CarDetail() {
  const { id } = useParams<{ id: string }>();
  const [car, setCar] = useState<CarSpecs | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'specs' | 'history' | 'reviews'>('specs');
  const [showTCO, setShowTCO] = useState(false);
  const { addCarToComparison, comparedCars } = useCarStore();
  const navigate = useNavigate();

  useEffect(() => {
    loadCar();
  }, [id]);

  const loadCar = async () => {
    if (!id) return;
    try {
      const data = await api.getCarById(id);
      setCar(data);
    } catch (error) {
      console.error('Failed to load car:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToComparison = () => {
    if (car) {
      addCarToComparison(car);
      navigate('/compare');
    }
  };

  if (loading || !car) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <svg className="animate-spin h-16 w-16 text-blue-500 mx-auto mb-4" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <div className="text-slate-400 text-xl">Loading vehicle...</div>
        </div>
      </div>
    );
  }

  // Mock reviews data
  const reviews = [
    {
      author: 'John Smith',
      rating: 5,
      date: '2024-01-15',
      title: 'Excellent Performance',
      content: 'This car exceeded all my expectations. The handling is superb and the engine is incredibly responsive.',
      helpful: 45,
    },
    {
      author: 'Sarah Johnson',
      rating: 4,
      date: '2023-12-10',
      title: 'Great Daily Driver',
      content: 'Perfect for my daily commute. Fuel economy is better than advertised and the interior is very comfortable.',
      helpful: 32,
    },
    {
      author: 'Mike Chen',
      rating: 5,
      date: '2023-11-22',
      title: 'Best Purchase Ever',
      content: 'Had this for 6 months now and absolutely love it. Reliability has been perfect and maintenance costs are low.',
      helpful: 28,
    },
  ];

  // Generate timeline based on year
  const timeline = [];
  const baseYear = car.productionYears?.start || car.year - 5;
  for (let year = baseYear; year <= car.year; year += 3) {
    timeline.push({
      year,
      event: year === car.year ? 'Current Model Year' : year === baseYear ? 'Generation Launch' : 'Mid-Cycle Refresh',
      description: year === car.year ? 'Latest technology and features' : year === baseYear ? 'All-new design and platform' : 'Updated styling and tech',
    });
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900">
      {/* Hero Section */}
      <div className="relative h-screen">
        {/* Massive Hero Image */}
        <div className="absolute inset-0">
          <img
            src={getCarImageUrl(car.make, car.model, car.year)}
            alt={`${car.year} ${car.make} ${car.model}`}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-slate-950/70 via-slate-950/50 to-slate-950"></div>
        </div>

        {/* Content Overlay */}
        <div className="relative h-full flex flex-col">
          {/* Back Button */}
          <div className="container mx-auto px-4 pt-8">
            <button
              onClick={() => window.history.back()}
              className="inline-flex items-center text-white/80 hover:text-white transition group bg-slate-900/50 backdrop-blur-sm px-4 py-2 rounded-lg"
            >
              <svg className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>
          </div>

          {/* Hero Content */}
          <div className="flex-1 flex items-end">
            <div className="container mx-auto px-4 pb-20">
              <div className="animate-slide-up">
                <div className="flex items-center space-x-3 mb-4">
                  <span className="bg-blue-600 px-4 py-2 rounded-full text-white font-bold text-lg">
                    {car.year}
                  </span>
                  <span className="bg-slate-800/80 backdrop-blur-sm px-4 py-2 rounded-full text-white">
                    {car.countryOfOrigin}
                  </span>
                </div>

                <h1 className="text-7xl font-bold text-white mb-6">
                  {car.make} {car.model}
                </h1>

                {car.trim && (
                  <p className="text-3xl text-slate-300 mb-8">{car.trim}</p>
                )}

                {/* Quick Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl">
                  <div className="bg-slate-900/80 backdrop-blur-sm p-6 rounded-xl border border-slate-700">
                    <div className="text-4xl font-bold text-blue-400 mb-1">{car.engine.horsepower}</div>
                    <div className="text-slate-400">Horsepower</div>
                  </div>
                  <div className="bg-slate-900/80 backdrop-blur-sm p-6 rounded-xl border border-slate-700">
                    <div className="text-4xl font-bold text-purple-400 mb-1">
                      {car.performance.zeroToSixty || 'N/A'}
                    </div>
                    <div className="text-slate-400">0-60 mph (s)</div>
                  </div>
                  <div className="bg-slate-900/80 backdrop-blur-sm p-6 rounded-xl border border-slate-700">
                    <div className="text-4xl font-bold text-green-400 mb-1">
                      {car.fuelEconomy.combined || 'N/A'}
                    </div>
                    <div className="text-slate-400">MPG Combined</div>
                  </div>
                  <div className="bg-slate-900/80 backdrop-blur-sm p-6 rounded-xl border border-slate-700">
                    <div className="text-4xl font-bold text-cyan-400 mb-1">
                      {car.price?.msrp ? `$${(car.price.msrp / 1000).toFixed(0)}k` : 'N/A'}
                    </div>
                    <div className="text-slate-400">MSRP</div>
                  </div>
                </div>

                {/* CTA Buttons */}
                <div className="flex items-center space-x-4 mt-8">
                  <button
                    onClick={handleAddToComparison}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all transform hover:scale-105 shadow-lg shadow-blue-500/50"
                  >
                    Add to Comparison
                  </button>
                  <button
                    onClick={() => setShowTCO(true)}
                    className="bg-green-600 hover:bg-green-700 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all transform hover:scale-105 shadow-lg shadow-green-500/50"
                  >
                    Calculate TCO
                  </button>
                  <button
                    onClick={() => setActiveTab('specs')}
                    className="bg-slate-800 hover:bg-slate-700 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all border border-slate-700"
                  >
                    View Full Specs
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Scroll Indicator */}
          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
            <svg className="w-8 h-8 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur-sm border-b border-slate-700">
        <div className="container mx-auto px-4">
          <div className="flex space-x-8">
            {[
              { id: 'specs', label: 'Specifications', icon: '📊' },
              { id: 'history', label: 'Vehicle History', icon: '📅' },
              { id: 'reviews', label: 'Reviews', icon: '⭐' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-6 py-4 font-semibold transition-all border-b-4 ${
                  activeTab === tab.id
                    ? 'text-blue-400 border-blue-400'
                    : 'text-slate-400 border-transparent hover:text-white'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="container mx-auto px-4 py-16">
        {activeTab === 'specs' && (
          <div className="animate-fade-in">
            <h2 className="text-4xl font-bold text-white mb-12">Complete Specifications</h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Engine */}
              <div className="bg-slate-800 rounded-xl p-8 border border-slate-700">
                <h3 className="text-2xl font-bold text-white mb-6 flex items-center">
                  <svg className="w-8 h-8 mr-3 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Engine & Performance
                </h3>
                <div className="space-y-4">
                  <div className="flex justify-between py-3 border-b border-slate-700">
                    <span className="text-slate-400">Configuration</span>
                    <span className="text-white font-semibold">{car.engine.configuration}</span>
                  </div>
                  <div className="flex justify-between py-3 border-b border-slate-700">
                    <span className="text-slate-400">Displacement</span>
                    <span className="text-white font-semibold">{car.engine.displacement}L</span>
                  </div>
                  <div className="flex justify-between py-3 border-b border-slate-700">
                    <span className="text-slate-400">Horsepower</span>
                    <span className="text-white font-semibold">{car.engine.horsepower} HP</span>
                  </div>
                  <div className="flex justify-between py-3 border-b border-slate-700">
                    <span className="text-slate-400">Torque</span>
                    <span className="text-white font-semibold">{car.engine.torque} lb-ft</span>
                  </div>
                  <div className="flex justify-between py-3 border-b border-slate-700">
                    <span className="text-slate-400">Fuel Type</span>
                    <span className="text-white font-semibold capitalize">{car.engine.fuelType}</span>
                  </div>
                  <div className="flex justify-between py-3 border-b border-slate-700">
                    <span className="text-slate-400">0-60 mph</span>
                    <span className="text-white font-semibold">{car.performance.zeroToSixty || 'N/A'}s</span>
                  </div>
                  <div className="flex justify-between py-3 border-b border-slate-700">
                    <span className="text-slate-400">Top Speed</span>
                    <span className="text-white font-semibold">{car.performance.topSpeed || 'N/A'} mph</span>
                  </div>
                  <div className="flex justify-between py-3">
                    <span className="text-slate-400">Quarter Mile</span>
                    <span className="text-white font-semibold">{car.performance.quarterMile || 'N/A'}s</span>
                  </div>
                </div>
              </div>

              {/* Drivetrain */}
              <div className="bg-slate-800 rounded-xl p-8 border border-slate-700">
                <h3 className="text-2xl font-bold text-white mb-6 flex items-center">
                  <svg className="w-8 h-8 mr-3 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Drivetrain & Efficiency
                </h3>
                <div className="space-y-4">
                  <div className="flex justify-between py-3 border-b border-slate-700">
                    <span className="text-slate-400">Transmission</span>
                    <span className="text-white font-semibold capitalize">{car.transmission.speeds}-speed {car.transmission.type}</span>
                  </div>
                  <div className="flex justify-between py-3 border-b border-slate-700">
                    <span className="text-slate-400">Drive Type</span>
                    <span className="text-white font-semibold">{car.driveType}</span>
                  </div>
                  <div className="flex justify-between py-3 border-b border-slate-700">
                    <span className="text-slate-400">MPG City</span>
                    <span className="text-white font-semibold">{car.fuelEconomy.city || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between py-3 border-b border-slate-700">
                    <span className="text-slate-400">MPG Highway</span>
                    <span className="text-white font-semibold">{car.fuelEconomy.highway || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between py-3">
                    <span className="text-slate-400">MPG Combined</span>
                    <span className="text-white font-semibold">{car.fuelEconomy.combined || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* Dimensions */}
              <div className="bg-slate-800 rounded-xl p-8 border border-slate-700">
                <h3 className="text-2xl font-bold text-white mb-6 flex items-center">
                  <svg className="w-8 h-8 mr-3 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                  </svg>
                  Dimensions & Weight
                </h3>
                <div className="space-y-4">
                  <div className="flex justify-between py-3 border-b border-slate-700">
                    <span className="text-slate-400">Length</span>
                    <span className="text-white font-semibold">{car.dimensions.length}"</span>
                  </div>
                  <div className="flex justify-between py-3 border-b border-slate-700">
                    <span className="text-slate-400">Width</span>
                    <span className="text-white font-semibold">{car.dimensions.width}"</span>
                  </div>
                  <div className="flex justify-between py-3 border-b border-slate-700">
                    <span className="text-slate-400">Height</span>
                    <span className="text-white font-semibold">{car.dimensions.height}"</span>
                  </div>
                  <div className="flex justify-between py-3 border-b border-slate-700">
                    <span className="text-slate-400">Wheelbase</span>
                    <span className="text-white font-semibold">{car.dimensions.wheelbase}"</span>
                  </div>
                  <div className="flex justify-between py-3">
                    <span className="text-slate-400">Curb Weight</span>
                    <span className="text-white font-semibold">{car.dimensions.curbWeight.toLocaleString()} lbs</span>
                  </div>
                </div>
              </div>

              {/* Safety & Pricing */}
              <div className="bg-slate-800 rounded-xl p-8 border border-slate-700">
                <h3 className="text-2xl font-bold text-white mb-6 flex items-center">
                  <svg className="w-8 h-8 mr-3 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  Safety & Value
                </h3>
                <div className="space-y-4">
                  {car.safetyRating && (
                    <>
                      <div className="flex justify-between py-3 border-b border-slate-700">
                        <span className="text-slate-400">Overall Safety</span>
                        <span className="text-yellow-400 text-xl">{'⭐'.repeat(car.safetyRating.overall || 0)}</span>
                      </div>
                      {car.safetyRating.frontal && (
                        <div className="flex justify-between py-3 border-b border-slate-700">
                          <span className="text-slate-400">Frontal Crash</span>
                          <span className="text-yellow-400 text-xl">{'⭐'.repeat(car.safetyRating.frontal)}</span>
                        </div>
                      )}
                    </>
                  )}
                  {car.price?.msrp && (
                    <div className="flex justify-between py-3 pt-6 border-t-2 border-slate-600">
                      <span className="text-slate-400 text-lg">MSRP</span>
                      <span className="text-green-400 font-bold text-2xl">${car.price.msrp.toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="animate-fade-in">
            <h2 className="text-4xl font-bold text-white mb-12">Vehicle History & Evolution</h2>

            {/* Timeline */}
            <div className="relative">
              {/* Timeline Line */}
              <div className="absolute left-8 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-600 via-purple-600 to-pink-600"></div>

              {/* Timeline Items */}
              <div className="space-y-12 pl-24">
                {timeline.map((item, index) => (
                  <div key={index} className="relative animate-slide-up" style={{ animationDelay: `${index * 100}ms` }}>
                    {/* Timeline Dot */}
                    <div className="absolute -left-[4.5rem] top-0 w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center border-4 border-slate-900 shadow-lg">
                      <span className="text-white font-bold">{item.year}</span>
                    </div>

                    {/* Content */}
                    <div className="bg-slate-800 rounded-xl p-8 border border-slate-700 hover:border-blue-500 transition-all">
                      <h3 className="text-2xl font-bold text-white mb-3">{item.event}</h3>
                      <p className="text-slate-400 text-lg">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'reviews' && (
          <div className="animate-fade-in">
            <div className="flex items-center justify-between mb-12">
              <h2 className="text-4xl font-bold text-white">Owner Reviews</h2>
              <div className="flex items-center space-x-4">
                <div className="text-center">
                  <div className="text-5xl font-bold text-yellow-400">4.7</div>
                  <div className="text-slate-400">out of 5</div>
                  <div className="text-yellow-400 text-2xl mt-2">⭐⭐⭐⭐⭐</div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              {reviews.map((review, index) => (
                <div key={index} className="bg-slate-800 rounded-xl p-8 border border-slate-700 animate-slide-up" style={{ animationDelay: `${index * 100}ms` }}>
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center space-x-3 mb-2">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                          {review.author.charAt(0)}
                        </div>
                        <div>
                          <div className="text-white font-semibold">{review.author}</div>
                          <div className="text-slate-400 text-sm">{new Date(review.date).toLocaleDateString()}</div>
                        </div>
                      </div>
                    </div>
                    <div className="text-yellow-400 text-xl">
                      {'⭐'.repeat(review.rating)}
                    </div>
                  </div>

                  <h3 className="text-xl font-bold text-white mb-3">{review.title}</h3>
                  <p className="text-slate-300 text-lg mb-4">{review.content}</p>

                  <div className="flex items-center space-x-6 text-slate-400 text-sm">
                    <button className="flex items-center space-x-2 hover:text-white transition">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                      </svg>
                      <span>Helpful ({review.helpful})</span>
                    </button>
                    <button className="hover:text-white transition">Reply</button>
                    <button className="hover:text-white transition">Share</button>
                  </div>
                </div>
              ))}
            </div>

            {/* Write Review CTA */}
            <div className="mt-12 text-center bg-gradient-to-br from-blue-600/20 to-purple-600/20 rounded-xl p-12 border border-blue-500/30">
              <h3 className="text-3xl font-bold text-white mb-4">Share Your Experience</h3>
              <p className="text-slate-300 text-lg mb-6">Help others make informed decisions</p>
              <button className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all transform hover:scale-105">
                Write a Review
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Floating Comparison Bar */}
      {comparedCars.length > 0 && (
        <div className="fixed bottom-8 right-8 bg-slate-900 border-2 border-blue-500 rounded-xl p-4 shadow-2xl shadow-blue-500/50 animate-scale-in">
          <div className="flex items-center space-x-4">
            <div className="text-white">
              <div className="font-bold">{comparedCars.length} cars selected</div>
              <div className="text-sm text-slate-400">Ready to compare</div>
            </div>
            <Link
              to="/compare"
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-all"
            >
              Compare Now →
            </Link>
          </div>
        </div>
      )}

      {/* TCO Calculator Modal */}
      {showTCO && car && (
        <TCOCalculator car={car} onClose={() => setShowTCO(false)} />
      )}
    </div>
  );
}
