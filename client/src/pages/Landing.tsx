import { Link } from 'react-router-dom';

export default function Landing() {
  const categories = [
    {
      id: 'body-style',
      title: 'Browse by Type',
      description: 'Find your perfect vehicle by body style',
      icon: (
        <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
        </svg>
      ),
      gradient: 'from-blue-600 to-cyan-600',
      examples: 'Sedans, SUVs, Trucks, Coupes',
    },
    {
      id: 'brand',
      title: 'Browse by Brand',
      description: 'Explore your favorite manufacturers',
      icon: (
        <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
        </svg>
      ),
      gradient: 'from-purple-600 to-pink-600',
      examples: 'Toyota, BMW, Ford, Tesla',
    },
    {
      id: 'purpose',
      title: 'Browse by Purpose',
      description: 'What will you use it for?',
      icon: (
        <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
      gradient: 'from-green-600 to-teal-600',
      examples: 'Daily Commute, Family, Off-Road, Performance',
    },
    {
      id: 'era',
      title: 'Browse by Era',
      description: 'Travel through automotive history',
      icon: (
        <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      gradient: 'from-orange-600 to-red-600',
      examples: '90s Classics, 2000s, Modern 2020s',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 -left-4 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl animate-pulse"></div>
          <div className="absolute top-0 -right-4 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
          <div className="absolute -bottom-8 left-20 w-96 h-96 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
        </div>

        <div className="relative container mx-auto px-4 py-20">
          <div className="text-center mb-16 animate-fade-in">
            <h1 className="text-7xl font-bold mb-6 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Discover Your Perfect Car
            </h1>
            <p className="text-2xl text-slate-300 mb-4 max-w-3xl mx-auto">
              Explore 488 vehicles from 15 manufacturers spanning 30 years
            </p>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto">
              Start your journey by choosing how you'd like to explore
            </p>
          </div>

          {/* Category Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl mx-auto">
            {categories.map((category, index) => (
              <Link
                key={category.id}
                to={`/explore/${category.id}`}
                className="group relative overflow-hidden rounded-2xl bg-slate-800 border-2 border-slate-700 hover:border-slate-500 transition-all duration-500 transform hover:scale-105 hover:shadow-2xl"
                style={{
                  animationDelay: `${index * 100}ms`,
                }}
              >
                {/* Gradient Overlay */}
                <div className={`absolute inset-0 bg-gradient-to-br ${category.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-500`}></div>

                {/* Content */}
                <div className="relative p-8">
                  <div className={`inline-flex p-4 rounded-xl bg-gradient-to-br ${category.gradient} mb-6 group-hover:scale-110 transition-transform duration-500`}>
                    <div className="text-white">
                      {category.icon}
                    </div>
                  </div>

                  <h2 className="text-3xl font-bold text-white mb-3 group-hover:text-blue-400 transition-colors">
                    {category.title}
                  </h2>

                  <p className="text-slate-300 text-lg mb-4">
                    {category.description}
                  </p>

                  <div className="flex items-center text-slate-400 text-sm">
                    <span className="flex-1">{category.examples}</span>
                    <svg className="w-6 h-6 transform group-hover:translate-x-2 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </div>
                </div>

                {/* Shine Effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-0 group-hover:opacity-10 transform -skew-x-12 group-hover:translate-x-full transition-all duration-1000"></div>
              </Link>
            ))}
          </div>

          {/* Quick Stats */}
          <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
            <div className="text-center p-6 bg-slate-800/50 rounded-xl border border-slate-700 backdrop-blur-sm">
              <div className="text-4xl font-bold text-blue-400 mb-2">488</div>
              <div className="text-slate-400">Vehicles</div>
            </div>
            <div className="text-center p-6 bg-slate-800/50 rounded-xl border border-slate-700 backdrop-blur-sm">
              <div className="text-4xl font-bold text-purple-400 mb-2">15</div>
              <div className="text-slate-400">Brands</div>
            </div>
            <div className="text-center p-6 bg-slate-800/50 rounded-xl border border-slate-700 backdrop-blur-sm">
              <div className="text-4xl font-bold text-pink-400 mb-2">30</div>
              <div className="text-slate-400">Years</div>
            </div>
            <div className="text-center p-6 bg-slate-800/50 rounded-xl border border-slate-700 backdrop-blur-sm">
              <div className="text-4xl font-bold text-cyan-400 mb-2">8</div>
              <div className="text-slate-400">Categories</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
