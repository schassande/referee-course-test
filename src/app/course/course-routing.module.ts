import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { CourseListComponent } from './course-list/course-list.component';
import { CourseEditComponent } from './course-edit/course-edit.component';
import { AuthGuard } from 'src/app/main/guard/AuthGuard';


const routes: Routes = [
  { path: '', component: CourseListComponent, canActivate: [AuthGuard]},
  { path: 'edit/:id', component: CourseEditComponent, canActivate: [AuthGuard]},
  { path: 'create', component: CourseEditComponent, canActivate: [AuthGuard]}
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class CourseRoutingModule {}
