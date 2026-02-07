import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Targets } from './targets';

describe('Targets', () => {
  let component: Targets;
  let fixture: ComponentFixture<Targets>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Targets]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Targets);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
