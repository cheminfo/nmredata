module.exports = function parse1DSignals(content, labels) {
    var eol = '\\\n';
    let signals = content.split(eol);
    var spectrum = {range: [], experiment: '1d'};
    var range = spectrum.range;
    for (let i = 0; i < signals.length; i++) {
        if (signals[i].startsWith(';')) continue; //avoid the comments on the record
        var signal = {};
        let indexComment = signals[i].indexOf(';');
        if (indexComment > -1) signals[i] = signals[i].substring(0,indexComment);
        signals[i] = signals[i].replace(/ /g, '');
        signals[i] = signals[i].replace(/,([0-9])/g, ':$1');
        let data = signals[i].split(',');
        data.forEach((d) => {
            d = d.toLowerCase();
            console.log('---- this is d\n',d)
            if (d[0] === 'j') {
                signal.J = getCoupling(d);
            } else if (d.match('s=')) {
                signal.multiplicity = d.replace(/s=/s, '');
            } else if (d.match(/^l=/s)) {
                console.log('entra a laebl')
                let label = d.replace(/l=/s, '').toLowerCase();
                if (labels[labels]=== undefined) return;
                let atoms = labels[label].atoms;
                signal.nbAtoms = atoms.length;
                signal.diaID = labels[label].diaID;
            } else if (d[0].match(/[0-9]/)) {
                signal.delta = Number(d);
            } else if (d.match('larmor')) {
                spectrum.frequency = Number(d.replace('larmor=',''));
            } else if (d.match('spectrum_location')) {
                spectrum.spectraLocation = d.replace('spectrum_location=', '')
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
