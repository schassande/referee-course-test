import { logApp } from 'src/app/logging-config';
import { Category } from 'typescript-logging';
import { UserService } from 'src/app/service/UserService';
import { Component, OnInit, LOCALE_ID, Inject } from '@angular/core';
import { NavController, AlertController } from '@ionic/angular';
import { map } from 'rxjs/operators';
import { Session, User, Course, SessionParticipant } from 'src/app/model/model';
import { ConnectedUserService } from 'src/app/service/ConnectedUserService';
import { CourseService } from 'src/app/service/CourseService';
import { DateService } from 'src/app/service/DateService';
import { SessionService } from 'src/app/service/SessionService';
import { Observable } from 'rxjs';
import { ToolService } from 'src/app/service/ToolService';

const logger = new Category('home', logApp);

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
})
export class HomeComponent implements OnInit {

  readonly applicationLanguages = ['en', 'fr'];

  currentUser: User = null;
  showInstallBtn = false;
  deferredPrompt;
  sessionCode: string;
  learnerSessions: Session[] = [];
  teacherSessions: Session[] = [];
  individualCourses: Course[] = [];
  individualCourseId: string;
  groupCourses: Course[] = [];
  groupCourseId: string;
  teachers: User[] = [];
  teacherId: string;
  isTeacher = false;

  constructor(
      private alertCtrl: AlertController,
      private connectedUserService: ConnectedUserService,
      private courseService: CourseService,
      public dateService: DateService,
      private navController: NavController,
      private sessionService: SessionService,
      private toolService: ToolService,
      private userService: UserService,
      @Inject(LOCALE_ID) public localeId: string) {
  }

  public isLevelAdmin() {
      return this.currentUser && this.currentUser.role === 'ADMIN';
  }

  ngOnInit() {
    this.currentUser = this.connectedUserService.getCurrentUser();
    window.addEventListener('beforeinstallprompt', (e) => {
      // Prevent Chrome 67 and earlier from automatically showing the prompt
      e.preventDefault();
      // Stash the event so it can be triggered later on the button event.
      this.deferredPrompt = e;
    // Update UI by showing a button to notify the user they can add to home screen
      this.showInstallBtn = true;
    });
    window.addEventListener('appinstalled', (event) => logger.info(() => 'App installed'));
    this.loadTeacherSessions();
    this.loadLearnerSessions();
    this.loadCourses().subscribe();
    this.loadTeachers().subscribe();
  }

  loadCourses(): Observable<any> {
    return this.courseService.all().pipe(
      map((rcourses) => {
        if (rcourses.data) {
          this.individualCourses = rcourses.data
            .filter((course) => course.enabled && course.allowedAlone && course.dataRegion === this.currentUser.dataRegion)
            .sort((c1,c2) => c2.name.localeCompare(c1.name));
          if (this.individualCourses.length > 0) {
            this.individualCourseId = this.individualCourses[0].id;
          }
          this.groupCourses = rcourses.data
            .filter((course) => course.enabled && course.dataRegion === this.currentUser.dataRegion)
            .sort((c1,c2) => c2.name.localeCompare(c1.name));
          if (this.groupCourses.length > 0) {
            this.groupCourseId = this.groupCourses[0].id;
          }
        }
        })
    );
  }

  loadTeachers(): Observable<any> {
    return this.userService.findTeachers(null, this.currentUser.dataRegion).pipe(
      map((rusers) => {
        this.teachers = rusers.data;
        if (this.teachers && this.teachers.length > 0) {
          if (this.toolService.isValidString(this.currentUser.country)) {
            // try to filter the teachers from the same country
            const sameCountry = this.teachers.filter(t => t.country === this.currentUser.country);
            if (sameCountry.length > 0) {
              this.teachers = sameCountry;
            }
          }
          this.teachers.sort((u1,u2) => (u1.firstName+u1.lastName).localeCompare((u2.firstName+u2.lastName)));
          // Pick up randomly a teacher
          const teacherIdx: number = Math.round(Math.random() * 10000) % this.teachers.length;
          this.teacherId = this.teachers[teacherIdx].id;
          this.isTeacher = this.teachers.filter(t => t.id === this.currentUser.id).length > 0;
        } else {
          this.teacherId = null;
          this.isTeacher = false;
        }
      })
    );
  }

