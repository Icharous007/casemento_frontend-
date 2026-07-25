export interface MapLocation {
  id: string;
  label: string;
  subtitle: string;
  address: string;
  mapsUrl: string;
}

export const EVENT_LOCATIONS: MapLocation[] = [
  {
    id: 'cerimonia',
    label: 'Cerimônia',
    subtitle: 'Paróquia São Francisco de Assis',
    address: 'Águas Claras – Brasília, DF',
    mapsUrl:
      'https://www.google.com.br/maps/place/Par%C3%B3quia+S%C3%A3o+Francisco+de+Assis/@-15.8288165,-48.0396824,908m/data=!3m2!1e3!4b1!4m6!3m5!1s0x935a33110df89989:0x17b86509738e494f!8m2!3d-15.8288165!4d-48.0396824!16s%2Fg%2F11bx1sksdv?entry=tts&g_ep=EgoyMDI2MDcyMi4wIPu8ASoASAFQAw%3D%3D&skid=8ec0256b-4fda-40b3-a69b-7047a7b71d42',
  },
  {
    id: 'festa',
    label: 'Festa',
    subtitle: 'Maison Mizuno',
    address: 'Taguatinga – Brasília, DF',
    mapsUrl:
      'https://www.google.com.br/maps/place/Maison+Mizuno/@-15.8250179,-48.0720881,908m/data=!3m2!1e3!4b1!4m6!3m5!1s0x935a332c916d9d1f:0xcbc8f2f157ef77ba!8m2!3d-15.8250179!4d-48.0720881!16s%2Fg%2F1thw7tgy?entry=ttu&g_ep=EgoyMDI2MDcyMi4wIKXMDSoASAFQAw%3D%3D',
  },
];
