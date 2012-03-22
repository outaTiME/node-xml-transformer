
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

// This file is for use with Node.js. See dist/ for browser files.


var
  events = require('events'),
  util = require("util"),
  fs = require('fs'),
  path = require("path"),
  xml2js = require('xml2js'),
  hogan = require("hogan.js");

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
    var filename = path.resolve(__dirname, _out);
    fs.writeFile(filename, _data, function (err) {
      if (err) {
        _instance.emit("error", err);
        return;
      }
      _instance.emit("save", filename, _data);
      _instance.emit("done");
    });
  } else {
    _instance.emit("output", _data);
    _instance.emit("done");
  }
}

function _transform (_instance, _in, _json, _out) {
  if (path.existsSync(_in)) {
    fs.readFile(_in, "utf-8", function (err, template) {
      if (err) {
        _instance.emit("error", err);
        return;
      }
      _instance.emit("with-template", _in, template);
      _write(_instance, hogan.compile(template).render(_json), _out);
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
    input = path.resolve(__dirname, _in),
    input_dir = path.dirname(input),
    filename = path.basename(input, path.extname(input)),
    // if no style, look up for same input and same place "mustache" template file
    input_template = _style || path.resolve(input_dir, filename + ".mustache"),
    parser = new xml2js.Parser();
  if (_in) {
    if (path.existsSync(_in)) {
      // read file
      _read(self, input, function (data) {
        // parse XML
        parser.parseString(data, function (err, json) {
          if (err) {
            self.emit("error", err);
            return;
          }
          // transform
          _transform(self, input_template, json, _out);
        });
      });
    } else {
      self.emit("error", new Error("The specified input file not found."));
    }
  } else {
    self.emit("error", new Error("Input file must be specified."));
  }
};

// export
module.exports = new Transformer();
