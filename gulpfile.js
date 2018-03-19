var gulp = require("gulp");
var browserify = require("browserify");
var source = require('vinyl-source-stream');
var tsify = require("tsify");
var connect = require('gulp-connect');

var respurces = {
  htmls: [
    'src/htmls/*.html',
    'src/styles/*.css'
  ],
  assets: [
    'src/assets/*.*'
  ],
  shaders: [
    'src/shaders/**/*.*'
  ],
  scripts: [
    'src/js/*.js'
  ]
};

gulp.task("copy-htmls", function () {
  return gulp.src(respurces.htmls)
    .pipe(gulp.dest("dist"));
});

gulp.task("copy-shaders", function () {
  return gulp.src(respurces.shaders)
    .pipe(gulp.dest("dist/assets/shaders"));
});

gulp.task("copy-assets", function () {
  return gulp.src(respurces.assets)
    .pipe(gulp.dest("dist/assets"));
});

gulp.task("default", ["copy-htmls", "copy-shaders", "copy-assets"], function () {
  return browserify({
    basedir: '.',
    debug: true,
    entries: ['src/scripts/main.ts'],
    cache: {},
    packageCache: {}
  })
  .plugin(tsify)
  .bundle()
  .pipe(source('bundle.js'))
  .pipe(gulp.dest("dist"));
});

gulp.task('run-server', function() {
  var options = {
    root: './dist',
    port: 8001
  };
  connect.server(options);
});