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
    <div className="fixed inset-0 bg-black z-50 overflow-y-auto overscroll-contain">
      <div className="min-h-full flex flex-col justify-center max-w-4xl w-full mx-auto px-4 py-10 sm:px-8">
        <div className="mb-8 sm:mb-12">
          <div className="flex items-center justify-center gap-2 mb-4">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`h-1 w-12 sm:w-24 transition-all duration-300 ${
                  s <= step ? 'bg-white' : 'bg-zinc-800'
                }`}
              />
            ))}
          </div>
          <p className="text-center text-xs tracking-[0.2em] text-zinc-400">
            Step {step} of 3
          </p>
        </div>

        {step === 1 && (
          <div className="text-center animate-fade-in">
            <h2 className="text-2xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-3 sm:mb-6">
              What&apos;s your budget?
            </h2>
            <p className="text-sm sm:text-lg text-zinc-400 mb-8 sm:mb-12">
              Estimated market value band (CAD) — not asking price
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-w-5xl mx-auto">
              {[
                { label: 'Under $20k CAD', range: { min: 0, max: 20000 } },
                { label: '$20k – $35k CAD', range: { min: 20000, max: 35000 } },
                { label: '$35k – $50k CAD', range: { min: 35000, max: 50000 } },
                { label: '$50k – $75k CAD', range: { min: 50000, max: 75000 } },
                { label: '$75k – $100k CAD', range: { min: 75000, max: 100000 } },
                { label: '$100k+ CAD', range: { min: 100000, max: 999999 } },
              ].map((option) => (
                <button
                  key={option.label}
                  onClick={() => handleAnswer('budget', option.range)}
                  className="bg-zinc-950 border border-zinc-800 hover:border-white px-4 py-5 sm:p-8 transition-colors"
                >
                  <p className="text-lg sm:text-2xl font-bold tracking-tight">{option.label}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="text-center animate-fade-in">
            <h2 className="text-2xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-3 sm:mb-6">
              What matters most?
            </h2>
            <p className="text-sm sm:text-lg text-zinc-400 mb-8 sm:mb-12">
              Choose your top priority
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-4xl mx-auto">
              {[
                { label: 'Fuel economy', value: 'mpg', desc: 'Save money at the pump' },
                { label: 'Performance', value: 'power', desc: 'Speed and acceleration' },
                { label: 'Safety', value: 'safety', desc: 'Protect your family' },
                { label: 'Space', value: 'space', desc: 'Room for everyone' },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleAnswer('priority', option.value)}
                  className="bg-zinc-950 border border-zinc-800 hover:border-white px-4 py-5 sm:p-8 transition-colors text-left"
                >
                  <p className="text-lg sm:text-2xl font-bold tracking-tight mb-1">{option.label}</p>
                  <p className="text-sm text-zinc-500">{option.desc}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="text-center animate-fade-in">
            <h2 className="text-2xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-3 sm:mb-6">
              How will you use it?
            </h2>
            <p className="text-sm sm:text-lg text-zinc-400 mb-8 sm:mb-12">
              Primary use case
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-4xl mx-auto">
              {[
                { label: 'Daily commute', value: 'commute', desc: 'Reliable transportation' },
                { label: 'Family hauler', value: 'family', desc: 'Kids, cargo, adventures' },
                { label: 'Weekend fun', value: 'fun', desc: 'Curves and open roads' },
                { label: 'Work vehicle', value: 'work', desc: 'Towing and hauling' },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleAnswer('usage', option.value)}
                  className="bg-zinc-950 border border-zinc-800 hover:border-white px-4 py-5 sm:p-8 transition-colors text-left"
                >
                  <p className="text-lg sm:text-2xl font-bold tracking-tight mb-1">{option.label}</p>
                  <p className="text-sm text-zinc-500">{option.desc}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="text-center mt-8 sm:mt-12">
          <button
            onClick={handleSkip}
            className="text-xs tracking-[0.2em] text-zinc-500 hover:text-white transition-colors"
          >
            Skip and browse all
          </button>
        </div>
      </div>
    </div>
  );
}
