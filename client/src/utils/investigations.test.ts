import { describe, expect, it } from 'vitest';
import { investigationKind, investigationText, openFirst } from './investigations';

describe('investigations', () => {
  it('names NHTSA’s kinds of investigation', () => {
    expect(investigationKind('PE')).toBe('Preliminary evaluation');
    expect(investigationKind('EA')).toBe('Engineering analysis');
    expect(investigationKind('XX')).toBe('Investigation');
  });

  it('puts capitals in sentence case and leaves written text alone', () => {
    expect(investigationText('AIR BAG INFLATOR RUPTURE')).toBe('Air bag inflator rupture');
    expect(investigationText('Loss of motive power in Honda vehicles')).toBe(
      'Loss of motive power in Honda vehicles',
    );
  });

  it('lists the open ones first, then the newest', () => {
    const inv = (id: string, opened: string, closed?: string) => ({
      id,
      kind: 'PE',
      opened,
      ...(closed ? { closed } : {}),
      component: 'ENGINE',
      subject: 'x',
    });
    expect(
      openFirst([
        inv('a', '2020-01-01', '2021-01-01'),
        inv('b', '2018-01-01'),
        inv('c', '2022-01-01', '2023-01-01'),
      ]).map((i) => i.id),
    ).toEqual(['b', 'c', 'a']);
  });
});
