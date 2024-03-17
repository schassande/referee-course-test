import { UserService } from 'src/app/service/UserService';
import { ConnectedUserService } from 'src/app/service/ConnectedUserService';
import { Component, OnInit } from '@angular/core';

import { Platform, MenuController, NavController } from '@ionic/angular';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss']
})
export class AppComponent implements OnInit {

  constructor(
    private navController: NavController,
    private platform: Platform,
    private userService: UserService,
    public connectedUserService: ConnectedUserService,
    private menu: MenuController
  ) {
  }


  ngOnInit() {
  }
  public route(url: string = '/home') {
    this.navController.navigateRoot(url);
    this.menu.close();
  }

  public reloadPage() {
    window.location.reload();
  }

  public logout() {
    this.userService.logout();
    this.route('/user/login');
  }
}
