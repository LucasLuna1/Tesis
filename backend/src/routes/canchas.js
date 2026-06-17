/**
 * Rutas para gestión de Canchas
 * User Story 1.1: Definir modelos de datos para canchas
 */

const express = require('express');
const router = express.Router();
const { verifyFirebaseToken } = require('../middleware/auth');
const { db } = require('../config/firebase');
const Cancha = require('../models/Cancha');

// Obtener todas las canchas
router.get('/', async (req, res) => {
  try {
    const { ciudad, tipo, superficie, activa } = req.query;
    let query = db.collection('canchas');

    if (ciudad) {
      query = query.where('ciudad', '==', ciudad);
    }

    if (tipo) {
      query = query.where('tipo', '==', tipo);
    }

    if (superficie) {
      query = query.where('superficie', '==', superficie);
    }

    if (activa !== undefined) {
      query = query.where('activa', '==', activa === 'true');
    }

    // 🚀 OPTIMIZACIÓN: Limitar a 50 canchas por defecto
    const limit = parseInt(req.query.limit) || 50;
    query = query.limit(limit);

    const snapshot = await query.orderBy('nombre', 'asc').get();
    const canchas = [];

    snapshot.forEach(doc => {
      canchas.push({ id: doc.id, ...doc.data() });
    });

    res.json(canchas);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obtener cancha por ID
router.get('/:id', async (req, res) => {
  try {
    const canchaId = req.params.id;
    const canchaDoc = await db.collection('canchas').doc(canchaId).get();

    if (!canchaDoc.exists) {
      return res.status(404).json({ error: 'Cancha no encontrada' });
    }

    res.json({ id: canchaId, ...canchaDoc.data() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Crear nueva cancha
router.post('/', verifyFirebaseToken, async (req, res) => {
  try {
    const canchaData = req.body;
    const validacion = Cancha.validate(canchaData);

    if (!validacion.isValid) {
      return res.status(400).json({ 
        error: 'Datos inválidos',
        details: validacion.errors 
      });
    }

    const cancha = new Cancha(canchaData);
    const canchaRef = await db.collection('canchas').add(cancha.toJSON());

    res.status(201).json({
      message: 'Cancha creada correctamente',
      cancha: { id: canchaRef.id, ...cancha.toJSON() }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Actualizar cancha
router.put('/:id', verifyFirebaseToken, async (req, res) => {
  try {
    const canchaId = req.params.id;
    const canchaData = req.body;

    const canchaDoc = await db.collection('canchas').doc(canchaId).get();
    if (!canchaDoc.exists) {
      return res.status(404).json({ error: 'Cancha no encontrada' });
    }

    const validacion = Cancha.validate(canchaData);
    if (!validacion.isValid) {
      return res.status(400).json({ 
        error: 'Datos inválidos',
        details: validacion.errors 
      });
    }

    const cancha = new Cancha({ ...canchaDoc.data(), ...canchaData });
    cancha.fechaActualizacion = new Date();

    await db.collection('canchas').doc(canchaId).update(cancha.toJSON());

    res.json({
      message: 'Cancha actualizada correctamente',
      cancha: cancha.toJSON()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

