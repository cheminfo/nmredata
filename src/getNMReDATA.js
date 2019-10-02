// export class getNMReDATA {
//   // here julien can include his code analysing the NMReDATA tags...
//   // see http://nmredata.org/wiki/Nmredata_object_structure  for possible field name...
// }


const Jszip = require('jszip');
const OCLfull = require('openchemlib-extended');

async function readNmrRecord(zipData, options = {}) {
  var zip = new Jszip();
  return zip.loadAsync(zipData, { base64: true }).then(async (zipFiles) => {
    var folders = zipFiles.filter(function (relativePath, file) {
      if (relativePath.indexOf('ser') >= 0 || relativePath.indexOf('fid') >= 0
            || relativePath.indexOf('1r') >= 0 || relativePath.indexOf('2rr') >= 0) {
        return true;
      }
      return false;
    });
    let result = [];
    for (let file in zipFiles.files) {
      let pathFile = file.split('/');
      if (pathFile[pathFile.length - 1].match(/^[^\.].+sdf$/)) {
        var sdfPathFile = [];
        if (file.indexOf('/') > -1) {
          let index = file.lastIndexOf('/');
          let tempPath = file.substring(0, index).toLowerCase().split('/');
          if (tempPath !== '.') sdfPathFile = tempPath;
        }
        let sdf = await zipFiles.file(file).async('string');
        // sdf = sdf.replace(/\\/g, '')
        let parserResult = parse(`${sdf}`, { mixedEOL: true });
        let tempMol = OCLfull.Molecule.fromMolfileWithAtomMap(parserResult.molecules[0].molfile);
        let map = tempMol.map;
        let molecule = OCLfull.Molecule.fromMolfile(parserResult.molecules[0].molfile);
        var nmrRecord = nmredataToSampleEln(parserResult, map);
        result.push(nmrRecord);
      }
    }
    return result;
  });
}

function nmredataToSampleEln(parserResult, map) {
  let debugg = false;
  if (debugg) console.log('entra', parserResult);
  var samples = new Array(parserResult.molecules.length);
  var nmrEdataLabels = parserResult.labels.filter((l) => l.toLowerCase().match('nmredata'));
  var nmrEdataVersion = parseFloat(parserResult.molecules[0].NMREDATA_VERSION);
  var assignment = nmrEdataVersion > 0.97 ? 'NMREDATA_ASSIGNMENT' : 'NMREDATA_SIGNALS';
  var eol = '\\\n';
  for (let i = 0; i < parserResult.molecules.length; i++) {
    var data = { molfile: parserResult.molecules[i].molfile, spectra: [], atoms: {}, highlight: [] };
    var nmr = data.spectra;
    if (debugg) console.log('lobes', parserResult.molecules[i][assignment], assignment);
    var labels = getLabels(parserResult.molecules[i][assignment]);
    if (debugg) console.log('data input', data);
    labels = addDiaIDtoLabels(labels, data.molfile, map);
    if (debugg) console.log('labels', labels);
    Object.keys(labels).forEach((key) => {
      let diaID = labels[key].diaID;
      data.atoms[diaID] = labels[key].position;
      data.highlight.push(diaID);
    });
    if (debugg) console.log('new data', data);

    if (nmrEdataLabels.length) {
      console.log('getting signals', nmrEdataLabels);
      console.log(' labels', nmrEdataLabels);
      console.log(parserResult.molecules[i].NMREDATA_1D_1H);
      for (let l of nmrEdataLabels) {
        let spectrum;
        let content = parserResult.molecules[i][l];
        console.log('--------', l);
        console.log(content);
        if (content === undefined) continue; // avoid undefined labels on the record
        l = l.toUpperCase();
        //   console.log('hola ',l)
        if (l.match(/1D/s)) {
          if (debugg) console.log('nmredata_1D');
          console.log('entrasignal');
          spectrum = parse1DSignals(content, labels);
          console.log('pasalabels');
          spectrum.nucleus = getNucleus(l);
          if (debugg) console.log('spectrum', spectrum);
          nmr.push(spectrum);
        } else if (l.match(/NMREDATA_2D*/s)) {
          if (debugg) console.log('nmredata_2D');
          // continue
          spectrum = parse2DCor(content, labels);
          spectrum.nucleus = getNucleus(l);
          nmr.push(spectrum);
        } else if (l.match(/TEMPERATURE/s)) {
          var temperature = content;
        }
      }
    }
    if (temperature) {
      nmr.forEach((s) => s.temperature = temperature);
    }

    samples[i] = data;
    console.log('molfile', data.molfile);
    console.log('labels', labels);
  }
  if (debugg) console.log('nmredata finish');
  return samples;
}

