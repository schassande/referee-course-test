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
  private sessions: Session[];
  private currentUser: User;

  constructor(
    public alertCtrl: AlertController,
    private changeDetectorRef: ChangeDetectorRef,
    private connectedUserService: ConnectedUserService,
    private sessionService: SessionService,
    private dateService: DateService,
    // private helpService: helpService,
    private navController: NavController
    ) {
  }

  ngOnInit() {
    console.log('SessionListComponent.ngOnInit()');
    // this.helpService.setHelp('course-list');
    this.currentUser = this.connectedUserService.getCurrentUser();
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
