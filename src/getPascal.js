function getPascal(n,spin) {
    if (n===0) return(1);
    var mult=2*spin+1;
    var previous_line=[];
    for (var j=0; j<mult; j++) previous_line.push(1);// initialize with "1 1" or "1 1 1" for spin 1/2 and 1 respectively
    for (var i=0; i<n-1; i++) {
    var line=[];
        for (var j=0; j<mult; j++) {
        if (j===0) for (var k=0; k<previous_line.length;k++) line.push(previous_line[k]);// copy the line
        else for (var k=0; k<previous_line.length-1;k++) line[k+j]+=previous_line[k]; // add the previous line
        line.push(1); // complete the line
        } 
    previous_line=line;
    }
    return line;
}
