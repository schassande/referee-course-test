import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { CourseRoutingModule } from './course-routing.module';
import { CourseEditComponent } from './course-edit/course-edit.component';
import { CourseListComponent } from './course-list/course-list.component';
import { CourseTranslationComponent } from './course-translation/course-translation.component';
import { MainModule } from '../main/main.module';


@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    CourseRoutingModule,
    MainModule
  ],
  declarations: [CourseEditComponent, CourseListComponent, CourseTranslationComponent],
  entryComponents: [CourseEditComponent, CourseListComponent, CourseTranslationComponent]
})
export class CourseModule {}
