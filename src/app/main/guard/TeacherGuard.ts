import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { map } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { NavController } from '@ionic/angular';
import { ConnectedUserService } from 'src/app/service/ConnectedUserService';
import { UserService } from 'src/app/service/UserService';

@Injectable({
  providedIn: 'root',
})
export class TeacherGuard implements CanActivate {

  constructor(
    private connectedUserService: ConnectedUserService,
    private userService: UserService,
    private navController: NavController
    ) {}

  canActivate(next: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean|Observable<boolean> {
    const connected: boolean = this.connectedUserService.getCurrentUser() != null;
    if (connected) {
      return true;
    }
    return this.userService.autoLogin().pipe(
      map(() => {
        if (!this.connectedUserService.isConnected()) {
          this.navController.navigateRoot(['/user/login']);
        }
        return this.connectedUserService.isConnected() && this.connectedUserService.getCurrentUser().role === 'TEACHER';
      })
    );
  }
}
