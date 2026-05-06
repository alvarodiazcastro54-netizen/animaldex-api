const express = require('express');
const router = express.Router();
const { getAnimales, getAnimalById, createAnimal, updateAnimal, deleteAnimal } = require('../controllers/animalController');
const { auth, isAdmin } = require('../middlewares/auth');

/**
 * @swagger
 * tags:
 *   name: Animales
 *   description: Endpoints de animales
 */

/**
 * @swagger
 * /animales:
 *   get:
 *     summary: Lista paginada de animales
 *     tags: [Animales]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Número de página
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Resultados por página
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Buscar por nombre común o científico
 *       - in: query
 *         name: clase
 *         schema:
 *           type: string
 *         description: Filtrar por clase (e.g. Mammalia, Aves)
 *       - in: query
 *         name: habitat
 *         schema:
 *           type: string
 *         description: Filtrar por hábitat
 *       - in: query
 *         name: dieta
 *         schema:
 *           type: string
 *         description: Filtrar por dieta
 *     responses:
 *       200:
 *         description: Lista de animales
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total:
 *                   type: integer
 *                 pagina:
 *                   type: integer
 *                 total_paginas:
 *                   type: integer
 *                 por_pagina:
 *                   type: integer
 *                 datos:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Animal'
 */
router.get('/', getAnimales);

/**
 * @swagger
 * /animales/{id}:
 *   get:
 *     summary: Obtener un animal por ID
 *     tags: [Animales]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del animal
 *     responses:
 *       200:
 *         description: Animal encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Animal'
 *       404:
 *         description: Animal no encontrado
 */
router.get('/:id', getAnimalById);

/**
 * @swagger
 * /animales:
 *   post:
 *     summary: Crear un nuevo animal (solo admin)
 *     tags: [Animales]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AnimalInput'
 *     responses:
 *       201:
 *         description: Animal creado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Animal'
 *       400:
 *         description: Error de validación
 *       401:
 *         description: No autenticado
 *       403:
 *         description: No autorizado
 */
router.post('/', auth, isAdmin, createAnimal);

/**
 * @swagger
 * /animales/{id}:
 *   put:
 *     summary: Actualizar un animal (solo admin)
 *     tags: [Animales]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AnimalInput'
 *     responses:
 *       200:
 *         description: Animal actualizado
 *       404:
 *         description: Animal no encontrado
 *       401:
 *         description: No autenticado
 *       403:
 *         description: No autorizado
 */
router.put('/:id', auth, isAdmin, updateAnimal);

/**
 * @swagger
 * /animales/{id}:
 *   delete:
 *     summary: Eliminar un animal (solo admin)
 *     tags: [Animales]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Animal eliminado
 *       404:
 *         description: Animal no encontrado
 *       401:
 *         description: No autenticado
 *       403:
 *         description: No autorizado
 */
router.delete('/:id', auth, isAdmin, deleteAnimal);

/**
 * @swagger
 * components:
 *   schemas:
 *     Animal:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         nombre_comun:
 *           type: string
 *         nombre_cientifico:
 *           type: string
 *         descripcion:
 *           type: string
 *         reino:
 *           type: string
 *         filo:
 *           type: string
 *         clase:
 *           type: string
 *         orden:
 *           type: string
 *         familia:
 *           type: string
 *         genero:
 *           type: string
 *         habitat:
 *           type: string
 *         dieta:
 *           type: string
 *         region:
 *           type: string
 *         estado_conservacion:
 *           type: string
 *         peso_promedio:
 *           type: string
 *         imagen_url:
 *           type: string
 *     AnimalInput:
 *       type: object
 *       required:
 *         - nombre_comun
 *         - nombre_cientifico
 *       properties:
 *         nombre_comun:
 *           type: string
 *           example: León
 *         nombre_cientifico:
 *           type: string
 *           example: Panthera leo
 *         descripcion:
 *           type: string
 *         reino:
 *           type: string
 *           example: Animalia
 *         filo:
 *           type: string
 *           example: Chordata
 *         clase:
 *           type: string
 *           example: Mammalia
 *         orden:
 *           type: string
 *           example: Carnivora
 *         familia:
 *           type: string
 *           example: Felidae
 *         genero:
 *           type: string
 *           example: Panthera
 *         habitat:
 *           type: string
 *         dieta:
 *           type: string
 *         region:
 *           type: string
 *         estado_conservacion:
 *           type: string
 *           example: VU
 *         peso_promedio:
 *           type: string
 *         imagen_url:
 *           type: string
 */

module.exports = router;