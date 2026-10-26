import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import Landing from './pages/Landing';
import Layout from './components/Layout';
import ScrollToTop from './components/ScrollToTop';
import { LoadingScreen } from './components/ui';
import ErrorBoundary from './components/ErrorBoundary';
import AuthProvider from './components/AuthProvider';
import { useRecordVisit } from './hooks/useRecordVisit';

const Explore = lazy(() => import('./pages/Explore'));
const VehicleGrid = lazy(() => import('./pages/VehicleGrid'));
const CarDetail = lazy(() => import('./pages/CarDetail'));
const CarChecklist = lazy(() => import('./pages/CarChecklist'));
const ModelPage = lazy(() => import('./pages/ModelPage'));
const Home = lazy(() => import('./pages/Home'));
const Compare = lazy(() => import('./pages/Compare'));
const Collection = lazy(() => import('./pages/Collection'));
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

/** What the tools behind a sign-in do, for the page that asks for one. */
const GARAGE_GIVES = [
  'Save cars from any page, and find them on any device you sign in on.',
  'See each saved car’s recalls in Canada and its place on the theft list at a glance.',
  'Compare saved cars side by side, or share the list with a link.',
];
const VALUE_CHART_GIVES = [
  'Every car’s estimated value against its fuel use, on one chart.',
  'Pick a square to see the cars in it, and open any of them.',
];

/** Outside the page frame, which has a loading boundary of its own (Layout). */
function RouteFallback() {
  return <LoadingScreen />;
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
                  <Route path="/car/:id/checklist" element={<CarChecklist />} />
                  <Route path="/models/:make/:model" element={<ModelPage />} />
                  <Route path="/home" element={<Home />} />
                  {/* Open to visitors: the tools shoppers reach for first. */}
                  <Route path="/compare" element={<Compare />} />
                  <Route path="/collection/:collectionId" element={<Collection />} />
                  {/* The 3-question quiz is gone: its answers were price bands on an estimate. */}
                  <Route path="/smart-search" element={<Navigate to="/browse" replace />} />
                  <Route
                    path="/garage"
                    element={
                      <RequireAccount tool="your garage" gives={GARAGE_GIVES}>
                        <DreamGarage />
                      </RequireAccount>
                    }
                  />
                  <Route path="/shared-garage" element={<SharedGarage />} />
                  {/* An old address, now Compare, which is open to everyone. */}
                  <Route path="/battle" element={<BattleMode />} />
                  <Route
                    path="/value-matrix"
                    element={
                      <RequireAccount tool="the Value chart" gives={VALUE_CHART_GIVES}>
                        <ValueMatrix />
                      </RequireAccount>
                    }
                  />
                  <Route path="/vin" element={<VinDecoder />} />
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
