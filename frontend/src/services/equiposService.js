/**
 * Servicio para CRUD de Equipos
 * CRUD completo desde cero
 */

import api from './api';

const EQUIPOS_ENDPOINT = '/equipos';

export const equiposService = {
  // Obtener todos los equipos
  async getAll(filtros = {}) {
    try {


      const response = await api.get(EQUIPOS_ENDPOINT, { params: filtros });
      return response.data;
    } catch (error) {
      console.error('❌ [SERVICE] Error obteniendo equipos:', error);
      throw error;
    }
  },

  // Obtener equipo por ID
  async getById(id) {
    try {

      const response = await api.get(`${EQUIPOS_ENDPOINT}/${id}`);

      return response.data;
    } catch (error) {
      console.error('❌ [SERVICE] Error obteniendo equipo:', error);
      throw error;
    }
  },

  // Crear nuevo equipo
  async create(equipoData) {
    try {

      // Preparar FormData para envío
      const formData = new FormData();
      
      // Agregar campos básicos
      formData.append('nombre', equipoData.nombre);
      formData.append('descripcion', equipoData.descripcion || '');
      formData.append('categorias', JSON.stringify(equipoData.categorias));
      formData.append('club', equipoData.club || '');
      formData.append('ciudad', equipoData.ciudad || '');
      formData.append('pais', equipoData.pais || 'Colombia');
      formData.append('telefono', equipoData.telefono || '');
      formData.append('email', equipoData.email || '');
      formData.append('sitioWeb', equipoData.sitioWeb || '');
      
      // Agregar logo si existe
      if (equipoData.logo) {
        formData.append('logo', equipoData.logo);
      }
      
      const response = await api.post(EQUIPOS_ENDPOINT, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      return response.data;
    } catch (error) {
      console.error('❌ [SERVICE] Error creando equipo:', error);
      throw error;
    }
  },

  // Actualizar equipo
  async update(id, equipoData) {
    try {

      // Preparar FormData para envío
      const formData = new FormData();
      
      // Agregar campos básicos
      formData.append('nombre', equipoData.nombre);
      formData.append('descripcion', equipoData.descripcion || '');
      formData.append('categorias', JSON.stringify(equipoData.categorias));
      formData.append('club', equipoData.club || '');
      formData.append('ciudad', equipoData.ciudad || '');
      formData.append('pais', equipoData.pais || 'Colombia');
      formData.append('telefono', equipoData.telefono || '');
      formData.append('email', equipoData.email || '');
      formData.append('sitioWeb', equipoData.sitioWeb || '');
      formData.append('estado', equipoData.estado || 'activo');
      
      // Agregar logo si existe
      if (equipoData.logo) {
        formData.append('logo', equipoData.logo);
      }
      
      const response = await api.put(`${EQUIPOS_ENDPOINT}/${id}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      return response.data;
    } catch (error) {
      console.error('❌ [SERVICE] Error actualizando equipo:', error);
      throw error;
    }
  },

  // Eliminar equipo
  async delete(id) {
    try {

      const response = await api.delete(`${EQUIPOS_ENDPOINT}/${id}`);

      return response.data;
    } catch (error) {
      console.error('❌ [SERVICE] Error eliminando equipo:', error);
      throw error;
    }
  },

  // Obtener jugadores del equipo
  async getJugadores(id) {
    try {

      const response = await api.get(`${EQUIPOS_ENDPOINT}/${id}/jugadores`);

      return response.data;
    } catch (error) {
      console.error('❌ [SERVICE] Error obteniendo jugadores:', error);
      throw error;
    }
  },

  // Agregar jugador al equipo
  async addJugador(equipoId, jugadorId) {
    try {

      const response = await api.post(`${EQUIPOS_ENDPOINT}/${equipoId}/jugadores`, {
        jugadorId: jugadorId
      });

      return response.data;
    } catch (error) {
      console.error('❌ [SERVICE] Error agregando jugador:', error);
      throw error;
    }
  },

  // Remover jugador del equipo
  async removeJugador(equipoId, jugadorId) {
    try {

      const response = await api.delete(`${EQUIPOS_ENDPOINT}/${equipoId}/jugadores/${jugadorId}`);

      return response.data;
    } catch (error) {
      console.error('❌ [SERVICE] Error removiendo jugador:', error);
      throw error;
    }
  },

  // Buscar equipos
  async search(termino) {
    try {

      const response = await api.get(EQUIPOS_ENDPOINT, {
        params: { search: termino }
      });

      return response.data;
    } catch (error) {
      console.error('❌ [SERVICE] Error buscando equipos:', error);
      throw error;
    }
  },

  // Obtener equipos por categoría
  async getByCategoria(categoria) {
    try {

      const response = await api.get(EQUIPOS_ENDPOINT, {
        params: { categoria: categoria }
      });

      return response.data;
    } catch (error) {
      console.error('❌ [SERVICE] Error obteniendo equipos por categoría:', error);
      throw error;
    }
  },

  // Obtener equipos por ciudad
  async getByCiudad(ciudad) {
    try {

      const response = await api.get(EQUIPOS_ENDPOINT, {
        params: { ciudad: ciudad }
      });

      return response.data;
    } catch (error) {
      console.error('❌ [SERVICE] Error obteniendo equipos por ciudad:', error);
      throw error;
    }
  }
};

export default equiposService;
