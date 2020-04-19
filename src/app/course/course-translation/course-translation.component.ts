import { Category } from 'typescript-logging';
import { LANGUAGES } from './../../model/model';
import { ResponseWithData } from 'src/app/service/response';
import { map, flatMap } from 'rxjs/operators';
import { Observable, forkJoin, of } from 'rxjs';
import { Course, Translatable, Translation } from 'src/app/model/model';
import { TranslationService } from 'src/app/service/TranslationService';
import { ActivatedRoute } from '@angular/router';
import { NavController, AlertController, ToastController } from '@ionic/angular';
import { DateService } from 'src/app/service/DateService';
import { ConnectedUserService } from 'src/app/service/ConnectedUserService';
import { CourseService } from 'src/app/service/CourseService';
import { Component, OnInit, ElementRef, ViewChild } from '@angular/core';

import { parse, parseLines } from 'dot-properties';
import { logCourse } from 'src/app/logging-config';

const logger = new Category('course-translation', logCourse);

@Component({
  selector: 'app-course-translation',
  templateUrl: './course-translation.component.html',
  styleUrls: ['./course-translation.component.scss'],
})
export class CourseTranslationComponent implements OnInit {

  loading = false;
  courseId: string;
  course: Course;
  keys: string[] = [];
  missingTranslations: string[][] = [];
  percentTranslations: number[] = [];
  nbMissingTranslations = 0;
  @ViewChild('inputTranslate', null) inputTranslate: ElementRef;
  readonly = false;
  languages = LANGUAGES;

  constructor(
    public alertCtrl: AlertController,
    private courseService: CourseService,
    private connectedUserService: ConnectedUserService,
    private dateService: DateService,
    private navController: NavController,
    private route: ActivatedRoute,
    private toastController: ToastController,
    private translationService: TranslationService
  ) { }

  ngOnInit() {
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
    // logger.debug(() => 'load course by id: ' + this.courseId);
    this.loading = true;
    return this.courseService.get(this.courseId).pipe(
      map((rcourse) => this.course = rcourse.data),
      flatMap(() => this.compute()),
      map(() => this.loading = false)
    );
  }
  compute(): Observable<any> {
    this.computeKeys();
    return this.computeMissingTransactions();
  }
  computeKeys() {
    this.keys = [];
    this.course.test.series.forEach(serie => {
      serie.questions.forEach(question => {
        this.keys.push(question.key);
        question.answers.forEach(answer => {
          this.keys.push(answer.key);
        });
      });
    });
  }
  computeMissingTransactions(): Observable<any> {
    return forkJoin(this.course.test.supportedLanguages
      .map(lang => this.computeMissingTransactionsByLang(lang)));
  }

  computeMissingTransactionsByLang(lang: string): Observable<any> {
    this.missingTranslations[lang] = [];
    return forkJoin(this.keys.map(key => {
      return this.translationService.getTranslation(key, lang).pipe(
        map((trans) => {
          const tid = this.translationService.getTranslationId(key, lang);
          if (!trans) {
            // logger.debug(() => '******** Missing ' + tid);
            this.missingTranslations[lang].push(key);
          }
        })
      );
    })).pipe(
      map(() => {
        this.percentTranslations[lang] = Math.round(100 - ((this.missingTranslations[lang].length * 100) / this.keys.length));
        this.nbMissingTranslations = this.course.test.supportedLanguages.map((lg) => this.missingTranslations[lg].length)
          .reduce((a, b) => a + b);
        // logger.debug(() => '######## ' + lang + ' ' + this.percentTranslations[lang] + '%');
      })
    );
  }
  exportCourseLanguages() {
    const buttons: any[] = [];
    this.course.test.supportedLanguages.forEach(lang => {
      buttons.push({ text: lang, handler: () => this.exportCourseLanguage(lang) });
    });
    buttons.push({ text: 'Cancel', role: 'cancel'});
    this.alertCtrl.create({ message: 'Which language do you want to export?', buttons })
      .then( (alert) => alert.present() );
  }

