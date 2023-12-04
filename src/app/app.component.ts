import { UserService } from 'src/app/service/UserService';
import { ConnectedUserService } from 'src/app/service/ConnectedUserService';
import { Component, OnInit } from '@angular/core';

import { Platform, MenuController, NavController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { I18NService } from './service/I18NService';
import { SupportedLanguages } from './model/settings';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss']
})
export class AppComponent implements OnInit {

  constructor(
    private navController: NavController,
    private userService: UserService,
    public connectedUserService: ConnectedUserService,
    private menu: MenuController,
    public i18N: I18NService
  ) {
  }

  public ngOnInit(): void {
      this.i18N.initlang();
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
  public switchLanguage(lang: SupportedLanguages) {
    this.i18N.switchTo(lang);
  }
}
