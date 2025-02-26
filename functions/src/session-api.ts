import { Session, User } from './model';
import { onRequest, Request } from "firebase-functions/v2/https";
import * as firestoreModule from "firebase-admin/firestore";
import * as cors from 'cors';
import * as express from 'express';
const firestore = firestoreModule.getFirestore();

const app = express();
// Automatically allow cross-origin requests
app.use(cors({ origin: true }));
export const sessionApi = onRequest(app);
const API_KEY = 'KmmkbIq8Do5wLI99k5G815Me68TyPC2WXTQxPrKXdzsvnd4h87';

app.get('/session/bycode/:code', async (req:Request, res) => {
    // check API KEY
    const apiKey = req.query.apikey
    if (apiKey !== API_KEY) {
        res.status(401).send({ error: { code: 1, error: 'Unauthorized'}, data: null});
        return;
    }

    // extract code from the request
    const sessionCode = req.params.code;
    if (!sessionCode) {
        res.status(400).send({ error: { code: 2, error: 'Missing code parameter'}, data: null});
        return;
    }
    // get the session from the database
    const session: Session = await getSessionByKeyCode(sessionCode);
    if (!session) {
        res.status(404).send({ error: { code: 2, error: 'No Session found with the code '+sessionCode}, data: null});
        return;
    }
    // add user information to the participants
    Promise.all(session.participants.map(async p => {
        const person = await getUser(p.person.personId);
        if (person) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (p as any).user = person;
        }
    })).then(() => {
        // send the session back
        console.log('session('+sessionCode+')=' + JSON.stringify(session,null, 2));
        res.status(200).send({ error: null, data: session});
    }).catch(err => {
        console.error('Error getting user information', err);
        res.status(500).send({ error: { code: 3, error: 'Internal error'}, data: null});
    });
});

/**
 * Retrieves a session from the database based on the session code
 * @param sessionCode is the session code to search for
 * @returns the session found or undefined if not found
 */
async function getSessionByKeyCode(sessionCode: string): Promise<Session> {
    const doc = await firestore.collection('Session').where('keyCode', '==', sessionCode).limit(1).get();
    let  session: Session;
    if (doc.size > 0) {
        session = doc.docs[0].data() as unknown as Session;
    } else {
        session = undefined as Session;
    }
    // console.log('session=' + JSON.stringify(session, null, 2));
    return session;
}

/**
 * Retrieves a user from the database based on the user id
 * @param learnerId is the user id to search for
 * @returns the user found or undefined if not found
 */
async function getUser(learnerId: string): Promise<User> {
    const doc = await firestore.doc(`User/${learnerId}`).get();
    let  learner: User;
    if (doc.exists) {
        learner = doc.data() as unknown as User;
        // remove sensitive information
        learner.password = undefined;
        learner.generatedPassword = undefined;
    } else {
        learner = undefined as User;
    }
    console.log('user('+learnerId+')=' + JSON.stringify(learner,null, 2));
    return learner;
}


