import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { FilLeserComponent } from './fil-leser.component';

describe('FilLeserComponent', () => {
  let component: FilLeserComponent;
  let fixture: ComponentFixture<FilLeserComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ FilLeserComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(FilLeserComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
