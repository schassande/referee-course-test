import { Category } from 'typescript-logging';
import { AngularFirestore } from '@angular/fire/firestore';
import { AppSettingsService } from 'src/app/service/AppSettingsService';
import { LocalAppSettings } from 'src/app/model/settings';
import { map, flatMap } from 'rxjs/operators';
import { ConnectedUserService } from 'src/app/service/ConnectedUserService';
import { ResponseWithData } from 'src/app/service/response';
import { User } from 'src/app/model/model';
import { Subject, from } from 'rxjs';
import { NavController, LoadingController, AlertController } from '@ionic/angular';
import { Component, OnInit } from '@angular/core';
import { UserService } from 'src/app/service/UserService';
import { logUser } from 'src/app/logging-config';

const logger = new Category('login', logUser);

@Component({
  selector: 'app-user-login',
  templateUrl: './user-login.component.html',
  styleUrls: ['./user-login.component.scss'],
})
export class UserLoginComponent implements OnInit {

  email: string;
  password: string;
  savePassword = true;
  errors: any[] = [];

  constructor(
    private alertCtrl: AlertController,
    private appSettingsService: AppSettingsService,
    private connectedUserService: ConnectedUserService,
    private loadingController: LoadingController,
    private navController: NavController,
    private userService: UserService,
  ) { }

  ngOnInit() {
    if (this.connectedUserService.isConnected()) {
      this.navController.navigateRoot(['/home']);
    }
    this.appSettingsService.get().pipe(
      map((settings: LocalAppSettings) => {
        this.email = settings.lastUserEmail;
        this.password = settings.lastUserPassword;
        logger.debug(() => 'Set email and password from local settings: ' + this.email + ' ' + this.password);
      })).subscribe();
  }

  isValid(): boolean {
    this.errors = [];
    if (!this.password || this.password.trim().length === 0) {
      this.errors.push('The password is required.');
    }
    if (!this.email || this.email.trim().length === 0) {
      this.errors.push('The email is required.');
    }
    return this.errors.length === 0;
  }

  login() {
    if (this.isValid()) {
      this.loadingController.create({ message: 'Login...', translucent: true}).then((l) => l.present());
      this.userService.loginWithEmailNPassword(this.email, this.password, this.savePassword).pipe(
        map((ruser) => {
          this.loadingController.dismiss();
          if (this.connectedUserService.isConnected()) {
            this.navController.navigateRoot(['/home']);
          } else if (ruser.error && ruser.error.error) {
            this.errors = [ruser.error.error];
            this.alertCtrl.create({message: ruser.error.error}).then( (alert) => alert.present() );
          } else if (ruser.error) {
            this.errors = [ruser.error];
          }
        })
      ).subscribe();
    }
  }

  createAccount() {
    this.navController.navigateRoot(['/user/create']);
  }

  resetPassword() {
    this.userService.resetPassword(this.email);
  }
}
