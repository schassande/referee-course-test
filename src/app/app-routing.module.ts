import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  { path: 'user/**', redirectTo: 'common', pathMatch: 'full'},
  { path: 'common', loadChildren: () => import('./main/main.module').then( m => m.MainModule)},
  { path: 'course', loadChildren: () => import('./course/course.module').then( m => m.CourseModule)},
  { path: 'session', loadChildren: () => import('./session/session.module').then( m => m.SessionModule)},
  { path: 'teacher', loadChildren: () => import('./teacher/teacher.module').then( m => m.TeacherModule)},
  { path: '', redirectTo: 'common', pathMatch: 'prefix'},
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule {}
