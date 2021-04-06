export function get1DSignals(data, labels, options = {}) {
  const { prefix } = options;
  let str = '';
  let nucleusArray = [];
  for (let spectrum of data) {
    console.log(spectrum.info);
    if (spectrum.info.dimension > 1) continue;

    let ranges = spectrum.ranges.values || [];

    let nucleus = spectrum.info.nucleus;
    let counter = 1;
    let subfix = '';
    nucleusArray.forEach((e) => {
      if (e === nucleus) counter++;
    });

    if (counter > 1) subfix = `#${counter}`;

    let toFix;
    switch (nucleus) {
      case '1H':
        str += `${prefix}1D_1H${subfix}>`;
        toFix = 2;
        break;
      case '13C':
        str += `${prefix}1D_13C${subfix}>`;
        toFix = 1;
    }
    nucleusArray.push(nucleus);

    if (spectrum.info.frequency) {
      str += `\nLarmor=${Number(spectrum.info.frequency).toFixed(2)}\\`;
    }
    // improve it because we have every thing in the browser, check if there is the posibility to add flat data {x, y}.
    // if (spectrum.isJcamp) {
    //     nmrRecord.file('jcampData/'+spectrum.jcamp.filename, spectrum.jcamp.data);
    //     str += '\nSpectrum_Location=file\:jcampData/' + spectrum.jcamp.filename + '\\';
    // } else if (spectrum.path) {
    //     console.log(spectrum)
    //     let pdataIndex = spectrum.path.indexOf('pdata');
    //     let path = spectrum.path.slice(0, pdataIndex).join('/');
    //     let zipFolder = zip.filter(file => file.includes(path));
    //     console.log(zipFolder)
    //     for (let file of zipFolder) {
    //         if (file.dir) continue;
    //         let fileData = await zip.file(file.name).async('uint8array');
    //         nmrRecord.file(file.name, fileData);
    //     }
    //     str += '\nSpectrum_Location=file\:' + spectrum.path.join('/') + '/\\' ;
    // }

    for (let range of ranges) {
      let signals = range.signal.filter(
        (s) => s.hasOwnProperty('diaID') && s.diaID.length,
      );
      if (debugg) console.log('signals', signals);

      for (let signal of signals) {
        let { multiplicity } = signal;
        if ((!multiplicity || multiplicity === 'm') && nucleus === '1H') {
          str +=
            `\n${
              Number(range.from).toFixed(toFix)
            }-${
              Number(range.to).toFixed(toFix)}`;
        } else if (signal.hasOwnProperty('delta')) {
          str += `\n${Number(signal.delta).toFixed(toFix)}`;
        } else {
          continue;
        }

        let signalLabel = '';

        signal.diaID.forEach((diaID, i, arr) => {
          let separator = ', ';
          if (i === arr.length - 1) separator = '';
          let label = labels.byDiaID[diaID].label || diaID;
          signalLabel += `(${label})${separator}`;
        });
        str += `, L=${signalLabel}`;
        if (nucleus === '1H') {
          if (signal.multiplicity) str += `, S=${signal.multiplicity}`;

          let jCoupling = signal.j;
          if (Array.isArray(jCoupling) && jCoupling.length) {
            let separator = ', J=';
            for (let i = 0; i < jCoupling.length; i++) {
              str += `${separator}${Number(jCoupling[i].coupling).toFixed(3)}`;
              if (jCoupling[i].diaID) {
                let { diaID } = jCoupling[i];
                if (!Array.isArray(diaID)) diaID = [diaID];
                if (!diaID.length) continue;
                let jCouple = labels[diaID[0]].label || String(diaID[0]);
                str += `(${jCouple})`;
              }
              separator = ', ';
            }
          }
          if (range.integral) {
            str += `, E=${Number(range.integral).toFixed(toFix)}`;
          } else if (range.pubIntegral) {
            str += `, E=${range.putIntegral.toFixed(toFix)}`;
          } else if (range.signal[0].nbAtoms !== undefined) {
            str += `, E=${range.signal[0].nbAtoms}`;
          }
        }
      }
      if (signals.length) str += '\\';
    }
    str += '\n';
  }

  return str;
}
