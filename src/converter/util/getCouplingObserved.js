export function getCouplingObserved(experiment) {
  switch (experiment.toLowerCase()) {
    case 'hsqc':
      return '1J';
    case 'hmbc':
      return 'NJ';
  }
}
