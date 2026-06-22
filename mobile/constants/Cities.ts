export type City = {
  name: string;
  country: string;
  flag: string;
  latitude: number;
  longitude: number;
  north: number;
  west: number;
  gridWidth: number;
  gridHeight: number;
};

export const CITIES: City[] = [
  {
    name: 'KRAKOW',
    country: 'Poland',
    flag: '🇵🇱',
    latitude: 50.0614,
    longitude: 19.9372,
    north: 50.1430,
    west: 19.7915,
    gridWidth: 3555,
    gridHeight: 1690,
  },
  {
    name: 'IZMIR',
    country: 'Turkey',
    flag: '🇹🇷',
    latitude: 38.4192,
    longitude: 27.1287,
    north: 38.4833,
    west: 27.0,
    gridWidth: 2333,
    gridHeight: 1333,
  },
];
