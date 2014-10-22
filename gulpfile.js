var
  concat = require('gulp-concat'),
  gulp = require('gulp'),
  jasmine = require('gulp-jasmine-phantom'),
  uglify = require('gulp-uglify');

gulp.task('dist', function () {
  var stream = gulp.src('src/*.js')
    .pipe(uglify())
    .pipe(concat('oak-canvas.min.js'))
    .pipe(gulp.dest('dist/'));

  var stream = gulp.src('src/*.js')
    .pipe(concat('oak-canvas.js'))
    .pipe(gulp.dest('dist/'));

  return stream;
});

gulp.task('spec', function () {
  return gulp.src(['bower_components/**/dist/*.js', '{src,spec}/*.js'])
    .pipe(jasmine({
      integration: true,
      verbose: true
    }));
});

gulp.task('watch', function () {
  var watcher = gulp.watch('{src,spec}/*.js', ['spec']);
  return watcher;
});

gulp.task('default', ['spec', 'dist', 'docs']);
