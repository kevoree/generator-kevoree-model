'use strict';
var yeoman = require('yeoman-generator');
var chalk = require('chalk');
var kevoree = require('kevoree-library');
var semverRegex = require('semver-regex');
var factory = new kevoree.factory.DefaultKevoreeFactory();

var TDEFS = ['Component', 'Group', 'Channel', 'Node'];
var ATTR_TYPES = ['string', 'boolean', 'int', 'float', 'long', 'double', 'short', 'byte', 'char'];

function matcher(input, pattern) {
  var match = input.match(pattern);
  return (match && match.length && match.length === 1 && match[0] === input);
}

function createPackagesTree(packages, index, parent) {
  // create a new package using packages[index] name
  var p = factory.createPackage();
  p.name = packages[index];

  // check recursivity condition
  if (index === packages.length - 1) {
    // this is the last package in packages (eg. in 'org.kevoree.library.js' => this is 'js')
    parent.addPackages(p);
    // end recursion by sending the last package back
    return p;
  } else {
    // this is not the last package
    parent.addPackages(p);

    // recursion
    return createPackagesTree(packages, index+1, p);
  }
}

module.exports = yeoman.generators.Base.extend({
  initializing: function () {
    this.pkg = require('../package.json');
  },

  prompting: function () {
    var self = this;
    var done = this.async();

    // Have Yeoman greet the user.
    this.log('\n'+chalk.yellow('Kevoree model generator:')+'\n');

    var prompts = [
      {
        type: 'input',
        name: 'package',
        message: 'What is the name of your package?',
        default: 'com.example',
        validate: function (answer) {
          var pattern = /[a-zA-Z0-9_]+([.][a-zA-Z0-9_]+)*/g;
          if (matcher(answer, pattern)) { return true; }
          else { return 'Allowed pattern for package is '+pattern.toString(); }
        }
      },
      {
        type: 'list',
        name: 'tdef',
        choices: TDEFS,
        message: 'What kind of type would you like to create?'
      },
      {
        type: 'input',
        name: 'name',
        message: 'What is the name of your TypeDefinition?',
        validate: function (answer) {
          var pattern = /[A-Z][\w]*/;
          if (matcher(answer, pattern)) { return true; }
          else { return 'Allowed pattern for name is '+pattern.toString(); }
        }
      },
      {
        type: 'input',
        name: 'version',
        message: 'What is the version of your TypeDefinition?',
        validate: function (answer) {
          return semverRegex().test(answer);
        }
      },
      {
        type: 'confirm',
        name: 'virtual',
        message: 'Do you want your TypeDefinition to be virtual?',
        default: false
      }
    ];

    var duPrompt= [
      {
        type: 'input',
        name: 'name',
        message: 'What is the name of your DeployUnit?',
        validate: function (answer) {
          var pattern = /[\w-_:.]*/;
          if (matcher(answer, pattern)) { return true; }
          else { return 'Allowed pattern for deployUnit is '+pattern.toString(); }
        }
      }
    ];

    var addAttrPrompt = [
      {
        type: 'confirm',
        name: 'add',
        message: 'Would you like to add a dictionary attribute to your type?'
      }
    ];

    var addInputPrompt = [
      {
        type: 'confirm',
        name: 'add',
        message: 'Would you like to add an input port to your type?'
      }
    ];

    var addOutputPrompt = [
      {
        type: 'confirm',
        name: 'add',
        message: 'Would you like to add an output port to your type?'
      }
    ];

    var addFilterPrompt = [
      {
        type: 'confirm',
        name: 'add',
        message: 'Would you like to add a filter to your DeployUnit?'
      }
    ];

    var attrPrompts = [
      { type: 'input', name: 'name', message: 'Name?' },
      { type: 'list', name: 'datatype', message: 'What is the type of this attribute?', choices: ATTR_TYPES },
      { type: 'input', name: 'defaultValue', message: 'Default value?', default: undefined },
      { type: 'confirm', name: 'optional', message: 'Is this attribute optional?', default: true },
      { type: 'input', name: 'fragmentDependent', message: 'Is this attribute fragment dependent?', default: false }
    ];

    var namePrompt = [
      { type: 'input', name: 'name', message: 'Name?' }
    ];

    var valuePrompt = [
      { type: 'input', name: 'value', message: 'Value?' }
    ];

    this.prompt(prompts, function (props) {
      self.props = props;
      self.props.filters = [];
      self.props.attrs = [];
      self.props.inputs = [];
      self.props.outputs = [];

      function promptAddAttr(callback) {
        // ask for dictionary attributes
        self.prompt(addAttrPrompt, function (props) {
          if (props.add) {
            self.prompt(attrPrompts, function (props) {
              self.props.attrs.push(props);
              promptAddAttr(callback);
            });
          } else {
            callback();
          }
        });
      }

      function promptAddInput(callback) {
        self.prompt(addInputPrompt, function (props) {
          if (props.add) {
            self.prompt(namePrompt, function (props) {
              self.props.inputs.push(props);
              promptAddInput(callback);
            });
          } else {
            callback();
          }
        });
      }

      function promptAddOutput(callback) {
        self.prompt(addOutputPrompt, function (props) {
          if (props.add) {
            self.prompt(namePrompt, function (props) {
              self.props.outputs.push(props);
              promptAddOutput(callback);
            });
          } else {
            callback();
          }
        });
      }

      function promptAddFilter(callback) {
        self.prompt(addFilterPrompt, function (props) {
          if (props.add) {
            self.prompt(namePrompt.concat(valuePrompt), function (props) {
              self.props.filters.push(props);
              promptAddAttr(callback);
            });
          } else {
            callback();
          }
        });
      }

      if (!props.virtual) {
        self.prompt(duPrompt, function (props) {
          self.props.du = props;
          promptAddFilter(function () {
            if (self.props.tdef === TDEFS[0]) {
              promptAddInput(function () {
                promptAddOutput(function () {
                  done();
                });
              });
            } else {
              done();
            }
          });
        });
      } else {
        if (self.props.tdef === TDEFS[0]) {
          promptAddInput(function () {
            promptAddOutput(function () {
              done();
            });
          });
        } else {
          done();
        }
      }
    });
  },

  writing: {
    app: function () {
      var model = factory.createContainerRoot();
      factory.root(model);

      var pkgs = this.props.package.split('.');
      var pkg = createPackagesTree(pkgs, 0, model);

      var tdef;
      switch (this.props.tdef) {
        case 'Component':
          tdef = factory.createComponentType();
          break;

        case 'Group':
          tdef = factory.createGroupType();
          break;

        case 'Channel':
          tdef = factory.createChannelType();
          break;

        case 'Node':
          tdef = factory.createNodeType();
          break;
      }
      tdef.name = this.props.name;
      tdef.version = this.props.version;
      pkg.addTypeDefinitions(tdef);

      if (this.props.virtual) {
        var virtual = factory.createValue();
        virtual.name = "virtual";
        virtual.value = true;
        tdef.addMetaData(virtual);
      } else {
        var du = factory.createDeployUnit();
        du.name = this.props.du.name;
        du.version = this.props.version;

        tdef.addDeployUnits(du);

        this.props.filters.forEach(function (filter) {
          var f = factory.createValue();
          f.name = filter.name;
          f.value = filter.value;
          du.addFilters(f);
        });

        pkg.addDeployUnits(du);
      }

      var dic = factory.createDictionaryType();
      this.props.attrs.forEach(function (props) {
        var attr = factory.createDictionaryAttribute();
        attr.name = props.name;
        attr.optional = props.optional;
        attr.fragmentDependant = props.fragmentDependent;
        if (typeof props.defaultValue !== 'undefined') {
          attr.defaultValue = props.defaultValue;
        }
        attr.datatype = props.datatype.toUpperCase();
        dic.addAttributes(attr);
      });
      tdef.dictionaryType = dic;

      this.props.inputs.forEach(function (props) {
        var port = factory.createPortTypeRef();
        port.name = props.name;
        tdef.addProvided(port);
      });

      this.props.outputs.forEach(function (props) {
        var port = factory.createPortTypeRef();
        port.name = props.name;
        tdef.addRequired(port);
      });

      var modelStr = factory.createJSONSerializer().serialize(model);
      var filepath = this.destinationPath(this.props.name+'-'+this.props.version+'.json');
      this.fs.write(filepath, JSON.stringify(JSON.parse(modelStr), null, 2));
    }
  }
});
