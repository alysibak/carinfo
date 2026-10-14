import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  fetchImages,
  generationLinks,
  imageName,
  infoboxes,
  infoboxGeneration,
  isSideBox,
  namesMake,
  resolveTitles,
  searchMatches,
  titleCandidates,
  wikiClient,
  wikiPlain,
  yearRange,
} from './wiki-photos.js';

const CIVIC = `{{Short description|Japanese car}}
{{Infobox automobile
| name = Honda Civic
| image = 2022 Honda Civic Sport (US).jpg
| caption = 2022 Civic sedan
| manufacturer = [[Honda]]
| production = 1972–present
}}
The '''Honda Civic''' is a car.
== Tenth generation ==
{{Main|Honda Civic (tenth generation)}}
== Eleventh generation ==
{{Main|Honda Civic (eleventh generation)}}
See also [[Honda Civic (tenth generation)#Type R|Type R]] and [[Honda Civic Type R]].
`;

const TENTH = `{{Infobox automobile
| name = Honda Civic (tenth generation)
| image = [[File:2016_Honda_Civic_EX-T_sedan.jpg|250px]]
| caption = 2016 Civic EX-T sedan (US)<ref>{{cite web|title=2019 review}}</ref>
| model_years = 2016–2021<!-- US -->
| production = {{ubl|June 2015 – 2021|2016–2022 (China)}}
| body_style = {{ubl|4-door [[sedan (automobile)|sedan]]|5-door [[hatchback]]}}
}}`;

const FIT = `{{Infobox automobile
| name = Honda Fit
| image = Honda Fit.jpg
| manufacturer = Honda
| production = 2001–present
}}
== Third generation ==
{{Infobox automobile
| name = Third generation (GK)
| image = 2015 Honda Fit EX.jpg
| production = 2013–2020
| model_years = 2015–2020
}}`;

describe('infoboxes', () => {
  it('reads each infobox, nested templates and links included', () => {
    const [top] = infoboxes(CIVIC);
    expect(top.name).toBe('Honda Civic');
    expect(top.image).toBe('2022 Honda Civic Sport (US).jpg');
    const [tenth] = infoboxes(TENTH);
    expect(tenth.image).toBe('[[File:2016_Honda_Civic_EX-T_sedan.jpg|250px]]');
    expect(tenth.body_style).toContain('hatchback');
    expect(infoboxes(FIT)).toHaveLength(2);
    expect(infoboxes('{{Infobox company|name=Honda}}')).toEqual([]);
  });
});

describe('infoboxGeneration', () => {
  it('takes the photo and the model years over production', () => {
    const generation = infoboxGeneration(infoboxes(TENTH)[0], 'Honda Civic (tenth generation)');
    expect(generation).toEqual({
      title: 'Honda Civic (tenth generation)',
      years: [2016, 2021],
      basis: 'model_years',
      image: '2016 Honda Civic EX-T sedan.jpg',
      caption: '2016 Civic EX-T sedan (US)',
      body: '4-door sedan 5-door hatchback',
    });
  });

  it('falls back to production years, open-ended to next year', () => {
    const generation = infoboxGeneration(infoboxes(FIT)[0], 'Honda Fit', 2026);
    expect(generation).toMatchObject({ years: [2001, 2027], basis: 'production' });
  });

  it('needs a photo and years', () => {
    expect(infoboxGeneration({ production: '2001–2005' }, 'X')).toBeUndefined();
    expect(infoboxGeneration({ image: 'X.jpg' }, 'X')).toBeUndefined();
  });
});

describe('imageName', () => {
  it('finds the file however it is written', () => {
    expect(imageName('Foo bar.JPG')).toBe('Foo bar.JPG');
    expect(imageName('File:foo_bar.jpg')).toBe('Foo bar.jpg');
    expect(imageName('[[Image:Foo.png|thumb]]')).toBe('Foo.png');
    expect(imageName('{{Multiple image|image1=A car.jpg|image2=B car.jpg}}')).toBe('A car.jpg');
    expect(imageName('Logo.svg')).toBeUndefined();
    expect(imageName(undefined)).toBeUndefined();
  });
});

describe('yearRange', () => {
  it('spans the years given, without references', () => {
    expect(yearRange('2016–2021')).toEqual([2016, 2021]);
    expect(yearRange('June 2015 – 2021<ref>Published 2023</ref>')).toEqual([2015, 2021]);
    expect(yearRange('2019–present', 2026)).toEqual([2019, 2027]);
    expect(yearRange('2023–', 2026)).toEqual([2023, 2027]);
    expect(yearRange('unknown')).toBeUndefined();
  });
});

describe('generationLinks', () => {
  it('finds the articles named for this one, once each', () => {
    expect(generationLinks(CIVIC, 'Honda Civic')).toEqual([
      'Honda Civic (tenth generation)',
      'Honda Civic (eleventh generation)',
    ]);
  });
});

describe('isSideBox', () => {
  const makes = ['Nissan', 'Infiniti', 'Chevrolet', 'GMC', 'Kia', 'Land Rover', 'Mini', 'Ram'];
  it('leaves out police and military versions and other makes’ twins', () => {
    expect(isSideBox('LSSV', 'Chevrolet', makes)).toBe(true);
    expect(isSideBox('Infiniti QX4', 'Nissan', makes)).toBe(true);
    expect(isSideBox('Second generation (R50)', 'Nissan', makes)).toBe(false);
    expect(isSideBox('Kia Optima (first generation)', 'Kia', makes)).toBe(false);
    expect(isSideBox('Minivan version', 'Kia', makes)).toBe(false);
    expect(isSideBox('Ramcharger', 'Chevrolet', makes)).toBe(false);
  });
});

