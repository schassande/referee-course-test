import { logSession } from 'src/app/logging-config';
import { Category, ConsoleLoggerImpl } from 'typescript-logging';
import { ConnectedUserService } from 'src/app/service/ConnectedUserService';
import { DateService } from 'src/app/service/DateService';
import { AlertController, NavController } from '@ionic/angular';
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { SessionService } from 'src/app/service/SessionService';
import { Session, SessionStatus, User } from 'src/app/model/model';
import * as moment from 'moment';
import { AppSettingsService } from 'src/app/service/AppSettingsService';
import { map } from 'rxjs';


const logger = new Category('list', logSession);


@Component({
  selector: 'app-session-list',
  templateUrl: './session-list.component.html'
})
export class SessionListComponent implements OnInit {
  readonly PAGE_KEY = 'session-list';
  error: any;
  loading = false;
  sessions: Session[];
  currentUser: User;
  readonly = false;
  isAdmin = false;
  year: string;
  years: string[] = [];
  preferences = {
    searchInput: '',
    showIndividual: false,
    year: '',
    status: null as SessionStatus,
  }
  constructor(
    public alertCtrl: AlertController,
    private appSettingsService: AppSettingsService,
    private connectedUserService: ConnectedUserService,
    private sessionService: SessionService,
    public dateService: DateService,
    private navController: NavController
    ) {
  }

  ngOnInit() {
    this.currentUser = this.connectedUserService.getCurrentUser();
    this.isAdmin = this.connectedUserService.getCurrentUser().role === 'ADMIN';
    this.readonly = this.currentUser.role === 'LEARNER';
    const y = moment().year();
    this.year = '' + y;
    this.years.push('' + y)
    this.years.push('' + (y-1));
    this.years.push('' + (y-2));
    this.appSettingsService.getPagePreferences(this.PAGE_KEY).pipe(
      map((pref) => {
        this.preferences = (pref as any);
        this.setDefaultPagePreferences();
        this.searchSessions();
        return pref;
      })
    ).subscribe();
  }
  setDefaultPagePreferences() {
    if (!this.preferences) this.preferences = ({} as any)
    if (this.preferences.searchInput === undefined) this.preferences.searchInput = '';
    if (this.preferences.showIndividual  === undefined) this.preferences.showIndividual = false;
    if (this.preferences.year === undefined) this.preferences.year = '';
    if (this.preferences.status === undefined) this.preferences.status = null;
  }
  onSearchBarInput() {
    this.searchSessions();
  }
  searchSessions(forceServer: boolean = false, event: any = null) {
    this.appSettingsService.setPagePreferences(this.PAGE_KEY, this.preferences).subscribe();
    this.sessionService.search(this.preferences.searchInput, this.preferences.showIndividual, Number.parseInt(this.year, 10), this.preferences.status,
      forceServer ? 'server' : 'default').subscribe((rsession) => {
      this.sessions = this.sessionService.sortSessionByStartDate(rsession.data, true)
        .map(session => {
          // tslint:disable-next-line:no-string-literal
          session['isTeacher'] = session.teacherIds.indexOf(this.currentUser.id) >= 0;
          return session;
        });
      // console.log('Session loaded.')
    });
  }

  sessionSelected(session: Session) {
    this.navController.navigateRoot(`/session/edit/${session.id}`);
  }

  doRefresh(event) {
    this.searchSessions(false, event);
  }

  deleteItem(session: Session) {
    this.alertCtrl.create({
      message: 'Do you reaaly want to delete the course ' + session.keyCode + '?',
      buttons: [
        { text: 'Cancel', role: 'cancel'},
        {
          text: 'Delete',
          handler: () => {
            this.sessionService.delete(session.id).subscribe(() => {
              // console.log('session deleted');
              this.searchSessions();
            });
          }
        }
      ]
    }).then( (alert) => alert.present() );
  }

  newItem() {
    this.navController.navigateRoot(`/session/create`);
  }

  onSwipe(event) {
    if (event.direction === 4) {
      this.navController.navigateRoot(`/home`);
    }
  }
}
