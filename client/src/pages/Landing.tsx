import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import PersonaQuiz, { PersonaResult } from '../components/PersonaQuiz';

export default function Landing() {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [showQuiz, setShowQuiz] = useState(false);
  const navigate = useNavigate();

  const handleQuizComplete = (persona: PersonaResult) => {
    setShowQuiz(false);

    // Navigate to smart search with persona filters applied
    const params = new URLSearchParams({
      persona: persona.type,
      minPrice: persona.budget.min.toString(),
      maxPrice: persona.budget.max.toString(),
      priority: persona.priority,
      usage: persona.usage,
    });

    navigate(`/smart-search?${params.toString()}`);
  };

  const smartCollections = [
    {
      id: 'goldilocks',
      title: 'THE GOLDILOCKS ZONE',
      subtitle: 'Just Right for Most People',
      count: '~800',
      filters: 'price=25000-35000&mpg=30&safety=4',
    },
    {
      id: 'gas-savers',
      title: 'BEST GAS SAVERS',
      subtitle: 'Fill Up Less, Save More',
      count: '~500',
      filters: 'mpg=35&price=0-40000',
    },
    {
      id: 'luxury-less',
      title: 'LUXURY FOR LESS',
      subtitle: 'Premium Badge, Smart Price',
      count: '~400',
      filters: 'brands=luxury&price=0-50000&year=2015',
    },
    {
      id: 'family-fortress',
      title: 'FAMILY FORTRESS',
      subtitle: 'Protect What Matters Most',
      count: '~300',
      filters: 'safety=5&seats=6&type=suv,minivan',
    },
    {
      id: 'weekend-warriors',
      title: 'WEEKEND WARRIORS',
      subtitle: 'Live for the Drive',
      count: '~350',
      filters: 'hp=300&type=coupe,convertible&zeroToSixty=6',
    },
    {
      id: 'work-horses',
      title: 'WORK HORSES',
      subtitle: 'Built to Work, Priced to Own',
      count: '~250',
      filters: 'type=truck&drivetrain=4WD,AWD',
    },
    {
      id: 'future-proof',
      title: 'FUTURE-PROOF',
      subtitle: 'Drive Tomorrow, Today',
      count: '~100',
      filters: 'fuel=electric,hybrid&year=2018',
    },
  ];

  const categories = [
    {
      id: 'body-style',
      title: 'BY TYPE',
      subtitle: 'Choose Your Form',
      description: 'SEDAN • SUV • COUPE • TRUCK',
    },
    {
      id: 'brand',
      title: 'BY MAKE',
      subtitle: 'Select Your Legacy',
      description: 'FERRARI • PORSCHE • LAMBORGHINI • MERCEDES',
    },
    {
      id: 'purpose',
      title: 'BY PURPOSE',
      subtitle: 'Define Your Drive',
      description: 'PERFORMANCE • LUXURY • DAILY • OFF-ROAD',
    },
    {
      id: 'era',
      title: 'BY ERA',
      subtitle: 'Select Your Decade',
      description: '1990s • 2000s • 2010s • 2020s',
    },
  ];

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Persona Quiz Modal */}
      {showQuiz && <PersonaQuiz onComplete={handleQuizComplete} />}

      {/* Hero Section - Full Screen */}
      <section className="h-screen flex flex-col items-center justify-center relative overflow-hidden border-b border-zinc-800">
        <div className="absolute inset-0 bg-gradient-to-b from-black via-zinc-900 to-black opacity-50" />

        <div className="relative z-10 text-center px-8 max-w-6xl">
          <div className="mb-8 overflow-hidden">
            <h1 className="text-8xl md:text-9xl font-black tracking-tighter mb-4 animate-fade-in">
              CARINFO
            </h1>
          </div>

          <div className="overflow-hidden">
            <p className="text-xl md:text-2xl font-light tracking-[0.3em] text-zinc-400 mb-12 animate-slide-up uppercase">
              15,470 Vehicles • 31 Manufacturers • 1995-2025
            </p>
          </div>

          <div className="h-px w-64 bg-gradient-to-r from-transparent via-white to-transparent mx-auto mb-12 animate-scale-in" />

          <div className="overflow-hidden mb-12">
            <p className="text-sm md:text-base font-light tracking-widest text-zinc-500 animate-slide-up-delay uppercase">
              An Exclusive Automotive Archive
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <button
              onClick={() => setShowQuiz(true)}
              className="group relative inline-flex items-center gap-4 px-12 py-6 border border-white hover:bg-white hover:text-black transition-all duration-300 animate-fade-in"
            >
              <span className="text-sm tracking-[0.3em] font-bold">FIND MY PERFECT CAR</span>
              <svg className="w-6 h-6 group-hover:translate-x-2 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </button>

            <Link
              to="/garage"
              className="group relative inline-flex items-center gap-4 px-12 py-6 border border-zinc-700 hover:border-white hover:bg-zinc-900 transition-all duration-300 animate-fade-in"
            >
              <span className="text-sm tracking-[0.3em] font-bold">🏁 MY GARAGE</span>
            </Link>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-12 left-1/2 transform -translate-x-1/2 animate-bounce">
          <div className="w-px h-16 bg-gradient-to-b from-white to-transparent" />
        </div>
      </section>

      {/* Smart Collections Section */}
      <section className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden border-b border-zinc-800 py-24">
        <div className="relative z-10 w-full max-w-7xl px-8">
          {/* Section Header */}
          <div className="text-center mb-16">
            <h2 className="text-5xl md:text-6xl font-black tracking-tighter mb-4">
              CURATED COLLECTIONS
            </h2>
            <p className="text-sm tracking-[0.3em] text-zinc-600 uppercase">
              Hand-picked selections for every need
            </p>
          </div>

          {/* Collections Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-px bg-zinc-900">
            {smartCollections.map((collection, index) => (
              <Link
                key={collection.id}
                to={`/collection/${collection.id}`}
                className="group bg-black p-8 hover:bg-zinc-950 transition-all duration-300 border border-zinc-900 hover:border-zinc-700"
                onMouseEnter={() => setHoveredIndex(100 + index)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                {/* Count Badge */}
                <div className="mb-6">
                  <span className="text-xs tracking-[0.3em] text-zinc-700 group-hover:text-zinc-500 transition-colors">
                    {collection.count} VEHICLES
                  </span>
                </div>

                {/* Title */}
                <h3 className="text-xl font-black tracking-tight mb-3 group-hover:tracking-wide transition-all">
                  {collection.title}
                </h3>

                {/* Subtitle */}
                <p className="text-sm tracking-wider text-zinc-500 group-hover:text-zinc-400 transition-colors mb-6">
                  {collection.subtitle}
                </p>

                {/* Divider */}
                <div className="h-px bg-zinc-900 group-hover:bg-zinc-700 transition-colors mb-6" />

                {/* View Arrow */}
                <div className="flex items-center gap-2 text-xs tracking-widest text-zinc-700 group-hover:text-white transition-all">
                  <span>EXPLORE</span>
                  <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Category Selection - Full Screen Sections */}
      {categories.map((category, index) => (
        <Link
          key={category.id}
          to={`/explore/${category.id}`}
          className="block"
          onMouseEnter={() => setHoveredIndex(index)}
          onMouseLeave={() => setHoveredIndex(null)}
        >
          <section className="h-screen flex items-center justify-center relative overflow-hidden border-b border-zinc-800 group cursor-pointer transition-all duration-700">
            {/* Background Effect */}
            <div
              className={`absolute inset-0 bg-white transition-opacity duration-700 ${
                hoveredIndex === index ? 'opacity-5' : 'opacity-0'
              }`}
            />

            {/* Grid Pattern Background */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute inset-0" style={{
                backgroundImage: 'linear-gradient(rgba(255,255,255,.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.03) 1px, transparent 1px)',
                backgroundSize: '100px 100px'
              }} />
            </div>

            {/* Content */}
            <div className="relative z-10 text-center px-8 max-w-6xl">
              {/* Index Number */}
              <div className="mb-6 overflow-hidden">
                <p className="text-9xl md:text-[12rem] font-black text-zinc-900 group-hover:text-zinc-800 transition-colors duration-700 leading-none">
                  {String(index + 1).padStart(2, '0')}
                </p>
              </div>

              {/* Title */}
              <div className="overflow-hidden mb-4">
                <h2 className="text-6xl md:text-8xl font-black tracking-tighter group-hover:tracking-wider transition-all duration-700">
                  {category.title}
                </h2>
              </div>

              {/* Subtitle */}
              <div className="overflow-hidden mb-8">
                <p className="text-2xl md:text-3xl font-light tracking-[0.2em] text-zinc-400 group-hover:text-white transition-colors duration-700 uppercase">
                  {category.subtitle}
                </p>
              </div>

              {/* Divider */}
              <div className={`h-px w-96 mx-auto mb-8 transition-all duration-700 ${
                hoveredIndex === index
                  ? 'bg-gradient-to-r from-transparent via-white to-transparent'
                  : 'bg-gradient-to-r from-transparent via-zinc-700 to-transparent'
              }`} />

              {/* Description */}
              <div className="overflow-hidden">
                <p className="text-sm md:text-base font-light tracking-[0.3em] text-zinc-600 group-hover:text-zinc-400 transition-colors duration-700 uppercase">
                  {category.description}
                </p>
              </div>

              {/* Enter Arrow */}
              <div className="mt-12">
                <div className={`inline-flex items-center gap-4 text-xs tracking-[0.3em] transition-all duration-700 ${
                  hoveredIndex === index ? 'text-white translate-x-4' : 'text-zinc-700 translate-x-0'
                }`}>
                  <span>ENTER</span>
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </div>
              </div>
            </div>
          </section>
        </Link>
      ))}

      {/* Footer Section */}
      <section className="h-screen flex items-center justify-center bg-black">
        <div className="text-center px-8">
          <p className="text-xs tracking-[0.5em] text-zinc-700 mb-4 uppercase">
            Built with precision
          </p>
          <p className="text-2xl font-light text-zinc-800">
            © 2025 CARINFO
          </p>
        </div>
      </section>
    </div>
  );
}
