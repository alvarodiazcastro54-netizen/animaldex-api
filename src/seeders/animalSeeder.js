require('dotenv').config();
const axios = require('axios');
const { sequelize } = require('../config/database');
const Animal = require('../models/Animal');

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const fetchAnimals = async (offset) => {
  const response = await axios.get('https://api.gbif.org/v1/species/search', {
    params: {
      kingdom: 'Animalia',
      status: 'ACCEPTED',
      rank: 'SPECIES',
      limit: 300,
      offset
    }
  });
  return response.data.results;
};

const seed = async () => {
  await sequelize.authenticate();
  await sequelize.sync({ alter: true });
  console.log('🌱 Iniciando seeder...');

  let offset = 0;
  let total = 0;
  let consecutiveErrors = 0;

  while (total < 50000) {
    try {
      const results = await fetchAnimals(offset);

      if (!results || !results.length) {
        console.log('⚠️  GBIF no devolvió más resultados. Finalizando...');
        break;
      }

      const animales = results.map(r => ({
        nombre_comun: r.vernacularName || r.canonicalName || r.scientificName,
        nombre_cientifico: r.scientificName,
        reino: r.kingdom || 'Animalia',
        filo: r.phylum || null,
        clase: r.class || null,
        orden: r.order || null,
        familia: r.family || null,
        genero: r.genus || null,
        estado_conservacion: r.threatStatus || null,
        region: r.publishingCountry || null
      }));

      await Animal.bulkCreate(animales, { ignoreDuplicates: true });
      total += animales.length;
      offset += 300;
      consecutiveErrors = 0;
      console.log(`✅ Insertados: ${total} animales`);

      // Pequeño delay para no saturar GBIF
      await sleep(200);

    } catch (error) {
      // 404 = GBIF no tiene más páginas disponibles
      if (error.response?.status === 404) {
        console.log('⚠️  GBIF devolvió 404 — no hay más páginas. Finalizando...');
        break;
      }

      // 429 = rate limit — esperamos más tiempo
      if (error.response?.status === 429) {
        console.log('⏳ Rate limit alcanzado. Esperando 5 segundos...');
        await sleep(5000);
        continue; // reintentar el mismo offset
      }

      consecutiveErrors++;
      console.error(`❌ Error en lote offset ${offset}: ${error.message}`);

      // Si hay 3 errores seguidos distintos de 404/429, paramos
      if (consecutiveErrors >= 3) {
        console.log('🛑 Demasiados errores consecutivos. Finalizando...');
        break;
      }

      offset += 300; // saltar lote problemático
    }
  }

  console.log(`\n🎉 Seeder completado!`);
  console.log(`📊 Total animales insertados: ${total}`);
  process.exit(0);
};

seed();