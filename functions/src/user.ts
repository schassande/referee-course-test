import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as nodemailer from 'nodemailer';
import * as promisePool from 'es6-promise-pool';
const PromisePool = promisePool.default;

admin.initializeApp();
const firestore = admin.firestore();

const gmailEmail = functions.config().gmail.email;
const gmailPassword = functions.config().gmail.password;
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


  // Building Email message.
  const mailOptions: any = {
    from: `"CoachReferee" <${gmailEmail}>`,
    to: email,
    bcc: gmailEmail,
    subject: 'Welcome CoachReferee Exam!',
    html : `Hi ${firstName} ${lastName},<br>
<p>Thanks you for subscribing to our referee exam application.<br>
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
const NB_DAY_THRESHOLD = 3; // 365;
/** Maximum concurrent account deletions. */
const MAX_CONCURRENT = 3;

/**
 * function deleting unused accounts.
 */
export const accountCleanup = functions.pubsub.schedule('every day 00:00').onRun(async context => {
  // Fetch all user details.
  const inactiveUsers: UserToDelete[] = await getInactiveUsers();
  // Use a pool so that we delete maximum `MAX_CONCURRENT` users in parallel.
  const pool = new PromisePool(() => deleteInactiveUser(inactiveUsers), MAX_CONCURRENT);
  await pool.start();
  console.log('User cleanup finished');
  // TODO send an email to admin with the list of deleted users.
});

export interface UserToDelete {
  firebaseId: string;
  appId: string;
  toDelete: boolean;
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
  return new Promise((resolve) => {
    console.log('DUMMY: Deleting user account' + userToDelete.firebaseId + '/' + userToDelete.appId + ' because of inactivity');
    resolve();
  });
  /*
  return admin.auth().deleteUser(userToDelete.firebaseId).then(() => {
    //TODO delete app user account
    // firestore.collection('User').doc(userToDelete.appId).delete()
    console.log('Deleted user account', userToDelete.uid, 'because of inactivity');
  }).catch((error) => {
    console.error('Deletion of inactive user account', userToDelete.uid, 'failed:', error);
  });
  */
}

/**
 * Returns the list of all inactive users.
 */
async function getInactiveUsers(users:any = [], nextPageToken: any = null): Promise<UserToDelete[]> {
  const result = await admin.auth().listUsers(1000, nextPageToken);
  // Find users to delete 
  let usersToDelete: UserToDelete[] = await Promise.all(result.users.map(async (user) => {
    const u2d: UserToDelete = { firebaseId: user.uid, appId: '',  toDelete: false }
  
    // not signed in in the last 30 days.
    if (Date.parse(user.metadata.lastSignInTime) >= (Date.now() - NB_DAY_THRESHOLD * 24 * 60 * 60 * 1000)) {
      return Promise.resolve(u2d);
    }
    
    // check it is not teacher or administrator of the application
    const appUsers = await firestore.collection('User').where('accountId', '==', user.uid).get();
    if (appUsers.size === 1) {
      const appUser: any = appUsers.docs[0].data;
      if (appUser.role !== 'LEARNER') {
        return Promise.resolve(u2d);
      }
      u2d.appId = appUser.id;
    } // else the user does not exist => delete it

    u2d.toDelete = true;
    return Promise.resolve(u2d); // means delete
  }));
  usersToDelete = usersToDelete.filter(u => u.toDelete);

  // Concat with list of previously found inactive users if there was more than 1000 users.
  usersToDelete = users.concat(usersToDelete);
  
  // If there are more users to fetch we fetch them.
  return result.pageToken ? getInactiveUsers(usersToDelete, result.pageToken) : Promise.resolve(usersToDelete);
}
