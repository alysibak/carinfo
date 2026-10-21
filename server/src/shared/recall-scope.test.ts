import { describe, expect, it } from 'vitest';
import {
  investigationPowertrains,
  powertrainNames,
  recallCanApply,
  recallPowertrains,
  splitInvestigations,
  splitRecalls,
} from './recall-scope.js';

describe('recall scope', () => {
  it('reads the powertrains a notice opens with, and none where it names none', () => {
    expect(recallPowertrains('Issue: On certain RAV4 Prime models, the headlight caps …')).toEqual([
      'plug-in hybrid',
    ]);
    expect(recallPowertrains('Certain Focus Electric vehicles may lose power.')).toEqual([
      'electric',
    ]);
    expect(recallPowertrains('On certain hybrid electric vehicles (HEV), the bracket …')).toEqual([
      'hybrid',
    ]);
    expect(
      recallPowertrains('On certain Hybrid and Plug-In Hybrid (PHEV) vehicles, the relay …'),
    ).toEqual(['plug-in hybrid', 'hybrid']);
    expect(
      recallPowertrains('On certain pickup trucks equipped with a diesel or V-10 engine, …'),
    ).toEqual(['diesel', 'gasoline']);
    expect(recallPowertrains('On some natural gas powered vehicles, a fitting …')).toEqual([
      'natural gas',
    ]);
    // Electric power steering is not an electric car; no scope, every powertrain.
    expect(
      recallPowertrains('On certain vehicles equipped with electric power steering, the …'),
    ).toEqual([]);
    expect(recallPowertrains('The airbag may not deploy. Certain hybrid models …')).toEqual([]);
  });

  it('rules a car out only where the scope plainly leaves it out', () => {
    const gas = { fuelType: 'gasoline' as const };
    expect(recallCanApply(['plug-in hybrid'], gas)).toBe(false);
    expect(recallCanApply(['hybrid'], gas)).toBe(false);
    expect(recallCanApply(['hybrid'], { ...gas, mildHybrid: true })).toBe(true);
    expect(recallCanApply(['diesel', 'gasoline'], gas)).toBe(true);
    expect(recallCanApply([], gas)).toBe(true);
    // A V6 Highlander Hybrid has a V6.
    expect(recallCanApply(['gasoline'], { fuelType: 'hybrid' })).toBe(true);
    expect(recallCanApply(['electric'], { fuelType: 'plug-in hybrid' })).toBe(true);
    expect(recallCanApply(['plug-in hybrid'], { fuelType: 'electric' })).toBe(false);
    expect(recallCanApply(['diesel'], { fuelType: 'hydrogen' })).toBe(true);
  });

  it('splits a model year’s recalls and names who the others are for', () => {
    const recalls = [
      { summary: 'Issue: On certain vehicles, the airbag sensor …' },
      { summary: 'Issue: On certain RAV4 Prime models, the headlight caps …' },
      { summary: 'On certain plug-in hybrid vehicles, the DC-DC converter …' },
    ];
    const { applies, other } = splitRecalls(recalls, { fuelType: 'gasoline' });
    expect(applies).toHaveLength(1);
    expect(other.map((o) => powertrainNames(o.powertrains))).toEqual([
      'the plug-in hybrid',
      'the plug-in hybrid',
    ]);
    expect(powertrainNames(['hybrid', 'plug-in hybrid'])).toBe('the hybrid and the plug-in hybrid');
  });

  it('reads an investigation’s powertrain from its component and subject', () => {
    const gas = { fuelType: 'gasoline' as const };
    const diesel = { component: 'FUEL SYSTEM, DIESEL', subject: 'High pressure fuel pump failure' };
    const alert = { component: 'ELECTRICAL SYSTEM', subject: 'Pedestrian alert sounds' };
    const brakes = { component: 'FORWARD COLLISION AVOIDANCE', subject: 'Inadvertent braking' };
    expect(investigationPowertrains(diesel)).toEqual(['diesel']);
    const { applies, other } = splitInvestigations([diesel, alert, brakes], gas);
    expect(applies).toEqual([brakes]);
    expect(other).toEqual([diesel, alert]);
    expect(splitInvestigations([alert], { fuelType: 'hybrid' }).applies).toEqual([alert]);
  });
});
