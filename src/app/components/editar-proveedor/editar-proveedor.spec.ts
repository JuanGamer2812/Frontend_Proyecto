import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditarProveedor } from './editar-proveedor';

describe('EditarProveedor', () => {
  let component: EditarProveedor;
  let fixture: ComponentFixture<EditarProveedor>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditarProveedor]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EditarProveedor);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
