//
// See https://github.com/jenkinsci/js-builder
//
var builder = require('@jenkins-cd/js-builder');

//
// Redefine the "test" task to use mocha and support es6.
// We might build this into js-builder, but is ok here
// for now.
//
// To run tests:
//
//     $ npm run test
//
builder.defineTask('test', function () {
    var mocha = require('gulp-mocha');
    var babel = require('babel-core/register');

    // Allow running of a specific test
    // e.g.  gulp test --test pipelines
    // will run the pipelines-spec.js
    var filter = builder.args.argvValue('--test', '*');

    builder.gulp.src('spec/' + filter + '-spec.js')
        .pipe(mocha({
            compilers: {js: babel}
        })).on('error', function (e) {
        if (builder.isRetest()) {
            // ignore test failures if we are running retest.
            return;
        }
        throw e;
    });
});
