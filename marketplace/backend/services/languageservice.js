function translateProduct(product, lang) {
  if (lang === 'en' || !product.translations) return product;
  const translation = product.translations.get(lang);
  if (!translation) return product;
  const translated = product.toObject();
  if (translation.name) translated.name = translation.name;
  if (translation.description) translated.description = translation.description;
  if (translation.shortDescription) translated.shortDescription = translation.shortDescription;
  return translated;
}

module.exports = { translateProduct };