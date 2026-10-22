"use strict";
/* Motor de entrenamiento y nutrición (se ejecuta en el navegador; también corre en Node para pruebas). */
const OBJETIVOS = {
  perder_grasa: {
    nombre: "Perder grasa",
    desc: "Bajar % de grasa conservando músculo.",
    icono: "bolt",
  },
  ganar_musculo: {
    nombre: "Ganar músculo",
    desc: "Aumentar masa muscular (hipertrofia).",
    icono: "dumbbell",
  },
  recomposicion: {
    nombre: "Recomposición corporal",
    desc: "Perder grasa y ganar músculo a la vez.",
    icono: "swap",
  },
  fuerza: {
    nombre: "Ganar fuerza",
    desc: "Levantar más peso en los básicos.",
    icono: "shield",
  },
  resistencia: {
    nombre: "Resistencia y condición",
    desc: "Mejorar capacidad cardiovascular.",
    icono: "refresh",
  },
  salud: {
    nombre: "Salud y movilidad",
    desc: "Moverte mejor y sentirte bien.",
    icono: "check",
  },
};
const NIVELES = {
  principiante: "Principiante",
  intermedio: "Intermedio",
  avanzado: "Avanzado",
};
const DIAS_SEMANA = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
];

function imc(pesoKg, estaturaCm) {
  const m = estaturaCm / 100;
  return m > 0 ? Math.round((pesoKg / (m * m)) * 10) / 10 : null;
}
function categoriaIMC(v, edad) {
  if (v == null) return { txt: "—", cls: "mute" };
  if (edad < 18)
    return {
      txt: "Menor de edad: se interpreta con percentiles OMS",
      cls: "mute",
    };
  if (v < 18.5) return { txt: "Bajo peso", cls: "warn" };
  if (v < 25) return { txt: "Peso normal", cls: "ok" };
  if (v < 30) return { txt: "Sobrepeso", cls: "warn" };
  return { txt: "Obesidad", cls: "bad" };
}

