import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as nodemailer from 'nodemailer';
import * as promisePool from 'es6-promise-pool';
import { User } from './model';
const PromisePool = promisePool.default;

admin.initializeApp();
const firestore = admin.firestore();

const gmailEmail = "coachreferee@gmail.com"; // functions.config().gmail.email;
const gmailPassword = "Lm2pCRanpo."; // functions.config().gmail.password;
const mailTransport = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: gmailEmail,
    pass: gmailPassword,
  },
});

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
export const sendEmailConfirmation = functions.firestore.document('User/{uid}').onCreate(async (snap, context) => {
  // get user detail
  const user: any = snap.data();
  const email = user.email;
  const firstName = user.firstName;
  const lastName = user.lastName;
  const generatedPassword = user.generatedPassword;


  // Building Email message.
  const mailOptions: any = {
    from: `"CoachReferee" <${gmailEmail}>`,
    to: email,
    bcc: gmailEmail,
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
    await mailTransport.sendMail(mailOptions);
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
const NB_DAY_THRESHOLD = 365;
/** Maximum concurrent account deletions. */
const MAX_CONCURRENT = 3;

/**
 * function deleting unused accounts.
 */
export const accountCleanup = functions.pubsub.schedule('every day 00:00').onRun(async context => {
  console.log('accountCleanup begin')
  // Fetch all user details.
  const inactiveUsers: UserToDelete[] = await getInactiveUsers();
  console.log('accountCleanup: ' + inactiveUsers.length + ' to delete.');
  if (inactiveUsers.length) {
    // Use a pool so that we delete maximum `MAX_CONCURRENT` users in parallel.
    const pool = new PromisePool(() => deleteInactiveUser(inactiveUsers), MAX_CONCURRENT);
    await pool.start();
  }
  console.log('User cleanup finished');
  // TODO send an email to admin with the list of deleted users.

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
function deleteInactiveUser(inactiveUsers: UserToDelete[]): Promise<any>|void {
  if (inactiveUsers.length === 0) {
    return;
  }
  const userToDelete: UserToDelete = inactiveUsers.pop() as UserToDelete;
  
  // Delete the user.
  return new Promise((resolve: any) => {
    if (!userToDelete.toDelete) {
      resolve();
      return;
    }
    console.log('Deleting user account ' + userToDelete.firebaseId + '/' + userToDelete.appId + ' because of inactivity of ' + NB_DAY_THRESHOLD + ' days.');
    resolve();
/*    
    admin.auth().deleteUser(userToDelete.firebaseId).then(() => {
      // delete app user account
      firestore.collection('User').doc(userToDelete.appId).delete().then(() => {
        console.log('Deleted user account', userToDelete.appId, 'because of inactivity');
        sendDeleteEmail(userToDelete)
        resolve();
      }).catch((error) => {
        console.error('Deletion of inactive user app account ' + userToDelete.appId + ' failed:', error);
        resolve();
      });
    }).catch((error) => {
      console.error('Deletion of inactive user firebase account ' + userToDelete.firebaseId + ' failed:', error);
      resolve();
    });
*/
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
    if (Date.parse(user.metadata.lastSignInTime) > (Date.now() - NB_DAY_THRESHOLD * 24 * 60 * 60 * 1000)) {
      return Promise.resolve(u2d);
    }
    
    // check it is not teacher or administrator of the application
    const appUsers = await firestore.collection('User').where('accountId', '==', user.uid).get();
    if (appUsers.size === 1) {
      const appUser: User = appUsers.docs[0].data as any;
      if (appUser.role !== 'LEARNER') {
        return Promise.resolve(u2d);
      }
      u2d.appId = appUser.id;
      u2d.firstName = appUser.firstName
      u2d.lastName = appUser.lastName
      u2d.email = appUser.email
    } // else the user does not exist => delete it

    u2d.toDelete = true;
    return Promise.resolve(u2d); // means delete
  }))).filter(u => u.toDelete);
}

function sendDeleteEmail(user: UserToDelete) {
  const email = user.email;
  const firstName = user.firstName;
  const lastName = user.lastName;

  // Building Email message.
  const mailOptions: any = {
    from: `"CoachReferee" <${gmailEmail}>`,
    to: email,
    bcc: gmailEmail,
    subject: 'CoachReferee Exam: account delete',
    html : `Hi ${firstName} ${lastName},<br>
<p>Your account on <a href="https://exam.coachreferee.com">https://exam.coachreferee.com</a> has been removed after a too long inactivity.<br>
<br>
Best regards,<br>
CoachReferee web admin`
  };
  console.log('Sending message: ' + JSON.stringify(mailOptions, null, 2));
  try {
    mailTransport.sendMail(mailOptions);
    console.log('New subscription confirmation email sent to:' + email);
  } catch(error) {
    console.error('There was an error while sending the email:', error);
  }
}
