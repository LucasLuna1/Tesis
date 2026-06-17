const express = require('express');
const { db } = require('../config/firebase');
const router = express.Router();

// Middleware de autenticación
const auth = require('../middleware/auth');

// Obtener canchas con coordenadas para mapa
router.get('/canchas', async (req, res) => {
  try {
    const { torneoId, categoria, activas = true } = req.query;
    
    let canchasQuery = db.collection('canchas');
    
    // Filtrar solo canchas activas por defecto
    if (activas === 'true') {
      canchasQuery = canchasQuery.where('activa', '==', true);
    }
    
    const canchasSnapshot = await canchasQuery.get();
    
    let canchas = canchasSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Filtrar solo canchas con coordenadas válidas
    canchas = canchas.filter(cancha => 
      cancha.coordenadas && 
      cancha.coordenadas.latitud !== 0 && 
      cancha.coordenadas.longitud !== 0
    );
    
    // Si se especifica un torneo, obtener canchas usadas en ese torneo
    if (torneoId) {
      const partidosSnapshot = await db.collection('partidos')
        .where('torneoId', '==', torneoId)
        .get();
      
      const canchasUsadas = new Set();
      partidosSnapshot.docs.forEach(doc => {
        const partido = doc.data();
        if (partido.canchaId) {
          canchasUsadas.add(partido.canchaId);
        }
      });
      
      canchas = canchas.filter(cancha => canchasUsadas.has(cancha.id));
    }
    
    // Si se especifica una categoría, filtrar por categoría del torneo
    if (categoria && torneoId) {
      const torneoDoc = await db.collection('torneos').doc(torneoId).get();
      if (torneoDoc.exists) {
        const torneoData = torneoDoc.data();
        if (torneoData.categoria !== categoria) {
          canchas = []; // No mostrar canchas si la categoría no coincide
        }
      }
    }
    
    // Formatear datos para el mapa
    const canchasFormateadas = canchas.map(cancha => ({
      id: cancha.id,
      nombre: cancha.nombre,
      descripcion: cancha.descripcion,
      direccion: cancha.direccion,
      direccionCompleta: cancha.getDireccionCompleta ? cancha.getDireccionCompleta() : `${cancha.direccion}, ${cancha.ciudad}, ${cancha.provincia}`,
      ciudad: cancha.ciudad,
      provincia: cancha.provincia,
      telefono: cancha.telefono,
      email: cancha.email,
      responsable: cancha.responsable,
      tipo: cancha.tipo,
      superficie: cancha.superficie,
      dimensiones: cancha.dimensiones,
      capacidadEspectadores: cancha.capacidadEspectadores,
      servicios: cancha.servicios,
      coordenadas: cancha.coordenadas,
      precioPorHora: cancha.precioPorHora,
      disponible: cancha.disponible,
      mantenimiento: cancha.mantenimiento,
      fechaFinMantenimiento: cancha.fechaFinMantenimiento,
      foto: cancha.foto || null
    }));
    
    res.json({
      success: true,
      message: 'Canchas obtenidas correctamente',
      data: {
        canchas: canchasFormateadas,
        total: canchasFormateadas.length,
        filtros: {
          torneoId: torneoId || null,
          categoria: categoria || null,
          activas: activas === 'true'
        }
      }
    });
    
  } catch (error) {
    console.error('Error obteniendo canchas para mapa:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});

// Obtener canchas de un torneo específico con información adicional
router.get('/torneo/:torneoId/canchas', async (req, res) => {
  try {
    const { torneoId } = req.params;
    
    // Verificar que el torneo existe
    const torneoDoc = await db.collection('torneos').doc(torneoId).get();
    if (!torneoDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Torneo no encontrado'
      });
    }
    
    const torneoData = torneoDoc.data();
    
    // Obtener partidos del torneo
    const partidosSnapshot = await db.collection('partidos')
      .where('torneoId', '==', torneoId)
      .get();
    
    const partidos = partidosSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Obtener IDs de canchas únicas usadas en el torneo
    const canchasIds = [...new Set(partidos.map(p => p.canchaId).filter(Boolean))];
    
    if (canchasIds.length === 0) {
      return res.json({
        success: true,
        message: 'No hay canchas asignadas a este torneo',
        data: {
          canchas: [],
          total: 0,
          torneo: {
            id: torneoData.id,
            nombre: torneoData.nombre,
            categoria: torneoData.categoria
          }
        }
      });
    }
    
    // Obtener información de las canchas
    const canchasSnapshot = await db.collection('canchas')
      .where('__name__', 'in', canchasIds)
      .get();
    
    const canchas = canchasSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Filtrar solo canchas con coordenadas válidas
    const canchasConCoordenadas = canchas.filter(cancha => 
      cancha.coordenadas && 
      cancha.coordenadas.latitud !== 0 && 
      cancha.coordenadas.longitud !== 0
    );
    
    // Agregar información de partidos por cancha
    const canchasConPartidos = canchasConCoordenadas.map(cancha => {
      const partidosCancha = partidos.filter(p => p.canchaId === cancha.id);
      
      return {
        id: cancha.id,
        nombre: cancha.nombre,
        descripcion: cancha.descripcion,
        direccion: cancha.direccion,
        direccionCompleta: `${cancha.direccion}, ${cancha.ciudad}, ${cancha.provincia}`,
        ciudad: cancha.ciudad,
        provincia: cancha.provincia,
        telefono: cancha.telefono,
        email: cancha.email,
        responsable: cancha.responsable,
        tipo: cancha.tipo,
        superficie: cancha.superficie,
        dimensiones: cancha.dimensiones,
        capacidadEspectadores: cancha.capacidadEspectadores,
        servicios: cancha.servicios,
        coordenadas: cancha.coordenadas,
        precioPorHora: cancha.precioPorHora,
        disponible: cancha.disponible,
        mantenimiento: cancha.mantenimiento,
        fechaFinMantenimiento: cancha.fechaFinMantenimiento,
        foto: cancha.foto || null,
        partidos: partidosCancha.length,
        proximosPartidos: partidosCancha
          .filter(p => p.fecha && new Date(p.fecha) > new Date())
          .sort((a, b) => new Date(a.fecha) - new Date(b.fecha))
          .slice(0, 3)
          .map(p => ({
            id: p.id,
            fecha: p.fecha,
            hora: p.horaInicio,
            equipoLocal: p.equipoLocal,
            equipoVisitante: p.equipoVisitante,
            estado: p.estado
          }))
      };
    });
    
    res.json({
      success: true,
      message: 'Canchas del torneo obtenidas correctamente',
      data: {
        canchas: canchasConPartidos,
        total: canchasConPartidos.length,
        torneo: {
          id: torneoData.id,
          nombre: torneoData.nombre,
          categoria: torneoData.categoria,
          estado: torneoData.estado,
          fechaInicio: torneoData.fechaInicio,
          fechaFin: torneoData.fechaFin
        }
      }
    });
    
  } catch (error) {
    console.error('Error obteniendo canchas del torneo:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});

// Obtener estadísticas de canchas por ubicación
router.get('/estadisticas', async (req, res) => {
  try {
    const canchasSnapshot = await db.collection('canchas')
      .where('activa', '==', true)
      .get();
    
    const canchas = canchasSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Estadísticas por provincia
    const porProvincia = {};
    const porCiudad = {};
    const porTipo = {};
    const porSuperficie = {};
    
    let canchasConCoordenadas = 0;
    
    canchas.forEach(cancha => {
      // Por provincia
      if (cancha.provincia) {
        porProvincia[cancha.provincia] = (porProvincia[cancha.provincia] || 0) + 1;
      }
      
      // Por ciudad
      if (cancha.ciudad) {
        const ciudadKey = `${cancha.ciudad}, ${cancha.provincia}`;
        porCiudad[ciudadKey] = (porCiudad[ciudadKey] || 0) + 1;
      }
      
      // Por tipo
      if (cancha.tipo) {
        porTipo[cancha.tipo] = (porTipo[cancha.tipo] || 0) + 1;
      }
      
      // Por superficie
      if (cancha.superficie) {
        porSuperficie[cancha.superficie] = (porSuperficie[cancha.superficie] || 0) + 1;
      }
      
      // Con coordenadas
      if (cancha.coordenadas && cancha.coordenadas.latitud !== 0 && cancha.coordenadas.longitud !== 0) {
        canchasConCoordenadas++;
      }
    });
    
    res.json({
      success: true,
      message: 'Estadísticas de canchas obtenidas correctamente',
      data: {
        resumen: {
          totalCanchas: canchas.length,
          canchasConCoordenadas,
          canchasSinCoordenadas: canchas.length - canchasConCoordenadas
        },
        porProvincia: Object.entries(porProvincia)
          .sort(([,a], [,b]) => b - a),
        porCiudad: Object.entries(porCiudad)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 10),
        porTipo: Object.entries(porTipo)
          .sort(([,a], [,b]) => b - a),
        porSuperficie: Object.entries(porSuperficie)
          .sort(([,a], [,b]) => b - a)
      }
    });
    
  } catch (error) {
    console.error('Error obteniendo estadísticas de canchas:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});

module.exports = router;

