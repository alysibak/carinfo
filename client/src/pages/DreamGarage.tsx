import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useGarageStore } from '../stores/garageStore';

export default function DreamGarage() {
  const [shareLink, setShareLink] = useState('');
  const [showShareModal, setShowShareModal] = useState(false);
  const garage = useGarageStore((s) => s.cars);
  const removeFromGarage = useGarageStore((s) => s.remove);
  const clearGarage = useGarageStore((s) => s.clear);
  const navigate = useNavigate();
  const confirmAndClear = () => {
    if (confirm('Are you sure you want to clear your entire garage?')) {
      clearGarage();
    }
  };

  const generateShareLink = () => {
    // Generate a shareable link with car IDs
    const carIds = garage.map(car => car.id).join(',');
    const link = `${window.location.origin}/shared-garage?cars=${carIds}`;
    setShareLink(link);
    setShowShareModal(true);

    // Copy to clipboard
    navigator.clipboard.writeText(link);
  };

  const totalValue = garage.reduce((sum, car) => sum + (car.price?.msrp || 0), 0);
  const avgHorsepower = garage.length > 0
    ? Math.round(garage.reduce((sum, car) => sum + car.engine.horsepower, 0) / garage.length)
    : 0;
  const avgMPG = garage.length > 0
    ? Math.round(garage.reduce((sum, car) => sum + (car.fuelEconomy.combined || 0), 0) / garage.length)
    : 0;

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-black border-b border-zinc-900">
        <div className="px-8 py-6">
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            <Link
              to="/"
              className="inline-flex items-center gap-3 text-xs tracking-[0.3em] text-zinc-600 hover:text-white transition-colors group"
            >
              <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M7 16l-4-4m0 0l4-4m-4 4h18" />
              </svg>
              <span>HOME</span>
            </Link>

            <div className="text-center">
              <h1 className="text-2xl md:text-3xl font-black tracking-tighter">
                DREAM GARAGE
              </h1>
              <p className="text-xs tracking-[0.3em] text-zinc-700 mt-1">
                {garage.length} VEHICLE{garage.length !== 1 ? 'S' : ''}
              </p>
            </div>

            <button
              onClick={confirmAndClear}
              className="text-xs tracking-[0.3em] text-zinc-600 hover:text-red-500 transition-colors"
            >
              CLEAR
            </button>
          </div>
        </div>
      </div>

      <div className="pt-32 pb-16 px-8">
        {garage.length === 0 ? (
          <div className="max-w-4xl mx-auto text-center py-32">
            <svg
              className="w-32 h-32 mx-auto mb-8 text-zinc-900"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>

            <h2 className="text-4xl font-black tracking-tighter mb-4">
              YOUR GARAGE IS EMPTY
            </h2>
            <p className="text-lg tracking-wider text-zinc-600 mb-8">
              Start adding cars to build your dream collection
            </p>
            <Link
              to="/"
              className="inline-block bg-white text-black px-8 py-4 font-black tracking-widest text-sm hover:bg-zinc-300 transition-all"
            >
              BROWSE CARS
            </Link>
          </div>
        ) : (
          <div className="max-w-7xl mx-auto">
            {/* Garage Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-12">
              <div className="bg-zinc-950 border border-zinc-900 p-6">
                <p className="text-xs tracking-widest text-zinc-700 mb-2">TOTAL VALUE</p>
                <p className="text-3xl font-black">${(totalValue / 1000000).toFixed(2)}M</p>
              </div>
              <div className="bg-zinc-950 border border-zinc-900 p-6">
                <p className="text-xs tracking-widest text-zinc-700 mb-2">AVG POWER</p>
                <p className="text-3xl font-black">{avgHorsepower} HP</p>
              </div>
              <div className="bg-zinc-950 border border-zinc-900 p-6">
                <p className="text-xs tracking-widest text-zinc-700 mb-2">AVG MPG</p>
                <p className="text-3xl font-black">{avgMPG}</p>
              </div>
              <div className="bg-zinc-950 border border-zinc-900 p-6">
                <p className="text-xs tracking-widest text-zinc-700 mb-2">VEHICLES</p>
                <p className="text-3xl font-black">{garage.length}</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-center gap-4 mb-12">
              <button
                onClick={() => navigate('/battle')}
                disabled={garage.length < 2}
                className={`px-8 py-4 font-black tracking-widest text-sm transition-all ${
                  garage.length >= 2
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-zinc-900 text-zinc-700 cursor-not-allowed'
                }`}
              >
                ⚔️ BATTLE MODE
              </button>
              <button
                onClick={generateShareLink}
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 font-black tracking-widest text-sm transition-all"
              >
                📤 SHARE GARAGE
              </button>
            </div>

            {/* Garage Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-zinc-900">
              {garage.map((car, index) => (
                <div
                  key={car.id}
                  className="bg-black p-8 hover:bg-zinc-950 transition-all duration-300 border border-zinc-900 hover:border-zinc-700 group relative"
                >
                  {/* Position Badge */}
                  <div className="absolute top-4 left-4 w-10 h-10 bg-zinc-950 border border-zinc-800 flex items-center justify-center">
                    <span className="text-lg font-black text-zinc-700">#{index + 1}</span>
                  </div>

                  {/* Remove Button */}
                  <button
                    onClick={() => removeFromGarage(car.id)}
                    className="absolute top-4 right-4 w-10 h-10 bg-zinc-950 border border-zinc-800 flex items-center justify-center hover:bg-red-600 hover:border-red-600 transition-all group/remove"
                  >
                    <svg className="w-5 h-5 text-zinc-700 group-hover/remove:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>

                  {/* Year */}
                  <div className="mb-4 mt-12">
                    <p className="text-5xl font-black text-zinc-700 group-hover:text-zinc-600 transition-colors">
                      {car.year}
                    </p>
                  </div>

                  {/* Make & Model */}
                  <div className="mb-6">
                    <h3 className="text-2xl font-black tracking-tight mb-1 group-hover:tracking-wide transition-all">
                      {car.make.toUpperCase()}
                    </h3>
                    <p className="text-lg font-light tracking-wider text-zinc-500 group-hover:text-zinc-400 transition-colors">
                      {car.model}
                    </p>
                  </div>

                  {/* Divider */}
                  <div className="h-px bg-zinc-900 group-hover:bg-zinc-700 transition-colors mb-6" />

                  {/* Specs Grid */}
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div>
                      <p className="text-xs tracking-widest text-zinc-700 mb-1 uppercase">Power</p>
                      <p className="text-lg font-bold">{car.engine.horsepower}<span className="text-xs text-zinc-600 ml-1">HP</span></p>
                    </div>
                    <div>
                      <p className="text-xs tracking-widest text-zinc-700 mb-1 uppercase">MPG</p>
                      <p className="text-lg font-bold">{car.fuelEconomy.combined || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs tracking-widest text-zinc-700 mb-1 uppercase">Price</p>
                      <p className="text-lg font-bold">${car.price?.msrp ? (car.price.msrp / 1000).toFixed(0) : '?'}K</p>
                    </div>
                    <div>
                      <p className="text-xs tracking-widest text-zinc-700 mb-1 uppercase">Type</p>
                      <p className="text-lg font-bold capitalize">{car.bodyStyle}</p>
                    </div>
                  </div>

                  {/* View Button */}
                  <button
                    onClick={() => navigate(`/car/${car.id}`)}
                    className="w-full flex items-center justify-center gap-2 text-xs tracking-widest text-zinc-700 group-hover:text-white transition-all py-2 border border-zinc-900 group-hover:border-zinc-700"
                  >
                    <span>VIEW DETAILS</span>
                    <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black bg-opacity-95 z-50 flex items-center justify-center p-8">
          <div className="max-w-2xl w-full bg-black border border-zinc-800 p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-black tracking-tight">SHARE YOUR GARAGE</h2>
              <button
                onClick={() => setShowShareModal(false)}
                className="text-zinc-600 hover:text-white transition-colors"
              >
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <p className="text-sm tracking-wider text-zinc-600 mb-6">
              Link copied to clipboard! Share it with friends to get their opinion on your collection.
            </p>

            <div className="bg-zinc-950 border border-zinc-900 p-4 mb-6 font-mono text-sm break-all">
              {shareLink}
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(shareLink);
                  alert('Link copied again!');
                }}
                className="flex-1 bg-white text-black px-6 py-4 font-black tracking-widest text-sm hover:bg-zinc-300 transition-all"
              >
                COPY AGAIN
              </button>
              <button
                onClick={() => setShowShareModal(false)}
                className="flex-1 bg-zinc-900 border border-zinc-800 px-6 py-4 font-black tracking-widest text-sm hover:bg-zinc-800 transition-all"
              >
                CLOSE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
