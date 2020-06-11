import { User, Session, SessionParticipant, Course } from './model';
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as nodemailer from 'nodemailer';
import * as fs from 'fs';
import * as os from 'os';
import * as cors from 'cors';
import * as express from 'express';

const pdf = require('pdf-creator-node');
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
export const sendCertificate = functions.https.onRequest(app);

// build multiple CRUD interfaces:
// export const sendCertificate = functions.https.onRequest(async (req, res) => {
app.post('/', async (req:any, res:any) => {
    if (!req.body || !req.body.data) {
        console.log('No body content')
        res.send({ code: 1});
        return;
    }
    const sessionId = req.body.data.sessionId;
    const learnerId = req.body.data.learnerId;
    console.log('sessionId=' + sessionId + ', learnerId=' + learnerId);
    if (!sessionId || !learnerId) {
        res.send({ code: 1});
        return;
    }
    const learner: User = (await firestore.doc(`User/${learnerId}`).get()) as unknown as User;
    console.log('learner=' + JSON.stringify(learner, null, 2));
    const session: Session = (await firestore.doc(`Session/${sessionId}`).get()) as unknown as Session;
    console.log('session=' + JSON.stringify(session, null, 2));
    const code = check(learner, session);
    console.log('code=' + code);
    if (code) {
        res.send({ code});
        return;
    }
    const tempLocalDir = os.tmpdir();
    const course: Course = (await firestore.doc(`Course/${session.courseId}`).get()) as unknown as Course;
    console.log('course=' + JSON.stringify(course, null, 2));
    const part: SessionParticipant = session.participants.find(
        participant => participant.person.personId === learner.id) as SessionParticipant;
    console.log('part=' + JSON.stringify(part, null, 2));
    const certificateTemplateUrl = course.test.certificateTemplateUrl;
    const certificateFile = generateCertificate(part, session, learner, certificateTemplateUrl, tempLocalDir);
    console.log('certificateFile=' + certificateFile);

  // Building Email message.
  const mailOptions: any = {
    from: `"CoachReferee" <${gmailEmail}>`,
    to: learner.email,
    bcc: gmailEmail,
    subject: `${session.courseName} Exam passed : Congratulations`,
    html : `Hi ${learner.firstName} ${learner.lastName},<br>
<p>Congratulation ! You passed the ${session.courseName} exam. The certificate is joined to this email.<br>
Thanks for using our application <a href="https://exam.coachreferee.com">https://exam.coachreferee.com</a>.</p>
<br>
Best regards,<br>
CoachReferee Examinator`,
    attachments: [ { 
        path : certificateFile, 
        filename: `Certificate ${session.courseName} ${learner.firstName} ${learner.lastName}.pdf`
    }]
  };
  console.log('Sending message: ' + JSON.stringify(mailOptions, null, 2));
  try {
    await mailTransport.sendMail(mailOptions);
    console.log('Certificate email sent to:' + learner.email);
  } catch(error) {
    console.error('There was an error while sending the email:', error);
  }
  return null;
    res.send("Hello");
});

function check(learner: User, session: Session): number {
    if (!session) {
        return 1;
    }
    if (session.status !== 'CORRECTION' && session.status === 'CLOSED') {
        return 2;
    }
    if (!learner) {
        return 3;
    }
    console.log('check: session.participants=' + session.participants);
    if (!session.participants) {
        return 6;
    }
    const part: SessionParticipant|undefined = session.participants
        .find(participant => participant.person.personId === learner.id);
    console.log('part=' + JSON.stringify(part, null, 2));
    if (!part) {
        return 4;
    }
    if (!part.pass) {
        return 5;
    }
    return 0;
}

function generateCertificate(participant: SessionParticipant, 
                             session: Session, 
                             learner: User, 
                             certificateTemplateUrl: string, 
                             tempLocalDir: string): Promise<string> {
     
    // Read HTML Template
    const html = fs.readFileSync(certificateTemplateUrl, 'utf8');
    const options = { format: 'A4', orientation: 'landscape', border: '10mm' };
    const outputFile = tempLocalDir + './output.pdf';
    const document = {
        html: html,
        data: { learner, session, participant },
        path: outputFile
    };
    return pdf.create(document, options).then((res: any) => {
        console.log('Generate pdf: ' + res);
        return outputFile;
    });
}