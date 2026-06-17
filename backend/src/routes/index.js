const express = require('express');
const router = express.Router();

// Importar rutas
const authRoutes = require('./auth');
const arbitrosRoutes = require('./arbitros');
const jugadoresRoutes = require('./jugadores');
const equiposRoutes = require('./equipos');
const torneosRoutes = require('./torneos');
const partidosRoutes = require('./partidos');
const partidoLiveRoutes = require('./partido-live');
const canchasRoutes = require('./canchas');
const organizadoresRoutes = require('./organizadores');
const reportesRoutes = require('./reportes');
const validacionesRoutes = require('./validaciones');
const votacionesRoutes = require('./votaciones');
const noticiasRoutes = require('./noticias');
const invitacionesUnionRoutes = require('./invitaciones-union');
const seguimientosRoutes = require('./seguimientos');
const notificacionesRoutes = require('./notificaciones');
const gruposRoutes = require('./grupos');
const usuariosRoutes = require('./usuarios');
const patrocinadoresRoutes = require('./patrocinadores');

// Rutas principales
router.get('/', (req, res) => {
  res.json({ 
    message: 'API Sistema de Torneos',
    version: '1.0.0',
    description: 'Sistema completo de gestión de torneos deportivos',
    userStories: {
      '1.1': 'Modelos de datos para árbitros, equipos, jugadores, canchas y partidos',
      '1.2': 'Registro de partidos con fecha, hora, equipos y cancha',
      '1.3': 'Vinculación de partidos con árbitros principales y asistentes'
    },
    endpoints: {
      auth: '/api/auth',
      arbitros: '/api/arbitros',
      jugadores: '/api/jugadores',
      equipos: '/api/equipos',
      torneos: '/api/torneos',
      partidos: '/api/partidos',
      partidoLive: '/api/partido-live',
      canchas: '/api/canchas',
      organizadores: '/api/organizadores',
      reportes: '/api/reportes',
      validaciones: '/api/validaciones',
      votaciones: '/api/votaciones',
      noticias: '/api/noticias',
      dashboard: '/api/dashboard',
      invitacionesUnion: '/api/invitaciones-union'
    },
    features: {
      arbitros: [
        'Crear partidos',
        'Iniciar/finalizar partidos',
        'Cargar incidencias en tiempo real',
        'Gestionar cronómetro',
        'Finalizar con acta oficial'
      ],
      equipos: [
        'CRUD completo de equipos',
        'Gestión de jugadores',
        'Solicitudes de unirse a equipos',
        'Estadísticas automáticas'
      ],
      torneos: [
        'CRUD completo de torneos',
        'Gestión de equipos',
        'Generación de fixtures',
        'Tabla de posiciones',
        'Solicitudes de participación'
      ],
      partidos: [
        'Crear y gestionar partidos',
        'Control de cronómetro (pausar/reanudar)',
        'Registro de incidencias en tiempo real',
        'Estadísticas de duración'
      ],
      votaciones: [
        'Votar jugador destacado',
        'Estadísticas de votaciones',
        'Verificación de permisos de voto'
      ],
      reportes: [
        'Reporte de partidos',
        'Exportación CSV/JSON',
        'Validación del sistema'
      ],
      noticias: [
        'Crear y publicar noticias',
        'Gestión de noticias destacadas',
        'Subida de imágenes',
        'Sistema de categorías y etiquetas'
      ]
    }
  });
});

// Usar las rutas
router.use('/auth', authRoutes);
router.use('/arbitros', arbitrosRoutes);
router.use('/jugadores', jugadoresRoutes);
router.use('/equipos', equiposRoutes);
router.use('/torneos', torneosRoutes);
router.use('/partidos', partidosRoutes);
router.use('/partido-live', partidoLiveRoutes);
router.use('/canchas', canchasRoutes);
router.use('/organizadores', organizadoresRoutes);
router.use('/reportes', reportesRoutes);
router.use('/validaciones', validacionesRoutes);
router.use('/votaciones', votacionesRoutes);
router.use('/noticias', noticiasRoutes);
router.use('/invitaciones-union', invitacionesUnionRoutes);
router.use('/seguimientos', seguimientosRoutes);
router.use('/notificaciones', notificacionesRoutes);
router.use('/grupos', gruposRoutes);
router.use('/usuarios', usuariosRoutes);
router.use('/patrocinadores', patrocinadoresRoutes);

module.exports = router;
