import { secrets } from './secrets';
/* eslint-disable @typescript-eslint/no-explicit-any */
import { onRequest } from "firebase-functions/v2/https";
import * as firestoreModule from "firebase-admin/firestore";
import { User } from './model';
import * as cors from 'cors';
import * as express from 'express';
import * as mailer          from './mailer';


const firestore = firestoreModule.getFirestore();

const app = express();
// Automatically allow cross-origin requests
app.use(cors({ origin: true }));

// Expose Express API as a single Cloud Function:
export const askToBecomeTeacher = onRequest({secrets}, app);

// build multiple CRUD interfaces:
app.post('/', async (req:any, res:any) => {
    if (!req.body || !req.body.data) {
        console.log('No body content', req.body);
        res.send({ error: { code: 1, error: 'No body content'}, data: null});
        return;
    }
    const learnerId = req.body.data.learnerId;
    const teacherId = req.body.data.teacherId;
    console.log('learnerId=' + learnerId);
    console.log('teacherId=' + teacherId);
    if (!learnerId || !teacherId) {
        res.send({ error: { code: 2, error: 'missing parameters'}, data: null});
        return;
    }
    const  learner: User = await getUser(learnerId);
    const  teacher: User = await getUser(teacherId);
    try { 
        const code = check(learner, teacher);
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
        const email = await buildEmail(learner, teacher);
        const info = await mailer.sendMail(email);
        console.log('Email sent to ' + teacher.email + ':' + JSON.stringify(info, null, 2));
        res.send({ error: null, data: info});
    } catch(error) {
      console.error('There was an error while sending the email:', error);
      res.send({ error: { code: 10, error: 'Problem when sending the email'}, data: null});
    }
});

function buildEmail(learner: User, teacher: User) {
  // Building Email message.
  const mailOptions = {
    to: teacher.email,
    cc: learner.email + ',' + mailer.emailAddress,
    bcc: mailer.emailAddress,
    subject: `Referee Exam App: Grant a new teacher?`,
    html : `Hi ${teacher.firstName} ${teacher.lastName},<br>
<p>${learner.firstName} ${learner.lastName} asks you to grant him/her as teacher in the referee exam web application.<br>
<br>
Only If <b>you trust this person</b> and you are sure this person <b>has the presenter qualifications</b>,<br>
please go on <a href="https://exam.coachreferee.com/en/teacher">the web page of the teacher list</a>,<br>
and add this person to the list by using the 'plus' button (bottom right).<br>
<br>
If you don't trust this person as referee presenter, please ignore this email.
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

function check(learner: User|null, teacher: User|null): number {
    if (!teacher) {
        return 3;
    }
    if (teacher.role === 'LEARNER') {
        return 4;
    }
    if (!learner) {
        return 5;
    }
    if (learner.role !== 'LEARNER') {
        return 6;
    }
    console.log('Teacher and learner are valid');
    return 0;
}
