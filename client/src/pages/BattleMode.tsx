import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { CarSpecs } from '../types/car.types';
import { useGarageStore } from '../stores/garageStore';
import { formatMpgForCard, hasNumericValue, UNAVAILABLE_LABEL } from '../utils/dataValue';

export default function BattleMode() {
  const garage = useGarageStore((state) => state.cars);
  const [fighter1, setFighter1] = useState<CarSpecs | null>(null);
  const [fighter2, setFighter2] = useState<CarSpecs | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [animateVS, setAnimateVS] = useState(false);
  const navigate = useNavigate();

  const startBattle = () => {
    if (fighter1 && fighter2) {
      setAnimateVS(true);
      setTimeout(() => {
        setShowResults(true);
      }, 1500);
    }
  };

  const resetBattle = () => {
    setFighter1(null);
    setFighter2(null);
    setShowResults(false);
    setAnimateVS(false);
  };

  const compareSpec = (value1: number, value2: number, higherIsBetter: boolean = true) => {
    if (value1 === value2) return 'tie';
    if (higherIsBetter) {
      return value1 > value2 ? 'winner1' : 'winner2';
    } else {
      return value1 < value2 ? 'winner1' : 'winner2';
    }
  };

  const calculateOverallWinner = (): 'fighter1' | 'fighter2' | 'tie' => {
    if (!fighter1 || !fighter2) return 'tie';

    let score1 = 0;
    let score2 = 0;

    // Power (skip if either lacks data)
    if (fighter1.engine.horsepower != null && fighter2.engine.horsepower != null) {
      if (fighter1.engine.horsepower > fighter2.engine.horsepower) score1++;
      else if (fighter2.engine.horsepower > fighter1.engine.horsepower) score2++;
    }

    // Torque
    if (fighter1.engine.torque != null && fighter2.engine.torque != null) {
      if (fighter1.engine.torque > fighter2.engine.torque) score1++;
      else if (fighter2.engine.torque > fighter1.engine.torque) score2++;
    }

    // MPG
    const mpg1 = fighter1.fuelEconomy.combined || 0;
    const mpg2 = fighter2.fuelEconomy.combined || 0;
    if (mpg1 > mpg2) score1++;
    else if (mpg2 > mpg1) score2++;

    // 0-60 (skip if both lack data)
    const zeroToSixty1 = fighter1.performance?.zeroToSixty;
    const zeroToSixty2 = fighter2.performance?.zeroToSixty;
    if (zeroToSixty1 != null && zeroToSixty2 != null) {
      if (zeroToSixty1 < zeroToSixty2) score1++;
      else if (zeroToSixty2 < zeroToSixty1) score2++;
    }

    // Safety
    const safety1 = fighter1.safetyRating?.overall || 0;
    const safety2 = fighter2.safetyRating?.overall || 0;
    if (safety1 > safety2) score1++;
    else if (safety2 > safety1) score2++;

    // Price (lower is better)
    const price1 = fighter1.price?.msrp || 999999;
    const price2 = fighter2.price?.msrp || 999999;
    if (price1 < price2) score1++;
    else if (price2 < price1) score2++;

    if (score1 > score2) return 'fighter1';
    if (score2 > score1) return 'fighter2';
    return 'tie';
  };

  if (garage.length < 2) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center px-8">
          <h2 className="text-4xl font-black tracking-tighter mb-4">
            BATTLE MODE UNAVAILABLE
          </h2>
          <p className="text-lg tracking-wider text-zinc-400 mb-8">
            Add at least 2 cars to your garage to start battling
          </p>
          <Link
            to="/"
            className="inline-block bg-white text-black px-8 py-4 font-black tracking-widest text-sm hover:bg-zinc-300 transition-all"
          >
            BROWSE CARS
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-black border-b border-zinc-900">
        <div className="px-8 py-6">
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            <Link
              to="/garage"
              className="inline-flex items-center gap-3 text-xs tracking-[0.3em] text-zinc-400 hover:text-white transition-colors group"
            >
              <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M7 16l-4-4m0 0l4-4m-4 4h18" />
              </svg>
              <span>GARAGE</span>
            </Link>

            <div className="text-center">
              <h1 className="text-2xl md:text-3xl font-black tracking-tighter">
                BATTLE MODE
              </h1>
              <p className="text-xs tracking-[0.3em] text-zinc-300 mt-1">
                HEAD TO HEAD
              </p>
            </div>

            <button
              onClick={resetBattle}
              className="text-xs tracking-[0.3em] text-zinc-400 hover:text-white transition-colors"
            >
              RESET
            </button>
          </div>
        </div>
      </div>

      <div className="pt-8 pb-16 px-8">
        {!showResults ? (
          <>
            {/* Selection Phase */}
            <div className="max-w-7xl mx-auto">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
                {/* Fighter 1 Selection */}
                <div>
                  <h2 className="text-xl font-black tracking-tight mb-6 text-center uppercase">
                    Select Fighter 1
                  </h2>

                  {fighter1 ? (
                    <div className="bg-zinc-950 border-2 border-white p-8">
                      <p className="text-xs tracking-widest text-white mb-4">FIGHTER 1</p>
                      <h3 className="text-3xl font-black tracking-tight mb-2">
                        {fighter1.make.toUpperCase()}
                      </h3>
                      <p className="text-xl font-light tracking-wider text-zinc-500 mb-4">
                        {fighter1.model}
                      </p>
                      <p className="text-5xl font-black text-zinc-300 mb-6">
                        {fighter1.year}
                      </p>
                      <button
                        onClick={() => setFighter1(null)}
                        className="w-full bg-zinc-900 border border-zinc-800 px-4 py-3 text-xs tracking-widest hover:bg-zinc-800 transition-all"
                      >
                        CHANGE SELECTION
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {garage.map((car) => (
                        <button
                          key={car.id}
                          onClick={() => setFighter1(car)}
                          disabled={fighter2?.id === car.id}
                          className={`w-full text-left bg-zinc-950 border border-zinc-900 p-6 hover:border-white transition-all ${
                            fighter2?.id === car.id ? 'opacity-30 cursor-not-allowed' : ''
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="text-xl font-black tracking-tight">
                                {car.make.toUpperCase()}
                              </h3>
                              <p className="text-lg font-light tracking-wider text-zinc-500">
                                {car.model}
                              </p>
                            </div>
                            <p className="text-4xl font-black text-zinc-300">{car.year}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Fighter 2 Selection */}
                <div>
                  <h2 className="text-xl font-black tracking-tight mb-6 text-center uppercase">
                    Select Fighter 2
                  </h2>

                  {fighter2 ? (
                    <div className="bg-zinc-950 border-2 border-zinc-600 p-8">
                      <p className="text-xs tracking-widest text-zinc-400 mb-4">FIGHTER 2</p>
                      <h3 className="text-3xl font-black tracking-tight mb-2">
                        {fighter2.make.toUpperCase()}
                      </h3>
                      <p className="text-xl font-light tracking-wider text-zinc-500 mb-4">
                        {fighter2.model}
                      </p>
                      <p className="text-5xl font-black text-zinc-300 mb-6">
                        {fighter2.year}
                      </p>
                      <button
                        onClick={() => setFighter2(null)}
                        className="w-full bg-zinc-900 border border-zinc-800 px-4 py-3 text-xs tracking-widest hover:bg-zinc-800 transition-all"
                      >
                        CHANGE SELECTION
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {garage.map((car) => (
                        <button
                          key={car.id}
                          onClick={() => setFighter2(car)}
                          disabled={fighter1?.id === car.id}
                          className={`w-full text-left bg-zinc-950 border border-zinc-900 p-6 hover:border-zinc-600 transition-all ${
                            fighter1?.id === car.id ? 'opacity-30 cursor-not-allowed' : ''
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="text-xl font-black tracking-tight">
                                {car.make.toUpperCase()}
                              </h3>
                              <p className="text-lg font-light tracking-wider text-zinc-500">
                                {car.model}
                              </p>
                            </div>
                            <p className="text-4xl font-black text-zinc-300">{car.year}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Start Battle Button */}
              {fighter1 && fighter2 && !animateVS && (
                <div className="text-center">
                  <button
                    onClick={startBattle}
                    className="bg-white text-black px-16 py-6 font-black tracking-widest text-xl hover:bg-zinc-300 transition-all transform hover:scale-105"
                  >
                    START BATTLE
                  </button>
                </div>
              )}

              {/* VS Animation */}
              {animateVS && !showResults && fighter1 && fighter2 && (
                <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
                  <div className="text-center">
                    <div className="grid grid-cols-3 items-center gap-16">
                      <div className="text-right animate-slide-in-left">
                        <h3 className="text-4xl font-black tracking-tight text-white mb-2">
                          {fighter1.make}
                        </h3>
                        <p className="text-2xl font-light tracking-wider text-zinc-500">
                          {fighter1.model}
                        </p>
                      </div>

                      <div className="text-9xl font-black tracking-tighter animate-pulse">
                        VS
                      </div>

                      <div className="text-left animate-slide-in-right">
                        <h3 className="text-4xl font-black tracking-tight text-zinc-400 mb-2">
                          {fighter2.make}
                        </h3>
                        <p className="text-2xl font-light tracking-wider text-zinc-500">
                          {fighter2.model}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            {/* Battle Results */}
            <div className="max-w-7xl mx-auto">
              {/* Winner Banner */}
              {(() => {
                const winner = calculateOverallWinner();
                if (winner !== 'tie') {
                  const winnerCar = winner === 'fighter1' ? fighter1! : fighter2!;
                  return (
                    <div className="mb-12 text-center bg-gradient-to-r from-yellow-600 to-yellow-500 text-black p-8">
                      <p className="text-xs tracking-[0.3em] font-black mb-2">OVERALL WINNER</p>
                      <h2 className="text-5xl font-black tracking-tighter">
                        {winnerCar.year} {winnerCar.make.toUpperCase()} {winnerCar.model.toUpperCase()}
                      </h2>
                    </div>
                  );
                }
                return (
                  <div className="mb-12 text-center bg-zinc-900 text-white p-8">
                    <p className="text-xs tracking-[0.3em] font-black mb-2">RESULT</p>
                    <h2 className="text-5xl font-black tracking-tighter">IT'S A TIE!</h2>
                  </div>
                );
              })()}

              {/* Spec Comparison Table */}
              <div className="bg-zinc-950 border border-zinc-900 overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-zinc-900">
                      <th className="p-6 text-left">
                        <div className="text-white">
                          <p className="text-xs tracking-widest mb-2">FIGHTER 1</p>
                          <h3 className="text-2xl font-black tracking-tight">
                            {fighter1!.make} {fighter1!.model}
                          </h3>
                          <p className="text-lg font-light tracking-wider text-zinc-500">
                            {fighter1!.year}
                          </p>
                        </div>
                      </th>
                      <th className="p-6 text-center text-xs tracking-[0.3em] text-zinc-300">
                        CATEGORY
                      </th>
                      <th className="p-6 text-right">
                        <div className="text-zinc-400">
                          <p className="text-xs tracking-widest mb-2">FIGHTER 2</p>
                          <h3 className="text-2xl font-black tracking-tight">
                            {fighter2!.make} {fighter2!.model}
                          </h3>
                          <p className="text-lg font-light tracking-wider text-zinc-500">
                            {fighter2!.year}
                          </p>
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Horsepower — only when both fighters have data */}
                    {fighter1!.engine.horsepower != null && fighter2!.engine.horsepower != null && (() => {
                      const result = compareSpec(fighter1!.engine.horsepower, fighter2!.engine.horsepower);
                      return (
                        <tr className="border-b border-zinc-900">
                          <td className={`p-6 text-2xl font-black ${result === 'winner1' ? 'text-white' : result === 'winner2' ? 'text-zinc-400' : ''}`}>
                            {fighter1!.engine.horsepower} HP
                          </td>
                          <td className="p-6 text-center text-xs tracking-widest text-zinc-300">
                            HORSEPOWER
                          </td>
                          <td className={`p-6 text-right text-2xl font-black ${result === 'winner2' ? 'text-white' : result === 'winner1' ? 'text-zinc-400' : ''}`}>
                            {fighter2!.engine.horsepower} HP
                          </td>
                        </tr>
                      );
                    })()}

                    {/* Engine size — always available for non-EVs */}
                    {(() => {
                      const d1 = fighter1!.engine.displacement ?? 0;
                      const d2 = fighter2!.engine.displacement ?? 0;
                      const result = d1 > 0 && d2 > 0 ? compareSpec(d1, d2) : 'tie';
                      return (
                        <tr className="border-b border-zinc-900">
                          <td className={`p-6 text-2xl font-black ${result === 'winner1' ? 'text-white' : result === 'winner2' ? 'text-zinc-400' : ''}`}>
                            {d1 > 0 ? `${d1}L` : 'EV'}
                          </td>
                          <td className="p-6 text-center text-xs tracking-widest text-zinc-300">
                            ENGINE
                          </td>
                          <td className={`p-6 text-right text-2xl font-black ${result === 'winner2' ? 'text-white' : result === 'winner1' ? 'text-zinc-400' : ''}`}>
                            {d2 > 0 ? `${d2}L` : 'EV'}
                          </td>
                        </tr>
                      );
                    })()}

                    {/* 0-60 — only when both fighters have data */}
                    {fighter1!.performance?.zeroToSixty != null && fighter2!.performance?.zeroToSixty != null && (() => {
                      const val1 = fighter1!.performance!.zeroToSixty!;
                      const val2 = fighter2!.performance!.zeroToSixty!;
                      const result = compareSpec(val1, val2, false);
                      return (
                        <tr className="border-b border-zinc-900">
                          <td className={`p-6 text-2xl font-black ${result === 'winner1' ? 'text-white' : result === 'winner2' ? 'text-zinc-400' : ''}`}>
                            {val1}s
                          </td>
                          <td className="p-6 text-center text-xs tracking-widest text-zinc-300">
                            0-60 MPH
                          </td>
                          <td className={`p-6 text-right text-2xl font-black ${result === 'winner2' ? 'text-white' : result === 'winner1' ? 'text-zinc-400' : ''}`}>
                            {val2}s
                          </td>
                        </tr>
                      );
                    })()}

                    {/* MPG */}
                    {(() => {
                      const val1 = fighter1!.fuelEconomy.combined;
                      const val2 = fighter2!.fuelEconomy.combined;
                      const display1 = formatMpgForCard(val1);
                      const display2 = formatMpgForCard(val2);
                      const result =
                        hasNumericValue(val1) && hasNumericValue(val2)
                          ? compareSpec(val1!, val2!)
                          : 'tie';
                      return (
                        <tr className="border-b border-zinc-900">
                          <td className={`p-6 text-2xl font-black ${result === 'winner1' ? 'text-white' : result === 'winner2' ? 'text-zinc-400' : ''}`}>
                            {display1} MPG
                          </td>
                          <td className="p-6 text-center text-xs tracking-widest text-zinc-300">
                            FUEL ECONOMY
                          </td>
                          <td className={`p-6 text-right text-2xl font-black ${result === 'winner2' ? 'text-white' : result === 'winner1' ? 'text-zinc-400' : ''}`}>
                            {display2} MPG
                          </td>
                        </tr>
                      );
                    })()}

                    {/* Safety — only when at least one fighter is NHTSA-rated */}
                    {(fighter1!.safetyRating?.overall || fighter2!.safetyRating?.overall) && (() => {
                      const val1 = fighter1!.safetyRating?.overall;
                      const val2 = fighter2!.safetyRating?.overall;
                      const display1 = hasNumericValue(val1) ? `${val1}/5` : UNAVAILABLE_LABEL;
                      const display2 = hasNumericValue(val2) ? `${val2}/5` : UNAVAILABLE_LABEL;
                      const result =
                        hasNumericValue(val1) && hasNumericValue(val2)
                          ? compareSpec(val1!, val2!)
                          : 'tie';
                      return (
                        <tr className="border-b border-zinc-900">
                          <td className={`p-6 text-2xl font-black ${result === 'winner1' ? 'text-white' : result === 'winner2' ? 'text-zinc-400' : ''}`}>
                            {display1}
                          </td>
                          <td className="p-6 text-center text-xs tracking-widest text-zinc-300">
                            SAFETY RATING
                          </td>
                          <td className={`p-6 text-right text-2xl font-black ${result === 'winner2' ? 'text-white' : result === 'winner1' ? 'text-zinc-400' : ''}`}>
                            {display2}
                          </td>
                        </tr>
                      );
                    })()}

                    {/* Price */}
                    {(() => {
                      const val1 = fighter1!.price?.msrp || 0;
                      const val2 = fighter2!.price?.msrp || 0;
                      const result = compareSpec(val1, val2, false);
                      return (
                        <tr>
                          <td className={`p-6 text-2xl font-black ${result === 'winner1' ? 'text-white' : result === 'winner2' ? 'text-zinc-400' : ''}`}>
                            ${(val1 / 1000).toFixed(0)}K
                          </td>
                          <td className="p-6 text-center text-xs tracking-widest text-zinc-300">
                            EST. VALUE
                          </td>
                          <td className={`p-6 text-right text-2xl font-black ${result === 'winner2' ? 'text-white' : result === 'winner1' ? 'text-zinc-400' : ''}`}>
                            ${(val2 / 1000).toFixed(0)}K
                          </td>
                        </tr>
                      );
                    })()}
                  </tbody>
                </table>
              </div>

              {/* Action Buttons */}
              <div className="mt-8 flex items-center justify-center gap-4">
                <button
                  onClick={resetBattle}
                  className="bg-white text-black px-8 py-4 font-black tracking-widest text-sm hover:bg-zinc-300 transition-all"
                >
                  NEW BATTLE
                </button>
                <button
                  onClick={() => navigate('/garage')}
                  className="bg-zinc-900 border border-zinc-800 px-8 py-4 font-black tracking-widest text-sm hover:bg-zinc-800 transition-all"
                >
                  BACK TO GARAGE
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <style>{`
        @keyframes slide-in-left {
          from {
            transform: translateX(-100px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        @keyframes slide-in-right {
          from {
            transform: translateX(100px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .animate-slide-in-left {
          animation: slide-in-left 0.6s ease-out;
        }
        .animate-slide-in-right {
          animation: slide-in-right 0.6s ease-out;
        }
      `}</style>
    </div>
  );
}
