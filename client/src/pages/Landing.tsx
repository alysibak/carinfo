import { Link } from 'react-router-dom';
import { useState } from 'react';

export default function Landing() {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

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

          <div className="overflow-hidden">
            <p className="text-sm md:text-base font-light tracking-widest text-zinc-500 animate-slide-up-delay uppercase">
              An Exclusive Automotive Archive
            </p>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-12 left-1/2 transform -translate-x-1/2 animate-bounce">
          <div className="w-px h-16 bg-gradient-to-b from-white to-transparent" />
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
