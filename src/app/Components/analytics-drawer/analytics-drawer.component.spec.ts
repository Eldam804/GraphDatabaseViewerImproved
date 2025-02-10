import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AnalyticsDrawerComponent } from './analytics-drawer.component';

describe('AnalyticsDrawerComponent', () => {
  let component: AnalyticsDrawerComponent;
  let fixture: ComponentFixture<AnalyticsDrawerComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [AnalyticsDrawerComponent]
    });
    fixture = TestBed.createComponent(AnalyticsDrawerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
