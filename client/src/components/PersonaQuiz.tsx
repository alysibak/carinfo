import { useState } from 'react';

interface PersonaQuizProps {
  onComplete: (persona: PersonaResult) => void;
}

export interface PersonaResult {
  type: 'commuter' | 'gearhead' | 'family' | 'work';
  budget: { min: number; max: number };
  priority: 'mpg' | 'power' | 'safety' | 'space';
  usage: 'commute' | 'family' | 'fun' | 'work';
}

export default function PersonaQuiz({ onComplete }: PersonaQuizProps) {
  const [step, setStep] = useState(1);
  const [answers, setAnswers] = useState<Partial<PersonaResult>>({});

  const handleAnswer = (key: keyof PersonaResult, value: any) => {
    const newAnswers = { ...answers, [key]: value };
    setAnswers(newAnswers);

    if (step === 3) {
      // Determine persona based on answers
      const persona = determinePersona(newAnswers);
      onComplete(persona);
    } else {
      setStep(step + 1);
    }
  };

  const determinePersona = (answers: Partial<PersonaResult>): PersonaResult => {
    let type: PersonaResult['type'] = 'commuter';

    if (answers.usage === 'work') {
      type = 'work';
    } else if (answers.priority === 'power' || answers.usage === 'fun') {
      type = 'gearhead';
    } else if (answers.priority === 'safety' || answers.priority === 'space' || answers.usage === 'family') {
      type = 'family';
    } else if (answers.priority === 'mpg' || answers.usage === 'commute') {
      type = 'commuter';
    }

    return {
      type,
      budget: answers.budget || { min: 20000, max: 40000 },
      priority: answers.priority || 'mpg',
      usage: answers.usage || 'commute',
    };
  };

  const handleSkip = () => {
    const defaultPersona: PersonaResult = {
      type: 'commuter',
      budget: { min: 15000, max: 100000 },
      priority: 'mpg',
      usage: 'commute',
    };
    onComplete(defaultPersona);
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
      <div className="max-w-4xl w-full px-8">
        {/* Progress */}
        <div className="mb-12">
          <div className="flex items-center justify-center gap-2 mb-4">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`h-1 w-24 transition-all duration-300 ${
                  s <= step ? 'bg-white' : 'bg-zinc-800'
                }`}
              />
            ))}
          </div>
          <p className="text-center text-xs tracking-[0.3em] text-zinc-300">
            STEP {step} OF 3
          </p>
        </div>

        {/* Question 1: Budget */}
        {step === 1 && (
          <div className="text-center animate-fade-in">
            <h2 className="text-5xl md:text-6xl font-black tracking-tighter mb-6">
              WHAT'S YOUR BUDGET?
            </h2>
            <p className="text-lg tracking-wider text-zinc-400 mb-12">
              Select your price range
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto">
              {[
                { label: 'UNDER $20K', range: { min: 0, max: 20000 } },
                { label: '$20K - $35K', range: { min: 20000, max: 35000 } },
                { label: '$35K - $50K', range: { min: 35000, max: 50000 } },
                { label: '$50K - $75K', range: { min: 50000, max: 75000 } },
                { label: '$75K - $100K', range: { min: 75000, max: 100000 } },
                { label: '$100K+', range: { min: 100000, max: 999999 } },
              ].map((option) => (
                <button
                  key={option.label}
                  onClick={() => handleAnswer('budget', option.range)}
                  className="group bg-zinc-950 border border-zinc-800 hover:border-white p-8 transition-all duration-300"
                >
                  <p className="text-2xl font-black tracking-tight group-hover:tracking-wide transition-all">
                    {option.label}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Question 2: Priority */}
        {step === 2 && (
          <div className="text-center animate-fade-in">
            <h2 className="text-5xl md:text-6xl font-black tracking-tighter mb-6">
              WHAT MATTERS MOST?
            </h2>
            <p className="text-lg tracking-wider text-zinc-400 mb-12">
              Choose your top priority
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto">
              {[
                { label: 'FUEL ECONOMY', value: 'mpg', desc: 'Save money at the pump' },
                { label: 'PERFORMANCE', value: 'power', desc: 'Speed and acceleration' },
                { label: 'SAFETY', value: 'safety', desc: 'Protect your family' },
                { label: 'SPACE', value: 'space', desc: 'Room for everyone' },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleAnswer('priority', option.value)}
                  className="group bg-zinc-950 border border-zinc-800 hover:border-white p-8 transition-all duration-300 text-left"
                >
                  <p className="text-3xl font-black tracking-tight group-hover:tracking-wide transition-all mb-2">
                    {option.label}
                  </p>
                  <p className="text-sm tracking-wider text-zinc-400 group-hover:text-zinc-400 transition-colors">
                    {option.desc}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Question 3: Usage */}
        {step === 3 && (
          <div className="text-center animate-fade-in">
            <h2 className="text-5xl md:text-6xl font-black tracking-tighter mb-6">
              HOW WILL YOU USE IT?
            </h2>
            <p className="text-lg tracking-wider text-zinc-400 mb-12">
              Primary use case
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto">
              {[
                { label: 'DAILY COMMUTE', value: 'commute', desc: 'Reliable transportation' },
                { label: 'FAMILY HAULER', value: 'family', desc: 'Kids, cargo, adventures' },
                { label: 'WEEKEND FUN', value: 'fun', desc: 'Curves and open roads' },
                { label: 'WORK VEHICLE', value: 'work', desc: 'Towing and hauling' },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleAnswer('usage', option.value)}
                  className="group bg-zinc-950 border border-zinc-800 hover:border-white p-8 transition-all duration-300 text-left"
                >
                  <p className="text-3xl font-black tracking-tight group-hover:tracking-wide transition-all mb-2">
                    {option.label}
                  </p>
                  <p className="text-sm tracking-wider text-zinc-400 group-hover:text-zinc-400 transition-colors">
                    {option.desc}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Skip button */}
        <div className="text-center mt-12">
          <button
            onClick={handleSkip}
            className="text-xs tracking-[0.3em] text-zinc-300 hover:text-white transition-colors"
          >
            SKIP & BROWSE ALL
          </button>
        </div>
      </div>
    </div>
  );
}
