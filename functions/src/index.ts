import { 
    sendEmailConfirmation as _sendEmailConfirmation, 
    accountCleanup as _accountCleanup 
} from './user';

////////////////////////////////////////////////////////////
////////// Export the function about the user //////////////
////////////////////////////////////////////////////////////
export const sendEmailConfirmation = _sendEmailConfirmation;
export const accountCleanup = _accountCleanup;
