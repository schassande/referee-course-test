import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { AlertController } from '@ionic/angular';
import { Session, User } from 'src/app/model/model';
import { ConnectedUserService } from 'src/app/service/ConnectedUserService';
import { DateService } from 'src/app/service/DateService';
import { SessionService } from 'src/app/service/SessionService';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
})
export class HomeComponent implements OnInit {


  currentUser: User = null;
  showInstallBtn = false;
  deferredPrompt;
  sessionCode: string;
  learnerSessions: Session[] = [];
  teacherSessions: Session[] = [];

  constructor(
      private alertCtrl: AlertController,
      private connectedUserService: ConnectedUserService,
      public dateService: DateService,
      private sessionService: SessionService,
      private changeDetectorRef: ChangeDetectorRef) {
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
    window.addEventListener('appinstalled', (event) => console.log('App installed'));
    this.loadMySessions();
  }

  addToHome() {
    // hide our user interface that shows our button
    // Show the prompt
    this.deferredPrompt.prompt();
    // Wait for the user to respond to the prompt
    this.deferredPrompt.userChoice
      .then((choiceResult) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('User accepted the prompt');
        } else {
          console.log('User dismissed the prompt');
        }
        this.deferredPrompt = null;
      });
  }

  private loadMySessions() {
    this.loadTeacherSessions();
    this.loadLearnerSessions();
  }
  private loadTeacherSessions() {
    if (this.currentUser.role === 'TEACHER' || this.currentUser.role === 'ADMIN') {
      this.sessionService.findTeacherSessions().subscribe((rsess) => {
        this.teacherSessions = rsess.data;
        console.log('this.teacherSessions', this.teacherSessions)
      });
    }
  }
  private loadLearnerSessions() {
    if (this.currentUser.role === 'TEACHER' || this.currentUser.role === 'ADMIN') {
      this.sessionService.findLearnerSessions().subscribe((rsess) => {
        this.learnerSessions = rsess.data;
        console.log('this.learnerSessions', this.learnerSessions)
      });
    }
  }
}
