import { User, Session, SessionParticipant, Course } from './model';
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as nodemailer from 'nodemailer';
import * as fs from 'fs';
import * as os from 'os';
import * as cors from 'cors';
import * as express from 'express';
import Mail = require('nodemailer/lib/mailer');

const path = require('path');
const pdf = require('html-pdf');
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
    if (!course) {
        console.log('Course has not been found! ' + session.courseId);
        res.send({ code: 7});
        return;
    }
    // fs.readdirSync('/workspace/').forEach(file => {
    //     console.log('LS /workspace/: ' + file);
    // });
    // fs.readdirSync('./').forEach(file => {
    //     console.log('LS ./: ' + file);
    // });
    
    const part: SessionParticipant = getSessionParticipant(session, learnerId);
    try {
        const certificateFile = await generateCertificate(part, session, learner, course.test.certificateTemplateUrl);
        console.log('certificateFile: ' + certificateFile);
        if (!certificateFile) {
            res.send({ code: 11});
            return;
        }
        const email = await buildEmail(session, learner, certificateFile);
        const info: nodemailer.SentMessageInfo = await mailTransport.sendMail(email);
        console.log('Certificate email sent to ' + learner.email + ':' + JSON.stringify(info, null, 2));
        res.send({ code: 0, info});
        // delete file
        fs.unlinkSync(certificateFile);
    } catch(error) {
      console.error('There was an error while sending the email:', error);
      res.send({ code: 10, error});
    }
});

function generateCertificate(participant: SessionParticipant, 
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
    const html = template
        .replace('${learner}', learner.firstName + ' ' + learner.lastName)
        .replace('${score}', participant.percent +'%')
        .replace('${teacher}', session.teachers[0].firstName + ' ' + session.teachers[0].lastName)
        .replace('${awardDate}', awardDateStr);
    const options = { 
        height: "800px",
        width: "1200px",
        type: 'png',
        quality: 75,
        border: '0',
        base: '/workspace/src'
    };

    const outputFile = path.join(tempLocalDir, `Exam_Certificate_${session.id}_${learner.id}_${new Date().getTime()}.png`);
    return new Promise<string>((resolve, reject) => {
        pdf.create(html, options).toFile(outputFile, (err: any, res: any) => {
            if (err) {
                console.log('Pdf generation: err=' + err);
                reject(err);
            } else {
                console.log('Pdf generated: ' + outputFile);
                resolve(outputFile);
            }
       });
    });
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
        filename: `Certificate ${session.courseName} ${learner.firstName} ${learner.lastName}.png`
    }]
  };
  // console.log('Email message: ' + JSON.stringify(mailOptions, null, 2));
  return mailOptions;
}

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
    const part: SessionParticipant = getSessionParticipant(session, learner.id); 
    if (!part) {
        return 4;
    }
    if (!part.pass) {
        return 5;
    }
    console.log('Session and learner are valid');
    return 0;
}
