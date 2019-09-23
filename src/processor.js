import {parse1DSignal} from './parseSignal/parse1DSignals';

export function processContent(content, options) {
    let {tag} = options;
    let result;
    console.log(tag)
    let processor = resultType(tag);
    let matchEqual = content.match(/=/g);
    if (!matchEqual && !content.match(',')) {
        result = content;
    } else if (matchEqual && matchEqual.length === 1) {
        result = propertyLinesProcessor(content);
    }else {
        result = processor(content, options);
    }
    return result;
}

function resultType(tag) {
    let processor;
    let ctag = tag.toLowerCase();
    if (ctag.match(/1d/)) ctag = '1d';
    switch (ctag.toLowerCase()) {
        case 'id':  //it has property lines
            processor = propertyLinesProcessor;
            break;
        case '1d': //it has item list
            processor = parse1DSignal;
            break;
        case 'assignment': //it has item list
        case 'signals':
            processor = processAssignment;
            break;
        case 'j':
            processor = processAssignment; //@TODO change it
            break;
        case 'version':
        case 'solvent':
        case 'temperature':
        case 'level':
            break
    }
    return processor;
}

function propertyLinesProcessor(content, options) {
    let value = content.replace(/^.*=/, '');
    let key = content.replace(/[=].*/, '');
    return {key, value};
}

function processAssignment(content) {
    content = content.replace(/ /g, '');
    content = content.split(',');
    let label = content[0].toLowerCase();
    let shift = content.slice(1, 2);//Be able to know when the shift published or not
    let atoms = content.slice(2); 
    return {label, shift, atoms};
}