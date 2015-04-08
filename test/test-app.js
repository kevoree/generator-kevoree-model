'use strict';

var path = require('path');
var assert = require('yeoman-generator').assert;
var helpers = require('yeoman-generator').test;
var os = require('os');

describe('generator-kevoree-model:app', function () {
  before(function (done) {
    helpers.run(path.join(__dirname, '../app'))
      .withOptions({ skipInstall: true })
      .withPrompts({ tdef: 'Component', name: 'Foo', version: '0.0.42', package: 'org.kevoree', add: false })
      .on('end', done);
  });

  it('creates files', function () {
    assert.file([
      'model.json'
    ]);
  });
});
