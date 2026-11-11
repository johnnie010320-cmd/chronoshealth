// VITA CODE V8 16 대사 유형 가이드북 en 번역. 원문: ../../guidebook.ts
import type { VitaGuideText, VitaIntroText } from '../types';

export const GUIDES: Record<string, VitaGuideText> = {
  VITA: {
    feature:
      'This is the peak energy-output type, with mitochondrial ATP production at its maximum. Sympathetic-dominant, you burn fat and protein quickly and have a strong warming (thermogenic) effect, but because you rely heavily on certain proteins as fuel, too many processed carbohydrates can easily throw your metabolism off balance.',
    nutrients: ['High-protein lean meats', 'Coconut oil (MCT)', 'B-Complex', 'Magnesium'],
    exerciseRest: ['High-intensity interval training (HIIT)', 'Short, focused workouts', 'Securing calm, restful sleep at night'],
  },
  VITS: {
    feature:
      'You have a high-energy metabolism, but you are a "ruler of the night," with a well-developed nighttime nervous system and melatonin-release axis. Cellular recovery and the release of detox enzymes are most active late at night.',
    nutrients: ['L-Theanine', 'Tryptophan', 'Zinc', 'Antioxidant intake (blueberries·quercetin)'],
    exerciseRest: ['Evening cardio', 'Optimizing your sleep environment with blackout curtains'],
  },
  VILA: {
    feature:
      'You are a flexible energy burner with excellent fluid metabolism and blood circulation. You have outstanding metabolic flexibility, easily turning both carbohydrates and fats into energy.',
    nutrients: ['Omega-3 fatty acids', 'Potassium', 'Hydration', 'Foods for electrolyte balance'],
    exerciseRest: ['Swimming', 'Full-body cardio', 'Circulation care centered on hydration'],
    caution: 'Keep your sodium in check to prevent fluid retention.',
  },
  VILS: {
    feature:
      'You are a high-efficiency burner with a careful, sensitive nervous system. Liver detox and cellular cleansing (autophagy) peak at night, and you may be sensitive to certain chemical additives and sugars.',
    nutrients: ['Milk thistle (silymarin)', 'Glutathione', 'An organic diet', 'Vitamin C'],
    exerciseRest: ['Pilates', 'Stretching', 'A well-structured overnight intermittent fast'],
    caution: 'You are highly sensitive to caffeine, so limit caffeine after 2 p.m.',
  },
  VGTA: {
    feature:
      'This is a "knight" metabolic system with a sturdy build and strong defenses. Your blood vessels and gut barrier are well protected, but your strong tendency to store energy can easily overload your digestive system.',
    nutrients: ['Digestive enzymes', 'Dietary fiber', 'Dietary sulfur (MSM)', 'Probiotics'],
    exerciseRest: ['Heavy weight training', 'Cardio that preserves muscle strength'],
    diet: 'A nutrient-dense, low-calorie diet with strict limits on refined carbohydrates',
  },
  VGTS: {
    feature:
      'You recharge your nervous system and metabolism through calm, long sleep and rest. Your digestive metabolism is slow, but you are excellent at conserving resources, and you are strongly influenced by your gut microbiome.',
    nutrients: ['Fermented foods', 'Prebiotics', 'Chamomile', 'Organic vegetables'],
    exerciseRest: ['Walking', 'Slow-tempo yoga', 'Getting 8 or more hours of sleep'],
    diet: 'A diet built around warm, cooked vegetables that are easy to digest',
  },
  VGLA: {
    feature:
      'You are a "wave" metabolizer with outstanding blood and lymph circulation. Your aerobic metabolism is excellent, so oxygen supply and nutrient delivery happen very quickly.',
    nutrients: ['L-Arginine', 'Beetroot extract', 'Coenzyme Q10', 'Vitamin E'],
    exerciseRest: ['Running', 'Cycling', 'Exercise that builds cardiorespiratory endurance'],
    diet: 'Nitrate-rich leafy greens and a diet for vascular health',
  },
  VGLS: {
    feature:
      'You are a "guardian" type whose metabolic and immune surveillance peaks at night and in the early morning. Nighttime physical activity and metabolic switching come easily to you, but you can be vulnerable to disruptions in your circadian rhythm.',
    nutrients: ['Zinc', 'Selenium', 'Vitamin D', 'Alpha-lipoic acid'],
    exerciseRest: ['Evening circuit training', 'Keeping a disciplined lifestyle'],
    diet: 'Increase the share of quality protein and healthy fats at dinner',
  },
  FITA: {
    feature:
      'You are an energy-saving metabolic type that uses little energy and conserves fuel. Your blood flow and gut cleansing are in good shape, but with little spare output you are sensitive to changes in adrenal cortex hormones (cortisol), so stress management and regular meals are the key to your metabolic rate.',
    nutrients: ['Ashwagandha', 'Vitamin B6', 'Grapefruit', 'Unrefined sea salt'],
    exerciseRest: ['Vinyasa yoga', 'Core-strengthening exercises', 'Breathing technique training'],
    diet: 'Small, frequent meals to keep your blood sugar steady',
  },
  FITS: {
    feature:
      'You are a parasympathetic-dominant type with a low basal metabolic rate and the strongest tendency to conserve energy efficiently. Deep sleep is when your body clears toxins and resets its metabolism.',
    nutrients: ['Green tea extract (EGCG)', 'L-Carnitine', 'Spirulina', 'Spicy seasonings'],
    exerciseRest: ['A light walk after meals', 'A warm half-body bath', 'Getting plenty of sleep, 9 hours or more'],
    diet: 'A warm diet with moderate, not excessive, calories',
  },
  FILA: {
    feature:
      'Your energy output is low, but you keep moving steadily through the day and clear waste through lymph circulation. Sitting for long periods builds up swelling and fatigue, and afternoon energy dips are common, so moving often and keeping blood sugar steady are key.',
    nutrients: ['Potassium-rich vegetables', 'Quality protein', 'Omega-3', 'Magnesium'],
    exerciseRest: ['Brisk walking·light rebounding', 'Lower-body strength training', 'Resting with your legs raised'],
    diet: 'Eat fiber first to prevent blood sugar spikes (Vegetables First)',
  },
  FILS: {
    feature:
      'You have a conserving metabolism that uses energy sparingly and restores your body overnight through deep sleep and lymph circulation. When your sleep is disrupted, fatigue and swelling rise sharply the next day, and mineral balance is the key to staying in good condition.',
    nutrients: ['Magnesium', 'Ionized minerals', 'Nuts', 'Vitamin E'],
    exerciseRest: ['Pilates with small equipment', 'Relaxing yoga', 'A calm evening routine'],
    diet: 'Snacks centered on healthy nuts such as almonds and walnuts',
  },
  FGTA: {
    feature:
      'You are a solid defender: an energy-storing, saving metabolism combined with a protective vascular response. Your gut barrier is clean, but you are slow to switch into fat metabolism and post-meal blood sugar swings can strain your blood vessels, so you need to choose your diet carefully.',
    nutrients: ['Citrus bioflavonoids', 'Olive leaf extract', 'Chromium'],
    exerciseRest: ['Steady, low-intensity, long-duration cardio (Zone 2 Training)'],
    diet: 'An organic diet lower in saturated fat and centered on unsaturated fats',
  },
  FGTS: {
    feature:
      'You are a resource-saving type with an extremely efficient conservation system. Because you burn few calories, overeating can quickly lead to weight gain and sluggish blood circulation.',
    nutrients: ['Thyroid-support nutrients (iodine·selenium)', 'Cinnamon', 'Ginger extract'],
    exerciseRest: ['Warm compresses', 'Body-warming exercises', 'Regular, light full-body movement'],
    diet: 'Intermittent fasting and warming (溫性) foods that raise your body temperature',
  },
  FGLA: {
    feature:
      'In your type, an energy-saving metabolism works together with a protective vascular response and lymphatic detox. You are highly sensitive to toxins and glycation byproducts (AGEs), so adopting a clean lifestyle quickly improves your metabolism.',
    nutrients: ['Chlorella', 'Chlorophyll', 'Vitamin C', 'Clean plant protein'],
    exerciseRest: ['Outdoor trekking', 'Forest walks', 'Restful time in nature'],
    diet: 'Cut out ultra-processed foods completely and enjoy a vibrant, plant-centered diet',
  },
  FGLS: {
    feature:
      'You are a "tuxedo gentleman" type with a deeply conserving metabolism that relies on sleep and lymph circulation overnight to restore your body. You feel the cold easily and your blood vessels react sensitively to stimuli, so keeping warm and protecting your sleep rhythm are key.',
    nutrients: ['High-dose omega-3', 'Vitamin D3+K2', 'Magnesium', 'Warming spices such as ginger·cinnamon'],
    exerciseRest: ['Light daytime cardio', 'A warm half-body bath', 'Well-structured nighttime rest'],
    diet: 'A diet centered on quality seafood, oily fish and warm foods that protect your blood vessels and help keep you warm',
  },
};

