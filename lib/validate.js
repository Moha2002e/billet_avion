// Validation : règles "required", "numeric", "tel" séparées par |
function validate(data, rules) {
  const errors = {};
  for (const [field, rule] of Object.entries(rules)) {
    const value = (data[field] ?? '').toString().trim();
    if (rule.includes('required') && value === '') errors[field] = `Le champ ${field} est requis`;
    else if (rule.includes('numeric') && value !== '' && !Number.isFinite(Number(value.replace(',', '.'))))
      errors[field] = `Le champ ${field} doit être numérique`;
    else if (rule.includes('tel') && value !== '' && !/^[0-9]{10,15}$/.test(value))
      errors[field] = 'Numéro de téléphone invalide';
  }
  return errors;
}
module.exports = { validate };
