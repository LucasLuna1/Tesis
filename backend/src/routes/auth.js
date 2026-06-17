const express = require('express');
const router = express.Router();
const { admin } = require('../config/firebase');
const { verifyFirebaseToken } = require('../middleware/auth');
const emailService = require('../services/servicioEmail');

// Solicitar recuperación de contraseña
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email es requerido' });
    }
    
    // Verificar que el usuario existe
    const userRecord = await admin.auth().getUserByEmail(email);
    
    // Generar link de recuperación de contraseña
    const actionCodeSettings = {
      url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password`,
      handleCodeInApp: false,
    };
    
    const resetLink = await admin.auth().generatePasswordResetLink(email, actionCodeSettings);
    
    // Obtener nombre del usuario para personalizar el email
    const userProfile = await admin.firestore().collection('users').doc(userRecord.uid).get();
    const userName = userProfile.exists ? 
      `${userProfile.data().nombre || ''} ${userProfile.data().apellido || ''}`.trim() || 'Usuario' : 
      'Usuario';
    
    // Enviar email de recuperación
    const emailResult = await emailService.sendPasswordResetEmail(email, resetLink, userName);
    
    // Por seguridad, siempre devolvemos éxito aunque el email falle
    res.json({
      message: 'Se ha enviado un email con las instrucciones para restablecer tu contraseña',
      resetLink: process.env.NODE_ENV === 'development' ? resetLink : undefined,
      emailSent: emailResult.success
    });
  } catch (error) {
    if (error.code === 'auth/user-not-found') {
      // Por seguridad, no revelamos si el email existe o no
      res.json({
        message: 'Si el email existe en nuestro sistema, recibirás las instrucciones para restablecer tu contraseña'
      });
    } else {
      console.error('Error en recuperación de contraseña:', error.message);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }
});

// Verificar código de recuperación
router.post('/verify-reset-code', async (req, res) => {
  try {
    const { oobCode } = req.body;
    
    if (!oobCode) {
      return res.status(400).json({ error: 'Código de recuperación es requerido' });
    }
    
    // Verificar el código de recuperación
    const actionCodeInfo = await admin.auth().checkActionCode(oobCode);
    
    res.json({
      valid: true,
      email: actionCodeInfo.data.email,
      operation: actionCodeInfo.operation
    });
  } catch (error) {
    res.status(400).json({ error: 'Código de recuperación inválido o expirado' });
  }
});

// Confirmar nueva contraseña
router.post('/confirm-password-reset', async (req, res) => {
  try {
    const { oobCode, newPassword } = req.body;
    
    if (!oobCode || !newPassword) {
      return res.status(400).json({ error: 'Código y nueva contraseña son requeridos' });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
    }
    
    // Confirmar el restablecimiento de contraseña
    const actionCodeInfo = await admin.auth().verifyPasswordResetCode(oobCode);
    const email = actionCodeInfo.email;
    await admin.auth().updateUser(email, { password: newPassword });
    
    res.json({
      message: 'Contraseña actualizada exitosamente'
    });
  } catch (error) {
    res.status(400).json({ error: 'Error al restablecer la contraseña. El código puede haber expirado.' });
  }
});

// Cambiar contraseña (para usuarios autenticados)
router.post('/change-password', verifyFirebaseToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const uid = req.user?.uid; // Asumiendo que viene del middleware de autenticación
    
    if (!uid) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Contraseña actual y nueva contraseña son requeridas' });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 6 caracteres' });
    }
    
    // Obtener el usuario
    const userRecord = await admin.auth().getUser(uid);
    
    // Actualizar la contraseña
    await admin.auth().updateUser(uid, { password: newPassword });
    
    res.json({
      message: 'Contraseña actualizada exitosamente'
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al cambiar la contraseña' });
  }
});

module.exports = router;
