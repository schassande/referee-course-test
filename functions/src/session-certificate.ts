import { User, Session, SessionParticipant, Course } from './model';
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as nodemailer from 'nodemailer';
import * as fs from 'fs';
import * as os from 'os';
import * as cors from 'cors';
import * as express from 'express';
import Mail = require('nodemailer/lib/mailer');

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
    const  learner: User = await getUser(learnerId);
    const session: Session = await getSession(sessionId);
    try { 
        const code = check(learner, session);
        console.log('code=' + code);
        if (code) {
            res.send({ code});
            return;
        }
    } catch(err) {
        console.log(err);
        res.send({ code: 99});
        return;
    }
    const course: Course = await getCourse(session.courseId);
    const part: SessionParticipant = getSessionParticipant(session, learnerId);
    const certificateFile = await generateCertificate(part, session, learner, course.test.certificateTemplateUrl);
    const email = await buildEmail(session, learner, certificateFile);
    try {
      const info: nodemailer.SentMessageInfo = await mailTransport.sendMail(email);
      console.log('Certificate email sent to ' + learner.email + ':' + JSON.stringify(info, null, 2));
      res.send({ code: 0, info});
    } catch(error) {
      console.error('There was an error while sending the email:', error);
      res.send({ code: 10, error});
    }
});

function getSessionParticipant(session: Session, userId: string) {
    const part: SessionParticipant = session.participants.find(
        participant => participant.person.personId === userId) as SessionParticipant;
    // console.log('part=' + JSON.stringify(part, null, 2));
    return part;
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

async function getSession(sessionId: string): Promise<Session> {
    const doc = await firestore.doc(`Session/${sessionId}`).get();
    let  session: Session;
    if (doc.exists) {
        session = doc.data() as unknown as Session;
    } else {
        session = {} as Session;
    }
    // console.log('session=' + JSON.stringify(session, null, 2));
    return session;
}

async function getCourse(courseId: string): Promise<Course> {
    const doc = await firestore.doc(`Course/${courseId}`).get();
    let  course: Course;
    if (doc.exists) {
        course = doc.data() as unknown as Course;
    } else {
        course = {} as Course;
    }
    // console.log('course=' + JSON.stringify(course, null, 2));
    return course;
}

function check(learner: User|null, session: Session|null): number {
    if (!session) {
        return 1;
    }
    if (session.status !== 'CORRECTION' && session.status !== 'CLOSED') {
        return 2;
    }
    if (!learner) {
        return 3;
    }
    console.log('check: session.participantIds=' + session.participantIds);
    if (!session.participants) {
        return 6;
    }

    const partIdx: number = session.participantIds.indexOf(learner.id);
    if (partIdx < 0) {
        return 4;
    }
    const part: SessionParticipant = session.participants[partIdx]; 
    console.log('part=' + JSON.stringify(part, null, 2));
    if (!part.pass) {
        return 5;
    }
    return 0;
}

async function generateCertificate(participant: SessionParticipant, 
                             session: Session, 
                             learner: User, 
                             certificateTemplateUrl: string): Promise<string> {
    const tempLocalDir = os.tmpdir();     
    // Read HTML Template
    const template = fs.readFileSync(certificateTemplateUrl, 'utf8');
    const awardDate = adjustDate(session.expireDate);
    const awardDateStr: string = awardDate.getFullYear()
        + '/' + (awardDate.getMonth()+1)
        + '/' + awardDate.getDate();

    const options = { format: 'A4', orientation: 'landscape', border: '10mm' };
    const outputFile = tempLocalDir + `/Exam_Certificate_${session.id}_${learner.id}_${new Date().getTime()}.pdf`;
    console.log('certificateFile=' + outputFile);
    const document = {
        html: template,
        data: { 
            learner : learner.firstName + ' ' + learner.lastName, 
            score: participant.percent +'%',
            teacher: session.teachers[0].firstName + ' ' + session.teachers[0].lastName,
            awardDate: awardDateStr
        },
        path: outputFile
    };
    const res = await pdf.create(document, options);
    console.log('Generated pdf: ' + res);
    return outputFile;
}
function adjustDate(d: any): Date {
    if (d === null) {
        return new Date();
    } else if (d && !(d instanceof Date) ) {
        if (typeof d === 'string') {
            return string2date(d);
        } else {
            return d.toDate();
        }
    } else {
        return d as Date;
    }
}
function string2date(dateStr: string, aDate: Date = new Date()): Date {
    const elements = dateStr.split('-');
    aDate.setFullYear(Number.parseInt(elements[0], 0));
    aDate.setMonth(Number.parseInt(elements[1], 0) - 1);
    aDate.setDate(Number.parseInt(elements[2], 0));
    return aDate;
}

function buildEmail(session: Session, learner: User, certificateFile: any): Mail.Options {
  // Building Email message.
  const mailOptions: Mail.Options = {
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
  // console.log('Email message: ' + JSON.stringify(mailOptions, null, 2));
  return mailOptions;
}