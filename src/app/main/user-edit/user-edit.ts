import { Category } from 'typescript-logging';
import { logUser } from 'src/app/logging-config';
import { Component, OnInit } from '@angular/core';
import { map, flatMap } from 'rxjs/operators';
import { ActivatedRoute, ParamMap } from '@angular/router';
import { LoadingController, NavController, ToastController, AlertController } from '@ionic/angular';
import { ConnectedUserService } from 'src/app/service/ConnectedUserService';
import { ResponseWithData } from 'src/app/service/response';
import { UserService } from 'src/app/service/UserService';
import { User, CONSTANTES } from 'src/app/model/model';

import { PhotoEvent } from 'src/app/main/widget/camera-icon-component';
const logger = new Category('edit', logUser);

/**
 * Generated class for the UserNewPage page.
 *
 * See http://ionicframework.com/docs/components/#navigation for more info
 * on Ionic pages and navigation.
 */

@Component({
  selector: 'page-user-edit',
  templateUrl: 'user-edit.html',
})
export class UserEditPage implements OnInit {
  user: User;
  error: string[] = [];
  constantes = CONSTANTES;
  saving = false;

  constructor(
    private alertCtrl: AlertController,
    private navController: NavController,
    private route: ActivatedRoute,
    public userService: UserService,
    public connectedUserService: ConnectedUserService,
    private toastController: ToastController,
    public loadingCtrl: LoadingController) {
  }

  ngOnInit() {
    this.route.paramMap.pipe(
      map( (paramMap: ParamMap) => {
        const userId = paramMap.get('id');
        if (userId) {
          this.userService.get(userId).subscribe((res: ResponseWithData<User>) => {
            if (res.error) {
              this.loadingCtrl.create({
                message: 'Problem to load referee informaion ...',
                duration: 3000
              }).then( (loader) => loader.present())
              .then(() => {
                this.navController.navigateRoot('/home');
              });
            } else {
              this.user = res.data;
              // .debug(() => 'load user: ' + JSON.stringify(this.user, null, 2));
              this.ensureData();
            }
          });
        } else {
          this.initReferee();
        }
          })
    ).subscribe();
  }

  private ensureData() {
    if (!this.user.dataSharingAgreement) {
      logger.debug(() => 'Add dataSharingAgreement field to the existing user.');
      this.user.dataSharingAgreement = {
        personnalInfoSharing: 'YES',
        photoSharing: 'YES',
      };
    }
    if (!this.user.country) {
      this.user.country = '';
    }
  }

  public initReferee() {
    this.user = {
      id: null,
      accountId: null,
      accountStatus: 'ACTIVE',
      role: 'LEARNER',
      version: 0,
      creationDate : new Date(),
      lastUpdate : new Date(),
      dataStatus: 'NEW',
      firstName: '',
      lastName: '',
      email: '',
      country:'',
      phone: '',
      photo: {
        path: null,
        url: null
      },
      speakingLanguages: [ 'EN' ],
      password: '',
      token: null,
      dataRegion: 'Europe',
      dataSharingAgreement: {
        personnalInfoSharing: 'YES',
        photoSharing: 'YES',
      }
    } as User;
  }
  isValid(): boolean {
    this.error = [];
    if (!this.isValidString(this.user.firstName, 3, 15)) {
      this.error.push(('Invalid first name: 3 to 15 chars'));
    }
    if (!this.isValidString(this.user.lastName, 3, 25)) {
      this.error.push(('Invalid last name: 3 to 25 chars'));
    }
    if (!this.isValidString(this.user.email, 5, 50)) {
      this.error.push(('Invalid email: 5 to 50 chars'));
    }
    if (!this.user.id && !this.isValidString(this.user.password, 6, 20)) {
      this.error.push(('Invalid password: 6 to 20 chars'));
    }
    return this.error.length === 0;
  }
  isValidString(str: string, minimalLength: number = 0, maximalLength: number = 100): boolean {
    return str && str.trim().length >= minimalLength && str.trim().length <= maximalLength;
  }

  public newUser(event) {
    this.loadingCtrl.create({ message: 'Saving...', translucent: true}).then((ctrl) => ctrl.present());
    if (this.isValid()) {
      this.saving = true;
      this.userService.save(this.user).pipe(
        map((response: ResponseWithData<User>) => {
          this.saving = false;
          this.loadingCtrl.dismiss();
        if (response.error) {
            this.error = response.error.error;
            if (response.error.code === 'auth/email-already-in-use') {
              logger.debug(() => 'The email address is already used.');
              this.toastController.create({ message: 'The email address is already used: ' + this.user.email, duration: 10000})
                .then((toast) => toast.present());
            } else {
              logger.warn(() => 'Error' + response.error);
              this.toastController.create({ message: 'Error when saving the user info: ' + response.error, duration: 10000})
                .then((toast) => toast.present());
            }
          } else {
            this.user = response.data;
            logger.debug(() => 'Saved user: ' + JSON.stringify(this.user, null, 2));
            if (this.user.accountStatus === 'VALIDATION_REQUIRED') {
              this.navController.navigateRoot('/user/waiting-validation');
            } else {
              this.navController.navigateRoot('/home');
            }
          }
        })
      ).subscribe();
    }
  }

  onImage(event: PhotoEvent) {
    if (event && event.url) {
      this.user.photo.url = event.url;
      this.user.photo.path = event.path;
    }
  }
  deleteAccount() {
    this.alertCtrl.create({
      message: 'Do you really want to delete your account ' + this.user.firstName + ' '
        + this.user.lastName +  '?<br>All data will be removed !!',
      buttons: [
        { text: 'Cancel', role: 'cancel'},
        {
          text: 'Delete',
          handler: () => {
            this.userService.delete(this.user.id).subscribe();
          }
        }
      ]
    }).then( (alert) => alert.present() );
  }
  cancel() {
    if (this.user.dataStatus === 'NEW') {
      this.navController.navigateRoot('/user/login');
    } else {
      this.navController.navigateRoot('/home');
    }
  }

  addQual() {
    if (!this.user.teacherQualifications) {
      this.user.teacherQualifications = [];
    }
    this.user.teacherQualifications.push(
      { region: this.user.dataRegion, level: '1', status: 'Qualified'});
  }
  deleteQual(index: number) {
    this.user.teacherQualifications.splice(index, 1);
  }
}
