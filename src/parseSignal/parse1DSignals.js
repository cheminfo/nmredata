export function parse1DSignal(content, labels) {
    let signal = {};
    content = content.replace(/ /g, '');
    content = content.replace(/,([0-9])/g, ':$1');
    let data = content.split(',');
    data.forEach((d) => {
        d = d.toLowerCase();
        let value = d.replace(/^.*=/, '');
        let key = d.replace(/[=].*/, '');
        
        if (parseFloat(key)) {
            signal.delta = value
        } else {
            signal[choseKey(key)] = key === 'j' ? getCoupling(value) : value;
        }        
    });
    return signal;
}

function choseKey(entry) {
    let key = '';
    switch (entry) {
        case 'j':
            key = 'J'
            break;
        case 's':
            key= 'multiplicity';
            break
        case 'l':
            key= 'pubAssignment';
            break
        case 'n':
            key= 'nbAtoms';
            break
        case 'e':
        case 'i':
            key= 'pubIntegral';
            break
    }
    return key;
}
function getCoupling(d) {
    let jCoupling = [];
    d = d.split(':');
    d.forEach((c) => {
        let toValue = c.indexOf('(');
        var value = Number(c.substring(0, toValue));
        var withIt = c.substring(toValue + 1, c.length - 1);
        jCoupling.push({coupling: value, diaID: withIt})
    });
    return jCoupling;
}
