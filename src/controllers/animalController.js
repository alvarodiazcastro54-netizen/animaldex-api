const Animal = require('../models/Animal');
const { Op } = require('sequelize');

const getAnimales = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, habitat, dieta, clase, orden: orderParam } = req.query;
    const offset = (page - 1) * limit;
    const where = {};

    if (search) where[Op.or] = [
      { nombre_comun: { [Op.iLike]: `%${search}%` } },
      { nombre_cientifico: { [Op.iLike]: `%${search}%` } }
    ];
    if (habitat) where.habitat = { [Op.iLike]: `%${habitat}%` };
    if (dieta) where.dieta = { [Op.iLike]: `%${dieta}%` };
    if (clase) where.clase = { [Op.iLike]: `%${clase}%` };

    const { count, rows } = await Animal.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['nombre_comun', 'ASC']]
    });

    res.json({
      total: count,
      pagina: parseInt(page),
      total_paginas: Math.ceil(count / limit),
      por_pagina: parseInt(limit),
      datos: rows
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getAnimalById = async (req, res) => {
  try {
    const animal = await Animal.findByPk(req.params.id);
    if (!animal) return res.status(404).json({ error: 'Animal no encontrado' });
    res.json(animal);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const createAnimal = async (req, res) => {
  try {
    const animal = await Animal.create(req.body);
    res.status(201).json(animal);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const updateAnimal = async (req, res) => {
  try {
    const animal = await Animal.findByPk(req.params.id);
    if (!animal) return res.status(404).json({ error: 'Animal no encontrado' });
    await animal.update(req.body);
    res.json(animal);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const deleteAnimal = async (req, res) => {
  try {
    const animal = await Animal.findByPk(req.params.id);
    if (!animal) return res.status(404).json({ error: 'Animal no encontrado' });
    await animal.destroy();
    res.json({ message: 'Animal eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { getAnimales, getAnimalById, createAnimal, updateAnimal, deleteAnimal };