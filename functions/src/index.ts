import { 
    sendEmailConfirmation as _sendEmailConfirmation, 
    accountCleanup as _accountCleanup 
} from './user';
import {  sendCertificate as _sendCertificate } from './session-certificate';

////////////////////////////////////////////////////////////
////////// Export the function about the user //////////////
////////////////////////////////////////////////////////////
export const sendEmailConfirmation = _sendEmailConfirmation;
export const accountCleanup = _accountCleanup;
export const sendCertificate = _sendCertificate;
