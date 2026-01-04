import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VerProveedor } from './ver-proveedor';

describe('VerProveedor', () => {
  let component: VerProveedor;
  let fixture: ComponentFixture<VerProveedor>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VerProveedor]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VerProveedor);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
