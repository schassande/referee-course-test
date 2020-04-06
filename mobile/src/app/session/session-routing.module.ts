import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { SessionListComponent } from './session-list/session-list.component';
import { SessionEditComponent } from './session-edit/session-edit.component';

const routes: Routes = [
  {
    path: '',
    component: SessionListComponent,
  },
  {
    path: 'edit/:id',
    component: SessionEditComponent,
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class SessionRoutingModule {}
