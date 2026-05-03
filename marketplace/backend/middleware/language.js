const DEFAULT_LANG = 'en';

module.exports = (req, res, next) => {
  // Priority: query param > Accept-Language header > default
  let lang = req.query.lang;
  if (!lang) {
    const acceptLang = req.headers['accept-language'];
    if (acceptLang) {
      lang = acceptLang.split(',')[0].split('-')[0]; // simple: 'en-US' -> 'en'
    }
  }
  req.lang = (lang && /^[a-z]{2}$/.test(lang)) ? lang : DEFAULT_LANG;
  next();
};