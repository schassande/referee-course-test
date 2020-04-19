import { logApp } from 'src/app/logging-config';
import { Category } from 'typescript-logging';
import { Component, OnInit, ElementRef, ViewChild } from '@angular/core';
import { map } from 'rxjs/operators';
import { AlertController, ToastController, NavController } from '@ionic/angular';
import { Observable, of, concat } from 'rxjs';
import { ConnectedUserService } from 'src/app/service/ConnectedUserService';
import { UserService } from 'src/app/service/UserService';
import { AppSettingsService } from 'src/app/service/AppSettingsService';
import { LocalAppSettings } from 'src/app/model/settings';
import { User } from 'src/app/model/model';

import { environment } from 'src/environments/environment';

const logger = new Category('settings', logApp);

/**
 * Generated class for the SettingsPage page.
 *
 * See http://ionicframework.com/docs/components/#navigation for more info
 * on Ionic pages and navigation.
 */
@Component({
  selector: 'page-settings',
  templateUrl: 'settings.html',
})
export class SettingsPage implements OnInit {

  settings: LocalAppSettings;
  msg: string[] = [];
  env = environment;
  launchMode = '';
  showDebugInfo = false;
  deferredPrompt;
  showInstallBtn = false;
  currentUser: User;

  constructor(
    private alertController: AlertController,
    private appSettingsService: AppSettingsService,
    private connectedUserService: ConnectedUserService,
    private navController: NavController,
    private toastController: ToastController,
    private userService: UserService
  ) {
  }

  ngOnInit() {
    this.installAsApp();
    this.computeLaunchMode();
    this.currentUser = this.connectedUserService.getCurrentUser();
    this.appSettingsService.get().subscribe((appSettings: LocalAppSettings) => {
      if (appSettings.forceOffline === undefined) {
        appSettings.forceOffline = false;
      }
      this.settings = appSettings;
    });
  }

  private installAsApp() {
    window.addEventListener('beforeinstallprompt', (e) => {
      // Prevent Chrome 67 and earlier from automatically showing the prompt
      // e.preventDefault();
      // Stash the event so it can be triggered later on the button event.
      this.deferredPrompt = e;
    // Update UI by showing a button to notify the user they can add to home screen
      this.showInstallBtn = true;
      this.launchMode += '<br>App can be installed.';
    });
    window.addEventListener('appinstalled', (event) => { this.launchMode += '<br>App installed'; });
  }

  private computeLaunchMode() {
    this.launchMode = '';
    if (window.hasOwnProperty('navigator') && window.navigator.hasOwnProperty('standalone')) {
      try {
        const nav: any = window.navigator;
        if (nav && nav.standalone === true) {
          this.launchMode += '<br>display-mode is standalone on iphone';
        } else {
          this.launchMode += '<br>display-mode is launch from Safari';
        }
      } catch (err) {
      }

    } else if (window.matchMedia('(display-mode: standalone)').matches) {
      this.launchMode += '<br>display-mode is standalone';

    } else {
      this.launchMode += '<br>display-mode is launch from web browser';
    }
  }

  public saveSettings(navigate = true) {
    this.appSettingsService.save(this.settings).pipe(
      map((settings: LocalAppSettings) => {
        this.settings = settings;
        if (navigate) {
          this.navController.navigateRoot(['/home']);
        }
      })
    ).subscribe();
  }

  public reloadPage() {
    // tslint:disable-next-line: deprecation
    window.location.reload(true);
  }

  private toast(msg: string) {
    this.toastController.create({
      message: msg,
      position: 'bottom',
      duration: 2000,
      translucent: true
    }).then((alert) => alert.present());
  }


  toggleDebugInfo() {
    this.showDebugInfo = ! this.showDebugInfo;
    // logger.debug(() => 'this.showDebugInfo =' + this.showDebugInfo);
  }

  onNbPeriodChange() {
    this.settings.nbPeriod = Math.min(4, Math.max(this.settings.nbPeriod, 1));
    this.saveSettings(false);
  }

  addToHome() {
    // hide our user interface that shows our button
    // Show the prompt
    this.deferredPrompt.prompt();
    // Wait for the user to respond to the prompt
    this.deferredPrompt.userChoice
      .then((choiceResult) => {
        if (choiceResult.outcome === 'accepted') {
          // .debug(() => 'User accepted the prompt');
        } else {
         //  logger.debug(() => 'User dismissed the prompt');
        }
        this.deferredPrompt = null;
      });
  }
  onSwipe(event) {
    // logger.debug(() => 'onSwipe ' + event);
    if (event.direction === 4) {
      this.navController.navigateRoot(`/home`);
    }
  }
}
