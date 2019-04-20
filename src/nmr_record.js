import {getNMReDATAtags} from './';
import {getNMReDATA} from './';
export class nmr_record {

  // here: loop testing all .sdf files in the zip_object 
  // As an option ig should explore subfolders
  // When the zip is an NMReDATA racord, it should find the file
  // compound1.dsf in the root of the zip file
  // Important note: when more than one compound is assiged to
  // the spectrum (see glucose where we have alpha and beta.
  // this function should get each .sdf file separately...) 
  // one coumpound, should get compound2.sdf...
  // to start we could skip the loop and wire "compound1.sdf"


  // .sdf files may include multiple structures... each has has its assiciated tags...
  // loop over structures in a given .sdf file. We may have two when there is a flat and a 3D structures...

  let molblock = currentSDFfile.getmol(loop);// replace with  existing modults to get molblock...
  let all_tags = currentSDFfile.getNMReDATAtags(loop);// replace with existing module to read SDF tags....
  let nmredata_tags = all_tags.getNMReDATAtags();// just keep the tags including "NMEDATA in the tag name"
  //maybe it is faster if we directly read only the tags with "NMREDATA" in the tag name... is it possible?

  if molblock.is2D{ // test if the mol is 2d (see the nmredata/wiki page..??)
     structures.d2.molblok=molblock;

     structures.d2.label_to_atom_table=make_list_refs_atom_to_NMRlabel(nmredata_tags.assignment);
     //if the .assignment does not exist, don't complain... it can be created and added !? but the list is empty
}

    if molblock.is3d{ 
      structures.d3.molblok=molblock;
      structures.d3.label_to_atom_table=make_list_refs_atom_to_NMRlabel(nmredata_tags.assignment);;
    }
     all_nmredata_tags=   nmredata_tags.addtags (all_sdf_tags);// fuse all NMReDATA tags found

  //end of loop over structures in a given .sdf file
  
  // to be included in a class "structures" 
  structures.highlight_on("Ha");// will add the yellow shadow about the atoms Ha...
  structures.highlight_off("Ha")

  display(structures)//we may have one or two structures 
  
  let nmredata = getNMReDATA(nmredata_tags);
// create a nmredata class...
  nmredata.display('all content')// to be developped laters...

    