
/*
 *  Copyright 2012 outaTiME.
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *  http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

var
  events = require('events'),
  util = require("util"),
  fs = require('fs'),
  path = require("path"),
  xml2js = require('xml2js'),
  ejs = require('ejs');

function _read (_instance, _in, _callback) {
  fs.readFile(_in, function (err, data) {
    if (err) {
      _instance.emit("error", err);
      return;
    }
    _instance.emit("read", _in, data);
    _callback(data);
  });
}

function _write (_instance, _data, _out) {
  if (_out) {
    fs.writeFile(_out, _data, function (err) {
      if (err) {
        _instance.emit("error", err);
        return;
      }
      _instance.emit("save", _out, _data);
      _instance.emit("done");
    });
  } else {
    _instance.emit("output", _data);
    _instance.emit("done");
  }
}

function _resolve (_template, _json) {
  return ejs.render(_template, _json);
}

function _transform (_instance, _in, _json, _out) {
  if (fs.existsSync(_in)) {
    fs.readFile(_in, "utf-8", function (err, template) {
      if (err) {
        _instance.emit("error", err);
        return;
      }
      _instance.emit("with-template", _in, template);
      _write(_instance, _resolve(template, _json), _out);
    });
  } else {
    _instance.emit("without-template");
    _write(_instance, JSON.stringify(_json));
  }
}

function Transformer() {
  events.EventEmitter.call(this);
}

util.inherits(Transformer, events.EventEmitter);

Transformer.prototype.transform = function (_in, _out, _style) {
  var
    self = this,
    dir = path.resolve(path.dirname(_in)),
    filename = path.basename(_in, path.extname(_in)),
    // if no style, look up for same input filename with "ejs" extension for template file
    input_template = _style || path.join(dir, filename + ".ejs"),
    parser = new xml2js.Parser(),
    re = /\.xml$/; // only xml files
  if (_in) {
    fs.lstat(_in, function(err, stat) {
      if (err) {
        self.emit("error", new Error("Error while trying to resolve the input file."));
        return;
      }
      if (stat.isFile() && re.test(_in)) {
        _read(self, _in, function (data) {
          parser.parseString(data, function (err, json) {
            if (err) {
              self.emit("error", err);
              return;
            }
            // transform
            _transform(self, input_template, json, _out ? path.join(dir, _out) : null);
          });
        });
      } else if (stat.isDirectory()) {
        self.emit("error", new Error("No valid input file specified, folder found."));
      }
    });
  } else {
    self.emit("error", new Error("Input file must be specified."));
  }
};

// export
module.exports = new Transformer();
