import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LowCodeQueryComponent } from './low-code-query.component';

describe('LowCodeQueryComponent', () => {
  let component: LowCodeQueryComponent;
  let fixture: ComponentFixture<LowCodeQueryComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [LowCodeQueryComponent]
    });
    fixture = TestBed.createComponent(LowCodeQueryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
