import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TeacherListComponent } from './teacher-list/teacher-list.component';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { MainModule } from '../main/main.module';



@NgModule({
  declarations: [TeacherListComponent],
  imports: [
    BrowserModule,
    CommonModule,
    FormsModule,
    IonicModule
  ]
})
export class TeacherModule { }
