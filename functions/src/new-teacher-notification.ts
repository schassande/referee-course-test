import { User } from './model';
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as nodemailer from 'nodemailer';
import * as cors from 'cors';
import * as express from 'express';
import Mail = require('nodemailer/lib/mailer');

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

const app = express();
// Automatically allow cross-origin requests
app.use(cors({ origin: true }));

// Expose Express API as a single Cloud Function:
export const notifyNewTeacher = functions.https.onRequest(app);

// build multiple CRUD interfaces:
// export const sendCertificate = functions.https.onRequest(async (req, res) => {
app.post('/', async (req:any, res:any) => {
    if (!req.body || !req.body.data) {
        console.log('No body content', req.body);
        res.send({ error: { code: 1, error: 'No body content'}, data: null});
        return;
    }
    const userId = req.body.data.userId;
    console.log('userId=' + userId);
    if (!userId) {
        res.send({ error: { code: 2, error: 'missing parameters'}, data: null});
        return;
    }
    const  teacher: User = await getUser(userId);
    try { 
        const code = check(teacher);
        console.log('code=' + code);
        if (code) {
            res.send({ error: { code, error: 'Wrong parameters'}, data: null});
            return;
        }
    } catch(err) {
        console.log(err);
        res.send({ error: { code: 99, error: 'Technical server error'}, data: null});
        return;
    }
    try {
        const email = await buildEmail(teacher);
        const info: nodemailer.SentMessageInfo = await mailTransport.sendMail(email);
        console.log('Certificate email sent to ' + teacher.email + ':' + JSON.stringify(info, null, 2));
        res.send({ error: null, data: info});
    } catch(error) {
      console.error('There was an error while sending the email:', error);
      res.send({ error: { code: 10, error: 'Problem when sending the email'}, data: null});
    }
});

function buildEmail(teacher: User): Mail.Options {
  // Building Email message.
  const mailOptions: Mail.Options = {
    from: `"CoachReferee" <${gmailEmail}>`,
    to: teacher.email,
    bcc: gmailEmail,
    subject: `Referee Exam App: Granted as teacher`,
    html : `Hi ${teacher.firstName} ${teacher.lastName},<br>
<p>You have been granted as teacher in the referee exam web application.<br>
It means you can create sessions for your classrooms.<br>
More documentation is available <a href="https://material.coachreferee.com/online_exam_doc.html">here</a>.<br>
<br>
Thanks for using <a href="https://exam.coachreferee.com">the application</a>.
</p>
Best regards,<br>
CoachReferee app`
  };
  // console.log('Email message: ' + JSON.stringify(mailOptions, null, 2));
  return mailOptions;
}

async function getUser(learnerId: string): Promise<User> {
    const doc = await firestore.doc(`User/${learnerId}`).get();
    let  learner: User;
    if (doc.exists) {
        learner = doc.data() as unknown as User;
    } else {
        learner = {} as User;
    }
    // console.log('learner=' + JSON.stringify(learner, null, 2));
    return learner;
}

function check(teacher: User|null): number {
    if (!teacher) {
        return 3;
    }
    if (teacher.role !== 'TEACHER') {
        return 4;
    }
    console.log('Session and learner are valid');
    return 0;
}
