import { Component, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';

import { ConnectedUserService } from 'src/app/service/ConnectedUserService';
import { UserService, UserSearchCriteria } from 'src/app/service/UserService';
import { ResponseWithData } from 'src/app/service/response';

import { SharedWith } from 'src/app/model/model';
import { User } from 'src/app/model/model';
import { DataRegion } from 'functions/src/model';


@Component({
    selector: 'user-selector',
    template: `
<ion-content padding>
    <div style="margin: 20px;" i18n="@@user-selector.select-user">Select an user.</div>
    <ion-list>
      <ion-item-group style="width: 100%;">
        <ion-item-divider color="light">Filtering criteria</ion-item-divider>
        <ion-item>
          <ion-label>Name</ion-label>
          <ion-searchbar [(ngModel)]="searchInput" [showCancelButton]="false" (ionChange)="loadUser()"></ion-searchbar>
        </ion-item>
        <ion-item>
            <ion-label>Country</ion-label>
            <ion-select [(ngModel)]="country" interface="action-sheet" (ionChange)="loadUser()">
              <ion-select-option value="">All</ion-select-option>
              <ion-select-option *ngFor="let c of constantes.europeanCountries" value="{{c[0]}}">{{c[1]}}</ion-select-option>
            </ion-select>
        </ion-item>
        <ion-item>
            <ion-label>Region</ion-label>
            <ion-select [(ngModel)]="region" interface="action-sheet" (ionChange)="loadUser()">
                <ion-select-option value="">All</ion-select-option>
                <ion-select-option *ngFor="let r of constantes.regions" value="{{r}}">{{r}}</ion-select-option>
            </ion-select>
        </ion-item>
      </ion-item-group>
      </ion-item-group>
      <ion-item-group style="width: 100%;">
        <ion-item-divider color="light">Search result</ion-item-divider>
        <div *ngIf="loading" style="margin: 20px; text-align: center;"><ion-spinner></ion-spinner></div>
        <div *ngIf="!loading">
        <ion-item *ngFor="let user of users">
            <ion-icon slot="start" *ngIf="user.photo && !user.photo.url" name="person"></ion-icon>
            <ion-avatar slot="start" *ngIf="user.photo && user.photo.url"><img src="{{user.photo.url}}"></ion-avatar>
            <ion-label (click)="userSelected(user)">{{user.firstName}} {{user.lastName}}</ion-label>
        </ion-item>
    </ion-list>
</ion-content>`
  })
export class UserSelectorComponent implements OnInit {
    users: User[];
    error;
    searchInput: string = null;
    country: string = null;
    region: DataRegion = null;
    loading = true;

    constructor(
      public userService: UserService,
      public modalCtrl: ModalController,
      public connectedUserService: ConnectedUserService) {}

    ngOnInit() {
      this.loadUser();
    }

    loadUser() {
      const criteria: UserSearchCriteria = {
        country: this.country,
        region: this.region,
        text: this.searchInput
      };
      this.loading = true;
      this.userService.searchUsers(criteria).subscribe((response: ResponseWithData<User[]>) => {
        this.users = this.userService.sortUsers(response.data);
        this.error = response.error;
        this.loading = false;
      });
    }

    public userSelected(user: User): void {
      const sharedWith: SharedWith = {users : [user]};
      this.modalCtrl.dismiss(sharedWith);
    }
}
