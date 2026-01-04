import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VerificarCuenta } from './verificar-cuenta';

describe('VerificarCuenta', () => {
  let component: VerificarCuenta;
  let fixture: ComponentFixture<VerificarCuenta>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VerificarCuenta]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VerificarCuenta);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
