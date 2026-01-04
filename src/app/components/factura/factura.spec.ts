import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Factura } from './factura';

describe('Factura', () => {
  let component: Factura;
  let fixture: ComponentFixture<Factura>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Factura]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Factura);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
