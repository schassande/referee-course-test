// This file can be replaced during build by using the `fileReplacements` array.
// `ng build --prod` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
  production: false,
  firebaseConfig : {
    apiKey: 'AIzaSyD8ibJnxxxg0fD1wfddSVXfbiXrhd3V7DY',
    authDomain: 'referee-course-test.firebaseapp.com',
    databaseURL: 'https://referee-course-test.firebaseio.com',
    projectId: 'referee-course-test',
    storageBucket: 'referee-course-test.appspot.com',
    messagingSenderId: '18715023816',
    functionRegion: 'us-central1',
    functionOrigin: 'http://localhost:5001'
  },
  version: 'dev'
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/plugins/zone-error';  // Included with Angular CLI.
