import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { CourseListComponent } from './course-list/course-list.component';
import { CourseEditComponent } from './course-edit/course-edit.component';
import { CourseTranslationComponent } from './course-translation/course-translation.component';
import { AuthGuard } from 'src/app/main/guard/AuthGuard';
import { TeacherGuard } from 'src/app/main/guard/TeacherGuard';

const routes: Routes = [
  { path: '', component: CourseListComponent, canActivate: [AuthGuard]},
  { path: 'edit/:id', component: CourseEditComponent, canActivate: [AuthGuard]},
  { path: 'translation/:id', component: CourseTranslationComponent, canActivate: [AuthGuard]},
  { path: 'create', component: CourseEditComponent, canActivate: [TeacherGuard]},
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class CourseRoutingModule {}
