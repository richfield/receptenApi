import { DateLinkModel } from '../src/models/DateLink';
import { generateIcal } from '../src/services/dateLinkService';

// Monkeypatch DateLinkModel.aggregate to return deterministic data
// Use a date that is around a DST transition: 2026-03-29 (Europe/Amsterdam DST start)
const sample = [
  {
    _id: '2026-03-29T00:00:00.000Z',
    recipes: [
      {
        _id: '60f5a3b7c2a4f9b1d8e7f123',
        name: 'DST Test Recipe',
        description: 'A recipe to test ICS date formatting.'
      }
    ]
  }
];

// Overwrite aggregate function
(DateLinkModel as any).aggregate = async () => sample;

(async () => {
  try {
    const ical = await generateIcal();
    console.log('Generated ICS:\n', ical);

    // Expect DTSTART/DTEND lines in Europe/Amsterdam for 2026-03-29
    if (!ical.includes('DTSTART;VALUE=DATE:20260329')) {
      throw new Error('DTSTART not formatted as 20260329 for Europe/Amsterdam');
    }
    if (!ical.includes('DTEND;VALUE=DATE:20260330')) {
      throw new Error('DTEND not formatted as 20260330 (exclusive end)');
    }

    console.log('Test passed: generateIcal formats DTSTART/DTEND using Europe/Amsterdam');
    process.exit(0);
  } catch (err) {
    console.error('Test failed:', err);
    process.exit(1);
  }
})();
