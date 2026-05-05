require("dotenv").config();
const axios = require("axios");
const { sequelize } = require("../config/database");
const Animal = require("../models/Animal");
const pLimit = require("p-limit");

const API_BASE_URL = "https://api.gbif.org/v1/species/search";
const PAGE_LIMIT = 300;
const CONCURRENCY_LIMIT = 3; // Bajado para no abusar de GBIF con tantas clases
const RETRY_ATTEMPTS = 5;
const INITIAL_RETRY_DELAY_MS = 1000;

const CLASES = [
  // --- Vertebrados ---
  { nombre: "Mammalia",           classKey: 359, meta: 6000  }, // Mamíferos
  { nombre: "Aves",               classKey: 212, meta: 11000 }, // Aves
  { nombre: "Reptilia",           classKey: 358, meta: 8000  }, // Reptiles
  { nombre: "Amphibia",           classKey: 131, meta: 7000  }, // Anfibios
  { nombre: "Actinopterygii",     classKey: 204, meta: 8000  }, // Peces óseos
  { nombre: "Chondrichthyes",     classKey: 116, meta: 1000  }, // Tiburones/rayas
  { nombre: "Cephalaspidomorphi", classKey: 196, meta: 200   }, // Lampreas

  // --- Invertebrados marinos ---
  { nombre: "Malacostraca",       classKey: 229, meta: 3000  }, // Cangrejos, langostas
  { nombre: "Gastropoda",         classKey: 225, meta: 3000  }, // Caracoles
  { nombre: "Bivalvia",           classKey: 137, meta: 2000  }, // Mejillones, almejas
  { nombre: "Cephalopoda",        classKey: 220, meta: 800   }, // Pulpos, calamares
  { nombre: "Polychaeta",         classKey: 232, meta: 2000  }, // Gusanos marinos

  // --- Artrópodos terrestres ---
  { nombre: "Insecta",            classKey: 216, meta: 8000  }, // Insectos
  { nombre: "Arachnida",          classKey: 367, meta: 3000  }, // Arañas, escorpiones
  { nombre: "Diplopoda",          classKey: 376, meta: 1000  }, // Milpiés
  { nombre: "Chilopoda",          classKey: 377, meta: 500   }, // Ciempiés

  // --- Otros invertebrados ---
  { nombre: "Clitellata",         classKey: 221, meta: 1000  }, // Lombrices
  { nombre: "Echinoidea",         classKey: 193, meta: 800   }, // Erizos de mar
  { nombre: "Asteroidea",         classKey: 192, meta: 800   }, // Estrellas de mar
  { nombre: "Holothuroidea",      classKey: 195, meta: 500   }, // Pepinos de mar
  { nombre: "Hydrozoa",           classKey: 117, meta: 500   }, // Medusas pequeñas
  { nombre: "Anthozoa",           classKey: 108, meta: 1000  }, // Corales, anémonas
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const extractGBIFData = async (params, offset, attempt = 1) => {
  try {
    const response = await axios.get(API_BASE_URL, {
      params: { ...params, limit: PAGE_LIMIT, offset },
      timeout: 15000,
    });
    return {
      results: response.data.results || [],
      endOfRecords: response.data.endOfRecords || false,
    };
  } catch (error) {
    if (error.response) {
      if (error.response.status === 429) {
        console.warn(`   ⏳ Rate limit (429) offset ${offset}. Reintentando... (${attempt}/${RETRY_ATTEMPTS})`);
        if (attempt < RETRY_ATTEMPTS) {
          await sleep(INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt - 1));
          return extractGBIFData(params, offset, attempt + 1);
        } else {
          throw new Error(`❌ Fallo tras ${RETRY_ATTEMPTS} reintentos en offset ${offset}.`);
        }
      } else if (error.response.status === 404) {
        return { results: [], endOfRecords: true };
      } else {
        throw new Error(`❌ Error API ${error.response.status} en offset ${offset}: ${error.message}`);
      }
    } else if (error.request) {
      console.warn(`   ⚠️  Sin respuesta offset ${offset}. Reintentando... (${attempt}/${RETRY_ATTEMPTS})`);
      if (attempt < RETRY_ATTEMPTS) {
        await sleep(INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt - 1));
        return extractGBIFData(params, offset, attempt + 1);
      } else {
        throw new Error(`❌ Fallo tras ${RETRY_ATTEMPTS} reintentos sin respuesta en offset ${offset}.`);
      }
    } else {
      throw new Error(`❌ Error inesperado en offset ${offset}: ${error.message}`);
    }
  }
};

const transformGBIFResultsToAnimal = (results, defaultClass = null) => {
  return results
    .map((r) => ({
      nombre_comun:        r.vernacularName || r.canonicalName || r.scientificName || "Desconocido",
      nombre_cientifico:   r.scientificName || "Desconocido",
      reino:               r.kingdom || "Animalia",
      filo:                r.phylum || null,
      clase:               r.class || defaultClass || null,
      orden:               r.order || null,
      familia:             r.family || null,
      genero:              r.genus || null,
      estado_conservacion: r.threatStatus || null,
      region:              r.publishingCountry || null,
      descripcion:         null,
      imagen_url:          null,
    }))
    .filter(
      (animal) =>
        animal.nombre_cientifico &&
        animal.nombre_cientifico !== "Desconocido" &&
        animal.nombre_cientifico.includes(" ")
    );
};