function getNucleus(label) {
  let nucleus = [];
  let dimensions = label.match(/NMREDATA_([0-9])\w_/s)[1];
  if (dimensions === '1') {
    nucleus = label.substring(12, label.length).split('_');
  } else if (dimensions === '2') {
    let data = label.substring(12, label.length).split('_');
    for (let i = 0; i < data.length; i += 2) nucleus.push(data[i]);
  }
  return nucleus;
}

function parse2DCor(content, labels) {
  var eol = '\\\n';
  let signals = content.split(eol);
  var spectrum = { zone: { signal: [] } };
  var zone = spectrum.zone;
  for (let i = 0; i < signals.length; i++) {
    if (signals[i].startsWith(';')) continue; // avoid the comments on the record
    var signal = {};
    let indexComment = signals[i].indexOf(';');
    if (indexComment > -1) signals[i] = signals[i].substring(0, indexComment);
    signals[i] = signals[i].replace(/ /g, '');
    signals[i] = signals[i].replace(/,([0-9])/g, ':$1');
    let data = signals[i].split(',');

    data.forEach((d) => {
      if (d.toLowerCase().match('larmor')) {
        spectrum.frequency = d.toLowerCase().replace('larmor=', '');
      } else if (d.toLowerCase().match('cortype')) {
        spectrum.experiment = d.toUpperCase().replace(/CORTYPE=/s, '');
      } else if (d.toLowerCase().match('spectrum_location')) {
        spectrum.spectraLocation = d.toLowerCase().replace('spectrum_location=', '');
      } else {
        signal.pubAssignment = d;
      }
    });
    if (Object.keys(signal).length > 0) zone.signal.push(signal);
  }
  console.log(spectrum);
  return spectrum;
}

function parse1DSignals(content, labels) {
  var eol = '\\\n';
  let signals = content.split(eol);
  var spectrum = { range: [], experiment: '1d' };
  var range = spectrum.range;
  for (let i = 0; i < signals.length; i++) {
    if (signals[i].startsWith(';')) continue; // avoid the comments on the record
    var signal = {};
    let indexComment = signals[i].indexOf(';');
    if (indexComment > -1) signals[i] = signals[i].substring(0, indexComment);
    signals[i] = signals[i].replace(/ /g, '');
    signals[i] = signals[i].replace(/,([0-9])/g, ':$1');
    let data = signals[i].split(',');
    data.forEach((d) => {
      d = d.toLowerCase();
      console.log('---- this is d\n', d);
      if (d[0] === 'j') {
        signal.J = getCoupling(d);
      } else if (d.match('s=')) {
        signal.multiplicity = d.replace(/s=/s, '');
      } else if (d.match(/^l=/s)) {
        console.log('entra a laebl');
        let label = d.replace(/l=/s, '').toLowerCase();
        if (labels[labels] === undefined) return;
        let atoms = labels[label].atoms;
        signal.nbAtoms = atoms.length;
        signal.diaID = labels[label].diaID;
      } else if (d[0].match(/[0-9]/)) {
        signal.delta = Number(d);
      } else if (d.match('larmor')) {
        spectrum.frequency = Number(d.replace('larmor=', ''));
      } else if (d.match('spectrum_location')) {
        spectrum.spectraLocation = d.replace('spectrum_location=', '');
      } else if (d.match('sequence')) {
        spectrum.experiment = d.replace('sequence=', '').toUpperCase();
      }
    });
    if (Object.keys(signal).length > 0) {
      signal = [signal];
      range.push({
        from: signal[0].delta,
        to: signal[0].delta,
        signal
      });
    }
  }
  return spectrum;
}

