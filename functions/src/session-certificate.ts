import { User, Session, SessionParticipant, Course } from './model';
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as nodemailer from 'nodemailer';
import * as fs from 'fs';
import * as os from 'os';

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

export const sendCertificate = functions.https.onRequest(async (req, res) => {

    const sessionId = req.params.sessionId;
    const learnerId = req.params.learnerId;
    const learner: User = (await firestore.doc(`User/${learnerId}`).get()) as unknown as User;
    const session: Session = (await firestore.doc(`Session/${sessionId}`).get()) as unknown as Session;
    const code = check(learner, session);
    if (code) {
        res.send({ code});
        return;
    }
    const tempLocalDir = os.tmpdir();
    const course: Course = (await firestore.doc(`Course/${session.courseId}`).get()) as unknown as Course;
    const part: SessionParticipant = session.participants.find(
        participant => participant.person.personId === learner.id) as SessionParticipant;
    const certificateFile = generateCertificate(part, session, learner, course.test.certificateTemplateUrl, tempLocalDir);

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
    const part: SessionParticipant|undefined = session.participants
        .find(participant => participant.person.personId === learner.id);
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