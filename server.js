require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./src/docs/swagger');
const { connectDB, sequelize } = require('./src/config/database');
const limiter = require('./src/middlewares/rateLimiter');
const animalRoutes = require('./src/routes/animalRoutes');
const authRoutes = require('./src/routes/authRoutes');

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(limiter);

app.use('/api/v1/animales', animalRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.get('/', (req, res) => {
  res.json({
    message: '🦁 Bienvenido a Animaldex API',
    version: 'v1',
    docs: '/api/v1/docs'
  });
});

const PORT = process.env.PORT || 3000;

const start = async () => {
  await connectDB();
  await sequelize.sync({ alter: true });
  console.log('✅ Tablas sincronizadas');
  app.listen(PORT, () => console.log(`🚀 Servidor corriendo en puerto ${PORT}`));
};

start();