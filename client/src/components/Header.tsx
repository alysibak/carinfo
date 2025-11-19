import { Link } from 'react-router-dom';
import { useCarStore } from '../stores/carStore';

export default function Header() {
  const comparedCars = useCarStore((state) => state.comparedCars);

  return (
    <header className="bg-gradient-to-r from-blue-600 to-blue-800 text-white shadow-lg">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="text-2xl font-bold hover:text-blue-200 transition">
            🚗 CarInfo
          </Link>

          <nav className="flex items-center space-x-6">
            <Link
              to="/"
              className="hover:text-blue-200 transition font-medium"
            >
              Search
            </Link>
            <Link
              to="/compare"
              className="hover:text-blue-200 transition font-medium relative"
            >
              Compare
              {comparedCars.length > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {comparedCars.length}
                </span>
              )}
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
