import { MainModule } from './../main/main.module';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { SessionRoutingModule } from './session-routing.module';
import { SessionEditComponent } from './session-edit/session-edit.component';
import { SessionListComponent } from './session-list/session-list.component';
import { BrowserModule } from '@angular/platform-browser';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    SessionRoutingModule,
    MainModule.forRoot()
  ],
  declarations: [SessionEditComponent, SessionListComponent]
})
export class SessionModule {}
