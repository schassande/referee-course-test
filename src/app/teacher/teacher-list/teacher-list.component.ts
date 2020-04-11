import { User } from 'src/app/model/model';
import { AlertController, NavController } from '@ionic/angular';
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
    private navController: NavController,
    private userService: UserService) { }

  ngOnInit() {
    this.loadTeachers();
  }

  loadTeachers() {
    const region = this.connectedUserService.getCurrentUser().dataRegion;
    this.userService.findTeachers(region).subscribe((ruser) => {
      console.log('findTeachers(): ', ruser.data);
      this.teachers = ruser.data;
    });
  }

  addTeacher() {
  }
  deleteTeacher(user: User) {
      if (user.role === 'TEACHER') {
        user.role = 'LEARNER';
      }
  }
}