const BANCO = {
  empuje_h: [
    "Press de pecho en máquina",
    "Press de banca con mancuernas",
    "Press de banca con barra",
    "Press de pecho en máquina",
  ],
  empuje_inc: [
    "Press inclinado en máquina",
    "Press inclinado con mancuernas",
    "Press inclinado con barra",
  ],
  empuje_v: [
    "Press de hombro en máquina",
    "Press militar con mancuernas",
    "Press militar con barra",
    "Press de hombro en máquina",
  ],
  tiron_v: [
    "Jalón al pecho en polea",
    "Dominadas asistidas",
    "Dominadas",
    "Jalón al pecho en polea",
  ],
  tiron_h: [
    "Remo sentado en polea",
    "Remo con mancuerna a una mano",
    "Remo con barra",
    "Remo sentado en polea",
  ],
  lateral: [
    "Elevaciones laterales con mancuerna",
    "Elevaciones laterales con mancuerna",
    "Elevaciones laterales en polea",
  ],
  pecho_ais: [
    "Aperturas en peck deck",
    "Aperturas en polea",
    "Aperturas con mancuernas",
  ],
  posterior: [
    "Face pull en polea",
    "Face pull en polea",
    "Pájaros con mancuerna",
  ],
  triceps: [
    "Extensión de tríceps en polea",
    "Extensión de tríceps en polea",
    "Press francés con barra Z",
  ],
  biceps: ["Curl de bíceps con mancuernas", "Curl martillo", "Curl con barra"],
  cuadriceps: [
    "Prensa de pierna",
    "Sentadilla goblet",
    "Sentadilla con barra",
    "Prensa de pierna",
  ],
  bisagra: [
    "Peso muerto rumano con mancuernas",
    "Peso muerto rumano con barra",
    "Peso muerto convencional",
    "Peso muerto rumano con mancuernas",
  ],
  gluteo: ["Puente de glúteo", "Hip thrust con barra", "Hip thrust con barra"],
  unilateral: [
    "Zancadas asistidas",
    "Zancadas con mancuernas",
    "Sentadilla búlgara",
    "Step-up a cajón bajo",
  ],
  ext_pierna: [
    "Extensión de pierna en máquina",
    "Extensión de pierna en máquina",
    "Extensión de pierna en máquina",
  ],
  femoral: [
    "Curl femoral acostado",
    "Curl femoral acostado",
    "Curl femoral sentado",
  ],
  pantorrilla: [
    "Elevación de talones de pie",
    "Elevación de talones en prensa",
    "Elevación de talones con barra",
  ],
  core: ["Plancha frontal", "Dead bug", "Rueda abdominal", "Plancha frontal"],
  core2: [
    "Plancha lateral",
    "Pallof press en polea",
    "Elevación de piernas colgado",
    "Bird dog",
  ],
};
const GRUPOS = {
  superior: {
    enfoque: "Tren superior",
    patrones: [
      "empuje_h",
      "tiron_v",
      "empuje_v",
      "tiron_h",
      "lateral",
      "biceps",
      "triceps",
    ],
  },
  inferior: {
    enfoque: "Tren inferior",
    patrones: [
      "cuadriceps",
      "bisagra",
      "unilateral",
      "femoral",
      "gluteo",
      "pantorrilla",
      "core",
    ],
  },
  empuje: {
    enfoque: "Tren superior · Empuje",
    patrones: [
      "empuje_h",
      "empuje_v",
      "empuje_inc",
      "lateral",
      "pecho_ais",
      "triceps",
    ],
  },
  tiron: {
    enfoque: "Tren superior · Tirón",
    patrones: ["tiron_v", "tiron_h", "posterior", "biceps", "core2"],
  },
  pierna: {
    enfoque: "Tren inferior · Pierna",
    patrones: [
      "cuadriceps",
      "bisagra",
      "unilateral",
      "ext_pierna",
      "femoral",
      "pantorrilla",
    ],
  },
  inferior_core: {
    enfoque: "Tren inferior · Glúteo y core",
    patrones: ["bisagra", "gluteo", "unilateral", "femoral", "core", "core2"],
  },
  full_a: {
    enfoque: "Cuerpo completo A",
    patrones: [
      "cuadriceps",
      "empuje_h",
      "tiron_v",
      "bisagra",
      "lateral",
      "core",
    ],
  },
  full_b: {
    enfoque: "Cuerpo completo B",
    patrones: [
      "bisagra",
      "empuje_v",
      "tiron_h",
      "unilateral",
      "triceps",
      "core2",
    ],
  },
};
const SPLITS = {
  3: ["full_a", null, "full_b", null, "full_a", null, null],
  4: ["superior", "inferior", null, "superior", "inferior", null, null],
  5: ["empuje", "pierna", "tiron", null, "superior", "inferior_core", null],
  6: ["empuje", "tiron", "pierna", "empuje", "tiron", "pierna", null],
};
const PRESCRIPCION = {
  ganar_musculo: {
    sc: 4,
    sa: 3,
    rc: "8-10",
    ra: "10-12",
    dc: 90,
    da: 60,
    cardio: "Cardio suave 10 min (calentamiento)",
  },
  fuerza: {
    sc: 5,
    sa: 3,
    rc: "4-6",
    ra: "8-10",
    dc: 150,
    da: 90,
    cardio: "Movilidad 10 min antes de entrenar",
  },
  perder_grasa: {
    sc: 3,
    sa: 3,
    rc: "10-12",
    ra: "12-15",
    dc: 60,
    da: 45,
    cardio: "Cardio por intervalos 20-25 min al final",
  },
  recomposicion: {
    sc: 4,
    sa: 3,
    rc: "8-12",
    ra: "12-15",
    dc: 75,
    da: 60,
    cardio: "Cardio moderado 15-20 min al final",
  },
  resistencia: {
    sc: 3,
    sa: 2,
    rc: "12-15",
    ra: "15-20",
    dc: 45,
    da: 30,
    cardio: "Cardio continuo 30 min",
  },
  salud: {
    sc: 3,
    sa: 2,
    rc: "10-12",
    ra: "12-15",
    dc: 60,
    da: 45,
    cardio: "Caminata o bici 20 min + movilidad 10 min",
  },
};
const COMPUESTOS = new Set([
  "empuje_h",
  "empuje_inc",
  "empuje_v",
  "tiron_v",
  "tiron_h",
  "cuadriceps",
  "bisagra",
  "unilateral",
  "gluteo",
]);

