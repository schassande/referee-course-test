import { AuthGuard } from 'src/app/main/guard/AuthGuard';
import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { TeacherListComponent } from './teacher-list/teacher-list.component';

const routes: Routes = [
  { path: '', component: TeacherListComponent, canActivate: [AuthGuard] }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class TeacherRoutingModule {}
