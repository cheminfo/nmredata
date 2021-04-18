import { addDiaIDtoLabels } from './util/addDiaIDtoLabels';
import { extractZipFolder } from './util/extractZipFolder';
import { getJcamp } from './util/getJcamp';
import { getLabels } from './util/getLabels';
import { getNucleusFromTag } from './util/getNucleusFromTag';
import { getSignalData1D } from './util/getSignalData1D';
import { getSignalData2D } from './util/getSignalData2D';

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
  };
  let spectra = data.spectra;
  let labels = getLabels(nmredata.ASSIGNMENT);
  labels = addDiaIDtoLabels(labels, moleculeAndMap);
  // if (nmredata['J'] && nmredata['J'].data) {
  //   let jMatrix = getJMatrix(nmredata['J'].data);
  // }

  for (let tag in nmredata) {
    let ctag = tag.toLowerCase();
    if (!tag.toLowerCase().match(/[1|2]d_/s)) continue;
    let dimension = ctag.replace(/([1|2]d)_.*/, '$1');
    let is2D = dimension === '2d';
    let frequencyLine = nmredata[tag].data.find((e) => e.value.larmor);

    let nucleus = getNucleusFromTag(tag);
    let signalProcessor = is2D ? getSignalData2D : getSignalData1D;

    let zipAndJcamp = await getSpectra(nmredata[tag], options);
    let spectrum = {
      source: {
        ...zipAndJcamp,
        jcampURL: null,
        original: [],
      },
      nucleus,
      frequency: frequencyLine.value.larmor,
      experiment: dimension,
      headComment: nmredata[tag].headComment,
    };

    let signalData = nmredata[tag].data.filter((e) => e.value.delta);
    spectrum.signals = signalData.map((sd) => {
      let signalData = signalProcessor(sd.value, labels);
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