export const INTRO: VitaIntroText = {
  matrixSubtitle: 'An In-Depth Guide to the 16 Personalized Metabolic Animal Types',
  systemIntro:
    'The VITA CODE V8 System precisely breaks down the human metabolic biochemistry system along 4 core mechanism scales, classifying it into a total of 16 metabolic types (16 Metabolic Types). Each type combines energy production capacity, mitochondrial activity, nutrient metabolic flexibility, and hormonal and autonomic responsiveness, and is represented intuitively by an animal symbol.',
  axisY:
    'Y-axis (Metabolic Power / energy output): The higher up, the more High Power (strong ATP production and high metabolism); the lower down, the more Low Power (low energy, an efficient resource-saving metabolism).',
  axisX:
    'X-axis (Fuel Adaptability / fuel flexibility): The left side is Narrow (metabolism centered on specific nutrients); the right side is Wide (free metabolism of carbohydrates·fats·proteins).',
  axisDecode: [
    { domain: 'Cellular energy', high: 'Vitality · high metabolism/heat', low: 'Flex-Saver · energy-saving metabolism' },
    { domain: 'Heart·Circulation', high: 'Inner-Flow · active blood flow', low: 'Guard-Vessel · vessel-protecting' },
    { domain: 'Gut·Liver·Detox', high: 'Tidy-Filter · powerful detox', low: 'Lymph-Cleaner · circulatory detox' },
    { domain: 'Hormones·Rhythm', high: 'Active-Day · daytime active', low: 'Serene-Night · nighttime sleep' },
  ],
  steps: [
    {
      title: 'Step 1 (Read your signal)',
      desc: 'Check your core metabolic animal code and find where you sit on energy output (Y-axis) and fuel flexibility (X-axis).',
    },
    {
      title: 'Step 2 (Nutrition matching)',
      desc: 'Apply the recommended nutrients and the food groups to avoid (e.g., limiting refined sugar for High Power types, choosing warming foods for Low Power types).',
    },
    {
      title: 'Step 3 (Circadian rhythm adaptation)',
      desc: 'Tailor your exercise timing and sleep solutions to whether you are a Day (A) type or a Night (S) type.',
    },
  ],
  closing:
    'VITA CODE V8 offers the optimal fuel and rhythm, matched precisely to your own unique biochemical engine.',
};