function getCoupling(d) {
  let jCoupling = [];
  let fromValue = d.indexOf('=');
  d = d.substring(fromValue + 1, d.length);
  d = d.split(':');
  d.forEach((c) => {
    let toValue = c.indexOf('(');
    var value = Number(c.substring(0, toValue));
    var withIt = c.substring(toValue + 1, c.length - 1);
    jCoupling.push({ coupling: value, diaID: withIt });
  });
  return jCoupling;
}

function getLabels(content) {
  var eol = '\\\n';
  let labels = {};
  content = content.split(eol);
  content.forEach((c) => {
    console.log(c);
    c = c.replace(/ /g, '');
    if (c.startsWith(';') || c.length === 0) return;
    c = c.replace(/\n|\\/g, '').split(',');
    let label = c[0].toLowerCase();
    if (!labels[label]) labels[label] = {};
    labels[label].shift = c.slice(1, 2); // Be able to know when the shift published or not
    labels[label].atoms = c.slice(2);
  });

  return labels;
}

function addDiaIDtoLabels(labels, molfile, map) {
  if (!molfile || !labels) return;
  let debugg = false;
  let molecule = OCLfull.Molecule.fromMolfile(molfile);
  // ADD HIDROGENS TO BE SURE, THE ORIGINAL POSITION IT IS MAP OBJECT
  molecule.addImplicitHydrogens();

  let connections = molecule.getAllPaths({ toLabel: 'H', maxLength: 1 });
  if (debugg) console.log('conections', connections);
  // parse each label to get the connectivity of Hidrogens

  let minLabels = getMinLabel(labels);
  if (debugg) console.log('min of labels', minLabels);
  for (let l in labels) {
    let label = labels[l];
    let atoms = label.atoms;
    label.position = [];
    console.log('label', label);
    if (atoms[0].toLowerCase().includes('h')) {
      let connectedTo = Number(atoms[0].toLowerCase().replace('h', '')) - minLabels;
      console.log(connectedTo);
      // map object has the original atom's possition in molfile
      connectedTo = map.indexOf(connectedTo);
      if (debugg) console.log('hidrogen connected to:', connectedTo);
      let connection = connections.find((c, i) => {
        if (c.fromAtoms.some((fa) => fa === connectedTo)) {
          connections.splice(i, 1);
          return true;
        }
      });
      if (debugg) console.log('connection', connection);
      label.position = connection.toAtoms;
    } else if (atoms[0].toLowerCase().match(/\w/s)) {
      atoms.forEach((a) => {
        let p = map.indexOf(Number(a) - minLabels);
        console.log(p, a);
        label.position.push(p);
      });
    }
  }

  let diaIDs = molecule.getDiastereotopicAtomIDs();

  for (let l in labels) {
    let diaID = [];
    labels[l].position.forEach((p) => {
      if (diaID.indexOf(diaIDs[p]) === -1) {
        diaID.push(diaIDs[p]);
      }
    });
    if (debugg) console.log('diaID', diaID);
    labels[l].diaID = diaID;
  }
  return labels;
}

function getMinLabel(labels) {
  let min = Number.MAX_SAFE_INTEGER;
  for (let l in labels) {
    let label = labels[l];
    label.atoms.forEach((p) => {
      let pt = Number(p.replace(/[a-z]/g, ''));
      if (pt < min) min = pt;
    });
  }
  return min;
}

