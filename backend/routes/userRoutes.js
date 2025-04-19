const express = require('express');
const router = express.Router();
const Usercontroller = require('../controllers/UserController');

router.get('/', Usercontroller.getUsers);
router.post('/', Usercontroller.createUser);
router.put('/:id', Usercontroller.updateUser);
router.get('/:id', Usercontroller.getUserById);
router.delete('/:id', Usercontroller.deleteUser);

module.exports = router;



console.log('/api/origens');  // Adicione esse log
