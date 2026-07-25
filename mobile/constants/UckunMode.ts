import Constants from 'expo-constants';
import type { ImageSourcePropType } from 'react-native';

export const UCKUN_MODE = Constants.expoConfig?.extra?.uckunMode === true;

export type UckunSlide = {
  title: string;
  description?: string;
  image?: ImageSourcePropType;
  emoji?: string;
  descriptionEmoji?: string;
  isLast?: boolean;
};

export const UCKUN_WELCOME_SLIDES: UckunSlide[] = [
  {
    title: 'Canımın içinin oğlu, hoşgeldin',
    image: require('@/assets/images/uckun-emre.png'),
  },
  {
    title: 'Biraz zaman alsa da Krakow\'a ulaştın',
    emoji: '✈️',
    description: 'seni beklemek zordu ama bu bana daha fazla zaman verdi.',
  },
  {
    title: 'Sana bir sürpriz hazırlayacağımdan bahsetmiştim',
    emoji: '❓',
    descriptionEmoji: '🎁',
    description: 'ne olduğunu öğrenme vaktin geldi.',
  },
  {
    title: 'Senin gibi deneyim düşkünü ve unorthodox bi adama uygun bir şeye ihtiyacım vardı.',
    image: require('@/assets/images/uckun-us.png'),
    description: 'aklıma gelen en iyi fikir bi uygulamaydı.',
  },
  {
    title: 'Explorience ile tanış',
    image: require('@/assets/images/explorience-logo.png'),
    description: 'bu ikimizin Krakow gezisine ufak da olsa tat katmayı amaçlayan bi uygulama. Aynı zamanda baştan sona çalışan, yayınlamaya **neredeyse** hazır bi proje.',
  },
  {
    title: 'Nasıl çalışıyor?',
    emoji: '🌫️',
    description: "Krakow'un haritası sis bulutlarıyla kaplı. Yürüdükçe etrafın aydınlanacak, keşfettikçe şehri açacaksın.",
  },
  {
    title: 'Keşfet ve yakala',
    emoji: '📸',
    description: 'Şehrin gizli köşelerinde noktalar var. Yakınına gidip fotoğrafını çekerek açabilirsin, yapay zekâ doğrulayacak.',
  },
  {
    title: 'İkimiz için',
    emoji: '🚀',
    description: 'Hazırsan yeni bir oyun oluştur ve başlayalım.',
    isLast: true,
  },
];

export const UCKUN_LOADING_MESSAGES = [
  "Emirhan'ın macerası başlıyor...",
  'Krakow keşfedilmeyi bekliyor!',
  'Haritalar yükleniyor...',
  'Pusulan hazırlanıyor...',
  'Macera başlamak üzere!',
];