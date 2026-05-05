const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Animal = sequelize.define('Animal', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  nombre_comun: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  nombre_cientifico: {
    type: DataTypes.STRING(150),
    allowNull: false,
    unique: true
  },
  descripcion: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  reino: {
    type: DataTypes.STRING(50),
    defaultValue: 'Animalia'
  },
  filo: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  clase: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  orden: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  familia: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  genero: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  habitat: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  dieta: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  region: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  estado_conservacion: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  peso_promedio: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  imagen_url: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'animales',
  timestamps: true
});

module.exports = Animal;