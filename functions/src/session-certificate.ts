/* eslint-disable @typescript-eslint/no-explicit-any */
import { User, Session, SessionParticipant, Course, CertifcateSent } from './model';
import { onRequest } from "firebase-functions/v2/https";
import * as firestoreModule from "firebase-admin/firestore";
import * as fs from 'fs';
import * as os from 'os';
import * as cors from 'cors';
import * as express from 'express';
import * as mailer from './mailer';
import * as pdf from 'html-pdf';


import * as moment from 'moment';
import * as path from 'path';
import { secrets } from './secrets';
const firestore = firestoreModule.getFirestore();

const fileType = 'pdf';


const app = express();
// Automatically allow cross-origin requests
app.use(cors({ origin: true }));

// Expose Express API as a single Cloud Function:
export const sendCertificate = onRequest({secrets}, app);
// app.get('/', async (req:any, res:any) => {
//     return sendCertificateInternal(res, req.params.sessionId, req.params.learnerId);
// });
// build multiple CRUD interfaces:
app.post('/', async (req:any, res:any) => {
    if (!req.body || !req.body.data) {
        console.log('No body content', req.body);
        res.status(400).send({ error: { code: 1, error: 'No body content'}, data: null});
        return;
    }
    const sessionId = req.body.data.sessionId;
    const learnerId = req.body.data.learnerId;
    return sendCertificateInternal(res, sessionId, learnerId);
});
async function sendCertificateInternal(res:any, sessionId:string, learnerId: string): Promise<any> {
    console.log('sessionId=' + sessionId + ', learnerId=' + learnerId);
    if (!sessionId || !learnerId) {
        res.status(400).send({ error: { code: 2, error: 'missing parameters'}, data: null});
        return;
    }
    const  learner: User = await getUser(learnerId);
    const session: Session = await getSession(sessionId);
    try { 
        const code = check(learner, session);
        console.log('code=' + code);
        if (code) {
            res.status(400).send({ error: { code, error: 'Wrong parameters'}, data: null});
            return;
        }
    } catch(err) {
        console.log(err);
        res.status(500).send({ error: { code: 99, error: 'Technical server error'}, data: null});
        return;
    }
    const teachers: User[] = []
    session.teacherIds.forEach(async (teacherId) => {
        const teacher = await getUser(teacherId);
        if (teacher) teachers.push(teacher);
    });
    const course: Course = await getCourse(session.courseId);
    if (!course) {
        console.log('Course has not been found! ' + session.courseId);
        res.status(400).send({ error: { code: 7, error: 'Wrong parameters'}, data: null});
        return;
    }
    console.log('Course: ' + JSON.stringify(course));
    if (!course.test.certificateTemplateUrl) {
        console.error('No template URL');
        res.status(500).send({ error: { code: 12, error: 'No template for this course'}, data: null});
        return;
    }
    if (!fs.existsSync(course.test.certificateTemplateUrl)) {
        console.error('Template ' + course.test.certificateTemplateUrl + ' does not exist.');
        fs.readdirSync('.').forEach(f => console.log(f));
        res.status(500).send({ error: { code: 13, error: 'Template not found'}, data: null});
        return;
    }
    const part: SessionParticipant = getSessionParticipant(session, learnerId);
    try {
        const certificateFile = await generateCertificate(part, session, learner, course.test.certificateTemplateUrl);
        console.log('certificateFile: ' + certificateFile);
        if (!certificateFile) {
            res.status(500).send({ error: { code: 11, error: 'Problem of generation'}, data: null});
            return;
        }
        const email = await buildEmail(session, learner, teachers, certificateFile);
        return mailer.sendMail(email, res).then(async () => {
            console.log('Certificate email sent to ' + email.to + '.');
            // delete file
            fs.unlinkSync(certificateFile);
            //Remind Certificate sent
            await certificateSent(session, part);

            res.status(200).send({ error: null, data: email})
        });
    } catch(error) {
      console.error('There was an error while sending the email:', error);
      res.status(500).send({ error: { code: 10, error: 'Problem when sending the email'}, data: null});
    }
}

