import { Category } from 'typescript-logging';
import { DateService } from 'src/app/service/DateService';
import { UserSelectorComponent } from './../../main/widget/user-selector-component';
import { User, SharedWith, CONSTANTES } from 'src/app/model/model';
import { AlertController, NavController, ModalController } from '@ionic/angular';
import { ConnectedUserService } from 'src/app/service/ConnectedUserService';
import { UserService } from 'src/app/service/UserService';
import { Component, OnInit } from '@angular/core';
import { logTeacher } from 'src/app/logging-config';
import { map, flatMap, mergeMap } from 'rxjs/operators';
import { AlertInput } from '@ionic/core';
import { ToolService } from 'src/app/service/ToolService';

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
  country2Teachers: Map<string,User[]> = new Map();
  showByCountry = true;
  speakingLanguage = '';
  constantes = CONSTANTES;

  constructor(
    public alertCtrl: AlertController,
    private connectedUserService: ConnectedUserService,
    public dateService: DateService,
    private modalController: ModalController,
    private navController: NavController,
    public toolService: ToolService,
    private userService: UserService) { }

  ngOnInit() {
    this.readonly = this.connectedUserService.getCurrentUser().role === 'LEARNER';
    this.isAdmin = this.connectedUserService.getCurrentUser().role === 'ADMIN';
    this.searchTeachers();
  }
  searchTeachers() {
    this.loading = true;
    const region = this.connectedUserService.getCurrentUser().dataRegion;
    this.userService.findTeachers(this.searchInput, region, this.speakingLanguage).subscribe((ruser) => {
      this.teachers = !ruser.data ? [] : ruser.data.sort((u1,u2) => this.sortTeachers(u1,u2));
      const c2ts: Map<string,User[]> = new Map();
      this.teachers.forEach(teacher => {
        let ts: User[] = c2ts.get(teacher.country);
        if (!ts) {
          ts = [];
          c2ts.set(teacher.country, ts);
        }
        ts.push(teacher);
      });
      this.country2Teachers = c2ts;
      this.loading = false;
    });
  }

  sortTeachers(t1: User, t2: User) {
    let res = 0;
    if (res === 0
        && this.toolService.isValidString(t1.country)
        && this.toolService.isValidString(t2.country)) {
      res = t1.country.localeCompare(t2.country);
    }
    if (res === 0) {
      res = this.getFullUserName(t1).localeCompare(this.getFullUserName(t2));
    }
    return res;
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
                mergeMap(() => this.userService.notifyNewTeacher(user.id)),
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
