import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useAuth from '../../hooks/useAuth'; // ✅ Auth hook
import useCart from '../../hooks/useCart'; // ✅ Cart hook
import { useTranslation } from 'react-i18next';
import API from '../../services/api';
import NotificationBell from '../Notifications/NotificationBell';

// Comprehensive list of world languages (ISO 639-1 codes where available, otherwise ISO 639-2)
const ALL_LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Spanish' },
  { code: 'fr', label: 'French' },
  { code: 'de', label: 'German' },
  { code: 'it', label: 'Italian' },
  { code: 'pt', label: 'Portuguese' },
  { code: 'zh', label: 'Chinese (Simplified)' },
  { code: 'ja', label: 'Japanese' },
  { code: 'ko', label: 'Korean' },
  { code: 'ar', label: 'Arabic' },
  { code: 'ru', label: 'Russian' },
  { code: 'nl', label: 'Dutch' },
  { code: 'pl', label: 'Polish' },
  { code: 'tr', label: 'Turkish' },
  { code: 'vi', label: 'Vietnamese' },
  { code: 'th', label: 'Thai' },
  { code: 'sv', label: 'Swedish' },
  { code: 'da', label: 'Danish' },
  { code: 'fi', label: 'Finnish' },
  { code: 'no', label: 'Norwegian' },
  { code: 'cs', label: 'Czech' },
  { code: 'hu', label: 'Hungarian' },
  { code: 'el', label: 'Greek' },
  { code: 'he', label: 'Hebrew' },
  { code: 'hi', label: 'Hindi' },
  { code: 'id', label: 'Indonesian' },
  { code: 'ms', label: 'Malay' },
  { code: 'ro', label: 'Romanian' },
  { code: 'sk', label: 'Slovak' },
  { code: 'bg', label: 'Bulgarian' },
  { code: 'hr', label: 'Croatian' },
  { code: 'sr', label: 'Serbian' },
  { code: 'uk', label: 'Ukrainian' },
  { code: 'lt', label: 'Lithuanian' },
  { code: 'lv', label: 'Latvian' },
  { code: 'et', label: 'Estonian' },
  { code: 'sl', label: 'Slovenian' },
  { code: 'ca', label: 'Catalan' },
  { code: 'gl', label: 'Galician' },
  { code: 'eu', label: 'Basque' },
  { code: 'is', label: 'Icelandic' },
  { code: 'mk', label: 'Macedonian' },
  { code: 'sq', label: 'Albanian' },
  { code: 'hy', label: 'Armenian' },
  { code: 'ka', label: 'Georgian' },
  { code: 'az', label: 'Azerbaijani' },
  { code: 'uz', label: 'Uzbek' },
  { code: 'kk', label: 'Kazakh' },
  { code: 'mn', label: 'Mongolian' },
  { code: 'ne', label: 'Nepali' },
  { code: 'si', label: 'Sinhala' },
  { code: 'ta', label: 'Tamil' },
  { code: 'te', label: 'Telugu' },
  { code: 'ml', label: 'Malayalam' },
  { code: 'kn', label: 'Kannada' },
  { code: 'mr', label: 'Marathi' },
  { code: 'pa', label: 'Punjabi' },
  { code: 'bn', label: 'Bengali' },
  { code: 'gu', label: 'Gujarati' },
  { code: 'or', label: 'Odia' },
  { code: 'my', label: 'Burmese' },
  { code: 'km', label: 'Khmer' },
  { code: 'lo', label: 'Lao' },
  { code: 'tl', label: 'Tagalog' },
  { code: 'sw', label: 'Swahili' },
  { code: 'zu', label: 'Zulu' },
  { code: 'xh', label: 'Xhosa' },
  { code: 'af', label: 'Afrikaans' },
  { code: 'am', label: 'Amharic' },
  { code: 'ha', label: 'Hausa' },
  { code: 'ig', label: 'Igbo' },
  { code: 'yo', label: 'Yoruba' },
  { code: 'fa', label: 'Persian' },
  { code: 'ur', label: 'Urdu' },
  { code: 'ku', label: 'Kurdish' },
  { code: 'ps', label: 'Pashto' },
  { code: 'mg', label: 'Malagasy' },
  { code: 'la', label: 'Latin' },
  { code: 'cy', label: 'Welsh' },
  { code: 'gd', label: 'Scottish Gaelic' },
  { code: 'ga', label: 'Irish' },
  { code: 'mt', label: 'Maltese' },
  { code: 'bs', label: 'Bosnian' },
  { code: 'be', label: 'Belarusian' },
  { code: 'br', label: 'Breton' },
  { code: 'co', label: 'Corsican' },
  { code: 'fy', label: 'Frisian' },
  { code: 'ht', label: 'Haitian Creole' },
  { code: 'haw', label: 'Hawaiian' },
  { code: 'jw', label: 'Javanese' },
  { code: 'ky', label: 'Kyrgyz' },
  { code: 'lb', label: 'Luxembourgish' },
  { code: 'ln', label: 'Lingala' },
  { code: 'mi', label: 'Maori' },
  { code: 'ny', label: 'Chichewa' },
  { code: 'om', label: 'Oromo' },
  { code: 'qu', label: 'Quechua' },
  { code: 'rm', label: 'Romansh' },
  { code: 'rn', label: 'Rundi' },
  { code: 'sg', label: 'Sango' },
  { code: 'sn', label: 'Shona' },
  { code: 'st', label: 'Sesotho' },
  { code: 'su', label: 'Sundanese' },
  { code: 'tg', label: 'Tajik' },
  { code: 'tk', label: 'Turkmen' },
  { code: 'ug', label: 'Uyghur' },
  { code: 'wa', label: 'Walloon' },
  { code: 'xh', label: 'Xhosa' },
  { code: 'yi', label: 'Yiddish' },
  { code: 'yo', label: 'Yoruba' },
  { code: 'zu', label: 'Zulu' },
  { code: 'fil', label: 'Filipino' },
  { code: 'so', label: 'Somali' },
  { code: 'ti', label: 'Tigrinya' },
  { code: 'mo', label: 'Moldovan' },
  { code: 'liv', label: 'Livonian' },
];

