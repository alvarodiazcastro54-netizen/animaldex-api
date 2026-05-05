const express = require('express');
const router = express.Router();
const { getAnimales, getAnimalById, createAnimal, updateAnimal, deleteAnimal } = require('../controllers/animalController');
const { auth, isAdmin } = require('../middlewares/auth');

router.get('/', getAnimales);
router.get('/:id', getAnimalById);
router.post('/', auth, isAdmin, createAnimal);
router.put('/:id', auth, isAdmin, updateAnimal);
router.delete('/:id', auth, isAdmin, deleteAnimal);

module.exports = router;