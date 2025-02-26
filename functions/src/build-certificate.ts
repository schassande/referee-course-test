/* eslint-disable @typescript-eslint/no-explicit-any */
import { onRequest, Request } from "firebase-functions/v2/https";
import * as fs from 'fs';
import * as cors from 'cors';
import * as express from 'express';
import * as pdf  from 'html-pdf';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const fileType = 'pdf';
type CertificateType = 'REFEREE_L0' | 'REFEREE_L1' | 'REFEREE_L2_EXAM' | 'REFEREE_L2';
export interface CertificateData {
    learner : {
        firstName: string;
        lastName: string;
    },
    teacher : {
        firstName: string;
        lastName: string;
    },
    certificate : {
        type: CertificateType;
        templateUrl?: string;
        awardDate: string;
        score?: string;
    }
}

const app = express();
app.use(cors({ origin: true }));
export const buildCertificate = onRequest(app);

app.post('/', async (req:Request, res:express.Response) => {
    const data: CertificateData = req.body as CertificateData;
    if (!data 
        || !data.learner || (!data.learner.firstName && !data.learner.lastName)
        || !data.teacher || (!data.teacher.firstName && !data.teacher.lastName)
        || !data.certificate || !data.certificate.type || !data.certificate.awardDate
        ) {
        console.log('No body content', data);
        res.status(400).send({ error: { code: 1, error: 'Missing body element'}, data: null});
        return;
    }
    return buildCertificateInternal(res, data);
});

app.get('/', async (req:Request, res:express.Response) => {
    const query = req.query || {};
    const data: CertificateData = {
        learner: {
            firstName: query.learnerFirstName as string,
            lastName: query.learnerLastName as string
        },
        teacher: {
            firstName: query.teacherFirstName as string,
            lastName: query.teacherLastName as string
        },
        certificate: {
            type: query.certificateType as CertificateType,
            awardDate: query.awardDate as string,
            score: query.score as string
        }   
    };
    if (!data 
        || !data.learner || (!data.learner.firstName && !data.learner.lastName)
        || !data.teacher || (!data.teacher.firstName && !data.teacher.lastName)
        || !data.certificate || !data.certificate.type || !data.certificate.awardDate
        ) {
        console.log('Missing parameters', data);
        res.status(400).send({ error: { code: 1, error: 'Missing parameters'}, data: null});
        return;
    }
    return buildCertificateInternal(res, data);
});
async function buildCertificateInternal(res:express.Response, data: CertificateData): Promise<any> {
    console.log('data=' + JSON.stringify(data));
    data.certificate.templateUrl = getCertificateUrlFromType(data.certificate.type);
    if (!fs.existsSync(data.certificate.templateUrl)) {
        console.error('Template ' + data.certificate.templateUrl + ' does not exist.');
        fs.readdirSync('src').forEach(f => console.log(f));
        res.status(500).send({ error: { 
            code: 13, 
            error: 'Template ' + data.certificate.templateUrl + ' not found for the certificate type: '+ data.certificate.type}, data: null});
        return;
    }
    try {
        const certificateFile:Buffer = await generateCertificate(data);
        if (!certificateFile) {
            res.status(500).send({ error: { code: 11, error: 'Problem of generation'}, data: null});
            return;
        }
        const fileName = 'Certificate_' + data.certificate.type + '_'+data.learner.firstName+'_'+data.learner.lastName+'.'+fileType;
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader("Content-Disposition", "attachment; filename=" + encodeURIComponent(fileName));
        console.log('Sending certificate file as response: ' + fileName, certificateFile.length);
        res.status(200).send(certificateFile);
    } catch(error) {
      console.error('There was an error while pdf generation:', error);
      res.status(500).send({ error: { code: 10, error: 'Problem while pdf generation'}, data: null});
    }
}
export async function generateCertificate(data: CertificateData): Promise<Buffer> {
    console.log('Template: "'+ data.certificate.templateUrl+'"');
    const template = fs.readFileSync(data.certificate.templateUrl, 'utf8');    
    let html = template
        .replace('${learner}', data.learner.firstName + ' ' + data.learner.lastName)
        .replace('${score}', data.certificate.score +'%')
        .replace('${teacher}', data.teacher.firstName + ' ' + data.teacher.lastName)
        .replace('${awardDate}', data.certificate.awardDate);
    html = replaceImages(html);
    const config: pdf.CreateOptions = {
        'format': 'A4',
        'height': '21cm',        // allowed units: mm, cm, in, px
        'width': '29.7cm',
        'orientation': 'landscape',
        'border': '0',
        'type': fileType,
        'zoomFactor': '1',
        childProcessOptions: { // workaround of a bug on firebase
            env: {
              OPENSSL_CONF: '/dev/null',
            }
        } as any
    };
    return new Promise<Buffer>((resolve, reject) => {
        try {
            console.log('Creating certificate in a buffer');
            return pdf.create(html, config).toBuffer((err, buffer) => {
                if (err) {
                    console.log(err);
                    reject(err);
                } else {
                    console.log('PDF generated successfully:');
                    resolve(buffer);
                }
              });
        } catch (error) {
            console.error('Error fetching URL:', error);
            reject(error);
        }
    });
}
export function getCertificateUrlFromType(type: CertificateType): string {
    return 'src/certificate_europe_'+type+'.html'
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