import { CertificateData, generateCertificate, getCertificateUrlFromType } from "./build-certificate";
import * as fs from 'fs';

/** Test de la fonction _generateCertificate */
async function testBuildCertificate() {
    const data: CertificateData = {
        learner: {
            firstName: 'John',
            lastName: 'Doe'
        },
        teacher: {
            firstName: 'Seb',
            lastName: 'C'
        },
        certificate: {
            type: 'REFEREE_L1',
            score: '85%',
            awardDate: '2025-02-25'
        }
    }
    data.certificate.templateUrl = getCertificateUrlFromType(data.certificate.type);

    const result:Buffer = await generateCertificate(data);
    fs.writeFileSync('certificate.pdf', result);
}
testBuildCertificate()
    .then(() => console.log('File generated'))
    .catch((e) => console.error('Test failed', e));    