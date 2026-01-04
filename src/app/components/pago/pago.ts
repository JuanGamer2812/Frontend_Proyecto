import { Component, EventEmitter, Input, Output, OnInit, OnChanges, SimpleChanges, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface DatosPago {
  metodoPago: 'tarjeta' | 'paypal' | 'transferencia' | 'deposito';
  // Datos de tarjeta
  nombreTarjeta?: string;
  numeroTarjeta?: string;
  mesExpiracion?: string;
  anioExpiracion?: string;
  cvv?: string;
  tipoTarjeta?: string;
  // Datos de transferencia/depósito
  numeroCuenta?: string;
  bancoOrigen?: string;
  numeroComprobante?: string;
  archivoComprobante?: string; // Base64 del comprobante
}

export interface ResultadoPago {
  success: boolean;
  metodoPago: string;
  transactionId?: string;
  mensaje?: string;
  datos?: DatosPago;
}

@Component({
  selector: 'app-pago',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pago.html',
  styleUrl: './pago.css'
})
export class Pago implements OnInit, OnChanges {
  @Input() total: number = 0;
  @Input() subtotal: number = 0;
  @Input() iva: number = 0;
  @Input() visible: boolean = false;
  @Input() nombreEvento: string = '';
  
  @Output() pagoCompletado = new EventEmitter<ResultadoPago>();
  @Output() pagoCancelado = new EventEmitter<void>();
  
  // Estado del componente
  procesandoPago = signal(false);
  metodoPagoSeleccionado = signal<'tarjeta' | 'paypal' | 'transferencia' | 'deposito'>('tarjeta');
  
  // Datos del formulario
  datosPago: DatosPago = {
    metodoPago: 'tarjeta',
    nombreTarjeta: '',
    numeroTarjeta: '',
    mesExpiracion: '',
    anioExpiracion: '',
    cvv: ''
  };
  
  // Validaciones de tarjeta
  validacionTarjeta = { valid: false, tipo: '', message: '', icono: '' };
  validacionFecha = { valid: false, message: '' };
  validacionCVV = { valid: false, message: '' };
  
  // Archivo de comprobante
  archivoComprobante: File | null = null;
  nombreArchivoComprobante: string = '';
  
  // Datos bancarios para transferencia/depósito
  datosBancarios = {
    banco: 'Banco Pichincha',
    tipoCuenta: 'Cuenta de Ahorros',
    numeroCuenta: '2211317760',
    titular: 'ECLAT EVENTOS S.A.',
    cedula: '1790123456001',
    correo: 'pagos@eclateventos.com'
  };
  
  ngOnInit(): void {
    this.datosPago.metodoPago = 'tarjeta';
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Cuando el modal se abre (visible cambia a true), limpiar todos los datos
    if (changes['visible'] && changes['visible'].currentValue === true) {
      this.resetFormularioCompleto();
    }
  }

  // Limpiar todos los datos del formulario de pago
  private resetFormularioCompleto(): void {
    // Reset método de pago
    this.metodoPagoSeleccionado.set('tarjeta');
    
    // Reset datos del formulario
    this.datosPago = {
      metodoPago: 'tarjeta',
      nombreTarjeta: '',
      numeroTarjeta: '',
      mesExpiracion: '',
      anioExpiracion: '',
      cvv: '',
      numeroComprobante: '',
      bancoOrigen: '',
      archivoComprobante: ''
    };
    
    // Reset validaciones
    this.resetValidaciones();
    
    // Reset archivo de comprobante
    this.archivoComprobante = null;
    this.nombreArchivoComprobante = '';
    
    // Reset estado de procesamiento
    this.procesandoPago.set(false);
  }
  
  // ==================== CAMBIO DE MÉTODO DE PAGO ====================
  
  seleccionarMetodo(metodo: 'tarjeta' | 'paypal' | 'transferencia' | 'deposito'): void {
    this.metodoPagoSeleccionado.set(metodo);
    this.datosPago.metodoPago = metodo;
    // Limpiar validaciones al cambiar de método
    this.resetValidaciones();
  }
  
  private resetValidaciones(): void {
    this.validacionTarjeta = { valid: false, tipo: '', message: '', icono: '' };
    this.validacionFecha = { valid: false, message: '' };
    this.validacionCVV = { valid: false, message: '' };
  }
  
  // ==================== VALIDACIÓN DE TARJETAS ====================
  
  onNumeroTarjetaChange(): void {
    const numero = this.datosPago.numeroTarjeta?.replace(/\s/g, '') || '';
    // Formatear con espacios cada 4 dígitos
    const formatted = numero.replace(/(.{4})/g, '$1 ').trim();
    this.datosPago.numeroTarjeta = formatted;
    
    this.validacionTarjeta = this.validarNumeroTarjeta(numero);
    this.datosPago.tipoTarjeta = this.validacionTarjeta.tipo;
    
    // Re-validar CVV si ya hay uno ingresado
    if (this.datosPago.cvv) {
      this.onCVVChange();
    }
  }
  
  onFechaExpiracionChange(): void {
    this.validacionFecha = this.validarFechaExpiracion(
      this.datosPago.mesExpiracion || '',
      this.datosPago.anioExpiracion || ''
    );
  }
  
  onCVVChange(): void {
    this.validacionCVV = this.validarCVV(
      this.datosPago.cvv || '',
      this.validacionTarjeta.tipo
    );
  }
  
  onlyNumbers(event: KeyboardEvent): boolean {
    const charCode = event.which ? event.which : event.keyCode;
    if (charCode > 31 && (charCode < 48 || charCode > 57)) {
      event.preventDefault();
      return false;
    }
    return true;
  }
  
  validarNumeroTarjeta(numero: string): { valid: boolean; tipo: string; message: string; icono: string } {
    const cleanNumber = numero.replace(/[\s-]/g, '');
    
    if (!cleanNumber) {
      return { valid: false, tipo: '', message: 'Ingresa el número de tarjeta', icono: '' };
    }
    if (!/^\d+$/.test(cleanNumber)) {
      return { valid: false, tipo: '', message: 'Solo se permiten números', icono: '' };
    }
    
    let tipo = '';
    let icono = '';
    let expectedLength = 0;
    
    // Detectar tipo de tarjeta por prefijo
    if (/^4/.test(cleanNumber)) {
      tipo = 'Visa';
      icono = 'bi-credit-card-2-front';
      expectedLength = 16;
    } else if (/^5[1-5]/.test(cleanNumber) || /^2[2-7]/.test(cleanNumber)) {
      tipo = 'MasterCard';
      icono = 'bi-credit-card';
      expectedLength = 16;
    } else if (/^3[47]/.test(cleanNumber)) {
      tipo = 'American Express';
      icono = 'bi-credit-card-fill';
      expectedLength = 15;
    } else {
      return { valid: false, tipo: '', message: 'Tipo de tarjeta no soportado (Visa, MasterCard, Amex)', icono: '' };
    }
    
    // Simulación: solo verificar longitud mínima (al menos 13 dígitos)
    if (cleanNumber.length < 13) {
      return {
        valid: false,
        tipo,
        icono,
        message: `${tipo} - Ingresa más dígitos`
      };
    }
    
    // Si tiene suficientes dígitos, es válida (simulación)
    return {
      valid: true,
      tipo,
      icono,
      message: `Tarjeta ${tipo} ✓`
    };
  }
  
  validarFechaExpiracion(mes: string, anio: string): { valid: boolean; message: string } {
    if (!mes || !anio) {
      return { valid: false, message: 'Selecciona mes y año de expiración' };
    }
    
    const mesNum = parseInt(mes);
    const anioNum = parseInt(anio);
    const fechaActual = new Date();
    const mesActual = fechaActual.getMonth() + 1;
    const anioActual = fechaActual.getFullYear();
    
    if (anioNum < anioActual) {
      return { valid: false, message: 'La tarjeta ha expirado' };
    }
    
    if (anioNum === anioActual && mesNum < mesActual) {
      return { valid: false, message: 'La tarjeta ha expirado' };
    }
    
    if (anioNum > anioActual + 10) {
      return { valid: false, message: 'Fecha muy lejana en el futuro' };
    }
    
    return { valid: true, message: 'Fecha válida ✓' };
  }
  
  validarCVV(cvv: string, tipoTarjeta: string): { valid: boolean; message: string } {
    if (!cvv) {
      return { valid: false, message: 'Ingresa el código CVV' };
    }
    
    if (!/^\d+$/.test(cvv)) {
      return { valid: false, message: 'CVV solo debe contener números' };
    }
    
    const expectedLength = tipoTarjeta === 'American Express' ? 4 : 3;
    
    if (cvv.length !== expectedLength) {
      return {
        valid: false,
        message: `CVV debe tener ${expectedLength} dígitos`
      };
    }
    
    return { valid: true, message: `CVV válido ✓` };
  }
  
  // ==================== HELPERS ====================
  
  getYearsArray(): number[] {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = currentYear; i <= currentYear + 10; i++) {
      years.push(i);
    }
    return years;
  }
  
  getMonthsArray(): { value: string; label: string }[] {
    return [
      { value: '01', label: '01 - Enero' },
      { value: '02', label: '02 - Febrero' },
      { value: '03', label: '03 - Marzo' },
      { value: '04', label: '04 - Abril' },
      { value: '05', label: '05 - Mayo' },
      { value: '06', label: '06 - Junio' },
      { value: '07', label: '07 - Julio' },
      { value: '08', label: '08 - Agosto' },
      { value: '09', label: '09 - Septiembre' },
      { value: '10', label: '10 - Octubre' },
      { value: '11', label: '11 - Noviembre' },
      { value: '12', label: '12 - Diciembre' }
    ];
  }
  
  getCVVPlaceholder(): string {
    return this.validacionTarjeta.tipo === 'American Express' ? '1234' : '123';
  }
  
  getCVVMaxLength(): number {
    return this.validacionTarjeta.tipo === 'American Express' ? 4 : 3;
  }
  
  // ==================== COMPROBANTE DE PAGO ====================
  
  onComprobanteSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    
    const file = input.files[0];
    
    // Validar tipo de archivo
    const tiposPermitidos = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (!tiposPermitidos.includes(file.type)) {
      alert('Solo se permiten archivos JPG, PNG o PDF');
      return;
    }
    
    // Validar tamaño (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('El archivo no debe exceder 5MB');
      return;
    }
    
    this.archivoComprobante = file;
    this.nombreArchivoComprobante = file.name;
    
    // Convertir a base64
    const reader = new FileReader();
    reader.onload = () => {
      this.datosPago.archivoComprobante = reader.result as string;
    };
    reader.readAsDataURL(file);
  }
  
  eliminarComprobante(): void {
    this.archivoComprobante = null;
    this.nombreArchivoComprobante = '';
    this.datosPago.archivoComprobante = '';
  }
  
  // ==================== VALIDACIÓN DEL FORMULARIO ====================
  
  isFormValid(): boolean {
    const metodo = this.metodoPagoSeleccionado();
    
    switch (metodo) {
      case 'tarjeta':
        return this.validacionTarjeta.valid &&
               this.validacionFecha.valid &&
               this.validacionCVV.valid &&
               !!this.datosPago.nombreTarjeta?.trim();
               
      case 'paypal':
        // PayPal solo requiere confirmación (se redirige a PayPal)
        return true;
        
      case 'transferencia':
      case 'deposito':
        // Requiere número de comprobante y archivo
        return !!this.datosPago.numeroComprobante?.trim() &&
               !!this.datosPago.archivoComprobante;
               
      default:
        return false;
    }
  }
  
  // ==================== PROCESAMIENTO DE PAGO ====================
  
  procesarPago(): void {
    if (!this.isFormValid()) {
      alert('Por favor completa todos los campos requeridos');
      return;
    }
    
    this.procesandoPago.set(true);
    
    const metodo = this.metodoPagoSeleccionado();
    
    switch (metodo) {
      case 'tarjeta':
        this.procesarPagoTarjeta();
        break;
      case 'paypal':
        this.procesarPagoPayPal();
        break;
      case 'transferencia':
        this.procesarPagoTransferencia();
        break;
      case 'deposito':
        this.procesarPagoDeposito();
        break;
    }
  }
  
  private procesarPagoTarjeta(): void {
    console.log('💳 Procesando pago con tarjeta...');
    
    // Simular procesamiento (en producción conectar con gateway real)
    setTimeout(() => {
      const transactionId = 'TXN-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9).toUpperCase();
      
      this.procesandoPago.set(false);
      this.pagoCompletado.emit({
        success: true,
        metodoPago: 'Crédito', // Para la BD
        transactionId,
        mensaje: `Pago exitoso con ${this.validacionTarjeta.tipo}`,
        datos: { ...this.datosPago }
      });
    }, 2000);
  }
  
  private procesarPagoPayPal(): void {
    console.log('🅿️ Procesando pago con PayPal...');
    
    // Simular redirección a PayPal
    setTimeout(() => {
      const transactionId = 'PP-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9).toUpperCase();
      
      // En producción, aquí se abriría la ventana de PayPal
      // Por ahora simulamos éxito
      this.procesandoPago.set(false);
      this.pagoCompletado.emit({
        success: true,
        metodoPago: 'Paypal', // Para la BD
        transactionId,
        mensaje: 'Pago con PayPal procesado exitosamente',
        datos: { ...this.datosPago }
      });
    }, 2500);
  }
  
  private procesarPagoTransferencia(): void {
    console.log('🏦 Procesando pago por transferencia...');
    
    setTimeout(() => {
      const transactionId = 'TRF-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9).toUpperCase();
      
      this.procesandoPago.set(false);
      this.pagoCompletado.emit({
        success: true,
        metodoPago: 'Transferencia', // Para la BD
        transactionId,
        mensaje: 'Comprobante de transferencia registrado. Pendiente de verificación.',
        datos: { ...this.datosPago }
      });
    }, 1500);
  }
  
  private procesarPagoDeposito(): void {
    console.log('💰 Procesando pago por depósito...');
    
    setTimeout(() => {
      const transactionId = 'DEP-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9).toUpperCase();
      
      this.procesandoPago.set(false);
      this.pagoCompletado.emit({
        success: true,
        metodoPago: 'Efectivo', // Para la BD (Depósito = Efectivo)
        transactionId,
        mensaje: 'Comprobante de depósito registrado. Pendiente de verificación.',
        datos: { ...this.datosPago }
      });
    }, 1500);
  }
  
  // ==================== ACCIONES ====================
  
  cancelarPago(): void {
    this.procesandoPago.set(false);
    this.pagoCancelado.emit();
  }
  
  copiarAlPortapapeles(texto: string): void {
    navigator.clipboard.writeText(texto).then(() => {
      // Mostrar feedback visual
      const btn = document.activeElement as HTMLButtonElement;
      const originalText = btn?.innerHTML;
      if (btn) {
        btn.innerHTML = '<i class="bi bi-check"></i> Copiado';
        setTimeout(() => {
          btn.innerHTML = originalText;
        }, 1500);
      }
    });
  }
}
