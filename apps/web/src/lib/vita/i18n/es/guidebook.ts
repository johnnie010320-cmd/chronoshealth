// VITA CODE V8 16 대사 유형 가이드북 es 번역. 원문: ../../guidebook.ts
import type { VitaGuideText, VitaIntroText } from '../types';

export const GUIDES: Record<string, VitaGuideText> = {
  VITA: {
    feature:
      'Es el tipo de máxima producción energética, con la generación de ATP mitocondrial llevada al máximo. Con predominio del sistema simpático, quema rápidamente grasas y proteínas y tiene un excelente efecto termogénico, pero como depende mucho de ciertas proteínas como combustible, el exceso de carbohidratos procesados puede provocar fácilmente un desequilibrio metabólico.',
    nutrients: ['Carnes magras ricas en proteína', 'Aceite de coco (MCT)', 'Complejo B (B-Complex)', 'Magnesio'],
    exerciseRest: ['Entrenamiento por intervalos de alta intensidad (HIIT)', 'Ejercicio intenso de corta duración', 'Asegurar un sueño nocturno tranquilo'],
  },
  VITS: {
    feature:
      'Tiene una alta capacidad metabólica energética, pero es el tipo «dominador de la noche», con un sistema nervioso nocturno y un eje de secreción de melatonina muy desarrollados. La recuperación celular y la secreción de enzimas depurativas se activan al máximo durante la madrugada.',
    nutrients: ['L-teanina', 'Triptófano', 'Zinc', 'Consumo de antioxidantes (arándanos·quercetina)'],
    exerciseRest: ['Ejercicio aeróbico por la tarde-noche', 'Optimizar el entorno de sueño con cortinas opacas'],
  },
  VILA: {
    feature:
      'Es un quemador de energía flexible, con una excelente capacidad de metabolismo hídrico y circulación sanguínea. Posee una notable flexibilidad metabólica que le permite convertir fácilmente en energía tanto carbohidratos como grasas.',
    nutrients: ['Ácidos grasos omega-3', 'Potasio', 'Hidratación', 'Alimentos para el equilibrio de electrolitos'],
    exerciseRest: ['Natación', 'Ejercicio aeróbico de cuerpo completo', 'Cuidado de la circulación centrado en la hidratación'],
    caution: 'Es necesario controlar el sodio para prevenir la retención de líquidos.',
  },
  VILS: {
    feature:
      'Es un quemador de alta eficiencia con un sistema nervioso minucioso y sensible. Por la noche, la depuración hepática y la limpieza celular (autophagy) alcanzan su máximo, y puede ser sensible a ciertos aditivos químicos y azúcares.',
    nutrients: ['Cardo mariano (silimarina)', 'Glutatión', 'Dieta orgánica', 'Vitamina C'],
    exerciseRest: ['Pilates', 'Estiramientos', 'Ayuno intermitente nocturno ordenado'],
    caution: 'Su sensibilidad a la cafeína es alta; limite la cafeína después de las 2 de la tarde.',
  },
  VGTA: {
    feature:
      'Es un sistema metabólico de tipo «caballero», con una complexión sólida y fuertes mecanismos de defensa. Su protección vascular y de la barrera intestinal es fuerte, pero su marcada tendencia a almacenar energía puede sobrecargar fácilmente el aparato digestivo.',
    nutrients: ['Enzimas digestivas', 'Fibra dietética', 'Azufre dietético (MSM)', 'Probióticos'],
    exerciseRest: ['Entrenamiento con pesas', 'Ejercicio aeróbico que preserva la fuerza muscular'],
    diet: 'Dieta alta en nutrientes y baja en calorías, con restricción estricta de carbohidratos refinados',
  },
  VGTS: {
    feature:
      'Es un tipo que recarga su sistema nervioso y su metabolismo con un sueño y un descanso tranquilos y prolongados. Su velocidad metabólica digestiva es lenta, pero tiene una excelente capacidad de conservar recursos y se ve muy influido por el entorno de la microbiota intestinal.',
    nutrients: ['Alimentos fermentados', 'Prebióticos', 'Manzanilla', 'Verduras orgánicas'],
    exerciseRest: ['Caminatas', 'Yoga a ritmo lento', 'Asegurar 8 horas o más de sueño'],
    diet: 'Dieta centrada en verduras cocidas y calientes, de fácil digestión',
  },
  VGLA: {
    feature:
      'Es un metabolizador de tipo «ola», con una extraordinaria capacidad de circulación sanguínea y linfática. Su capacidad metabólica aeróbica es excelente, por lo que el aporte de oxígeno y la entrega de nutrientes son muy rápidos.',
    nutrients: ['L-arginina', 'Extracto de remolacha', 'Coenzima Q10', 'Vitamina E'],
    exerciseRest: ['Correr', 'Ciclismo', 'Ejercicios para fortalecer la resistencia cardiorrespiratoria'],
    diet: 'Verduras de hoja verde ricas en nitratos y una dieta para la salud vascular',
  },
  VGLS: {
    feature:
      'Es un tipo «guardián» cuya capacidad de vigilancia metabólica e inmunitaria alcanza su máximo durante la noche y la madrugada. La actividad física nocturna y los cambios metabólicos le resultan fáciles, pero puede ser vulnerable a las alteraciones del ritmo circadiano.',
    nutrients: ['Zinc', 'Selenio', 'Vitamina D', 'Ácido alfa lipoico'],
    exerciseRest: ['Entrenamiento en circuito por la noche', 'Mantener un estilo de vida disciplinado'],
    diet: 'Aumentar en la cena la proporción de proteínas de calidad y grasas saludables',
  },
  FITA: {
    feature:
      'Eres un tipo metabólico ahorrador: gastas poca energía y conservas el combustible. Tu circulación y tu depuración intestinal están en buen estado, pero con poco margen de rendimiento eres sensible a los cambios de la hormona suprarrenal (cortisol), por lo que el manejo del estrés y las comidas regulares son la clave de tu metabolismo.',
    nutrients: ['Ashwagandha', 'Vitamina B6', 'Toronja', 'Sal marina sin refinar'],
    exerciseRest: ['Yoga vinyasa', 'Ejercicios de fortalecimiento del core', 'Entrenamiento de técnicas de respiración'],
    diet: 'Comer poco y con frecuencia (pequeñas porciones frecuentes) para estabilizar la glucosa',
  },
  FITS: {
    feature:
      'Es el tipo con predominio parasimpático que presenta una tasa metabólica basal baja y la mayor tendencia a conservar la energía de forma eficiente. Mediante el sueño profundo se producen la eliminación de toxinas del cuerpo y el restablecimiento metabólico.',
    nutrients: ['Extracto de té verde (EGCG)', 'L-carnitina', 'Espirulina', 'Condimentos picantes'],
    exerciseRest: ['Caminata ligera después de comer', 'Baño tibio de medio cuerpo', 'Sueño suficiente de 9 horas o más'],
    diet: 'Dieta caliente con una cantidad adecuada de calorías, sin excesos',
  },
  FILA: {
    feature:
      'Tu rendimiento energético es bajo, pero te mantienes en movimiento durante el día y eliminas desechos mediante la circulación linfática. Estar sentado mucho tiempo acumula hinchazón y fatiga, y las caídas de energía por la tarde son frecuentes, así que moverte a menudo y mantener estable la glucosa es clave.',
    nutrients: ['Verduras ricas en potasio', 'Proteína de calidad', 'Omega-3', 'Magnesio'],
    exerciseRest: ['Caminata rápida·rebote suave', 'Entrenamiento de fuerza del tren inferior', 'Descanso con las piernas elevadas'],
    diet: 'Consumir primero la fibra para prevenir picos de glucosa (Vegetables First)',
  },
  FILS: {
    feature:
      'Tienes un metabolismo conservador que usa la energía con moderación y restaura tu cuerpo durante la noche mediante el sueño profundo y la circulación linfática. Cuando tu sueño se altera, la fatiga y la hinchazón aumentan mucho al día siguiente, y el equilibrio mineral es la clave para mantenerte en buena forma.',
    nutrients: ['Magnesio', 'Minerales ionizados', 'Frutos secos', 'Vitamina E'],
    exerciseRest: ['Pilates con accesorios', 'Yoga de relajación', 'Rutina nocturna tranquila'],
    diet: 'Refrigerios basados en frutos secos saludables como almendras y nueces',
  },
  FGTA: {
    feature:
      'Eres un defensor sólido: un metabolismo ahorrador que tiende a almacenar energía, combinado con una respuesta vascular protectora. Tu barrera intestinal está limpia, pero tardas en pasar al metabolismo de las grasas y las subidas de glucosa tras las comidas pueden sobrecargar tus vasos, así que debes elegir tu dieta con cuidado.',
    nutrients: ['Bioflavonoides cítricos', 'Extracto de hoja de olivo', 'Cromo'],
    exerciseRest: ['Ejercicio aeróbico continuo de baja intensidad y larga duración (Zone 2 Training)'],
    diet: 'Dieta orgánica con menos grasas saturadas y basada en grasas insaturadas',
  },
  FGTS: {
    feature:
      'Es un tipo ahorrador de recursos, con un sistema de conservación extremadamente eficiente. Como su tasa de consumo calórico es baja, comer en exceso puede provocar rápidamente aumento de peso y estancamiento de la circulación sanguínea.',
    nutrients: ['Nutrientes de apoyo a la tiroides (yodo·selenio)', 'Canela', 'Extracto de jengibre'],
    exerciseRest: ['Compresas calientes', 'Gimnasia para calentar el cuerpo', 'Movimiento ligero y regular de todo el cuerpo'],
    diet: 'Ayuno intermitente y alimentos de naturaleza cálida (溫性) que elevan la temperatura corporal',
  },
  FGLA: {
    feature:
      'En tu tipo, un metabolismo ahorrador trabaja junto con una respuesta vascular protectora y la depuración linfática. Eres muy sensible a las toxinas y a los productos de glicación (AGEs), así que adoptar un estilo de vida limpio mejora rápidamente tu metabolismo.',
    nutrients: ['Chlorella', 'Clorofila (Chlorophyll)', 'Vitamina C', 'Proteína vegetal limpia'],
    exerciseRest: ['Senderismo al aire libre', 'Caminatas por el bosque', 'Descanso en contacto con la naturaleza'],
    diet: 'Exclusión total de ultraprocesados y una dieta vital centrada en vegetales',
  },
  FGLS: {
    feature:
      'Eres un tipo "caballero de esmoquin" con un metabolismo muy conservador que depende del sueño y de la circulación linfática nocturna para restaurar tu cuerpo. Sientes el frío con facilidad y tus vasos reaccionan de forma sensible a los estímulos, así que mantenerte abrigado y cuidar tu ritmo de sueño es clave.',
    nutrients: ['Omega-3 en dosis altas', 'Vitamina D3+K2', 'Magnesio', 'Especias que calientan, como jengibre·canela'],
    exerciseRest: ['Cardio suave durante el día', 'Un baño tibio de medio cuerpo', 'Un descanso nocturno bien organizado'],
    diet: 'Una dieta basada en mariscos de calidad, pescado azul y comidas calientes que protegen tus vasos y te ayudan a mantener el calor',
  },
};

