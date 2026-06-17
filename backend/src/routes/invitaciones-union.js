/**
 * Rutas para gestión de invitaciones de la Unión
 * Solo usuarios con rol ADMIN (Unión) pueden crear invitaciones
 */

const express = require('express');
const router = express.Router();
const { db } = require('../config/firebase');
const { verifyFirebaseToken, verifyAdmin } = require('../middleware/auth');
const InvitacionUnion = require('../models/InvitacionUnion');

// Crear invitación (solo ADMIN/Unión)
router.post('/', verifyFirebaseToken, verifyAdmin, async (req, res) => {
  try {
    const { tipo, email, nombreCompleto, organizacion, metadata } = req.body;

    if (!email || !nombreCompleto) {
      return res.status(400).json({ error: 'Email y nombre completo son requeridos' });
    }

    // Verificar que no exista una invitación activa para este email
    const invitacionesSnapshot = await db.collection('invitaciones_union')
      .where('email', '==', email)
      .where('estado', '==', 'activa')
      .get();

    if (!invitacionesSnapshot.empty) {
      return res.status(400).json({ 
        error: 'Ya existe una invitación activa para este email' 
      });
    }

    const invitacion = new InvitacionUnion({
      tipo: tipo || 'organizador',
      email,
      nombreCompleto,
      organizacion,
      metadata,
      creadaPor: req.user.uid,
      creadaPorNombre: `${req.user.nombre} ${req.user.apellido}`
    });

    const invitacionRef = await db.collection('invitaciones_union').add(invitacion.toJSON());

    res.status(201).json({
      success: true,
      invitacion: {
        id: invitacionRef.id,
        ...invitacion.toJSON()
      }
    });
  } catch (error) {
    console.error('Error creando invitación:', error);
    res.status(500).json({ error: error.message });
  }
});

// Validar código de invitación (público - para registro)
router.post('/validar', async (req, res) => {
  try {
    const { codigo, email } = req.body;

    if (!codigo) {
      return res.status(400).json({ error: 'Código de invitación requerido' });
    }

    const invitacionesSnapshot = await db.collection('invitaciones_union')
      .where('codigo', '==', codigo)
      .limit(1)
      .get();

    if (invitacionesSnapshot.empty) {
      return res.status(404).json({ 
        error: 'Código de invitación no válido',
        mensaje: 'Usted no tiene permiso para acceder. Solo la Unión puede asignar roles de organizador.'
      });
    }

    const invitacionDoc = invitacionesSnapshot.docs[0];
    const invitacion = new InvitacionUnion({ 
      id: invitacionDoc.id, 
      ...invitacionDoc.data() 
    });

    // Validar que la invitación esté activa
    const validacion = invitacion.esValida();
    if (!validacion.valida) {
      return res.status(403).json({ 
        error: 'Invitación no válida',
        razon: validacion.razon,
        mensaje: 'Usted no tiene permiso para acceder. Solo la Unión puede asignar roles de organizador.'
      });
    }

    // Si se proporciona email, verificar que coincida
    if (email && invitacion.email && invitacion.email !== email) {
      return res.status(403).json({ 
        error: 'Email no autorizado',
        mensaje: 'Esta invitación está asignada a otro usuario.'
      });
    }

    res.json({
      valida: true,
      tipo: invitacion.tipo,
      nombreCompleto: invitacion.nombreCompleto,
      organizacion: invitacion.organizacion,
      email: invitacion.email
    });
  } catch (error) {
    console.error('Error validando invitación:', error);
    res.status(500).json({ error: error.message });
  }
});

// Marcar invitación como usada (interno - llamado durante registro)
router.post('/marcar-usada', async (req, res) => {
  try {
    const { codigo, userId, userEmail } = req.body;

    if (!codigo || !userId || !userEmail) {
      return res.status(400).json({ error: 'Datos incompletos' });
    }

    const invitacionesSnapshot = await db.collection('invitaciones_union')
      .where('codigo', '==', codigo)
      .limit(1)
      .get();

    if (invitacionesSnapshot.empty) {
      return res.status(404).json({ error: 'Invitación no encontrada' });
    }

    const invitacionDoc = invitacionesSnapshot.docs[0];
    const invitacion = new InvitacionUnion({ 
      id: invitacionDoc.id, 
      ...invitacionDoc.data() 
    });

    invitacion.marcarComoUsada(userId, userEmail);

    await db.collection('invitaciones_union')
      .doc(invitacionDoc.id)
      .update(invitacion.toJSON());

    res.json({ success: true });
  } catch (error) {
    console.error('Error marcando invitación como usada:', error);
    res.status(500).json({ error: error.message });
  }
});

// Listar invitaciones (solo ADMIN)
router.get('/', verifyFirebaseToken, verifyAdmin, async (req, res) => {
  try {
    const { estado, tipo } = req.query;
    
    let query = db.collection('invitaciones_union');

    if (estado) {
      query = query.where('estado', '==', estado);
    }

    if (tipo) {
      query = query.where('tipo', '==', tipo);
    }

    const snapshot = await query.orderBy('fechaCreacion', 'desc').get();
    const invitaciones = [];

    snapshot.forEach(doc => {
      invitaciones.push({
        id: doc.id,
        ...doc.data()
      });
    });

    res.json(invitaciones);
  } catch (error) {
    console.error('Error listando invitaciones:', error);
    res.status(500).json({ error: error.message });
  }
});

// Revocar invitación (solo ADMIN)
router.delete('/:id', verifyFirebaseToken, verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const invitacionDoc = await db.collection('invitaciones_union').doc(id).get();

    if (!invitacionDoc.exists) {
      return res.status(404).json({ error: 'Invitación no encontrada' });
    }

    const invitacion = new InvitacionUnion({ 
      id: invitacionDoc.id, 
      ...invitacionDoc.data() 
    });

    invitacion.revocar();

    await db.collection('invitaciones_union').doc(id).update(invitacion.toJSON());

    res.json({ success: true, mensaje: 'Invitación revocada' });
  } catch (error) {
    console.error('Error revocando invitación:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;


