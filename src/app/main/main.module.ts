import { SettingsPage } from './settings/settings';
// Modules
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { IonicModule } from '@ionic/angular';
import { MainRoutingModule } from './main-routing.module';
import { MarkdownModule } from 'ngx-markdown';
import { NgModule, ModuleWithProviders } from '@angular/core';

// Services
import { DateService } from 'src/app/service/DateService';
import { AppSettingsService } from 'src/app/service/AppSettingsService';
import { TranslationService } from 'src/app/service/TranslationService';
import { UserService } from 'src/app/service/UserService';
import { ConnectedUserService } from 'src/app/service/ConnectedUserService';

// Components
import { CameraIconComponent } from './widget/camera-icon-component';
import { HomeComponent } from './home/home.component';
import { HelpWidgetComponent } from './widget/help-widget-component';
import { SharingComponent } from './widget/sharing-component';
import { UserEditPage } from './user-edit/user-edit';
import { UserLoginComponent } from './user-login/user-login.component';
import { UserSelectorComponent } from './widget/user-selector-component';




@NgModule({
    declarations: [
        CameraIconComponent,
        HomeComponent, HelpWidgetComponent,
        SettingsPage, SharingComponent,
        UserLoginComponent, UserEditPage, UserSelectorComponent
    ],
    imports: [
        CommonModule,
        FormsModule,
        MainRoutingModule,
        IonicModule,
        MarkdownModule.forRoot({ loader: HttpClient }),
    ]
})
export class MainModule {}
