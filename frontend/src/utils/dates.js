// Fonctions utilitaires de formatage de date — format jj/mm/aaaa dans toute l'app

export const fmtDate = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR'); // dd/mm/yyyy
};

export const fmtHeure = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }); // hh:mm
};

export const fmtDateHeure = (d) => {
  if (!d) return '—';
  const dt = new Date(d);
  return `${dt.toLocaleDateString('fr-FR')} ${dt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`; // dd/mm/yyyy hh:mm
};
