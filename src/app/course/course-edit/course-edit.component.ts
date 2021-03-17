import { logCourse } from 'src/app/logging-config';
import { Category } from 'typescript-logging';
import { ConnectedUserService } from 'src/app/service/ConnectedUserService';
import { TranslationService } from 'src/app/service/TranslationService';
import { ResponseWithData } from 'src/app/service/response';
import { map, flatMap } from 'rxjs/operators';
import { Observable, of, forkJoin } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
import { DateService } from 'src/app/service/DateService';
import { CourseService } from 'src/app/service/CourseService';
import { NavController, ToastController, LoadingController, AlertController } from '@ionic/angular';
import { Answer, Course, Question, QuestionSerie} from 'src/app/model/model';
import { Component, OnInit, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';

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
  editMode = false;
  lang: string;

  constructor(
    private alertCtrl: AlertController,
    private changeDetectorRef: ChangeDetectorRef,
    private courseService: CourseService,
    private connectedUserService: ConnectedUserService,
    private dateService: DateService,
    private loadingController: LoadingController,
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
        this.lang = this.connectedUserService.getLang();
        if (this.course.test.supportedLanguages.indexOf(this.lang) < 0) {
          this.lang = this.course.test.supportedLanguages[0];
        }
        this.course.test.series.forEach(serie => {
          console.log('Serie ' + serie.serieName, serie.questions.length);
          serie.questions.forEach(question => {
            obs.push(this.translationService.translate(question, this.lang));
            question.answers.forEach(answer => {
              obs.push(this.translationService.translate(answer, this.lang));
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
      name: 'My course name',
      translationPrefix: this.courseService.generateTranslationPrefix(),
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
        supportedLanguages: ['EN'],
        certificateTemplateUrl: '',
        series: [ {
          enabled: true,
          requiredScore: 0,
          passRequired: true,
          questions: [],
          nbQuestion: 0,
          selectionMode: 'RANDOM'
        }]
      }
    };
    this.lang = this.course.test.supportedLanguages[0];
    return of({ error: null, data: this.course});
  }
  goToTranslation() {
    this.save().subscribe(() => this.navController.navigateRoot(`/course/translation/${this.courseId}`));
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
    logger.debug(() => 'before saving. this.course.id: ' + this.course.id);
    if (!this.course.id) {
      this.courseService.generateQuestions(this.course);
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
      this.loadingController.create({ message: 'Analysing file ...', translucent: true}).then((l) => l.present());
      const reader: FileReader = new FileReader();
      reader.onloadend = () => {
        const importedCourse: Course = JSON.parse(reader.result.toString());
        this.loadingController.dismiss();
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
            message: 'Couse cannot be downloaded.',
            position: 'bottom',
            duration: 4000,
            translucent: true
          }).then((alert) => alert.present());
        }
      })
    ).subscribe();
  }

  editQuestion(question: Question) {
    this.alertCtrl.create({
      message: 'Edit the title of the question ' + question.questionId + '?',
      inputs: [{ name: 'text', value: question.text, type: 'text'}],
      buttons: [
        { text: 'Cancel', role: 'cancel'},
        {
          text: 'Save',
          handler: (data) => {
            if (data.text) {
              this.translationService.setTranslation(question, this.lang, data.text, this.course.dataRegion)
                .subscribe(() => { this.changeDetectorRef.detectChanges(); });
            }
          }
        }
      ]
    }).then( (alert) => alert.present() );
  }
  editAnswer(question: Question, answer: Answer) {
    this.alertCtrl.create({
      message: 'Edit the answer ' + answer.answerId + ' of the question ' + question.questionId + '?',
      inputs: [{ name: 'text', value: answer.text, type: 'text'}],
      buttons: [
        { text: 'Cancel', role: 'cancel'},
        {
          text: 'Save',
          handler: (data) => {
            if (data.text) {
              this.translationService.setTranslation(answer, this.lang, data.text, this.course.dataRegion)
                .subscribe(() => { this.changeDetectorRef.detectChanges(); });
            }
          }
        }
      ]
    }).then( (alert) => alert.present() );
  }

  onToggleSelectionMode(serie: QuestionSerie) {
    if (serie.selectionMode === 'RANDOM') {
      serie.selectionMode = 'ALL';
    } else {
      serie.selectionMode = 'RANDOM';
    }
  }
  onToggleMulti(question: Question) {
    if (this.readonly || !this.editMode) {
      return;
    }
    if (question.questionType === 'UNIQUE') {
      question.questionType = 'COMBINATION';

    } else if (question.questionType === 'COMBINATION') {
      question.questionType = 'UNIQUE';
      const rightAnswers = question.answers.filter(a => a.right);
      if (rightAnswers.length > 1) {
        rightAnswers.forEach((rightAnswer, index) => {
          if (index > 0) {
            rightAnswer.right = false;
            rightAnswer.point = 0;
          }
        });
      }
    }
  }
  onNbQuestionChange() {
    if (this.course.test.series.length === 1) {
      this.course.test.series[0].nbQuestion = this.course.test.nbQuestion;
    }
  }
  toggleRightAnswer(question: Question, answer: Answer): boolean {
    if (this.readonly || !this.editMode) {
      return;
    }
    const rightAnswers: Answer[] = question.answers.filter((a) => a.right);
    if (answer.right) {
      // the user askes to mark the answer as wrong.
      if (question.questionType === 'UNIQUE') {
        // one right answer is required => ignore the user demand
        return false;

      } else if (question.questionType === 'COMBINATION') {
        if (rightAnswers.length < 2) {
          // one right answer is required => ignore the user demand
          return false;
        }
        const prevPoint = answer.point;
        answer.point = 0;
        answer.right = false;
        if (prevPoint) {
          // reallocate the point to the first right answer
          question.answers.filter((a) => a.right)[0].point = prevPoint;
        }
        return true;
      }

    } else if (!answer.right) {
      // the user askes to mark an answer as right.

      if (question.questionType === 'UNIQUE') {
        // switch the point from the other right answer
        answer.right = true;
        answer.point = rightAnswers[0].point;
        rightAnswers[0].right = false;
        rightAnswers[0].point = 0;

      } else if (question.questionType === 'COMBINATION') {
        answer.right = true;
        answer.point = 0;
      }
    }
  }

  deleteQuestion(serie: QuestionSerie, question: Question, qIdx: number) {
    this.alertCtrl.create({
      message: 'Do you reaaly want to delete the question ' + question.questionId + '?',
      buttons: [
        { text: 'Cancel', role: 'cancel'},
        {
          text: 'Delete',
          handler: () => {
            serie.questions.splice(qIdx, 1);
          }
        }
      ]
    }).then( (alert) => alert.present() );
  }

  addQuestion(serie: QuestionSerie) {
    this.courseService.addQuestion(this.course, serie);
  }
  onNbAnswerChange(question: Question, event) {
    if (this.readonly) {
      return;
    }
    const newNb = Number.parseInt(event.target.value, 10);
    this.courseService.setNbAnswer(question, newNb);
  }
  getNbAnswerChange(question: Question): number {
    return question.answers.length;
  }
  onSwipe(event) {
    if (event.direction === 4) {
      this.navController.navigateRoot(`/course`);
    }
  }
}
