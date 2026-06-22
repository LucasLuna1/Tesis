import { asText } from '../../utils/text';
import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  TextField,
  InputAdornment,
  Grid,
  Card,
  CardContent,
  CardMedia,
  CardActions,
  Button,
  CircularProgress,
  Alert,
  Chip,
  Avatar,
  Paper
} from '@mui/material';
import {
  Search,
  Groups,
  LocationOn,
  Person,
  ArrowBack
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { getImageUrl } from '../../services/api';
import api from '../../services/api';
import toast from 'react-hot-toast';

const BuscarClub: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [clubes, setClubes] = useState<any[]>([]);
  const [filteredClubes, setFilteredClubes] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    cargarClubes();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredClubes(clubes);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = clubes.filter(club => 
        club.nombre.toLowerCase().includes(query) ||
        club.ciudad?.toLowerCase().includes(query) ||
        club.descripcion?.toLowerCase().includes(query)
      );
      setFilteredClubes(filtered);
    }
  }, [searchQuery, clubes]);

  const cargarClubes = async () => {
    try {
      setLoading(true);
      
      // Cargar desde la colección "equipos"
      const equiposSnapshot = await getDocs(collection(db, 'equipos'));
      
      const clubesData: any[] = [];
      equiposSnapshot.forEach(doc => {
        const data = doc.data();
        clubesData.push({
          id: doc.id,
          nombre: data.nombre,
          descripcion: data.descripcion || '',
          foto: data.foto || '',
          ciudad: data.direccion || '',
          categoria: data.categoria || '',
          division: data.division || '',
          jugadoresCount: data.jugadores?.length || 0,
          activo: data.activo
        });
      });
      
      // Filtrar solo los activos
      const clubesActivos = clubesData.filter(club => club.activo !== false);
      
      setClubes(clubesActivos);
      setFilteredClubes(clubesActivos);
    } catch (error) {      toast.error('Error al cargar los clubes');
    } finally {
      setLoading(false);
    }
  };

  const handleSolicitarGestion = async (clubId: string, clubNombre: string) => {
    try {
      // Llamar al endpoint para solicitar gestión del equipo usando el servicio api
      await api.post(`/equipos/${clubId}/solicitar-gestion`, {
        mensaje: `Solicitud de gestión para ${clubNombre}`
      });

      toast.success('Solicitud de gestión enviada correctamente');
      toast('El organizador o el manager del equipo recibirá tu solicitud', {
        icon: 'ℹ️',
        duration: 4000
      });
      
    } catch (error: any) {      toast.error(error.response?.data?.error || error.message || 'Error al enviar solicitud');
    }
  };

  const handleVerDetalles = (clubId: string) => {
    navigate(`/equipos/${clubId}`);
  };

  if (loading) {
    return (
      <Container sx={{ mt: 4, textAlign: 'center' }}>
        <CircularProgress />
        <Typography variant="h6" sx={{ mt: 2 }}>
          Cargando clubes...
        </Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box mb={4}>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate('/manager/mi-club')}
          sx={{ mb: 2 }}
        >
          Volver
        </Button>
        
        <Typography variant="h4" gutterBottom>
          Buscar Club Existente
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Encuentra un club y solicita unirte como manager
        </Typography>
      </Box>

      {/* Barra de búsqueda */}
      <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
        <TextField
          fullWidth
          placeholder="Buscar por nombre, ciudad o descripción..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search />
              </InputAdornment>
            )
          }}
        />
        
        <Box mt={2}>
          <Typography variant="body2" color="text.secondary">
            {filteredClubes.length} {filteredClubes.length === 1 ? 'club encontrado' : 'clubes encontrados'}
          </Typography>
        </Box>
      </Paper>

      {/* Lista de clubes */}
      {filteredClubes.length === 0 ? (
        <Box textAlign="center" py={6}>
          <Groups sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            {searchQuery ? 'No se encontraron clubes con ese criterio' : 'No hay clubes disponibles'}
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={3}>
            {!searchQuery && 'Los clubes aparecerán aquí cuando estén disponibles'}
          </Typography>
        </Box>
      ) : (
        <Grid container spacing={3}>
          {filteredClubes.map((club) => (
            <Grid item xs={12} sm={6} md={4} key={club.id}>
              <Card 
                sx={{ 
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  '&:hover': {
                    boxShadow: 6
                  }
                }}
              >
                {/* Logo del club */}
                {club.logo ? (
                  <CardMedia
                    component="img"
                    height="200"
                    image={getImageUrl(club.logo)}
                    alt={club.nombre}
                    sx={{ objectFit: 'contain', p: 2, bgcolor: 'background.default' }}
                  />
                ) : (
                  <Box
                    sx={{
                      height: 200,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: 'background.default'
                    }}
                  >
                    <Avatar sx={{ width: 100, height: 100 }}>
                      <Groups sx={{ fontSize: 50 }} />
                    </Avatar>
                  </Box>
                )}

                <CardContent sx={{ flexGrow: 1 }}>
                  <Typography variant="h6" gutterBottom>
                    {club.nombre}
                  </Typography>

                  {club.descripcion && (
                    <Typography 
                      variant="body2" 
                      color="text.secondary" 
                      sx={{ 
                        mb: 2,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden'
                      }}
                    >
                      {club.descripcion}
                    </Typography>
                  )}

                  <Box display="flex" flexDirection="column" gap={1}>
                    {club.ciudad && (
                      <Box display="flex" alignItems="center" gap={0.5}>
                        <LocationOn fontSize="small" color="action" />
                        <Typography variant="body2" color="text.secondary">
                          {club.ciudad}
                        </Typography>
                      </Box>
                    )}

                    {club.jugadoresCount > 0 && (
                      <Box display="flex" alignItems="center" gap={0.5}>
                        <Person fontSize="small" color="action" />
                        <Typography variant="body2" color="text.secondary">
                          {club.jugadoresCount} jugadores
                        </Typography>
                      </Box>
                    )}

                    <Box display="flex" gap={1} flexWrap="wrap" mt={1}>
                      {club.categoria && (
                        <Chip label={asText(club.categoria)} size="small" />
                      )}
                      {club.division && (
                        <Chip label={club.division} size="small" variant="outlined" />
                      )}
                    </Box>
                  </Box>
                </CardContent>

                <CardActions sx={{ p: 2, pt: 0 }}>
                  <Button
                    fullWidth
                    variant="outlined"
                    onClick={() => handleVerDetalles(club.id)}
                    size="small"
                  >
                    Ver Detalles
                  </Button>
                  <Button
                    fullWidth
                    variant="contained"
                    onClick={() => handleSolicitarGestion(club.id, club.nombre)}
                    size="small"
                  >
                    Solicitar Gestionar
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Información adicional */}
      <Alert severity="info" sx={{ mt: 4 }}>
        <Typography variant="body2">
          <strong>Nota:</strong> Al solicitar gestionar un club existente, tanto el manager actual del club
          como cualquier organizador podrán aceptar o rechazar tu solicitud. Mientras tanto, puedes crear tu propio club.
        </Typography>
      </Alert>
    </Container>
  );
};

export default BuscarClub;

