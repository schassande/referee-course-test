import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { CourseRoutingModule } from './course-routing.module';
import { CourseEditComponent } from './course-edit/course-edit.component';
import { CourseListComponent } from './course-list/course-list.component';
import { BrowserModule } from '@angular/platform-browser';
import { MainModule } from '../main/main.module';


@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    CourseRoutingModule,
    MainModule.forRoot()
  ],
  declarations: [CourseEditComponent, CourseListComponent],
  entryComponents: [CourseEditComponent, CourseListComponent]
})
export class CourseModule {}
