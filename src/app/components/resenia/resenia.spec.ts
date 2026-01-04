import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Resenia } from './resenia';

describe('Resenia', () => {
  let component: Resenia;
  let fixture: ComponentFixture<Resenia>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Resenia]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Resenia);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
