var CombinedStream = require('combined-stream')
var async          = require('async');
var fs             = require('fs');
var glob           = require('glob')
var jade           = require('jade');
var path           = require('path');
var through        = require('through2');
var util           = require('util');

var templateModule = fs.readFileSync(path.join(__dirname, './../tmpl/templateModule.tmpl'), 'utf-8');
var templateCache  = fs.readFileSync(path.join(__dirname, './../tmpl/templateCache.tmpl'), 'utf-8');

module.exports = function(opts) {

  var isJade = opts.isJade || false;

  var filename   = 'template.js'
  var extension  = (isJade) ? 'jade' : 'html';

  var tplPath    = opts.tplPath || '**/*.tpl.'
  var output     = opts.output || path.join(process.cwd(), filename);
  var moduleName = opts.moduleName || 'app.template'

  glob(tplPath, function (err, files) {
    if (err)
      throw new Error(err)

    var cs = CombinedStream.create()
    var tpl = [];

    async.eachSeries(
      files,
      function (file, done) {
        cs.append(fs.createReadStream(path.resolve(file)))
        done()
      },
      function (err) {
        if (err)
          throw err

        var filesIndex = 0;
        cs.pipe(through(function(chunk, enc, cb) {
          var route = files[filesIndex]
          var html = chunk.toString();
          html = html.replace(route, '')

          if (isJade)
            html = jade.render(html, { pretty: true });

          html = html.replace(/\r?\n/g, '\\n\' +\n    \'');
          var tmpl = util.format(templateCache, route, html)
          tpl.push(tmpl)

          filesIndex++

          cb();
        }))
      }
    )

    cs.on('end', function() {
      var template = util.format(templateModule, moduleName, tpl.join(''))
      fs.writeFileSync(output, template, 'utf8')
    })
  })
}
