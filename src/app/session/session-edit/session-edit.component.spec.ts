import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { SessionEditComponent } from './session-edit.component';

describe('SessionEditComponent', () => {
  let component: SessionEditComponent;
  let fixture: ComponentFixture<SessionEditComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ SessionEditComponent ],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(SessionEditComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
