const express = require('express');
const router = express.Router();
const Usercontroller = require('../controllers/UserController');


const { protect } = require('../middlewares/authMiddleware');

router.get('/', Usercontroller.getUsers);
router.post('/', protect, Usercontroller.createUser);
router.put('/:id', Usercontroller.updateUser);
router.get('/:id', protect, Usercontroller.getUserById);
router.delete('/:id', protect, Usercontroller.deleteUser);

module.exports = router;



console.log('/api/origens');  // Adicione esse log