const loadAnimalsToDatabase = async (animales) => {
  if (animales.length === 0) return;
  await Animal.bulkCreate(animales, {
    updateOnDuplicate: [
      "nombre_comun",
      "reino",
      "filo",
      "clase",
      "orden",
      "familia",
      "genero",
      "estado_conservacion",
      "region",
      "descripcion",
      "imagen_url",
    ],
  });
};

const processAndSaveAnimals = async (gbifParams, logName, meta = Infinity, defaultClass = null) => {
  let offset = 0;
  let totalProcessed = 0;
  let endOfRecords = false;
  const processedScientificNames = new Set();

  while (totalProcessed < meta && !endOfRecords) {
    try {
      const { results, endOfRecords: gbifEndOfRecords } = await extractGBIFData(gbifParams, offset);
      endOfRecords = gbifEndOfRecords;

      if (!results || results.length === 0) {
        console.log(`   ⚠️  ${logName}: Sin resultados para offset ${offset}.`);
        break;
      }

      const newAnimals = transformGBIFResultsToAnimal(results, defaultClass).filter((animal) => {
        if (!processedScientificNames.has(animal.nombre_cientifico)) {
          processedScientificNames.add(animal.nombre_cientifico);
          return true;
        }
        return false;
      });

      await loadAnimalsToDatabase(newAnimals);
      totalProcessed += newAnimals.length;
      offset += PAGE_LIMIT;
      console.log(`   ✅ ${logName}: ${totalProcessed} animales procesados.`);

      await sleep(150);
    } catch (error) {
      console.error(`   ❌ Error en ${logName} offset ${offset}: ${error.message}`);
      break;
    }
  }
  return totalProcessed;
};

const seed = async () => {
  let totalGeneral = 0;
  try {
    await sequelize.authenticate();
    console.log("✅ Conexión a la base de datos establecida.");

    if (process.env.NODE_ENV !== "production") {
      await sequelize.sync({ alter: true });
      console.log("✅ Modelos sincronizados (modo desarrollo).");
      console.log("\n🗑️  Borrando animales actuales...");
      await Animal.destroy({ truncate: true });
      console.log("✅ Tabla limpia\n");
    } else {
      console.log("ℹ️  Producción: no se trunca la tabla.");
    }

    console.log("🌱 Iniciando seeder — meta: ~60,000 animales\n");

    const limit = pLimit(CONCURRENCY_LIMIT);

    // --- Carga por clases ---
    console.log("--- Carga por clases ---");
    const classPromises = CLASES.map((clase) =>
      limit(async () => {
        console.log(`📦 Clase: ${clase.nombre} — meta: ${clase.meta}`);
        const gbifParams = {
          highertaxon_key: clase.classKey,
          status: "ACCEPTED",
          rank: "SPECIES",
        };
        const count = await processAndSaveAnimals(gbifParams, clase.nombre, clase.meta, clase.nombre);
        console.log(`   🎯 ${clase.nombre} completado: ${count} animales.\n`);
        return count;
      })
    );
    const classResults = await Promise.all(classPromises);
    totalGeneral += classResults.reduce((sum, c) => sum + c, 0);

    // --- Términos específicos ---
    console.log("--- Carga por términos específicos ---");
    const specificTerms = [
      { term: "Panthera leo",      meta: 10, logName: "León"            },
      { term: "Tyrannosaurus rex", meta: 10, logName: "Tyrannosaurus"   },
      { term: "Mammuthus",         meta: 20, logName: "Mamut"           },
      { term: "Dodo",              meta: 10, logName: "Dodo"            },
      { term: "Megalodon",         meta: 10, logName: "Megalodón"       },
      { term: "Smilodon",          meta: 10, logName: "Diente de sable" },
    ];

    const termPromises = specificTerms.map((termData) =>
      limit(async () => {
        console.log(`🔍 Buscando: ${termData.logName}`);
        const gbifParams = { q: termData.term, status: "ACCEPTED", rank: "SPECIES" };
        const count = await processAndSaveAnimals(gbifParams, termData.logName, termData.meta);
        console.log(`   🎯 ${termData.logName} completado: ${count} animales.\n`);
        return count;
      })
    );
    const termResults = await Promise.all(termPromises);
    totalGeneral += termResults.reduce((sum, c) => sum + c, 0);

    console.log("🎉 Seeder completado!");
    console.log(`📊 Total animales insertados: ${totalGeneral}`);
  } catch (dbError) {
    console.error("❌ Error crítico:", dbError.message);
    process.exit(1);
  } finally {
    await sequelize.close();
    console.log("🔌 Conexión cerrada.");
    process.exit(0);
  }
};

seed();