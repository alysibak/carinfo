import { useEffect, useState } from 'react';
import { useCarStore } from '../stores/carStore';
import FilterSidebar from '../components/FilterSidebar';
import CarCard from '../components/CarCard';

export default function Home() {
  const {
    searchResults,
    searchQuery,
    setSearchQuery,
    performSearch,
    isSearching,
  } = useCarStore();

  const [searchText, setSearchText] = useState(searchQuery.query || '');
  const [sortField, setSortField] = useState(searchQuery.sort?.field || 'year');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(searchQuery.sort?.order || 'desc');

  useEffect(() => {
    performSearch();
  }, []);

  const handleSearch = () => {
    setSearchQuery({
      ...searchQuery,
      query: searchText,
      sort: { field: sortField, order: sortOrder },
      offset: 0,
    });
    performSearch();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleSortChange = (field: string) => {
    const newOrder = field === sortField && sortOrder === 'desc' ? 'asc' : 'desc';
    setSortField(field);
    setSortOrder(newOrder);
    setSearchQuery({
      ...searchQuery,
      sort: { field, order: newOrder },
    });
    performSearch();
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950">
      <div className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-10 animate-fade-in">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-400 via-blue-300 to-cyan-400 bg-clip-text text-transparent mb-4">
            Compare Every Car Ever Made
          </h1>
          <p className="text-slate-400 text-lg mb-8 max-w-3xl mx-auto">
            Search and compare specifications from thousands of vehicles across all brands, years, and countries
          </p>

          {/* Search Bar */}
          <div className="max-w-4xl mx-auto">
            <div className="flex gap-3">
              <div className="relative flex-1">
                <svg
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <input
                  type="text"
                  placeholder="Search by make, model, or year..."
                  className="w-full pl-12 pr-4 py-4 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-lg"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  onKeyPress={handleKeyPress}
                />
              </div>
              <button
                onClick={handleSearch}
                className="px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all font-semibold shadow-lg shadow-blue-500/50 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isSearching}
              >
                {isSearching ? (
                  <>
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Searching...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <span>Search</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Filters Sidebar */}
          <div className="lg:col-span-1">
            <FilterSidebar />
          </div>

          {/* Results */}
          <div className="lg:col-span-3">
            {/* Sort Controls */}
            <div className="bg-slate-800 rounded-xl shadow-xl p-5 mb-6 border border-slate-700">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="text-slate-300">
                  {searchResults && (
                    <span className="font-semibold text-white flex items-center">
                      <svg className="w-5 h-5 mr-2 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      {searchResults.total} cars found
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-sm text-slate-400">Sort by:</span>
                  <select
                    className="bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={sortField}
                    onChange={(e) => handleSortChange(e.target.value)}
                  >
                    <option value="year">Year</option>
                    <option value="make">Make</option>
                    <option value="model">Model</option>
                    <option value="horsepower">Horsepower</option>
                    <option value="price">Price</option>
                    <option value="fuelEconomy">Fuel Economy</option>
                  </select>
                  <button
                    onClick={() => handleSortChange(sortField)}
                    className="px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg hover:bg-slate-600 transition text-white"
                    title={`Sort ${sortOrder === 'asc' ? 'descending' : 'ascending'}`}
                  >
                    {sortOrder === 'asc' ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Car Grid */}
            {isSearching ? (
              <div className="text-center py-20">
                <svg className="animate-spin h-12 w-12 text-blue-500 mx-auto mb-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <div className="text-slate-400 text-lg">Loading cars...</div>
              </div>
            ) : searchResults && searchResults.results.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {searchResults.results.map((car) => (
                  <CarCard key={car.id} car={car} />
                ))}
              </div>
            ) : (
              <div className="text-center py-20 bg-slate-800 rounded-xl shadow-xl border border-slate-700">
                <svg className="w-16 h-16 text-slate-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="text-slate-400 text-lg">
                  No cars found. Try adjusting your filters.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
