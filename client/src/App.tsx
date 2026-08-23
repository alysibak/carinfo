import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import Landing from './pages/Landing';
import Layout from './components/Layout';
import ScrollToTop from './components/ScrollToTop';

const Explore = lazy(() => import('./pages/Explore'));
const VehicleGrid = lazy(() => import('./pages/VehicleGrid'));
const CarDetail = lazy(() => import('./pages/CarDetail'));
const Home = lazy(() => import('./pages/Home'));
const Compare = lazy(() => import('./pages/Compare'));
const Collection = lazy(() => import('./pages/Collection'));
const SmartSearch = lazy(() => import('./pages/SmartSearch'));
const DreamGarage = lazy(() => import('./pages/DreamGarage'));
const BattleMode = lazy(() => import('./pages/BattleMode'));
const ValueMatrix = lazy(() => import('./pages/ValueMatrix'));
const Browse = lazy(() => import('./pages/Browse'));
const SharedGarage = lazy(() => import('./pages/SharedGarage'));
const VinDecoder = lazy(() => import('./pages/VinDecoder'));
const Methodology = lazy(() => import('./pages/Methodology'));
const Account = lazy(() => import('./pages/Account'));

function RouteFallback() {
  return (
    <div className="min-h-[50vh] bg-black flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block w-10 h-10 border-2 border-zinc-800 border-t-zinc-500 mb-3" />
        <p className="text-[10px] tracking-widest text-zinc-500 uppercase">Loading</p>
      </div>
    </div>
  );
}

function App() {
  return (
    <Router>
      <ScrollToTop />
      <div className="min-h-screen bg-black">
        <Suspense fallback={<RouteFallback />}>
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
              <Route path="/methodology" element={<Methodology />} />
              <Route path="/account" element={<Account />} />
            </Route>
          </Routes>
        </Suspense>
      </div>
    </Router>
  );
}

export default App;
