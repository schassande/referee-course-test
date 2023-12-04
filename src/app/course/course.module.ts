import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {MatIconModule} from '@angular/material/icon';
import {MatSelectModule} from '@angular/material/select';

import { IonicModule } from '@ionic/angular';

import { CourseRoutingModule } from './course-routing.module';
import { CourseEditComponent } from './course-edit/course-edit.component';
import { CourseListComponent } from './course-list/course-list.component';
import { CourseTranslationComponent } from './course-translation/course-translation.component';
import { MainModule } from '../main/main.module';
import { TranslateModule } from '@ngx-translate/core';


@NgModule({
    imports: [
        CommonModule,
        CourseRoutingModule,
        FormsModule,
        IonicModule,
        MainModule,
        MatIconModule, MatSelectModule,
        TranslateModule.forChild({extend: true})
    ],
    declarations: [CourseEditComponent, CourseListComponent, CourseTranslationComponent]
})
export class CourseModule {}
