import { ConnectedUserService } from 'src/app/service/ConnectedUserService';
import { DateService } from 'src/app/service/DateService';
import { AlertController, NavController } from '@ionic/angular';
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { SessionService } from 'src/app/service/SessionService';
import { Session, User } from 'src/app/model/model';

@Component({
  selector: 'app-session-list',
  templateUrl: './session-list.component.html',
  styleUrls: ['./session-list.component.scss'],
})
export class SessionListComponent implements OnInit {
  error: any;
  searchInput: string;
  loading = false;
  sessions: Session[];
  currentUser: User;
  readonly = false;

  constructor(
    public alertCtrl: AlertController,
    private connectedUserService: ConnectedUserService,
    private sessionService: SessionService,
    public dateService: DateService,
    private navController: NavController
    ) {
  }

  ngOnInit() {
    this.currentUser = this.connectedUserService.getCurrentUser();
    this.readonly = this.currentUser.role === 'LEARNER';
    this.searchSessions();
  }
  onSearchBarInput() {
    this.searchSessions();
  }
  searchSessions(forceServer: boolean = false, event: any = null) {
    this.sessionService.search(this.searchInput, forceServer ? 'server' : 'default').subscribe((rsession) => {
      this.sessions = this.sessionService.sortSessionByStartDate(rsession.data, true);
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
            this.sessionService.delete(session.id).subscribe(() => this.searchSessions());
          }
        }
      ]
    }).then( (alert) => alert.present() );
  }

  newItem() {
    this.navController.navigateRoot(`/session/create`);
  }

  onSwipe(event) {
    // console.log('onSwipe', event);
    if (event.direction === 4) {
      this.navController.navigateRoot(`/home`);
    }
  }
}
