import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as promisePool from 'es6-promise-pool';
import { User } from './model';
import * as mailer          from './mailer';
const PromisePool = promisePool.default;

admin.initializeApp();
const firestore = admin.firestore();

// // Start writing Firebase Functions
// // https://firebase.google.com/docs/functions/typescript
//

////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Function sending an email to confirm a subscription.
 * Configure the email transport using the default SMTP transport and a GMail account.
 * Configure the `gmail.email` and `gmail.password` Google Cloud environment variables.
 */
export const sendEmailConfirmation = functions.firestore.document('User/{uid}').onCreate(async (snap) => {
  // get user detail
  const user: User = snap.data() as User;
  const email = user.email;
  const firstName = user.firstName;
  const lastName = user.lastName;
  const generatedPassword = user.generatedPassword;


  // Building Email message.
  const mailOptions = {
    to: email,
    subject: 'Welcome CoachReferee Exam!',
    html : `Hi ${firstName} ${lastName},<br>
<p>Thanks you for subscribing to our referee exam application.<br>
${generatedPassword ? '<br>Your generated password is ' + generatedPassword : ''}
Please visit our application: <a href="https://exam.coachreferee.com">https://exam.coachreferee.com</a>.</p>
<br>
Best regards,<br>
CoachReferee Examinator`
  };
  console.log('Sending message: ' + JSON.stringify(mailOptions, null, 2));
  try {
    await mailer.sendMail(mailOptions);
    console.log('New subscription confirmation email sent to:' + email);
  } catch(error) {
    console.error('There was an error while sending the email:', error);
  }
  return null;
});

////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////

/** Number of day of account inactivity before deletion */
const NB_DAY_THRESHOLD = 180;
/** Maximum concurrent account deletions. */
const MAX_CONCURRENT = 3;

/**
 * function deleting unused accounts.
 */
export const accountCleanup = functions.pubsub.schedule('every day 00:00').onRun(async context => {
  console.log('Scheduled Function accountCleanup begin: ' + context);
  // Fetch all user details.
  const inactiveUsers: UserToDelete[] = (await getInactiveUsers()).filter(u2d => u2d.toDelete);
  console.log('accountCleanup: ' + inactiveUsers.length + ' to delete.');
  if (inactiveUsers.length) {
    // Use a pool so that we delete maximum `MAX_CONCURRENT` users in parallel.
    const pool = new PromisePool(() => deleteInactiveUser(inactiveUsers), MAX_CONCURRENT);
    await pool.start();
  }
  console.log('Scheduled Function accountCleanup end');
});
export interface UserToDelete {
  firebaseId: string;
  appId: string;
  toDelete: boolean;
  firstName: string;
  lastName: string;
  email: string;
}

/**
 * Deletes one inactive user from the list.
 */
function deleteInactiveUser(inactiveUsers: UserToDelete[]): Promise<unknown>|void {
  if (inactiveUsers.length === 0) {
    return;
  }
  const userToDelete: UserToDelete = inactiveUsers.pop() as UserToDelete;
  
  // Delete the user.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new Promise((resolve: any) => {
    if (!userToDelete.toDelete) {
      resolve();
      return;
    }
    console.log('Deleting user account ' + userToDelete.firebaseId + '/' + userToDelete.appId + ' because of inactivity of ' + NB_DAY_THRESHOLD + ' days.');
    admin.auth().deleteUser(userToDelete.firebaseId).then(() => {
      // delete app user account
      if (userToDelete.appId) {
        firestore.collection('User').doc(userToDelete.appId).delete().then(() => {
          console.log('Deleted user account', userToDelete.appId, 'because of inactivity');
          sendDeleteEmail(userToDelete)
          resolve();
        }).catch((error) => {
          console.error('Deletion of inactive user app account ' + userToDelete.appId + ' failed:', error);
          resolve();
        });
      } else {
        resolve();
      }
    }).catch((error) => {
      console.error('Deletion of inactive user firebase account ' + userToDelete.firebaseId + ' failed:', error);
      resolve();
    });
  });
}

/**
 * Returns the list of all inactive users.
 */
async function getInactiveUsers(): Promise<UserToDelete[]> {
  const result = await admin.auth().listUsers(1000);
  // Find users to delete 
  return (await Promise.all(result.users.map(async (user) => {
    const u2d: UserToDelete = { 
      firebaseId: user.uid,
      appId: '',
      firstName: '',
      lastName: '',
      email:'',
      toDelete: false 
    };
  
    // not signed in in the last xxx days.
    const timeLimit: number = Date.now() - NB_DAY_THRESHOLD * 24 * 60 * 60 * 1000;
    const lastSignInTime: number = Date.parse(user.metadata.lastSignInTime);
    if (lastSignInTime > timeLimit) {
      console.log('Ignore ' + user.uid  + '/' + user.email + 'because of the time limit lastSignInTime=' + lastSignInTime + ', timeLimit=' + timeLimit);
      return Promise.resolve(u2d);
    }
    
    // check it is not teacher or administrator of the application
    const appUsers = await firestore.collection('User').where('accountId', '==', user.uid).get();
    if (appUsers.size === 1) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const appUser: User = appUsers.docs[0].data as any;
      if (appUser.role !== 'LEARNER') {
        console.log('Ignore' + user.uid + '/' + user.email + ' because is a ' + appUser.role);
        return Promise.resolve(u2d);
      }
      u2d.appId = appUser.id;
      u2d.firstName = appUser.firstName
      u2d.lastName = appUser.lastName
      u2d.email = appUser.email
      u2d.toDelete = true;
      console.log(user.uid  + '/' + user.email + ' has to be deleted: ' + JSON.stringify(u2d));
    } else if (appUsers.size === 0) {
      // the app user does not exist => delete it
      u2d.toDelete = true;
      console.log('Firebase user without app user' + user.uid + ' has to be deleted: ' + JSON.stringify(u2d));
    }
    return Promise.resolve(u2d); // means delete
  }))).filter(u => u.toDelete);
}
async function sendDeleteEmail(user: UserToDelete) {
  const email = user.email;
  const firstName = user.firstName;
  const lastName = user.lastName;

  // Building Email message.
  const mailOptions = {
    to: email,
    subject: 'CoachReferee Exam: account delete',
    html : `Hi ${firstName} ${lastName},<br>
<p>Your account on <a href="https://exam.coachreferee.com">https://exam.coachreferee.com</a> has been removed after a too long inactivity.<br>
<br>
Best regards,<br>
CoachReferee web admin`
  };
  console.log('Sending message: ' + JSON.stringify(mailOptions, null, 2));
  try {
    return await mailer.sendMail(mailOptions);
    console.log('New subscription confirmation email sent to:' + email);
  } catch(error) {
    console.error('There was an error while sending the email:', error);
    return null;
  }
}