export const INTRO: VitaIntroText = {
  matrixSubtitle: 'Guía detallada de los 16 tipos de animales metabólicos personalizados',
  systemIntro:
    'El sistema VITA CODE V8 diferencia con precisión el sistema bioquímico metabólico humano según 4 escalas de mecanismos clave y lo clasifica en un total de 16 tipos metabólicos (16 Metabolic Types). Cada tipo integra la capacidad de producción de energía, la actividad mitocondrial, la flexibilidad del metabolismo de los nutrientes y la reactividad hormonal y del sistema nervioso autónomo, y se representa de forma intuitiva con un símbolo animal.',
  axisY:
    'Eje Y (Metabolic Power / producción de energía): cuanto más arriba, High Power (potente generación de ATP y metabolismo alto); cuanto más abajo, Low Power (baja energía, metabolismo eficiente que ahorra recursos).',
  axisX:
    'Eje X (Fuel Adaptability / flexibilidad de combustible): a la izquierda, Narrow (metabolismo centrado en ciertos nutrientes); a la derecha, Wide (metabolismo libre de carbohidratos·grasas·proteínas).',
  axisDecode: [
    { domain: 'Energía celular', high: 'Vitality · metabolismo alto/termogénico', low: 'Flex-Saver · metabolismo ahorrador' },
    { domain: 'Cardiovascular·Circulación', high: 'Inner-Flow · flujo sanguíneo activo', low: 'Guard-Vessel · protección vascular' },
    { domain: 'Intestino·Hígado·Depuración', high: 'Tidy-Filter · depuración potente', low: 'Lymph-Cleaner · depuración circulatoria' },
    { domain: 'Hormonas·Ritmo', high: 'Active-Day · activo de día', low: 'Serene-Night · sueño nocturno' },
  ],
  steps: [
    {
      title: 'Paso 1 (Identificar la señal)',
      desc: 'Confirme su código de animal metabólico principal y ubique su posición en producción de energía (eje Y) y flexibilidad de combustible (eje X).',
    },
    {
      title: 'Paso 2 (Ajuste nutricional)',
      desc: 'Aplique los nutrientes recomendados y los grupos de alimentos que conviene evitar (p. ej., limitar el azúcar refinado en los tipos High Power, elegir alimentos de naturaleza cálida en los tipos Low Power).',
    },
    {
      title: 'Paso 3 (Adaptación al ritmo circadiano)',
      desc: 'Según sea tipo Day (A) o tipo Night (S), diferencie el horario de ejercicio y las soluciones de sueño.',
    },
  ],
  closing:
    'VITA CODE V8 le propone el combustible y el ritmo óptimos, hechos a la medida de su motor bioquímico único.',
};