async function generateCertificate(participant: SessionParticipant, 
                             session: Session, 
                             learner: User, 
                             certificateTemplateUrl: string): Promise<string> {
    const tempLocalDir = os.tmpdir();      
    console.log('Template: "'+ certificateTemplateUrl+'"');
    const template = fs.readFileSync(certificateTemplateUrl, 'utf8');
    const awardDate = adjustDate(session.expireDate);
    
    const awardDateStr: string = moment(awardDate).format('Do MMM YYYY');
    let html = template
        .replace('${learner}', learner.firstName + '<br>' + learner.lastName)
        .replace('${score}', participant.percent +'%')
        .replace('${teacher}', session.teachers[0].firstName + ' ' + session.teachers[0].lastName)
        .replace('${awardDate}', awardDateStr);
    html = replaceImages(html);
    const outputFile = path.join(tempLocalDir, `Exam_Certificate_${session.id}_${learner.id}_${new Date().getTime()}.${fileType}`);

    const config: pdf.CreateOptions = {
        "format": "A4",
        "height": "21cm",        // allowed units: mm, cm, in, px
        "width": "29.7cm",
        "orientation": "landscape",
        "border": "0",
        "type": fileType,
        "zoomFactor": "1",
        childProcessOptions: { // workaround of a bug on firebase
            env: {
              OPENSSL_CONF: '/dev/null',
            }
        } as any
    };
    return new Promise<string>((resolve, reject) => {
        try {
            console.log('Creating certificate in file: '+ outputFile);
            return pdf.create(html, config).toFile(outputFile, (err, res) => {
                if (err) {
                    console.log(err);
                    reject(err);
                } else {
                    console.log('PDF generated successfully:', res);
                    resolve(outputFile);
                }
              });
        } catch (error) {
            console.error('Error fetching URL:', error);
            reject(error);
        }
    });
}

function isOSWindows(): boolean { return /^win/.test(process.platform); }
function getPathSeparator(): string { return isOSWindows() ? '\\' : '/'; }
function replaceImages(html: string): string {
    let result = html;
    const KEY = '${BASE64_DATA_OF_IMG,';
    let begin = result.indexOf(KEY);
    while(begin >= 0) {
        const end = result.indexOf('}',begin+KEY.length);
        let imagePath = result.substring(begin+KEY.length,end);
        const pathSep = getPathSeparator();
        if (isOSWindows()) {
            imagePath = imagePath.replace(/\//g, pathSep);
        }
        imagePath = __dirname + pathSep + imagePath;
        let imageB64 = '';
        if (fs.existsSync(imagePath)) {
            imageB64 = fs.readFileSync(imagePath, {encoding: 'base64'});
            console.log('Replacing image link by base64 for ', imagePath)
        } else {
            console.error('Image not found: ' + imagePath);
            fs.readdirSync(__dirname).forEach(e => console.log('  ',e));
        }
        result = result.substring(0, begin) + imageB64 + result.substring(end+1);
        begin = result.indexOf(KEY);
    }
    return result;
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
    cc: teachers.map(teacher => teacher.email).join(','),
    subject: `${session.courseName} Exam passed : Congratulations !`,
    html : `Hi ${learner.firstName} ${learner.lastName},<br>
<p>Congratulation ! You passed the ${session.courseName} exam. The certificate is joined to this email.<br>
Thanks for using our application <a href="https://exam.coachreferee.com">https://exam.coachreferee.com</a>.</p>
<br>
Best regards,<br>
CoachReferee Examinator`,
    attachments: [ { 
        content : mailer.fileToBase64(certificateFile), 
        filename: `Certificate ${session.courseName} ${learner.firstName} ${learner.lastName}.${fileType}`,
        encoding: 'base64'
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
async function certificateSent(session: Session, part: SessionParticipant) {
    const id = session.id + '_' + part.person.personId;
    const entry = await firestore.doc(`CertifcateSent/${id}`).get();
    let data: CertifcateSent = entry.data() as unknown as CertifcateSent;
    if (!entry.exists) {
        data = {
            id,
            sessionId: session.id,
            userId: part.person.personId,
            certificateSent: 0,
            version: 0,
            creationDate: new Date,
            lastUpdate: new Date(),
            dataStatus: 'CLEAN',
            dataRegion: session.dataRegion
        };
    }
    data.certificateSent++;
    await firestore.doc(`CertifcateSent/${id}`).set(data);
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