function parse(sdf, options = {}) {
  const {
    include,
    exclude,
    filter,
    modifiers = {},
    forEach = {},
    dynamicTyping = true
  } = options;

  if (typeof sdf !== 'string') {
    throw new TypeError('Parameter "sdf" must be a string');
  }

  var eol = '\n';
  if (options.mixedEOL) {
    sdf = sdf.replace(/\r\n/g, '\n');
    sdf = sdf.replace(/\r/g, '\n');
  } else {
    // we will find the delimiter in order to be much faster and not use regular expression
    var header = sdf.substr(0, 1000);
    if (header.indexOf('\r\n') > -1) {
      eol = '\r\n';
    } else if (header.indexOf('\r') > -1) {
      eol = '\r';
    }
  }

  var sdfParts = sdf.split(new RegExp(`${eol}\\$\\$\\$\\$.*${eol}`));
  var molecules = [];
  var labels = {};

  var start = Date.now();

  for (var i = 0; i < sdfParts.length; i++) {
    var sdfPart = sdfParts[i];
    var parts = sdfPart.split(`${eol}>`);
    if (parts.length > 0 && parts[0].length > 5) {
      var molecule = {};
      var currentLabels = [];
      molecule.molfile = parts[0] + eol;
      for (var j = 1; j < parts.length; j++) {
        var lines = parts[j].split(eol);
        var from = lines[0].indexOf('<');
        var to = lines[0].indexOf('>');
        var label = lines[0].substring(from + 1, to);
        currentLabels.push(label);
        if (!labels[label]) {
          labels[label] = {
            counter: 0,
            nbLines: '',
            isNumeric: dynamicTyping,
            keep: false
          };
          if (
            (!exclude || exclude.indexOf(label) === -1) &&
                        (!include || include.indexOf(label) > -1)
          ) {
            labels[label].keep = true;
            if (modifiers[label]) labels[label].modifier = modifiers[label];
            if (forEach[label]) labels[label].forEach = forEach[label];
          }
        }
        if (labels[label].keep) {
          for (var k = 1; k < lines.length - 1; k++) {
            if (molecule[label]) {
              molecule[label] += eol + lines[k];
            } else {
              molecule[label] = lines[k];
            }
          }
          if (labels[label].modifier) {
            var modifiedValue = labels[label].modifier(molecule[label]);
            if (modifiedValue === undefined || modifiedValue === null) {
              delete molecule[label];
            } else {
              molecule[label] = modifiedValue;
            }
          }
          if (labels[label].isNumeric) {
            if (!isFinite(molecule[label]) || molecule[label].match(/^0[0-9]/)) {
              labels[label].isNumeric = false;
            }
          }
        }
      }
      if (!filter || filter(molecule)) {
        molecules.push(molecule);
        // only now we can increase the counter
        for (j = 0; j < currentLabels.length; j++) {
          var currentLabel = currentLabels[j];
          labels[currentLabel].counter++;
        }
      }
    }
  }
  '';
  // all numeric fields should be converted to numbers
  for (label in labels) {
    currentLabel = labels[label];
    if (currentLabel.isNumeric) {
      currentLabel.minValue = Infinity;
      currentLabel.maxValue = -Infinity;
      for (j = 0; j < molecules.length; j++) {
        if (molecules[j][label]) {
          var value = parseFloat(molecules[j][label]);
          molecules[j][label] = value;
          if (value > currentLabel.maxValue) currentLabel.maxValue = value;
          if (value < currentLabel.minValue) currentLabel.minValue = value;
        }
      }
    }
  }

  // we check that a label is in all the records
  for (var key in labels) {
    if (labels[key].counter === molecules.length) {
      labels[key].always = true;
    } else {
      labels[key].always = false;
    }
  }

  var statistics = [];
  for (key in labels) {
    var statistic = labels[key];
    statistic.label = key;
    statistics.push(statistic);
  }

  return {
    time: Date.now() - start,
    molecules: molecules,
    labels: Object.keys(labels),
    statistics: statistics
  };
}

