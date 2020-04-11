import { AuthGuard } from 'src/app/main/guard/AuthGuard';
import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { SessionListComponent } from './session-list/session-list.component';
import { SessionEditComponent } from './session-edit/session-edit.component';

const routes: Routes = [
  { path: '', component: SessionListComponent, canActivate: [AuthGuard]},
  { path: 'edit/:id', component: SessionEditComponent, canActivate: [AuthGuard]},
  { path: 'create', component: SessionEditComponent, canActivate: [AuthGuard]}
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class SessionRoutingModule {}
