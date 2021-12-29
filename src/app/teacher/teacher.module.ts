import { TeacherRoutingModule } from './teacher-routing.module';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TeacherListComponent } from './teacher-list/teacher-list.component';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

@NgModule({
    declarations: [TeacherListComponent],
    imports: [
        CommonModule,
        FormsModule,
        IonicModule,
        TeacherRoutingModule
    ]
})
export class TeacherModule { }
