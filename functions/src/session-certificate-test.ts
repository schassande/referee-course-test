import { User, Session, SessionParticipant, Course } from './model';
import * as fs from 'fs';

const path = require('path');
const pdfc = require("pdf-creator-node");

const _learner: User = {
    "firstName": "Sébastien",
    "dataSharingAgreement": {
        "photoSharing": "YES",
        "personnalInfoSharing": "YES"
    },
    "lastUpdate": new Date(),
    "photo": {
        "url": '',
        "path": ''
    },
    "role": "ADMIN",
    "lastName": "Chassande-Barrioz",
    "id": "eCFP25TO60bDgazNYen0",
    "accountId": "d7y41NHdlhWw77BfDtgs6oHkgc23",
    "speakingLanguages": [
        "FR"
    ],
    "creationDate": new Date(),
    "token": '',
    "dataRegion": "Europe",
    "version": 4,
    "dataStatus": "CLEAN",
    "teacherQualifications": [
        {
        "level": "3",
        "region": "Europe",
        "status": "Qualified"
        }
    ],
    "accountStatus": "ACTIVE",
    "email": "chassande@gmail.com"
    };
const _session: Session = {
    "courseId": "xDJFqCkds3efXd3wpAEs",
    "lastUpdate": new Date(),
    "dataStatus": "CLEAN",
    "status": "CORRECTION",
    "creationDate": new Date(),
    "teacherIds": [
        "UHslrZnoUcTa9FrLUFEi"
    ],
    "id": "ZZ8ZMiYik8LTreWyQFno",
    "keyCode": "20-PEE69",
    "dataRegion": "Europe",
    "expireDate": new Date(),
    "version": 1603040270238,
    "participantIds": [
        "xbzN6pxNvqCiiMSBwItY",
        "Wi8Yhj54GTiQqFoaOKPr",
        "tELVb4G75rxzYad9cHmX",
        "qhvlPSWg2Qs9yTDEU7FM",
        "OQhE9BfNrqyDT5btTOTo",
        "xotHNH6PYeRAS9FLHP1L",
        "5tiseZnuvpV0f4qT2QQB",
        "qhvlPSWg2Qs9yTDEU7FM",
        "tELVb4G75rxzYad9cHmX",
        "qhvlPSWg2Qs9yTDEU7FM"
    ],
    "participants": [
        {
        "pass": false,
        "person": {
            "firstName": "STOYAN ",
            "lastName": "Pishev",
            "personId": "xbzN6pxNvqCiiMSBwItY"
        },
        "score": 0,
        "requiredScore": 23,
        "questionAnswerIds": [],
        "percent": 0,
        "maxScore": 30,
        "failedQuestionIds": [
            "Q1",
            "Q2",
            "Q3",
            "Q4",
            "Q5",
            "Q6",
            "Q7",
            "Q8",
            "Q9",
            "Q10",
            "Q11",
            "Q12",
            "Q13",
            "Q14",
            "Q15",
            "Q16",
            "Q17",
            "Q18",
            "Q19",
            "Q20",
            "Q21",
            "Q22",
            "Q23",
            "Q24",
            "Q25",
            "Q26",
            "Q27",
            "Q28",
            "Q29",
            "Q30"
        ],
        "seriesResult": [],
        "answeredQuestions": 0
        },
        {
        "failedQuestionIds": [
            "Q21",
            "Q26",
            "Q28"
        ],
        "person": {
            "personId": "Wi8Yhj54GTiQqFoaOKPr",
            "firstName": "Pavel",
            "lastName": "Tafradzhiyski"
        },
        "seriesResult": [],
        "percent": 87,
        "requiredScore": 23,
        "pass": true,
        "answeredQuestions": 29,
        "questionAnswerIds": [],
        "maxScore": 30,
        "score": 26
        },
        {
        "person": {
            "firstName": "Tatiana",
            "lastName": "Benova-Markova",
            "personId": "tELVb4G75rxzYad9cHmX"
        },
        "requiredScore": 23,
        "percent": 57,
        "answeredQuestions": 29,
        "questionAnswerIds": [],
        "seriesResult": [],
        "maxScore": 30,
        "pass": false,
        "failedQuestionIds": [
            "Q12",
            "Q13",
            "Q15",
            "Q18",
            "Q19",
            "Q20",
            "Q22",
            "Q24",
            "Q25",
            "Q26",
            "Q28",
            "Q29"
        ],
        "score": 17
        },
        {
        "pass": true,
        "requiredScore": 23,
        "maxScore": 30,
        "percent": 100,
        "answeredQuestions": 29,
        "score": 25,
        "questionAnswerIds": [],
        "failedQuestionIds": [
            "Q8",
            "Q19",
            "Q21",
            "Q29"
        ],
        "seriesResult": [],
        "person": {
            "personId": "qhvlPSWg2Qs9yTDEU7FM",
            "lastName": "Kloutsiniotis",
            "firstName": "Dimitar"
        }
        },
        {
        "requiredScore": 23,
        "maxScore": 30,
        "seriesResult": [],
        "percent": 73,
        "questionAnswerIds": [],
        "failedQuestionIds": [
            "Q12",
            "Q19",
            "Q22",
            "Q24"
        ],
        "pass": false,
        "answeredQuestions": 26,
        "score": 22,
        "person": {
            "firstName": "Hristo",
            "lastName": "Yakimov",
            "personId": "OQhE9BfNrqyDT5btTOTo"
        }
        },
        {
        "failedQuestionIds": [
            "Q2",
            "Q4",
            "Q6",
            "Q7",
            "Q12",
            "Q14",
            "Q19",
            "Q25",
            "Q29"
        ],
        "seriesResult": [],
        "answeredQuestions": 29,
        "score": 20,
        "person": {
            "firstName": "Dimitar",
            "lastName": "Krastev",
            "personId": "xotHNH6PYeRAS9FLHP1L"
        },
        "pass": false,
        "maxScore": 30,
        "requiredScore": 23,
        "questionAnswerIds": [],
        "percent": 67
        },
        {
        "seriesResult": [],
        "score": 21,
        "requiredScore": 23,
        "questionAnswerIds": [],
        "answeredQuestions": 29,
        "maxScore": 30,
        "failedQuestionIds": [
            "Q2",
            "Q4",
            "Q6",
            "Q12",
            "Q14",
            "Q19",
            "Q25",
            "Q29"
        ],
        "person": {
            "lastName": "Ruseva",
            "personId": "5tiseZnuvpV0f4qT2QQB",
            "firstName": "Veronika"
        },
        "percent": 70,
        "pass": false
        },
        {
        "questionAnswerIds": [],
        "score": 25,
        "percent": 100,
        "requiredScore": 23,
        "person": {
            "personId": "qhvlPSWg2Qs9yTDEU7FM",
            "firstName": "Dimitar",
            "lastName": "Kloutsiniotis"
        },
        "pass": true,
        "answeredQuestions": 29,
        "seriesResult": [],
        "failedQuestionIds": [
            "Q8",
            "Q19",
            "Q21",
            "Q29"
        ],
        "maxScore": 30
        },
        {
        "score": 17,
        "seriesResult": [],
        "person": {
            "firstName": "Tatiana",
            "lastName": "Benova-Markova",
            "personId": "tELVb4G75rxzYad9cHmX"
        },
        "answeredQuestions": 29,
        "requiredScore": 23,
        "questionAnswerIds": [],
        "pass": false,
        "failedQuestionIds": [
            "Q12",
            "Q13",
            "Q15",
            "Q18",
            "Q19",
            "Q20",
            "Q22",
            "Q24",
            "Q25",
            "Q26",
            "Q28",
            "Q29"
        ],
        "percent": 57,
        "maxScore": 30
        },
        {
        "failedQuestionIds": [
            "Q8",
            "Q19",
            "Q21",
            "Q29"
        ],
        "requiredScore": 23,
        "answeredQuestions": 29,
        "pass": true,
        "score": 25,
        "seriesResult": [],
        "questionAnswerIds": [],
        "maxScore": 30,
        "person": {
            "lastName": "Kloutsiniotis",
            "personId": "qhvlPSWg2Qs9yTDEU7FM",
            "firstName": "Dimitar"
        },
        "percent": 100
        }
    ],
    "startDate": new Date(),
    "courseName": "Referee Level 1 FIT5",
    "questionIds": [
        "Q1",
        "Q2",
        "Q3",
        "Q4",
        "Q5",
        "Q6",
        "Q7",
        "Q8",
        "Q9",
        "Q10",
        "Q11",
        "Q12",
        "Q13",
        "Q14",
        "Q15",
        "Q16",
        "Q17",
        "Q18",
        "Q19",
        "Q20",
        "Q21",
        "Q22",
        "Q23",
        "Q24",
        "Q25",
        "Q26",
        "Q27",
        "Q28",
        "Q29",
        "Q30"
    ],
    "teachers": [
        {
        "firstName": "SYLVAIN",
        "lastName": "CHARRAS",
        "personId": "UHslrZnoUcTa9FrLUFEi"
        }
    ]
    };

