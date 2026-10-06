import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import Landing from './pages/Landing';
import Layout from './components/Layout';
import ScrollToTop from './components/ScrollToTop';
import ErrorBoundary from './components/ErrorBoundary';
import AuthProvider from './components/AuthProvider';
import { useRecordVisit } from './hooks/useRecordVisit';

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
const SignIn = lazy(() => import('./pages/SignIn'));
const SignUp = lazy(() => import('./pages/SignUp'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
// Loads alongside the tool it guards, under the same Suspense boundary.
const RequireAccount = lazy(() => import('./components/RequireAccount'));
const NotFound = lazy(() => import('./pages/NotFound'));

function RouteFallback() {
  return (
    <div className="min-h-[50vh] bg-black flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block w-10 h-10 border-2 border-zinc-800 border-t-zinc-500 mb-3" />
        <p className="text-xs text-zinc-400">Loading</p>
      </div>
    </div>
  );
}

function App() {
  useRecordVisit();
  return (
    <Router>
      <ScrollToTop />
      <ErrorBoundary>
        <div className="min-h-screen bg-black">
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/" element={<Landing />} />
              {/* Account sync is scoped to the app shell; the landing route
                  above never loads the sign-in client. */}
              <Route element={<AuthProvider />}>
                <Route element={<Layout />}>
                  <Route path="/browse" element={<Browse />} />
                  <Route path="/explore/:category" element={<Explore />} />
                  <Route path="/vehicles/:category/:subcategory" element={<VehicleGrid />} />
                  <Route path="/car/:id" element={<CarDetail />} />
                  <Route path="/home" element={<Home />} />
                  <Route
                    path="/compare"
                    element={
                      <RequireAccount tool="Compare">
                        <Compare />
                      </RequireAccount>
                    }
                  />
                  <Route path="/collection/:collectionId" element={<Collection />} />
                  <Route path="/smart-search" element={<SmartSearch />} />
                  <Route
                    path="/garage"
                    element={
                      <RequireAccount tool="Dream Garage">
                        <DreamGarage />
                      </RequireAccount>
                    }
                  />
                  <Route path="/shared-garage" element={<SharedGarage />} />
                  <Route
                    path="/battle"
                    element={
                      <RequireAccount tool="Battle Mode">
                        <BattleMode />
                      </RequireAccount>
                    }
                  />
                  <Route
                    path="/value-matrix"
                    element={
                      <RequireAccount tool="the Value Matrix">
                        <ValueMatrix />
                      </RequireAccount>
                    }
                  />
                  <Route
                    path="/vin"
                    element={
                      <RequireAccount tool="the VIN decoder">
                        <VinDecoder />
                      </RequireAccount>
                    }
                  />
                  <Route path="/methodology" element={<Methodology />} />
                  <Route path="/account" element={<Account />} />
                  <Route path="/sign-in" element={<SignIn />} />
                  <Route path="/sign-up" element={<SignUp />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="*" element={<NotFound />} />
                </Route>
              </Route>
            </Routes>
          </Suspense>
        </div>
      </ErrorBoundary>
    </Router>
  );
}

export default App;