  createGroupSession() {
    const course: Course = this.groupCourses.find(c => c.id === this.groupCourseId);
    const teacher: User = this.teachers.find(u => u.id === this.currentUser.id); // teacher is the current user
    if (!course && !teacher) {
      return;
    }
    const session: Session = this.sessionService.newSession(course, teacher, this.currentUser.dataRegion);
    this.sessionService.save(session).subscribe((rsess) => {
      if (rsess.data) {
        this.navController.navigateRoot(`/session/edit/${rsess.data.id}`);
      }
    });
  }
  runInstantSession() {
    const course: Course = this.individualCourses.find(c => c.id === this.individualCourseId);
    const teacher: User = this.teachers.find(u => u.id === this.teacherId);
    if (!course && !teacher) {
      return;
    }
    const session: Session = this.sessionService.newSession(course, teacher, this.currentUser.dataRegion);
     // run immediately automatically
    session.autoPlay = true;
    session.status = 'STARTED';
    session.participantIds.push(this.currentUser.id);
    const participant: SessionParticipant = {
      person: this.userService.userToPersonRef(this.currentUser),
      questionAnswerIds: [],
      answeredQuestions: 0,
      seriesResult: [],
      pass: false,
      score: -1,
      requiredScore: course.test.requiredScore,
      maxScore: 0,
      percent: -1,
      failedQuestionIds: []
    };
    session.participants.push(participant);
    this.sessionService.save(session).subscribe((rsess) => {
      if (rsess.data) {
        this.navController.navigateRoot(`/session/play/${rsess.data.id}`);
      }
    });
  }
  getSessionResult(session: Session): string {
    const sIdx = session.participantIds.indexOf(this.currentUser.id);
    if (sIdx >= 0) {
      return session.participants[sIdx].percent + '% ' + (session.participants[sIdx].pass ? 'PASS' : 'FAIL');
    }
    return '?';
  }

   addToHome() {
    // hide our user interface that shows our button
    // Show the prompt
    this.deferredPrompt.prompt();
    // Wait for the user to respond to the prompt
    this.deferredPrompt.userChoice
      .then((choiceResult) => {
        if (choiceResult.outcome === 'accepted') {
          logger.debug(() => 'User accepted the prompt');
        } else {
          logger.debug(() => 'User dismissed the prompt');
        }
        this.deferredPrompt = null;
      });
  }

  private loadTeacherSessions() {
    if (this.currentUser.role === 'TEACHER' || this.currentUser.role === 'ADMIN') {
      this.sessionService.findTeacherSessions().subscribe((rsess) => {
        this.teacherSessions = this.limitArray(this.sessionService.sortSessionByStartDate(rsess.data, true)
          .filter(session => !session.autoPlay));
      });
    }
  }
  private limitArray(anArray: any[]): any[] {
    const limit = 3;
    return anArray && anArray.length > limit ? anArray.slice(0, limit) : anArray;
  }
  private loadLearnerSessions() {
    this.sessionService.findLearnerSessions().subscribe((rsess) => {
      this.learnerSessions = this.limitArray(this.sessionService.sortSessionByStartDate(rsess.data, true));
    });
  }
  registerToSession() {
    const code = this.sessionCode ? this.sessionCode.trim().toUpperCase() : '';
    this.sessionService.getByKeyCode(code).subscribe((rsess) => {
      const session: Session = rsess.data;
      let error: string = null;
      if (!session) {
        error = 'The session code is wrong.';
      } else if (session.status === 'CORRECTION' || session.status === 'CLOSED') {
        error = 'It is too late to join this session.';
      }
      if (error) {
        this.alertCtrl.create({ message: error, buttons: [{ text: 'Ok'}]}).then(a => a.present());
        return;
      }
      const sIdx = session.teacherIds.indexOf(this.currentUser.id);
      if (sIdx >= 0) { // already the teacher
        this.navController.navigateRoot('/session/edit/' +  session.id);
        return;
      }
      // add the learner
      if (this.sessionService.addLearner(session, this.currentUser)) {
        // save the modified session
        this.sessionService.save(session)
          .subscribe((rsess2) => this.routeLearnerSession(rsess2.data));
      } else {
        // The learner is already member of the session
        this.routeLearnerSession(rsess.data);
      }
    });
  }
  routeLearnerSession(session) {
    if (session.status === 'CLOSED') {
      this.navController.navigateRoot('/session/edit/' +  session.id);
    } else {
      this.navController.navigateRoot('/session/play/' +  session.id);
    }
  }
}
