const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const compression = require('compression');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares de optimización
app.use(compression()); // Comprimir respuestas
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: false // Permitir carga de recursos cross-origin
}));
// Configurar CORS para múltiples orígenes
const allowedOrigins = process.env.CORS_ORIGIN 
  ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim())
  : ['http://localhost:3000'];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
      return callback(null, true);
    }
    console.log('❌ CORS blocked origin:', origin);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos (logos de equipos, fotos de jugadores, etc.)
const staticOptions = {
  maxAge: '1d',
  etag: true,
  lastModified: true
};

app.use('/uploads', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
}, express.static(path.join(__dirname, '../uploads'), staticOptions));

// Rutas
app.get('/', (req, res) => {
  res.json({ message: 'API del Sistema de Torneos funcionando correctamente' });
});

// 🚀 OPTIMIZACIÓN: Health check rápido y ligero para Render
app.get('/health', (req, res) => {
  // Respuesta mínima y rápida - solo lo necesario para Render
  res.status(200).send('OK');
});

// Readiness check más completo (opcional)
app.get('/ready', (req, res) => {
  res.status(200).json({ 
    status: 'ready', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Importar rutas
const routes = {
  auth: require('./routes/auth'),
  arbitros: require('./routes/arbitros'),
  jugadores: require('./routes/jugadores'),
  torneos: require('./routes/torneos'),
  partidos: require('./routes/partidos'),
  partidoLive: require('./routes/partido-live'),
  organizadores: require('./routes/organizadores'),
  managers: require('./routes/managers'),
  equipos: require('./routes/equipos'),
  canchas: require('./routes/canchas'),
  index: require('./routes'),
  dashboard: require('./routes/dashboard'),
  reportes: require('./routes/reportes'),
  validaciones: require('./routes/validaciones'),
  votaciones: require('./routes/votaciones'),
  mapas: require('./routes/mapas'),
  noticias: require('./routes/noticias'),
  invitacionesUnion: require('./routes/invitaciones-union'),
  seguimientos: require('./routes/seguimientos'),
  torneosEstadisticas: require('./routes/torneos-estadisticas'),
  patrocinadores: require('./routes/patrocinadores')
};

// Configuración de rutas
const routeConfig = [
  { path: '/api', handler: routes.index },
  { path: '/api/auth', handler: routes.auth },
  { path: '/api/arbitros', handler: routes.arbitros },
  { path: '/api/jugadores', handler: routes.jugadores },
  { path: '/api/torneos', handler: routes.torneos },
  { path: '/api/partidos', handler: routes.partidos },
  { path: '/api/partido-live', handler: routes.partidoLive },
  { path: '/api/organizadores', handler: routes.organizadores },
  { path: '/api/managers', handler: routes.managers },
  { path: '/api/equipos', handler: routes.equipos },
  { path: '/api/canchas', handler: routes.canchas },
  { path: '/api/reportes', handler: routes.reportes },
  { path: '/api/validaciones', handler: routes.validaciones },
  { path: '/api/votos', handler: routes.votaciones },
  { path: '/api/mapas', handler: routes.mapas },
  { path: '/api/dashboard', handler: routes.dashboard },
  { path: '/api/noticias', handler: routes.noticias },
  { path: '/api/invitaciones-union', handler: routes.invitacionesUnion },
  { path: '/api/seguimientos', handler: routes.seguimientos },
  { path: '/api/patrocinadores', handler: routes.patrocinadores }
];

// Registrar rutas
routeConfig.forEach(({ path, handler }) => {
  app.use(path, handler);
});

// Ruta dinámica para estadísticas de torneos
app.use('/api/torneos/:torneoId/estadisticas', routes.torneosEstadisticas);

// Manejo de errores mejorado
app.use((err, req, res, next) => {
  console.error('❌ Error en servidor:', err);
  
  // Error específico de Firebase
  if (err.code === 'permission-denied') {
    return res.status(403).json({ 
      error: 'Permisos insuficientes',
      details: 'No tienes permisos para realizar esta acción'
    });
  }
  
  // Error de validación
  if (err.name === 'ValidationError') {
    return res.status(400).json({ 
      error: 'Datos inválidos',
      details: err.message
    });
  }
  
  // Error de base de datos
  if (err.code && err.code.startsWith('firebase/')) {
    return res.status(500).json({ 
      error: 'Error de base de datos',
      details: 'Problema temporal con la base de datos'
    });
  }
  
  // Error genérico
  res.status(500).json({ 
    error: 'Error interno del servidor',
    details: process.env.NODE_ENV === 'development' ? err.message : 'Algo salió mal'
  });
});

// 404
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// Escuchar en el puerto asignado
// 🚀 OPTIMIZACIÓN: Iniciar servidor de forma más rápida
const server = app.listen(PORT, () => {
  console.log(`🚀 Servidor ejecutándose en puerto ${PORT}`);
  
  // 🚀 OPTIMIZACIÓN: Limpiar caché periódicamente en producción
  if (process.env.NODE_ENV === 'production') {
    const cacheService = require('./services/CacheService');
    // Limpiar caché cada 10 minutos
    setInterval(() => {
      cacheService.clearExpired();
    }, 600000);
  }
});

// 🚀 OPTIMIZACIÓN: Manejo de señales para shutdown graceful
process.on('SIGTERM', () => {
  console.log('SIGTERM recibido, cerrando servidor...');
  server.close(() => {
    console.log('Servidor cerrado');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT recibido, cerrando servidor...');
  server.close(() => {
    console.log('Servidor cerrado');
    process.exit(0);
  });
});

module.exports = app;