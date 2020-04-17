import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { CourseRoutingModule } from './course-routing.module';
import { CourseEditComponent } from './course-edit/course-edit.component';
import { CourseListComponent } from './course-list/course-list.component';
import { BrowserModule } from '@angular/platform-browser';
import { MainModule } from '../main/main.module';
import { CourseExImportComponent } from './course-ex-import/course-ex-import.component';


@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    CourseRoutingModule,
    MainModule
  ],
  declarations: [CourseEditComponent, CourseListComponent, CourseExImportComponent],
  entryComponents: [CourseEditComponent, CourseListComponent, CourseExImportComponent]
})
export class CourseModule {}
