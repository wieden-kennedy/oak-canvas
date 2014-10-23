var
  concat = require('gulp-concat'),
  gulp = require('gulp'),
  jasmine = require('gulp-jasmine-phantom'),
  uglify = require('gulp-uglify');

var srcFiles = [
  'src/renderer.js',
  'src/display.js',
  'src/stage.js',
  'src/sprite.js',
  'src/camera.js',
  'src/text.js',
  'src/text_field.js',
  'src/sheet.js',
  'src/sequence.js',
  'src/scene.js',
  'src/resizable.js',
  'src/rectanlge.js',
  'src/multiline_text.js',
  'src/image.js',
  'src/graphic.js',
  'src/fluid_text.js',
  'src/fluid_multiline_text.js',
  'src/circle.js'
];
var specFiles= [
  'spec/renderer.js',
  'spec/display.js',
  'spec/graphic.js',
  'spec/image.js',
  'spec/sprite.js',
  'spec/sheet.js',
  'spec/stage.js'
];

gulp.task('dist', function () {
  var stream = gulp.src(srcFiles)
    .pipe(uglify())
    .pipe(concat('oak-canvas.min.js'))
    .pipe(gulp.dest('dist/'));

  var stream = gulp.src(srcFiles)
    .pipe(concat('oak-canvas.js'))
    .pipe(gulp.dest('dist/'));

  return stream;
});


gulp.task('spec', function () {
  var files = srcFiles.concat(specFiles);
  files.unshift('bower_components/**/**/*.js');
  return gulp.src(files)
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
