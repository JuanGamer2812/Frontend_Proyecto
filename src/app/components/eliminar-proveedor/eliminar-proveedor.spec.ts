import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EliminarProveedor } from './eliminar-proveedor';

describe('EliminarProveedor', () => {
  let component: EliminarProveedor;
  let fixture: ComponentFixture<EliminarProveedor>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EliminarProveedor]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EliminarProveedor);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
