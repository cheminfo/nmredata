import { getJcamp } from './util/getJcamp';
import { getLabels } from './util/getLabels';
import { extractZipFolder } from './util/extractZipFolder';
import { addDiaIDtoLabels } from './util/addDiaIDtoLabels';
import { getSignalData1D } from './util/getSignalData1D';
import { getNucleusFrom1DTag } from './util/getNucleusFrom1DTag';

const getSpectra = async (tagData, options) => {
  return {
    jcamp: await getJcamp(tagData, options),
    zip: await extractZipFolder(tagData, options),
  };
};

export async function nmredataToJSON(nmredata, options) {
  let moleculeAndMap = options.molecule;
  let data = {
    molecule: [
      {
        molfile: moleculeAndMap.molecule.toMolfile(),
      },
    ],
    spectra: [],
    correlations: [],
  };
  let spectra = data.spectra;
  let labels = getLabels(nmredata.ASSIGNMENT);
  labels = addDiaIDtoLabels(labels, moleculeAndMap);
  // if (nmredata['J'] && nmredata['J'].data) {
  //   let jMatrix = getJMatrix(nmredata['J'].data);
  // }

  for (let tag in nmredata) {
    if (!tag.toLowerCase().match(/1d/s)) continue;
    let frequencyLine = nmredata[tag].data.find((e) => e.value.larmor);
    let nucleus = getNucleusFrom1DTag(tag);

    let zipAndJcamp = await getSpectra(nmredata[tag], options);
    let spectrum = {
      source: {
        ...zipAndJcamp,
        jcampURL: null,
        original: [],
      },
      nucleus,
      frequency: frequencyLine.value.larmor,
      experiment: '1d',
      headComment: nmredata[tag].headComment,
    };

    let signalData = nmredata[tag].data.filter((e) => e.value.delta);
    spectrum.signals = signalData.map((sd) => {
      let signalData = getSignalData1D(sd.value, labels);
      console.log('signal', signalData);
      signalData.assignment.forEach((assignment) => {
        let label = labels[assignment];
        if (!signalData.diaID) signalData.diaID = [];
        if (!label) return;
        signalData.diaID = signalData.diaID.concat(label.diaID);
      });
      signalData.comment = sd.comment;
      return signalData;
    });
    spectra.push(spectrum);
  }
  return data;
}

// function getJMatrix(content) {
//   let matrix = [];
//   let labels = [];
//   content.forEach(conection => {
//     let {from, to, coupling} = conection.value;
//     if (!labels.includes(from)) labels.push(from);
//     if (!labels.includes(to)) labels.push(to);
//   })
// }
