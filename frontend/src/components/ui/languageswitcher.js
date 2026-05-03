import React from 'react';
import { useTranslation } from 'react-i18next';
import API from '../../services/api';

const languages = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
  { code: 'fr', label: 'Français' },
];

const LanguageSwitcher = () => {
  const { i18n } = useTranslation();

  const changeLanguage = async (lng) => {
    i18n.changeLanguage(lng);
    localStorage.setItem('i18nextLng', lng);
    // Optionally save to backend if user is logged in
    try {
      await API.put('/user/language', { language: lng });
    } catch (err) {
      console.error('Failed to save language preference', err);
    }
  };

  return (
    <select value={i18n.language} onChange={(e) => changeLanguage(e.target.value)} style={styles.select}>
      {languages.map(lang => (
        <option key={lang.code} value={lang.code}>{lang.label}</option>
      ))}
    </select>
  );
};

const styles = {
  select: { padding: '4px 8px', borderRadius: '4px', border: '1px solid #ccc' },
};

export default LanguageSwitcher;