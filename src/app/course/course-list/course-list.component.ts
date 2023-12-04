import { Category } from 'typescript-logging';
import { logCourse } from 'src/app/logging-config';
import { ConnectedUserService } from 'src/app/service/ConnectedUserService';
import { DateService } from 'src/app/service/DateService';
import { AlertController, NavController } from '@ionic/angular';
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Course } from 'src/app/model/model';
import { CourseService } from 'src/app/service/CourseService';

const logger = new Category('course-list', logCourse);

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
  readonly = false;

  constructor(
    public alertCtrl: AlertController,
    private connectedUserService: ConnectedUserService,
    private courseService: CourseService,
    private dateService: DateService,
    private navController: NavController
    ) {
  }

  ngOnInit() {
    this.readonly = this.connectedUserService.getCurrentUser().role === 'LEARNER';
    this.searchCourses();
  }
  onSearchBarInput() {
    this.searchCourses();
  }
  searchCourses(forceServer: boolean = false, event: any = null) {
    // logger.debug(() => 'searchCourses ' + this.searchInput);
    this.courseService.search(this.searchInput, forceServer ? 'server' : 'default').subscribe((rcourse) => {
      this.courses = rcourse.data.sort((c1,c2) => c1.name.localeCompare(c2.name));
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
    logger.debug(() => 'onSwipe' + event);
    if (event.direction === 4) {
      this.navController.navigateRoot(`/home`);
    }
  }
}