const Navbar = () => {
  const { user, logout } = useAuth();
  const { cartCount } = useCart(); // ✅ Get cart count from hook
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [langSearchQuery, setLangSearchQuery] = useState('');
  const [isDesktop, setIsDesktop] = useState(window.innerWidth > 768);
  const dropdownRef = useRef(null);
  const langDropdownRef = useRef(null);

  const filteredLanguages = langSearchQuery
    ? ALL_LANGUAGES.filter(lang =>
        lang.label.toLowerCase().includes(langSearchQuery.toLowerCase()) ||
        lang.code.toLowerCase().includes(langSearchQuery.toLowerCase())
      )
    : ALL_LANGUAGES;

  useEffect(() => {
    const handleResize = () => {
      const newDesktop = window.innerWidth > 768;
      setIsDesktop(newDesktop);
      if (newDesktop) setIsMobileMenuOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsUserDropdownOpen(false);
      }
      if (langDropdownRef.current && !langDropdownRef.current.contains(event.target)) {
        setIsLangDropdownOpen(false);
        setLangSearchQuery('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/');
    setIsMobileMenuOpen(false);
    setIsUserDropdownOpen(false);
    setIsLangDropdownOpen(false);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
      setIsMobileMenuOpen(false);
    }
  };

  const changeLanguage = async (lng) => {
    i18n.changeLanguage(lng);
    localStorage.setItem('i18nextLng', lng);
    if (user) {
      try {
        await API.put('/user/language', { language: lng });
      } catch (err) {
        console.error('Failed to save language preference:', err);
      }
    }
    setIsLangDropdownOpen(false);
    setLangSearchQuery('');
  };

  const isAdmin = user?.isAdmin === true || user?.role === 'admin';
  const isSeller = user?.role === 'seller' || user?.isSeller === true;
  const currentLangLabel = ALL_LANGUAGES.find(l => l.code === i18n.language)?.label || 'Language';

  return (
    <nav style={styles.navbar}>
      <div style={styles.navContainer}>
        <div style={styles.logo}>
          <Link to="/" style={styles.logoLink}>🛒 MarketPlace</Link>
        </div>

        <form onSubmit={handleSearch} style={styles.searchForm}>
          <input
            type="text"
            placeholder={t('nav.search', 'Search products...')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={styles.searchInput}
          />
          <button type="submit" style={styles.searchButton}>🔍</button>
        </form>

        {isDesktop && (
          <div style={styles.desktopNav}>
            <Link to="/" style={styles.navLink}>{t('nav.home', 'Home')}</Link>
            <Link to="/wishlist" style={styles.navLink}>❤️ {t('nav.wishlist', 'Wishlist')}</Link>
            <Link to="/cart" style={styles.navLink}>
              🛒 {t('nav.cart', 'Cart')}
              {cartCount > 0 && <span style={styles.cartBadge}>{cartCount}</span>}
            </Link>
            <NotificationBell />

            {user ? (
              <>
                <Link to="/orders" style={styles.navLink}>{t('nav.orders', 'My Orders')}</Link>
                <Link to="/affiliate" style={styles.navLink}>🤝 {t('nav.affiliate', 'Affiliate')}</Link>
                {isSeller && <Link to="/seller" style={styles.navLink}>📦 {t('nav.sellerDashboard', 'Seller')}</Link>}
                {isAdmin && <Link to="/admin" style={{ ...styles.navLink, ...styles.adminLink }}>⚙️ {t('nav.adminPanel', 'Admin')}</Link>}
                <div style={styles.dropdown} ref={dropdownRef}>
                  <button onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)} style={styles.userButton}>
                    👤 {user.name?.split(' ')[0] || 'User'} ▼
                  </button>
                  {isUserDropdownOpen && (
                    <div style={styles.dropdownMenu}>
                      <div style={styles.dropdownUserInfo}>
                        <strong>{user.name}</strong>
                        <small>{user.email}</small>
                      </div>
                      <hr style={styles.dropdownDivider} />
                      <Link to="/profile" style={styles.dropdownItem}>{t('nav.profile', 'Profile Settings')}</Link>
                      <button onClick={handleLogout} style={styles.dropdownLogout}>{t('nav.logout', 'Logout')}</button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <Link to="/login" style={styles.navLink}>{t('nav.login', 'Login')}</Link>
                <Link to="/register" style={{ ...styles.navLink, ...styles.registerLink }}>{t('nav.register', 'Register')}</Link>
              </>
            )}

            <div style={styles.langSwitcher} ref={langDropdownRef}>
              <button onClick={() => setIsLangDropdownOpen(!isLangDropdownOpen)} style={styles.langButton}>
                🌐 {currentLangLabel} ▼
              </button>
              {isLangDropdownOpen && (
                <div style={styles.langDropdownMenu}>
                  <input
                    type="text"
                    placeholder="Search language..."
                    value={langSearchQuery}
                    onChange={(e) => setLangSearchQuery(e.target.value)}
                    style={styles.langSearchInput}
                    autoFocus
                  />
                  <div style={styles.langListContainer}>
                    {filteredLanguages.map(lang => (
                      <button
                        key={lang.code}
                        onClick={() => changeLanguage(lang.code)}
                        style={{
                          ...styles.langOption,
                          ...(i18n.language === lang.code ? styles.langOptionActive : {})
                        }}
                      >
                        {lang.label}
                      </button>
                    ))}
                    {filteredLanguages.length === 0 && <div style={styles.langNoResults}>No languages found</div>}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {!isDesktop && (
          <button style={styles.hamburger} onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} aria-label="Toggle menu">
            ☰
          </button>
        )}
      </div>

      {!isDesktop && isMobileMenuOpen && (
        <div style={styles.mobileMenu}>
          <form onSubmit={handleSearch} style={styles.mobileSearchForm}>
            <input
              type="text"
              placeholder={t('nav.search', 'Search...')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={styles.mobileSearchInput}
            />
            <button type="submit" style={styles.mobileSearchButton}>🔍</button>
          </form>

          <Link to="/" style={styles.mobileLink} onClick={() => setIsMobileMenuOpen(false)}>{t('nav.home', 'Home')}</Link>
          <Link to="/wishlist" style={styles.mobileLink} onClick={() => setIsMobileMenuOpen(false)}>❤️ {t('nav.wishlist', 'Wishlist')}</Link>
          <Link to="/cart" style={styles.mobileLink} onClick={() => setIsMobileMenuOpen(false)}>
            🛒 {t('nav.cart', 'Cart')} {cartCount > 0 && `(${cartCount})`}
          </Link>
          <NotificationBell />

          {user ? (
            <>
              <Link to="/orders" style={styles.mobileLink} onClick={() => setIsMobileMenuOpen(false)}>{t('nav.orders', 'My Orders')}</Link>
              <Link to="/affiliate" style={styles.mobileLink} onClick={() => setIsMobileMenuOpen(false)}>🤝 {t('nav.affiliate', 'Affiliate')}</Link>
              {isSeller && <Link to="/seller" style={styles.mobileLink} onClick={() => setIsMobileMenuOpen(false)}>📦 {t('nav.sellerDashboard', 'Seller')}</Link>}
              {isAdmin && <Link to="/admin" style={{ ...styles.mobileLink, ...styles.mobileAdminLink }} onClick={() => setIsMobileMenuOpen(false)}>⚙️ {t('nav.adminPanel', 'Admin')}</Link>}
              <Link to="/profile" style={styles.mobileLink} onClick={() => setIsMobileMenuOpen(false)}>{t('nav.profile', 'Profile')}</Link>
              <button onClick={handleLogout} style={styles.mobileLogout}>{t('nav.logout', 'Logout')}</button>
            </>
          ) : (
            <>
              <Link to="/login" style={styles.mobileLink} onClick={() => setIsMobileMenuOpen(false)}>{t('nav.login', 'Login')}</Link>
              <Link to="/register" style={{ ...styles.mobileLink, ...styles.mobileRegisterLink }} onClick={() => setIsMobileMenuOpen(false)}>{t('nav.register', 'Register')}</Link>
            </>
          )}

          <div style={styles.mobileLangSection}>
            <div style={styles.mobileLangTitle}>Select Language</div>
            <input
              type="text"
              placeholder="Search language..."
              value={langSearchQuery}
              onChange={(e) => setLangSearchQuery(e.target.value)}
              style={styles.mobileLangSearch}
            />
            <div style={styles.mobileLangList}>
              {filteredLanguages.map(lang => (
                <button
                  key={lang.code}
                  onClick={() => {
                    changeLanguage(lang.code);
                    setIsMobileMenuOpen(false);
                  }}
                  style={{
                    ...styles.mobileLangBtn,
                    ...(i18n.language === lang.code ? styles.mobileLangActive : {})
                  }}
                >
                  {lang.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

const styles = {
  navbar: {
    backgroundColor: '#1a1a2e',
    color: 'white',
    position: 'sticky',
    top: 0,
    zIndex: 1000,
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
  },
  navContainer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1rem 2rem',
    maxWidth: '1400px',
    margin: '0 auto',
    flexWrap: 'wrap',
  },
  logo: { fontSize: '1.5rem', fontWeight: 'bold' },
  logoLink: { color: '#ff6b6b', textDecoration: 'none' },
  searchForm: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: '25px',
    overflow: 'hidden',
    margin: '0 1rem',
    flex: 1,
    maxWidth: '400px',
  },
  searchInput: { flex: 1, padding: '0.5rem 1rem', border: 'none', outline: 'none', fontSize: '0.9rem' },
  searchButton: { padding: '0.5rem 1rem', backgroundColor: '#ff6b6b', border: 'none', cursor: 'pointer', color: 'white', fontSize: '1rem' },
  desktopNav: { display: 'flex', alignItems: 'center', gap: '1.5rem' },
  navLink: { color: 'white', textDecoration: 'none', fontSize: '0.95rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' },
  cartBadge: { backgroundColor: '#ff6b6b', borderRadius: '50%', padding: '0.15rem 0.5rem', fontSize: '0.7rem', fontWeight: 'bold', marginLeft: '0.25rem' },
  adminLink: { backgroundColor: '#dc3545', padding: '0.25rem 0.75rem', borderRadius: '20px' },
  registerLink: { backgroundColor: '#28a745', padding: '0.25rem 0.75rem', borderRadius: '20px' },
  dropdown: { position: 'relative' },
  userButton: {
    backgroundColor: 'transparent',
    color: 'white',
    border: '1px solid #ff6b6b',
    padding: '0.25rem 0.75rem',
    borderRadius: '20px',
    cursor: 'pointer',
    fontSize: '0.9rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  dropdownMenu: {
    position: 'absolute',
    top: '100%',
    right: 0,
    marginTop: '0.5rem',
    backgroundColor: 'white',
    color: '#333',
    borderRadius: '8px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
    minWidth: '200px',
    zIndex: 1001,
    overflow: 'hidden',
  },
  dropdownUserInfo: { padding: '0.75rem', backgroundColor: '#f8f9fa', display: 'flex', flexDirection: 'column', gap: '0.25rem' },
  dropdownDivider: { margin: 0, border: 'none', borderTop: '1px solid #ddd' },
  dropdownItem: { display: 'block', padding: '0.5rem 0.75rem', textDecoration: 'none', color: '#333', cursor: 'pointer' },
  dropdownLogout: { width: '100%', textAlign: 'left', padding: '0.5rem 0.75rem', backgroundColor: 'transparent', border: 'none', color: '#dc3545', cursor: 'pointer', fontSize: '1rem' },
  langSwitcher: { position: 'relative' },
  langButton: { background: 'transparent', border: '1px solid #aaa', color: 'white', padding: '4px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' },
  langDropdownMenu: {
    position: 'absolute',
    top: '100%',
    right: 0,
    marginTop: '0.5rem',
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
    width: '220px',
    maxHeight: '400px',
    display: 'flex',
    flexDirection: 'column',
    zIndex: 1001,
    overflow: 'hidden',
  },
  langSearchInput: { padding: '8px', border: '1px solid #ddd', borderRadius: '4px', margin: '8px', outline: 'none' },
  langListContainer: { overflowY: 'auto', maxHeight: '320px' },
  langOption: { width: '100%', padding: '6px 12px', textAlign: 'left', background: 'white', border: 'none', color: '#333', cursor: 'pointer', fontSize: '0.9rem' },
  langOptionActive: { backgroundColor: '#f0f0f0', fontWeight: 'bold', color: '#007bff' },
  langNoResults: { padding: '12px', textAlign: 'center', color: '#999' },
  hamburger: { backgroundColor: 'transparent', border: 'none', color: 'white', fontSize: '1.5rem', cursor: 'pointer' },
  mobileMenu: { display: 'flex', flexDirection: 'column', backgroundColor: '#16213e', padding: '1rem', gap: '0.75rem', borderTop: '1px solid #0f3460' },
  mobileSearchForm: { display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' },
  mobileSearchInput: { flex: 1, padding: '0.5rem', borderRadius: '20px', border: 'none', outline: 'none' },
  mobileSearchButton: { padding: '0.5rem 1rem', backgroundColor: '#ff6b6b', border: 'none', borderRadius: '20px', color: 'white', cursor: 'pointer' },
  mobileLink: { color: 'white', textDecoration: 'none', padding: '0.5rem', borderBottom: '1px solid #0f3460', fontSize: '1rem' },
  mobileAdminLink: { color: '#ff6b6b' },
  mobileRegisterLink: { color: '#28a745' },
  mobileLogout: { backgroundColor: '#dc3545', color: 'white', border: 'none', padding: '0.5rem', borderRadius: '5px', cursor: 'pointer', marginTop: '0.5rem', fontSize: '1rem' },
  mobileLangSection: { marginTop: '12px', borderTop: '1px solid #0f3460', paddingTop: '12px' },
  mobileLangTitle: { color: '#ccc', fontSize: '0.8rem', marginBottom: '8px' },
  mobileLangSearch: { padding: '8px', borderRadius: '20px', border: 'none', marginBottom: '8px', outline: 'none' },
  mobileLangList: { maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' },
  mobileLangBtn: { backgroundColor: '#0f3460', border: 'none', color: 'white', padding: '6px 12px', borderRadius: '20px', cursor: 'pointer', fontSize: '0.8rem', textAlign: 'center' },
  mobileLangActive: { backgroundColor: '#ff6b6b', fontWeight: 'bold' },
};

export default Navbar;