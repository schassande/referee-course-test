import { logApp } from 'src/app/logging-config';
import { Category } from 'typescript-logging';
import { Injectable } from '@angular/core';
import * as firebase from 'firebase/app';
import { Observable, from } from 'rxjs';

const logger = new Category('file-upload', logApp);

@Injectable()
export class EmailService {

    constructor() {}

    public upload(storage, file): Observable<any> {
        const uploadTask = storage.put(file);
        const sessionUri = uploadTask.getUploadSessionUri();

        // Register three observers:
        // 1. 'state_changed' observer, called any time the state changes
        // 2. Error observer, called on failure
        // 3. Completion observer, called on successful completion
        return from(uploadTask.on('state_changed', (snapshot) => {
          // Observe state change events such as progress, pause, and resume
          // Get task progress, including the number of bytes uploaded and the total number of bytes to be uploaded
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          logger.debug(() => 'Upload is ' + progress + '% done');
          switch (snapshot.state) {
            case firebase.storage.TaskState.PAUSED: // or 'paused'
              logger.debug(() => 'Upload is paused');
              break;
            case firebase.storage.TaskState.RUNNING: // or 'running'
              logger.debug(() => 'Upload is running');
              break;
          }
        }, (error) => {
          // Handle unsuccessful uploads
        }, () => {
          // Handle successful uploads on complete
          // For instance, get the download URL: https://firebasestorage.googleapis.com/...
          uploadTask.snapshot.ref.getDownloadURL().then((downloadURL) => {
            logger.debug(() => 'File available at ' + downloadURL);
          });
        }));
    }
}