async function convertFromZip(zip, folder) {
  let debugg = false;
  var BINARY = 1;
  var TEXT = 2;
  var files = {
    ser: BINARY,
    fid: BINARY,
    acqus: TEXT,
    acqu2s: TEXT,
    procs: TEXT,
    proc2s: TEXT,
    '1r': BINARY,
    '1i': BINARY,
    '2rr': BINARY
  };
  var len = folder.name.length;
  var name = folder.name;
  name = name.substr(0, name.lastIndexOf('/') + 1);
  if (debugg) console.log(name);
  let folderName = name.substr(0, name.lastIndexOf('/') + 1);
  var currFolder = zip.folder(name);
  if (debugg) console.log(currFolder);
  var currFiles = currFolder.filter(function (relativePath, file) {
    return files[relativePath] ? true : false;
  });
  var brukerFiles = {};
  if (name.indexOf('pdata') >= 0) {
    brukerFiles.acqus = await zip.file(name.replace(/pdata\/[0-9]+\//, 'acqus')).async('string');
  }
  for (var j = 0; j < currFiles.length; ++j) {
    var idx = currFiles[j].name.lastIndexOf('/');
    var name = currFiles[j].name.substr(idx + 1);
    if (files[name] === BINARY) {
      let arrayBuffer = await currFiles[j].async('arraybuffer');
      brukerFiles[name] = new IOBuffer(arrayBuffer);
    } else {
      brukerFiles[name] = await currFiles[j].async('string');
    }
  }
  return BrukerConverter.converFolder(brukerFiles, { xy: true, keepSpectra: true, keepRecordsRegExp: /.*/, base64: true });
}

function getMetadata(jcamp, info) {
  const metadata = {
    dimension: jcamp.twoD ? 2 : 1,
    nucleus: [],
    isFid: false,
    isFt: false
  };

  maybeAdd(metadata, 'title', info.TITLE);
  maybeAdd(metadata, 'solvent', info['.SOLVENTNAME']);
  maybeAdd(metadata, 'pulse', info['.PULSESEQUENCE'] || info['.PULPROG'] || info.$PULPROG);
  maybeAdd(metadata, 'experiment', getSpectrumType(metadata.pulse));
  maybeAdd(metadata, 'temperature', parseFloat(info.$TE || info['.TE']));
  maybeAdd(metadata, 'frequency', parseFloat(info['.OBSERVEFREQUENCY'] || info.observefrequency || info.$SFO1));
  maybeAdd(metadata, 'type', info.DATATYPE);

  if (metadata.type) {
    if (metadata.type.toUpperCase().indexOf('FID') >= 0) {
      metadata.isFid = true;
    } else if (metadata.type.toUpperCase().indexOf('SPECTRUM') >= 0) {
      metadata.isFt = true;
    }
  }

  if (metadata.dimension === 1) {
    const nucleus = info['.OBSERVENUCLEUS'] || info.$NUC1;
    console.log('nucleus', nucleus);
    if (nucleus) {
      metadata.nucleus = [nucleus.replace(/[^A-Za-z0-9]/g, '')];
    }
  } else {
    const nucleus = info['.NUCLEUS'] || `${info['2D_X_NUCLEUS'].replace(/[^A-Za-z0-9]/g, '')},${info['2D_Y_NUCLEUS'].replace(/[^A-Za-z0-9]/g, '')}`;
    console.log('nucleus', nucleus);
    if (nucleus) {
      metadata.nucleus = nucleus.split(',').map((nuc) => nuc.trim());
    }
  }
  if (metadata.nucleus.length === 0 || metadata.dimension !== 1) {
    metadata.nucleus = getNucleusFrom2DExperiment(metadata.experiment);
  }

  if (info.$DATE) {
    metadata.date = (new Date(info.$DATE * 1000)).toISOString();
  }

  return metadata;
}

function maybeAdd(obj, name, value) {
  if (value) {
    obj[name] = value;
  }
}

function getNucleusFrom2DExperiment(experiment) {
  if (typeof experiment !== 'string') {
    return [];
  }
  experiment = experiment.toLowerCase();
  if (experiment.includes('jres')) {
    return ['1H'];
  }
  if (experiment.includes('hmbc') || experiment.includes('hsqc')) {
    return ['1H', '13C'];
  }
  return ['1H', '1H'];
}

function getSpectrumType(pulse) {
  if (typeof pulse !== 'string') {
    return '';
  }

  pulse = pulse.toLowerCase();
  if (pulse.includes('zg')) {
    return '1d';
  }

  if (pulse.includes('hsqct') ||
      (pulse.includes('invi') && (pulse.includes('ml') || pulse.includes('di')))) {
    return 'hsqctocsy';
  }

  if (pulse.includes('hsqc') || pulse.includes('invi')) {
    return 'hsqc';
  }

  if (pulse.includes('hmbc') || (pulse.includes('inv4') && pulse.includes('lp'))) {
    return 'hmbc';
  }

  if (pulse.includes('cosy')) {
    return 'cosy';
  }

  if (pulse.includes('jres')) {
    return 'jres';
  }

  if (pulse.includes('tocsy') || pulse.includes('mlev') || pulse.includes('dipsi')) {
    return 'tocsy';
  }

  if (pulse.includes('noesy')) {
    return 'noesy';
  }

  if (pulse.includes('roesy')) {
    return 'roesy';
  }

  if (pulse.includes('dept')) {
    return 'dept';
  }

  if (pulse.includes('jmod') || pulse.includes('apt')) {
    return 'aptjmod';
  }

  return '';
}

module.exports = readNmrRecord;
