import { DateService } from 'src/app/service/DateService';
import { AlertController, NavController } from '@ionic/angular';
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Course } from 'src/app/model/model';
import { CourseService } from 'src/app/service/CourseService';

@Component({
  selector: 'app-course-list',
  templateUrl: './course-list.component.html',
  styleUrls: ['./course-list.component.scss'],
})
export class CourseListComponent implements OnInit {

  error: any;
  searchInput: string;
  loading = false;
  courses: Course[];

  constructor(
    public alertCtrl: AlertController,
    private changeDetectorRef: ChangeDetectorRef,
    private courseService: CourseService,
    private dateService: DateService,
    // private helpService: helpService,
    private navController: NavController
    ) {
  }

  ngOnInit() {
    // this.helpService.setHelp('course-list');
    this.searchCourses();
  }
  onSearchBarInput() {
    this.searchCourses();
  }
  searchCourses(forceServer: boolean = false, event: any = null) {
    this.courseService.search(this.searchInput, forceServer ? 'server' : 'default').subscribe((rcourse) => {
      this.courses = rcourse.data;
    });
  }

  courseSelected(course: Course) {
    this.navController.navigateRoot(`/course/edit/${course.id}`);
  }

  doRefresh(event) {
    this.searchCourses(false, event);
  }

  deleteItem(course: Course) {
    this.alertCtrl.create({
      message: 'Do you reaaly want to delete the course ' + course.name + '?',
      buttons: [
        { text: 'Cancel', role: 'cancel'},
        {
          text: 'Delete',
          handler: () => {
            this.courseService.delete(course.id).subscribe(() => this.searchCourses());
          }
        }
      ]
    }).then( (alert) => alert.present() );
  }

  newItem() {
    this.navController.navigateRoot(`/course/create`);
  }

  onSwipe(event) {
    // console.log('onSwipe', event);
    if (event.direction === 4) {
      this.navController.navigateRoot(`/home`);
    }
  }
}
