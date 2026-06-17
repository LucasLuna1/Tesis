const { db } = require('../config/firebase');

const COLLECTION = 'patrocinadores';

class Patrocinador {
  constructor(data) {
    this.nombre = data.nombre;
    this.categoria = data.categoria; // 'oro', 'plata', 'bronce', 'colaborador'
    this.logo = data.logo || '';
    this.descripcion = data.descripcion || '';
    this.website = data.website || '';
    this.email = data.email || '';
    this.telefono = data.telefono || '';
    this.sector = data.sector || '';
    this.organizadorId = data.organizadorId; // ID del organizador que lo creó
    this.activo = data.activo !== undefined ? data.activo : true;
    this.orden = data.orden || 0; // Para ordenar los patrocinadores
    this.fechaCreacion = data.fechaCreacion || new Date();
    this.fechaActualizacion = data.fechaActualizacion || new Date();
  }

  // Crear un nuevo patrocinador
  static async crear(data) {
    try {
      const patrocinador = new Patrocinador(data);
      const docRef = await db.collection(COLLECTION).add({
        ...patrocinador,
        fechaCreacion: new Date(),
        fechaActualizacion: new Date()
      });
      
      return {
        id: docRef.id,
        ...patrocinador
      };
    } catch (error) {
      console.error('Error creando patrocinador:', error);
      throw error;
    }
  }

  // Obtener todos los patrocinadores activos
  static async obtenerTodos(filtros = {}) {
    try {
      // Obtener todos los documentos sin filtros complejos
      const snapshot = await db.collection(COLLECTION).get();
      
      // Obtener documentos y filtrar en memoria
      let patrocinadores = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Filtrar por organizador si se proporciona
      if (filtros.organizadorId) {
        patrocinadores = patrocinadores.filter(p => p.organizadorId === filtros.organizadorId);
      }

      // Filtrar por categoría si se proporciona
      if (filtros.categoria) {
        patrocinadores = patrocinadores.filter(p => p.categoria === filtros.categoria);
      }

      // Filtrar solo activos por defecto
      if (filtros.activo !== false) {
        patrocinadores = patrocinadores.filter(p => p.activo === true);
      }

      // Ordenar en memoria por orden y fecha de creación
      patrocinadores.sort((a, b) => {
        // Primero por orden (ascendente)
        const ordenDiff = (a.orden || 0) - (b.orden || 0);
        if (ordenDiff !== 0) return ordenDiff;
        
        // Luego por fecha de creación (descendente - más recientes primero)
        const fechaA = a.fechaCreacion?.seconds || a.fechaCreacion?.toMillis?.() || 0;
        const fechaB = b.fechaCreacion?.seconds || b.fechaCreacion?.toMillis?.() || 0;
        return fechaB - fechaA;
      });

      return patrocinadores;
    } catch (error) {
      console.error('Error obteniendo patrocinadores:', error);
      throw error;
    }
  }

  // Obtener un patrocinador por ID
  static async obtenerPorId(id) {
    try {
      const doc = await db.collection(COLLECTION).doc(id).get();
      
      if (!doc.exists) {
        return null;
      }

      return {
        id: doc.id,
        ...doc.data()
      };
    } catch (error) {
      console.error('Error obteniendo patrocinador:', error);
      throw error;
    }
  }

  // Actualizar un patrocinador
  static async actualizar(id, data) {
    try {
      const docRef = db.collection(COLLECTION).doc(id);
      const doc = await docRef.get();

      if (!doc.exists) {
        throw new Error('Patrocinador no encontrado');
      }

      const updateData = {
        ...data,
        fechaActualizacion: new Date()
      };

      await docRef.update(updateData);

      return {
        id,
        ...doc.data(),
        ...updateData
      };
    } catch (error) {
      console.error('Error actualizando patrocinador:', error);
      throw error;
    }
  }

  // Eliminar un patrocinador (soft delete)
  static async eliminar(id) {
    try {
      await db.collection(COLLECTION).doc(id).update({
        activo: false,
        fechaActualizacion: new Date()
      });

      return { success: true };
    } catch (error) {
      console.error('Error eliminando patrocinador:', error);
      throw error;
    }
  }

  // Eliminar permanentemente
  static async eliminarPermanente(id) {
    try {
      await db.collection(COLLECTION).doc(id).delete();
      return { success: true };
    } catch (error) {
      console.error('Error eliminando patrocinador permanentemente:', error);
      throw error;
    }
  }

  // Reordenar patrocinadores
  static async reordenar(orden) {
    try {
      const batch = db.batch();

      orden.forEach((item, index) => {
        const docRef = db.collection(COLLECTION).doc(item.id);
        batch.update(docRef, { orden: index });
      });

      await batch.commit();
      return { success: true };
    } catch (error) {
      console.error('Error reordenando patrocinadores:', error);
      throw error;
    }
  }
}

module.exports = Patrocinador;

