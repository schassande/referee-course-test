import { Category } from 'typescript-logging';
import { DateService } from 'src/app/service/DateService';
import { UserSelectorComponent } from './../../main/widget/user-selector-component';
import { User, SharedWith } from 'src/app/model/model';
import { AlertController, NavController, ModalController } from '@ionic/angular';
import { ConnectedUserService } from 'src/app/service/ConnectedUserService';
import { UserService } from 'src/app/service/UserService';
import { Component, OnInit } from '@angular/core';
import { logTeacher } from 'src/app/logging-config';
import { map, flatMap } from 'rxjs/operators';
import { AlertInput } from '@ionic/core';

const logger = new Category('play', logTeacher);

@Component({
  selector: 'app-teacher-list',
  templateUrl: './teacher-list.component.html'
})
export class TeacherListComponent implements OnInit {

  teachers: User[] = [];
  readonly = false;
  isAdmin = false;
  loading = false;
  searchInput: string;

  constructor(
    public alertCtrl: AlertController,
    private connectedUserService: ConnectedUserService,
    public dateService: DateService,
    private modalController: ModalController,
    private navController: NavController,
    private userService: UserService) { }

  ngOnInit() {
    this.readonly = this.connectedUserService.getCurrentUser().role === 'LEARNER';
    this.isAdmin = this.connectedUserService.getCurrentUser().role === 'ADMIN';
    this.searchTeachers();
  }
  searchTeachers() {
    this.loading = true;
    const region = this.connectedUserService.getCurrentUser().dataRegion;
    this.userService.findTeachers(this.searchInput, region).subscribe((ruser) => {
      this.teachers = !ruser.data ? [] : ruser.data.sort(
        (t1: User, t2: User) => this.getFullUserName(t1).localeCompare(this.getFullUserName(t2)));
      this.loading = false;
    });
  }

  async addTeacher() {
    if (this.readonly) {
      const inputs: AlertInput[] = this.teachers.map((t) => {
        return { type: 'radio', label: '' + t.firstName + ' ' + t.lastName, value: t.id, checked: false } as AlertInput;
      });
      this.alertCtrl.create({
        message: 'Do you want to ask to an existing teacher you know, to grant you as teacher?',
        inputs,
        buttons: [
          { text: 'Cancel', role: 'cancel'},
          {
            text: 'Ask',
            handler: (teacherId: string) => {
              console.log('Ask to ', teacherId);
              this.userService.askToBecomeTeacher(
                this.connectedUserService.getCurrentUser().id,
                teacherId).subscribe();
            }
          }
        ]
      }).then( (alert) => alert.present() );

    } else {
      const modal = await this.modalController.create({ component: UserSelectorComponent});
      modal.onDidDismiss().then( (data) => {
        const sharedWith: SharedWith = data.data as SharedWith;
        if (sharedWith) {
          sharedWith.users.forEach((user) => {
            if (user.role === 'LEARNER') {
              user.role = 'TEACHER';
              this.userService.save(user).pipe(
                flatMap(() => this.userService.notifyNewTeacher(user.id)),
                map(() => this.searchTeachers()),
              ).subscribe();
            }
          });
        }
      });
      modal.present();
    }
  }

  deleteTeacher(user: User) {
    if (user.role === 'TEACHER') {
      this.alertCtrl.create({
        message: 'Do you reaaly want to remove the teacher right to the user ' + user.firstName + ' ' + user.lastName + '?',
        buttons: [
          { text: 'Cancel', role: 'cancel'},
          {
            text: 'Remove rights',
            handler: () => {
              user.role = 'LEARNER';
              this.userService.save(user).subscribe(() => this.searchTeachers());
                }
          }
        ]
      }).then( (alert) => alert.present() );
    }
  }

  onSwipe(event) {
    if (event.direction === 4) {
      this.navController.navigateRoot(`/home`);
    }
  }

  getFullUserName(u: User) {
    return u.firstName + '_' + u.lastName;
  }
}
