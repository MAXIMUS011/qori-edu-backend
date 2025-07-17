const bcrypt = require('bcryptjs');
const password = 'admin123'; // ¡Esta es la contraseña en texto plano que usarás para iniciar sesión!

bcrypt.hash(password, 10)
    .then(hash => {
        console.log('Contraseña hasheada:', hash);
    })
    .catch(err => {
        console.error('Error al hashear:', err);
    });