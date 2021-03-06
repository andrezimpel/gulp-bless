'use strict';

var through = require('through');
var os = require('os');
var path = require('path');
var bless = require('bless');
var gutil = require('gulp-util');
var File = gutil.File;
var PluginError = gutil.PluginError;

module.exports = function(fileName, options){
    var pluginName = 'gulp-bless';

    options = options || {};

    var cssInput = '',
        firstFile = null;

    function bufferContents(file){
        if (file.isNull()) return; // ignore
        if (file.isStream()) return this.emit('error', new PluginError(pluginName,  'Streaming not supported'));
        if (!fileName || 'string' !== typeof fileName) return this.emit('error', new PluginError(pluginName,  'fileName parameter is required!'));

        if(!firstFile) firstFile = file;

        cssInput += file.contents.toString('utf8');
    }

    function endStream(){
        var stream = this;

        if(!firstFile) return stream.emit('end'); //error thrown in bufferContents

        var outputFilePath = path.resolve(path.dirname(firstFile.path), fileName);

        if(!cssInput) {
            stream.emit('data', new File({
                cwd: firstFile.cwd,
                base: firstFile.base,
                path: outputFilePath,
                contents: new Buffer('')
            }));
            return stream.emit('end');
        }

        new (bless.Parser)({
            output: path.resolve(path.dirname(firstFile.path), fileName),
            options: options
        }).parse(cssInput, function (err, blessedFiles, numSelectors) {
            if (err) {
                throw new PluginError(pluginName, err);
            }

            // print log message
            var msg = 'Found ' + numSelectors + ' selector' + (numSelectors === 1 ? '' : 's') + ', ';
            if (blessedFiles.length > 1) {
                msg += 'splitting into ' + blessedFiles.length + ' blessedFiles.';
            } else {
                msg += 'not splitting.';
            }
            console.log(msg);

            // write processed file(s)
            blessedFiles.forEach(function (blessedFile) {

              stream.emit('data', new File({
                  cwd: firstFile.cwd,
                  base: firstFile.base.replace(options.remove_base, ""),
                  path: function() {
                    if (options.prefix !== undefined) {
                      return blessedFile.filename.replace(options.remove_path, options.prefix);
                    } else {
                      return blessedFile.filename.replace(options.remove_path, "");
                    }
                  }(),
                  contents: new Buffer(blessedFile.content)
              }));
            });

            stream.emit('end');
        });
    }

    return through(bufferContents, endStream);
};