describe('wikiPlain', () => {
  it('leaves readable text', () => {
    expect(wikiPlain("'''2016''' [[Honda Civic|Civic]] {{nowrap|EX-T}} sedan<ref>x</ref>")).toBe(
      '2016 Civic EX-T sedan',
    );
  });
});

describe('names', () => {
  it('checks the article is the make’s', () => {
    expect(
      namesMake('Ram pickup', { manufacturer: 'Dodge (1981–2010) Ram (2010–present)' }, 'Ram'),
    ).toBe(true);
    expect(namesMake('Honda Civic', {}, 'Honda')).toBe(true);
    expect(namesMake('McLaren 720S', {}, 'McLaren Automotive')).toBe(true);
    expect(namesMake('Toyota Corolla', { manufacturer: 'Toyota' }, 'Honda')).toBe(false);
  });

  it('tries the title as written, hyphenated, and on its own', () => {
    expect(titleCandidates('Mercedes-Benz', 'C Class')).toEqual([
      'Mercedes-Benz C Class',
      'Mercedes-Benz C-Class',
    ]);
    expect(titleCandidates('Ram', 'Ram 1500')).toEqual([
      'Ram Ram 1500',
      'Ram Ram-1500',
      'Ram 1500',
    ]);
  });

  it('takes a search result of the same name only', () => {
    expect(searchMatches('Mercedes-Benz GLC-Class', 'Mercedes-Benz', 'GLC class')).toBe(true);
    expect(searchMatches('Honda Civic (tenth generation)', 'Honda', 'Civic')).toBe(true);
    expect(searchMatches('Ford F-Series', 'Ford', 'F150')).toBe(false);
  });
});

describe('API', () => {
  const fetchMock = vi.fn<typeof fetch>();
  const json = (body: unknown) =>
    new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json' } });
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('follows normalising and redirects to the page', async () => {
    fetchMock.mockResolvedValueOnce(
      json({
        query: {
          normalized: [{ from: 'honda civic', to: 'Honda civic' }],
          redirects: [{ from: 'Honda civic', to: 'Honda Civic' }],
          pages: [{ title: 'Honda Civic' }, { title: 'Ford F150x', missing: true }],
        },
      }),
    );
    const resolved = await resolveTitles(wikiClient(0), ['honda civic', 'Ford F150x']);
    expect(resolved.get('honda civic')).toEqual({ title: 'Honda Civic', redirected: true });
    expect(resolved.get('Ford F150x')).toBeNull();
  });

  it('takes a redirect to a section of another article as no match', async () => {
    fetchMock.mockResolvedValueOnce(
      json({
        query: {
          redirects: [
            { from: 'Subaru Impreza Outback Sport', to: 'Subaru Outback', tofragment: 'Impreza' },
          ],
          pages: [{ title: 'Subaru Outback' }],
        },
      }),
    );
    const resolved = await resolveTitles(wikiClient(0), ['Subaru Impreza Outback Sport']);
    expect(resolved.get('Subaru Impreza Outback Sport')).toBeNull();
  });

  it('keeps Commons photos with their credit, not Wikipedia’s own files', async () => {
    fetchMock.mockResolvedValueOnce(
      json({
        query: {
          pages: [
            {
              title: 'File:Civic.jpg',
              imagerepository: 'shared',
              imageinfo: [
                {
                  url: 'https://upload.wikimedia.org/wikipedia/commons/a/ab/Civic.jpg',
                  thumburl:
                    'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Civic.jpg/500px-Civic.jpg',
                  descriptionurl: 'https://commons.wikimedia.org/wiki/File:Civic.jpg',
                  mime: 'image/jpeg',
                  extmetadata: {
                    Artist: {
                      value: '<a href="//commons.wikimedia.org/wiki/User:Jane">Jane&nbsp;Doe</a>',
                    },
                    LicenseShortName: { value: 'CC BY-SA 4.0' },
                    LicenseUrl: { value: 'https://creativecommons.org/licenses/by-sa/4.0' },
                  },
                },
              ],
            },
            {
              title: 'File:Brochure.jpg',
              imagerepository: 'local',
              imageinfo: [{ url: 'x', descriptionurl: 'y', mime: 'image/jpeg' }],
            },
          ],
        },
      }),
    );
    const images = await fetchImages(wikiClient(0), ['Civic.jpg', 'Brochure.jpg']);
    expect([...images.keys()]).toEqual(['Civic.jpg']);
    expect(images.get('Civic.jpg')).toEqual({
      src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Civic.jpg/500px-Civic.jpg',
      page: 'https://commons.wikimedia.org/wiki/File:Civic.jpg',
      artist: 'Jane Doe',
      license: 'CC BY-SA 4.0',
      licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0',
    });
  });

  it('waits and asks again when Wikipedia is busy', async () => {
    fetchMock
      .mockResolvedValueOnce(json({ error: { code: 'maxlag' } }))
      .mockResolvedValueOnce(json({ query: { pages: [{ title: 'A' }] } }));
    const resolved = await resolveTitles(wikiClient(0, [0]), ['A']);
    expect(resolved.get('A')).toEqual({ title: 'A', redirected: false });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
