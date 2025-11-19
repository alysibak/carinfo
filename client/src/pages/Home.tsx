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
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">
            Compare Every Car Ever Made
          </h1>
          <p className="text-gray-600 text-lg mb-6">
            Search and compare specifications from thousands of vehicles across all brands, years, and countries
          </p>

          {/* Search Bar */}
          <div className="max-w-3xl mx-auto">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Search by make, model, or year..."
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                onKeyPress={handleKeyPress}
              />
              <button
                onClick={handleSearch}
                className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold"
                disabled={isSearching}
              >
                {isSearching ? 'Searching...' : 'Search'}
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Filters Sidebar */}
          <div className="lg:col-span-1">
            <FilterSidebar />
          </div>

          {/* Results */}
          <div className="lg:col-span-3">
            {/* Sort Controls */}
            <div className="bg-white rounded-lg shadow-md p-4 mb-6">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="text-gray-700">
                  {searchResults && (
                    <span className="font-semibold">
                      {searchResults.total} cars found
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Sort by:</span>
                  <select
                    className="border rounded px-3 py-2"
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
                    className="px-3 py-2 border rounded hover:bg-gray-50"
                    title={`Sort ${sortOrder === 'asc' ? 'descending' : 'ascending'}`}
                  >
                    {sortOrder === 'asc' ? '↑' : '↓'}
                  </button>
                </div>
              </div>
            </div>

            {/* Car Grid */}
            {isSearching ? (
              <div className="text-center py-12">
                <div className="text-gray-600">Loading cars...</div>
              </div>
            ) : searchResults && searchResults.results.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {searchResults.results.map((car) => (
                  <CarCard key={car.id} car={car} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-white rounded-lg shadow-md">
                <div className="text-gray-600 text-lg">
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
