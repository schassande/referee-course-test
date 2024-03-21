import { 
    sendEmailConfirmation as _sendEmailConfirmation, 
    accountCleanup as _accountCleanup 
} from './user';
import {  buildCertificate as _buildCertificate } from './build-certificate';
import {  sendCertificate as _sendCertificate } from './session-certificate';
import {  notifyNewTeacher as _notifyNewTeacher } from './new-teacher-notification';
import {  askToBecomeTeacher as _askToBecomeTeacher } from './ask-become-teacher';

////////////////////////////////////////////////////////////
////////// Export the function about the user //////////////
////////////////////////////////////////////////////////////
export const sendEmailConfirmation = _sendEmailConfirmation;
export const accountCleanup = _accountCleanup;
export const buildCertificate = _buildCertificate;
export const sendCertificate = _sendCertificate;
export const notifyNewTeacher = _notifyNewTeacher;
export const askToBecomeTeacher = _askToBecomeTeacher;
