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
      'Es un tipo metabólico inteligente que consume poca energía pero tiene una excelente flexibilidad para convertir recursos. Es sensible a los cambios de las hormonas de la corteza suprarrenal (cortisol), por lo que el manejo del estrés es la clave de su tasa metabólica.',
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
      'Es un tipo «velocista» ágil, con metabolismo de la glucosa y una rápida velocidad de respuesta. Absorbe rápidamente los carbohidratos y quema la energía de inmediato, pero su desgaste físico puede ser pronunciado.',
    nutrients: ['Carbohidratos complejos (avena·camote)', 'Omega-9', 'Vitamina B12'],
    exerciseRest: ['Intervalos de corta distancia', 'Deportes de raqueta', 'Descansos regulares para recargar energía'],
    diet: 'Consumir primero la fibra para prevenir picos de glucosa (Vegetables First)',
  },
  FILS: {
    feature:
      'Es un quemador «joya», con un metabolismo celular ágil y una minuciosa capacidad de distribuir la energía durante la noche. El equilibrio de minerales es la llave para mantener la salud metabólica.',
    nutrients: ['Magnesio', 'Minerales ionizados', 'Frutos secos', 'Vitamina E'],
    exerciseRest: ['Pilates con accesorios', 'Yoga de relajación', 'Rutina nocturna tranquila'],
    diet: 'Refrigerios basados en frutos secos saludables como almendras y nueces',
  },
  FGTA: {
    feature:
      'Es un defensor robusto, con una estructura de membrana celular sólida y una excelente defensa inmunitaria. Su eficiencia para convertir el metabolismo de las grasas es algo lenta, por lo que requiere elegir su dieta con cuidado.',
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
      'Se caracteriza por un sistema circulatorio limpio y una flexibilidad metabólica pura de base vegetal. Su sensibilidad a las toxinas es muy alta, por lo que al aplicar un estilo de vida limpio obtiene una rápida mejora metabólica.',
    nutrients: ['Chlorella', 'Clorofila (Chlorophyll)', 'Vitamina C', 'Proteína vegetal limpia'],
    exerciseRest: ['Senderismo al aire libre', 'Caminatas por el bosque', 'Descanso en contacto con la naturaleza'],
    diet: 'Exclusión total de ultraprocesados y una dieta vital centrada en vegetales',
  },
  FGLS: {
    feature:
      'Es un tipo «caballero de esmoquin», con una excelente adaptación metabólica al frío y a los ambientes de baja temperatura, y una capacidad de termogénesis (Thermogenesis) nocturna singularmente desarrollada.',
    nutrients: ['Omega-3 de alta concentración', 'Vitamina D3+K2', 'Activador de la grasa parda (capsaicina)'],
    exerciseRest: ['Ducha fría/Cold Plunge', 'Ejercicio aeróbico en invierno', 'Descanso nocturno ordenado'],
    diet: 'Dieta de mariscos y pescado azul de calidad, que aumenta la eficiencia en la quema de grasa',
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