function generarPlan({ objetivo, nivel, dias, edad, sexo, peso, estatura }) {
  dias = Math.min(6, Math.max(3, +dias || 3));
  const P = { ...(PRESCRIPCION[objetivo] || PRESCRIPCION.salud) };
  const nIdx = { principiante: 0, intermedio: 1, avanzado: 2 }[nivel] ?? 0;
  const mayor50 = edad >= 50,
    menor = edad < 18;
  const notas = [];
  if (menor) {
    if (objetivo === "fuerza") {
      P.rc = "6-8";
      P.dc = 120;
    }
    P.sc = Math.min(P.sc, 3);
    notas.push(
      "Menor de edad: prioriza técnica y entrena siempre con supervisión de un coach. Evita cargas máximas.",
    );
  }
  if (mayor50) {
    P.sc = Math.min(P.sc, 3);
    if (P.rc === "4-6") P.rc = "6-8";
    notas.push(
      "50+ años: se usan variantes guiadas y de bajo impacto; agrega 10 min de movilidad y equilibrio.",
    );
  }
  if (nivel === "principiante") {
    P.sc = Math.max(2, P.sc - 1);
    P.sa = Math.max(2, P.sa - 1);
    notas.push(
      "Principiante: las primeras 2 semanas usa un peso con el que te sobren 3 repeticiones.",
    );
  }
  const imcV = imc(peso, estatura);
  if (imcV >= 30 && !menor)
    notas.push(
      "IMC ≥ 30: se evita el impacto (saltos, carrera) para cuidar articulaciones; el cardio es en bici o elíptica.",
    );
  const nEj = [4, 5, 6][nIdx];
  const variante = (patron) => {
    const v = BANCO[patron];
    return mayor50 && v[3] ? v[3] : v[Math.min(nIdx, v.length - 1)];
  };

  const semana = SPLITS[dias].map((g, i) => {
    if (!g) {
      const activo =
        ["perder_grasa", "resistencia", "salud"].includes(objetivo) && i === 5;
      return {
        dia: DIAS_SEMANA[i],
        descanso: true,
        enfoque: activo ? "Descanso activo" : "Descanso",
        nota: activo
          ? imcV >= 30
            ? "Opcional: 30-40 min de bici o caminata a ritmo cómodo."
            : "Opcional: 30-40 min de caminata, bici o natación a ritmo cómodo."
          : "Recupera: duerme 7-9 h e hidrátate.",
        ejercicios: [],
      };
    }
    const G = GRUPOS[g];
    const ejercicios = G.patrones.slice(0, nEj).map((pt) => {
      const comp = COMPUESTOS.has(pt);
      const esCore = pt.startsWith("core");
      return {
        nombre: variante(pt),
        series: comp ? P.sc : P.sa,
        reps: esCore
          ? pt === "core" && nIdx < 2
            ? "30-45 s"
            : "10-12"
          : comp
            ? P.rc
            : P.ra,
        descanso: comp ? P.dc : P.da,
        tipo: comp ? "Compuesto" : esCore ? "Core" : "Accesorio",
      };
    });
    const series = ejercicios.reduce((s, e) => s + e.series, 0);
    const min =
      Math.round(((series * (P.dc + 45)) / 60) * 0.8) +
      (/(\d+)-?(\d+)? min/.test(P.cardio) ? +P.cardio.match(/(\d+)/)[1] : 10);
    return {
      dia: DIAS_SEMANA[i],
      descanso: false,
      enfoque: G.enfoque,
      cardio: P.cardio,
      minutos: min,
      ejercicios,
    };
  });
  return {
    nombre: `${OBJETIVOS[objetivo]?.nombre || "Plan"} · ${dias} días`,
    objetivo,
    nivel,
    diasEntreno: dias,
    semana: semana.filter((d) => !d.descanso),
    semanaCompleta: semana,
    notas,
    progresion:
      objetivo === "fuerza"
        ? "Cuando completes todas las series con buena técnica, sube 2.5 kg en tren inferior y 1-2.5 kg en superior."
        : "Cuando llegues al tope del rango de repeticiones en todas las series, sube el peso 2.5-5% la siguiente sesión.",
  };
}

