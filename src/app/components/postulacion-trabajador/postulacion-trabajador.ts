import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  Validators,
  AbstractControl,
  ValidationErrors,
  ReactiveFormsModule
} from '@angular/forms';
import { PostulacionService } from '../../service/postulacion.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-postulacion-trabajador',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './postulacion-trabajador.html',
  styleUrls: ['./postulacion-trabajador.css']
})
export class PostulacionTrabajador {
  form: FormGroup;
  enviando = false;
  private postulacionService = inject(PostulacionService);

  constructor(private fb: FormBuilder) {
    this.form = this.fb.group({
      cedula: ['', [Validators.required, Validators.maxLength(15), Validators.pattern(/^[0-9]+$/)]],
      nombre1: ['', [Validators.required, Validators.maxLength(100)]],
      nombre2: ['', [Validators.maxLength(50)]],
      apellido1: ['', [Validators.required, Validators.maxLength(100)]],
      apellido2: ['', [Validators.maxLength(100)]],
      fechaNacimiento: ['', [Validators.required, this.validEdad(18, 70)]],
      correo: ['', [Validators.required, Validators.email, Validators.maxLength(100)]],
      telefono: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
      cv: [null, [Validators.required, this.pdfOnly()]]
    });

  }

  get f() { return this.form.controls; }
  c(name: string): AbstractControl { return this.form.get(name)!; }

  /** ===== Validadores personalizados ===== */
  private validEdad(min: number, max: number) {
    return (c: AbstractControl): ValidationErrors | null => {
      const val = c.value;
      if (!val) return null;
      const dob = new Date(val);
      if (isNaN(dob.getTime())) return { invalidDate: true };
      const today = new Date();
      let age = today.getFullYear() - dob.getFullYear();
      const m = today.getMonth() - dob.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
      if (age < min) return { tooYoung: { min } };
      if (age > max) return { tooOld: { max } };
      return null;
    };
  }

  private pdfOnly() {
    return (c: AbstractControl): ValidationErrors | null => {
      const v = c.value as any;
      if (!v) return null;

      let name = '';
      let type = '';

      if (v instanceof File) {
        name = v.name || '';
        type = v.type || '';
      } else if (typeof v === 'string') {
        name = v;
      }

      const byTypeOk = !type || type === 'application/pdf';
      const byExtOk = /\.pdf$/i.test(name);

      return byTypeOk && byExtOk ? null : { pdfOnly: true };
    };
  }

  /** ===== Helpers de UI para errores ===== */
  isInvalid(name: string): boolean {
    const ctl = this.c(name);
    return ctl.invalid && (ctl.touched || ctl.dirty);
  }

  err(name: string, key: string): boolean {
    const e = this.c(name).errors || {};
    return key in e;
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files && input.files.length ? input.files[0] : null;
    this.f['cv'].setValue(file);
    this.f['cv'].markAsDirty();
    this.f['cv'].markAsTouched();
    this.f['cv'].updateValueAndValidity();
  }


  /** ===== Envío ===== */
  markAll(): void {
    Object.values(this.form.controls).forEach(c => c.markAsTouched());
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.markAll();
      return;
    }
    if (this.enviando) return;

    const postulacion = {
      cedula: this.f['cedula'].value,
      nombre1: this.f['nombre1'].value,
      nombre2: this.f['nombre2'].value || undefined,
      apellido1: this.f['apellido1'].value,
      apellido2: this.f['apellido2'].value || undefined,
      fechaNacimiento: this.f['fechaNacimiento'].value,
      correo: this.f['correo'].value,
      telefono: this.f['telefono'].value,
      archivo: this.f['cv'].value || undefined
    };

    this.enviando = true;

    this.postulacionService.postularTrabajador(postulacion).subscribe({
      next: () => {
        this.enviando = false;
        Swal.fire({ icon: 'success', title: 'Postulación registrada', text: '¡Trabajador registrado exitosamente!' });
        this.form.reset();
      },
      error: (err) => {
        this.enviando = false;
        const mensaje = err.error?.error || 'No se pudo registrar la postulación. Intenta nuevamente.';
        Swal.fire({ icon: 'error', title: 'No se pudo registrar', text: mensaje });
      }
    });
  }
}
