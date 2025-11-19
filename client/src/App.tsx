import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Landing from './pages/Landing';
import Explore from './pages/Explore';
import VehicleGrid from './pages/VehicleGrid';
import CarDetail from './pages/CarDetail';
import Home from './pages/Home';
import Compare from './pages/Compare';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-black">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/explore/:category" element={<Explore />} />
          <Route path="/vehicles/:category/:subcategory" element={<VehicleGrid />} />
          <Route path="/car/:id" element={<CarDetail />} />
          <Route path="/home" element={<Home />} />
          <Route path="/compare" element={<Compare />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
