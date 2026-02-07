import { TestBed } from '@angular/core/testing';

import { Target } from './target';

describe('Target', () => {
  let service: Target;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Target);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
