import { UserEditPage } from './user-edit/user-edit';
import { UserLoginComponent } from './user-login/user-login.component';
import { HomeComponent } from './home/home.component';

import { AuthGuard } from './guard/AuthGuard';

import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

const routes: Routes = [
  { path: '', component: HomeComponent, canActivate: [AuthGuard] },
  { path: 'home', component: HomeComponent, canActivate: [AuthGuard] },
  { path: 'user/login', component: UserLoginComponent },
  { path: 'user/create', component: UserEditPage},
  { path: 'user/edit/:id', component: UserEditPage, canActivate: [AuthGuard] }

];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class MainRoutingModule {}
