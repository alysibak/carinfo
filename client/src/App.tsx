import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Landing from './pages/Landing';
import Explore from './pages/Explore';
import VehicleGrid from './pages/VehicleGrid';
import CarDetail from './pages/CarDetail';
import Home from './pages/Home';
import Compare from './pages/Compare';
import Collection from './pages/Collection';
import SmartSearch from './pages/SmartSearch';
import DreamGarage from './pages/DreamGarage';
import BattleMode from './pages/BattleMode';
import ValueMatrix from './pages/ValueMatrix';
import Browse from './pages/Browse';
import SharedGarage from './pages/SharedGarage';
import VinDecoder from './pages/VinDecoder';
import Layout from './components/Layout';
import ScrollToTop from './components/ScrollToTop';

function App() {
  return (
    <Router>
      <ScrollToTop />
      <div className="min-h-screen bg-black">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route element={<Layout />}>
            <Route path="/browse" element={<Browse />} />
            <Route path="/explore/:category" element={<Explore />} />
            <Route path="/vehicles/:category/:subcategory" element={<VehicleGrid />} />
            <Route path="/car/:id" element={<CarDetail />} />
            <Route path="/home" element={<Home />} />
            <Route path="/compare" element={<Compare />} />
            <Route path="/collection/:collectionId" element={<Collection />} />
            <Route path="/smart-search" element={<SmartSearch />} />
            <Route path="/garage" element={<DreamGarage />} />
            <Route path="/shared-garage" element={<SharedGarage />} />
            <Route path="/battle" element={<BattleMode />} />
            <Route path="/value-matrix" element={<ValueMatrix />} />
            <Route path="/vin" element={<VinDecoder />} />
          </Route>
        </Routes>
      </div>
    </Router>
  );
}

export default App;
