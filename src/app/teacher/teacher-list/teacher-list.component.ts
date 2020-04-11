import { UserSelectorComponent } from './../../main/widget/user-selector-component';
import { User, SharedWith } from 'src/app/model/model';
import { AlertController, NavController, ModalController } from '@ionic/angular';
import { ConnectedUserService } from 'src/app/service/ConnectedUserService';
import { UserService } from 'src/app/service/UserService';
import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-teacher-list',
  templateUrl: './teacher-list.component.html',
  styleUrls: ['./teacher-list.component.scss'],
})
export class TeacherListComponent implements OnInit {

  teachers: User[];

  constructor(
    public alertCtrl: AlertController,
    private connectedUserService: ConnectedUserService,
    private modalController: ModalController,
    private navController: NavController,
    private userService: UserService) { }

  ngOnInit() {
    this.loadTeachers();
  }

  loadTeachers() {
    const region = this.connectedUserService.getCurrentUser().dataRegion;
    this.userService.findTeachers(region).subscribe((ruser) => {
      this.teachers = ruser.data;
    });
  }

  async addTeacher() {
    const modal = await this.modalController.create({ component: UserSelectorComponent});
    modal.onDidDismiss().then( (data) => {
      const sharedWith: SharedWith = data.data as SharedWith;
      if (sharedWith) {
        sharedWith.users.forEach((user) => {
          if (user.role === 'LEARNER') {
            user.role = 'TEACHER';
            this.userService.save(user).subscribe(() => this.loadTeachers());
          }
        });
      }
    });
    modal.present();
  }

  deleteTeacher(user: User) {
      if (user.role === 'TEACHER') {
        user.role = 'LEARNER';
        this.userService.save(user).subscribe(() => this.loadTeachers());
      }
  }
}
