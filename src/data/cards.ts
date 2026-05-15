export type CardCategory = 'icebreaker' | 'deep' | 'fun' | 'hot' | 'cultural';

export interface Card {
  id: string;
  category: CardCategory;
  text: string;
  isHot?: boolean;
}

export const CARDS: Card[] = [
  // ICEBREAKERS (8)
  { id: '1', category: 'icebreaker', text: '¿Cuál fue tu primera impresión de mí? Sé 100% honesto/a, no muerdo.' },
  { id: '2', category: 'icebreaker', text: 'Si tuviéramos que escaparnos ahora mismo a un lugar de Argentina, ¿a dónde iríamos y por qué?' },
  { id: '3', category: 'icebreaker', text: '¿Qué es lo más "descolgado" que hiciste por amor o para llamar la atención?' },
  { id: '4', category: 'icebreaker', text: '¿Mate dulce o amargo? Esta respuesta puede definir el futuro de nuestra relación.' },
  { id: '5', category: 'icebreaker', text: '¿Cuál es tu "guilty pleasure" musical que te daría vergüenza admitir en público?' },
  { id: '6', category: 'icebreaker', text: 'Si pudieras ser un personaje de una serie argentina por un día, ¿quién serías?' },
  { id: '7', category: 'icebreaker', text: '¿Qué es lo primero que hacés cuando llegás a un asado?' },
  { id: '8', category: 'icebreaker', text: '¿Cuál es el peor chamuyo que te dijeron o que dijiste?' },

  // DEEP (10)
  { id: '9', category: 'deep', text: '¿Qué es algo que la mayoría de la gente no sabe de vos a simple vista?' },
  { id: '10', category: 'deep', text: 'Si pudieras cambiar algo de tu pasado, ¿lo harías o creés que todo pasa por algo?' },
  { id: '11', category: 'deep', text: '¿Cuál es tu mayor miedo que suena tonto pero te aterra?' },
  { id: '12', category: 'deep', text: '¿Qué es lo que más valorás en una persona cuando recién la conocés?' },
  { id: '13', category: 'deep', text: '¿Cuál fue el momento en el que te sentiste más orgulloso/a de vos mismo/a recientemente?' },
  { id: '14', category: 'deep', text: '¿Qué es el amor para vos en una sola palabra?' },
  { id: '15', category: 'deep', text: '¿Sentís que estás hoy donde soñabas estar hace 5 años?' },
  { id: '16', category: 'deep', text: '¿Cuál es esa charla pendiente que tenés con alguien y por qué no la tuviste?' },
  { id: '17', category: 'deep', text: '¿Qué canción te hace sentir que estás en una película cada vez que la escuchás?' },
  { id: '18', category: 'deep', text: '¿Cuál es tu lugar seguro cuando el mundo se pone difícil?' },

  // FUN / DYNAMIC (8)
  { id: '19', category: 'fun', text: 'Hacé tu mejor imitación de un porteño enojado en el tráfico.' },
  { id: '20', category: 'fun', text: 'Contá un chiste tan malo que me haga reír por compromiso.' },
  { id: '21', category: 'fun', text: 'Si tuviéramos que armar una banda hoy, ¿qué instrumento tocarías y cómo se llamaría el grupo?' },
  { id: '22', category: 'fun', text: 'Mostrame la foto más bizarra que tengas en tu galería ahora mismo.' },
  { id: '23', category: 'fun', text: '¿Cuál es tu teoría conspirativa favorita? (Vale decir que las Malvinas son argentinas, eso es un hecho).' },
  { id: '24', category: 'fun', text: 'Si fueras un sabor de helado, ¿cuál serías y por qué?' },
  { id: '25', category: 'fun', text: 'Describí tu cita ideal usando solo 3 emojis.' },
  { id: '26', category: 'fun', text: 'Contá una anécdota de cuando estabas re "descolgado/a" en una situación importante.' },

  // CULTURAL / REGIONAL (10)
  { id: '27', category: 'cultural', text: 'Decí una frase típica de Córdoba sin usar la palabra "culiao" (imposible challenge).' },
  { id: '28', category: 'cultural', text: 'Explicá qué es un "choco" o usá el término "pando" en una frase como si fueras de Mendoza.' },
  { id: '29', category: 'cultural', text: 'Imitá a un tucumano diciendo "¡Eh, pingo!" con todo el sentimiento.' },
  { id: '30', category: 'cultural', text: '¿Cómo pedirías un "refuerzo" o un "angá" si estuvieras en el Litoral?' },
  { id: '31', category: 'cultural', text: 'Describí cómo se siente el viento en la Patagonia sin usar la palabra "frío".' },
  { id: '32', category: 'cultural', text: 'Si fueras del norte, ¿cómo convencerías a alguien de que tus empanadas son las mejores del país?' },
  { id: '33', category: 'cultural', text: '¿Cuál es el modismo de tu zona que más te gusta y qué significa?' },
  { id: '34', category: 'cultural', text: '¿Qué es lo más "federal" que hay en tu heladera ahora mismo?' },
  { id: '35', category: 'cultural', text: 'Si tuviéramos que elegir una provincia para vivir un año, ¿cuál elegirías y por qué?' },
  { id: '36', category: 'cultural', text: 'Contá una leyenda urbana de tu ciudad/pueblo que te daba miedo de chico/a.' },

  // HOT (4)
  { id: '37', category: 'hot', isHot: true, text: '¿Qué es lo que físicamente más te llamó la atención de mí cuando me viste hoy?' },
  { id: '38', category: 'hot', isHot: true, text: 'Si esta cita terminara en un beso, ¿cómo te lo imaginás?' },
  { id: '39', category: 'hot', isHot: true, text: '¿Cuál es tu mayor "turn-on" que muy poca gente conoce?' },
  { id: '40', category: 'hot', isHot: true, text: 'Si estuviéramos solos en una cabaña en el sur, ¿cuál sería el primer movimiento?' },
];
