/**
 * Modelo de Invitación de la Unión
 * Solo la Unión puede crear códigos de invitación para organizadores
 */

class InvitacionUnion {
  constructor(data) {
    this.id = data.id || null;
    this.codigo = data.codigo || this.generarCodigo();
    this.tipo = data.tipo || 'organizador'; // organizador, club, etc.
    this.email = data.email || null;
    this.nombreCompleto = data.nombreCompleto || '';
    this.organizacion = data.organizacion || '';
    this.estado = data.estado || 'activa'; // activa, usada, expirada, revocada
    this.creadaPor = data.creadaPor || null;
    this.creadaPorNombre = data.creadaPorNombre || '';
    this.fechaCreacion = data.fechaCreacion || new Date();
    this.fechaExpiracion = data.fechaExpiracion || this.calcularExpiracion();
    this.fechaUso = data.fechaUso || null;
    this.usadaPor = data.usadaPor || null;
    this.usadaPorEmail = data.usadaPorEmail || null;
    this.metadata = data.metadata || {};
  }

  generarCodigo() {
    const prefijo = 'URU'; // Unión Rugby Uruguay
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `${prefijo}-${timestamp}-${random}`;
  }

  calcularExpiracion() {
    const fecha = new Date();
    fecha.setDate(fecha.getDate() + 30); // 30 días de validez
    return fecha;
  }

  esValida() {
    if (this.estado !== 'activa') {
      return { valida: false, razon: 'Invitación no activa' };
    }

    if (new Date() > new Date(this.fechaExpiracion)) {
      return { valida: false, razon: 'Invitación expirada' };
    }

    return { valida: true };
  }

  marcarComoUsada(userId, userEmail) {
    this.estado = 'usada';
    this.fechaUso = new Date();
    this.usadaPor = userId;
    this.usadaPorEmail = userEmail;
  }

  revocar() {
    this.estado = 'revocada';
  }

  toJSON() {
    return {
      id: this.id,
      codigo: this.codigo,
      tipo: this.tipo,
      email: this.email,
      nombreCompleto: this.nombreCompleto,
      organizacion: this.organizacion,
      estado: this.estado,
      creadaPor: this.creadaPor,
      creadaPorNombre: this.creadaPorNombre,
      fechaCreacion: this.fechaCreacion,
      fechaExpiracion: this.fechaExpiracion,
      fechaUso: this.fechaUso,
      usadaPor: this.usadaPor,
      usadaPorEmail: this.usadaPorEmail,
      metadata: this.metadata
    };
  }
}

module.exports = InvitacionUnion;


