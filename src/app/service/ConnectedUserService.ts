import { logUser } from 'src/app/logging-config';
import { Category } from 'typescript-logging';
import { AppSettingsService } from './AppSettingsService';
import { Injectable, EventEmitter, Type } from '@angular/core';
import { User } from './../model/model';
import * as firebase from 'firebase/app';
import { UserCredential } from '@firebase/auth-types';

const logger = new Category('connected', logUser);

@Injectable({ providedIn: 'root' })
export class ConnectedUserService {

  /** The current user */
  private currentUser: User = null;
  private credential: UserCredential = null;

  /** The event about user connection */
  public $userConnectionEvent: EventEmitter<User> = new EventEmitter<User>();

  constructor(
      public appSettingsService: AppSettingsService) {
  }

  public isOnline(): boolean {
    return navigator.onLine;
  }
  public isConnected(): boolean {
    return this.currentUser && this.currentUser !== null;
  }
  public isLogin(): boolean {
    return this.currentUser && this.currentUser !== null
      && this.currentUser.token && this.currentUser.token != null;
  }
  public getCurrentUser(): User {
    return this.currentUser;
  }
  public getLang(): string {
    return this.currentUser && this.currentUser.speakingLanguages && this.currentUser.speakingLanguages.length
      ? this.currentUser.speakingLanguages[0].toLowerCase()
      : 'en';
  }

  public userConnected(user: User, credential: UserCredential) {
    this.currentUser = user;
    if (credential !== null || this.credential === null || this.credential.user.email !== user.email) {
      // set the new credential or clean if user is
      this.credential = credential;
    } // else keep the credential because it is same user
    logger.info(() => 'User connected: ' + this.currentUser.email);
    this.$userConnectionEvent.emit(this.currentUser);
  }
  public userDisconnected() {
    this.currentUser = null;
    // keep the credential in case of
    logger.info(() => 'User disconnected.');
    this.$userConnectionEvent.emit(this.currentUser);
  }
}
