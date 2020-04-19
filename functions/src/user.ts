import * as functions from 'firebase-functions';
/*
import * as nodemailer from 'nodemailer';

const gmailEmail = functions.config().gmail.email;
const gmailPassword = functions.config().gmail.password;
const mailTransport = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: gmailEmail,
    pass: gmailPassword,
  },
});
*/
// // Start writing Firebase Functions
// // https://firebase.google.com/docs/functions/typescript
//


// Configure the email transport using the default SMTP transport and a GMail account.
// For other types of transports such as Sendgrid see https://nodemailer.com/transports/
// TODO: Configure the `gmail.email` and `gmail.password` Google Cloud environment variables.

// Sends an email confirmation when a user changes his mailing list subscription.
export const sendEmailConfirmation = functions.firestore.document('/User/{uid}').onCreate(async (change) => {
    console.log('user created: ' + JSON.stringify(change, null, 2));
});
/*
    const val = change.val;


  const mailOptions: any = {
    from: '"CoachReferee" <coachreferee@gmail.com>',
    to: val.email,
  };

  const subscribed = val.subscribedToMailingList;

  // Building Email message.
  mailOptions.subject = subscribed ? 'Thanks and Welcome!' : 'Sad to see you go :`(';
  mailOptions.text = subscribed ?
      'Thanks you for subscribing to our referee exam application.' :
      'I hereby confirm that your account has been dropped.';
  
  try {
    await mailTransport.sendMail(mailOptions);
    console.log(`New ${subscribed ? '' : 'un'}subscription confirmation email sent to:`, val.email);
  } catch(error) {
    console.error('There was an error while sending the email:', error);
  }
  return null;
});
*/