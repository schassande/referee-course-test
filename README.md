# Exam of referees

The application is hosted on: https://exam.coachreferee.com

## Description of the application

Objectives : Provide an online solution to run referee exams

Two modes are availables corresponding to what we need or what we do as referee presenter:

1. Alone mode. Anybody can subscribe on the web site (no validation required) and run an exam. The user will only know the final result (score, percent) but will not have access to the right answers. The timing is managed by the application itself. The session/exam is hold by a teacher, it should be NDR. By this way, the teacher can register the result in the national database.
2. Group mode. The teacher create a session. He gets a key code and give it to the students/learners. Each learner can register to the session thanks to the session code. The teacher drives the session steps (Registration, test, Correction, Closing). The application still manages the timing of the session but it can do it manually in any case. the teacher has a global view of the result since the correction steps.

Features :

* All data are isolated by region (Europe, Aus, NZ, ...)
* A teacher can grant a user to the teacher level.
* A teacher can see the sessions of its region
* A course can allowed or not to be run in individual session.
* The datase contains the level 1 course in EN & FR. Import process based on file permit to add others courses and translations
* The web site works on phone, tablet & computer. Chrome is the more suitable browser for the application but it works on Firefox.
* The application is open source and free
* The application is available in several languages: English, French
* The application has nothing specific to the referee aspect. It could be used to run general online exams.
* An exam is composed by series of questions. Each serie has a number of question to select. A question can be required.
* During the creation of a session, the application selects the required questions and some randomly questions to reach the number of question by each serie.

## How to test

1. Go on the web side [https://exam.coachreferee.com](https://exam.coachreferee.com)
2. Create an account
3. Run an individual exam
4. Sent an email to Seb (chassande at gmail.com) to ask to be granted as Teacher

Once you are granted as teacher, you can create a group sesssion. You can add teachers and learners if you want. Run the session by using the bottom buttons.

## Bug to fix

* orthographe de drop-off : drop off, dropoff ou drop-off ? Plusieurs orthographes constatées.

## TODO List

Here is the list of next developpements:

* quand on clique sur le drapeau français, tout ne bascule pas en français (questions without answers, close the exam, etc. en bas de la page)
* S26, R23, T30 à eclaircir
* Tester avec plusieurs series
* Systeme de log
* Import de traduction en properties + rapport d'importation
* Import de formation
* Envoi d'un email de confirmations d'inscription
* Envoie d'un certificat par email de réussite par email
