const steps = 64;
export function randomFrom(seed) {
  let state = seed;
  return () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

export function compose(seed) {
  const random = randomFrom(seed);
  const pick = items => items[Math.floor(random() * items.length)];
  const root = 57 + Math.floor(random() * 8);
  const bpm = 126 + Math.floor(random() * 40);
  const motif = Array.from({length: 8}, () => pick([0, 0, 3, 5, 7, 10, 12]));
  const progression = pick([[0, -5, -2, 0], [0, 3, -5, -2], [0, -2, -5, 0]]);
  const notes = [], bass = [];
  for (let step = 0; step < steps; step++) {
    const chord = root + progression[Math.floor(step / 16)];
    const ending = step % 16 >= 12;
    notes.push(step % 4 === 3 && random() < .28 ? null :
      chord + motif[step % 8] + (ending && step % 2 === 0 ? 12 : 0));
    bass.push(chord - 24 + (step % 4 === 2 ? 7 : 0));
  }
  return {seed, bpm, notes, bass, duty: pick([.125, .25, .5])};
}