const _part: SessionParticipant = {
    "failedQuestionIds": [
        "Q8",
        "Q19",
        "Q21",
        "Q29"
    ],
    "requiredScore": 23,
    "answeredQuestions": 29,
    "pass": true,
    "score": 25,
    "seriesResult": [],
    "questionAnswerIds": [],
    "maxScore": 30,
    "person": {
        "lastName": "Kloutsiniotis",
        "personId": "qhvlPSWg2Qs9yTDEU7FM",
        "firstName": "Dimitar"
    },
    "percent": 100
    };
const _course: Course = {
    "test": {
        "enabled": true,
        "series": [
        {
            "enabled": true,
            "questions": [],
            selectionMode: 'RANDOM',
            "nbQuestion": 30,
            "passRequired": true,
            "requiredScore": 23
        }
        ],
        "requiredScore": 23,
        "supportedLanguages": [
        "EN",
        "FR"
        ],
        "nbQuestion": 30,
        "version": "1.0",
        "certificateTemplateUrl": "src/certificate_europe_2.html",
        "durationUnit": "m",
        "duration": 30
    },
    "enabled": true,
    "version": 1591904942443,
    "level": 1,
    "allowedAlone": true,
    "dataRegion": "Europe",
    "name": "Referee Level 1 FIT5",
    "theme": "blue",
    "dataStatus": "CLEAN",
    "id": "xDJFqCkds3efXd3wpAEs",
    "lastUpdate": new Date(),
    "creationDate": new Date()
};
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
/*
function generateCertificate(participant: SessionParticipant, 
                             session: Session, 
                             learner: User, 
                             certificateTemplateUrl: string): Promise<string> {
    const tempLocalDir = '.';     
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
    const fileType = 'png';
    const options = { 
        height: "800px",
        width: "1200px",
        type: fileType,
        quality: 75,
        border: '0',
        base: '/workspace/src'
    };

    const outputFile = path.join(tempLocalDir, `Exam_Certificate_${session.id}_${learner.id}_${new Date().getTime()}.${fileType}`);
    return new Promise<string>((resolve, reject) => {
        pdf.create(html, options).toFile(outputFile, (err: any, res: any) => {
            if (err) {
                console.log('Document generation: err=' + err);
                reject(err);
            } else {
                console.log('Document generated: ' + outputFile);
                resolve(outputFile);
            }
       });
    });
}
*/
function generateCertificate2(participant: SessionParticipant, 
                             session: Session, 
                             learner: User, 
                             certificateTemplateUrl: string): Promise<string> {
    const tempLocalDir = '.';     
    // Read HTML Template
    const template = fs.readFileSync(certificateTemplateUrl, 'utf8');
    const awardDate = adjustDate(session.expireDate);
    const awardDateStr: string = awardDate.getFullYear()
        + '/' + (awardDate.getMonth()+1)
        + '/' + awardDate.getDate();
    const html = template
        .replace('${learner}', learner.firstName + '<br>' + learner.lastName)
        .replace('${score}', participant.percent +'%')
        .replace('${teacher}', session.teachers[0].firstName + ' ' + session.teachers[0].lastName)
        .replace('${awardDate}', awardDateStr);
    const fileType = 'png';
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
            awardDate: awardDateStr
        },
        path: outputFile
    };
    console.log('data', JSON.stringify(document.data));
    return new Promise<string>((resolve, reject) => {
        pdfc.create(document, options).then((res:any) => {
            console.log('Document generated: ' + outputFile);
            console.log(res)
            resolve(outputFile);
        })
        .catch((error:any) => {
            console.error('Document generation: err=' + error);
        });
    });
}

try {
    console.log(generateCertificate2(_part, _session, _learner, _course.test.certificateTemplateUrl));
} catch(error) {
    console.error('There was an error while sending the email:', error);
}
