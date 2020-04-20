import * as functions from 'firebase-functions';
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

// // Start writing Firebase Functions
// // https://firebase.google.com/docs/functions/typescript
//


// Configure the email transport using the default SMTP transport and a GMail account.
// For other types of transports such as Sendgrid see https://nodemailer.com/transports/
// TODO: Configure the `gmail.email` and `gmail.password` Google Cloud environment variables.

// Sends an email confirmation when a user changes his mailing list subscription.
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
