export default function getPascal(n, spin) {
  line = [1];
  if (n === 0) return (line);
  var mult = 2 * spin + 1;
  for (var j = 0; j < mult - 1; j++) line.push(1);
  // complete with "1 1" or "1 1 1" for spin 1/2 and 1 respectively
  var previousLine = line;
  for (var i = 0; i < (n - 1); i++) {
    var line = [];
    for (j = 0; j < mult; j++) {
      if (j === 0) { 
        for (var k = 0; k < previousLine.length; k++) line.push(previousLine[k]);
      }// copy the line
      else {
        for ( k = 0; k < previousLine.length - 1; k++) line[k + j] += previousLine[k]; // add the previous line
        line.push(1); // complete the line
      }
    }
    previousLine = line;
  }
  return line;
}
