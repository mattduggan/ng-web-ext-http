import { TestBed } from '@angular/core/testing';

import { HttpWebExtRelay } from './http-web-ext-relay.service';

describe('HttpWebExtRelay', () => {
  let service: HttpWebExtRelay;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(HttpWebExtRelay);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
