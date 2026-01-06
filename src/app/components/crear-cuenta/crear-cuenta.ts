import { Component, CUSTOM_ELEMENTS_SCHEMA, inject, signal } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
  AbstractControl,
} from '@angular/forms';
import { AuthJwtService } from '../../service/auth-jwt.service';
import { firstValueFrom } from 'rxjs';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-crear-cuenta',
  imports: [RouterLink, CommonModule, ReactiveFormsModule],
  templateUrl: './crear-cuenta.html',
  styleUrl: './crear-cuenta.css',
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class CrearCuenta {
  private authService = inject(AuthJwtService);
  private router = inject(Router);

  form: FormGroup;
  submitting = signal(false);
  fotoPreview: string | null = null;
  passwordStrength = signal({ score: 0, label: '—', color: '' });

  constructor(private fb: FormBuilder) {
    this.form = this.fb.group(
      {
        nombre: [
          '',
          [
            Validators.required,
            Validators.minLength(3),
            Validators.pattern('^[A-Za-zÁÉÍÓÚáéíóúÑñ ]+$'),
          ],
        ],
        apellido: [
          '',
          [
            Validators.required,
            Validators.minLength(3),
            Validators.pattern('^[A-Za-zÁÉÍÓÚáéíóúÑñ ]+$'),
          ],
        ],
        correo: [
          '',
          [
            Validators.required,
            Validators.email,
            Validators.pattern(/^[\w.%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/),
          ],
        ],
        telefono: ['', [Validators.required, Validators.pattern('^[0-9]{10}$')]],
        fecha_nacimiento: ['', [Validators.required, this.fechaValidaActual.bind(this)]],
        genero: ['', Validators.required],
        password: [
          '',
          [
            Validators.required,
            Validators.minLength(8),
            Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/),
          ],
        ],
        confirm: ['', [Validators.required]],
        foto: [null],
        terminos: [false, [Validators.requiredTrue]],
      },
      { validators: this.contrasenasCoinciden }
    );

    // Suscribirse a cambios en contraseña para actualizar barra de progreso
    this.form.get('password')?.valueChanges.subscribe(value => {
      this.updatePasswordStrength(value || '');
    });
  }

  get f() {
    return this.form.controls;
  }

  fechaValidaActual(control: AbstractControl) {
    const fecha = new Date(control.value);
    const hoy = new Date();
    return fecha > hoy ? { fechaInvalida: true } : null;
  }

  contrasenasCoinciden(group: AbstractControl) {
    const pw = group.get('password')?.value;
    const cf = group.get('confirm')?.value;
    return pw === cf ? null : { noCoincide: true };
  }

  updatePasswordStrength(password: string): void {
    let score = 0;
    if (!password) {
      this.passwordStrength.set({ score: 0, label: '—', color: '' });
      return;
    }

    // Criterios de evaluación
    if (password.length >= 8) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    let label = '—';
    let color = '';
    if (score <= 2) {
      label = 'Débil';
      color = 'bg-danger';
    } else if (score <= 4) {
      label = 'Media';
      color = 'bg-warning';
    } else {
      label = 'Fuerte';
      color = 'bg-success';
    }

    this.passwordStrength.set({ score, label, color });
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);

    try {
      const {
        nombre,
        apellido,
        correo,
        telefono,
        fecha_nacimiento,
        genero,
        password,
        foto,
      } = this.form.value;

      // Backend real espera: nombre, email, password, telefono (opcional)
      // Limitar teléfono a 10 dígitos si existe
      const telefonoLimpio = telefono ? telefono.substring(0, 10) : null;
      
      // Si hay foto, enviamos multipart/form-data usando FormData (recomendado).
      let response;
      if (foto) {
        const fd = new FormData();
        fd.append('nombre', nombre);
        fd.append('apellido', apellido);
        fd.append('email', correo);
        fd.append('password', password);
        if (telefonoLimpio) fd.append('telefono', telefonoLimpio);
        if (genero) fd.append('genero', genero);
        if (fecha_nacimiento) fd.append('fecha_nacimiento', fecha_nacimiento);
        fd.append('foto', foto);
        // Asignar rol por defecto: Cliente (id_rol = 1)
        fd.append('id_rol', '1');

        response = await firstValueFrom(this.authService.register(fd));
      } else {
        const payload = {
          nombre: nombre,
          apellido: apellido,
          email: correo,
          password,
          telefono: telefonoLimpio,
          genero: genero,
          fecha_nacimiento: fecha_nacimiento,
          // Asignar rol por defecto: Cliente (id_rol = 1)
          id_rol: 1
        };

        response = await firstValueFrom(this.authService.register(payload));
      }

      await Swal.fire({ icon: 'success', title: 'Registro realizado', text: 'Tu cuenta fue creada correctamente.' });
      this.form.reset();
      this.fotoPreview = null;
      this.router.navigate(['/home']);
    } catch (error: any) {
      console.error('Error en registro:', error);
      const serverMsg = error?.error?.message || error?.message || (typeof error === 'string' ? error : JSON.stringify(error));
      await Swal.fire({ icon: 'error', title: 'No se pudo crear la cuenta', text: serverMsg || 'Intenta nuevamente en unos segundos.' });
    } finally {
      this.submitting.set(false);
    }
  }

  onFotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) {
      this.form.patchValue({ foto: null });
      this.fotoPreview = null;
      return;
    }

    const file = input.files[0];
    this.form.patchValue({ foto: file });
    this.form.get('foto')?.updateValueAndValidity();

    const reader = new FileReader();
    reader.onload = () => {
      this.fotoPreview = reader.result as string;
    };
    reader.readAsDataURL(file);
  }

  private buildDefaultAvatar(nombre: string, apellido: string): string {
    const seed = encodeURIComponent(`${nombre || ''} ${apellido || ''}`.trim() || 'Usuario');
    return `https://ui-avatars.com/api/?background=1e2a5a&color=fff&name=${seed}`;
  }

  private toBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  }
}



