/* eslint-disable @typescript-eslint/no-explicit-any */
import { User, Session, SessionParticipant, Course } from './model';
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as os from 'os';
import * as cors from 'cors';
import * as express from 'express';
import * as mailer          from './mailer';


import moment = require('moment');
import path = require('path');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const pdfc = require("pdf-creator-node");
const firestore = admin.firestore();
const diplomaVersion = '1.0.2';

const gmailEmail = functions.config().gmail.email;
const fileType = 'png';


const app = express();
// Automatically allow cross-origin requests
app.use(cors({ origin: true }));

// Expose Express API as a single Cloud Function:
export const sendCertificate = functions.https.onRequest(app);

// build multiple CRUD interfaces:
// export const sendCertificate = functions.https.onRequest(async (req, res) => {
app.post('/', async (req:any, res:any) => {
    if (!req.body || !req.body.data) {
        console.log('No body content', req.body);
        res.send({ error: { code: 1, error: 'No body content'}, data: null});
        return;
    }
    const sessionId = req.body.data.sessionId;
    const learnerId = req.body.data.learnerId;
    console.log('sessionId=' + sessionId + ', learnerId=' + learnerId);
    if (!sessionId || !learnerId) {
        res.send({ error: { code: 2, error: 'missing parameters'}, data: null});
        return;
    }
    const  learner: User = await getUser(learnerId);
    const session: Session = await getSession(sessionId);
    try { 
        const code = check(learner, session);
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
    const teachers: User[] = [await getUser(session.teacherIds[0])];
    const course: Course = await getCourse(session.courseId);
    if (!course) {
        console.log('Course has not been found! ' + session.courseId);
        res.send({ error: { code: 7, error: 'Wrong parameters'}, data: null});
        return;
    }
    
    const part: SessionParticipant = getSessionParticipant(session, learnerId);
    try {
        const certificateFile = await generateCertificate(part, session, learner, course.test.certificateTemplateUrl);
        console.log('certificateFile: ' + certificateFile);
        if (!certificateFile) {
            res.send({ error: { code: 11, error: 'Problem of generation'}, data: null});
            return;
        }
        const email = await buildEmail(session, learner, teachers, certificateFile);
        return mailer.sendMail(email, res).then(() => fs.unlinkSync(certificateFile));
        // console.log('Certificate email sent to ' + learner.email + ':' + JSON.stringify(info, null, 2));
        // res.send({ error: null, data: info});
        // // delete file
        // fs.unlinkSync(certificateFile);
    } catch(error) {
      console.error('There was an error while sending the email:', error);
      res.send({ error: { code: 10, error: 'Problem when sending the email'}, data: null});
    }
});

function generateCertificate(participant: SessionParticipant, 
                             session: Session, 
                             learner: User, 
                             certificateTemplateUrl: string): Promise<string> {
    const tempLocalDir = os.tmpdir();      
    const template = fs.readFileSync(certificateTemplateUrl, 'utf8');
    const awardDate = adjustDate(session.expireDate);
    
    const awardDateStr: string = moment(awardDate).format('Do MMM YYYY');
    const html = template
        .replace('${learner}', learner.firstName + '<br>' + learner.lastName)
        .replace('${teacher}', session.teachers[0].firstName + ' ' + session.teachers[0].lastName)
        .replace('${awardDate}', awardDateStr);
    const options = { 
        format: 'A4', 
        orientation: 'landscape',
        header: { height: '0' },
        footer: { height: '0' },
        zoomFactor: '1.0',
        border: '0'
    };
    console.log('options', JSON.stringify(options));
    const outputFile = path.join(tempLocalDir, `Exam_Certificate_${session.id}_${learner.id}_${new Date().getTime()}.${fileType}`);
    const document = { 
        html: html,
        data: {
            learner: learner.firstName + '<br>' + learner.lastName,
            score: participant.percent +'%',
            teacher: session.teachers[0].firstName + ' ' + session.teachers[0].lastName,
            awardDate: awardDateStr,
            diplomaVersion: diplomaVersion
        },
        path: outputFile 
    };
    return new Promise<string>((resolve, reject) => {
        pdfc.create(document, options).then((res:any) => {
            console.log(`Document generated (version: ${diplomaVersion}): ${outputFile}`);
            console.log(res)
            resolve(outputFile);
        })
        .catch((error:any) => {
            console.error('Document generation: err=' + error);
            reject(error);
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

function buildEmail(session: Session, 
                    learner: User, 
                    teachers: User[],
                    certificateFile: any) {
  // Building Email message.
  const mailOptions = {
    to: learner.email,
    cc: gmailEmail + ',' + teachers.map(teacher=> `"${teacher.firstName} ${teacher.lastName}" <${teacher.email}>`).join(","),
    subject: `${session.courseName} Exam passed : Congratulations !`,
    html : `Hi ${learner.firstName} ${learner.lastName},<br>
<p>Congratulation ! You passed the ${session.courseName} exam. The certificate is joined to this email.<br>
Thanks for using our application <a href="https://exam.coachreferee.com">https://exam.coachreferee.com</a>.</p>
<br>
Best regards,<br>
CoachReferee Examinator`,
    attachments: [ { 
        content : mailer.fileToBase64(certificateFile), 
        filename: `Certificate ${session.courseName} ${learner.firstName} ${learner.lastName}.${fileType}`
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
