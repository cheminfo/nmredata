import { addDiaIDtoLabels } from './util/toJSON/addDiaIDtoLabels';
import { getBrukerFiles } from './util/toJSON/getBrukerFiles';
import { getJcamp } from './util/toJSON/getJcamp';
import { getLabels } from './util/toJSON/getLabels';
import { getNucleusFromTag } from './util/toJSON/getNucleusFromTag';
import { getSignalData1D } from './util/toJSON/getSignalData1D';
import { getSignalData2D } from './util/toJSON/getSignalData2D';

export async function nmredataToJSON(nmredata, options) {
  let moleculeAndMap = options.molecule;
  let data = {
    molecules: [
      {
        molfile: moleculeAndMap.molecule.toMolfile(),
      },
    ],
    spectra: [],
  };
  let spectra = data.spectra;
  let molecules = data.molecules;

  if (nmredata.SMILES) {
    molecules[0].smiles = nmredata.SMILES.data[0].value;
  }

  let labels = getLabels(nmredata.ASSIGNMENT);
  labels = addDiaIDtoLabels(labels, moleculeAndMap);
  // if (nmredata['J'] && nmredata['J'].data) {
  //   let jMatrix = getJMatrix(nmredata['J'].data);
  // }

  for (let tag in nmredata) {
    let ctag = tag.toLowerCase();
    if (!ctag.match(/[1|2]d_/s)) continue;
    let frequencyLine = nmredata[tag].data.find((e) => e.value.larmor);
    let pulseProgramLine = nmredata[tag].data.find((e) => e.value.pulseprogram);

    let nucleus = getNucleusFromTag(tag);

    let dimension = ctag.replace(/([1|2]d)_.*/, '$1');
    let signalProcessor =
      dimension === '2d' ? getSignalData2D : getSignalData1D;

    let spectrum = {
      source: {
        jcampURL: null,
      },
      nucleus,
      frequency: frequencyLine.value.larmor,
      experiment: pulseProgramLine
        ? pulseProgramLine.value.pulseprogram
        : dimension,
      headComment: nmredata[tag].headComment,
    };

    let signalData = nmredata[tag].data.filter((e) => e.value.delta);
    spectrum.signals = signalData.map((sd) => {
      let signalContent = signalProcessor(sd.value, labels);
      signalContent.comment = sd.comment;
      return signalContent;
    });

    let zipAndJcamp = await getSpectra(nmredata[tag], options);
    if (!zipAndJcamp.jcamp && !zipAndJcamp.bruker) {
      spectra.push(spectrum);
    } else {
      for (let key in zipAndJcamp) {
        if (!zipAndJcamp[key]) continue;
        spectra.push({
          ...spectrum,
          source: {
            ...spectrum.source,
            file: zipAndJcamp[key],
          },
        });
      }
    }
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

async function getSpectra(tagData, options) {
  return {
    jcamp: await getJcamp(tagData, options),
    bruker: await getBrukerFiles(tagData, options),
  };
}
