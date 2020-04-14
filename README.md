# Exam of referees

The application is hosted on: [https://exam.coachreferee.com](https://exam.coachreferee.com)

## Description of the application

Objectives : Provide an online solution to run referee exams

Two modes are availables corresponding to what we need or what we do as referee presenter:

1. Alone mode. Anybody can subscribe on the web site (no validation required) and run an exam. The user will only know the final result (score, percent) but will not have access to the right answers. The timing is managed by the application itself. The session/exam is hold by a teacher, it should be NDR. By this way, the teacher can register the result in the national database.
2. Group mode. The teacher create a session. He gets a key code and give it to the students/learners. Each learner can register to the session thanks to the session code. The teacher drives the transition between the session steps (Registration => test => Correction => Closing). The application still manages the timing of the session but it can do it manually in any case. the teacher has a global view of the result from the correction steps.

Features :

* All data are isolated by region (Europe, Aus, NZ, ...).
* A teacher can grant a learner to the teacher level.
* A teacher can manage all the sessions of its region.
* A course can be allowed to be run as individual session.
* The database contains the level 1 course in EN & FR. Import process based on file permit to add course and its translations.
* The web site works on phone, tablet & computer. Chrome is the more suitable browser for the application but it works on Firefox too.
* An exam is composed by series of questions. Each serie has a number of question to select. A question can be required.
* During the creation of a session, the application selects the required questions and some randomly questions to reach the number of questions by each serie.
* The application is open source and free.
* The application is available in several languages: English, French.
* The application has nothing specific to the referee aspect. It could be used to run general online exams.

### How control a session as teacher

The page about the session offers you control button on the bottom. Here is the list of the available buttons and their explanation:

* ![Add teacher](https://raw.githubusercontent.com/schassande/referee-course-test/master/doc/session_add_teacher_or_learner.png): use it to add a teacher or learner
* ![Start the exam](https://raw.githubusercontent.com/schassande/referee-course-test/master/doc/session_play.png): Start or restart the exam
* ![View as teacher](https://raw.githubusercontent.com/schassande/referee-course-test/master/doc/session_view_as_teacher.png): Go on the view to see the questions and the answers
* ![Stop the exam](https://raw.githubusercontent.com/schassande/referee-course-test/master/doc/session_stop.png): Stop the exam. If a learner answer to a question is after that, it does not count.
* ![Go to correction](https://raw.githubusercontent.com/schassande/referee-course-test/master/doc/session_correction.png): Change to the step correction. The learner can see the correction.
* ![Compute score](https://raw.githubusercontent.com/schassande/referee-course-test/master/doc/session_compute_score.png): Compute the score of the learners
* ![Close](https://raw.githubusercontent.com/schassande/referee-course-test/master/doc/session_close.png): close the exam. the Learner will not see the correct answers.

## How to test

1. Go on the web side [https://exam.coachreferee.com](https://exam.coachreferee.com)
2. Create an account
3. Run an individual exam
4. Sent an email to Seb (chassande at gmail.com) to ask to be granted as Teacher

Once you are granted as teacher, you can create a group sesssion. You can add teachers and learners if you want. Run the session by using the bottom buttons.

## Bug to fix

* spelling stuff in fr version drop-off : drop off, dropoff ou drop-off ? several and differents ...

## TODO List

Here is the list of next developpements:

* Translations import :
  
  1) Change the import format of translations to .csv file, => separate from test import
  2) report of import / status of the translations per course

* global switch of the language over the web site
* Improve the session report per learner S26, R23, T30
* Test the application with several series
* Introduction log system
* Sent an email to confirm the subscription
* Sent a certificat when a learner passes an exam
