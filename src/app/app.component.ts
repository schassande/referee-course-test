import { UserService } from 'src/app/service/UserService';
import { ConnectedUserService } from 'src/app/service/ConnectedUserService';
import { Component, OnInit } from '@angular/core';

import { Platform, MenuController, NavController } from '@ionic/angular';
import { SplashScreen } from '@ionic-native/splash-screen/ngx';
import { StatusBar } from '@ionic-native/status-bar/ngx';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss']
})
export class AppComponent implements OnInit {

  constructor(
    private navController: NavController,
    private platform: Platform,
    private splashScreen: SplashScreen,
    private statusBar: StatusBar,
    private userService: UserService,
    public connectedUserService: ConnectedUserService,
    private menu: MenuController
  ) {
    this.initializeApp();
  }

  initializeApp() {
    this.platform.ready().then(() => {
      this.statusBar.styleDefault();
      this.splashScreen.hide();
    });
  }

  ngOnInit() {
  }
  public route(url: string = '/home') {
    console.log('route(', url, ')');
    this.navController.navigateRoot(url);
    this.menu.close();
  }

  public reloadPage() {
    window.location.reload(true);
  }

  public logout() {
    this.userService.logout();
    this.route('/user/login');
  }
}
