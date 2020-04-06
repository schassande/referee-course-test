import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { CourseListComponent } from './course-list/course-list.component';
import { CourseEditComponent } from './course-edit/course-edit.component';


const routes: Routes = [
  {
    path: '',
    component: CourseListComponent
  },
  {
    path: 'edit/:id',
    component: CourseEditComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class CourseRoutingModule {}
