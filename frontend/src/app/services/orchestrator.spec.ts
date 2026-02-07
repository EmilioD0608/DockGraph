import { TestBed } from '@angular/core/testing';

import { Orchestrator } from './orchestrator';

describe('Orchestrator', () => {
  let service: Orchestrator;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Orchestrator);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
