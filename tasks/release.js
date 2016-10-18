module.exports = function(config) {
  var gulp = require('gulp');
  var runSequence = require('run-sequence');
  var conventionalChangelog = require('gulp-conventional-changelog');
  var bump = require('gulp-bump');
  var gutil = require('gulp-util');
  var git = require('gulp-git');
  var fs = require('fs');
  var minimist = require('minimist');

  config = config || {};
  
  var defaultOptions = {
    string: 'env',
    default: {
      env: process.env.NODE_ENV || 'production',
      sources: config.sources || ['./bower.json', './package.json'],
      branch: config.branch || 'master',
      bump: config.bump || 'patch',
      message: config.message || 'Release %VERSION%',
      version: config.version
    }
  };

  // Parse arguments options, if any:
  var options = minimist(process.argv.slice(2), defaultOptions);

  /**
   * A task to create a changelog
   **/
  gulp.task('build:changelog', function () {
    return gulp.src('CHANGELOG.md', {
      buffer: false
    })
      .pipe(conventionalChangelog({
        preset: 'eslint'
      }))
      .pipe(gulp.dest('./'));
  });

  /**
   * A task to bump package.json version
   **/
  gulp.task('build:bump-version', function () {
    return gulp.src(options.sources)
      .pipe(bump(options.version ? {version: options.version} : {type: options.bump}).on('error', gutil.log))
      .pipe(gulp.dest('./'));
  });

  /**
   * A task to set package.json version
   **/
  gulp.task('build:set-version', function(cb) {
    if (!options.version) {
      return cb('No version argument!');
    }

    // FIXME: this does nothing!
    var verKey = options.version_key || 'version';
    var regex = opts.regex || new RegExp(
      '([\'|\"]?' + verKey + '[\'|\"]?[ ]*:[ ]*[\'|\"]?)(\\d+\\.\\d+\\.\\d+(-' +
      options.version_preid +
      '\\.\\d+)?(-\\d+)?)[\\d||A-a|.|-]*([\'|\"]?)', 'i');
  });

  /**
   * A task to commit all changes in current workspace.
   **/
  gulp.task('build:commit-changes', function () {
    return gulp.src('.')
      .pipe(git.add())
      .pipe(git.commit(options.message.replace('%VERSION%', getPackageJsonVersion())));
  });

  /**
   * A task to push all commits to master branch
   **/
  gulp.task('build:push-changes', function (cb) {
    git.push('origin', options.branch, cb);
  });

  /**
   * Create a tag for the current version where version is taken from the package.json file
   **/
  gulp.task('build:create-new-tag', function (cb) {
    var version = options.version || getPackageJsonVersion();
    git.tag(version, options.message.replace('%VERSION%', getPackageJsonVersion()), function (error) {
      if (error) {
        return cb(error);
      }
      git.push('origin', options.branch, {args: '--tags'}, cb);
    });
  });

  gulp.task('build:release', function (callback) {
    runSequence(
      'build:bump-version',
      'build:changelog',
      'build:commit-changes',
      'build:push-changes',
      'build:create-new-tag',
      function (error) {
        if (error) {
          console.log(error.message);
        } else {
          console.log('RELEASE FINISHED SUCCESSFULLY');
        }
        callback(error);
      });
  });

  function getPackageJsonVersion () {
    // We parse the json file instead of using require because require caches
    // multiple calls so the version number won't be updated
    return JSON.parse(fs.readFileSync('./package.json', 'utf8')).version;
  }

};
