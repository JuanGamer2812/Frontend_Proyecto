import { Component, inject, signal, OnInit } from '@angular/core';
import { Router, ActivatedRoute, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { OAuthService } from 'angular-oauth2-oidc';  // Asegúrate de que solo importas el servicio, no el módulo
import { HttpClientModule } from '@angular/common/http';
import { Navbar } from "./components/navbar/navbar";
import { NavigationStart, NavigationEnd, NavigationError } from '@angular/router';
import { filter, map, startWith } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Navbar, CommonModule, ReactiveFormsModule, HttpClientModule],  // Aquí ya no se importa OAuthModule
  templateUrl: './app.html',
  styleUrls: ['./app.css'],
  providers: [OAuthService]  // Solo proveemos el servicio OAuthService aquí, sin OAuthModule
})
export class App implements OnInit {
  protected readonly title = signal('proyecto_primer_hemi');
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  showNavbar$ = this.router.events.pipe(
    filter(e => e instanceof NavigationEnd),
    startWith(null),
    map(() => {
      let r = this.route;
      while (r.firstChild) r = r.firstChild;
      const hide = r.snapshot.data?.['hideNavbar'] === true;
      return !hide;
    })
  );

  isLoading = false;

  constructor() {}

  ngOnInit() {
    this.router.events.subscribe(event => {
      if (event instanceof NavigationStart) {
        this.isLoading = true;
      } else if (event instanceof NavigationEnd || event instanceof NavigationError) {
        this.isLoading = false;
      }
    });
  }
}
