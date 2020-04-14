import { ConnectedUserService } from 'src/app/service/ConnectedUserService';
import { TranslationService } from 'src/app/service/TranslationService';
import { ResponseWithData } from 'src/app/service/response';
import { map, flatMap } from 'rxjs/operators';
import { Observable, of, forkJoin } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
import { DateService } from 'src/app/service/DateService';
import { CourseService } from 'src/app/service/CourseService';
import { AlertController, NavController } from '@ionic/angular';
import { Course, Translation } from 'src/app/model/model';
import { Component, OnInit, ChangeDetectorRef, ViewChild, ElementRef } from '@angular/core';

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
    public alertCtrl: AlertController,
    private courseService: CourseService,
    private connectedUserService: ConnectedUserService,
    private dateService: DateService,
    // private helpService: helpService,
    private navController: NavController,
    private route: ActivatedRoute,
    private translationService: TranslationService
    ) {
  }

  ngOnInit() {
    // this.helpService.setHelp('course-list');
    this.readonly = this.connectedUserService.getCurrentUser().role === 'LEARNER';
    this.loadParams().pipe(
      flatMap(() => this.loadCourse())
    ).subscribe();
  }

  loadParams(): Observable<any> {
    return this.route.paramMap.pipe(map((params) => {
      return this.courseId = params.get('id');
    }));
  }

  loadCourse(): Observable<any> {
    if (this.courseId) {
      console.log('load course by id: ' + this.courseId);
      this.loading = true;
      return this.courseService.get(this.courseId).pipe(
        map((rcourse) => this.course = rcourse.data),
        flatMap(() => {
          const obs: Observable<any>[] = [];
          this.course.test.series.forEach(serie => {
            serie.questions.forEach(question => {
              obs.push(this.translationService.translate(question));
              question.answers.forEach(answer => {
                obs.push(this.translationService.translate(answer));
              });
            });
          });
          return forkJoin(obs);
        }),
        map(() => this.loading = false)
      );
    } else {
      console.log('Create new course');
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
          series: [ { enabled: true, requiredScore: 27, passRequired: true, questions: [], nbQuestion: 30 } ]
        }
      };
      return of({ error: null, data: this.course});
    }
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
        }
        console.log('Course saved: ', this.course);
        return rcourse;
      }));
  }
  loadFile() {
    if (!this.readonly) {
      this.inputCourse.nativeElement.click();
    }
  }

  importCourseFromCsv(event) {
    if (!this.readonly) {
      this.analayse(event.target.files[0]);
    }
  }

  private analayse(file) {
    const reader: FileReader = new FileReader();
    reader.onloadend = () => {
      // console.log('analayse file: ', reader.result);
      const data: any = JSON.parse(reader.result.toString());
      // console.log('Imported course: ', JSON.stringify(data.course, null, 2));
      this.course = { ...this.course, ...data.course };
      console.log('Course imported: ', JSON.stringify(this.course, null, 2));
      // console.log('translations: ', data.translations);
      const obs: Observable<any>[] = [];
      obs.push(this.save());
      // tslint:disable-next-line:prefer-for-of
      for (let i = 0; i < data.translations.length; i++) {
        const translation = data.translations[i];
        // tslint:disable-next-line:prefer-for-of
        for (let j = 0; j < translation.texts.length; j++) {
          const txt = translation.texts[j];
          const trId: string = translation.id + '.' + txt.lang;
          obs.push(this.translationService.get(trId).pipe(
            flatMap((rtrad) => {
              if (rtrad.data) {
                rtrad.data.text = txt.text;
                return this.translationService.save(rtrad.data);
              } else {
                const trad: Translation = {
                  version: new Date().getTime(),
                  creationDate: new Date(),
                  lastUpdate: new Date(),
                  dataStatus: 'NEW',
                  dataRegion: 'Europe',
                  id: trId,
                  text: txt.text
                };
                return this.translationService.save(trad);
              }
            })
          ));
        }
      }
      forkJoin(obs).subscribe(() => console.log('Imported.'));
    };
    reader.readAsText(file);
  }
  onSwipe(event) {
    if (event.direction === 4) {
      this.navController.navigateRoot(`/course`);
    }
  }
}
