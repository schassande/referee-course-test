import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { MainModule } from 'src/app/main/main.module';

import { SessionRoutingModule } from './session-routing.module';
import { SessionEditComponent } from './session-edit/session-edit.component';
import { SessionListComponent } from './session-list/session-list.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    SessionRoutingModule
  ],
  entryComponents: [SessionEditComponent, SessionListComponent],
  declarations: [SessionEditComponent, SessionListComponent]
})
export class SessionModule {}
