import { toObject } from './converter/util/toObject';
import { parse1DSignal } from './parseSignal/parse1DSignal';
import { parse2DSignal } from './parseSignal/parse2DSignal';

export function processContent(content, options) {
  let { tag } = options;
  let processor = chooseProcessor(tag);
  let matchEqual = content.match(/[=]/g);
  if (!matchEqual && !content.match(',')) {
    if (tag.toLowerCase().match(/2d/)) return processor(content, options);
    return content;
  } else if (matchEqual && !content.match(',')) {
    return propertyLinesProcessor(content);
  } else {
    return processor(content, options);
  }
}

function chooseProcessor(tag) {
  let ctag = tag.toLowerCase();
  if (ctag.match(/1d/)) ctag = '1d';
  if (ctag.match(/2d/)) ctag = '2d';
  switch (ctag) {
    case 'id': // it has property lines
      return propertyLinesProcessor;
    case '1d': // it has item list
      return parse1DSignal;
    case '2d':
      return parse2DSignal;
    case 'assignment': // it has item list
    case 'signals':
      return processAssignment;
    case 'j':
      return processAssignment; // @TODO change it
    case 'version':
    case 'solvent':
    case 'temperature':
    case 'level':
    default:
  }
}

function propertyLinesProcessor(content) {
  let value = content.replace(/^.*=/, '');
  let key = content.replace(/[=].*/, '').toLowerCase();
  return toObject([{ key, value }]);
}

function processAssignment(content) {
  content = content.replace(/ /g, '').split(',');
  return toObject([
    { key: 'label', value: content[0].toLowerCase() },
    { key: 'shift', value: content.slice(1, 2) },
    { key: 'atoms', value: content.slice(2) },
  ]);
}
