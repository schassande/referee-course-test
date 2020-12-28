const gulp = require('gulp');
const run = require('gulp-run');
const cheerio = require('gulp-cheerio');
const mergeStream = require('merge-stream');
const del = require('del');

/** The list of the managed languages */
const languages = ['en', 'fr']; //, 'es'];
/** The local directory containing message.<lang>.xlf */
const localDir = './src/locale';
/** It is a working variable containing the translation unit extracted from the source. */
const id2transUnit = new Map();

/**
 * This is the main task of the gulp file. 
 * This task extract xlf file from the angular source by running ng xi18n.
 * Then the generated file is compare to existing language specific file.
 * It detects existing, added or removed translations.
 * It updates the files.
 * Finally it checks the translation files to compute missing translations.
 */
gulp.task('i18n-build', gulp.series(
    generateXlfFile,
    extractUnits,
    deleteXlfFile,
    mergeTranslations,
    checkTranslations));

gulp.task('i18n-check', checkTranslations);

/** 
 * Generate the message.xlf file containing translations from the sources of 
 * the Angular application 
 */
function generateXlfFile() {
    return run('ng xi18n --outputPath ' + localDir).exec();
}
/**
 * Extract the translation unit from the message.xlf
 */
function extractUnits() {
    return gulp.src(localDir + '/messages.xlf').pipe(cheerio({
        run: function($, file) {
            $('trans-unit').each(function() {
                var transUnit = $(this);
                var id = transUnit.attr('id');
                id2transUnit.set(id, transUnit);
                // console.debug("FINDING: '" + id + "'");
            });
        },
        parserOptions: {
            xmlMode: true
        }
    }));
}

/**
 * Delete the message.xlf file.
 */
function deleteXlfFile() {
    return del(localDir + '/messages.xlf');
}
/**
 * Merge the extracted translation unit into the existing translation files.
 */
function mergeTranslations() {
    var tasks = [];
    for (var language of languages) {
        var path = localDir + '/messages.' + language + '.xlf';
        tasks.push(
            gulp.src(path).pipe(cheerio({
                parserOptions: { xmlMode: true },
                run: function($, file) {
                    console.log('Merging translation file: ' + file.basename);
                    const notYetFoundId2tansUnit = new Map();
                    id2transUnit.forEach((unit, id) => notYetFoundId2tansUnit.set(id, unit));
                    // console.debug('id2transUnit.size=' + id2transUnit.size);
                    $('trans-unit').map((function() {
                        var id = $(this).attr('id');
                        const transUnit = notYetFoundId2tansUnit.get(id);
                        if (transUnit) {
                            notYetFoundId2tansUnit.delete(id);
                        } else {
                            console.debug("REMOVING(" + language + "): '" + id + "'");
                            $(this).remove();
                        }
                    }));
                    notYetFoundId2tansUnit.forEach((unit, id) => {
                        console.debug("ADDING(" + language + "): '" + id + "'");
                        $('body').append(unit);
                    });
                }
            }))
            .pipe(gulp.dest(localDir)));
    }
    return mergeStream(tasks);
}

function checkTranslations() {
    const tasks = [];
    for (const language of languages) {
        const path = localDir + '/messages.' + language + '.xlf';
        tasks.push(
            gulp.src(path).pipe(cheerio({
                parserOptions: { xmlMode: true },
                run: function($, file) {
                    var counterMissings = 0;
                    var counterTranslations = 0;
                    $('trans-unit').each((function() {
                        const id = $(this).attr('id');
                        const target = $('target', this);
                        counterTranslations++;
                        if (target && target.html() && target.html().length) {
                            // console.log('Translation (' + language + ', ' + id + '): ' + target.html());
                        } else {
                            counterMissings++;
                            console.log('Missing translation (' + language.toUpperCase() + ', ' + id + ')');
                        }
                    }));
                    if (counterMissings > 0) {
                        console.log("Translations " + language.toUpperCase() + ": missing " +
                            counterMissings + ' of ' + counterTranslations);
                    }
                }
            }))
        );
    }
    return mergeStream(tasks);
}