const FACTOR_ACT = { 3: 1.375, 4: 1.45, 5: 1.55, 6: 1.65 };
const AJUSTE = {
  perder_grasa: -0.2,
  ganar_musculo: 0.1,
  recomposicion: -0.08,
  fuerza: 0.05,
  resistencia: 0,
  salud: 0,
};
const PROT_GKG = {
  perder_grasa: 2.0,
  ganar_musculo: 1.8,
  recomposicion: 2.0,
  fuerza: 1.8,
  resistencia: 1.4,
  salud: 1.2,
};
const EQ = {
  verdura: [25, 2, 4, 0],
  fruta: [60, 0, 15, 0],
  cereal: [70, 2, 15, 0],
  leguminosa: [120, 8, 20, 1],
  proteina: [55, 7, 0, 3],
  leche: [95, 9, 12, 2],
  grasa: [45, 0, 0, 5],
};
const EJEMPLOS = {
  cereal:
    "1 tortilla de maíz · ⅓ taza de arroz · ½ pan integral · ⅓ taza de avena",
  proteina:
    "1 huevo · 30 g de pechuga de pollo · 30 g de pescado · 40 g de queso panela",
  leguminosa: "½ taza de frijoles, lentejas o garbanzos",
  verdura:
    "1 taza de verdura cruda o ½ taza cocida (nopales, calabacita, brócoli, jitomate)",
  fruta: "1 manzana · 1 plátano chico · 1 taza de papaya o melón",
  leche: "1 taza de leche descremada · ¾ taza de yogur natural",
  grasa: "⅓ de aguacate · 1 cdita de aceite · 10 almendras",
};
const COMIDAS = [
  {
    nombre: "Desayuno",
    hora: "07:30",
    pct: 0.25,
    ejemplo: "Huevos a la mexicana con tortillas, papaya y café sin azúcar",
  },
  {
    nombre: "Colación AM",
    hora: "11:00",
    pct: 0.1,
    ejemplo: "Yogur natural con fruta y almendras",
  },
  {
    nombre: "Comida",
    hora: "14:30",
    pct: 0.35,
    ejemplo: "Pechuga asada, arroz, frijoles, ensalada de nopales y aguacate",
  },
  {
    nombre: "Colación PM",
    hora: "18:00",
    pct: 0.1,
    ejemplo:
      "Fruta + puño de cacahuates o licuado de leche con plátano (post-entreno)",
  },
  {
    nombre: "Cena",
    hora: "21:00",
    pct: 0.2,
    ejemplo: "Tostadas horneadas de atún o pollo con verdura y aguacate",
  },
];
function planNutricional({ objetivo, edad, sexo, peso, estatura, dias }) {
  if (edad < 18) return { menor: true };
  const base = 10 * peso + 6.25 * estatura - 5 * edad;
  const tmb = Math.round(
    sexo === "HOMBRE" ? base + 5 : sexo === "MUJER" ? base - 161 : base - 78,
  );
  const gasto = Math.round(tmb * (FACTOR_ACT[dias] || 1.375));
  const piso = sexo === "HOMBRE" ? 1500 : 1200;
  let kcal = Math.round((gasto * (1 + (AJUSTE[objetivo] ?? 0))) / 10) * 10;
  const limitado = kcal < piso;
  kcal = Math.max(kcal, piso, tmb);
  const prot = Math.round(peso * (PROT_GKG[objetivo] ?? 1.4));
  const grasa = Math.round((kcal * 0.27) / 9);
  const carb = Math.max(0, Math.round((kcal - prot * 4 - grasa * 9) / 4));
  const e = {
    verdura: 5,
    fruta: objetivo === "perder_grasa" ? 2 : 3,
    leguminosa: 1,
    leche: objetivo === "ganar_musculo" ? 2 : 1,
  };
  const suma = (k) =>
    Object.entries(e).reduce((s, [g, n]) => s + EQ[g][k] * n, 0);
  e.proteina = Math.max(
    4,
    Math.round((prot - suma(1) - 2 * 4) / EQ.proteina[1]),
  );
  e.cereal = Math.max(3, Math.round((carb - suma(2)) / EQ.cereal[2]));
  e.grasa = Math.max(2, Math.round((grasa - suma(3)) / EQ.grasa[3]));
  const reparto = COMIDAS.map((c) => ({
    ...c,
    kcal: Math.round((kcal * c.pct) / 10) * 10,
    eq: Object.fromEntries(
      Object.entries(e)
        .map(([g, n]) => [g, Math.round(n * c.pct * 2) / 2])
        .filter(([, n]) => n > 0),
    ),
  }));
  const agua = Math.round((peso * 35) / 100) / 10 + (dias >= 5 ? 0.5 : 0);
  return {
    tmb,
    gasto,
    kcal,
    prot,
    grasa,
    carb,
    limitado,
    eqDia: e,
    comidas: reparto,
    agua,
    tips:
      {
        perder_grasa: [
          "Déficit moderado (≈20%) para no perder músculo.",
          "Proteína en cada comida.",
          "Prioriza verduras y fibra para controlar el hambre.",
        ],
        ganar_musculo: [
          "Superávit ligero (≈10%): sube 0.25-0.5 kg por semana.",
          "Reparte la proteína en 4-5 tomas.",
          "Carbohidrato antes y después de entrenar.",
        ],
        recomposicion: [
          "Déficit pequeño con proteína alta.",
          "Mantén el entrenamiento de fuerza: es lo que conserva el músculo.",
          "Mide progreso con % de grasa y músculo, no solo con el peso.",
        ],
        fuerza: [
          "Come suficiente: comer poco frena la fuerza.",
          "Carbohidrato complejo en la comida previa al entreno.",
          "Duerme 7-9 h.",
        ],
        resistencia: [
          "Los carbohidratos son tu combustible principal.",
          "Hidrátate antes, durante y después.",
          "Electrolitos en sesiones de más de 60 min.",
        ],
        salud: [
          "Plato del bien comer: ½ verduras, ¼ proteína, ¼ cereal integral.",
          "Limita azúcares y ultraprocesados.",
          "Agua simple como bebida principal.",
        ],
      }[objetivo] || [],
  };
}
if (typeof module !== "undefined")
  module.exports = {
    OBJETIVOS,
    NIVELES,
    DIAS_SEMANA,
    imc,
    categoriaIMC,
    generarPlan,
    planNutricional,
    COMIDAS,
    EJEMPLOS,
  };
