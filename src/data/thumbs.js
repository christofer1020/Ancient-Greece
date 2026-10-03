// Poster frames for the chapter menu. Imported (not fetched) so they bundle as hashed assets,
// or as data: URIs in the single-file build.
import birth from '../assets/thumbs/birth.jpg';
import myths from '../assets/thumbs/myths.jpg';
import polis from '../assets/thumbs/polis.jpg';
import athensSparta from '../assets/thumbs/athens-sparta.jpg';
import persianWars from '../assets/thumbs/persian-wars.jpg';
import philosophy from '../assets/thumbs/philosophy.jpg';
import alexander from '../assets/thumbs/alexander.jpg';
import legacy from '../assets/thumbs/legacy.jpg';

export const THUMBS = {
  birth, myths, polis,
  'athens-sparta': athensSparta,
  'persian-wars': persianWars,
  philosophy, alexander, legacy,
};
