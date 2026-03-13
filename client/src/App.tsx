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
import SharedGarage from './pages/SharedGarage';
import Layout from './components/Layout';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-black">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route element={<Layout />}>
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
          </Route>
        </Routes>
      </div>
    </Router>
  );
}

export default App;