  exportCourseLanguage(lang: string) {
    const obs: Observable<any>[] = [];
    let content = '';
    const extractTrad = (trans: Translatable) => {
      const trId = trans.key + '.' + lang.toLowerCase();
      obs.push(this.translationService.get(trId).pipe(
        map((rtrad) => {
          content += trId + '=' + (rtrad.data ? rtrad.data.text : '') + '\n';
        })
      ));
    };
    this.course.test.series.forEach(serie => {
      serie.questions.forEach(question => {
        extractTrad(question);
        question.answers.forEach(answer => {
          extractTrad(answer);
        });
      });
    });
    forkJoin(obs).subscribe((trads) => {
      const oMyBlob = new Blob([content], {type : 'text/csv'});
      const url = URL.createObjectURL(oMyBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Course_Translation_${this.course.name.replace(' ', '_')}_${lang}_${
        this.dateService.date2string(new Date())}.properties`;
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    });
  }
  loadFile() {
    if (!this.readonly) {
      this.inputTranslate.nativeElement.click();
    }
  }

  importTranslation(event) {
    if (!this.readonly) {
      const file = event.target.files[0];
      const reader: FileReader = new FileReader();
      reader.onloadend = () => {
        const lines = parseLines(reader.result as string);
        const obs: Observable<any>[] = [of('')];
        const nbs: number[] = [0, 0, 0];
        lines.forEach((line, idx) => {
          const transId = line[0];
          const text = line[1];
          if (text) { // a value is provided
            const dotIdx = transId.lastIndexOf('.');
            const lineKey = dotIdx > 0 ? transId.substring(0, dotIdx) : '';
            const lineLang = dotIdx > 0 ? transId.substring(dotIdx + 1) : '';
            // check it is a key of the course and it is a possible language
            if (this.keys.indexOf(lineKey) >= 0
                && this.course.test.supportedLanguages.indexOf(lineLang.toUpperCase()) >= 0) {
              obs.push(this.integrateTranslation(transId, text, nbs));
            } else {
              nbs[2]++;
              // logger.debug(() => 'Key ' + lineKey + ' for the language ' +  lineLang + ' has been ignored.');
            }
          }
        });
        forkJoin(obs).subscribe(() => {
          this.toastController.create({
            message: nbs[0] + ' updated, ' + nbs[1] + ' inserted, ' + nbs[2] + ' ignored.',
            position: 'bottom',
            duration: 4000,
            translucent: true
          }).then((alert) => alert.present());
        });
      };
      reader.readAsText(file);
    }
  }

  integrateTranslation(transId: string, text: string, nbs: number[]): Observable<any> {
    return this.translationService.get(transId).pipe(
      flatMap((rtrans) => {
        let translation: Translation = rtrans.data;
        if (rtrans.data) {
          translation.text = text;
          nbs[0]++;
          // logger.debug(() => 'Update translation ' + transId + ' with ' + text);
        } else {
          translation = {
            version: new Date().getTime(),
            creationDate: new Date(),
            lastUpdate: new Date(),
            dataStatus: 'NEW',
            dataRegion: this.course.dataRegion,
            id: transId,
            text
          };
          nbs[1]++;
          // logger.debug(() => 'NEW translation ' + transId + ' with ' + text);
        }
        return this.translationService.save(translation);
      })
    );
  }

  toggleLanguage(lang: string, event) {
    if (event.detail.checked) {
      this.course.test.supportedLanguages.push(lang);
    } else {
      const idx = this.course.test.supportedLanguages.indexOf(lang);
      if (idx > 0) {
        this.course.test.supportedLanguages.splice(idx, 1);
      }
    }
    this.loading = true;
    this.save().pipe(
      flatMap(() => this.compute()),
      map(() => this.loading = false)
    ).subscribe();
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
        // .debug(() => 'Course saved: ' + JSON.stringify(this.course, null, 2));
        return rcourse;
      }));
  }
  back() {
    this.navController.navigateRoot(`/course/edit/${this.courseId}`);
  }
  onSwipe(event) {
    if (event.direction === 4) {
      this.back();
    }
  }
}
