import type { Dictionary } from './ko';

export const es: Dictionary = {
  meta: {
    title: 'Chronos Health — Beta',
    description:
      'Medicina preventiva con tus datos de salud. Recibe al instante una estimación de tu edad biológica y riesgos a 5 años.',
  },
  brand: 'Chronos Health',
  beta: 'BETA',
  language: {
    label: 'Idioma',
    ko: '한국어',
    en: 'English',
    ja: '日本語',
    es: 'Español',
  },
  common: {
    back: 'Atrás',
    cancel: 'Cancelar',
    retry: 'Reintentar',
  },
  landing: {
    eyebrow: 'Medicina preventiva · 2026',
    headingLine1: 'Hábitos de hoy,',
    headingLine2: 'una vida más larga.',
    body: 'Estima tu edad biológica y riesgos a 5 años con tus datos médicos y de estilo de vida.',
    howItWorks: '¿Cómo funciona?',
    step1Title: 'Responde 23 preguntas',
    step1Body: 'Hábitos · medidas · antecedentes familiares. 2–3 minutos.',
    step2Title: 'Informe de demostración inmediato',
    step2Body: 'Edad biológica + riesgos clave a 5 años + acciones sugeridas.',
    step3Title: 'Tú controlas tus datos',
    step3Body: 'Almacenamiento y uso para investigación son opcionales. Revocable.',
    disclaimer:
      'Este servicio no sustituye la atención médica. Sólo para referencia de bienestar. Adultos 19+.',
    cta: 'Iniciar encuesta',
  },
  survey: {
    pageTitle: 'Encuesta beta',
    heroTitle: 'Cuéntanos sobre tu salud hoy',
    heroBody:
      '23 preguntas · 2–3 min · Las respuestas no se guardan sin tu consentimiento.',
    section: {
      step: 'STEP',
      demographics: 'Demografía',
      lifestyle: 'Estilo de vida',
      vitals: 'Medidas',
      vitalsHint:
        'Deja en blanco si no lo sabes. La precisión puede disminuir un poco.',
      familyHistory: 'Antecedentes familiares',
      perception: 'Autopercepción',
      consent: 'Consentimiento de datos (opcional)',
    },
    submit: 'Recibir mi informe',
    submitting: 'Calculando…',
    bottomDisclaimer:
      'Este informe no sustituye la atención médica. Sólo para referencia de bienestar.',
    fields: {
      birthYear: { label: 'Año de nacimiento', placeholder: 'ej.: 1990' },
      sex: {
        label: 'Sexo',
        options: { male: 'Hombre', female: 'Mujer', other: 'Otro' },
      },
      heightCm: { label: 'Estatura (cm)', placeholder: 'ej.: 175' },
      weightKg: { label: 'Peso (kg)', placeholder: 'ej.: 70' },
      smoking: {
        label: 'Tabaquismo',
        options: {
          never: 'Nunca',
          former: 'Anterior',
          current: 'Actual',
        },
      },
      alcoholDrinksPerWeek: { label: 'Bebidas alcohólicas por semana' },
      exerciseMinutesPerWeek: { label: 'Minutos de ejercicio por semana' },
      sleepHoursPerNight: { label: 'Horas de sueño por noche' },
      systolicBp: { label: 'Presión sistólica', placeholder: 'ej.: 120' },
      diastolicBp: { label: 'Presión diastólica', placeholder: 'ej.: 80' },
      fastingGlucose: { label: 'Glucosa en ayunas', placeholder: 'ej.: 95' },
      ldlCholesterol: { label: 'Colesterol LDL', placeholder: 'ej.: 110' },
      hdlCholesterol: { label: 'Colesterol HDL', placeholder: 'ej.: 50' },
      familyHistoryDiabetes: { label: 'Antecedente familiar de diabetes' },
      familyHistoryHypertension: { label: 'Antecedente familiar de hipertensión' },
      familyHistoryCardiovascular: {
        label: 'Antecedente familiar de enfermedad cardiovascular',
      },
      stressLevel: {
        label: 'Nivel de estrés',
        options: { low: 'Bajo', medium: 'Medio', high: 'Alto' },
      },
      selfRatedHealth: {
        label: 'Salud autopercibida',
        options: {
          excellent: 'Excelente',
          good: 'Buena',
          fair: 'Regular',
          poor: 'Mala',
        },
      },
      consentToStore: { label: 'Consiento que se almacenen mis respuestas' },
      consentToResearch: {
        label: 'Consiento el uso anonimizado con fines de investigación',
      },
    },
    error: {
      validation: 'Revisa los datos',
      UNAUTHORIZED: 'Autenticación necesaria (token beta).',
      AGE_RESTRICTED: 'Sólo adultos 19+.',
      RATE_LIMITED: 'Límite diario (5) superado.',
      INVALID_INPUT: 'Revisa los datos ingresados.',
      INVALID_JSON: 'Formato de solicitud inválido.',
      generic: 'Error del servidor',
    },
  },
  result: {
    pageTitle: 'Mi informe',
    bioAgeEyebrow: 'Estimación de edad biológica',
    bioAgeUnit: 'años',
    bioAgeDiffPrefix: 'vs. cronológica',
    bioAgeDiffSuffix: 'años',
    bioAgeYearSuffix: 'año',
    bioAgeCi: 'IC 95%',
    contributorsTitle: 'Principales factores',
    diseaseRiskTitle: 'Riesgos clave a 5 años',
    diseaseRiskEmpty: 'No hay riesgos para mostrar.',
    diseaseRiskCategory: {
      low: 'Bajo',
      moderate: 'Moderado',
      high: 'Alto',
    },
    diseaseRisk5yLabel: '5a',
    improvementTitle: 'Acciones sugeridas',
    improvementEmpty:
      'Valores de demostración. Llegarán acciones personalizadas cuando el modelo real esté activo.',
    improvementConfidence: 'Confianza',
    improvementBioAgeUnit: 'edad bio.',
    improvementFactorPrefix: 'Modificable',
    modelLabel: 'Modelo',
    reportIdLabel: 'ID',
    resetCta: 'Reiniciar encuesta',
    hotlines: {
      title: 'Hay ayuda disponible — por favor contacta',
      suicide: 'Prevención del suicidio',
      mentalHealth: 'Crisis de salud mental',
    },
  },
  nav: {
    home: 'Inicio',
    survey: 'Encuesta',
    reports: 'Informes',
    stats: 'Estadísticas',
    profile: 'Perfil',
  },
  userMenu: {
    open: 'Abrir menú',
    login: 'Iniciar sesión',
    loginUnavailable:
      'El inicio de sesión llegará con la verificación de identidad',
    signup: 'Registro',
    profile: 'Mi perfil',
    logout: 'Cerrar sesión',
  },
  comingSoon: {
    title: 'Próximamente',
    body: 'Esta pantalla llegará en una etapa posterior. En esta beta solo funcionan Inicio y Encuesta.',
    backHome: 'Volver al inicio',
  },
  profile: {
    pageTitle: 'Mi perfil',
    sectionAccount: 'Cuenta',
    sectionPrivacy: 'Privacidad / Consentimiento',
    pseudonymLabel: 'ID anónimo',
    expiresAtLabel: 'Sesión expira',
    note: 'Tu nombre, teléfono y correo se guardan en una bóveda de identidad aislada y no se muestran en esta pantalla (ADR 0003).',
    consentMedical: 'Consentimiento de procesamiento de datos de salud',
    consentTerms: 'Consentimiento de términos del servicio',
    consentResearch: 'Consentimiento de uso anónimo en investigación (opcional)',
    consentGrantedAt: 'Otorgado el',
    logout: 'Cerrar sesión',
    logoutConfirm:
      'Cerrar sesión elimina la sesión en este dispositivo. El reinicio de sesión llegará con la verificación de identidad.',
  },
  signup: {
    pageTitle: 'Registro',
    heroTitle: 'Regístrate antes de empezar',
    heroBody:
      'Tu nombre, teléfono y correo se guardan en un almacén de identidad aislado y nunca se comparten fuera del servicio.',
    section: {
      identity: 'Sobre ti',
      consent: 'Consentimiento',
    },
    fields: {
      name: { label: 'Nombre', placeholder: 'Tu nombre' },
      email: { label: 'Correo', placeholder: 'tu@ejemplo.com' },
      phone: { label: 'Teléfono', placeholder: '+34-600-000-000' },
      birthYear: { label: 'Año de nacimiento', placeholder: 'ej.: 1990' },
      sex: {
        label: 'Sexo',
        options: { male: 'Hombre', female: 'Mujer', other: 'Otro' },
      },
    },
    consent: {
      medical: {
        label: 'Procesamiento de datos de salud (obligatorio)',
        description:
          'Acepto que se procesen mi encuesta, mediciones e historial familiar con fines de estimación de riesgo.',
      },
      terms: {
        label: 'Términos del servicio y política de privacidad (obligatorio)',
        description:
          'Acepto los términos del servicio y la política de privacidad.',
      },
    },
    submit: 'Registrarme y empezar',
    submitting: 'Registrando…',
    bottomNote:
      'La verificación de identidad y el inicio de sesión con contraseña llegarán más adelante. Esto es una beta privada.',
    error: {
      validation: 'Revisa los datos',
      AGE_RESTRICTED: 'Debes tener 19+ para registrarte.',
      CONSENT_REQUIRED:
        'Se requieren los consentimientos de datos de salud y términos.',
      IDENTITY_EXISTS:
        'Esta cuenta ya existe. El inicio de sesión en varios dispositivos llegará con la verificación de identidad.',
      RATE_LIMITED: 'Límite diario de registros (10) superado.',
      INVALID_INPUT: 'Revisa los datos ingresados.',
      INVALID_JSON: 'Formato de solicitud inválido.',
      generic: 'Error del servidor',
    },
  },
};
