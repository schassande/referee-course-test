import { logCourse } from 'src/app/logging-config';
import { Category } from 'typescript-logging';
import { LANGUAGES } from './../../model/model';
import { ConnectedUserService } from 'src/app/service/ConnectedUserService';
import { TranslationService } from 'src/app/service/TranslationService';
import { ResponseWithData } from 'src/app/service/response';
import { map, flatMap } from 'rxjs/operators';
import { Observable, of, forkJoin } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
import { DateService } from 'src/app/service/DateService';
import { CourseService } from 'src/app/service/CourseService';
import { AlertController, NavController, ToastController } from '@ionic/angular';
import { Course, Translation, Translatable } from 'src/app/model/model';
import { Component, OnInit, ChangeDetectorRef, ViewChild, ElementRef } from '@angular/core';

import * as csv from 'csvtojson';
const logger = new Category('course-edit', logCourse);

@Component({
  selector: 'app-course-edit',
  templateUrl: './course-edit.component.html',
  styleUrls: ['./course-edit.component.scss'],
})
export class CourseEditComponent implements OnInit {

  loading = false;
  courseId: string;
  course: Course;
  @ViewChild('inputCourse', null) inputCourse: ElementRef;
  readonly = false;

  constructor(
    private courseService: CourseService,
    private connectedUserService: ConnectedUserService,
    private dateService: DateService,
    private navController: NavController,
    private route: ActivatedRoute,
    private toastController: ToastController,
    private translationService: TranslationService
    ) {
  }

  public ngOnInit() {
    this.readonly = this.connectedUserService.getCurrentUser().role === 'LEARNER';
    this.loadParams().pipe(
      flatMap(() => this.courseId ? this.loadCourse() : this.createNewCourse())
    ).subscribe();
  }

  private loadParams(): Observable<any> {
    return this.route.paramMap.pipe(map((params) => {
      return this.courseId = params.get('id');
    }));
  }

  private loadCourse(): Observable<any> {
    logger.debug(() => 'load course by id: ' + this.courseId);
    this.loading = true;
    return this.courseService.get(this.courseId).pipe(
      map((rcourse) => this.course = rcourse.data),
      flatMap(() => {
        const obs: Observable<any>[] = [of('')];
        let lang = this.connectedUserService.getLang();
        if (this.course.test.supportedLanguages.indexOf(lang) < 0) {
          lang = this.course.test.supportedLanguages[0];
        }
        this.course.test.series.forEach(serie => {
          serie.questions.forEach(question => {
            obs.push(this.translationService.translate(question, lang));
            question.answers.forEach(answer => {
              obs.push(this.translationService.translate(answer, lang));
            });
          });
        });
        return forkJoin(obs);
      }),
      map(() => this.loading = false)
    );
  }

  private createNewCourse(): Observable<any> {
    logger.debug(() => 'Create new course');
    this.course = {
      id: '',
      dataRegion: 'Europe',
      creationDate: new Date(),
      lastUpdate: new Date(),
      dataStatus: 'NEW',
      version: new Date().getTime(),
      name: 'Referee Level 1',
      level: 1,
      theme: 'blue',
      enabled: true,
      allowedAlone: true,
      test: {
        version: '1.0',
        enabled: true,
        duration: 30,
        durationUnit: 'm',
        requiredScore: 23,
        nbQuestion: 30,
        supportedLanguages: ['en'],
        certificateTemplateUrl: '',
        series: [ {
          enabled: true,
          requiredScore: 27,
          passRequired: true,
          questions: [],
          nbQuestion: 30,
          selectionMode: 'RANDOM'
        }]
      }
    };
    return of({ error: null, data: this.course});
  }

  saveNback() {
    this.save().pipe(
      map((rcourse) => {
        if (!rcourse.error) {
          this.navController.navigateRoot('/course');
        }
      })).subscribe();
  }

  save(): Observable<ResponseWithData<Course>> {
    if (this.readonly) {
      return of({ data: this.course, error: null});
    }
    return this.courseService.save(this.course).pipe(
      map((rcourse) => {
        if (!rcourse.error) {
          this.course = rcourse.data;
          this.courseId = this.course.id;
        }
        logger.debug(() => 'Course saved: ' + this.course);
        return rcourse;
      }));
  }

  loadFile() {
    if (!this.readonly) {
      this.inputCourse.nativeElement.click();
    }
  }

  importCourse(event) {
    if (!this.readonly) {
      const reader: FileReader = new FileReader();
      reader.onloadend = () => {
        const importedCourse: Course = JSON.parse(reader.result.toString());
        logger.debug(() => 'Course imported: ' + JSON.stringify(importedCourse, null, 2));
        if (importedCourse.id === this.courseId) {
          this.course =  importedCourse;
          this.save().subscribe(() => {
            this.toastController.create({
              message: 'Couse updated.',
              position: 'bottom',
              duration: 4000,
              translucent: true
            }).then((alert) => alert.present());
          });
        }
      };
      reader.readAsText(event.target.files[0]);
    }
  }

  exportCourse() {
    this.save().pipe(
      // get a new instance of the course in order to clean the I18N texts
      flatMap(() => this.courseService.get(this.courseId)),
      map((rcourse) => {
        if (rcourse.data) {
          // clean i18n texts
          rcourse.data.test.series.forEach(serie => {
            serie.questions.forEach(question => {
              delete question.text;
              question.answers.forEach(answer => delete answer.text);
            });
          });
          const content = JSON.stringify(rcourse.data, null, 2);
          const oMyBlob = new Blob([content], {type : 'text/csv'});
          const url = URL.createObjectURL(oMyBlob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `Course_${this.course.name.replace(' ', '_')}_${
            this.dateService.date2string(new Date())}.json`;
          a.click();
          window.URL.revokeObjectURL(url);
          a.remove();
        } else {
          this.toastController.create({
            message: 'Couse cannot be download.',
            position: 'bottom',
            duration: 4000,
            translucent: true
          }).then((alert) => alert.present());
        }
      })
    ).subscribe();
  }

  onSwipe(event) {
    if (event.direction === 4) {
      this.navController.navigateRoot(`/course`);
    }
  }
}
