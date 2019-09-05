module.exports = function parse2DCor(content, labels) {
  var eol = '\\\n';
  let signals = content.split(eol);
  var spectrum = {zone: {signal: []}};
  var zone = spectrum.zone;
  for (let i = 0; i < signals.length; i++) {
      if (signals[i].startsWith(';')) continue; //avoid the comments on the record
      var signal = {};
      let indexComment = signals[i].indexOf(';');
      if (indexComment > -1) signals[i] = signals[i].substring(0,indexComment);
      signals[i] = signals[i].replace(/ /g, '');
      signals[i] = signals[i].replace(/,([0-9])/g, ':$1');
      let data = signals[i].split(',');
      
      data.forEach((d) => {
          if (d.toLowerCase().match('larmor')) {
              spectrum.frequency = d.toLowerCase().replace('larmor=','');
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