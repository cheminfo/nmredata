import { getShortestPaths } from 'openchemlib-utils';

export function addDiaIDtoLabels(labels, moleculeWithMap) {
  let { molecule, map } = moleculeWithMap;
  // ADD HIDROGENS TO BE SURE, THE ORIGINAL POSITION IT IS MAP OBJECT
  molecule.addImplicitHydrogens();

  let connections = getShortestPaths(molecule, { toLabel: 'H', maxLength: 1 });
  // parse each label to get the connectivity of Hidrogens

  for (let l in labels) {
    let label = labels[l];
    let atoms = label.atoms;
    if (atoms.length < 1) continue;
    label.position = [];
    if (atoms[0].toLowerCase().includes('h')) {
      // this is for implicit hidrogens
      let connectedTo = Number(atoms[0].toLowerCase().replace('h', '')) - 1;
      // map object has the original atom's possition in molfile
      connectedTo = map.indexOf(connectedTo);

      let shortPath = connections[connectedTo].find(
        (path) => path && path.length > 1,
      );
      label.position = connections[shortPath[0]]
        .filter((hc) => hc && hc.length > 1)
        .map((hc) => hc[hc.length - 1]);
    } else if (atoms[0].toLowerCase().match(/\w/s)) {
      atoms.forEach((a) => {
        let p = map.indexOf(Number(a) - 1);
        label.position.push(p);
      });
    }
  }

  let diaIDs = molecule.getDiastereotopicAtomIDs();

  for (let l in labels) {
    let diaID = [];
    if ('position' in labels[l]) {
      labels[l].position.forEach((p) => {
        if (diaID.indexOf(diaIDs[p]) === -1) {
          diaID.push(diaIDs[p]);
        }
      });
    }
    labels[l].diaIDs = diaID;
  }
  return labels;
}
